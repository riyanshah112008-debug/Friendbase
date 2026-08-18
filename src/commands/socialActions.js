// ==========================================
// 🎭 STARRY SUPREME SOCIAL & ANIME ACTIONS MODULE
// ==========================================
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const mongoose = require('mongoose');
const crypto = require('crypto');

// EPHEMERAL RESPONSE FLAG (BITFIELD 6)
const EPHEMERAL_FLAG = MessageFlags.Ephemeral || 6;

// Fallback User Schema in case models/User.js is loaded dynamically
const User = mongoose.models.User || (function() {
    try {
        return require('../models/User');
    } catch (e) {
        const userSchema = new mongoose.Schema({
            userId: { type: String, required: true },
            guildId: { type: String, required: true }
        }, { strict: false });
        return mongoose.models.User || mongoose.model('User', userSchema);
    }
})();

// Crypto-Secure Random Selector (Fixes Codacy Weak PRNG)
function getRandomIndex(arrayLength) {
    if (!arrayLength || arrayLength <= 0) return 0;
    return crypto.randomInt(0, arrayLength);
}

// High-Availability Multi-Source GIF Database (22 Categories)
const GIF_DATABASE = {
    kiss: [
        'https://cdn.nekos.life/kiss/kiss_001.gif', 'https://cdn.nekos.life/kiss/kiss_002.gif',
        'https://purrbot.site/img/sfw/kiss/gif/kiss_001.gif', 'https://purrbot.site/img/sfw/kiss/gif/kiss_002.gif',
        'https://media.tenor.com/G3va39rn8E4AAAAC/anime-kiss.gif'
    ],
    pat: [
        'https://cdn.nekos.life/pat/pat_001.gif', 'https://cdn.nekos.life/pat/pat_002.gif',
        'https://purrbot.site/img/sfw/pat/gif/pat_001.gif', 'https://purrbot.site/img/sfw/pat/gif/pat_002.gif',
        'https://media.tenor.com/L2z7ILmjTOzmM/anime-pat.gif'
    ],
    hug: [
        'https://cdn.nekos.life/hug/hug_001.gif', 'https://cdn.nekos.life/hug/hug_002.gif',
        'https://purrbot.site/img/sfw/hug/gif/hug_001.gif', 'https://purrbot.site/img/sfw/hug/gif/hug_002.gif',
        'https://media.tenor.com/l2QDM9Jnim1YV55YA/anime-hug.gif'
    ],
    slap: [
        'https://cdn.nekos.life/slap/slap_001.gif', 'https://purrbot.site/img/sfw/slap/gif/slap_001.gif',
        'https://media.tenor.com/j3iGKfXRKlLqw/anime-slap.gif'
    ],
    cuddle: [
        'https://cdn.nekos.life/cuddle/cuddle_001.gif', 'https://purrbot.site/img/sfw/cuddle/gif/cuddle_001.gif',
        'https://media.tenor.com/PHZ7v9tfQu0o0/anime-cuddle.gif'
    ],
    bite: [
        'https://purrbot.site/img/sfw/bite/gif/bite_001.gif', 'https://purrbot.site/img/sfw/bite/gif/bite_002.gif',
        'https://media.tenor.com/793_1yC3-pAAAAAC/anime-bite.gif'
    ],
    poke: [
        'https://cdn.nekos.life/poke/poke_001.gif', 'https://purrbot.site/img/sfw/poke/gif/poke_001.gif',
        'https://media.tenor.com/y88W09-L7O0AAAAC/anime-poke.gif'
    ],
    punch: [
        'https://purrbot.site/img/sfw/punch/gif/punch_001.gif', 'https://media.tenor.com/SwV3qf9N4L4AAAAC/anime-punch.gif'
    ],
    tickle: [
        'https://cdn.nekos.life/tickle/tickle_001.gif', 'https://purrbot.site/img/sfw/tickle/gif/tickle_001.gif',
        'https://media.tenor.com/8Q_a4Kqf8jAAAAAC/anime-tickle.gif'
    ],
    feed: [
        'https://cdn.nekos.life/feed/feed_001.gif', 'https://purrbot.site/img/sfw/feed/gif/feed_001.gif',
        'https://media.tenor.com/m40fH9PZ1JkAAAAC/anime-feed.gif'
    ],
    lick: [
        'https://cdn.nekos.life/lick/lick_001.gif', 'https://purrbot.site/img/sfw/lick/gif/lick_001.gif',
        'https://media.tenor.com/x8mR9xK6K8AAAAAC/anime-lick.gif'
    ],
    highfive: [
        'https://purrbot.site/img/sfw/highfive/gif/highfive_001.gif', 'https://media.tenor.com/10gLW3UxzKYSxa/anime-highfive.gif'
    ],
    wave: [
        'https://purrbot.site/img/sfw/wave/gif/wave_001.gif', 'https://media.tenor.com/6Uq4vA5C_mUAAAAC/anime-wave.gif'
    ],
    sleep: [
        'https://purrbot.site/img/sfw/sleep/gif/sleep_001.gif', 'https://media.tenor.com/7L3f6n4I5e8AAAAC/anime-sleep.gif'
    ],
    wakeup: [
        'https://media.tenor.com/yFzN-d8C_jMAAAAC/anime-wakeup.gif'
    ],
    cry: [
        'https://purrbot.site/img/sfw/cry/gif/cry_001.gif', 'https://media.tenor.com/m40fH9PZ1JkAAAAC/anime-cry.gif'
    ],
    laugh: [
        'https://purrbot.site/img/sfw/laugh/gif/laugh_001.gif', 'https://media.tenor.com/8Q_a4Kqf8jAAAAAC/anime-laugh.gif'
    ],
    dance: [
        'https://purrbot.site/img/sfw/dance/gif/dance_001.gif', 'https://media.tenor.com/x8mR9xK6K8AAAAAC/anime-dance.gif'
    ],
    blush: [
        'https://purrbot.site/img/sfw/blush/gif/blush_001.gif', 'https://media.tenor.com/G3va39rn8E4AAAAC/anime-blush.gif'
    ],
    pout: [
        'https://purrbot.site/img/sfw/pout/gif/pout_001.gif', 'https://media.tenor.com/E74C3C/anime-pout.gif'
    ],
    smile: [
        'https://purrbot.site/img/sfw/smile/gif/smile_001.gif', 'https://media.tenor.com/2ECC71/anime-smile.gif'
    ],
    bored: [
        'https://media.tenor.com/6Uq4vA5C_mUAAAAC/anime-bored.gif'
    ]
};

// Safe Whitelisted Dynamic Fetcher
async function fetchSafeAnimeGif(actionKey) {
    const allowedReactions = [
        'kiss', 'pat', 'hug', 'slap', 'cuddle', 'bite', 'poke', 'punch', 
        'tickle', 'feed', 'lick', 'highfive', 'wave', 'sleep', 'wakeup', 
        'cry', 'laugh', 'dance', 'blush', 'pout', 'smile', 'bored'
    ];
    
    if (allowedReactions.includes(actionKey)) {
        try {
            const targetUrl = `https://api.otakugifs.xyz/gif?reaction=${encodeURIComponent(actionKey)}`;
            const response = await fetch(targetUrl);
            if (response.ok) {
                const data = await response.json();
                if (data && data.url && typeof data.url === 'string') return data.url;
            }
        } catch (err) {}
    }

    const fallbackList = GIF_DATABASE[actionKey] || GIF_DATABASE.hug;
    const idx = getRandomIndex(fallbackList.length);
    return fallbackList[idx];
}

// ACTION CONFIGURATION
const ACTION_CONFIG = {
    kiss: { verb: 'kisses', emoji: '💋', color: '#FFB6C1', group: 'action', dbField: 'kisses', requiresTarget: true },
    pat: { verb: 'pets', emoji: '⭐', color: '#A7C7E7', group: 'action', dbField: 'pats', requiresTarget: true },
    hug: { verb: 'hugs', emoji: '🤗', color: '#FF9494', group: 'action', dbField: 'hugs', requiresTarget: true },
    slap: { verb: 'slaps', emoji: '✋', color: '#E74C3C', group: 'action', dbField: 'slaps', requiresTarget: true },
    cuddle: { verb: 'cuddles with', emoji: '🥺', color: '#F39C12', group: 'action', dbField: 'cuddles', requiresTarget: true },
    bite: { verb: 'bites', emoji: '🦷', color: '#9B59B6', group: 'action', dbField: 'bites', requiresTarget: true },
    poke: { verb: 'pokes', emoji: '👉', color: '#3498DB', group: 'action', dbField: 'pokes', requiresTarget: true },
    punch: { verb: 'punches', emoji: '🥊', color: '#C0392B', group: 'action', dbField: 'punches', requiresTarget: true },
    tickle: { verb: 'tickles', emoji: '🤏', color: '#1ABC9C', group: 'action', dbField: 'tickles', requiresTarget: true },
    feed: { verb: 'feeds', emoji: '🍱', color: '#2ECC71', group: 'action', dbField: 'feeds', requiresTarget: true },
    lick: { verb: 'licks', emoji: '👅', color: '#E91E63', group: 'action', dbField: 'licks', requiresTarget: true },
    highfive: { verb: 'highfives', emoji: '🙌', color: '#F1C40F', group: 'action', dbField: 'highfives', requiresTarget: true },
    wave: { verb: 'waves at', emoji: '👋', color: '#34495E', group: 'action', dbField: 'waves', requiresTarget: true },
    
    sleep: { verb: 'is sleeping zzz...', emoji: '😴', color: '#2C3E50', group: 'express', requiresTarget: false },
    wakeup: { verb: 'just woke up!', emoji: '⏰', color: '#E67E22', group: 'express', requiresTarget: false },
    cry: { verb: 'is crying...', emoji: '😭', color: '#3498DB', group: 'express', requiresTarget: false },
    laugh: { verb: 'is laughing hysterically!', emoji: '😆', color: '#F1C40F', group: 'express', requiresTarget: false },
    dance: { verb: 'is dancing happily!', emoji: '💃', color: '#9B59B6', group: 'express', requiresTarget: false },
    blush: { verb: 'is blushing deeply...', emoji: '😳', color: '#FFB6C1', group: 'express', requiresTarget: false },
    pout: { verb: 'is pouting!', emoji: '😤', color: '#E74C3C', group: 'express', requiresTarget: false },
    smile: { verb: 'smiles warmly!', emoji: '😊', color: '#2ECC71', group: 'express', requiresTarget: false },
    bored: { verb: 'is feeling super bored...', emoji: '🥱', color: '#95A5A6', group: 'express', requiresTarget: false }
};

// SLASH COMMAND BUILDER
const socialCommandBuilder = new SlashCommandBuilder()
    .setName('social')
    .setDescription('🎭 Perform anime social actions or express emotions!')
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]);

socialCommandBuilder.addSubcommandGroup(group => {
    group.setName('action').setDescription('Targeted social actions with other members');
    Object.keys(ACTION_CONFIG).filter(k => ACTION_CONFIG[k].group === 'action').forEach(actionKey => {
        group.addSubcommand(sub => 
            sub.setName(actionKey)
               .setDescription(`${actionKey.charAt(0).toUpperCase() + actionKey.slice(1)} another user`)
               .addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(true))
        );
    });
    return group;
});

socialCommandBuilder.addSubcommandGroup(group => {
    group.setName('express').setDescription('Express individual feelings or emotions');
    Object.keys(ACTION_CONFIG).filter(k => ACTION_CONFIG[k].group === 'express').forEach(actionKey => {
        group.addSubcommand(sub => 
            sub.setName(actionKey)
               .setDescription(`Express ${actionKey}`)
        );
    });
    return group;
});

// SAFE DATABASE COUNTER HELPER
async function updateAndFetchUserPair(authorIdRaw, targetIdStrRaw, guildIdRaw, configField) {
    if (!User) return 1;

    const safeAuthorId = String(authorIdRaw || '').replace(/[^0-9]/g, '');
    const safeTargetId = String(targetIdStrRaw || '').replace(/[^0-9]/g, '');
    const safeGuildId = String(guildIdRaw || 'DM').replace(/[^a-zA-Z0-9_\-]/g, '');

    if (!safeAuthorId || !safeTargetId) return 1;

    const sortedPair = [safeAuthorId, safeTargetId].sort().join('_');
    const safePairKey = String(sortedPair);

    try {
        const authorFilter = { userId: safeAuthorId, guildId: safeGuildId };
        const targetFilter = { userId: safeTargetId, guildId: safeGuildId };
        const pairFilter = { userId: safePairKey, guildId: safeGuildId };

        const incAuthor = {};
        incAuthor[`${configField}Given`] = 1;

        const incTarget = {};
        incTarget[`${configField}Received`] = 1;

        const incPair = {};
        incPair[`${configField}Shared`] = 1;

        await User.updateOne(authorFilter, { $inc: incAuthor }, { upsert: true, strict: false });
        await User.updateOne(targetFilter, { $inc: incTarget }, { upsert: true, strict: false });
        await User.updateOne(pairFilter, { $inc: incPair }, { upsert: true, strict: false });

        const pairDoc = await User.findOne({ userId: safePairKey, guildId: safeGuildId }).lean();

        if (pairDoc && pairDoc[`${configField}Shared`]) {
            return Number(pairDoc[`${configField}Shared`]);
        }
    } catch (err) {
        console.error('Mongoose Social Update Error:', err.message);
    }

    return 1;
}

// MAIN EXECUTION ENGINE
async function executeSocialAction(actionKey, context, isSlash) {
    const config = ACTION_CONFIG[actionKey];
    if (!config) return;

    const guildIdStr = String(context.guildId || 'DM');
    const authorUser = isSlash ? context.user : context.author;
    const authorIdStr = String(authorUser.id);
    const authorName = authorUser.username;

    let target = null;

    if (config.requiresTarget) {
        if (isSlash) {
            target = context.options.getUser('target');
        } else {
            if (context.reference && context.reference.messageId) {
                try {
                    const refMsg = await context.channel.messages.fetch(context.reference.messageId);
                    target = refMsg.author;
                } catch (err) {}
            } else if (context.mentions && context.mentions.users.size > 0) {
                target = context.mentions.users.first();
            }
        }

        if (!target) {
            const reqMsg = `❌ Please mention a user or reply to a message to ${actionKey} them!`;
            return isSlash 
                ? context.reply({ content: reqMsg, flags: [EPHEMERAL_FLAG] }) 
                : context.reply(reqMsg);
        }

        if (String(target.id) === authorIdStr) {
            const errReply = `❌ You can't ${actionKey} yourself! Mention someone else.`;
            return isSlash 
                ? context.reply({ content: errReply, flags: [EPHEMERAL_FLAG] }) 
                : context.reply(errReply);
        }
    }

    if (isSlash && !context.deferred && !context.replied) {
        await context.deferReply().catch(() => {});
    }

    let mutualCount = 1;
    if (target && config.dbField) {
        mutualCount = await updateAndFetchUserPair(authorIdStr, target.id, guildIdStr, config.dbField);
    }

    const randomGif = await fetchSafeAnimeGif(actionKey);

    let descriptionText = `**${authorName}** ${config.verb}`;
    if (target) {
        descriptionText += ` **${target.username}**!\n*You two have shared ${mutualCount} ${actionKey}s.*`;
    }

    const embed = new EmbedBuilder()
        .setColor(config.color)
        .setDescription(descriptionText)
        .setImage(randomGif);

    const components = [];
    if (target && !target.bot) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`social_${actionKey}_back_${target.id}_${authorIdStr}`)
                .setLabel(`${actionKey.charAt(0).toUpperCase() + actionKey.slice(1)} back`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(config.emoji)
        );
        components.push(row);
    }

    if (isSlash) {
        await context.editReply({ embeds: [embed], components }).catch(() => {});
    } else {
        await context.reply({ embeds: [embed], components }).catch(() => {});
    }
}

// HELP MENU
async function sendSocialHelpMenu(context) {
    const embed = new EmbedBuilder()
        .setColor('#FF79C6')
        .setTitle('🎭 Starry Social & Anime Actions Menu')
        .setDescription('Express feelings or interact with friends using high-quality animated anime GIFs!\n\n*Works via prefix commands (`.hug @user`) OR slash commands (`/social action hug`).*')
        .addFields(
            { 
                name: '🫂 Targeted Member Actions (Requires Mention/Reply)', 
                value: '`kiss`, `pat`, `hug`, `slap`, `cuddle`, `bite`, `poke`, `punch`, `tickle`, `feed`, `lick`, `highfive`, `wave`', 
                inline: false 
            },
            { 
                name: '🎭 Solo Expressions & Feelings', 
                value: '`sleep`, `wakeup`, `cry`, `laugh`, `dance`, `blush`, `pout`, `smile`, `bored`', 
                inline: false 
            },
            { 
                name: '💡 Usage Examples', 
                value: '• `.hug @user` — Hug a friend\n• Reply to a message with `.kiss` — Kiss sender\n• `.sleep` — Express sleeping\n• `/social action highfive target:@user`', 
                inline: false 
            }
        )
        .setFooter({ text: 'Starry Interactive Engine • Works in DMs too!' })
        .setTimestamp();

    return context.reply({ embeds: [embed] });
}

// MODULE EXPORTS & EVENT INITIALIZERS
module.exports = (client) => {
    // 1. Slash Command /social Handler
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isChatInputCommand() && interaction.commandName === 'social') {
            const group = interaction.options.getSubcommandGroup(false);
            const subCommand = interaction.options.getSubcommand(false);
            const targetAction = subCommand || group;

            if (targetAction) {
                await executeSocialAction(targetAction, interaction, true);
            }
            return;
        }

        // 2. Button "Action Back" Handler
        if (interaction.isButton() && interaction.customId.startsWith('social_')) {
            const parts = interaction.customId.split('_');
            const actionKey = parts[1];
            const allowedUserId = parts[3];
            const originalAuthorId = parts[4];

            if (interaction.user.id !== allowedUserId) {
                return interaction.reply({ 
                    content: `❌ Only <@${allowedUserId}> can use this button to action back!`, 
                    flags: [EPHEMERAL_FLAG] 
                }).catch(() => {});
            }

            const config = ACTION_CONFIG[actionKey];
            if (!config) return;

            await interaction.deferReply().catch(() => {});

            const guildIdStr = String(interaction.guildId || 'DM');
            const userIdStr = String(interaction.user.id);
            let backMutualCount = 1;

            if (originalAuthorId && config.dbField) {
                backMutualCount = await updateAndFetchUserPair(userIdStr, originalAuthorId, guildIdStr, config.dbField);
            }

            const returnGif = await fetchSafeAnimeGif(actionKey);

            const returnEmbed = new EmbedBuilder()
                .setColor(config.color)
                .setDescription(`**${interaction.user.username}** ${config.verb} back!\n*Shared count: ${backMutualCount} ${actionKey}s.*`)
                .setImage(returnGif);

            await interaction.editReply({ embeds: [returnEmbed] }).catch(() => {});
        }
    });

    // 3. Prefix Commands (.hug, .kiss, .slap, etc.)
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.content || !message.guild) return;

        const content = message.content.toLowerCase().trim();
        const firstWord = content.split(' ')[0];

        if (firstWord === '.social' || firstWord === 'social') {
            return sendSocialHelpMenu(message);
        }

        for (const actionKey of Object.keys(ACTION_CONFIG)) {
            if (firstWord === `.${actionKey}` || firstWord === actionKey) {
                await executeSocialAction(actionKey, message, false);
                break;
            }
        }
    });
};

// DIRECT SLASH COMMAND OBJECT EXPORT
module.exports.data = socialCommandBuilder;
module.exports.execute = async function(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subCommand = interaction.options.getSubcommand(false);
    const targetAction = subCommand || group;
    if (targetAction) {
        await executeSocialAction(targetAction, interaction, true);
    }
};

// PAYLOAD EXPORT FOR deploy-commands.js
module.exports.socialCommandPayload = socialCommandBuilder.toJSON();
