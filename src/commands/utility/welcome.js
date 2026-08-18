const { EmbedBuilder } = require("discord.js");
const { getSettings, updateSettings } = require("../../utils/guildSettings");

module.exports = {
  name: "welcome",
  category: "Utility",
  aliases: ["setwelcome"],
  description: "Set up or test welcome messages.",
  usage: "welcome [test/set/disable]",
  permissions: ["Administrator"],
  async execute(message, args, client) {
    const settings = getSettings(message.guild.id);

    if (!args.length) {
      const embed = new EmbedBuilder()
        .setTitle("👋 Welcome System")
        .setColor(0x7289da)
        .setDescription(
          "Welcome new members with a custom channel message!\n\n**Subcommands:**\n" +
            "`welcome test` - Send a test welcome message\n" +
            "`welcome set <channel>` - Set welcome channel\n" +
            "`welcome disable` - Disable welcome messages\n" +
            "`welcome on` / `welcome off` - Toggle welcome messages"
        );

      return message.reply({ embeds: [embed], failIfNotExists: false });
    }

    const subcommand = args[0].toLowerCase();

    if (subcommand === "on" || subcommand === "off") {
      const enabled = subcommand === "on";
      updateSettings(message.guild.id, { welcome: { enabled } });
      return message.reply({ content: `✅ Welcome messages ${enabled ? "enabled" : "disabled"}.`, failIfNotExists: false });
    }

    if (subcommand === "test") {
      const embed = new EmbedBuilder()
        .setTitle(`👋 Welcome to ${message.guild.name}!`)
        .setDescription(`Hello ${message.author}! Welcome to our server. Make sure to read the rules and have fun!`)
        .setColor(0x00ff00)
        .setThumbnail(message.guild.iconURL())
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [embed], failIfNotExists: false });
    }

    if (subcommand === "set") {
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!channel) {
        return message.reply({
          content: "Please mention or provide a channel ID.",
          failIfNotExists: false,
        });
      }

      updateSettings(message.guild.id, { welcome: { enabled: true, channel: channel.id, message: settings.welcome?.message || "Welcome to {server}, {user}!" } });
      return message.reply({
        content: `✅ Welcome channel set to ${channel}`,
        failIfNotExists: false,
      });
    }

    if (subcommand === "disable") {
      updateSettings(message.guild.id, { welcome: { enabled: false, channel: null } });
      return message.reply({
        content: "✅ Welcome messages disabled",
        failIfNotExists: false,
      });
    }

    return message.reply({
      content: "Invalid subcommand. Use `welcome` for help.",
      failIfNotExists: false,
    });
  },
};
