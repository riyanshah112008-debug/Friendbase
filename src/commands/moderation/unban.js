const { EmbedBuilder } = require("discord.js");
const { logAction } = require("../../utils/logger");

module.exports = {
  name: "unban",
  category: "Moderation",
  description: "Unban a user by ID or mention.",
  usage: "unban <userId> [reason]",
  permissions: ["BanMembers"],
  async execute(message, args, client) {
    const userId = args[0];
    if (!userId) return message.reply({ content: "Please provide a user ID to unban.", failIfNotExists: false });

    const reason = args.slice(1).join(" ") || "No reason provided";
    
    try {
      const user = await client.users.fetch(userId);
      await message.guild.members.unban(userId, reason);
      
      // Log the action
      logAction("unban", {
        targetId: userId,
        targetTag: user?.tag || "Unknown",
        moderatorId: message.author.id,
        moderatorTag: message.author.tag,
        reason,
        guildId: message.guild.id,
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Member Unbanned")
        .setColor(0x00aa00)
        .addFields(
          { name: "User ID", value: userId, inline: true },
          { name: "Moderator", value: message.author.tag, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed], failIfNotExists: false });
    } catch (error) {
      console.error("[Unban Command Error]", error);
      message.reply({ content: "Could not unban that user.", failIfNotExists: false });
    }
  },
};
