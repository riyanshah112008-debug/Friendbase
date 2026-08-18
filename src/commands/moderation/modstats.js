const { EmbedBuilder } = require("discord.js");
const { getRecentLogs } = require("../../utils/logger");

module.exports = {
  name: "modstats",
  category: "Moderation",
  description: "View moderation statistics.",
  usage: "modstats",
  async execute(message, args, client) {
    try {
      const logs = getRecentLogs(1000); // Get all recent logs
      const guildLogs = logs.filter((l) => l.guildId === message.guild.id);

      // Count by action
      const bans = guildLogs.filter((l) => l.action === "ban").length;
      const kicks = guildLogs.filter((l) => l.action === "kick").length;
      const timeouts = guildLogs.filter((l) => l.action === "timeout").length;
      const unbans = guildLogs.filter((l) => l.action === "unban").length;
      const warns = guildLogs.filter((l) => l.action === "warn").length;

      // Get top moderators
      const modMap = {};
      guildLogs.forEach((log) => {
        if (!modMap[log.moderatorTag]) modMap[log.moderatorTag] = 0;
        modMap[log.moderatorTag]++;
      });
      const topMods = Object.entries(modMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => `**${name}**: ${count} actions`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("📊 Moderation Statistics")
        .setColor(0x7289da)
        .addFields(
          { name: "Bans", value: `${bans}`, inline: true },
          { name: "Kicks", value: `${kicks}`, inline: true },
          { name: "Timeouts", value: `${timeouts}`, inline: true },
          { name: "Unbans", value: `${unbans}`, inline: true },
          { name: "Warnings", value: `${warns}`, inline: true },
          { name: "Total Actions", value: `${bans + kicks + timeouts + unbans + warns}`, inline: true },
          { name: "Top Moderators", value: topMods || "No moderation actions yet", inline: false }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed], failIfNotExists: false });
    } catch (error) {
      console.error("[Modstats Command Error]", error);
      message.reply({ content: "Error retrieving statistics.", failIfNotExists: false });
    }
  },
};
