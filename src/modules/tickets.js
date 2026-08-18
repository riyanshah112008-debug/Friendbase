const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField, 
    AttachmentBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    MessageFlags
} = require('discord.js');

const EPHEMERAL_FLAG = MessageFlags ? MessageFlags.Ephemeral : 6;

module.exports = (client) => {
    // Helper: Strict Staff Check (Admin, Manage Channels, or Staff roles)
    const isStaff = (member) => {
        if (!member) return false;
        return member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
               member.permissions.has(PermissionsBitField.Flags.Administrator) ||
               member.roles.cache.some(r => ['staff', 'moderator', 'admin', 'support'].includes(r.name.toLowerCase()));
    };

    // Helper: Ensures categories exist with proper Mobile visibility
    async function getOrCreateTicketCategory(guild, name) {
        try {
            const channels = await guild.channels.fetch().catch(() => guild.channels.cache);
            let cat = channels.find(c => c && c.type === ChannelType.GuildCategory && c.name.toUpperCase() === name.toUpperCase());
            let staffRole = guild.roles.cache.find(r => ['staff', 'moderator', 'admin'].includes(r.name.toLowerCase()));

            const categoryPermissions = [
                { 
                    id: guild.roles.everyone.id, 
                    allow: [PermissionsBitField.Flags.ViewChannel], 
                    deny: [PermissionsBitField.Flags.SendMessages] 
                },
                { 
                    id: client.user.id, 
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.SendMessages] 
                },
                ...(staffRole ? [{ id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }] : [])
            ];

            if (!cat) {
                cat = await guild.channels.create({
                    name: name.toUpperCase(),
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: categoryPermissions
                });
            } else {
                await cat.permissionOverwrites.edit(guild.roles.everyone.id, {
                    ViewChannel: true,
                    SendMessages: false
                }).catch(() => {});
            }
            return cat;
        } catch (err) {
            console.error(`❌ Category Creation Error (${name}):`, err);
            return null;
        }
    }

    client.on('interactionCreate', async (interaction) => {
        // ==========================================
        // 1. SLASH COMMANDS (/ticketsetup & /applysetup)
        // ==========================================
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'ticketsetup') {
                if (!isStaff(interaction.member)) {
                    return interaction.reply({ content: '❌ You lack permissions to set up the ticket panel.', flags: [EPHEMERAL_FLAG] });
                }

                const embed = new EmbedBuilder()
                    .setColor('#00F2FE')
                    .setTitle('🎫 Support & Application Portal')
                    .setDescription('• **Open Support Ticket:** Opens a private communication channel with staff.\n• **Apply for Staff:** Opens an interactive form to apply for moderator positions.')
                    .setFooter({ text: 'Starry Support Engine' });

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('sys_create_ticket').setLabel('Open Support Ticket').setStyle(ButtonStyle.Primary).setEmoji('📩'),
                    new ButtonBuilder().setCustomId('sys_apply_staff').setLabel('Apply for Staff').setStyle(ButtonStyle.Success).setEmoji('📝')
                );

                await interaction.reply({ content: '✅ Ticket system panel created!', flags: [EPHEMERAL_FLAG] });
                return interaction.channel.send({ embeds: [embed], components: [buttons] });
            }

            if (interaction.commandName === 'applysetup') {
                if (!isStaff(interaction.member)) {
                    return interaction.reply({ content: '❌ You lack permissions to set up the application panel.', flags: [EPHEMERAL_FLAG] });
                }

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('📋 Server Applications')
                    .setDescription('We are looking for new staff and partners!\n\nChoose an option below to apply.')
                    .setFooter({ text: 'Starry Application Engine' });

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('sys_apply_staff').setLabel('🛡️ Apply for Staff').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('sys_apply_partner').setLabel('🤝 Request Partnership').setStyle(ButtonStyle.Success)
                );

                await interaction.reply({ content: '✅ Application Dashboard created!', flags: [EPHEMERAL_FLAG] });
                return interaction.channel.send({ embeds: [embed], components: [buttons] });
            }
        }
        // ==========================================
        // 2. BUTTON INTERACTIONS
        // ==========================================
        if (interaction.isButton()) {
            const customId = interaction.customId;

            // 📩 CREATE TICKET
            if (['sys_create_ticket', 'create_ticket'].includes(customId)) {
                try {
                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.deferReply({ flags: [EPHEMERAL_FLAG] });
                    }

                    const guild = interaction.guild;
                    const user = interaction.user;

                    const openedCategory = await getOrCreateTicketCategory(guild, 'OPENED TICKETS');
                    let staffRole = guild.roles.cache.find(r => ['staff', 'moderator', 'admin'].includes(r.name.toLowerCase()));

                    const ticketNum = Math.floor(1000 + Math.random() * 9000);
                    const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');

                    const ticketChannel = await guild.channels.create({
                        name: `ticket-${cleanUsername}-${ticketNum}`,
                        type: ChannelType.GuildText,
                        topic: user.id,
                        parent: openedCategory ? openedCategory.id : undefined,
                        permissionOverwrites: [
                            { 
                                id: guild.roles.everyone.id, 
                                deny: [PermissionsBitField.Flags.ViewChannel] 
                            },
                            { 
                                id: user.id, 
                                allow: [
                                    PermissionsBitField.Flags.ViewChannel, 
                                    PermissionsBitField.Flags.SendMessages, 
                                    PermissionsBitField.Flags.ReadMessageHistory,
                                    PermissionsBitField.Flags.AttachFiles,
                                    PermissionsBitField.Flags.EmbedLinks
                                ] 
                            },
                            { 
                                id: client.user.id, 
                                allow: [
                                    PermissionsBitField.Flags.ViewChannel, 
                                    PermissionsBitField.Flags.SendMessages, 
                                    PermissionsBitField.Flags.ManageChannels,
                                    PermissionsBitField.Flags.ReadMessageHistory
                                ] 
                            },
                            ...(staffRole ? [{ 
                                id: staffRole.id, 
                                allow: [
                                    PermissionsBitField.Flags.ViewChannel, 
                                    PermissionsBitField.Flags.SendMessages,
                                    PermissionsBitField.Flags.ReadMessageHistory
                                ] 
                            }] : [])
                        ]
                    });

                    if (openedCategory) {
                        await ticketChannel.setParent(openedCategory.id, { lockPermissions: false }).catch(() => {});
                    }

                    const ticketEmbed = new EmbedBuilder()
                        .setColor('#00F2FE')
                        .setTitle(`🎫 Support Ticket #${ticketNum} | ${user.username}`)
                        .setDescription(`Hello <@${user.id}>! Staff has been notified and will assist you shortly.\n\nPlease describe your issue or inquiry in detail below.`)
                        .addFields({ name: '📌 Status', value: '`UNCLAIMED 🟡`', inline: true })
                        .setTimestamp();

                    const actionRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('sys_claim_ticket').setLabel('Claim Ticket').setStyle(ButtonStyle.Success).setEmoji('✋'),
                        new ButtonBuilder().setCustomId('sys_close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                    );

                    await ticketChannel.send({ content: `<@${user.id}> ${staffRole ? `<@&${staffRole.id}>` : ''}`, embeds: [ticketEmbed], components: [actionRow] });
                    return interaction.editReply({ content: `✅ Ticket created in **OPENED TICKETS**: <#${ticketChannel.id}>` });
                } catch (err) {
                    console.error('Error creating ticket:', err);
                    if (interaction.deferred || interaction.replied) {
                        return interaction.editReply({ content: '❌ Failed to create ticket due to missing permissions.' }).catch(() => {});
                    }
                }
            }

            // ✋ CLAIM TICKET (STAFF ONLY)
            if (['sys_claim_ticket', 'claim_ticket'].includes(customId)) {
                if (!isStaff(interaction.member)) {
                    return interaction.reply({ content: '❌ Only staff members can claim tickets.', flags: [EPHEMERAL_FLAG] });
                }

                await interaction.deferUpdate().catch(() => {});

                const channel = interaction.channel;
                const staffMember = interaction.user;

                const cleanName = channel.name.replace('ticket-', '').replace('claimed-', '');
                await channel.setName(`claimed-${cleanName}`).catch(() => {});

                await channel.permissionOverwrites.edit(staffMember.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ManageChannels: true
                }).catch(() => {});

                const claimedEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('✋ Ticket Claimed')
                    .setDescription(`This ticket is now being handled by <@${staffMember.id}>.`)
                    .setTimestamp();

                const updatedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('sys_claim_ticket').setLabel(`Claimed by ${staffMember.username}`).setStyle(ButtonStyle.Secondary).setDisabled(true).setEmoji('✅'),
                    new ButtonBuilder().setCustomId('sys_close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await interaction.editReply({ components: [updatedRow] }).catch(() => {});
                await channel.send({ embeds: [claimedEmbed] }).catch(() => {});
                return;
            }

            // 🔒 CLOSE TICKET (STRICTLY STAFF ONLY & PREVENTS DUPLICATE CLOSES)
            if (['sys_close_ticket', 'close_ticket'].includes(customId)) {
                // 1. Strictly restrict closing to Staff Members
                if (!isStaff(interaction.member)) {
                    return interaction.reply({ content: '❌ Only staff members can close support tickets.', flags: [EPHEMERAL_FLAG] });
                }

                const channel = interaction.channel;
                const guild = interaction.guild;

                // 2. Prevent duplicate closes if channel is already closed
                if (channel.parent?.name.toUpperCase() === 'CLOSED TICKETS' || channel.name.startsWith('closed-')) {
                    return interaction.reply({ content: '❌ This ticket is already closed!', flags: [EPHEMERAL_FLAG] });
                }

                await interaction.deferUpdate().catch(() => {});

                const ticketOwnerId = channel.topic;
                const cleanName = channel.name.replace('ticket-', '').replace('claimed-', '');
                await channel.setName(`closed-${cleanName}`).catch(() => {});

                const closedCategory = await getOrCreateTicketCategory(guild, 'CLOSED TICKETS');
                if (closedCategory) {
                    await channel.setParent(closedCategory.id, { lockPermissions: false }).catch(() => {});
                }

                // Revoke send messages permission for ticket owner
                if (ticketOwnerId) {
                    await channel.permissionOverwrites.edit(ticketOwnerId, { SendMessages: false }).catch(() => {});
                }

                const closedEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('🔒 Ticket Closed')
                    .setDescription(`Ticket closed by <@${interaction.user.id}>.\nMoved to **CLOSED TICKETS**. Use the options below to save a transcript or delete this channel manually.`)
                    .setTimestamp();

                const managementRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('sys_transcript_ticket').setLabel('Save Transcript').setStyle(ButtonStyle.Primary).setEmoji('📝'),
                    new ButtonBuilder().setCustomId('sys_delete_ticket').setLabel('Delete Ticket').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
                );

                await channel.send({ embeds: [closedEmbed], components: [managementRow] });
                return;
            }

            // 📝 SAVE TRANSCRIPT (STAFF OR TICKET OWNER)
            if (['sys_transcript_ticket', 'transcript_ticket'].includes(customId)) {
                await interaction.deferReply();

                try {
                    const channel = interaction.channel;
                    const messages = await channel.messages.fetch({ limit: 100 });
                    
                    let transcriptContent = `==================================================\n`;
                    transcriptContent += `TICKET TRANSCRIPT: #${channel.name}\n`;
                    transcriptContent += `SERVER: ${interaction.guild.name}\n`;
                    transcriptContent += `GENERATED BY: ${interaction.user.tag} (${interaction.user.id})\n`;
                    transcriptContent += `DATE: ${new Date().toLocaleString()}\n`;
                    transcriptContent += `==================================================\n\n`;

                    const sortedMessages = Array.from(messages.values()).reverse();

                    for (const msg of sortedMessages) {
                        const time = new Date(msg.createdTimestamp).toLocaleString();
                        const author = `${msg.author.tag} (${msg.author.id})`;
                        let content = msg.content || '[No Text Content]';

                        if (msg.attachments.size > 0) {
                            const attachments = msg.attachments.map(a => a.url).join(', ');
                            content += ` [Attachments: ${attachments}]`;
                        }

                        if (msg.embeds.length > 0) {
                            content += ` [Embedded Message Content]`;
                        }

                        transcriptContent += `[${time}] ${author}:\n${content}\n--------------------------------------------------\n`;
                    }

                    const attachment = new AttachmentBuilder(Buffer.from(transcriptContent, 'utf-8'), { name: `transcript-${channel.name}.txt` });

                    const transcriptEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('📝 Ticket Transcript Generated')
                        .setDescription(`Transcript saved for **#${channel.name}**.`)
                        .setTimestamp();

                    await interaction.editReply({ embeds: [transcriptEmbed], files: [attachment] });
                } catch (err) {
                    console.error('Transcript Error:', err);
                    await interaction.editReply({ content: '❌ Failed to generate transcript.' });
                }
                return;
            }

            // 🗑️ DELETE TICKET (STAFF ONLY)
            if (['sys_delete_ticket', 'delete_ticket'].includes(customId)) {
                if (!isStaff(interaction.member)) {
                    return interaction.reply({ content: '❌ Only staff members can delete tickets.', flags: [EPHEMERAL_FLAG] });
                }

                await interaction.channel.delete().catch(() => {});
                return;
            }

            // 📝 APPLICATIONS MODALS
            if (['sys_apply_staff', 'apply_staff', 'sys_apply_partner', 'apply_partner'].includes(customId)) {
                const isStaffApp = customId.includes('staff');
                const modal = new ModalBuilder()
                    .setCustomId(isStaffApp ? 'modal_staff' : 'modal_partner')
                    .setTitle(isStaffApp ? '🛡️ Staff Application' : '🤝 Partnership Application');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q1').setLabel('Age & Timezone').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q2').setLabel('Previous Experience').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q3').setLabel('Why should we pick you?').setStyle(TextInputStyle.Paragraph).setRequired(true))
                );

                return interaction.showModal(modal).catch(() => {});
            }

            // ✅ / ❌ ACCEPT OR REJECT APPLICATION
            if (['app_accept', 'app_reject'].includes(customId)) {
                if (!isStaff(interaction.member)) {
                    return interaction.reply({ content: '❌ Staff permissions required.', flags: [EPHEMERAL_FLAG] });
                }

                const isAccepted = customId === 'app_accept';
                const applicantId = interaction.channel.topic;
                const targetUser = await client.users.fetch(applicantId).catch(() => null);

                if (targetUser) {
                    const dmEmbed = new EmbedBuilder()
                        .setColor(isAccepted ? '#2ecc71' : '#ED4245')
                        .setTitle(`Application ${isAccepted ? 'Accepted ✅' : 'Rejected ❌'}`)
                        .setDescription(`Your application for **${interaction.guild.name}** has been **${isAccepted ? 'ACCEPTED' : 'REJECTED'}**.`)
                        .setTimestamp();

                    await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
                }

                await interaction.channel.delete().catch(() => {});
                return;
            }
        }

        // ==========================================
        // 3. MODAL SUBMISSIONS
        // ==========================================
        if (interaction.isModalSubmit()) {
            const validModals = ['modal_staff', 'modal_partner', 'sys_staff_modal'];
            if (!validModals.includes(interaction.customId)) return;

            const isStaffApp = interaction.customId.includes('staff');
            const user = interaction.user;

            let logChannel = interaction.guild.channels.cache.find(c => c.name.includes('app-logs') || c.name.includes('staff-logs'));
            
            const appChannel = await interaction.guild.channels.create({
                name: `app-${user.username.toLowerCase()}`,
                type: ChannelType.GuildText,
                topic: user.id,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels] }
                ]
            });

            const q1 = interaction.fields.getTextInputValue('q1') || interaction.fields.getTextInputValue('app_age') || 'N/A';
            const q2 = interaction.fields.getTextInputValue('q2') || interaction.fields.getTextInputValue('app_exp') || 'N/A';
            const q3 = interaction.fields.getTextInputValue('q3') || interaction.fields.getTextInputValue('app_reason') || 'N/A';

            const embed = new EmbedBuilder()
                .setColor(isStaffApp ? '#2ecc71' : '#FFD700')
                .setTitle(`📝 New ${isStaffApp ? 'Staff' : 'Partner'} Application | ${user.username}`)
                .addFields(
                    { name: '👤 Applicant', value: `<@${user.id}> (\`${user.id}\`)`, inline: true },
                    { name: '📌 Age / Timezone', value: q1 },
                    { name: '📜 Experience', value: q2 },
                    { name: '💡 Reason', value: q3 }
                )
                .setTimestamp();

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('app_accept').setLabel('Accept').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('app_reject').setLabel('Reject').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

            await appChannel.send({ embeds: [embed], components: [actionRow] });
            if (logChannel) await logChannel.send({ embeds: [embed] }).catch(() => {});

            return interaction.reply({ content: `✅ Your application has been submitted! Staff will review it shortly in <#${appChannel.id}>.`, flags: [EPHEMERAL_FLAG] });
        }
    });
};
