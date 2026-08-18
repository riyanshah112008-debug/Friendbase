const { EmbedBuilder } = require("discord.js");
const { getXP, getLevel, getXPToNextLevel, getUserRank } = require("../../utils/xp");

module.exports = {
  name: "profile",
  category: "Utility",
  aliases: ["rank", "level"],
  description: "View your or someone's XP profile.",
  usage: "profile [@user]",
  async execute(message, args, client) {
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;

    const xp = getXP(message.guild.id, target.user.id);
    const level = getLevel(xp);
    const xpToNext = getXPToNextLevel(xp);
    const rank = getUserRank(message.guild.id, target.user.id);

    // Create XP bar
    const barLength = 10;
    const currentLevelXP = level * 100;
    const nextLevelXP = (level + 1) * 100;
    const currentLevelProgress = xp - currentLevelXP;
    const filledBars = Math.round((currentLevelProgress / 100) * barLength);
    const xpBar = "█".repeat(filledBars) + "░".repeat(barLength - filledBars);

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${target.user.username}'s Profile`)
      .setColor(0x7289da)
      .setThumbnail(target.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "Level", value: `${level}`, inline: true },
        { name: "Rank", value: rank ? `#${rank}` : "N/A", inline: true },
        { name: "Total XP", value: `${xp}`, inline: true },
        {
          name: "Progress to Level " + (level + 1),
          value: `${xpBar}\n${currentLevelProgress}/${100} XP`,
          inline: false,
        }
      )
      .setFooter({ text: `${xpToNext} XP until next level` });

    return message.reply({ embeds: [embed], failIfNotExists: false });
  },
};
