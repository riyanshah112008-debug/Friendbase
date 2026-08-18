const { EmbedBuilder } = require("discord.js");
const { logAction } = require("../../utils/logger");

module.exports = {
  name: "ban",
  category: "Moderation",
  description: "Ban a member from the server.",
  usage: "ban <user> [reason]",
  permissions: ["BanMembers"],
  async execute(message, args, client) {
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply({ content: "Please mention or provide the ID of a user to ban.", failIfNotExists: false });

    const reason = args.slice(1).join(" ") || "No reason provided";
    
    try {
      await target.ban({ reason });
      
      // Log the action
      logAction("ban", {
        targetId: target.user.id,
        targetTag: target.user.tag,
        moderatorId: message.author.id,
        moderatorTag: message.author.tag,
        reason,
        guildId: message.guild.id,
      });

      const embed = new EmbedBuilder()
        .setTitle("🚫 Member Banned")
        .setColor(0xdc143c)
        .addFields(
          { name: "User", value: target.user.tag, inline: true },
          { name: "Moderator", value: message.author.tag, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed], failIfNotExists: false });
    } catch (error) {
      console.error("[Ban Command Error]", error);
      message.reply({ content: "Could not ban that user.", failIfNotExists: false });
    }
  },
};
