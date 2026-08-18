const { EmbedBuilder, PermissionsBitField } = require("discord.js");

function parseDuration(value) {
  const match = /^([0-9]+)([smhdw])$/i.exec(String(value || ""));
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return amount * map[unit];
}

module.exports = {
  name: "giveaway",
  category: "Utility",
  aliases: ["gw"],
  description: "Create a quick giveaway in the current channel.",
  usage: "giveaway <duration> [winners] <prize>",
  permissions: ["Administrator"],
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply({
        content: "Usage: `!giveaway <duration> [winners] <prize>`\nExample: `!giveaway 1h 2 Nitro`",
        failIfNotExists: false,
      });
    }

    const durationMs = parseDuration(args[0]);
    if (!durationMs) {
      return message.reply({
        content: "Invalid duration. Use values like `10m`, `2h`, `1d`.",
        failIfNotExists: false,
      });
    }

    const winnerArg = Number(args[1]);
    const winners = Number.isFinite(winnerArg) && winnerArg > 0 ? Math.floor(winnerArg) : 1;
    const prize = (Number.isFinite(winnerArg) && winnerArg > 0 ? args.slice(2) : args.slice(1)).join(" ") || "Surprise prize";

    const endsAt = Date.now() + durationMs;
    const embed = new EmbedBuilder()
      .setColor(0xff66c4)
      .setTitle(`🎉 ${prize}`)
      .setDescription([
        "> React with 🎉 to join the giveaway!",
        "",
        `⏳ Ends: <t:${Math.floor(endsAt / 1000)}:R>`,
        `🏆 Winners: ${winners}`,
        `👑 Hosted by: <@${message.author.id}>`,
      ].join("\n"))
      .setFooter({ text: "Friendbase Giveaway" })
      .setTimestamp(new Date(endsAt));

    const giveawayMessage = await message.channel.send({ embeds: [embed] });
    await giveawayMessage.react("🎉").catch(() => null);

    const reaction = giveawayMessage.reactions.cache.get("🎉");
    const endMessage = await message.reply({
      content: `✅ Giveaway created in ${message.channel}.`,
      failIfNotExists: false,
    });

    setTimeout(async () => {
      try {
        if (!reaction) return;
        const users = await reaction.users.fetch();
        const entrants = [...users.values()].filter((user) => !user.bot);

        if (entrants.length === 0) {
          await giveawayMessage.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle(`🎉 ${prize}`)
                .setDescription("No valid entrants joined this giveaway.")
                .setFooter({ text: "Giveaway ended" })
                .setTimestamp(),
            ],
          });
          await giveawayMessage.channel.send({ content: `🎉 Giveaway ended for **${prize}** — no entries were received.` }).catch(() => null);
          return;
        }

        const shuffled = entrants.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, winners);
        const winnersText = selected.map((user) => `<@${user.id}>`).join(", ") || "No winner";

        await giveawayMessage.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle(`🎉 ${prize}`)
              .setDescription([`✅ Giveaway complete!`, "", `🏆 Winner(s): ${winnersText}`].join("\n"))
              .setFooter({ text: "Giveaway ended" })
              .setTimestamp(),
          ],
        });

        await giveawayMessage.channel.send({ content: `🎉 Congratulations ${winnersText}! You won **${prize}**.` }).catch(() => null);
      } catch (error) {
        console.error("[Giveaway Error]", error.message);
      }
    }, durationMs);

    return endMessage;
  },
};
