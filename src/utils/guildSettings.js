const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = path.join(__dirname, "../data/guildSettings.json");
const DATA_DIR = path.join(__dirname, "../data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_SETTINGS = {
  prefix: "!",
  automod: {
    enabled: true,
    spam: true,
    phishing: true,
    invites: true,
    caps: true,
    massMention: true,
  },
  welcome: {
    enabled: false,
    channel: null,
    message: "Welcome to {server}, {user}! Make sure to check the rules and introduce yourself.",
  },
  goodbye: {
    enabled: false,
    channel: null,
    message: "{user} has left the server.",
  },
  autorole: {
    enabled: false,
    roleId: null,
  },
  announcements: {
    channel: null,
  },
};

function deepMerge(base, incoming) {
  if (!incoming || typeof incoming !== "object") return base;
  const merged = Array.isArray(base) ? [...base] : { ...(base || {}) };

  Object.keys(incoming).forEach((key) => {
    const value = incoming[key];
    const current = merged[key];
    if (value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object" && !Array.isArray(current)) {
      merged[key] = deepMerge(current, value);
    } else {
      merged[key] = value;
    }
  });

  return merged;
}

function normalizeSettings(settings = {}) {
  return deepMerge(DEFAULT_SETTINGS, settings);
}

function loadSettings() {
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }
  return {};
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function getSettings(guildId) {
  const settings = loadSettings();
  const current = settings[guildId] || {};
  const normalized = normalizeSettings(current);
  settings[guildId] = normalized;
  saveSettings(settings);
  return normalized;
}

function updateSettings(guildId, updates) {
  const settings = loadSettings();
  const current = normalizeSettings(settings[guildId] || {});
  settings[guildId] = deepMerge(current, updates);
  saveSettings(settings);
  return settings[guildId];
}

function isFeatureEnabled(guildId, feature, fallback = true) {
  const settings = getSettings(guildId);
  const value = settings?.[feature];
  if (typeof value === "boolean") return value;
  return fallback;
}

function getAutomodSettings(guildId) {
  const settings = getSettings(guildId);
  const automod = settings.automod || {};

  return {
    enabled: typeof automod.enabled === "boolean" ? automod.enabled : DEFAULT_SETTINGS.automod.enabled,
    spam: typeof automod.spam === "boolean" ? automod.spam : DEFAULT_SETTINGS.automod.spam,
    phishing: typeof automod.phishing === "boolean" ? automod.phishing : DEFAULT_SETTINGS.automod.phishing,
    invites: typeof automod.invites === "boolean" ? automod.invites : DEFAULT_SETTINGS.automod.invites,
    caps: typeof automod.caps === "boolean" ? automod.caps : DEFAULT_SETTINGS.automod.caps,
    massMention: typeof automod.massMention === "boolean" ? automod.massMention : DEFAULT_SETTINGS.automod.massMention,
    links: typeof automod.invites === "boolean" ? automod.invites : DEFAULT_SETTINGS.automod.invites,
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettings,
  updateSettings,
  isFeatureEnabled,
  getAutomodSettings,
};
