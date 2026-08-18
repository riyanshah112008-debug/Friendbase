const { EmbedBuilder } = require("discord.js");
const { getSettings, updateSettings } = require("../../utils/guildSettings");

function parseToggleValue(input) {
  const value = String(input || "").trim().toLowerCase();
  if (["on", "enable", "enabled", "true", "1"].includes(value)) return true;
  if (["off", "disable", "disabled", "false", "0"].includes(value)) return false;
  return null;
}

function normalizeAutomodFeature(feature) {
  const map = {
    spam: "spam",
    massmention: "massMention",
    "mass-mention": "massMention",
    "mass_mention": "massMention",
    caps: "caps",
    links: "invites",
    invite: "invites",
    invites: "invites",
    phishing: "phishing",
    all: "all",
  };
  return map[String(feature || "").trim().toLowerCase()] || null;
}

module.exports = {
  name: "settings",
  category: "Utility",
  description: "Manage server settings.",
  usage: "settings [setting] [value]",
  permissions: ["Administrator"],
  async execute(message, args, client) {
    const settings = getSettings(message.guild.id);

    if (!args.length) {
      const embed = new EmbedBuilder()
        .setTitle("⚙️ Server Settings")
        .setColor(0x7289da)
        .addFields(
          { name: "Prefix", value: settings.prefix, inline: true },
          { name: "Welcome Enabled", value: settings.welcome.enabled ? "✅" : "❌", inline: true },
          { name: "Goodbye Enabled", value: settings.goodbye.enabled ? "✅" : "❌", inline: true },
          { name: "Autorole Enabled", value: settings.autorole.enabled ? "✅" : "❌", inline: true },
          {
            name: "Automod Enabled",
            value: settings.automod.enabled ? "✅" : "❌",
            inline: true,
          },
          {
            name: "Automod Features",
            value: `Spam: ${settings.automod.spam ? "✅" : "❌"} | Phishing: ${settings.automod.phishing ? "✅" : "❌"} | Invites: ${settings.automod.invites ? "✅" : "❌"}`,
            inline: false,
          },
          {
            name: "Caps Filter",
            value: settings.automod.caps ? "✅" : "❌",
            inline: true,
          },
          { name: "Mass Mention Filter", value: settings.automod.massMention ? "✅" : "❌", inline: true }
        )
        .setFooter({
          text: "Use !settings <setting> <value> to change settings. Example: !settings automod caps off",
        });

      return message.reply({ embeds: [embed], failIfNotExists: false });
    }

    const setting = args[0].toLowerCase();
    const rawValue = args.slice(1).join(" ");
    const value = rawValue.trim();

    try {
      if (setting === "prefix") {
        if (!value) {
          return message.reply({ content: "Use `!settings prefix <value>`", failIfNotExists: false });
        }
        updateSettings(message.guild.id, { prefix: value });
        return message.reply({
          content: `✅ Prefix set to \`${value}\``,
          failIfNotExists: false,
        });
      }

      if (setting === "automod") {
        const featureArg = args[1]?.toLowerCase();
        const featureToggle = args[2] ? parseToggleValue(args[2]) : parseToggleValue(args[1]);

        if (featureArg && ["on", "off", "enable", "disable", "true", "false"].includes(featureArg)) {
          const toggle = parseToggleValue(featureArg);
          updateSettings(message.guild.id, { automod: { enabled: toggle } });
          return message.reply({
            content: `✅ Automod ${toggle ? "enabled" : "disabled"}`,
            failIfNotExists: false,
          });
        }

        if (featureArg && args[2]) {
          const feature = normalizeAutomodFeature(featureArg);
          const toggle = parseToggleValue(args[2]);
          if (!feature || toggle === null) {
            return message.reply({
              content: "Use `!settings automod <spam|phishing|invites|caps|massmention> <on|off>`",
              failIfNotExists: false,
            });
          }

          const updates = { automod: { enabled: settings.automod.enabled } };
          if (feature === "all") {
            updates.automod = {
              enabled: true,
              spam: toggle,
              phishing: toggle,
              invites: toggle,
              caps: toggle,
              massMention: toggle,
            };
          } else {
            updates.automod[feature] = toggle;
          }
          updateSettings(message.guild.id, updates);
          return message.reply({
            content: `✅ Automod ${feature === "all" ? "all filters" : feature} ${toggle ? "enabled" : "disabled"}`,
            failIfNotExists: false,
          });
        }

        const toggle = parseToggleValue(value);
        if (toggle !== null) {
          updateSettings(message.guild.id, { automod: { enabled: toggle } });
          return message.reply({
            content: `✅ Automod ${toggle ? "enabled" : "disabled"}`,
            failIfNotExists: false,
          });
        }

        return message.reply({
          content: "Use `!settings automod <on|off>` or `!settings automod <spam|phishing|invites|caps|massmention> <on|off>`",
          failIfNotExists: false,
        });
      }

      if (["caps", "links", "invites", "invite", "spam", "phishing", "massmention", "mass-mention", "mass_mention"].includes(setting)) {
        const feature = normalizeAutomodFeature(setting);
        const toggle = parseToggleValue(value);
        if (toggle === null) {
          return message.reply({
            content: `Use \`!settings ${setting} <on|off>\``,
            failIfNotExists: false,
          });
        }

        updateSettings(message.guild.id, { automod: { [feature === "invites" ? "invites" : feature]: toggle } });
        return message.reply({
          content: `✅ ${feature === "massMention" ? "Mass mention" : feature === "invites" ? "Invite" : feature.charAt(0).toUpperCase() + feature.slice(1)} filter ${toggle ? "enabled" : "disabled"}`,
          failIfNotExists: false,
        });
      }

      if (setting === "welcome") {
        const toggle = parseToggleValue(value);
        if (toggle === null) {
          return message.reply({ content: "Use `!settings welcome <on|off>`", failIfNotExists: false });
        }
        updateSettings(message.guild.id, { welcome: { enabled: toggle } });
        return message.reply({
          content: `✅ Welcome messages ${toggle ? "enabled" : "disabled"}`,
          failIfNotExists: false,
        });
      }

      if (setting === "goodbye") {
        const toggle = parseToggleValue(value);
        if (toggle === null) {
          return message.reply({ content: "Use `!settings goodbye <on|off>`", failIfNotExists: false });
        }
        updateSettings(message.guild.id, { goodbye: { enabled: toggle } });
        return message.reply({
          content: `✅ Goodbye messages ${toggle ? "enabled" : "disabled"}`,
          failIfNotExists: false,
        });
      }

      if (setting === "autorole") {
        const toggle = parseToggleValue(value);
        if (toggle === null) {
          return message.reply({ content: "Use `!settings autorole <on|off>`", failIfNotExists: false });
        }
        updateSettings(message.guild.id, { autorole: { enabled: toggle } });
        return message.reply({
          content: `✅ Autorole ${toggle ? "enabled" : "disabled"}`,
          failIfNotExists: false,
        });
      }

      return message.reply({
        content: "Unknown setting. Available: `prefix`, `automod`, `welcome`, `goodbye`, `autorole`, and selective automod filters like `caps`, `invites`, `spam`, `phishing`.",
        failIfNotExists: false,
      });
    } catch (error) {
      console.error("[Settings Command Error]", error);
      message.reply({ content: "Error updating settings.", failIfNotExists: false });
    }
  },
};
