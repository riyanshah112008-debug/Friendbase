const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { buildFriendbaseEmbed } = require('../utils/setupWizard');

async function applyAudioPreset(player, preset) {
  if (!player) return false;

  const audioTarget = player.shoukaku || player;
  if (!audioTarget) return false;

  const baseFilters = {
    volume: 1.5,
    equalizer: [
      { band: 0, gain: 0.6 },
      { band: 1, gain: 0.55 },
      { band: 2, gain: 0.35 },
      { band: 3, gain: 0.18 },
      { band: 4, gain: 0.08 },
      { band: 5, gain: 0.0 },
      { band: 6, gain: -0.08 },
      { band: 7, gain: 0.05 },
      { band: 8, gain: 0.08 },
      { band: 9, gain: 0.05 },
      { band: 10, gain: 0.02 },
      { band: 11, gain: 0.0 },
      { band: 12, gain: 0.0 },
      { band: 13, gain: 0.0 },
      { band: 14, gain: 0.0 }
    ],
    lowPass: { smoothing: 20 },
    timescale: { speed: 1.0, pitch: 1.0, rate: 1.0 }
  };

  switch (preset) {
    case 'bassboost':
      await audioTarget.setFilters({ ...baseFilters, volume: 1.8, equalizer: [
        { band: 0, gain: 0.8 }, { band: 1, gain: 0.75 }, { band: 2, gain: 0.5 }, { band: 3, gain: 0.25 }, { band: 4, gain: 0.1 },
        { band: 5, gain: 0.0 }, { band: 6, gain: -0.1 }, { band: 7, gain: 0.0 }, { band: 8, gain: 0.0 }, { band: 9, gain: 0.0 },
        { band: 10, gain: 0.0 }, { band: 11, gain: 0.0 }, { band: 12, gain: 0.0 }, { band: 13, gain: 0.0 }, { band: 14, gain: 0.0 }
      ] });
      return true;
    case 'nightcore':
      await audioTarget.setFilters({ ...baseFilters, timescale: { speed: 1.2, pitch: 1.2, rate: 1.0 } });
      return true;
    case 'vaporwave':
      await audioTarget.setFilters({ ...baseFilters, timescale: { speed: 0.85, pitch: 0.8, rate: 1.0 }, lowPass: { smoothing: 10 } });
      return true;
    case 'clearfilters':
      if (typeof audioTarget.clearFilters === 'function') {
        await audioTarget.clearFilters();
      } else if (typeof player.clearFilters === 'function') {
        await player.clearFilters();
      }
      return true;
    default:
      return false;
  }
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    // Helper: update the persistent now-playing embed message for this guild
    async function updateNowPlayingEmbed(guildId, player) {
      try {
        if (!player) return;
        const track = player.currentTrack || player.queue?.current || player.playingTrack || player.track;
        if (!track) return;
        const channel = client.channels.cache.get(player.textId);
        const msgId = client.nowPlaying.get(guildId);
        if (!channel || !msgId) return;
        const msg = await channel.messages.fetch(msgId).catch(() => null);
        if (!msg) return;

        const formatTime = (ms) => {
          if (!ms) return "0:00";
          const totalSeconds = Math.floor(ms / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          return `${minutes}:${String(seconds).padStart(2, "0")}`;
        };

        const embed = buildFriendbaseEmbed({
          title: '🎵 Now Playing',
          description: `**${track.title || track.info?.title || 'Unknown'}**`,
          accent: player.paused ? 'amber' : 'cyan',
          authorName: 'Friendbase // Jarvis Audio',
          footerText: 'Friendbase Music Player',
          thumbnail: track.thumbnail || track.info?.thumbnail || 'https://i.imgur.com/8QJ8zuz.png',
        }).addFields(
          { name: 'Artist', value: track.author || track.info?.author || 'Unknown', inline: true },
          { name: 'Duration', value: track.isStream ? '🔴 LIVE' : formatTime(track.length || track.info?.length), inline: true },
          { name: 'Status', value: player.paused ? '⏸️ Paused' : '▶️ Playing', inline: true }
        );

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("music_pause").setLabel("Pause/Resume").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("music_skip").setLabel("Skip").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("music_stop").setLabel("Stop").setStyle(ButtonStyle.Danger)
        );
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("dj_vol_down").setLabel("-10%").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("dj_vol_up").setLabel("+10%").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("dj_lock").setLabel("Lock VC").setStyle(ButtonStyle.Success)
        );
        const filterRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("music_bassboost").setLabel("Bass+").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("music_clearfilters").setLabel("Clear").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("music_nightcore").setLabel("Nightcore").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("music_vaporwave").setLabel("Vapor").setStyle(ButtonStyle.Secondary)
        );
        const filterDropdown = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("music_filter_select")
            .setPlaceholder("🎧 Audio features")
            .addOptions(
              { label: "Bass Boost", value: "bassboost", description: "Strong low-end boost", emoji: "🎸" },
              { label: "Nightcore", value: "nightcore", description: "Faster and brighter", emoji: "✨" },
              { label: "Vaporwave", value: "vaporwave", description: "Lo-fi retro", emoji: "🪩" },
              { label: "Clear Filters", value: "clearfilters", description: "Reset all audio filters", emoji: "🚫" }
            )
        );

        await msg.edit({ embeds: [embed], components: [row1, row2, filterRow, filterDropdown] }).catch(() => null);
      } catch (e) {
        // non-fatal
      }
    }
    if (interaction.isButton()) {
      const customId = interaction.customId || "";
      const [namespace, action] = customId.split(":");
      const musicAction = customId.startsWith("music_") ? customId.replace("music_", "") : null;

      if (namespace === "setup") {
        // Acknowledge button press to avoid "This interaction failed" and suppress reply spam.
        try { await interaction.deferUpdate().catch(() => null); } catch (e) { /* ignore */ }
        const { updateSettings } = require("../utils/guildSettings");
        const guildId = interaction.guildId;

        try {
          if (action === "welcome") {
            updateSettings(guildId, {
              welcome: { enabled: true, channel: interaction.channelId, message: "Welcome to {server}, {user}! Make sure to check the rules and introduce yourself." },
            });
            await interaction.followUp({ content: "✅ Welcome system is now enabled in this channel.", ephemeral: true }).catch(() => null);
            return;
          }

          if (action === "moderation") {
            updateSettings(guildId, { automod: { enabled: true, spam: true, phishing: true, invites: true, caps: true, massMention: true } });
            await interaction.followUp({ content: "✅ Auto-moderation is now enabled for this server.", ephemeral: true }).catch(() => null);
            return;
          }

          if (action === "music") {
            const musicChannel = interaction.channel || interaction.guild.channels.cache.find((channel) => channel.isTextBased());
            if (musicChannel) {
              await musicChannel.send({ content: "✅ Music hub is ready. Use `!play` or `/play` to start a track in voice." }).catch(() => null);
            }
            await interaction.followUp({ content: "✅ Music setup is ready. Use `!play` or `/play` in a voice channel.", ephemeral: true }).catch(() => null);
            return;
          }

          if (action === "verification") {
            const role = await interaction.guild.roles.create({ name: "Verified", color: 0x57f287 }).catch(() => null);
            const channel = await interaction.guild.channels.create({ name: "verification", type: 0 }).catch(() => null);
            if (channel && role) {
              await channel.send({ content: `✅ Verification setup complete. ${role} is the verified role.` }).catch(() => null);
            }
            await interaction.followUp({ content: "✅ Verification channel and role were created.", ephemeral: true }).catch(() => null);
            return;
          }

          if (action === "roles") {
            await interaction.guild.roles.create({ name: "Member", color: 0x5865F2 }).catch(() => null);
            await interaction.guild.roles.create({ name: "Friendbase Staff", color: 0xfaa61a }).catch(() => null);
            await interaction.followUp({ content: "✅ Starter roles were created for this server.", ephemeral: true }).catch(() => null);
            return;
          }

          await interaction.followUp({ content: "✅ Setup action completed.", ephemeral: true }).catch(() => null);
          return;
        } catch (error) {
          console.error("[SetupButton]", error.message);
          await interaction.followUp({ content: "⚠️ Setup action failed. Please try again or use the command manually.", ephemeral: true }).catch(() => null);
          return;
        }
      }

      if (musicAction) {
        // acknowledge button press to avoid multiple visible replies; use followUp for ephemeral messages
        try { await interaction.deferUpdate().catch(() => null); } catch (e) { /* ignore */ }
        const player = client.manager?.getPlayer(interaction.guildId);

        if (!player) {
          await interaction.followUp({ content: "No music is playing right now.", ephemeral: true }).catch(() => null);
          return;
        }

        try {
          switch (musicAction) {
            case "pause": {
              if (player.paused) {
                player.pause(false);
                await interaction.followUp({ content: "▶️ Music resumed.", ephemeral: true }).catch(() => null);
                await updateNowPlayingEmbed(interaction.guildId, player).catch(() => null);
              } else {
                player.pause(true);
                await interaction.followUp({ content: "⏸️ Music paused.", ephemeral: true }).catch(() => null);
                await updateNowPlayingEmbed(interaction.guildId, player).catch(() => null);
              }
              break;
            }
            case "skip": {
              player.skip();
              await interaction.followUp({ content: "⏭️ Track skipped.", ephemeral: true }).catch(() => null);
              await updateNowPlayingEmbed(interaction.guildId, player).catch(() => null);
              break;
            }
            case "stop": {
              player.destroy();
              await interaction.followUp({ content: "🛑 Playback stopped.", ephemeral: true }).catch(() => null);
              client.nowPlaying.delete(interaction.guildId);
              break;
            }
            case "bassboost": {
              await applyAudioPreset(player, "bassboost");
              await interaction.followUp({ content: "🎸 Bass boost MAXIMUM applied! 🔊", ephemeral: true }).catch(() => null);
              await updateNowPlayingEmbed(interaction.guildId, player).catch(() => null);
              break;
            }
            case "clearfilters": {
              await applyAudioPreset(player, "clearfilters");
              await interaction.followUp({ content: "🚫 Audio filters cleared.", ephemeral: true }).catch(() => null);
              await updateNowPlayingEmbed(interaction.guildId, player).catch(() => null);
              break;
            }
            case "nightcore": {
              await applyAudioPreset(player, "nightcore");
              await interaction.followUp({ content: "✨ Nightcore filter applied.", ephemeral: true }).catch(() => null);
              await updateNowPlayingEmbed(interaction.guildId, player).catch(() => null);
              break;
            }
            case "vaporwave": {
              await applyAudioPreset(player, "vaporwave");
              await interaction.followUp({ content: "🪩 Vaporwave filter applied.", ephemeral: true }).catch(() => null);
              await updateNowPlayingEmbed(interaction.guildId, player).catch(() => null);
              break;
            }
            default:
              await interaction.followUp({ content: "That music control is not available.", ephemeral: true }).catch(() => null);
          }
        } catch (error) {
          console.error("[Music Button Error]", error.message);
          await interaction.followUp({ content: `Music control failed: ${error.message}`, ephemeral: true }).catch(() => null);
        }
        return;
      }

      if (customId === "dj_vol_up") {
        try { await interaction.deferUpdate().catch(() => null); } catch (e) {}
        const player = client.manager?.getPlayer(interaction.guildId);
        if (!player) {
          await interaction.followUp({ content: "No active music session.", ephemeral: true }).catch(() => null);
          return;
        }
        const nextVolume = Math.min(200, (player.volume || 100) + 10);
        player.setVolume(nextVolume);
        await interaction.followUp({ content: `🔊 Volume set to ${nextVolume}%.`, ephemeral: true }).catch(() => null);
        await updateNowPlayingEmbed(interaction.guildId, player).catch(() => null);
        return;
      }

      if (customId === "dj_vol_down") {
        try { await interaction.deferUpdate().catch(() => null); } catch (e) {}
        const player = client.manager?.getPlayer(interaction.guildId);
        if (!player) {
          await interaction.followUp({ content: "No active music session.", ephemeral: true }).catch(() => null);
          return;
        }
        const nextVolume = Math.max(0, (player.volume || 100) - 10);
        player.setVolume(nextVolume);
        await interaction.followUp({ content: `🔉 Volume set to ${nextVolume}%.`, ephemeral: true }).catch(() => null);
        await updateNowPlayingEmbed(interaction.guildId, player).catch(() => null);
        return;
      }

      if (customId === "dj_lock") {
        try { await interaction.deferUpdate().catch(() => null); } catch (e) {}
        await interaction.followUp({ content: "🔒 Voice lock is enabled for this session.", ephemeral: true }).catch(() => null);
        return;
      }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "music_filter_select") {
      try { await interaction.deferUpdate().catch(() => null); } catch (e) {}
      const player = client.manager?.getPlayer(interaction.guildId);
      if (!player) {
        await interaction.followUp({ content: "No music is playing right now.", ephemeral: true }).catch(() => null);
        return;
      }

      const preset = interaction.values?.[0];
      if (!preset) return;

      try {
        await applyAudioPreset(player, preset);
        const readablePreset = preset.replace(/([A-Z])/g, " $1").trim();
        await interaction.followUp({ content: `🎧 Audio preset: ${readablePreset.charAt(0).toUpperCase() + readablePreset.slice(1)}`, ephemeral: true }).catch(() => null);
        await updateNowPlayingEmbed(interaction.guildId, player).catch(() => null);
      } catch (error) {
        console.error("[Music Select Error]", error.message);
        await interaction.followUp({ content: `Audio preset failed: ${error.message}`, ephemeral: true }).catch(() => null);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;
    const command = client.commands.get(commandName) || client.prefixCommands?.get(commandName);

    if (!command) {
      console.warn(`[SlashCommand] No handler found for: ${commandName}`);
      return;
    }

    try {
      console.log(`[SlashCommand] Executing: ${commandName} by ${interaction.user.tag}`);

      // If command has SlashCommandBuilder (data property), it's a slash command
      if (command.data && typeof command.execute === "function") {
        await command.execute(interaction, client);
      } else {
        // Fallback for prefix-style commands
        const args = [];
        interaction.options._hoistedOptions?.forEach((option) => {
          args.push(option.value);
        });
        await command.execute(
          {
            author: interaction.user,
            member: interaction.member,
            guild: interaction.guild,
            channel: interaction.channel,
          // command implementations can call reply({ content, ephemeral: true })
          reply: async (options) => interaction.reply({ ...options, ephemeral: !!options?.ephemeral }),
          defer: async () => interaction.deferReply({ ephemeral: false }),
          editReply: async (options) => interaction.editReply(options),
        },
        args,
        client
        );
      }
    } catch (error) {
      console.error(`[SlashCommand Error] ${commandName}:`, error.message);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true }).catch(() => null);
      }
    }
  },
};
