const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the music and leaves'),
        
    async execute(interaction, client) {
        const player = client.manager.getPlayer(interaction.guild.id);
        
        if (!player) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
        if (interaction.member.voice.channelId !== player.voiceId) return interaction.reply({ content: 'You are not in my voice channel!', ephemeral: true });

        player.destroy();
        return interaction.reply('🛑 Stopped the music and left.');
    }
};
