const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resumes the paused song'),
        
    async execute(interaction, client) {
        const player = client.manager.getPlayer(interaction.guild.id);
        
        if (!player) return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        if (interaction.member.voice.channelId !== player.voiceId) return interaction.reply({ content: 'You are not in my voice channel!', ephemeral: true });
        if (!player.paused) return interaction.reply({ content: 'The music is not paused!', ephemeral: true });

        player.pause(false);
        return interaction.reply('▶️ Resumed the music.');
    }
};
