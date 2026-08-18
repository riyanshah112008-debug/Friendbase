const fs = require("fs");
const path = require("path");

const XP_FILE = path.join(__dirname, "../data/xp.json");
const DATA_DIR = path.join(__dirname, "../data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadXP() {
  if (fs.existsSync(XP_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(XP_FILE, "utf8")) || {};
    } catch {
      return {};
    }
  }
  return {};
}

function saveXP(xp) {
  fs.writeFileSync(XP_FILE, JSON.stringify(xp, null, 2));
}

function getLevel(xp) {
  return Math.floor(xp / 100);
}

function getXPToNextLevel(xp) {
  const currentLevel = getLevel(xp);
  const nextLevelXP = (currentLevel + 1) * 100;
  return nextLevelXP - xp;
}

function addXP(guildId, userId, amount = 1) {
  const xpData = loadXP();
  const key = `${guildId}_${userId}`;

  if (!xpData[key]) {
    xpData[key] = 0;
  }

  const oldLevel = getLevel(xpData[key]);
  xpData[key] += amount;
  const newLevel = getLevel(xpData[key]);

  saveXP(xpData);

  return {
    xp: xpData[key],
    level: newLevel,
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
  };
}

function getXP(guildId, userId) {
  const xpData = loadXP();
  const key = `${guildId}_${userId}`;
  return xpData[key] || 0;
}

function getLeaderboard(guildId, limit = 10) {
  const xpData = loadXP();
  return Object.entries(xpData)
    .filter(([key]) => key.startsWith(guildId))
    .map(([key, xp]) => {
      const userId = key.split("_")[1];
      return {
        userId,
        xp,
        level: getLevel(xp),
      };
    })
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

function getUserRank(guildId, userId) {
  const leaderboard = getLeaderboard(guildId, 1000);
  return leaderboard.findIndex((u) => u.userId === userId) + 1 || null;
}

module.exports = {
  addXP,
  getXP,
  getLevel,
  getXPToNextLevel,
  getLeaderboard,
  getUserRank,
};
