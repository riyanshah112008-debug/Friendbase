const { EmbedBuilder } = require("discord.js");
const { logAction } = require("../../utils/logger");

module.exports = {
  name: "timeout",
  category: "Moderation",
  description: "Temporarily timeout a member.",
  usage: "timeout <user> <time> [reason]",
  permissions: ["ModerateMembers"],
  async execute(message, args, client) {
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply({ content: "Please mention or provide the ID of a user to timeout.", failIfNotExists: false });

    const timeValue = args[1];
    if (!timeValue) return message.reply({ content: "Please provide a timeout length like `60s`, `5m`, or `1h`.", failIfNotExists: false });

    const ms = parseTimeToMs(timeValue);
    if (!Number.isFinite(ms) || ms <= 0) return message.reply({ content: "Invalid timeout duration.", failIfNotExists: false });

    const reason = args.slice(2).join(" ") || "No reason provided";
    
    try {
      await target.timeout(ms, reason);
      
      // Log the action
      logAction("timeout", {
        targetId: target.user.id,
        targetTag: target.user.tag,
        moderatorId: message.author.id,
        moderatorTag: message.author.tag,
        reason,
        duration: timeValue,
        guildId: message.guild.id,
      });

      const embed = new EmbedBuilder()
        .setTitle("⏱️ Member Timed Out")
        .setColor(0xffff00)
        .addFields(
          { name: "User", value: target.user.tag, inline: true },
          { name: "Duration", value: timeValue, inline: true },
          { name: "Moderator", value: message.author.tag, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed], failIfNotExists: false });
    } catch (error) {
      console.error("[Timeout Command Error]", error);
      message.reply({ content: "Could not timeout that user.", failIfNotExists: false });
    }
  },
};

function parseTimeToMs(input) {
  const match = input.match(/^((?:\d+\.?\d*)?)([smhdw])$/i);
  if (!match) return NaN;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return value * map[unit];
}
