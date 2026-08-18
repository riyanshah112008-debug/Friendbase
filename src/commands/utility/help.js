const { EmbedBuilder } = require("discord.js");

const categoryEmojis = {
  Games: "🎮",
  Moderation: "🛡️",
  Music: "🎵",
  Security: "🔒",
  Utility: "⚙️",
};

module.exports = {
  name: "help",
  category: "Utility",
  description: "List available commands.",
  usage: "help [command]",
  async execute(message, args, client) {
    try {
      const commands = [...client.commands.values()];
      const query = args[0]?.toLowerCase();

      if (query) {
        const command = commands.find((cmd) => cmd.name === query || (cmd.aliases || []).includes(query));
        if (!command) return message.reply({ content: "That command doesn't exist.", failIfNotExists: false });

        const embed = new EmbedBuilder()
          .setTitle(`📖 Command: ${command.name}`)
          .setColor(0x7289da)
          .addFields(
            { name: "Description", value: command.description || "No description.", inline: false },
            { name: "Usage", value: `\`${command.usage || command.name}\``, inline: false },
            { name: "Category", value: command.category || "General", inline: true }
          )
          .setFooter({ text: "Friendbase • Command Help" });

        return await message.reply({ embeds: [embed], failIfNotExists: false });
      }

      const categories = new Map();
      for (const cmd of commands) {
        const category = cmd.category || "General";
        if (!categories.has(category)) categories.set(category, []);
        categories.get(category).push(cmd.name);
      }

      const fields = [];
      for (const [category, names] of categories.entries()) {
        const emoji = categoryEmojis[category] || "📌";
        fields.push({
          name: `${emoji} ${category}`,
          value: `\`${names.join("`, `")}\``,
          inline: false,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("📚 Friendbase Command List")
        .setDescription("Use `!help <command>` for more info on a specific command.")
        .setColor(0x7289da)
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .addFields(fields)
        .setFooter({ text: `Friendbase v1.0.0 • Total Commands: ${commands.length}` });

      return await message.reply({ embeds: [embed], failIfNotExists: false });
    } catch (error) {
      console.error("[Help Command Error]", error);
      try {
        await message.reply({ content: "Error loading help menu.", failIfNotExists: false });
      } catch (e) {
        console.error("[Help Reply Error]", e.message);
      }
    }
  },
};
