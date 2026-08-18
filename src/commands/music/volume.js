const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Changes the volume of the music')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Volume percentage (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
        
    async execute(interaction, client) {
        const volume = interaction.options.getInteger('amount');
        const player = client.manager.getPlayer(interaction.guild.id);
        
        if (!player) return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        if (interaction.member.voice.channelId !== player.voiceId) return interaction.reply({ content: 'You are not in my voice channel!', ephemeral: true });

        player.setVolume(volume);
        return interaction.reply(`🔊 Volume set to **${volume}%**`);
    }
};
