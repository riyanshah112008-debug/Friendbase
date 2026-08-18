const { getSettings } = require("../utils/guildSettings");

module.exports = {
  name: "guildMemberRemove",
  async execute(member, client) {
    const guild = member.guild;
    const settings = getSettings(guild.id);

    if (settings.goodbye?.enabled) {
      const channel = guild.channels.cache.get(settings.goodbye.channel) || guild.channels.cache.find((target) => target.name === settings.goodbye.channel);
      if (channel && channel.isTextBased()) {
        const goodbyeTemplate = settings.goodbye.message || "{user} has left the server.";
        const text = goodbyeTemplate
          .replace(/{server}/gi, guild.name)
          .replace(/{user}/gi, member.user.tag)
          .replace(/{mention}/gi, `<@${member.id}>`);

        await channel.send({ content: text }).catch(() => null);
      }
    }
  },
};
