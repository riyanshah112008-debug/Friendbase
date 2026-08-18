const config = require("../config");
const { trackMessage, isSpam, isMassmention, isPhishing, hasExcessiveCaps, hasInviteLink } = require("../utils/automod");
const { addGuildUserXP } = require("../utils/database");
const { getSettings, getAutomodSettings } = require("../utils/guildSettings");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const guildSettings = getSettings(message.guild.id);
    const prefix = guildSettings.prefix || config.prefix;
    const content = message.content || "";

    // Award XP for messages (even if automod is off)
    try {
      const result = addGuildUserXP(message.guild.id, message.author.id, 1);
      const oldLevel = Math.floor((result.xp - 1) / 100);
      const newLevel = result.level;
      
      if (newLevel > oldLevel) {
        try {
          await message.reply({
            content: `🎉 Congratulations ${message.author}! You reached **Level ${newLevel}**!`,
            failIfNotExists: false,
          });
        } catch (e) {
          console.error("Could not send level up message:", e.message);
        }
      }
    } catch (e) {
      console.error("XP tracking error:", e.message);
    }

    // Automod checks for non-command messages
    if (!content.startsWith(prefix)) {
      const automodSettings = getAutomodSettings(message.guild.id);
      if (!automodSettings.enabled) return;

      // Track spam
      const spamCount = trackMessage(message.author.id);
      if (automodSettings.spam && isSpam(message.author.id)) {
        try {
          await message.delete();
          await message.reply({ content: "🚫 Automod: Stop spamming!", failIfNotExists: false });
        } catch (e) {
          console.error("[Automod] Spam delete error:", e.message);
        }
        return;
      }

      // Check for mass mentions
      if (automodSettings.massMention && isMassmention(content)) {
        try {
          await message.delete();
          await message.reply({ content: "🚫 Automod: Don't mention spam!", failIfNotExists: false });
        } catch (e) {
          console.error("[Automod] Massmention delete error:", e.message);
        }
        return;
      }

      // Check for phishing links
      if (automodSettings.phishing && isPhishing(content)) {
        try {
          await message.delete();
          await message.reply({ content: "🚫 Automod: Suspicious link detected!", failIfNotExists: false });
        } catch (e) {
          console.error("[Automod] Phishing delete error:", e.message);
        }
        return;
      }

      // Check for excessive caps
      const uppercaseRatio = (content.match(/[A-Z]/g) || []).length / Math.max(content.length, 1);
      if (automodSettings.caps && uppercaseRatio > config.automod.capsThreshold / 100) {
        try {
          await message.delete();
          await message.reply({ content: "🚫 Automod: Please avoid excessive caps.", failIfNotExists: false });
        } catch (e) {
          console.error("[Automod] Caps delete error:", e.message);
        }
        return;
      }

      // Check for invite links
      if (automodSettings.invites && hasInviteLink(content)) {
        try {
          await message.delete();
          await message.reply({ content: "🚫 Automod: Discord invites are not allowed.", failIfNotExists: false });
        } catch (e) {
          console.error("[Automod] Invite delete error:", e.message);
        }
      }
      return;
    }

    // Command processing
    const args = content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    const command = client.commands.get(commandName) || [...client.commands.values()].find((cmd) => (cmd.aliases || []).includes(commandName));

    if (!command) return;

    const member = message.member;
    if (command.permissions && member && !member.permissions.has(command.permissions)) {
      return message.reply({ content: "You do not have permission to use this command.", failIfNotExists: false });
    }

    try {
      console.log(`[Command] Executing: ${commandName} by ${message.author.tag}`);

      const musicPrefixCommands = new Set(["play", "pause", "resume", "skip", "stop", "queue", "volume", "autoplay"]);
      if (musicPrefixCommands.has(commandName)) {
        const fakeInteraction = {
          guild: message.guild,
          member: message.member,
          user: message.author,
          channel: message.channel,
          client,
          reply: (payload) => message.reply(payload),
          deferReply: async () => undefined,
          editReply: (payload) => message.reply(payload),
          isChatInputCommand: () => false,
          options: {
            getString: (name, required = false) => {
              const raw = name === "song" ? args.join(" ") : undefined;
              if (!raw && required) throw new Error(`Missing required option: ${name}`);
              return raw || null;
            },
            getInteger: (name, required = false) => {
              const raw = name === "amount" ? Number(args[0]) : undefined;
              if (raw === undefined && required) throw new Error(`Missing required option: ${name}`);
              return raw ?? null;
            },
          },
        };
        return await command.execute(fakeInteraction, client);
      }

      await command.execute(message, args, client);
    } catch (error) {
      console.error(`[Error] Command ${commandName}:`, error.message);
      try {
        await message.reply({ content: `Something went wrong while running \`${command.name || commandName}\`.`, failIfNotExists: false });
      } catch (replyError) {
        console.error(`[Error] Could not send error reply:`, replyError.message);
      }
    }
  },
};
