module.exports = {
  name: "coinflip",
  category: "Games",
  description: "Flip a coin and get heads or tails.",
  usage: "coinflip",
  async execute(message, args, client) {
    const side = Math.random() < 0.5 ? "Heads" : "Tails";
    message.reply(`🪙 Coin flip: ${side}`);
  },
};
