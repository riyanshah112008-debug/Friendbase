const fs = require("fs");
const path = require("path");
const { REST, Routes, PermissionFlagsBits } = require("discord.js");

const permissionMap = {
  Administrator: PermissionFlagsBits.Administrator,
  BanMembers: PermissionFlagsBits.BanMembers,
  KickMembers: PermissionFlagsBits.KickMembers,
  ManageMessages: PermissionFlagsBits.ManageMessages,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  ModerateMembers: PermissionFlagsBits.ModerateMembers,
  MoveMembers: PermissionFlagsBits.MoveMembers,
};

async function loadSlashCommands(client, config) {
  const commands = [];
  const seen = new Set();
  const commandsDir = path.join(__dirname, "../commands");

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;

      const command = require(fullPath);
      const commandName = command?.name || command?.data?.name;
      if (!command || !commandName || seen.has(commandName)) continue;

      if (command.slash !== false && command.data) {
        seen.add(commandName);
        commands.push({
          name: command.data.name,
          description: command.data.description || "No description.",
          options: command.data.options?.length ? command.data.options.map((option) => option.toJSON()) : [],
          default_member_permissions: null,
        });
      } else if (command.slash !== false) {
        seen.add(commandName);
        const bitmask = command.permissions
          ? command.permissions.reduce((total, perm) => total | (permissionMap[perm] ?? 0n), 0n)
          : null;

        commands.push({
          name: command.name,
          description: command.description || "No description.",
          options: command.options || [],
          default_member_permissions: bitmask !== null ? String(bitmask) : null,
        });
      }
    }
  }

  if (fs.existsSync(commandsDir)) {
    walk(commandsDir);
  }

  // Register slash commands with Discord
  if (commands.length > 0 && config.token) {
    try {
      const rest = new REST({ version: "10" }).setToken(config.token);
      
      console.log(`[SlashCommands] Registering ${commands.length} slash commands...`);
      
      // Use guild commands for testing (instant), global for production
      const guildId = process.env.GUILD_ID; // Add to .env for testing
      
      try {
        if (guildId) {
          await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands });
          console.log(`[SlashCommands] ✅ Registered to guild ${guildId}`);
        } else {
          await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
          console.log(`[SlashCommands] ✅ Registered globally (may take 1 hour)`);
        }
      } catch (guildError) {
        // If guild registration fails, fall back to global
        if (guildId) {
          console.warn(`[SlashCommands] Guild registration failed, trying global...`);
          await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
          console.log(`[SlashCommands] ✅ Registered globally`);
        } else {
          throw guildError;
        }
      }
    } catch (error) {
      console.warn("[SlashCommands] Could not register slash commands:", error.message);
      console.log("[SlashCommands] Bot will work with prefix commands. Use prefix commands for now.");
    }
  }

  return commands;
}

module.exports = { loadSlashCommands };
