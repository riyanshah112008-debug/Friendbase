const fs = require("fs");
const path = require("path");
const client = require("../client");
const config = require("../config");

function loadCommands() {
  const commandsDir = path.join(__dirname, "../commands");
  const loaded = [];
  const seen = new Set();

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

      seen.add(commandName);
      client.commands.set(commandName, command);
      loaded.push(commandName);
    }
  }

  if (fs.existsSync(commandsDir)) {
    walk(commandsDir);
  }

  return loaded;
}

module.exports = { loadCommands };
