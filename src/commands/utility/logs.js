const { EmbedBuilder } = require("discord.js");
const { getRecentLogs, getLogsByAction, getLogsByUser } = require("../../utils/logger");

module.exports = {
  name: "logs",
  category: "Utility",
  description: "View moderation logs.",
  usage: "logs [action|user] [count]",
  async execute(message, args, client) {
    try {
      const query = args[0]?.toLowerCase();
      const limit = Math.min(Number(args[1]) || 10, 25);

      let logs = [];
      let title = "Recent Moderation Logs";

      if (query) {
        // Check if it's a user mention or ID
        if (message.mentions.users.size > 0) {
          const user = message.mentions.users.first();
          logs = getLogsByUser(user.id, limit);
          title = `Logs for ${user.tag}`;
        } else if (/^\d+$/.test(query)) {
          // User ID
          logs = getLogsByUser(query, limit);
          title = `Logs for User ${query}`;
        } else {
          // Action type
          logs = getLogsByAction(query, limit);
          title = `${query.charAt(0).toUpperCase() + query.slice(1)} Logs`;
        }
      } else {
        logs = getRecentLogs(limit);
      }

      if (!logs.length) {
        return message.reply({
          content: "No logs found.",
          failIfNotExists: false,
        });
      }

      const fields = logs.map((log) => {
        const date = new Date(log.timestamp).toLocaleString();
        const modName = log.moderatorTag || "Unknown";
        const targetName = log.targetTag || "Unknown";
        const reason = log.reason || "No reason provided";

        return {
          name: `${log.action.toUpperCase()} - ${date}`,
          value: `**Moderator:** ${modName}\n**Target:** ${targetName}\n**Reason:** ${reason}`,
          inline: false,
        };
      });

      const embed = new EmbedBuilder()
        .setTitle(`📋 ${title}`)
        .setColor(0x7289da)
        .addFields(fields.slice(0, 25)) // Discord embed limit
        .setFooter({ text: `Total Entries: ${logs.length}` });

      return message.reply({ embeds: [embed], failIfNotExists: false });
    } catch (error) {
      console.error("[Logs Command Error]", error);
      return message.reply({
        content: "Error retrieving logs.",
        failIfNotExists: false,
      });
    }
  },
};
