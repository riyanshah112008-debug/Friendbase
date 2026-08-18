// ==========================================
// 1. IMPORTS, SCHEMAS & CONFIG
// ==========================================
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const mongoose = require('mongoose');

let User;
try {
    User = require('../models/User');
} catch (e) {
    User = mongoose.models.User;
}

// 🛡️ PERMANENT HIGH-SPEED FALLBACK GIF POOLS (VERIFIED DIRECT URLS)
const FALLBACK_GIFS = {
    kiss: ['https://media.tenor.com/dn_m_R3A7pAAAAAC/anime-kiss.gif', 'https://media.tenor.com/gU212bx3424AAAAC/kiss-anime.gif'],
    pat: ['https://media.tenor.com/E6f12CmgB_QAAAAC/head-pat-anime.gif', 'https://media.tenor.com/Y7233_L2-EAAAAAC/anime-pat.gif'],
    hug: ['https://media.tenor.com/0PIf-R3635AAAAAC/hug-anime.gif', 'https://media.tenor.com/kCZ9T_hn2M0AAAAC/hug-anime.gif'],
    slap: ['https://media.tenor.com/Ws6dm1ZW2z8AAAAC/anime-slap.gif', 'https://media.tenor.com/E3B1E2se2RMAAAAC/slap-anime.gif'],
    cuddle: ['https://media.tenor.com/P5e5d36eR3MAAAAC/anime-cuddle.gif'],
    bite: ['https://media.tenor.com/O613x3z-s7IAAAAC/anime-bite.gif'],
    poke: ['https://media.tenor.com/39D7Mh9Q0e0AAAAC/anime-poke.gif'],
    punch: ['https://media.tenor.com/p_A3m8_0m4AAAAAC/anime-punch.gif'],
    tickle: ['https://media.tenor.com/8499n8a2G4IAAAAC/anime-tickle.gif'],
    feed: ['https://media.tenor.com/EF29x13G8LIAAAAC/anime-feed.gif'],
    lick: ['https://media.tenor.com/4kC5S9lD2pUAAAAC/anime-lick.gif'],
    highfive: ['https://media.tenor.com/M5b-e4wD41gAAAAC/anime-high-five.gif', 'https://media.tenor.com/y1v2lI7ZfUAAAAAC/high-five-anime.gif'],
    wave: ['https://media.tenor.com/m2K-I_eX7JMAAAAC/anime-wave.gif'],
    sleep: ['https://media.tenor.com/7L3f6n4I5e8AAAAC/anime-sleep.gif'],
    wakeup: ['https://media.tenor.com/yFzN-d8C_jMAAAAC/anime-wakeup.gif'],
    cry: ['https://media.tenor.com/m40fH9PZ1JkAAAAC/anime-cry.gif'],
    laugh: ['https://media.tenor.com/8Q_a4Kqf8jAAAAAC/anime-laugh.gif'],
    dance: ['https://media.tenor.com/x8mR9xK6K8AAAAAC/anime-dance.gif'],
    blush: ['https://media.tenor.com/82N7l4aL1w0AAAAC/anime-blush.gif'],
    pout: ['https://media.tenor.com/C5uB0v452WIAAAAC/anime-pout.gif'],
    smile: ['https://media.tenor.com/3P6I362mP2AAAAAC/anime-smile.gif'],
    bored: ['https://media.tenor.com/6Uq4vA5C_mUAAAAC/anime-bored.gif']
};

const ACTION_CONFIG = {
    // Targeted Interactions (Requires User Mention / Reply)
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
    
    // Solo Expressions
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

// Fast GIF Fetcher with Global API Fallback
async function fetchActionGif(actionKey) {
    try {
        const response = await fetch(`https://api.otakugifs.xyz/gif?reaction=${actionKey}`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.url) return data.url;
        }
    } catch (e) {}

    const pool = FALLBACK_GIFS[actionKey] || FALLBACK_GIFS.hug;
    return pool[Math.floor(Math.random() * pool.length)];
}
// ==========================================
// 2. MASTER SLASH COMMAND & HELP EMBED
// ==========================================
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

// Helper: Generate .social Master Help Embed
function generateSocialHelpEmbed() {
    const targetedActions = Object.keys(ACTION_CONFIG)
        .filter(k => ACTION_CONFIG[k].group === 'action')
        .map(k => `\`${k}\``).join(', ');

    const soloExpressions = Object.keys(ACTION_CONFIG)
        .filter(k => ACTION_CONFIG[k].group === 'express')
        .map(k => `\`${k}\``).join(', ');

    return new EmbedBuilder()
        .setColor('#FF9494')
        .setTitle('🎭 Starry Social & Anime Actions Menu')
        .setDescription('Express feelings or interact with friends using high-quality animated anime GIFs!\n\n*Works via prefix commands (`.hug @user`) OR slash commands (`/social action hug`).*')
        .addFields(
            { name: '👥 Targeted Member Actions (Requires Mention/Reply)', value: targetedActions || 'None', inline: false },
            { name: '🎭 Solo Expressions & Feelings', value: soloExpressions || 'None', inline: false },
            { name: '💡 Usage Examples', value: '• `.hug @user` — Hug a friend\n• Reply to a message with `.kiss` — Kiss sender\n• `.sleep` — Express sleeping\n• `/social action highfive target:@user`', inline: false }
        )
        .setFooter({ text: 'Starry Interactive Engine • Works in DMs too!' })
        .setTimestamp();
}

// ==========================================
// 3. ACTION EXECUTOR ENGINE
// ==========================================
async function executeSocialAction(actionKey, context, isSlash) {
    const config = ACTION_CONFIG[actionKey];
    if (!config) return;

    const guildId = context.guildId || 'DM';
    const authorId = isSlash ? context.user.id : context.author.id;
    const authorName = isSlash ? context.user.username : context.author.username;

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
            const reqMsg = `❌ Please reply to a message or mention a user to ${actionKey} them!`;
            return isSlash ? context.reply({ content: reqMsg, ephemeral: true }) : context.reply(reqMsg);
        }

        if (target.id === authorId) {
            const errReply = `❌ You can't ${actionKey} yourself!`;
            return isSlash ? context.reply({ content: errReply, ephemeral: true }) : context.reply(errReply);
        }
    }

    if (isSlash && !context.deferred && !context.replied) await context.deferReply();

    let mutualCount = 1;
    const pairKey = target ? [authorId, target.id].sort().join('_') : null;

    if (target && config.dbField && User) {
        try {
            await User.updateOne({ userId: authorId, guildId }, { $inc: { [`${config.dbField}Given`]: 1 } }, { upsert: true, strict: false });
            await User.updateOne({ userId: target.id, guildId }, { $inc: { [`${config.dbField}Received`]: 1 } }, { upsert: true, strict: false });
            await User.updateOne({ userId: pairKey, guildId }, { $inc: { [`${config.dbField}Shared`]: 1 } }, { upsert: true, strict: false });
            const pairDoc = await User.findOne({ userId: pairKey, guildId }).lean();
            if (pairDoc && pairDoc[`${config.dbField}Shared`]) mutualCount = pairDoc[`${config.dbField}Shared`];
        } catch (err) {}
    }

    const fetchedGif = await fetchActionGif(actionKey);

    let descriptionText = `**${authorName}** ${config.verb}`;
    if (target) descriptionText += ` **${target.username}**!\n*You two have shared ${mutualCount} ${actionKey}s.*`;

    const embed = new EmbedBuilder()
        .setColor(config.color)
        .setDescription(descriptionText)
        .setImage(fetchedGif);

    const components = [];
    if (target && !target.bot) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`social_${actionKey}_back`)
                .setLabel(`${actionKey.charAt(0).toUpperCase() + actionKey.slice(1)} back`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(config.emoji)
        );
        components.push(row);
    }

    let response = isSlash ? await context.editReply({ embeds: [embed], components }) : await context.reply({ embeds: [embed], components });

    if (components.length === 0) return;

    const collector = response.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async (i) => {
        if (i.user.id === authorId) return i.reply({ content: `You can't ${actionKey} yourself back!`, ephemeral: true });

        await i.deferReply();
        let backMutualCount = 1;

        if (config.dbField && User) {
            try {
                await User.updateOne({ userId: i.user.id, guildId }, { $inc: { [`${config.dbField}Given`]: 1 } }, { upsert: true, strict: false });
                await User.updateOne({ userId: authorId, guildId }, { $inc: { [`${config.dbField}Received`]: 1 } }, { upsert: true, strict: false });
                await User.updateOne({ userId: pairKey, guildId }, { $inc: { [`${config.dbField}Shared`]: 1 } }, { upsert: true, strict: false });
                const backPairDoc = await User.findOne({ userId: pairKey, guildId }).lean();
                if (backPairDoc && backPairDoc[`${config.dbField}Shared`]) backMutualCount = backPairDoc[`${config.dbField}Shared`];
            } catch (err) {}
        }

        const returnGif = await fetchActionGif(actionKey);
        const returnEmbed = new EmbedBuilder()
            .setColor(config.color)
            .setDescription(`**${i.user.username}** ${config.verb} **${authorName}** back!\n*You two have shared ${backMutualCount} ${actionKey}s.*`)
            .setImage(returnGif);

        components[0].components[0].setDisabled(true);
        if (isSlash) await context.editReply({ components: [components[0]] }).catch(() => {});
        else await response.edit({ components: [components[0]] }).catch(() => {});

        await i.editReply({ embeds: [returnEmbed] });
    });
}
// ==========================================
// 4. MODULE INITIALIZER & EXPORTS
// ==========================================
module.exports = (client) => {
    // Handle Slash Command /social
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'social') return;
        
        try {
            const subCommand = interaction.options.getSubcommand();
            if (subCommand) await executeSocialAction(subCommand, interaction, true);
        } catch (e) {
            return interaction.reply({ embeds: [generateSocialHelpEmbed()], ephemeral: true }).catch(() => {});
        }
    });

    // Handle Prefix Text Commands (.social, .hug, .kiss, .slap, .sleep, etc.)
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.content) return;

        const firstWord = message.content.toLowerCase().trim().split(' ')[0];

        // Trigger Master Help Card via .social or .socials
        if (firstWord === '.social' || firstWord === '.socials' || firstWord === 'social') {
            return message.reply({ embeds: [generateSocialHelpEmbed()] }).catch(() => {});
        }

        Object.keys(ACTION_CONFIG).forEach(async (actionKey) => {
            if (firstWord === `.${actionKey}` || firstWord === actionKey) {
                await executeSocialAction(actionKey, message, false);
            }
        });
    });
};

module.exports.socialCommandPayload = socialCommandBuilder.toJSON();
