module.exports = {
  name: "nuke",
  category: "Security",
  description: "Emergency destroy a channel and recreate it with the same permissions.",
  usage: "nuke",
  permissions: ["Administrator"],
  async execute(message, args, client) {
    const channel = message.channel;
    const parent = channel.parentId;
    const position = channel.position;
    const topic = channel.topic || null;
    const nsfw = channel.nsfw;
    const rateLimit = channel.rateLimitPerUser || 0;
    const permissionOverwrites = channel.permissionOverwrites.cache.map((overwrite) => ({
      id: overwrite.id,
      allow: overwrite.allow,
      deny: overwrite.deny,
      type: overwrite.type,
    }));

    const newChannel = await channel.clone({
      parent,
      position,
      topic,
      nsfw,
      rateLimitPerUser: rateLimit,
    });

    for (const overwrite of permissionOverwrites) {
      await newChannel.permissionOverwrites.edit(overwrite.id, {
        ViewChannel: overwrite.allow.has("ViewChannel"),
        SendMessages: overwrite.allow.has("SendMessages"),
        ReadMessageHistory: overwrite.allow.has("ReadMessageHistory"),
        AttachFiles: overwrite.allow.has("AttachFiles"),
      }).catch(() => null);
    }

    await channel.delete("Emergency nuke command used");
    await newChannel.send("🚨 Channel nuked and recreated by an administrator.");
  },
};
