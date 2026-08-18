const { EmbedBuilder } = require('discord.js');
const GuildTelemetry = require('../models/GuildTelemetry');

const voiceSessions = new Map();

module.exports = (client) => {

    // 👥 Track Member Joins
    client.on('guildMemberAdd', async (member) => {
        try {
            await GuildTelemetry.findOneAndUpdate(
                { guildId: member.guild.id },
                { 
                    $inc: { joinsThisHour: 1 },
                    $set: { guildName: member.guild.name }
                },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error('[Telemetry] Join tracking error:', err);
        }
    });

    // 🎙️ Track Voice Time
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const userId = newState.id || oldState.id;
        const guildId = newState.guild.id || oldState.guild.id;

        if (!oldState.channelId && newState.channelId) {
            voiceSessions.set(`${guildId}_${userId}`, Date.now());
        }

        if (oldState.channelId && !newState.channelId) {
            const joinTime = voiceSessions.get(`${guildId}_${userId}`);
            if (joinTime) {
                const durationSeconds = Math.floor((Date.now() - joinTime) / 1000);
                voiceSessions.delete(`${guildId}_${userId}`);

                await GuildTelemetry.findOneAndUpdate(
                    { guildId },
                    { 
                        $inc: { totalVcSeconds: durationSeconds },
                        $set: { guildName: newState.guild.name }
                    },
                    { upsert: true }
                ).catch(() => {});
            }
        }
    });

    // 🛡️ Log Moderation Telemetry
    client.logModTelemetry = async (guildId, actionType) => {
        const fieldMap = {
            warn: 'modStats.warns',
            kick: 'modStats.kicks',
            ban: 'modStats.bans',
            automod: 'modStats.automodTriggers'
        };

        const updateField = fieldMap[actionType];
        if (!updateField) return;

        try {
            await GuildTelemetry.findOneAndUpdate(
                { guildId },
                { $inc: { [updateField]: 1 } },
                { upsert: true }
            );
        } catch (err) {
            console.error('[Telemetry] Mod logging error:', err);
        }
    };

    // 📡 HOURLY OWNER DM DISPATCHER
    setInterval(async () => {
        const ownerId = process.env.OWNER_ID;
        if (!ownerId) return;

        try {
            const owner = await client.users.fetch(ownerId);
            if (!owner) return;

            const allGuilds = client.guilds.cache;

            for (const [guildId, guild] of allGuilds) {
                let telemetry = await GuildTelemetry.findOne({ guildId });
                if (!telemetry) {
                    telemetry = await GuildTelemetry.create({ guildId, guildName: guild.name });
                }

                const vcHours = (telemetry.totalVcSeconds / 3600).toFixed(1);

                const embed = new EmbedBuilder()
                    .setColor('#7289DA')
                    .setTitle(`📩 Owner Telemetry Digest: ${guild.name}`)
                    .setThumbnail(guild.iconURL({ dynamic: true }) || null)
                    .addFields(
                        { name: '👥 Member Velocity', value: `• Total Members: **${guild.memberCount}**\n• Joins Past Hour: **${telemetry.joinsThisHour}** /hr`, inline: true },
                        { name: '🎙️ Voice Active Time', value: `• Total VC Duration: **${vcHours} hrs**`, inline: true },
                        { name: '🛡️ Security Enforcements', value: `• Warns: **${telemetry.modStats.warns}**\n• Kicks: **${telemetry.modStats.kicks}**\n• Bans: **${telemetry.modStats.bans}**\n• AutoMod Actions: **${telemetry.modStats.automodTriggers}**`, inline: false }
                    )
                    .setFooter({ text: `Guild ID: ${guild.id} • Sent directly to Bot Owner` })
                    .setTimestamp();

                await owner.send({ embeds: [embed] }).catch(() => {});

                // Reset hourly velocity count
                telemetry.lastHourJoinsRecord = telemetry.joinsThisHour;
                telemetry.joinsThisHour = 0;
                await telemetry.save();
            }
        } catch (error) {
            console.error('[Telemetry Engine] DM Dispatch Error:', error);
        }
    }, 3600000); // Sends every 60 minutes
};
