const { EmbedBuilder } = require("discord.js");
const { getWarnings } = require("../../utils/warnings");

module.exports = {
  name: "warnings",
  category: "Moderation",
  aliases: ["warns"],
  description: "View warnings for a user.",
  usage: "warnings <user>",
  async execute(message, args, client) {
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) {
      return message.reply({
        content: "Please mention or provide the ID of a user.",
        failIfNotExists: false,
      });
    }

    const warnings = getWarnings(message.guild.id, target.user.id);

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Warnings for ${target.user.tag}`)
      .setColor(0xffaa00)
      .setThumbnail(target.user.displayAvatarURL());

    if (warnings.length === 0) {
      embed.setDescription("No warnings on record.");
    } else {
      const warningsList = warnings
        .map((w, i) => {
          const date = new Date(w.timestamp).toLocaleDateString();
          return `**${i + 1}.** ${w.reason} *(${date})*`;
        })
        .join("\n");

      embed
        .addField("Warnings", warningsList, false)
        .addField("Total", `${warnings.length}/3`, true)
        .addField("Status", warnings.length >= 3 ? "⛔ At limit" : "✅ Active", true);
    }

    embed.setTimestamp();
    return message.reply({ embeds: [embed], failIfNotExists: false });
  },
};
