module.exports = {
  name: "rps",
  category: "Games",
  description: "Play rock-paper-scissors against the bot.",
  usage: "rps <rock|paper|scissors>",
  async execute(message, args, client) {
    const choices = ["rock", "paper", "scissors"];
    const userChoice = (args[0] || "").toLowerCase();
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    if (!choices.includes(userChoice)) {
      return message.reply("Choose one of: rock, paper, or scissors.");
    }

    const outcomes = {
      rock: { rock: "Draw", paper: "You lose", scissors: "You win" },
      paper: { rock: "You win", paper: "Draw", scissors: "You lose" },
      scissors: { rock: "You lose", paper: "You win", scissors: "Draw" },
    };

    const result = outcomes[userChoice][botChoice];
    message.reply(`✊ ${userChoice} vs ${botChoice} — ${result}!`);
  },
};
