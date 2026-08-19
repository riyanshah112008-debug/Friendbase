const config = require("../../config");
const { getSettings, updateSettings } = require("../../utils/guildSettings");

module.exports = {
  name: "prefix",
  category: "Utility",
  description: "Show or set the current bot prefix for this server.",
  usage: "prefix [newPrefix]",
  async execute(message, args, client) {
    const guildId = message.guild.id;
    const current = getSettings(guildId).prefix || config.prefix;

    // If no args, show the current prefix
    if (!args.length) {
      return message.reply(`The bot prefix is: ${current}`);
    }

    // Only allow administrators to change the prefix
    if (!message.member.permissions.has("Administrator")) {
      return message.reply({ content: "You need Administrator permission to change the server prefix.", failIfNotExists: false });
    }

    const newPrefix = args[0].trim();
    if (!newPrefix || newPrefix.length > 5) {
      return message.reply({ content: "Please provide a short prefix (1-5 characters).", failIfNotExists: false });
    }

    updateSettings(guildId, { prefix: newPrefix });
    return message.reply({ content: `✅ Server prefix updated to: \
\\`${newPrefix}\
\\``, failIfNotExists: false });
  },
};
