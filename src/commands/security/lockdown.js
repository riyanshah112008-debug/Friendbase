module.exports = {
  name: "lockdown",
  category: "Security",
  description: "Lock or unlock all channels in a server.",
  usage: "lockdown [on|off]",
  permissions: ["ManageChannels"],
  async execute(message, args, client) {
    const mode = (args[0] || "on").toLowerCase();
    const channels = message.guild.channels.cache.filter((channel) => channel.isTextBased && !channel.permissionsFor(message.guild.roles.everyone).has("SendMessages"));

    if (mode === "off") {
      for (const channel of channels.values()) {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true }).catch(() => null);
      }
      return message.reply("✅ Lockdown disabled. Messages are open again.");
    }

    for (const channel of message.guild.channels.cache.values()) {
      if (channel.isTextBased()) {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }).catch(() => null);
      }
    }

    message.reply("🚨 Lockdown enabled. All channels have been locked.");
  },
};
