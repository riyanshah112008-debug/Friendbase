const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current song'),
        
    async execute(interaction, client) {
        const player = client.manager.getPlayer(interaction.guild.id);
        
        if (!player) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
        if (interaction.member.voice.channelId !== player.voiceId) return interaction.reply({ content: 'You are not in my voice channel!', ephemeral: true });

        player.skip();
        return interaction.reply('⏭️ Skipped!');
    }
};
