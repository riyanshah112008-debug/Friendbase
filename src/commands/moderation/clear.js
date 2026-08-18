const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "clear",
  category: "Moderation",
  aliases: ["purge"],
  description: "Delete a number of messages.",
  usage: "clear <amount>",
  permissions: ["ManageMessages"],
  async execute(message, args, client) {
    const amount = Number(args[0]);
    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      return message.reply({ content: "Please provide a number between 1 and 100.", failIfNotExists: false });
    }

    try {
      await message.channel.bulkDelete(amount, true);
      
      const embed = new EmbedBuilder()
        .setTitle("🗑️ Messages Cleared")
        .setColor(0x888888)
        .addFields(
          { name: "Amount Deleted", value: `${amount} messages`, inline: true },
          { name: "Channel", value: message.channel.name, inline: true },
          { name: "Moderator", value: message.author.tag, inline: true }
        )
        .setTimestamp();

      const reply = await message.reply({ embeds: [embed], failIfNotExists: false });
      setTimeout(() => reply.delete().catch(() => {}), 3000);
    } catch (error) {
      console.error("Clear command error:", error);
    }
  },
};
