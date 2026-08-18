// ==========================================
// 📊 SUPREME LEVELING ENGINE (PART 1 OF 2)
// File Path: modules/leveling.js
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType, 
    MessageFlags 
} = require('discord.js');
const mongoose = require('mongoose');

const EPHEMERAL_FLAG = MessageFlags ? MessageFlags.Ephemeral : 6;

// 🗄️ MONGODB SCHEMAS
const LevelUserSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
    vc_time: { type: Number, default: 0 }
});
LevelUserSchema.index({ userId: 1, guildId: 1 }, { unique: true });
const LevelUser = mongoose.models.LevelUser || mongoose.model('LevelUser', LevelUserSchema);

const LevelSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    logChannelId: { type: String, default: null }
});
const LevelSettings = mongoose.models.LevelSettings || mongoose.model('LevelSettings', LevelSettingsSchema);

// In-Memory Caches
const settingsCache = new Map();
const xpCooldowns = new Map(); 
const vcJoinTimes = new Map(); 

// Helpers
function calculateLevel(xp) { return Math.floor(0.1 * Math.sqrt(xp)); }
function xpForNextLevel(currentLevel) { return Math.pow((currentLevel + 1) / 0.1, 2); }
function formatVcTime(minutes) {
    if (!minutes) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

// 🚀 UPGRADED SUPREME LEVEL-UP EMBED BUILDER
function buildLevelUpEmbed(user, newLevel, newXp, guild) {
    const nextLevelXp = xpForNextLevel(newLevel);

    return new EmbedBuilder()
        .setColor('#FFD700')
        .setAuthor({ name: '🎉 LEVEL UP UNLOCKED!', iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTitle(`✨ Congratulations ${user.username}!`)
        .setDescription(`Your active participation in **${guild.name}** has paid off! You have leveled up!`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '⭐ New Level', value: `\`\`\`ansi\n\u001b[1;36mLevel ${newLevel}\u001b[0m\n\`\`\``, inline: true },
            { name: '📊 Total XP', value: `\`\`\`ansi\n\u001b[1;33m${newXp.toLocaleString()} XP\u001b[0m\n\`\`\``, inline: true },
            { name: '🎯 Next Target', value: `\`\`\`ansi\n\u001b[1;32m${Math.round(nextLevelXp).toLocaleString()} XP\u001b[0m\n\`\`\``, inline: true }
        )
        .setFooter({ text: `${guild.name} • Leveling System`, iconURL: guild.iconURL({ dynamic: true }) })
        .setTimestamp();
}

// Build Rank Embed
async function buildRankEmbed(targetUser, userData, guild) {
    const nextLevelXp = xpForNextLevel(userData.level);
    const currentLevelBaseXp = xpForNextLevel(userData.level - 1) || 0;
    const levelXpNeeded = Math.max(1, nextLevelXp - currentLevelBaseXp);
    const userLevelXp = Math.max(0, userData.xp - currentLevelBaseXp);
    
    const progressPercent = Math.min(Math.round((userLevelXp / levelXpNeeded) * 10), 10);
    const progressBar = '🟩'.repeat(progressPercent) + '⬛'.repeat(10 - progressPercent);

    const higherUsers = await LevelUser.countDocuments({ guildId: guild.id, xp: { $gt: userData.xp } }).catch(() => 0);
    const rankPos = higherUsers + 1;

    return new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: `${targetUser.username}'s Rank & Stats`, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '👑 Rank Position', value: `\`\`\`ansi\n\u001b[1;33m#${rankPos}\u001b[0m\n\`\`\``, inline: true },
            { name: '✨ Current Level', value: `\`\`\`ansi\n\u001b[1;36mLevel ${userData.level}\u001b[0m\n\`\`\``, inline: true },
            { name: '📊 Total XP', value: `\`\`\`ansi\n\u001b[1;32m${userData.xp.toLocaleString()} XP\u001b[0m\n\`\`\``, inline: true },
            { name: '💬 Messages Sent', value: `\`${(userData.messages || 0).toLocaleString()}\``, inline: true },
            { name: '🎙️ Voice Time', value: `\`${formatVcTime(userData.vc_time)}\``, inline: true },
            { name: '\u200b', value: '\u200b', inline: true }, 
            { name: `📈 Progress to Level ${userData.level + 1}`, value: `${progressBar} (${Math.round((userLevelXp / levelXpNeeded) * 100)}%)\n\`${userData.xp.toLocaleString()} / ${Math.round(nextLevelXp).toLocaleString()} XP\`` }
        )
        .setFooter({ text: guild.name, iconURL: guild.iconURL() })
        .setTimestamp();
}

// Build Leaderboard Data
async function buildLeaderboardData(guildId, guild, type = 'xp') {
    let topUsers = [];
    let title = ''; let color = '';

    if (type === 'xp') {
        topUsers = await LevelUser.find({ guildId }).sort({ xp: -1 }).limit(10);
        title = 'Top XP Earners'; color = '#FFD700';
    } else if (type === 'messages') {
        topUsers = await LevelUser.find({ guildId }).sort({ messages: -1 }).limit(10);
        title = 'Most Active Chatters'; color = '#00BFFF';
    } else if (type === 'vc') {
        topUsers = await LevelUser.find({ guildId }).sort({ vc_time: -1 }).limit(10);
        title = 'Voice Channel Leaders'; color = '#FF4500';
    }

    let description = '';
    if (topUsers.length === 0) {
        description = '*No data available for this category yet.*';
    } else {
        topUsers.forEach((user, index) => {
            let medal = '🏅';
            if (index === 0) medal = '🥇';
            if (index === 1) medal = '🥈';
            if (index === 2) medal = '🥉';

            if (type === 'xp') description += `**${index + 1}.** ${medal} <@${user.userId}>\n↳ **Level ${user.level}** • \`${user.xp.toLocaleString()} XP\`\n\n`;
            if (type === 'messages') description += `**${index + 1}.** ${medal} <@${user.userId}>\n↳ \`${user.messages.toLocaleString()} Messages\`\n\n`;
            if (type === 'vc') description += `**${index + 1}.** ${medal} <@${user.userId}>\n↳ \`${formatVcTime(user.vc_time)}\` in Voice\n\n`;
        });
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🏆 Server Leaderboard: ${title}`)
        .setDescription(description)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: guild.name, iconURL: guild.iconURL() })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lb_xp').setLabel('XP Rank').setStyle(type === 'xp' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('✨'),
        new ButtonBuilder().setCustomId('lb_messages').setLabel('Messages').setStyle(type === 'messages' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('💬'),
        new ButtonBuilder().setCustomId('lb_vc').setLabel('Voice Time').setStyle(type === 'vc' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('🎙️')
    );

    return { embeds: [embed], components: [row] };
}

module.exports = (client) => {
    const PREFIX = '.';

    async function initSettings() {
        try {
            const settings = await LevelSettings.find();
            settings.forEach(s => settingsCache.set(s.guildId, { enabled: s.enabled, logChannelId: s.logChannelId }));
            console.log('✅ Leveling Module Loaded (MongoDB Synced)');
        } catch (err) {}
    }
    initSettings();

    // 1. VOICE ACTIVITY TRACKER
    client.on('voiceStateUpdate', async (oldState, newState) => {
        if (!newState.member || newState.member.user.bot) return;

        const userId = newState.member.id;
        const guildId = newState.guild.id;
        const cacheKey = `${guildId}-${userId}`;

        if (!oldState.channelId && newState.channelId) {
            vcJoinTimes.set(cacheKey, Date.now());
        } else if (oldState.channelId && !newState.channelId) {
            if (vcJoinTimes.has(cacheKey)) {
                const durationMs = Date.now() - vcJoinTimes.get(cacheKey);
                const durationMinutes = Math.floor(durationMs / 60000);
                if (durationMinutes > 0) {
                    await LevelUser.findOneAndUpdate(
                        { userId, guildId }, 
                        { $inc: { vc_time: durationMinutes, xp: durationMinutes * 5 } }, 
                        { upsert: true }
                    ).catch(() => {});
                }
                vcJoinTimes.delete(cacheKey);
            }
        }
    });

    // 2. MESSAGE TRACKING & TRIGGER COMMANDS
    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const rawContent = message.content.toLowerCase().trim();

        const isPrefix = rawContent.startsWith(PREFIX);
        const isTrigger = rawContent.startsWith('starry ') || rawContent.startsWith('jarvis ') || message.mentions.has(client.user?.id);

        if (isPrefix || isTrigger) {
            let cleanText = rawContent;
            if (isPrefix) cleanText = rawContent.slice(PREFIX.length).trim();
            if (isTrigger) cleanText = rawContent.replace(/^(?:<@!?\d+>|starry|jarvis)\s*/i, '').trim();

            const args = cleanText.split(/ +/);
            const command = args.shift()?.toLowerCase();

            if (command === 'rank') {
                const targetUser = message.mentions.users.first() || message.author;
                let userData = await LevelUser.findOne({ userId: targetUser.id, guildId });
                if (!userData) userData = { xp: 0, level: 0, messages: 0, vc_time: 0 };
                const embed = await buildRankEmbed(targetUser, userData, message.guild);
                return message.reply({ embeds: [embed] }).catch(() => {});
            }

            if (command === 'messages') {
                const targetUser = message.mentions.users.first() || message.author;
                const userData = await LevelUser.findOne({ userId: targetUser.id, guildId });
                return message.reply(`💬 **${targetUser.username}** has sent **${userData ? userData.messages.toLocaleString() : 0}** messages in this server!`).catch(() => {});
            }

            if (command === 'leaderboard' || command === 'lb') {
                const data = await buildLeaderboardData(guildId, message.guild, 'xp');
                return message.reply(data).catch(() => {});
            }

            // Admin Commands (.enableleveling, .addxp, .removexp, .resetlevel)
            if (message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                if (command === 'enableleveling') {
                    const targetChan = message.mentions.channels.first();
                    const logId = targetChan ? targetChan.id : null;

                    await LevelSettings.findOneAndUpdate({ guildId }, { enabled: true, logChannelId: logId }, { upsert: true });
                    settingsCache.set(guildId, { enabled: true, logChannelId: logId });

                    // Generate Sample Preview Embed
                    const previewEmbed = buildLevelUpEmbed(message.author, 5, 2500, message.guild);

                    let msg = `⚙️ **Leveling System Enabled!**\nShowing a preview of the level-up announcement embed below:`;
                    if (targetChan) {
                        msg += `\n📌 **Announcements Channel:** <#${targetChan.id}>`;
                        // Send sample message to log channel
                        targetChan.send({ content: `🧪 **[Leveling System Setup Test]**`, embeds: [previewEmbed] }).catch(() => {});
                    }

                    return message.reply({ content: msg, embeds: [previewEmbed] });
                }

                if (command === 'addxp') {
                    const targetUser = message.mentions.users.first();
                    const amount = parseInt(args[1]);
                    if (!targetUser || isNaN(amount)) return message.reply('❌ Usage: `.addxp @User <amount>` or `starry addxp @User <amount>`');

                    const userDoc = await LevelUser.findOneAndUpdate(
                        { userId: targetUser.id, guildId },
                        { $inc: { xp: amount } },
                        { new: true, upsert: true }
                    );
                    const newLevel = calculateLevel(userDoc.xp);
                    await LevelUser.updateOne({ userId: targetUser.id, guildId }, { level: newLevel });

                    return message.reply(`✅ Added **${amount.toLocaleString()} XP** to <@${targetUser.id}>! (New Level: **${newLevel}**)`);
                }

                if (command === 'removexp') {
                    const targetUser = message.mentions.users.first();
                    const amount = parseInt(args[1]);
                    if (!targetUser || isNaN(amount)) return message.reply('❌ Usage: `.removexp @User <amount>` or `starry removexp @User <amount>`');

                    const userDoc = await LevelUser.findOne({ userId: targetUser.id, guildId });
                    if (!userDoc) return message.reply('❌ User has no XP data.');

                    const newXp = Math.max(0, userDoc.xp - amount);
                    const newLevel = calculateLevel(newXp);
                    await LevelUser.updateOne({ userId: targetUser.id, guildId }, { xp: newXp, level: newLevel });

                    return message.reply(`✅ Removed **${amount.toLocaleString()} XP** from <@${targetUser.id}>! (New Level: **${newLevel}**)`);
                }

                if (command === 'resetlevel') {
                    const targetUser = message.mentions.users.first();
                    if (!targetUser) return message.reply('❌ Usage: `.resetlevel @User` or `starry resetlevel @User`');

                    await LevelUser.deleteOne({ userId: targetUser.id, guildId });
                    return message.reply(`🧹 Reset all leveling data for <@${targetUser.id}>.`);
                }
            }
            if (isPrefix) return; 
        }

        // XP Gain Logic
        const guildSettings = settingsCache.get(guildId) || { enabled: true, logChannelId: null };
        if (!guildSettings.enabled) return; 

        const cooldownKey = `${guildId}-${userId}`;
        const onCooldown = xpCooldowns.has(cooldownKey) && (Date.now() - xpCooldowns.get(cooldownKey) < 60000);

        if (onCooldown) {
            await LevelUser.findOneAndUpdate({ userId, guildId }, { $inc: { messages: 1 } }, { upsert: true }).catch(() => {});
            return;
        }

        xpCooldowns.set(cooldownKey, Date.now()); 

        const userDoc = await LevelUser.findOneAndUpdate(
            { userId, guildId },
            { $inc: { messages: 1, xp: 15 } },
            { new: true, upsert: true }
        ).catch(() => {});

        if (!userDoc) return;

        const newLevel = calculateLevel(userDoc.xp);
        if (newLevel > userDoc.level) {
            await LevelUser.updateOne({ userId, guildId }, { level: newLevel }).catch(() => {});

            let logChannel = null;
            if (guildSettings.logChannelId) {
                logChannel = message.guild.channels.cache.get(guildSettings.logChannelId);
            }

            if (!logChannel && typeof client.getLogChannel === 'function') {
                logChannel = client.getLogChannel(message.guild, 'misc');
            }

            const levelUpEmbed = buildLevelUpEmbed(message.author, newLevel, userDoc.xp, message.guild);

            if (logChannel) {
                logChannel.send({ 
                    content: `<@${userId}>`, 
                    embeds: [levelUpEmbed],
                    allowedMentions: { users: [userId] }
                }).catch(() => {});
            } else {
                message.reply({ content: `🎉 **Level Up!**`, embeds: [levelUpEmbed] }).catch(() => {
                    message.react('⭐').catch(() => {});
                });
            }
        }
    });
    // ==========================================
    // 3. SLASH COMMAND SETUP WITH LIVE PREVIEW
    // ==========================================
    client.on('interactionCreate', async interaction => {
        // Leaderboard Tab Switching Buttons
        if (interaction.isButton() && interaction.customId.startsWith('lb_')) {
            const type = interaction.customId.split('_')[1]; 
            const data = await buildLeaderboardData(interaction.guildId, interaction.guild, type);
            return interaction.update(data).catch(() => {});
        }

        if (!interaction.isChatInputCommand()) return;

        // /enableleveling
        if (interaction.commandName === 'enableleveling') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Admin permissions required.', flags: [EPHEMERAL_FLAG] });
            }

            const channel = interaction.options.getChannel('channel');
            const logChannelId = channel ? channel.id : null;

            await LevelSettings.findOneAndUpdate(
                { guildId: interaction.guildId },
                { enabled: true, logChannelId: logChannelId },
                { upsert: true }
            );

            settingsCache.set(interaction.guildId, { enabled: true, logChannelId });

            // Generate Sample Preview Embed
            const sampleEmbed = buildLevelUpEmbed(interaction.user, 5, 2500, interaction.guild);

            let setupMessage = `⚙️ **Leveling System Enabled!**\nBelow is a sample preview of the Level-Up embed:`;

            if (channel) {
                setupMessage += `\n📌 Announcements target: <#${channel.id}>`;
                // Send a test preview embed directly into the selected log channel
                channel.send({ 
                    content: `🧪 **[Leveling System Setup Test]** Here is how level-up cards will look in this channel:`, 
                    embeds: [sampleEmbed] 
                }).catch(() => {});
            }

            return interaction.reply({ content: setupMessage, embeds: [sampleEmbed], flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }
    });
};
