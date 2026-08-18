const config = require("../../config");
const { getSettings } = require("../../utils/guildSettings");

module.exports = {
  name: "prefix",
  category: "Utility",
  description: "Show the current bot prefix.",
  usage: "prefix",
  async execute(message, args, client) {
    const guildPrefix = getSettings(message.guild.id).prefix || config.prefix;
    message.reply(`The bot prefix is: ${guildPrefix}`);
  },
};
