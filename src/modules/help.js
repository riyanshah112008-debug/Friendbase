const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    const PREFIX = '.';

    // ==========================================
    // 1. HELP EMBED BUILDER
    // ==========================================
    const buildHelpEmbed = (user, guild) => {
        return new EmbedBuilder()
            .setColor('#2b2d31') 
            .setTitle('🤖 Manager Bot | Command List')
            .setDescription(`Prefix for this server is \`${PREFIX}\`\nYou can also use **Slash Commands (/)** for most features!`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { 
                    name: '🌐 Translation', 
                    value: '`translate <language> <text>` - Translate text\n*(Tip: Reply to a message with .translate <language>)*', 
                    inline: false 
                },
                { 
                    name: '📈 Leveling System', 
                    value: '`/rank` or `.rank` - Check your XP and Level\n`/toggleleveling` or `.toggleleveling <on/off>` - Enable/Disable XP (Admin)', 
                    inline: false 
                },
                { 
                    name: '🎵 Music', 
                    value: '`play <song>` - Play audio in your voice channel', 
                    inline: false 
                },
                { 
                    name: '🛡️ Moderation & Automod', 
                    value: '**Unified Slash Controls:**\n' +
                          '`/moderate toggle <module> <status>` - Toggle specialized engines (Wick, Beemo, etc.)\n' +
                          '`/moderate autokick / autoban` - Configure thresholds & protocols\n' +
                          '`/moderate ownerbypass <bypass>` - Control security immunity\n' +
                          '`/warn <user> <reason>` - Officially warn a user\n' +
                          '`/warnings <user>` - Check warning records\n' +
                          '`/clear <amount>` - Bulk delete up to 100 recent messages\n' +
                          '`/mediaonly` or `.mediaonly` - Toggle Media-Only rules for a channel\n\n' +
                          '**Legacy Commands:**\n' +
                          '`.automod <enable/disable/status>` - Server-wide master switch\n' +
                          '`.ignore` / `.unignore` - Toggle channel filters (links/emojis/all)\n' +
                          '`.autokick` / `.autoban` - Toggle baseline auto-kick & ban\n\n' +
                          '**Passive Security:** Link Blocker, Emoji Spam Blocker, Sus Account Detector, Anti-Abuse (Bad Words & Rapid Spam)', 
                    inline: false 
                },
                { 
                    name: '🎫 Support & Applications', 
                    value: '`/ticketsetup` - Spawn the Support Ticket panel (Admin)\n`/applysetup` - Spawn the Staff & Partner App dashboard (Admin)\n*Features: Private channels, Claim, Close, & Auto-Transcripts*', 
                    inline: false 
                },
                { 
                    name: '📊 Utility, Setup & Fun', 
                    value: '`/afk` or `.afk <reason>` - Set an AFK status to warn users who ping you\n`/whois` - Pull up a detailed ID card for any user\n`/tod` - Play Truth or Dare\n`/setupstats` - Create live server member & bot count voice channels (Admin)\n`/setupcount` - Set the current channel as the Counting Game channel (Admin)\n`/setlogs` or `.setlogs <#channel>` - Setup permanent MongoDB server auditing logs (Admin)\n\n**Passive Tracking:** Advanced Server Logs, Invite Tracker, Bump Tracker', 
                    inline: false 
                },
                { 
                    name: '✨ Starry AI & Extras', 
                    value: '`.imagine <prompt>` - Generate stunning AI images\n`@Starry <message>` or say `starry` - Chat naturally with the AI engine!\n\n**AI Admin Powers:** Starry understands natural language commands to kick, ban, timeout, clear messages, manage roles (create/delete/give/remove), and control channel permissions! Just ask her to do it in plain English.\n\n*Premium features are active on this server.*', 
                    inline: false 
                }
            )
            .setFooter({ text: `Requested by ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();
    };

    // ==========================================
    // 2. PREFIX COMMAND (.help)
    // ==========================================
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        if (message.content.trim().toLowerCase() === PREFIX + 'help') {
            const helpEmbed = buildHelpEmbed(message.author, message.guild);
            return message.reply({ embeds: [helpEmbed] }).catch(() => {});
        }
    });

    // ==========================================
    // 3. SLASH COMMAND (/help)
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'ping') {
            const websocketPing = Math.round(client.ws.ping);
            return interaction.reply({ content: `🏓 Pong! WebSocket latency: **${websocketPing} ms**` }).catch(() => {});
        }

        if (interaction.commandName !== 'help') return;
        const helpEmbed = buildHelpEmbed(interaction.user, interaction.guild);
        await interaction.reply({ embeds: [helpEmbed] }).catch(() => {});
    });
};
                    
