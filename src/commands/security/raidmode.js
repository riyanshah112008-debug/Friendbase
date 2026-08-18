module.exports = {
  name: "raidmode",
  category: "Security",
  description: "Toggle server-wide raid protection.",
  usage: "raidmode [on|off]",
  permissions: ["Administrator"],
  async execute(message, args, client) {
    const mode = (args[0] || "on").toLowerCase();
    const security = client.security.get(message.guild.id) || { raidMode: false, antiNuke: true };

    security.raidMode = mode === "on";
    client.security.set(message.guild.id, security);

    message.reply(`✅ Raid mode is now ${security.raidMode ? "enabled" : "disabled"}.`);
  },
};
