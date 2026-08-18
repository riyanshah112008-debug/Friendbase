const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

// Safely load databases (won't crash if the file is missing)
let ServerSettings, ChestChannel, BoostChannel;
try { ServerSettings = require('../models/ServerSettings'); } catch(e) {}
try { ChestChannel = require('../models/ChestChannel'); } catch(e) {}
try { BoostChannel = require('../models/BoostChannel'); } catch(e) {}

module.exports = (client) => {
    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;

        // Trigger on EXACT text match
        if (message.content.toLowerCase() === '.setup-starry') {
            
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ **Access Denied:** Only Administrators can run the master sync.');
            }

            const embed = new EmbedBuilder()
                .setColor('#9b59b6')
                .setTitle('🧠 Starry Master Configuration Engine')
                .setDescription(
                    '**Initiate Global Server Sync?**\n\n' +
                    'My brain will scan your channels and automatically configure:\n' +
                    '🛡️ **Security:** Verification & Logs\n' +
                    '👋 **Community:** Welcomes, Starboard & Suggestions\n' +
                    '🎫 **Support:** Tickets, Appeals & Applications\n' +
                    '🎁 **Economy:** Loot Chests & Boosts\n\n' +
                    '*This will wire my internal systems directly into your server layout.*'
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('master_txt_confirm').setLabel('SYNC SERVER').setStyle(ButtonStyle.Success).setEmoji('🧠'),
                new ButtonBuilder().setCustomId('master_txt_cancel').setLabel('CANCEL').setStyle(ButtonStyle.Secondary)
            );

            const response = await message.reply({ embeds: [embed], components: [row] });
            const filter = i => i.user.id === message.author.id;
            
            try {
                const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });
                if (confirmation.customId === 'master_txt_cancel') {
                    return confirmation.update({ content: '🚫 Master sync aborted.', embeds: [], components: [] });
                }

                await confirmation.update({ content: '🧠 **SCANNING NEURAL NETWORK (CHANNELS)...**', embeds: [], components: [] });
                
                const guild = message.guild;
                const channels = guild.channels.cache;
                let report = []; 

                // --- 1. BASIC CONFIGURATION ---
                if (ServerSettings) {
                    await ServerSettings.findOneAndUpdate({ guildId: guild.id }, { triggerWord: 'Starry' }, { upsert: true });
                    report.push(`⚙️ **Identity:** Trigger word set to \`Starry\``);
                }

                // --- 2. COMMUNITY FEATURES ---
                if (channels.find(c => c.name.includes('welcome'))) report.push(`👋 **Welcomes:** Linked to <#${channels.find(c => c.name.includes('welcome')).id}>`);
                if (channels.find(c => c.name.includes('starboard'))) report.push(`⭐ **Starboard:** Linked to <#${channels.find(c => c.name.includes('starboard')).id}>`);
                if (channels.find(c => c.name.includes('suggestions') || c.name.includes('ideas'))) report.push(`💡 **Suggestions:** Linked to <#${channels.find(c => c.name.includes('suggestions') || c.name.includes('ideas')).id}>`);

                // --- 3. SECURITY & LOGS ---
                if (channels.find(c => c.name.includes('verification') || c.name.includes('verify'))) report.push(`🛡️ **Verification:** Mapped to <#${channels.find(c => c.name.includes('verification') || c.name.includes('verify')).id}>`);
                const logChannels = channels.filter(c => c.name.includes('logs-'));
                if (logChannels.size > 0) report.push(`🗂️ **Smart Logging:** Successfully mapped **${logChannels.size}** distinct log channels.`);

                // --- 4. TICKETS & APPS ---
                const openTicketsCat = channels.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('opened tickets'));
                const closedTicketsCat = channels.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('closed tickets'));
                if (openTicketsCat && closedTicketsCat) report.push(`🎫 **Tickets:** Bound to \`${openTicketsCat.name}\` & \`${closedTicketsCat.name}\``);
                
                const applicationsCat = channels.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('applications'));
                if (applicationsCat) report.push(`📝 **Applications:** Bound to category \`${applicationsCat.name}\``);

                // --- 5. ECONOMY & BOOSTS ---
                const booster = channels.find(c => c.name.includes('boosters') || c.name.includes('boost'));
                if (booster && BoostChannel) {
                    await BoostChannel.findOneAndUpdate({ guildId: guild.id }, { channelId: booster.id }, { upsert: true });
                    report.push(`🚀 **Boost Tracker:** Linked to <#${booster.id}>`);
                }

                const chestTargets = channels.filter(c => c.type === ChannelType.GuildText && (c.name.includes('general') || c.name.includes('cafe-chat') || c.name.includes('international') || c.name.includes('spam')));
                if (ChestChannel) {
                    if (!client.chestChannelsCache) client.chestChannelsCache = new Set();
                    let chestCount = 0;
                    for (const [id, channel] of chestTargets) {
                        const existing = await ChestChannel.findOne({ channelId: id });
                        if (!existing) {
                            await ChestChannel.create({ guildId: guild.id, channelId: id });
                            client.chestChannelsCache.add(id);
                            chestCount++;
                        }
                    }
                    if (chestCount > 0) report.push(`🎁 **Loot Engine:** Activated in **${chestCount}** chat channels`);
                }

                // --- 6. SUCCESS ---
                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('✅ Neural Sync Complete')
                    .setDescription(`I have successfully scanned the server, identified the purpose of each channel, and linked my systems!\n\n${report.join('\n')}`)
                    .setFooter({ text: 'Starry Master Brain', iconURL: client.user.displayAvatarURL() });

                await message.channel.send({ embeds: [successEmbed] });

            } catch (e) {
                console.error('Master Sync Error:', e);
                await response.edit({ content: '⚠️ Command timed out or encountered an error. Setup aborted.', embeds: [], components: [] });
            }
        }
    });
};
