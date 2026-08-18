// Enhanced Automod Detection

const PHISHING_PATTERNS = [
  /(?:bit\.ly|tinyurl|short\.link|discord\.gg|airdrop|giveaway|nitro|free)/gi,
  /\b(?:verify|confirm|login|update|claim|withdraw|deposit)\b.*(?:account|wallet|fund)/gi,
];

const SPAM_THRESHOLD = 5; // Messages
const SPAM_TIME_WINDOW = 10000; // 10 seconds

const userMessages = new Map();

function trackMessage(userId) {
  if (!userMessages.has(userId)) {
    userMessages.set(userId, []);
  }

  const messages = userMessages.get(userId);
  messages.push(Date.now());

  // Clean old messages
  const now = Date.now();
  const filtered = messages.filter((m) => now - m < SPAM_TIME_WINDOW);
  userMessages.set(userId, filtered);

  return filtered.length;
}

function isSpam(userId) {
  const messages = userMessages.get(userId) || [];
  return messages.length >= SPAM_THRESHOLD;
}

function isMassmention(content) {
  const mentions = (content.match(/<@!?\d+>/g) || []).length;
  return mentions >= 5;
}

function isPhishing(content) {
  return PHISHING_PATTERNS.some((pattern) => pattern.test(content));
}

function hasExcessiveCaps(content) {
  if (content.length < 5) return false;
  const caps = (content.match(/[A-Z]/g) || []).length;
  const percentage = (caps / content.length) * 100;
  return percentage > 70;
}

function hasInviteLink(content) {
  return /discord\.gg\/|discordapp\.com\/invite\//gi.test(content);
}

module.exports = {
  trackMessage,
  isSpam,
  isMassmention,
  isPhishing,
  hasExcessiveCaps,
  hasInviteLink,
  SPAM_THRESHOLD,
  SPAM_TIME_WINDOW,
};
