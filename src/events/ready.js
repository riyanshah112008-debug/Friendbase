const config = require("../config");

module.exports = {
  name: "ready",
  once: true,
  async execute(...args) {
    // eventLoader will append client as last arg when calling execute(...args, client)
    // Accept flexible params to be resilient: last param should be client
    const client = args[args.length - 1];
    if (!client || !client.user) return;
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Loaded commands: ${client.commands.size}`);
    try {
      client.user.setPresence({
        activities: [{ name: `${config.prefix}help • Friendbase`, type: 0 }],
        status: "online",
      });
    } catch (e) {
      // ignore presence errors
    }
  },
};
