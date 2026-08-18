const fs = require("fs");
const path = require("path");

function loadEvents(client) {
  const eventsDir = path.join(__dirname, "../events");

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;

      const event = require(fullPath);
      if (!event || !event.name) continue;

      console.log(`[EventLoader] Loaded event: ${event.name}`);

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    }
  }

  if (fs.existsSync(eventsDir)) {
    walk(eventsDir);
  }
}

module.exports = { loadEvents };
