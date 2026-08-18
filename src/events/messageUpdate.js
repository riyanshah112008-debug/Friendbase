const config = require("../config");
const { getSettings, getAutomodSettings } = require("../utils/guildSettings");

module.exports = {
  name: "messageUpdate",
  async execute(oldMessage, newMessage, client) {
    if (!oldMessage || !oldMessage.author || oldMessage.author.bot || !newMessage.guild) return;

    const guildSettings = getSettings(newMessage.guild.id);
    const automodSettings = getAutomodSettings(newMessage.guild.id);
    if (!automodSettings.enabled) return;

    const content = newMessage.content || "";
    const uppercaseRatio = (content.match(/[A-Z]/g) || []).length / Math.max(content.length, 1);
    if (automodSettings.caps && uppercaseRatio > config.automod.capsThreshold / 100) {
      await newMessage.delete();
      await newMessage.reply("Automod: Please avoid excessive caps.");
      return;
    }

    if (automodSettings.invites && (content.includes("discord.gg/") || /https?:\/\//i.test(content))) {
      await newMessage.delete();
      await newMessage.reply("Automod: Discord invites and suspicious links are not allowed.");
    }
  },
};
