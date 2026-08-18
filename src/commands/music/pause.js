const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses the current song'),
        
    async execute(interaction, client) {
        const player = client.manager.getPlayer(interaction.guild.id);
        
        if (!player) return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        if (interaction.member.voice.channelId !== player.voiceId) return interaction.reply({ content: 'You are not in my voice channel!', ephemeral: true });
        if (player.paused) return interaction.reply({ content: 'The music is already paused!', ephemeral: true });

        player.pause(true);
        return interaction.reply('⏸️ Paused the music.');
    }
};
