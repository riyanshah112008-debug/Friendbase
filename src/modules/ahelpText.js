const { Events, PermissionFlagsBits } = require('discord.js');
const { buildAdminHelpEmbed } = require('../commands/moderation/help-admin');

module.exports = (client) => {
    client.on(Events.MessageCreate, async message => {
        if (message.author.bot || !message.guild) return;

        if (message.content.toLowerCase() === '.ahelp') {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return message.reply({ content: '❌ **Access Denied:** You do not have moderation permissions.' }).catch(() => {});
            }

            const embed = buildAdminHelpEmbed(client);
            return message.reply({ embeds: [embed] }).catch(() => {});
        }
    });
};
