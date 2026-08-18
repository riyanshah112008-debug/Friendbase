
const {
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  SlashCommandBuilder,
  AuditLogEvent,
} = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const mongoose = require('mongoose');

const DEFAULT_BAD_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick',
  'pussy', 'slut', 'whore', 'motherfucker', 'cock', 'nigger', 'faggot'
];

const badWordSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
  words: { type: [String], default: DEFAULT_BAD_WORDS }
});
const BadWordSettings = mongoose.models.BadWordSettings || mongoose.model('BadWordSettings', badWordSchema);

const ServerSettings = mongoose.models.ServerSettings || require('../models/ServerSettings');

const rawKeys = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;
const AI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

function getNextAIClient() {
  if (!rawKeys.length) return null;
  const key = rawKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % rawKeys.length;
  return new GoogleGenAI({ apiKey: key });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateAIResponseWithRetry(prompt) {
  if (!rawKeys.length) {
    throw new Error('Missing GEMINI_API_KEY.');
  }

  let lastError = null;
  for (const modelName of AI_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const client = getNextAIClient();
        if (!client) continue;
        const response = await client.models.generateContent({ model: modelName, contents: prompt });
        const text = response?.text?.trim();
        if (text) return text;
      } catch (error) {
        lastError = error;
        const status = error?.status || error?.code;
        if ((status === 429 || status === 503) && attempt < 3) {
          await sleep(attempt * 400);
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('AI Engine unreachable.');
}

function createSystemEmbed({ title, description, color = '#5865F2', fields = [], authorName = 'Friendbase // Starry Control', authorIcon }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setAuthor({ name: authorName, iconURL: authorIcon || 'https://cdn.discordapp.com/embed/avatars/0.png' })
    .setTimestamp();

  if (fields.length) embed.addFields(fields);
  return embed;
}

function createLogEmbed({ title, emoji, color, target, moderator, reason, caseId, duration, expiresAt, extraFields = [], guild }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${title}`)
    .setTimestamp();

  if (guild) {
    embed.setAuthor({ name: `${guild.name} | Starry Audit`, iconURL: guild.iconURL({ dynamic: true }) || undefined });
  }

  if (target) {
    embed.addFields({ name: '👤 Target', value: `<@${target.id}> \`(${target.tag || target.username || target.id})\``, inline: true });
  }

  if (moderator) {
    embed.addFields({ name: '🛡️ Moderator', value: `<@${moderator.id}>`, inline: true });
  }

  if (reason) {
    embed.addFields({ name: '📝 Reason', value: reason.length > 1024 ? `${reason.slice(0, 1021)}...` : reason, inline: false });
  }

  if (caseId) {
    embed.addFields({ name: '🏷️ Case ID', value: `\`#${caseId}\``, inline: true });
  }

  if (duration) {
    embed.addFields({ name: '⏱️ Duration', value: `\`${duration}\``, inline: true });
  }

  if (expiresAt) {
    embed.addFields({ name: '📅 Expires', value: `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:F>`, inline: true });
  }

  if (extraFields.length) embed.addFields(extraFields);

  return embed;
}

async function getBadWordPanelEmbed(guild, client) {
  let settings = await BadWordSettings.findOne({ guildId: guild.id });
  if (!settings) {
    settings = await BadWordSettings.create({ guildId: guild.id, enabled: true, words: DEFAULT_BAD_WORDS });
  }

  const embed = new EmbedBuilder()
    .setColor(settings.enabled ? '#2ecc71' : '#ed4245')
    .setAuthor({ name: `${guild.name} | Security Protocol`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
    .setTitle('🛡️ Bad Word Moderation Control Panel')
    .setDescription(
      `Configure automated profanity filtering for **${guild.name}**.

` +
      `• **Engine Status:** ${settings.enabled ? '`ACTIVE 🟢`' : '`DISABLED 🔴`'}
` +
      `• **Total Filtered Words:** \`${settings.words.length}\`
` +
      `• **Premade Enforcement:** Message deletion + warning message + DM notice.`
    )
    .addFields({
      name: '📜 Sample Active Words',
      value: settings.words.length ? `\`\`${settings.words.slice(0, 15).join(', ')}${settings.words.length > 15 ? '...' : ''}\`\`` : '*No words currently blacklisted.*'
    })
    .setFooter({ text: 'Use the buttons below to manage the filter', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('badword_add_btn').setLabel('Add Word(s)').setStyle(ButtonStyle.Success).setEmoji('➕'),
    new ButtonBuilder().setCustomId('badword_remove_btn').setLabel('Remove Word(s)').setStyle(ButtonStyle.Danger).setEmoji('➖'),
    new ButtonBuilder().setCustomId('badword_list_btn').setLabel('View Full List').setStyle(ButtonStyle.Secondary).setEmoji('📜'),
    new ButtonBuilder().setCustomId('badword_toggle_btn').setLabel(settings.enabled ? 'Disable AutoMod' : 'Enable AutoMod').setStyle(settings.enabled ? ButtonStyle.Secondary : ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

async function getLogChannel(guild, logType = 'access') {
  if (!guild) return null;
  const typeMap = {
    access: ['logs-access', 'user-invite-logs', 'invite-logs', 'join-logs'],
    moderate: ['logs-moderate', 'mod-logs', 'warning-logs', 'audit-logs'],
    messages: ['logs-messages', 'message-logs', 'chat-logs'],
    voice: ['logs-voice', 'voice-logs', 'vc-logs'],
    channels: ['logs-channels', 'channel-logs'],
    members: ['logs-members', 'member-logs', 'role-logs']
  };

  const targetNames = typeMap[logType.toLowerCase()] || typeMap.access;
  let channel = guild.channels.cache.find(c => c?.type === ChannelType.GuildText && targetNames.some(name => c.name.toLowerCase().includes(name)));
  if (channel) return channel;

  try {
    const fetched = await guild.channels.fetch();
    channel = fetched.find(c => c?.type === ChannelType.GuildText && targetNames.some(name => c.name.toLowerCase().includes(name)));
    if (channel) return channel;
    return fetched.find(c => c?.type === ChannelType.GuildText && ['logs-server', 'server-logs', 'mod-logs', 'logs'].includes(c.name.toLowerCase())) || null;
  } catch (error) {
    return null;
  }
}

function parseDuration(value) {
  const match = `${value || '10m'}`.match(/(\d+)\s*(s|m|h|d)/i);
  if (!match) return 10 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 's') return amount * 1000;
  if (unit === 'm') return amount * 60 * 1000;
  if (unit === 'h') return amount * 60 * 60 * 1000;
  if (unit === 'd') return amount * 24 * 60 * 60 * 1000;
  return 10 * 60 * 1000;
}

async function ensureBadWords(guildId) {
  let settings = await BadWordSettings.findOne({ guildId });
  if (!settings) {
    settings = await BadWordSettings.create({ guildId, enabled: true, words: DEFAULT_BAD_WORDS });
  }
  return settings;
}

function sanitizeText(text = '') {
  return text.replace(/<@!?(\d+)>/g, '').replace(/<@&?(\d+)>/g, '').replace(/\s+/g, ' ').trim();
}

async function executeModerationAction({ member, action, reason, duration, guild, moderator }) {
  if (!member || !guild) return null;

  const caseId = Math.floor(Math.random() * 90000) + 10000;
  const logChannel = await getLogChannel(guild, 'moderate');

  if (action === 'warn') {
    await member.send({ embeds: [createSystemEmbed({ title: '⚠️ Warning received', description: `You were warned in **${guild.name}**.

**Reason:** ${reason || 'No reason provided.'}`, color: '#FEE75C' })] }).catch(() => {});
  }

  if (action === 'timeout') {
    const ms = parseDuration(duration || '10m');
    await member.timeout(ms, `${reason || 'No reason provided'} | Executed by ${moderator?.user?.tag || moderator?.tag || 'Starry System'}`);
  }

  if (action === 'kick') {
    await member.kick(`${reason || 'No reason provided'} | Executed by ${moderator?.user?.tag || moderator?.tag || 'Starry System'}`);
  }

  if (action === 'ban') {
    await guild.members.ban(member.id, { reason: `${reason || 'No reason provided'} | Executed by ${moderator?.user?.tag || moderator?.tag || 'Starry System'}` });
  }

  if (logChannel) {
    const log = createLogEmbed({
      title: `${action.toUpperCase()} performed`,
      emoji: action === 'warn' ? '⚠️' : action === 'timeout' ? '⏰' : action === 'kick' ? '🚪' : '🔨',
      color: action === 'warn' ? '#FEE75C' : action === 'timeout' ? '#ED4245' : action === 'kick' ? '#DA373C' : '#ED4245',
      target: member.user,
      moderator: moderator?.user || moderator,
      reason: reason || 'No reason provided.',
      caseId,
      duration: action === 'timeout' ? duration || '10m' : null,
      expiresAt: action === 'timeout' ? new Date(Date.now() + parseDuration(duration || '10m')) : null,
      guild
    });
    await logChannel.send({ embeds: [log] }).catch(() => {});
  }

  return { caseId };
}

async function provisionMasterServerStructure(interaction) {
  if (!interaction?.guild) return null;

  const guild = interaction.guild;
  const botMember = guild.members.me;

  let verifiedRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'verified') || await guild.roles.create({ name: 'Verified', color: '#2ecc71', reason: 'Starry master setup' });
  let staffRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'staff' || r.name.toLowerCase() === 'moderator') || await guild.roles.create({ name: 'Staff', color: '#3498db', reason: 'Starry master setup' });

  const hideEveryone = { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] };
  const showEveryone = { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] };
  const showVerified = { id: verifiedRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.Connect] };
  const staffFull = { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] };
  const botFull = { id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] };

  const categories = [
    { name: '🛡️ SECURITY & GOVERNANCE', permit: [showEveryone, botFull], moduleType: null },
    { name: '🚨 INCIDENT & SECURITY LOGS', permit: [hideEveryone, staffFull, botFull], moduleType: null },
    { name: '📡 AUTOMATED TRACKERS', permit: [hideEveryone, staffFull, botFull], moduleType: null },
    { name: '🎫 SUPPORT & APPLICATIONS', permit: [showEveryone, botFull], moduleType: null },
    { name: '👑 ADMIN & STAFF HQ', permit: [hideEveryone, staffFull, botFull], moduleType: null },
    { name: '📊 COMMUNITY PROTOCOL', permit: [hideEveryone, showVerified, botFull], moduleType: null }
  ];

  const createdCategories = [];
  for (const category of categories) {
    const existing = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === category.name.toLowerCase());
    if (existing) createdCategories.push(existing);
    else createdCategories.push(await guild.channels.create({ name: category.name, type: ChannelType.GuildCategory, permissionOverwrites: category.permit }));
  }

  const namedChannels = [
    { category: createdCategories[0], name: 'rules-and-info', permit: [showEveryone, botFull] },
    { category: createdCategories[0], name: 'announcements', permit: [showEveryone, botFull] },
    { category: createdCategories[0], name: 'server-status-monitor', permit: [showEveryone, botFull], moduleType: 'status_monitor' },
    { category: createdCategories[1], name: 'logs-access', permit: [hideEveryone, staffFull, botFull], moduleType: 'log_access' },
    { category: createdCategories[1], name: 'logs-moderate', permit: [hideEveryone, staffFull, botFull], moduleType: 'log_moderate' },
    { category: createdCategories[1], name: 'logs-messages', permit: [hideEveryone, staffFull, botFull], moduleType: 'log_messages' },
    { category: createdCategories[1], name: 'logs-voice', permit: [hideEveryone, staffFull, botFull], moduleType: 'log_voice' },
    { category: createdCategories[1], name: 'logs-channels', permit: [hideEveryone, staffFull, botFull], moduleType: 'log_channels' },
    { category: createdCategories[1], name: 'logs-members', permit: [hideEveryone, staffFull, botFull], moduleType: 'log_members' },
    { category: createdCategories[2], name: 'sus-account-tracker', permit: [hideEveryone, staffFull, botFull], moduleType: 'sus_tracker' },
    { category: createdCategories[2], name: 'inactivity-tracker', permit: [hideEveryone, staffFull, botFull], moduleType: 'inactivity_tracker' },
    { category: createdCategories[2], name: 'chest-drops', permit: [hideEveryone, showVerified, botFull] },
    { category: createdCategories[3], name: 'verify-here', permit: [{ id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }, { id: verifiedRole.id, deny: [PermissionFlagsBits.ViewChannel] }, botFull], moduleType: 'verification' },
    { category: createdCategories[3], name: 'open-a-ticket', permit: [hideEveryone, showVerified, botFull], moduleType: 'tickets' },
    { category: createdCategories[4], name: 'owners-chat', permit: [hideEveryone, staffFull, botFull] },
    { category: createdCategories[4], name: 'staff-discussion', permit: [hideEveryone, staffFull, botFull] },
    { category: createdCategories[5], name: 'general-chat', permit: [hideEveryone, showVerified, botFull] },
    { category: createdCategories[5], name: 'bot-commands', permit: [hideEveryone, showVerified, botFull] }
  ];

  for (const channelDef of namedChannels) {
    const existing = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name.toLowerCase() === channelDef.name.toLowerCase() && c.parentId === channelDef.category.id);
    if (!existing) {
      await guild.channels.create({
        name: channelDef.name,
        type: ChannelType.GuildText,
        parent: channelDef.category.id,
        permissionOverwrites: channelDef.permit,
        topic: channelDef.moduleType ? `Starry module: ${channelDef.moduleType}` : ''
      });
    }
  }

  await ServerSettings.findOneAndUpdate({ guildId: String(guild.id) }, { setupCompleted: true, verifiedRoleId: verifiedRole.id }, { upsert: true, new: true });

  return { verifiedRole: verifiedRole.name, categories: createdCategories.length, channels: namedChannels.length };
}

function startTelemetryLoop(client) {
  setInterval(async () => {
    if (!client?.guilds) return;

    for (const guild of client.guilds.cache.values()) {
      try {
        const statusChannel = guild.channels.cache.find(ch => ch.name === 'server-status-monitor');
        if (!statusChannel) continue;
        const heapMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('🟢 Autonomous Network Telemetry & Uptime Hub')
          .addFields(
            { name: '📊 Total Members', value: `\`${guild.memberCount}\``, inline: true },
            { name: '🟢 System Uptime', value: `\`${(process.uptime() / 60).toFixed(1)} mins\``, inline: true },
            { name: '🧠 RAM Usage (Heap)', value: `\`${heapMb} MB\``, inline: true },
            { name: '📡 Bot Latency', value: `\`${client.ws.ping}ms\``, inline: true }
          );
        const lastMessages = await statusChannel.messages.fetch({ limit: 5 }).catch(() => null);
        const botMessage = lastMessages?.find(msg => msg.author.id === client.user.id && msg.embeds.length > 0);
        if (botMessage) await botMessage.edit({ embeds: [embed] }).catch(() => {});
        else await statusChannel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {
        // ignore background errors
      }
    }
  }, 60000);
}

const setupStarryCommand = new SlashCommandBuilder()
  .setName('setup-starry')
  .setDescription('✨ Autonomous server setup and security architecture')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const modPanelCommand = new SlashCommandBuilder()
  .setName('modpanel')
  .setDescription('🛡️ Open a moderation panel for a user')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(option => option.setName('target').setDescription('Target user to moderate').setRequired(true));

const emergencyNukeCommand = new SlashCommandBuilder()
  .setName('emergency-nuke')
  .setDescription('⚡ Emergency purge or server reset protocol')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(option => option.setName('target').setDescription('Target scope').setRequired(true).addChoices(
    { name: 'Channel', value: 'channel' },
    { name: 'Server', value: 'server' }
  ))
  .addChannelOption(option => option.setName('channel').setDescription('Optional target channel').setRequired(false));

const verifySetupCommand = new SlashCommandBuilder()
  .setName('verify-setup')
  .setDescription('Setup verification flow')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function handleSmartModeration(client, message, triggerWord = 'starry') {
  if (!message?.guild || message.author.bot) return false;

  const content = message.content.trim();
  if (!content) return false;

  const lower = content.toLowerCase();
  const isTrigger = lower.includes(triggerWord) || lower.includes('jarvis') || message.mentions.has(client.user?.id);
  if (!isTrigger) return false;

  const cleanText = sanitizeText(content.replace(/^(?:starry|jarvis)\s+/i, '').replace(new RegExp(`<@!?${client.user.id}>`, 'gi'), '').trim());
  if (!cleanText) {
    await message.reply({ content: '🤖 I am online. Ask me to moderate, summarize, or help manage the server.' }).catch(() => {});
    return true;
  }

  try {
    const aiText = await generateAIResponseWithRetry(`You are Starry, a helpful Discord server AI assistant. Reply briefly, friendly, and clearly as a server moderator/assistant. User request: ${cleanText}`);
    await message.reply({ content: aiText.slice(0, 2000) }).catch(() => {});
    return true;
  } catch (error) {
    await message.reply({ content: `🤖 I heard you, but my AI key is not configured or the model is unavailable right now.

Request: ${cleanText}` }).catch(() => {});
    return true;
  }
}

module.exports = async (client) => {
  if (client.starryEngineInitialized) return;
  client.starryEngineInitialized = true;

  client.getLogChannel = getLogChannel;
  client.verifyMap = client.verifyMap || new Map();

  startTelemetryLoop(client);

  client.on('starrySetup', async (interaction) => {
    if (!interaction?.guild) return;
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: '❌ You need Administrator permission to run Starry setup.', ephemeral: true }).catch(() => {});
      return;
    }

    try {
      const result = await provisionMasterServerStructure(interaction);
      await interaction.reply({
        embeds: [createSystemEmbed({
          title: '✨ Starry Server Blueprint Applied',
          description: `The Starry core structure has been deployed for **${interaction.guild.name}**.`,
          color: '#8b5cf6',
          fields: [
            { name: 'Verified Role', value: `\`${result?.verifiedRole || 'Verified'}\``, inline: true },
            { name: 'Categories', value: `\`${result?.categories || 6}\``, inline: true },
            { name: 'Channels', value: `\`${result?.channels || 18}\``, inline: true }
          ]
        })],
        ephemeral: false
      }).catch(() => {});
    } catch (error) {
      console.error('[starrySetup]', error);
      await interaction.reply({ content: '❌ Starry setup failed. Please try again.', ephemeral: true }).catch(() => {});
    }
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.toLowerCase().includes('starry') || message.content.toLowerCase().includes('jarvis') || message.mentions.has(client.user?.id)) {
      await handleSmartModeration(client, message, 'starry');
    }
  });

  client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;
    const accessLog = await getLogChannel(member.guild, 'access');
    if (accessLog) {
      const embed = createLogEmbed({
        title: 'Member Joined',
        emoji: '📥',
        color: '#2ECC71',
        target: member.user,
        extraFields: [
          { name: '🧾 Account Age', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: '📌 Guild', value: member.guild.name, inline: true }
        ],
        guild: member.guild
      });
      await accessLog.send({ embeds: [embed] }).catch(() => {});
    }
  });

  client.on('guildMemberRemove', async (member) => {
    if (member.user.bot) return;
    const accessLog = await getLogChannel(member.guild, 'access');
    if (accessLog) {
      const embed = createLogEmbed({
        title: 'Member Left',
        emoji: '📤',
        color: '#ED4245',
        target: member.user,
        extraFields: [{ name: '📌 Guild', value: member.guild.name, inline: true }],
        guild: member.guild
      });
      await accessLog.send({ embeds: [embed] }).catch(() => {});
    }
  });

  client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    const logChannel = await getLogChannel(message.guild, 'messages');
    if (!logChannel) return;
    const embed = createLogEmbed({
      title: 'Message Deleted',
      emoji: '🗑️',
      color: '#ED4245',
      target: message.author,
      extraFields: [
        { name: '📄 Content', value: message.content ? `\`\`${message.content.slice(0, 1024)}\`\`` : '*empty*', inline: false },
        { name: '📍 Channel', value: `<#${message.channel.id}>`, inline: true }
      ],
      guild: message.guild
    });
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!newMessage.guild || oldMessage.content === newMessage.content) return;
    const logChannel = await getLogChannel(newMessage.guild, 'messages');
    if (!logChannel) return;
    const embed = createLogEmbed({
      title: 'Message Edited',
      emoji: '✏️',
      color: '#5865F2',
      target: newMessage.author,
      extraFields: [
        { name: 'Before', value: oldMessage.content ? `\`\`${oldMessage.content.slice(0, 512)}\`\`` : '*empty*', inline: false },
        { name: 'After', value: newMessage.content ? `\`\`${newMessage.content.slice(0, 512)}\`\`` : '*empty*', inline: false },
        { name: '📍 Channel', value: `<#${newMessage.channel.id}>`, inline: true }
      ],
      guild: newMessage.guild
    });
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  });

  client.on('voiceStateUpdate', async (oldState, newState) => {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;
    const member = newState.member || oldState.member;
    const logChannel = await getLogChannel(guild, 'voice');
    if (!logChannel || !member || member.user.bot) return;

    if (!oldState.channelId && newState.channelId) {
      const embed = createLogEmbed({
        title: 'Joined Voice Channel',
        emoji: '🔊',
        color: '#2ECC71',
        target: member.user,
        extraFields: [{ name: '🎙️ Channel', value: `<#${newState.channelId}>`, inline: true }],
        guild
      });
      await logChannel.send({ embeds: [embed] }).catch(() => {});
    }

    if (oldState.channelId && !newState.channelId) {
      const embed = createLogEmbed({
        title: 'Left Voice Channel',
        emoji: '🔇',
        color: '#ED4245',
        target: member.user,
        extraFields: [{ name: '🎙️ Channel', value: `<#${oldState.channelId}>`, inline: true }],
        guild
      });
      await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
  });

  client.on('channelCreate', async (channel) => {
    if (!channel.guild) return;
    const logChannel = await getLogChannel(channel.guild, 'channels');
    if (!logChannel) return;
    const embed = createLogEmbed({
      title: 'Channel Created',
      emoji: '📺',
      color: '#2ECC71',
      extraFields: [{ name: '📛 Channel', value: `\`#${channel.name}\``, inline: true }, { name: '🆔 ID', value: `\`${channel.id}\``, inline: true }],
      guild: channel.guild
    });
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  });

  client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const logChannel = await getLogChannel(channel.guild, 'channels');
    if (!logChannel) return;
    const embed = createLogEmbed({
      title: 'Channel Deleted',
      emoji: '🗑️',
      color: '#ED4245',
      extraFields: [{ name: '📛 Channel', value: `\`${channel.name}\``, inline: true }, { name: '🆔 ID', value: `\`${channel.id}\``, inline: true }],
      guild: channel.guild
    });
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  });

  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const memberLog = await getLogChannel(newMember.guild, 'members');
    if (!memberLog) return;

    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

    if (addedRoles.size) {
      const embed = createLogEmbed({
        title: 'Role Added',
        emoji: '✅',
        color: '#2ECC71',
        target: newMember.user,
        extraFields: [{ name: '➕ Added Roles', value: addedRoles.map(r => `<@&${r.id}>`).join(', ') || 'None', inline: false }],
        guild: newMember.guild
      });
      await memberLog.send({ embeds: [embed] }).catch(() => {});
    }

    if (removedRoles.size) {
      const embed = createLogEmbed({
        title: 'Role Removed',
        emoji: '❌',
        color: '#ED4245',
        target: newMember.user,
        extraFields: [{ name: '➖ Removed Roles', value: removedRoles.map(r => `<@&${r.id}>`).join(', ') || 'None', inline: false }],
        guild: newMember.guild
      });
      await memberLog.send({ embeds: [embed] }).catch(() => {});
    }
  });

  client.on('guildAuditLogEntryCreate', async (auditLog, guild) => {
    const logChannel = await getLogChannel(guild, 'moderate');
    if (!logChannel) return;
    const { action, executor, target, reason } = auditLog;
    if (!executor || (executor.bot && executor.id === client.user.id)) return;

    if (action === AuditLogEvent.MemberUpdate) {
      const timeoutChange = auditLog.changes?.find(change => change.key === 'communication_disabled_until');
      if (timeoutChange) {
        const embed = createLogEmbed({
          title: 'Member Timed Out',
          emoji: '⏰',
          color: '#ED4245',
          target: target,
          moderator: executor,
          reason: reason || 'No reason provided.',
          duration: timeoutChange.new ? 'timeout' : null,
          guild
        });
        await logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup-starry') {
        await client.emit('starrySetup', interaction);
        return;
      }

      if (interaction.commandName === 'modpanel') {
        const target = interaction.options.getUser('target');
        if (!target) return interaction.reply({ content: '❌ No user selected.', ephemeral: true });

        const panelEmbed = createSystemEmbed({
          title: '🛡️ Starry Moderation Panel',
          description: `Moderation options for **${target.tag}**`,
          color: '#5865F2',
          fields: [
            { name: 'Target', value: `<@${target.id}>`, inline: true },
            { name: 'User ID', value: `\`${target.id}\``, inline: true }
          ]
        });

        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`mp_warn_${target.id}`).setLabel('Warn').setStyle(ButtonStyle.Warning),
          new ButtonBuilder().setCustomId(`mp_timeout_${target.id}`).setLabel('Timeout').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`mp_kick_${target.id}`).setLabel('Kick').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`mp_ban_${target.id}`).setLabel('Ban').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [panelEmbed], components: [actionRow], ephemeral: true });
      }

      if (interaction.commandName === 'verify-setup') {
        await interaction.reply({ content: '✅ Verification flow is enabled. Use a verification channel with a `verify_role_...` button.', ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('mp_')) {
        const [, action, targetId] = interaction.customId.split('_');
        const modal = new ModalBuilder().setCustomId(`md_${action}_${targetId}`).setTitle(`Starry ${action.toUpperCase()}`);
        if (action === 'warn') {
          const reasonInput = new TextInputBuilder().setCustomId('mod_reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        }
        if (action === 'timeout') {
          const durationInput = new TextInputBuilder().setCustomId('mod_duration').setLabel('Duration (10m, 1h, 1d)').setStyle(TextInputStyle.Short).setRequired(true);
          const reasonInput = new TextInputBuilder().setCustomId('mod_reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(durationInput), new ActionRowBuilder().addComponents(reasonInput));
        }
        if (action === 'kick' || action === 'ban') {
          const reasonInput = new TextInputBuilder().setCustomId('mod_reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        }
        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId.startsWith('badword_')) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: '❌ Only administrators can manage the bad-word filter.', ephemeral: true });
          return;
        }

        if (interaction.customId === 'badword_toggle_btn') {
          const settings = await ensureBadWords(interaction.guild.id);
          settings.enabled = !settings.enabled;
          await settings.save();
          const panel = await getBadWordPanelEmbed(interaction.guild, client);
          await interaction.update(panel);
          return;
        }

        if (interaction.customId === 'badword_add_btn') {
          const modal = new ModalBuilder().setCustomId('badword_add_modal').setTitle('Add filtered words');
          const input = new TextInputBuilder().setCustomId('badwords_input').setLabel('Words (comma separated)').setStyle(TextInputStyle.Paragraph).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await interaction.showModal(modal);
          return;
        }

        if (interaction.customId === 'badword_remove_btn') {
          const modal = new ModalBuilder().setCustomId('badword_remove_modal').setTitle('Remove filtered words');
          const input = new TextInputBuilder().setCustomId('badwords_input').setLabel('Words (comma separated)').setStyle(TextInputStyle.Paragraph).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await interaction.showModal(modal);
          return;
        }

        if (interaction.customId === 'badword_list_btn') {
          const settings = await ensureBadWords(interaction.guild.id);
          const words = settings.words.length ? settings.words.join(', ') : 'No filtered words yet.';
          const embed = new EmbedBuilder().setTitle('📜 Filtered Bad Words').setDescription(`\`\`${words.slice(0, 3900)}\`\``).setColor('#5865F2');
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }
      }

      if (interaction.customId.startsWith('verify_role_')) {
        const roleId = interaction.customId.replace('verify_role_', '');
        const token = Math.random().toString(36).slice(2, 10);
        client.verifyMap.set(token, { guildId: interaction.guild.id, userId: interaction.user.id, roleId });
        const hostUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 10000}`;
        const url = `${hostUrl}/verify?token=${token}`;
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Verify Human Access').setStyle(ButtonStyle.Link).setURL(url).setEmoji('🌐'));
        await interaction.reply({ content: '🛡️ Click the secure link to complete human verification.', components: [row], ephemeral: true });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('md_')) {
        const [, action, targetId] = interaction.customId.split('_');
        const member = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!member) {
          await interaction.reply({ content: '❌ Member not found in this server.', ephemeral: true });
          return;
        }

        const reason = interaction.fields.getTextInputValue('mod_reason') || 'No reason provided.';
        const duration = interaction.fields.getTextInputValue('mod_duration') || '10m';

        if (action === 'warn') {
          await executeModerationAction({ member, action: 'warn', reason, guild: interaction.guild, moderator: interaction.member });
          await interaction.reply({ content: `⚠️ Warned <@${member.id}>.`, ephemeral: true });
          return;
        }

        if (action === 'timeout') {
          await executeModerationAction({ member, action: 'timeout', reason, duration, guild: interaction.guild, moderator: interaction.member });
          await interaction.reply({ content: `⏰ Timed out <@${member.id}> for ${duration}.`, ephemeral: true });
          return;
        }

        if (action === 'kick') {
          await executeModerationAction({ member, action: 'kick', reason, guild: interaction.guild, moderator: interaction.member });
          await interaction.reply({ content: `🚪 Kicked <@${member.id}>.`, ephemeral: true });
          return;
        }

        if (action === 'ban') {
          await executeModerationAction({ member, action: 'ban', reason, guild: interaction.guild, moderator: interaction.member });
          await interaction.reply({ content: `🔨 Banned <@${member.id}>.`, ephemeral: true });
          return;
        }
      }

      if (interaction.customId === 'badword_add_modal') {
        const inputs = interaction.fields.getTextInputValue('badwords_input');
        const words = inputs.split(',').map(w => w.trim()).filter(Boolean);
        const settings = await ensureBadWords(interaction.guild.id);
        settings.words = [...new Set([...settings.words, ...words])];
        await settings.save();
        await interaction.reply({ content: `✅ Added ${words.length} words to the bad-word filter.`, ephemeral: true });
        return;
      }

      if (interaction.customId === 'badword_remove_modal') {
        const inputs = interaction.fields.getTextInputValue('badwords_input');
        const words = inputs.split(',').map(w => w.trim()).filter(Boolean);
        const settings = await ensureBadWords(interaction.guild.id);
        settings.words = settings.words.filter(word => !words.some(entry => entry.toLowerCase() === word.toLowerCase()));
        await settings.save();
        await interaction.reply({ content: `✅ Removed ${words.length} words from the bad-word filter.`, ephemeral: true });
        return;
      }
    }
  });

  return {
    setupStarryCommand,
    modPanelCommand,
    emergencyNukeCommand,
    verifySetupCommand,
    provisionMasterServerStructure,
    generateAIResponseWithRetry
  };
};

module.exports.provisionMasterServerStructure = provisionMasterServerStructure;
module.exports.generateAIResponseWithRetry = generateAIResponseWithRetry;
module.exports.setupStarryPayload = setupStarryCommand.toJSON();
module.exports.modPanelPayload = modPanelCommand.toJSON();
module.exports.emergencyNukePayload = emergencyNukeCommand.toJSON();
module.exports.verifySetupPayload = verifySetupCommand.toJSON();
