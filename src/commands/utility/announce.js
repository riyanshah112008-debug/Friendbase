const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "announce",
  category: "Utility",
  description: "Create a beautiful announcement.",
  usage: "announce <title> | <description>",
  permissions: ["ManageMessages"],
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply({
        content: "Usage: `announce <title> | <description>`\nExample: `announce Important Notice | Our server is moving channels tomorrow!`",
        failIfNotExists: false,
      });
    }

    const content = args.join(" ");
    if (!content.includes("|")) {
      return message.reply({
        content: "Please use the format: `announce <title> | <description>`",
        failIfNotExists: false,
      });
    }

    const [title, description] = content.split("|").map((s) => s.trim());

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${title}`)
      .setDescription(description)
      .setColor(0xff6b6b)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    try {
      // Delete the original command message
      await message.delete().catch(() => {});

      // Send announcement
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[Announce Command Error]", error);
      message.reply({ content: "Error creating announcement.", failIfNotExists: false });
    }
  },
};
