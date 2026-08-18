const { ensureSingleInstance } = require("./singleInstance");
const client = require("./client");
const config = require("./config");
// Validate required configuration and exit with helpful message when missing.
try {
  config.validate();
} catch (err) {
  console.error("[config] Validation failed:", err && err.message ? err.message : err);
  process.exit(1);
}
const { loadCommands } = require("./handlers/commandLoader");
const { loadEvents } = require("./handlers/eventLoader");
const { loadSlashCommands } = require("./handlers/slashCommandLoader");
const { initializeDatabase } = require("./utils/database");
const initializeStarry = require("./modules/starry");
const db = require("./utils/database");
const { Connectors } = require("shoukaku");
const { Kazagumo } = require("kazagumo");
const KazagumoSpotify = require("kazagumo-spotify");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, Events } = require("discord.js");

ensureSingleInstance();

// Basic process-level handlers to improve reliability and make failures visible.
process.on("unhandledRejection", (reason, promise) => {
  try {
    console.error("[unhandledRejection]", reason instanceof Error ? reason.stack || reason.message : reason);
  } catch (e) {
    /* ignore logging error */
  }
});
process.on("uncaughtException", (err) => {
  try {
    console.error("[uncaughtException]", err && (err.stack || err.message) ? err.stack || err.message : err);
  } catch (e) {
    /* ignore */
  }
});
process.on("SIGINT", async () => {
  console.info("SIGINT received, shutting down gracefully...");
  try {
    if (client && typeof client.destroy === "function") await client.destroy();
  } catch (e) {
    // ignore
  }
  process.exit(0);
});

if (!config.token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

// Prefer nodes from configuration (LAVALINK_NODES env JSON). If none provided, fall back to safe default nodes
const DEFAULT_NODES = [
  {
    name: "Node-1-Jirayu-Primary",
    url: "lavalink.jirayu.net:13592",
    auth: "youshallnotpass",
    secure: false,
    retryAmount: 50,
    retryDelay: 3000,
  },
  {
    name: "Node-2-NyxBot-SG",
    url: "sg1-nodelink.nyxbot.app:3000",
    auth: "nyxbot.app/support",
    secure: false,
    retryAmount: 50,
    retryDelay: 3000,
  },
  {
    name: "Node-3-AjieDev-v4",
    url: "lava-v4.ajieblogs.eu.org:443",
    auth: "https://dsc.gg/ajidevserver",
    secure: true,
    retryAmount: 50,
    retryDelay: 3000,
  },
  {
    name: "Node-4-Lavalink-PPA",
    url: "lavalink.muy5.tech:443",
    auth: "youshallnotpass",
    secure: true,
    retryAmount: 50,
    retryDelay: 3000,
  },
  {
    name: "Node-5-G3V-UK",
    url: "lava.g3v.co.uk:9008",
    auth: "lavalinklol",
    secure: false,
    retryAmount: 50,
    retryDelay: 3000,
  },
  {
    name: "Node-6-Serenetia-v4",
    url: "lavalinkv4.serenetia.com:80",
    auth: "https://seretia.link/discord",
    secure: false,
    retryAmount: 50,
    retryDelay: 3000,
  },
];

const Nodes = (config.nodes && config.nodes.length) ? config.nodes : DEFAULT_NODES;
if (!config.nodes || !config.nodes.length) {
  console.warn('[Lavalink] No LAVALINK_NODES provided via env; using repository fallback nodes. For production, set LAVALINK_NODES as JSON in .env.');
}

client.setMaxListeners(50);
client.voiceCalls = new Map();
client.vcLocks = new Map();
client.verifyMap = new Map();
// Track the active "now playing" message per guild so we edit instead of spamming
client.nowPlaying = new Map();

client.manager = new Kazagumo(
  {
    defaultSearchEngine: "spotify",
    searchFallbacks: {
      spotify: "spsearch",
      soundcloud: "scsearch",
      youtube: "ytsearch",
    },
    plugins: [
      new KazagumoSpotify({
        clientId: process.env.SPOTIFY_CLIENT_ID || "dummy_id",
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "dummy_secret",
        playlistPageLimit: 3,
        albumPageLimit: 2,
        searchMarket: "IN",
        searchPrefix: "ytsearch:",
      }),
    ],
    send: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) guild.shard.send(payload);
    },
  },
  new Connectors.DiscordJS(client),
  Nodes,
  {
    moveOnDisconnect: true,
    resume: true,
    resumeTimeout: 60,
    reconnectTries: 50,
    reconnectInterval: 3000,
    restTimeout: 10000,
    voiceConnectionTimeout: 15000,
    linkInitializers: true,
    nodeResolver: (nodes) => {
      const readyNodes = Array.from(nodes.values()).filter((node) => node.state === 1);
      if (!readyNodes.length) return null;
      return readyNodes.reduce((prev, current) => {
        const prevLoad = prev.stats?.cpu?.lavalinkLoad || 0;
        const currentLoad = current.stats?.cpu?.lavalinkLoad || 0;
        return prevLoad < currentLoad ? prev : current;
      });
    },
  }
);

client.manager.shoukaku.on("ready", (name) => {
  console.log(`[Lavalink] ✅ Node connected: ${name}`);
});

client.manager.shoukaku.on("error", (name, error) => {
  console.warn(`[Lavalink] ⚠️ Node [${name}] error: ${error?.message || error}`);
});

function applyAudioEnhancement(player) {
  const audioTarget = player?.shoukaku || player;
  if (!audioTarget || typeof audioTarget.setFilters !== "function") return;

  try {
    audioTarget.setFilters({
      volume: 1.5,
      equalizer: [
        { band: 0, gain: 0.6 },   // 20 Hz - DEEP BASS
        { band: 1, gain: 0.55 },  // 61 Hz - STRONG BASS
        { band: 2, gain: 0.35 },  // 183 Hz - bass-mid
        { band: 3, gain: 0.18 },  // 539 Hz - mid-bass
        { band: 4, gain: 0.08 },  // 1.6 kHz - lower mid
        { band: 5, gain: 0.0 },   // 4.8 kHz - mid
        { band: 6, gain: -0.08 }, // 14.5 kHz - presence (reduce harshness)
        { band: 7, gain: 0.05 },  // upper mid
        { band: 8, gain: 0.08 },  // presence peak
        { band: 9, gain: 0.05 },  // mid treble
        { band: 10, gain: 0.02 }, // treble
        { band: 11, gain: 0.0 },  // high treble
        { band: 12, gain: 0.0 },  // treble
        { band: 13, gain: 0.0 },  // treble
        { band: 14, gain: 0.0 }   // ultra high
      ],
      timescale: { speed: 1.0, pitch: 1.0, rate: 1.0 },
      lowPass: { smoothing: 20 }
    });
  } catch (error) {
    console.warn("[Music] Could not apply filters:", error.message);
  }
}

let playerStartRegistered = false;
function setupPlayerStartListener() {
  if (playerStartRegistered) return;
  playerStartRegistered = true;

  client.manager.on("playerStart", async (player, track) => {
    try {
      if (!player || !track) return;

      const channel = client.channels.cache.get(player.textId);
      const guild = client.guilds.cache.get(player.guildId);
      if (!channel || !guild) return;

      applyAudioEnhancement(player);
      // persist simplified queue snapshot for recovery
      try {
        const simplified = player.queue.map(t => ({ title: t.title || t.info?.title, uri: t.uri || t.info?.uri, author: t.author || t.info?.author, length: t.length || t.info?.length, thumbnail: t.thumbnail || t.info?.thumbnail, requester: (t.requester && t.requester.id) || (t.info?.requester?.id) || null }));
        db.saveMusicQueue(player.guildId, simplified);
      } catch (e) { /* non-fatal */ }

      const formatTime = (ms) => {
        if (!ms) return "0:00";
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, "0")}`;
      };

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🎵 Now Playing")
        .setDescription(`**${track.title}**`)
        .addFields(
          { name: "Artist", value: track.author || "Unknown", inline: true },
          { name: "Duration", value: track.isStream ? "🔴 LIVE" : formatTime(track.length), inline: true },
          { name: "Requested By", value: track.requester ? `<@${track.requester.id}>` : "Unknown", inline: true }
        )
        .setThumbnail(track.thumbnail || "https://i.imgur.com/8QJ8zuz.png")
        .setFooter({ text: "Friendbase Music Player" });

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("music_pause").setLabel("Pause/Resume").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("music_skip").setLabel("Skip").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("music_stop").setLabel("Stop").setStyle(ButtonStyle.Danger)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("dj_vol_down").setLabel("-10%").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("dj_vol_up").setLabel("+10%").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("dj_lock").setLabel("Lock VC").setStyle(ButtonStyle.Success)
      );

      const filterRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("music_bassboost").setLabel("Bass+").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("music_clearfilters").setLabel("Clear").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("music_nightcore").setLabel("Nightcore").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("music_vaporwave").setLabel("Vapor").setStyle(ButtonStyle.Secondary)
      );

      const filterDropdown = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("music_filter_select")
          .setPlaceholder("🎧 Audio features")
          .addOptions(
            { label: "Bass Boost", value: "bassboost", description: "Add stronger low-end punch", emoji: "🎸" },
            { label: "Nightcore", value: "nightcore", description: "Faster brighter sound", emoji: "✨" },
            { label: "Vaporwave", value: "vaporwave", description: "Retro lo-fi mix", emoji: "🪩" },
            { label: "Clear Filters", value: "clearfilters", description: "Reset all audio filters", emoji: "🚫" }
          )
      );

      // If there's an existing now-playing message for this guild, attempt to edit it instead of sending a new one.
      const existingId = client.nowPlaying.get(player.guildId);
      if (existingId) {
        try {
          const existingMsg = await channel.messages.fetch(existingId).catch(() => null);
          if (existingMsg) {
            await existingMsg.edit({ embeds: [embed], components: [row1, row2, filterRow, filterDropdown] }).catch(() => null);
            client.nowPlaying.set(player.guildId, existingMsg.id);
            return;
          }
        } catch (err) {
          // if editing fails, fall through to sending a fresh message
        }
      }

      const sent = await channel.send({ embeds: [embed], components: [row1, row2, filterRow, filterDropdown] }).catch(() => null);
      if (sent) client.nowPlaying.set(player.guildId, sent.id);
    } catch (error) {
      console.warn("[Music] playerStart handler error:", error);
    }
  });
}

setupPlayerStartListener();

initializeDatabase();
loadCommands();
loadEvents(client);
initializeStarry(client);

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  // Register slash commands when the bot is ready
  loadSlashCommands(client, config).catch(() => null);
});

client.login(config.token);
