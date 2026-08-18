const { PermissionsBitField } = require('discord.js');
const mongoose = require('mongoose');
const { getAutomodSettings } = require('../utils/guildSettings');
const config = require('../config');

const OWNER_ID = '1465049039153135639,1257676837249617971';

// ==========================================
// 🍃 MONGOOSE SCHEMAS & MODELS (BUILT-IN)
// ==========================================
const automodGuildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true }
});

const automodChannelSchema = new mongoose.Schema({
    channelId: { type: String, required: true, unique: true },
    links: { type: Boolean, default: false },   // true = ignore/allow links
    emojis: { type: Boolean, default: false }   // true = ignore/allow emojis
});

// Reuse existing models if registered to avoid overwrite errors
const AutomodGuild = mongoose.models.AutomodGuild || mongoose.model('AutomodGuild', automodGuildSchema);
const AutomodChannel = mongoose.models.AutomodChannel || mongoose.model('AutomodChannel', automodChannelSchema);

// ==========================================
// 🔗 ULTIMATE MEDIA & GIF URL CHECKER
// ==========================================
function isAllowedUrl(linkString) {
    try {
        const cleanLink = linkString.replace(/[.,!?>)]+$/, '');
        const parsed = new URL(cleanLink);
        const host = parsed.hostname.toLowerCase();
        const pathname = parsed.pathname.toLowerCase();

        const safeDomains = [
            'discord.com', 'discordapp.com', 'discordapp.net',
            'klipy.com', 'klipy.co',
            'tenor.com', 'tenor.co', 'tenor.googleapis.com',
            'giphy.com', 'gph.is',
            'imgur.com', 'imgur.io', 'redd.it', 'reddit.com', 'twimg.com',
            'gfycat.com', 'redgifs.com',
            'ezgif.com', 'gyazo.com', 'imgflip.com', 'coub.com',
            'gifdb.com', 'gifer.com', 'makeagif.com', 'streamable.com',
            'catbox.moe', 'icegif.com', 'cliply.co', 'tumblr.com', 'pinimg.com'
        ];

        const isSafeDomain = safeDomains.some(domain => host === domain || host.endsWith('.' + domain));
        if (isSafeDomain) return true;

        const mediaExtensions = ['.gif', '.gifv', '.webp', '.mp4', '.webm', '.png', '.jpg', '.jpeg'];
        if (mediaExtensions.some(ext => pathname.endsWith(ext))) return true;

        const safePaths = ['/view/', '/gifs/', '/watch/', '/gif/', '/gallery/', '/clip/', '/sticker/'];
        if (safePaths.some(path => pathname.includes(path))) return true;

        return false;
    } catch {
        return false;
    }
}

// ==========================================
// 🚀 MAIN AUTOMOD MODULE EXPORT
// ==========================================
module.exports = (client) => {
    // High-speed In-Memory Cache
    const guildCache = new Map();
    const channelCache = new Map();

    const linkPattern = /https?:\/\/\S+/g;
    const emojiPattern = /<a?:[a-zA-Z0-9_]+:[0-9]+>|[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

    // Load DB Caches once Discord Bot connects
    client.once('ready', async () => {
        try {
            // Bulk sync Guild & Channel rules into fast memory
            const gSettings = await AutomodGuild.find().lean();
            gSettings.forEach(s => guildCache.set(s.guildId, s.enabled));

            const cSettings = await AutomodChannel.find().lean();
            cSettings.forEach(s => channelCache.set(s.channelId, { links: s.links, emojis: s.emojis }));
            
            console.log('✅ Automod Engine Ready (MongoDB Connected & Caches Synced)');
        } catch (err) {
            console.error('❌ Error synchronizing Automod MongoDB cache:', err);
        }
    });

    // ==========================================
    // 1. SLASH COMMANDS INTERACTION LISTENER
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.guild || !interaction.member) return;

        const validCommands = ['automod', 'ignore', 'unignore'];
        if (!validCommands.includes(interaction.commandName)) return;

        const isOwner = typeof client.isOwner === 'function' ? client.isOwner(interaction.user.id) : interaction.user.id === OWNER_ID;
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isAdmin && !isOwner) {
            return interaction.reply({ content: '❌ You need **Administrator** permissions to manage Automod settings.', ephemeral: true }).catch(() => {});
        }

        const guildId = interaction.guildId;

        // /automod Command
        if (interaction.commandName === 'automod') {
            const action = interaction.options.getString('action');

            if (action === 'status') {
                const isEnabled = guildCache.has(guildId) ? guildCache.get(guildId) : true;
                return interaction.reply({ content: `📢 **Server-Wide Automod Status:** ${isEnabled ? '🟢 Enabled' : '🔴 Disabled'}`, ephemeral: true }).catch(() => {});
            }

            const targetState = action === 'enable';
            
            // Atomic DB write + Cache sync
            await AutomodGuild.findOneAndUpdate({ guildId }, { enabled: targetState }, { upsert: true, new: true });
            guildCache.set(guildId, targetState);

            return interaction.reply({ content: `${targetState ? '✅' : '🚫'} Server-wide Automod is now **${action.toUpperCase()}D**.` }).catch(() => {});
        }

        // /ignore and /unignore Commands
        if (interaction.commandName === 'ignore' || interaction.commandName === 'unignore') {
            const type = interaction.options.getString('type');
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const channelId = channel.id;

            let cSettings = channelCache.get(channelId) || { links: false, emojis: false };

            if (type === 'status' && interaction.commandName === 'ignore') {
                return interaction.reply({ content: `📢 **Automod Status for <#${channelId}>:**\n🔗 Links: ${cSettings.links ? '❌ Ignored' : '✅ Active'}\n😀 Emojis: ${cSettings.emojis ? '❌ Ignored' : '✅ Active'}`, ephemeral: true }).catch(() => {});
            }

            const targetState = interaction.commandName === 'ignore';
            if (type === 'links' || type === 'all') cSettings.links = targetState;
            if (type === 'emojis' || type === 'all') cSettings.emojis = targetState;

            // Atomic DB write + Cache sync
            await AutomodChannel.findOneAndUpdate({ channelId }, { links: cSettings.links, emojis: cSettings.emojis }, { upsert: true, new: true });
            channelCache.set(channelId, cSettings);

            const typeName = type === 'all' ? '**All** Automod filters are' : `Automod **${type}** filter is`;
            return interaction.reply({ content: `${targetState ? '🚫' : '✅'} ${typeName} now **${targetState ? 'DISABLED' : 'ENABLED'}** in <#${channelId}>.` }).catch(() => {});
        }
    });

    // ==========================================
    // 2. REAL-TIME CHAT FILTER & TIMEOUT ENGINE
    // ==========================================
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        // Staff / Owner Bypass
        const isStaff = message.member && (
            message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
            message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)
        );
        const isOwner = typeof client.isOwner === 'function' ? client.isOwner(message.author.id) : message.author.id === OWNER_ID;

        if (isStaff || isOwner || message.author.id === message.guild.ownerId) return;
        if (message.content.startsWith('.')) return; // Prefix command bypass

        const automodSettings = getAutomodSettings(message.guild.id);
        if (!automodSettings.enabled) return;

        // 2. Fetch Channel Settings (From Memory Cache with DB fallback)
        let channelSettings = channelCache.get(message.channel.id);
        if (!channelSettings) {
            try {
                const dbSetting = await AutomodChannel.findOne({ channelId: message.channel.id }).lean();
                channelSettings = dbSetting ? { links: dbSetting.links, emojis: dbSetting.emojis } : { links: false, emojis: false };
                channelCache.set(message.channel.id, channelSettings);
            } catch {
                channelSettings = { links: false, emojis: false };
            }
        }

        // 3. Match Content
        const rawLinks = message.content.match(linkPattern) || [];
        const unauthorizedLinks = rawLinks.filter(link => !isAllowedUrl(link));
        const emojis = message.content.match(emojiPattern) || [];

        const content = message.content || '';
        const uppercaseRatio = (content.match(/[A-Z]/g) || []).length / Math.max(content.length, 1);
        const mentionCount = (content.match(/<@!?(\d+)>/g) || []).length;

        const isLinkSpam = automodSettings.invites && !channelSettings.links && unauthorizedLinks.length >= 1;
        const isEmojiSpam = automodSettings.spam && !channelSettings.emojis && emojis.length >= 5;
        const isCapsSpam = automodSettings.caps && content.length >= 8 && uppercaseRatio > (config.automod.capsThreshold || 70) / 100;
        const isMassMention = automodSettings.massMention && mentionCount >= 5;

        if (!isLinkSpam && !isEmojiSpam && !isCapsSpam && !isMassMention) return;

        try { await message.delete(); } catch {}

        if (isLinkSpam) {
            try {
                await message.member.timeout(10 * 60 * 1000, "Automod: Unauthorized Link Spam");
                const warnMsg = await message.channel.send(`⚠️ ${message.author.toString()} has been timed out for **10 minutes** for sending an unauthorized link.`);
                setTimeout(() => warnMsg.delete().catch(() => {}), 7000);
            } catch {}
            return;
        }

        if (isEmojiSpam) {
            try {
                await message.member.timeout(2 * 60 * 1000, "Automod: Emoji Spam");
                const warnMsg = await message.channel.send(`⚠️ ${message.author.toString()} has been timed out for **2 minutes** for emoji spam.`);
                setTimeout(() => warnMsg.delete().catch(() => {}), 7000);
            } catch {}
            return;
        }

        if (isCapsSpam) {
            try {
                await message.member.timeout(2 * 60 * 1000, "Automod: Excessive Caps");
                const warnMsg = await message.channel.send(`⚠️ ${message.author.toString()} has been timed out for **2 minutes** for excessive caps.`);
                setTimeout(() => warnMsg.delete().catch(() => {}), 7000);
            } catch {}
            return;
        }

        if (isMassMention) {
            try {
                await message.member.timeout(2 * 60 * 1000, "Automod: Mass Mention");
                const warnMsg = await message.channel.send(`⚠️ ${message.author.toString()} has been timed out for **2 minutes** for mass mention spam.`);
                setTimeout(() => warnMsg.delete().catch(() => {}), 7000);
            } catch {}
        }
    });
};
