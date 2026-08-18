require("dotenv").config();

// Centralized configuration with lightweight validation and Lavalink nodes parsing.
const DEFAULT_PREFIX = process.env.PREFIX || "!";

function parseNodes() {
  const raw = process.env.LAVALINK_NODES || process.env.LAVALINK_NODES_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((n) => ({
      name: n.name || n.id || n.host || "node",
      url: n.url || n.host || n.address,
      auth: n.auth || n.password || n.token || "youshallnotpass",
      secure: typeof n.secure === "boolean" ? n.secure : !!n.secure,
      retryAmount: Number(n.retryAmount || 50),
      retryDelay: Number(n.retryDelay || 3000),
    }));
  } catch (err) {
    console.warn("[config] LAVALINK_NODES JSON parse failed:", err.message);
    return [];
  }
}

const ownerIds = (process.env.OWNER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const config = {
  token: process.env.DISCORD_TOKEN || "",
  prefix: DEFAULT_PREFIX,
  ownerIds,
  automod: {
    enabled: process.env.AUTOMOD_ENABLED !== "false",
    maxMentions: Number(process.env.AUTOMOD_MAX_MENTIONS || 4),
    capsThreshold: Number(process.env.AUTOMOD_CAPS_THRESHOLD || 70),
    inviteLinks: process.env.AUTOMOD_INVITES !== "false",
  },
  antiRaid: {
    threshold: Number(process.env.ANTI_RAID_THRESHOLD || 8),
    windowMs: Number(process.env.ANTI_RAID_WINDOW_MS || 60000),
  },
  antiNuke: {
    deleteWindowMs: Number(process.env.ANTI_NUKE_WINDOW_MS || 15000),
  },
  // Lavalink / audio nodes - provide via JSON in LAVALINK_NODES env (array)
  nodes: parseNodes(),
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
  },
  mongoUri: process.env.MONGO_URI || process.env.DATABASE_URL || "",
  // Lightweight runtime validation - call validate() at startup
  validate() {
    if (!this.token) {
      console.error("[config] Missing DISCORD_TOKEN in environment (.env).");
      process.exit(1);
    }
    // Spotify is optional; warn if partial config provided
    if ((this.spotify.clientId && !this.spotify.clientSecret) || (!this.spotify.clientId && this.spotify.clientSecret)) {
      console.warn("[config] Partial Spotify credentials provided; Spotify searches may fail.");
    }
    return true;
  },
};

module.exports = config;
