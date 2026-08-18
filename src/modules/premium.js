// ==========================================
// 1. IMPORTS & MONGOOSE SCHEMA WITH EXPIRATION
// ==========================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const PremiumSchema = new mongoose.Schema({
    targetId: { type: String, required: true, unique: true }, // Guild ID or User ID
    type: { type: String, enum: ['guild', 'user'], default: 'guild' },
    isPremium: { type: Boolean, default: true },
    activatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null } // null = Lifetime / Permanent
});

const PremiumModel = mongoose.models.PremiumGuilds || mongoose.model('PremiumGuilds', PremiumSchema);

// Helper: Duration String Parser (e.g. 7d, 30d, 1y, lifetime)
function parseDuration(str) {
    if (!str || ['lifetime', 'permanent', 'never'].includes(str.toLowerCase().trim())) return null;
    const match = str.trim().match(/^(\d+)([smh dwy])$/i);
    if (!match) return null;

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
        y: 365 * 24 * 60 * 60 * 1000
    };

    return new Date(Date.now() + (amount * (multipliers[unit] || multipliers.d)));
}

// ==========================================
// 2. MAIN PREMIUM MODULE
// ==========================================
const premiumModule = (client) => {
    // 🧠 High-Speed Memory Cache with Expiration Objects
    const premiumCache = new Map(); // targetId -> expiresAt timestamp or null

    const BOT_OWNERS = ['1465049039153135639', '1257676837249617971'];
    if (process.env.OWNER_ID && !BOT_OWNERS.includes(process.env.OWNER_ID)) {
        BOT_OWNERS.push(process.env.OWNER_ID);
    }

    // 📥 DB Loader & Automatic Index Cleaner
    const loadPremiumCache = async () => {
        try {
            // Auto-fix: Safely drop legacy unique index if it exists in MongoDB
            await PremiumModel.collection.dropIndex('guildId_1').catch(() => {});

            const premiumRecords = await PremiumModel.find({ isPremium: true });
            premiumCache.clear();

            const now = Date.now();
            for (const record of premiumRecords) {
                // Ignore and delete expired records
                if (record.expiresAt && record.expiresAt.getTime() <= now) {
                    await PremiumModel.deleteOne({ _id: record._id }).catch(() => {});
                    continue;
                }
                premiumCache.set(record.targetId, record.expiresAt ? record.expiresAt.getTime() : null);
            }
            console.log(`💎 Loaded ${premiumCache.size} Active Premium entities into high-speed RAM cache!`);
        } catch (err) {
            console.error('❌ Failed to load premium cache:', err);
        }
    };

    if (mongoose.connection.readyState === 1) {
        loadPremiumCache();
    } else {
        mongoose.connection.once('open', loadPremiumCache);
    }

    // ⚡ Master Premium Fast Check with Auto-Expiration Handling
    client.isPremium = (guildId, userId = null) => {
        if (userId && BOT_OWNERS.includes(userId)) return true;

        const checkTarget = (id) => {
            if (!id || !premiumCache.has(id)) return false;
            const expiresAt = premiumCache.get(id);
            if (expiresAt !== null && Date.now() >= expiresAt) {
                premiumCache.delete(id); // Expired, purge from RAM
                PremiumModel.deleteOne({ targetId: id }).catch(() => {});
                return false;
            }
            return true;
        };

        if (guildId && checkTarget(guildId)) return true;
        if (userId && checkTarget(userId)) return true;

        return false;
    };

    // =====================================================================
    // 💎 GLOBAL PREMIUM MODERATION DM SYSTEM
    // =====================================================================
    client.sendPremiumModDM = async (member, moderator, action, reason, duration, guild, caseId = 'N/A', appealLink = null) => {
        const actionType = action.toLowerCase();
        const isGuildPremium = client.isPremium(guild.id, member.id);

        if (!isGuildPremium) {
            const basicEmbed = new EmbedBuilder()
                .setColor('#2F3136')
                .setTitle(`Moderation Notice: ${actionType.toUpperCase()}`)
                .setDescription(`You have received a moderation action in **${guild.name}**.`)
                .addFields(
                    { name: 'Action', value: actionType.toUpperCase(), inline: true },
                    { name: 'Reason', value: reason || 'No reason provided.', inline: true }
                )
                .setFooter({ text: `${guild.name} • Upgrade server to Premium for enhanced moderation notices.` })
                .setTimestamp();

            try {
                await member.send({ embeds: [basicEmbed] });
                return true;
            } catch (err) {
                return false;
            }
        }

        let embedColor, actionTitle, actionEmoji, durationDisplay;

        switch(actionType) {
            case 'ban':
                embedColor = '#ED4245'; actionTitle = 'Server Ban Notice'; actionEmoji = '🔨'; durationDisplay = duration ? `\`${duration}\`` : '`Permanent`'; break;
            case 'kick':
                embedColor = '#FEE75C'; actionTitle = 'Server Kick Notice'; actionEmoji = '👢'; durationDisplay = '`Immediate`'; break;
            case 'timeout':
                embedColor = '#5865F2'; actionTitle = 'Server Timeout Notice'; actionEmoji = '⏱️'; durationDisplay = duration ? `\`${duration}\`` : '`Unknown`'; break;
            default:
                embedColor = '#95A5A6'; actionTitle = 'Moderation Notice'; actionEmoji = '🛡️'; durationDisplay = '`N/A`';
        }

        const modEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setAuthor({ name: `${guild.name} | Security & Moderation`, iconURL: guild.iconURL({ dynamic: true }) })
            .setTitle(`${actionEmoji} ${actionTitle}`)
            .setDescription(`Hello **${member.user.username}**, you have received a formal moderation action in **${guild.name}**.\n\nPlease review the details below.`)
            .addFields(
                { name: '👤 Moderator', value: `\`${moderator.user.username}\``, inline: true },
                { name: '🛡️ Action', value: `\`${actionType.charAt(0).toUpperCase() + actionType.slice(1)}\``, inline: true },
                { name: '🏷️ Case ID', value: `\`#${caseId}\``, inline: true },
                { name: '📝 Reason for Action', value: `>>> ${reason || 'No specific reason was provided.'}`, inline: false },
                { name: '⏳ Duration', value: durationDisplay, inline: true },
                { name: '📅 Time of Action', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
            )
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setFooter({ text: `💎 Premium Automated Notice`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const components = [];
        const row = new ActionRowBuilder();

        if (['ban', 'timeout'].includes(actionType) && appealLink) {
            row.addComponents(new ButtonBuilder().setLabel('Submit Appeal').setURL(appealLink).setStyle(ButtonStyle.Link).setEmoji('⚖️'));
        }

        if (actionType !== 'ban') {
            row.addComponents(new ButtonBuilder().setLabel('Read Server Rules').setURL('https://discord.com').setStyle(ButtonStyle.Link).setEmoji('📜'));
        }

        if (row.components.length > 0) components.push(row);

        try {
            await member.send({ embeds: [modEmbed], components: components });
            return true; 
        } catch (error) {
            return false;
        }
    };
    // =====================================================================
    // 🎛️ 3. PREMIUM SLASH COMMAND INTERACTION HANDLERS
    // =====================================================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const { commandName, options, guildId, user } = interaction;

        // --- 1. /premiumcheck ---
        if (commandName === 'premiumcheck') {
            try {
                const targetId = guildId || user.id;
                const enabled = client.isPremium(guildId, user.id);

                let expireMsg = '`Lifetime (Permanent)`';
                if (enabled) {
                    const expiresAtMs = premiumCache.get(guildId) || premiumCache.get(user.id);
                    if (expiresAtMs) {
                        expireMsg = `<t:${Math.floor(expiresAtMs / 1000)}:R> (<t:${Math.floor(expiresAtMs / 1000)}:F>)`;
                    }
                }

                return interaction.reply({
                    content: enabled
                        ? `💎 **Premium is ACTIVE** on this server/account!\n🆔 **Target ID:** \`${targetId}\`\n⏳ **Expires:** ${expireMsg}`
                        : `ℹ️ **Premium is NOT active** on this server. Contact bot owner to activate.`,
                    ephemeral: true
                });
            } catch (err) {
                console.error('PremiumCheck Error:', err);
                return interaction.reply({ content: '❌ An error occurred while checking premium status.', ephemeral: true }).catch(() => {});
            }
        }

        // --- 2. /activatepremium ---
        if (commandName === 'activatepremium') {
            if (!BOT_OWNERS.includes(user.id)) {
                return interaction.reply({ content: '❌ Only Bot Owners can manage Premium activation.', ephemeral: true });
            }

            try {
                await interaction.deferReply({ ephemeral: true });

                const rawInputId = options.getString('server_id');
                const durationInput = options.getString('duration');
                const targetId = rawInputId ? rawInputId.trim() : (guildId || user.id);

                if (!targetId) {
                    return interaction.editReply({ content: '❌ Invalid Target ID provided.' });
                }

                const expiresAtDate = parseDuration(durationInput);

                await PremiumModel.findOneAndUpdate(
                    { targetId: targetId },
                    { 
                        targetId: targetId, 
                        isPremium: true, 
                        type: rawInputId ? 'guild' : (guildId ? 'guild' : 'user'),
                        expiresAt: expiresAtDate 
                    },
                    { upsert: true, new: true }
                );

                const expireMs = expiresAtDate ? expiresAtDate.getTime() : null;
                premiumCache.set(targetId, expireMs);
                if (guildId && targetId === guildId) premiumCache.set(guildId, expireMs);

                const expiryText = expiresAtDate 
                    ? `<t:${Math.floor(expiresAtDate.getTime() / 1000)}:R> (<t:${Math.floor(expiresAtDate.getTime() / 1000)}:F>)` 
                    : '`Lifetime / Permanent`';

                return interaction.editReply({ 
                    content: `✅ **SUCCESS:** Premium activated for \`${targetId}\`!\n⏳ **Expiration:** ${expiryText}` 
                });
            } catch (err) {
                console.error('ActivatePremium Error:', err);
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({ content: `❌ **Failed to activate Premium:** \`${err.message}\`` });
                } else {
                    return interaction.reply({ content: `❌ **Failed to activate Premium:** \`${err.message}\``, ephemeral: true });
                }
            }
        }

        // --- 3. /deactivatepremium & /removepremium ---
        if (commandName === 'deactivatepremium' || commandName === 'removepremium') {
            if (!BOT_OWNERS.includes(user.id)) {
                return interaction.reply({ content: '❌ Only Bot Owners can manage Premium activation.', ephemeral: true });
            }

            try {
                await interaction.deferReply({ ephemeral: true });

                const rawInputId = options.getString('server_id');
                const targetId = rawInputId ? rawInputId.trim() : (guildId || user.id);

                await PremiumModel.deleteOne({ targetId: targetId });
                premiumCache.delete(targetId);

                return interaction.editReply({ content: `🛑 **SUCCESS:** Premium status removed from target ID \`${targetId}\`.` });
            } catch (err) {
                console.error('DeactivatePremium Error:', err);
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({ content: `❌ **Failed to deactivate Premium:** \`${err.message}\`` });
                } else {
                    return interaction.reply({ content: `❌ **Failed to deactivate Premium:** \`${err.message}\``, ephemeral: true });
                }
            }
        }
    });
};

// Hybrid Export
premiumModule.PremiumModel = PremiumModel;
module.exports = premiumModule;
