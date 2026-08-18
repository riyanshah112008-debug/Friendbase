// ==========================================
// 🥀 AESTHETIC GOODBYE MODULE & SCHEMA
// ==========================================
const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');

const goodbyeSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true }
});

const GoodbyeSettings = mongoose.models.GoodbyeSettings || mongoose.model('GoodbyeSettings', goodbyeSchema);

const setupGoodbyeCommand = new SlashCommandBuilder()
    .setName('setupgoodbye')
    .setDescription('🥀 Set up the channel for automated aesthetic goodbye cards')
    .addChannelOption(option => 
        option.setName('channel')
            .setDescription('The text channel to send goodbye cards in')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const goodbyeModule = (client) => {
    if (client.commands && typeof client.commands.set === 'function') {
        client.commands.set('setupgoodbye', { data: setupGoodbyeCommand, execute: handleSetupGoodbye });
    }

    async function handleSetupGoodbye(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: true });
            }
        } catch (e) { return; }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.editReply({ content: '❌ You need **Manage Server** permissions to configure goodbye messages.' });
        }

        const channel = interaction.options.getChannel('channel', true);

        await GoodbyeSettings.findOneAndUpdate(
            { guildId: interaction.guildId },
            { channelId: channel.id },
            { upsert: true, new: true }
        );

        const previewEmbed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle(`🥀 FAREWELL, TRAVELER (Preview) 🥀`)
            .setDescription(`👋 **${interaction.user.tag}** has departed from **${interaction.guild.name}**. We wish you the absolute best on your future adventures! 🌠`)
            .addFields({ name: '📊 Server Census', value: `We are now down to **${interaction.guild.memberCount}** members.`, inline: false })
            .setImage('https://media.tenor.com/images/99208a68b444b0593457a82b3d39575e/tenor.gif')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `🥀 Starry Aesthetic Goodbye System • Setup Preview Mode` })
            .setTimestamp();

        await channel.send({ content: `🕊️ Goodbye **${interaction.user.username}**! Until we meet again... *(Setup Preview)*`, embeds: [previewEmbed] }).catch(() => {});

        return interaction.editReply({ content: `✅ **Success!** Aesthetic goodbye cards will now be sent to ${channel}!` });
    }

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName === 'setupgoodbye') await handleSetupGoodbye(interaction);
    });

    client.on('guildMemberRemove', async (member) => {
        try {
            const config = await GoodbyeSettings.findOne({ guildId: member.guild.id });
            if (!config || !config.channelId) return;

            const channel = member.guild.channels.cache.get(config.channelId);
            if (!channel) return;

            const aestheticEmbed = new EmbedBuilder()
                .setColor('#7289DA')
                .setTitle(`🥀 FAREWELL, TRAVELER 🥀`)
                .setDescription(`👋 **${member.user.tag}** has fluttered away from **${member.guild.name}**. May our paths cross again someday! 🌠`)
                .addFields({ name: '📊 Server Census', value: `We are now down to **${member.guild.memberCount}** members.`, inline: false })
                .setImage('https://media.tenor.com/images/99208a68b444b0593457a82b3d39575e/tenor.gif')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `🥀 Starry Aesthetic Goodbye System • Safe travels!` })
                .setTimestamp();

            await channel.send({ content: `🕊️ Goodbye **${member.user.username}**! Wishing you the best on your journey.`, embeds: [aestheticEmbed] }).catch(() => {});
        } catch (error) {
            console.error('[Goodbye Engine Error]:', error);
        }
    });
};

goodbyeModule.GoodbyeSettings = GoodbyeSettings;
goodbyeModule.setupGoodbyeData = setupGoodbyeCommand;
module.exports = goodbyeModule;
