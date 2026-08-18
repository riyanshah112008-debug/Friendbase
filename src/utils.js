function getUserMention(user) {
  if (!user) return "Unknown user";
  if (typeof user === "string") return user;
  return user.tag || user.username || user.id || "Unknown user";
}

function chunkArray(items, size) {
  const arr = Array.from(items);
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

module.exports = {
  getUserMention,
  chunkArray,
};
