const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const FRIENDBASE_EMBED_THEME = {
  cyan: 0x4fd1ff,
  violet: 0x8b5cf6,
  emerald: 0x57f287,
  amber: 0xfab61a,
  red: 0xed4245,
  slate: 0x0b1020,
};

function buildFriendbaseEmbed({
  title,
  description,
  accent = "cyan",
  authorName = "Friendbase // System",
  authorIcon,
  footerText = "Friendbase • Starry / Jarvis Interface",
  thumbnail,
  timestamp = true,
} = {}) {
  const color = FRIENDBASE_EMBED_THEME[accent] ?? FRIENDBASE_EMBED_THEME.cyan;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: authorName,
      iconURL: authorIcon || "https://cdn.discordapp.com/embed/avatars/0.png",
    })
    .setTitle(title || "Friendbase")
    .setDescription(description || "System online.")
    .setFooter({ text: footerText, iconURL: authorIcon || "https://cdn.discordapp.com/embed/avatars/1.png" });

  if (thumbnail) embed.setThumbnail(thumbnail);
  if (timestamp) embed.setTimestamp(new Date());

  return embed;
}

function createSetupEmbed(guildName = "this server") {
  return buildFriendbaseEmbed({
    title: "🤖 Friendbase Setup Wizard",
    description: `Welcome to **${guildName}**! Let’s get your server ready in minutes with a polished **Starry/Jarvis-style control panel**.`,
    accent: "violet",
    authorName: "Friendbase // Starry Control",
    footerText: "Friendbase • Server Setup",
  }).addFields(
    { name: "🎉 Welcome System", value: "Set a welcome channel and greeting message for new members.", inline: false },
    { name: "🛡️ Moderation", value: "Enable anti-raid, auto-moderation, and logging tools.", inline: false },
    { name: "🎵 Music", value: "Add DJ controls and music commands for voice channels.", inline: false },
    { name: "🔐 Verification", value: "Set up human verification and secure access flow.", inline: false },
    { name: "⚙️ Roles & Channels", value: "Create a starter role system and channel structure.", inline: false }
  );
}

function createSetupButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("setup:welcome").setLabel("Welcome").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("setup:moderation").setLabel("Moderation").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("setup:music").setLabel("Music").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("setup:verification").setLabel("Verification").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("setup:roles").setLabel("Roles").setStyle(ButtonStyle.Secondary)
  );
}

module.exports = { createSetupEmbed, createSetupButtons, buildFriendbaseEmbed, FRIENDBASE_EMBED_THEME };
