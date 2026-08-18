const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User],
});

client.player = null;
client.commands = new Collection();
client.cooldowns = new Map();
client.security = new Map();
client.warns = new Map();
client.musicStatus = new Map();

// Manager-bot Features Collections
client.prefixCommands = new Collection();
client.verifyMap = new Map();
client.voiceCalls = new Map();
client.vcLocks = new Map();
client.afkUsers = new Map();
client.ticketSessions = new Map();
client.levelingCache = new Map();
client.giveawayCache = new Map();
client.countingCache = new Map();
client.petCache = new Map();
client.reactionRolesCache = new Map();
client.confessionQueue = new Map();
client.truthOrDareCache = new Map();
client.trackerCache = new Map();

module.exports = client;
