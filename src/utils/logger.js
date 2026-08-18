const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.join(__dirname, "../logs");
const MOD_LOG_FILE = path.join(LOGS_DIR, "moderation.json");

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Load existing logs
function loadLogs() {
  if (fs.existsSync(MOD_LOG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(MOD_LOG_FILE, "utf8")) || [];
    } catch {
      return [];
    }
  }
  return [];
}

// Save logs to file
function saveLogs(logs) {
  fs.writeFileSync(MOD_LOG_FILE, JSON.stringify(logs, null, 2));
}

// Log a moderation action
function logAction(action, details) {
  const logs = loadLogs();
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    ...details,
  };
  logs.push(entry);
  saveLogs(logs);
  return entry;
}

// Get logs by type
function getLogsByAction(action, limit = 10) {
  const logs = loadLogs();
  return logs
    .filter((log) => log.action === action)
    .slice(-limit)
    .reverse();
}

// Get logs by user
function getLogsByUser(userId, limit = 10) {
  const logs = loadLogs();
  return logs
    .filter((log) => log.targetId === userId)
    .slice(-limit)
    .reverse();
}

// Get logs by moderator
function getLogsByModerator(modId, limit = 10) {
  const logs = loadLogs();
  return logs
    .filter((log) => log.moderatorId === modId)
    .slice(-limit)
    .reverse();
}

// Get recent logs
function getRecentLogs(limit = 20) {
  const logs = loadLogs();
  return logs.slice(-limit).reverse();
}

module.exports = {
  logAction,
  getLogsByAction,
  getLogsByUser,
  getLogsByModerator,
  getRecentLogs,
  loadLogs,
};
