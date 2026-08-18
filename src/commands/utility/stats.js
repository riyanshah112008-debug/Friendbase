const { EmbedBuilder } = require("discord.js");
const { getGuildUserStats, getGuildLeaderboard } = require("../../utils/database");

module.exports = {
  name: "stats",
  category: "Utility",
  aliases: ["userstats"],
  description: "View your or someone's stats.",
  usage: "stats [@user]",
  async execute(message, args, client) {
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
    const stats = getGuildUserStats(message.guild.id, target.user.id);
    const leaderboard = getGuildLeaderboard(message.guild.id, 1000);
    const rank = leaderboard.findIndex((u) => u.userId === target.user.id) + 1;

    const xpBar = "█".repeat(Math.round((stats.xp % 100) / 10)) + "░".repeat(10 - Math.round((stats.xp % 100) / 10));

    const embed = new EmbedBuilder()
      .setTitle(`📊 Stats for ${target.user.username}`)
      .setColor(0x7289da)
      .setThumbnail(target.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "Level", value: `${stats.level}`, inline: true },
        { name: "XP", value: `${stats.xp}`, inline: true },
        { name: "Rank", value: rank ? `#${rank}` : "N/A", inline: true },
        { name: "Progress", value: `${xpBar} ${stats.xp % 100}/100`, inline: false },
        { name: "Warnings", value: `${stats.warns}/3`, inline: true }
      )
      .setFooter({ text: `${100 - (stats.xp % 100)} XP until next level` });

    return message.reply({ embeds: [embed], failIfNotExists: false });
  },
};
