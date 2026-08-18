const { EmbedBuilder } = require("discord.js");
const { getLeaderboard } = require("../../utils/xp");

module.exports = {
  name: "leaderboard",
  category: "Utility",
  aliases: ["lb", "top"],
  description: "View the XP leaderboard.",
  usage: "leaderboard",
  async execute(message, args, client) {
    const leaderboard = getLeaderboard(message.guild.id, 10);

    if (leaderboard.length === 0) {
      return message.reply({
        content: "No one is on the leaderboard yet!",
        failIfNotExists: false,
      });
    }

    let description = "";
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const user = await client.users.fetch(entry.userId).catch(() => null);
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

      description += `${medal} <@${entry.userId}> - Level ${entry.level} (${entry.xp} XP)\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 XP Leaderboard")
      .setDescription(description)
      .setColor(0xffd700)
      .setTimestamp();

    return message.reply({ embeds: [embed], failIfNotExists: false });
  },
};
