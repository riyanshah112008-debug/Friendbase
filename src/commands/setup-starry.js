const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-starry')
        .setDescription('🧠 AI MASTER COMMAND: Scans, builds, & configures custom server layout + infrastructure.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Describe your server theme (e.g., "Anime Chill Server", "Cyberpunk Gaming Community")')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        // Emit a custom event or let the starry module handle it directly.
        // Emitting 'starrySetup' passes execution cleanly to starry.js!
        client.emit('starrySetup', interaction);
    }
};
