// ==========================================
// 📦 STARRY NEAT-JSON BACKUP & RESTORE ENGINE
// ==========================================
const { 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    AttachmentBuilder 
} = require('discord.js');

let ServerBackup;
try { 
    ServerBackup = require('../models/ServerBackup'); 
} catch(e) {
    console.error('⚠️ [BackupEngine] Could not load ServerBackup model:', e.message);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Safely fetch recent channel message history
async function fetchChannelMessageArchive(channel, limit = 50) {
    if (!channel.isTextBased() || channel.isVoiceBased()) return [];
    const botPerms = channel.permissionsFor(channel.guild.members.me);
    if (!botPerms || !botPerms.has(PermissionFlagsBits.ReadMessageHistory) || !botPerms.has(PermissionFlagsBits.ViewChannel)) return [];

    try {
        const fetched = await channel.messages.fetch({ limit }).catch(() => null);
        if (!fetched || fetched.size === 0) return [];

        return fetched.map(m => ({
            time: new Date(m.createdTimestamp).toLocaleString(),
            author: m.author ? m.author.tag : 'Unknown User',
            isBot: m.author ? m.author.bot : false,
            content: m.content || '',
            attachments: m.attachments.map(a => a.url),
            id: m.id
        })).reverse(); // Chronological order
    } catch (err) {
        return [];
    }
}

// Core Backup Execution Routine
async function executeServerFullBackup(guild) {
    const fetchedRoles = await guild.roles.fetch();
    const fetchedChannels = await guild.channels.fetch();

    // 1. Roles sorted by position (Highest to Lowest)
    const rolesData = fetchedRoles
        .filter(r => !r.managed && r.name !== '@everyone' && r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => ({
            position: r.position,
            name: r.name,
            color: r.hexColor,
            hoist: r.hoist,
            permissions: r.permissions ? r.permissions.bitfield.toString() : '0',
            id: r.id
        }));

    const getOverwrites = (channel) => channel.permissionOverwrites.cache.map(ow => ({
        id: ow.id,
        type: ow.type,
        allow: ow.allow ? ow.allow.bitfield.toString() : '0',
        deny: ow.deny ? ow.deny.bitfield.toString() : '0'
    }));

    // 2. Categories Map
    const categoriesMap = new Map();
    const categoriesData = [];

    fetchedChannels
        .filter(c => c && c.type === ChannelType.GuildCategory)
        .forEach(c => {
            categoriesMap.set(c.id, c.name);
            categoriesData.push({
                name: c.name,
                id: c.id,
                overwrites: getOverwrites(c)
            });
        });

    // 3. Channels Organized Category-Wise
    const channelsData = [];
    let totalMessagesArchived = 0;

    const sortedChannels = Array.from(fetchedChannels.values())
        .filter(c => c && c.type !== ChannelType.GuildCategory)
        .sort((a, b) => {
            const catA = a.parentId ? (categoriesMap.get(a.parentId) || 'Uncategorized') : 'Uncategorized';
            const catB = b.parentId ? (categoriesMap.get(b.parentId) || 'Uncategorized') : 'Uncategorized';
            return catA.localeCompare(catB);
        });

    for (const c of sortedChannels) {
        const categoryName = c.parentId ? (categoriesMap.get(c.parentId) || 'Uncategorized') : 'No Category';

        let messageHistory = [];
        if (c.isTextBased()) {
            messageHistory = await fetchChannelMessageArchive(c, 50);
            totalMessagesArchived += messageHistory.length;
            await delay(150); // Throttling for Discord API safety
        }

        channelsData.push({
            category: categoryName,
            name: `#${c.name}`,
            topic: c.topic || 'None',
            type: c.type === 0 ? 'Text Channel' : (c.type === 2 ? 'Voice Channel' : `Type ${c.type}`),
            archivedMessagesCount: messageHistory.length,
            messages: messageHistory,
            // Programmatic keys for .restore
            id: c.id,
            parentId: c.parentId,
            rawType: c.type,
            nsfw: c.nsfw || false,
            rateLimitPerUser: c.rateLimitPerUser || 0,
            userLimit: c.userLimit || 0,
            overwrites: getOverwrites(c)
        });
    }

    const backupPayload = {
        _info: "================ STARRY FULL SERVER ARCHIVE ================",
        serverName: guild.name,
        serverId: guild.id,
        createdAt: new Date().toLocaleString(),
        timestamp: Date.now(),
        summary: {
            totalRoles: rolesData.length,
            totalCategories: categoriesData.length,
            totalChannels: channelsData.length,
            totalArchivedMessages: totalMessagesArchived
        },
        roles: rolesData,
        categories: categoriesData,
        channels: channelsData
    };

    // Save to MongoDB
    if (ServerBackup) {
        await ServerBackup.findOneAndUpdate(
            { guildId: guild.id },
            { 
                guildId: guild.id, 
                timestamp: backupPayload.timestamp, 
                roles: rolesData, 
                categories: categoriesData, 
                channels: channelsData 
            },
            { upsert: true }
        ).catch(e => console.error('MongoDB Backup Error:', e));
    }

    return backupPayload;
}

// Locate Admin Channel for Dispatch
function findAdminChannel(guild) {
    return guild.channels.cache.find(c => 
        c.isTextBased() && 
        c.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages) &&
        (
            c.name.includes('admin') || 
            c.name.includes('log') || 
            c.name.includes('staff') || 
            c.name.includes('backup') ||
            c.name === 'admin-action-requests' ||
            c.name === 'logs-moderate'
        )
    ) || guild.systemChannel;
}

module.exports = (client) => {

    // ==========================================
    // 🕒 AUTOMATED DAILY BACKUP SCHEDULER (24 HOURS)
    // ==========================================
    client.once('ready', () => {
        console.log('⏰ Autonomous Daily Backup Engine Armed.');

        setInterval(async () => {
            console.log('🔄 Executing Scheduled Daily Server Backups...');

            for (const [, guild] of client.guilds.cache) {
                try {
                    const backupData = await executeServerFullBackup(guild);
                    const adminCh = findAdminChannel(guild);

                    if (adminCh) {
                        const jsonBuffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8');
                        const fileAttachment = new AttachmentBuilder(jsonBuffer, { name: `Server_Backup_${guild.id}.json` });

                        const embed = new EmbedBuilder()
                            .setColor('#2ecc71')
                            .setTitle('🤖 Scheduled Daily Backup Complete')
                            .setDescription(
                                `The daily automated server & message history snapshot has been generated!\n\n` +
                                `• **Roles Saved:** \`${backupData.summary.totalRoles}\`\n` +
                                `• **Categories Saved:** \`${backupData.summary.totalCategories}\`\n` +
                                `• **Channels Saved:** \`${backupData.summary.totalChannels}\`\n` +
                                `• **Messages Archived:** \`${backupData.summary.totalArchivedMessages}\` msgs\n\n` +
                                `*A clean JSON archive file is attached below.*`
                            )
                            .setFooter({ text: 'Starry Autonomous Backup Core' })
                            .setTimestamp();

                        await adminCh.send({ embeds: [embed], files: [fileAttachment] }).catch(() => {});
                    }
                } catch (err) {
                    console.error(`Daily Backup error for guild ${guild.id}:`, err);
                }
            }
        }, 24 * 60 * 60 * 1000);
    });

    // ==========================================
    // 💬 MESSAGE LISTENERS (.backup & .restore)
    // ==========================================
    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;

        const cleanContent = message.content.trim().toLowerCase();
        const isOwner = message.author.id === message.guild.ownerId;
        const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);

        // --- MANUAL COMMAND: .backup ---
        if (cleanContent === '.backup' || cleanContent.startsWith('.backup')) {
            if (!isAdmin && !isOwner) return message.reply('❌ Admins or Server Owner only.');

            const msg = await message.reply('💾 **Scanning server architecture and archiving message histories...**');
            const guild = message.guild;

            try {
                const backupData = await executeServerFullBackup(guild);

                // Pretty-print JSON with 2-space indentation
                const jsonBuffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8');
                const fileAttachment = new AttachmentBuilder(jsonBuffer, { name: `Server_Backup_${guild.id}.json` });

                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('✅ Server & Message History Backup Complete')
                    .setDescription(
                        `Successfully saved full architecture and text archives to database!\n\n` +
                        `• **Roles Saved:** \`${backupData.summary.totalRoles}\`\n` +
                        `• **Categories Saved:** \`${backupData.summary.totalCategories}\`\n` +
                        `• **Channels Saved:** \`${backupData.summary.totalChannels}\`\n` +
                        `• **Messages Archived:** \`${backupData.summary.totalArchivedMessages}\` msgs\n\n` +
                        `*Run \`.restore\` if the server is ever nuked.*`
                    )
                    .setTimestamp();

                return msg.edit({ content: '', embeds: [embed], files: [fileAttachment] });

            } catch (err) {
                console.error('❌ Backup Error:', err);
                return msg.edit(`❌ Failed to create backup: \`${err.message}\``);
            }
        }

        // --- MANUAL COMMAND: .restore ---
        if (cleanContent === '.restore' || cleanContent.startsWith('.restore')) {
            if (!isAdmin && !isOwner) return message.reply('❌ Admins or Server Owner only.');
            if (!ServerBackup) return message.reply('❌ Backup database model not found.');

            const backup = await ServerBackup.findOne({ guildId: message.guild.id });
            if (!backup) return message.reply('❌ No backup found for this server! Run `.backup` first.');

            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('⚠️ SYSTEM RESTORE INITIATED')
                .setDescription(
                    `**WARNING:** This will reconstruct missing channels/roles, restore permissions, and re-post archived message histories.\n\n` +
                    `Are you sure you want to proceed?`
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('restore_confirm').setLabel('RESTORE SERVER').setStyle(ButtonStyle.Danger).setEmoji('🔄'),
                new ButtonBuilder().setCustomId('restore_cancel').setLabel('CANCEL').setStyle(ButtonStyle.Secondary)
            );

            const response = await message.reply({ embeds: [embed], components: [row] });
            const filter = i => i.user.id === message.author.id;

            let confirmation;
            try {
                confirmation = await response.awaitMessageComponent({ filter, time: 30000 });
            } catch (e) {
                return response.edit({ content: '⏱️ Restore request timed out.', embeds: [], components: [] });
            }

            if (confirmation.customId === 'restore_cancel') {
                return confirmation.update({ content: '🚫 Restore aborted.', embeds: [], components: [] });
            }

            await confirmation.update({ content: '🔄 **REBUILDING SERVER...** Reconstructing roles, channels, and text archives.', embeds: [], components: [] });

            try {
                const guild = message.guild;
                let roleMap = new Map();
                let categoryMap = new Map(); 

                await guild.roles.fetch();
                await guild.channels.fetch();

                // 1. Restore Roles
                for (const bRole of (backup.roles || [])) {
                    let existing = guild.roles.cache.find(r => r.name === bRole.name);
                    const safePerms = BigInt(bRole.permissions || '0');

                    if (!existing) {
                        try { 
                            existing = await guild.roles.create({ 
                                name: bRole.name, 
                                color: bRole.color, 
                                hoist: bRole.hoist, 
                                permissions: safePerms 
                            }); 
                            await delay(300); 
                        } catch (e) { continue; }
                    } else { 
                        await existing.setPermissions(safePerms).catch(() => {}); 
                    }
                    if (existing) roleMap.set(bRole.id, existing.id);
                }

                const parseOverwrites = (savedOverwrites = []) => {
                    return savedOverwrites.map(ow => {
                        let targetId = ow.id;
                        if (ow.type === 0) {
                            targetId = roleMap.get(ow.id) || guild.roles.everyone.id;
                        }
                        return { 
                            id: targetId, 
                            allow: BigInt(ow.allow || '0'), 
                            deny: BigInt(ow.deny || '0') 
                        };
                    });
                };

                // 2. Restore Categories
                for (const bCat of (backup.categories || [])) {
                    let existing = guild.channels.cache.find(c => c && c.type === ChannelType.GuildCategory && c.name === bCat.name);
                    const mappedOverwrites = parseOverwrites(bCat.overwrites);

                    if (!existing) {
                        try { 
                            existing = await guild.channels.create({ 
                                name: bCat.name, 
                                type: ChannelType.GuildCategory, 
                                permissionOverwrites: mappedOverwrites 
                            }); 
                            await delay(400); 
                        } catch (e) { continue; }
                    } else { 
                        await existing.permissionOverwrites.set(mappedOverwrites).catch(() => {}); 
                    }
                    if (existing) categoryMap.set(bCat.id, existing.id);
                }

                // 3. Restore Channels & Messages
                for (const bChan of (backup.channels || [])) {
                    const cleanChannelName = bChan.name.startsWith('#') ? bChan.name.substring(1) : bChan.name;
                    const channelType = bChan.rawType !== undefined ? bChan.rawType : bChan.type;

                    let existing = guild.channels.cache.find(c => c && c.type === channelType && c.name === cleanChannelName);
                    const mappedOverwrites = parseOverwrites(bChan.overwrites);
                    const newParentId = bChan.parentId ? categoryMap.get(bChan.parentId) : null;

                    if (!existing) {
                        try { 
                            existing = await guild.channels.create({ 
                                name: cleanChannelName, 
                                type: channelType, 
                                parent: newParentId, 
                                topic: bChan.topic === 'None' ? '' : bChan.topic, 
                                nsfw: bChan.nsfw, 
                                rateLimitPerUser: bChan.rateLimitPerUser, 
                                userLimit: bChan.userLimit, 
                                permissionOverwrites: mappedOverwrites 
                            }); 
                            await delay(400); 
                        } catch (e) {}
                    } else {
                        await existing.permissionOverwrites.set(mappedOverwrites).catch(() => {});
                        if (newParentId && existing.parentId !== newParentId) {
                            await existing.setParent(newParentId).catch(() => {});
                        }
                    }

                    // Re-post archived messages back into recreated channel
                    if (existing && existing.isTextBased() && bChan.messages && bChan.messages.length > 0) {
                        for (const msgData of bChan.messages) {
                            const authorName = msgData.author || msgData.authorTag || 'User';
                            if (!msgData.content && (!msgData.attachments || msgData.attachments.length === 0)) continue;

                            const contentStr = `**[ARCHIVE - ${authorName}]:** ${msgData.content}` +
                                (msgData.attachments && msgData.attachments.length > 0 ? `\n📎 ${msgData.attachments.join('\n📎 ')}` : '');

                            await existing.send({ content: contentStr }).catch(() => {});
                            await delay(300);
                        }
                    }
                }

                await message.channel.send('✅ **RESTORE COMPLETE!**\nAll missing channels, roles, and message history logs have been restored!');
            } catch (err) {
                console.error('❌ Restore Error:', err);
                await message.channel.send(`❌ **Restore Failed:** \`${err.message}\``);
            }
        }
    });
};
