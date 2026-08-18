const fs = require("fs");
const path = require("path");

const WARNINGS_FILE = path.join(__dirname, "../data/warnings.json");
const DATA_DIR = path.join(__dirname, "../data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadWarnings() {
  if (fs.existsSync(WARNINGS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(WARNINGS_FILE, "utf8")) || {};
    } catch {
      return {};
    }
  }
  return {};
}

function saveWarnings(warnings) {
  fs.writeFileSync(WARNINGS_FILE, JSON.stringify(warnings, null, 2));
}

function addWarning(guildId, userId, modId, reason) {
  const warnings = loadWarnings();
  const key = `${guildId}_${userId}`;
  
  if (!warnings[key]) {
    warnings[key] = [];
  }

  warnings[key].push({
    timestamp: new Date().toISOString(),
    modId,
    reason,
  });

  saveWarnings(warnings);
  return warnings[key].length;
}

function getWarnings(guildId, userId) {
  const warnings = loadWarnings();
  const key = `${guildId}_${userId}`;
  return warnings[key] || [];
}

function clearWarnings(guildId, userId) {
  const warnings = loadWarnings();
  const key = `${guildId}_${userId}`;
  delete warnings[key];
  saveWarnings(warnings);
}

function removeWarning(guildId, userId, index) {
  const warnings = loadWarnings();
  const key = `${guildId}_${userId}`;
  if (warnings[key] && warnings[key][index]) {
    warnings[key].splice(index, 1);
    saveWarnings(warnings);
    return true;
  }
  return false;
}

module.exports = {
  addWarning,
  getWarnings,
  clearWarnings,
  removeWarning,
};
