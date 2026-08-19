const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "../data/friendbase.db");

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Create tables
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      warns INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Guild settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guildId TEXT PRIMARY KEY,
      prefix TEXT DEFAULT ',',
      automodEnabled BOOLEAN DEFAULT 1,
      welcomeEnabled BOOLEAN DEFAULT 0,
      welcomeChannel TEXT,
      goodbyeEnabled BOOLEAN DEFAULT 0,
      goodbyeChannel TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Guild user stats (per-server stats)
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_user_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      userId TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      warns INTEGER DEFAULT 0,
      UNIQUE(guildId, userId)
    )
  `);

  // Moderation logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS moderation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      action TEXT NOT NULL,
      targetId TEXT NOT NULL,
      targetTag TEXT,
      moderatorId TEXT NOT NULL,
      moderatorTag TEXT,
      reason TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Warnings
  db.exec(`
    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      userId TEXT NOT NULL,
      moderatorId TEXT NOT NULL,
      reason TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Music queues persistence (stores JSON of simplified track metadata)
  db.exec(`
    CREATE TABLE IF NOT EXISTS music_queues (
      guildId TEXT PRIMARY KEY,
      queueJson TEXT,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("[Database] ✅ Database initialized");
}

// Persist a simplified queue (array of serializable track metadata)
function saveMusicQueue(guildId, tracks) {
  try {
    const json = JSON.stringify(tracks || []);
    const stmt = db.prepare(`INSERT INTO music_queues (guildId, queueJson) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET queueJson = ?, updatedAt = CURRENT_TIMESTAMP`);
    stmt.run(guildId, json, json);
  } catch (e) {
    // non-fatal
    console.warn('[Database] Could not save music queue:', e.message);
  }
}

function loadMusicQueue(guildId) {
  try {
    const stmt = db.prepare('SELECT queueJson FROM music_queues WHERE guildId = ?');
    const row = stmt.get(guildId);
    if (!row || !row.queueJson) return [];
    return JSON.parse(row.queueJson);
  } catch (e) {
    console.warn('[Database] Could not load music queue:', e.message);
    return [];
  }
}

function clearMusicQueue(guildId) {
  try {
    const stmt = db.prepare('DELETE FROM music_queues WHERE guildId = ?');
    stmt.run(guildId);
  } catch (e) {
    // ignore
  }
}

function getUser(userId) {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  return stmt.get(userId);
}

function createOrUpdateUser(userId, username) {
  const existing = getUser(userId);
  if (existing) {
    const stmt = db.prepare("UPDATE users SET username = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?");
    stmt.run(username, userId);
    return getUser(userId);
  } else {
    const stmt = db.prepare("INSERT INTO users (id, username) VALUES (?, ?)");
    stmt.run(userId, username);
    return getUser(userId);
  }
}

function getGuildSettings(guildId) {
  const stmt = db.prepare("SELECT * FROM guild_settings WHERE guildId = ?");
  let settings = stmt.get(guildId);

  if (!settings) {
    const insert = db.prepare(
      "INSERT INTO guild_settings (guildId) VALUES (?)"
    );
    insert.run(guildId);
    settings = stmt.get(guildId);
  }

  return settings;
}

function updateGuildSettings(guildId, updates) {
  const keys = Object.keys(updates);
  const values = Object.values(updates);

  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const stmt = db.prepare(
    `UPDATE guild_settings SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE guildId = ?`
  );

  stmt.run(...values, guildId);
  return getGuildSettings(guildId);
}

function addGuildUserXP(guildId, userId, amount = 1) {
  const stmt = db.prepare(`
    INSERT INTO guild_user_stats (guildId, userId, xp, level) 
    VALUES (?, ?, ?, ?) 
    ON CONFLICT(guildId, userId) DO UPDATE SET xp = xp + ?
  `);

  stmt.run(guildId, userId, amount, 0, amount);

  // Recalculate level
  const getStmt = db.prepare(
    "SELECT xp FROM guild_user_stats WHERE guildId = ? AND userId = ?"
  );
  const row = getStmt.get(guildId, userId);
  const newLevel = Math.floor(row.xp / 100);

  const updateStmt = db.prepare(
    "UPDATE guild_user_stats SET level = ? WHERE guildId = ? AND userId = ?"
  );
  updateStmt.run(newLevel, guildId, userId);

  return { xp: row.xp, level: newLevel };
}

function getGuildUserStats(guildId, userId) {
  const stmt = db.prepare(
    "SELECT * FROM guild_user_stats WHERE guildId = ? AND userId = ?"
  );
  return stmt.get(guildId, userId) || { guildId, userId, xp: 0, level: 0, warns: 0 };
}

function getGuildLeaderboard(guildId, limit = 10) {
  const stmt = db.prepare(
    "SELECT userId, xp, level FROM guild_user_stats WHERE guildId = ? ORDER BY xp DESC LIMIT ?"
  );
  return stmt.all(guildId, limit);
}

function logModerationAction(guildId, action, targetId, targetTag, moderatorId, moderatorTag, reason = null) {
  const stmt = db.prepare(`
    INSERT INTO moderation_logs (guildId, action, targetId, targetTag, moderatorId, moderatorTag, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(guildId, action, targetId, targetTag, moderatorId, moderatorTag, reason);
}

function getModerationLogs(guildId, limit = 50) {
  const stmt = db.prepare(
    "SELECT * FROM moderation_logs WHERE guildId = ? ORDER BY timestamp DESC LIMIT ?"
  );
  return stmt.all(guildId, limit);
}

function addWarning(guildId, userId, moderatorId, reason) {
  const stmt = db.prepare(`
    INSERT INTO warnings (guildId, userId, moderatorId, reason)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(guildId, userId, moderatorId, reason);

  // Count warnings for this user
  const countStmt = db.prepare(
    "SELECT COUNT(*) as count FROM warnings WHERE guildId = ? AND userId = ?"
  );
  const result = countStmt.get(guildId, userId);
  return result.count;
}

function getUserWarnings(guildId, userId) {
  const stmt = db.prepare(
    "SELECT * FROM warnings WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC"
  );
  return stmt.all(guildId, userId);
}

function closeDatabase() {
  db.close();
}

module.exports = {
  initializeDatabase,
  getUser,
  createOrUpdateUser,
  getGuildSettings,
  updateGuildSettings,
  addGuildUserXP,
  getGuildUserStats,
  getGuildLeaderboard,
  logModerationAction,
  getModerationLogs,
  addWarning,
  getUserWarnings,
  closeDatabase,
  db,
  // Music queue helpers
  saveMusicQueue,
  loadMusicQueue,
  clearMusicQueue,
};
