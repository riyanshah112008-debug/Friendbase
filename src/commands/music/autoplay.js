const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const EPHEMERAL_FLAG = MessageFlags.Ephemeral || 6;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('📻 Toggle automatic related song playback when the queue ends'),
        
    async execute(interaction, client) {
        const memberVoiceChannel = interaction.member?.voice?.channel;
        if (!memberVoiceChannel) {
            return interaction.reply({
                content: '❌ You must be connected to a voice channel to use autoplay!',
                flags: [EPHEMERAL_FLAG]
            });
        }

        const player = client.manager.getPlayer(interaction.guild.id);
        if (!player) {
            return interaction.reply({
                content: '❌ Nothing is currently playing. Start a song first before enabling autoplay!',
                flags: [EPHEMERAL_FLAG]
            });
        }

        if (interaction.member.voice.channelId !== player.voiceId) {
            return interaction.reply({
                content: '❌ You must be in the same voice channel as Starry!',
                flags: [EPHEMERAL_FLAG]
            });
        }

        // Toggle Autoplay State in Player Cache
        const currentAutoplay = player.data.get('autoplay') || false;
        const newAutoplay = !currentAutoplay;
        player.data.set('autoplay', newAutoplay);

        const embed = new EmbedBuilder()
            .setColor(newAutoplay ? '#2ecc71' : '#ED4245')
            .setTitle(newAutoplay ? '📻 Autoplay Enabled' : '📻 Autoplay Disabled')
            .setDescription(
                newAutoplay
                    ? 'Starry will now automatically search and queue related songs when the queue finishes!'
                    : 'Autoplay is turned off. Playback will stop when the current queue ends.'
            )
            .setFooter({ text: 'Starry Music Engine', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
