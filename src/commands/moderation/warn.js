const { EmbedBuilder } = require("discord.js");
const { addWarning, getWarnings } = require("../../utils/warnings");
const { logAction } = require("../../utils/logger");

module.exports = {
  name: "warn",
  category: "Moderation",
  description: "Warn a member.",
  usage: "warn <user> [reason]",
  permissions: ["ModerateMembers"],
  async execute(message, args, client) {
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) {
      return message.reply({
        content: "Please mention or provide the ID of a user to warn.",
        failIfNotExists: false,
      });
    }

    const reason = args.slice(1).join(" ") || "No reason provided";

    try {
      // Add warning
      const count = addWarning(message.guild.id, target.user.id, message.author.id, reason);

      // Log the action
      logAction("warn", {
        targetId: target.user.id,
        targetTag: target.user.tag,
        moderatorId: message.author.id,
        moderatorTag: message.author.tag,
        reason,
        warningCount: count,
        guildId: message.guild.id,
      });

      // Auto-mute at 3 warnings
      if (count === 3) {
        try {
          await target.timeout(3600000, "Automatic timeout after 3 warnings"); // 1 hour
        } catch (e) {
          console.error("Could not timeout:", e.message);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle("⚠️ Member Warned")
        .setColor(0xffaa00)
        .addFields(
          { name: "User", value: target.user.tag, inline: true },
          { name: "Moderator", value: message.author.tag, inline: true },
          { name: "Warnings", value: `${count}/3`, inline: true },
          { name: "Reason", value: reason, inline: false }
        );

      if (count >= 3) {
        embed.addField("⚠️ Action", "User has been timed out for 1 hour (3 warnings reached)", false);
      }

      embed.setTimestamp();
      return message.reply({ embeds: [embed], failIfNotExists: false });
    } catch (error) {
      console.error("[Warn Command Error]", error);
      message.reply({ content: "Could not warn that user.", failIfNotExists: false });
    }
  },
};
