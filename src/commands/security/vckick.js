module.exports = {
  name: "vckick",
  category: "Security",
  description: "Disconnect all members from a voice channel.",
  usage: "vckick [channelId]",
  permissions: ["MoveMembers"],
  async execute(message, args, client) {
    const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.member.voice.channel;
    if (!targetChannel || !targetChannel.isVoiceBased()) {
      return message.reply("Please join a voice channel or provide a valid voice channel.");
    }

    const members = targetChannel.members;
    if (members.size === 0) return message.reply("No members are currently in that voice channel.");

    for (const member of members.values()) {
      await member.voice.disconnect("Voice channel was force-kicked by moderation.").catch(() => null);
    }

    message.reply(`✅ Kicked ${members.size} members from ${targetChannel.name}.`);
  },
};
