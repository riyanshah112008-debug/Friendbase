const { EmbedBuilder } = require("discord.js");
const { logAction } = require("../../utils/logger");

module.exports = {
  name: "kick",
  category: "Moderation",
  description: "Kick a member from the server.",
  usage: "kick <user> [reason]",
  permissions: ["KickMembers"],
  async execute(message, args, client) {
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply({ content: "Please mention or provide the ID of a user to kick.", failIfNotExists: false });

    const reason = args.slice(1).join(" ") || "No reason provided";
    
    try {
      await target.kick(reason);
      
      // Log the action
      logAction("kick", {
        targetId: target.user.id,
        targetTag: target.user.tag,
        moderatorId: message.author.id,
        moderatorTag: message.author.tag,
        reason,
        guildId: message.guild.id,
      });

      const embed = new EmbedBuilder()
        .setTitle("👢 Member Kicked")
        .setColor(0xffa500)
        .addFields(
          { name: "User", value: target.user.tag, inline: true },
          { name: "Moderator", value: message.author.tag, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed], failIfNotExists: false });
    } catch (error) {
      console.error("[Kick Command Error]", error);
      message.reply({ content: "Could not kick that user.", failIfNotExists: false });
    }
  },
};
