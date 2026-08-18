const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "ping",
  category: "Moderation",
  description: "Check bot latency.",
  usage: "ping",
  async execute(message, args, client) {
    const sent = await message.channel.send({ content: "Pinging...", failIfNotExists: false });
    const latency = sent.createdTimestamp - message.createdTimestamp;
    
    const embed = new EmbedBuilder()
      .setTitle("🏓 Pong!")
      .setColor(0x00ff00)
      .addFields(
        { name: "Message Latency", value: `${latency}ms`, inline: true },
        { name: "API Latency", value: `${Math.round(client.ws.ping)}ms`, inline: true }
      );

    await sent.edit({ embeds: [embed], content: "" });
  },
};
