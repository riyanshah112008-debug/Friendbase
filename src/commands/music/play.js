// ==========================================
// 🎵 STARRY SUPREME MUSIC ENGINE - PLAY COMMAND
// File Path: commands/play.js
// ==========================================
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../utils/database');

const EPHEMERAL_FLAG = MessageFlags ? MessageFlags.Ephemeral : 6;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('🎵 Play a song, Spotify Playlist, or SoundCloud link')
    .addStringOption(option => 
      option.setName('song')
        .setDescription('Song name, Spotify Playlist URL, or SoundCloud URL')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const query = interaction.options.getString('song', true).trim();
    const voiceChannel = interaction.member.voice?.channel;

    // 1. Voice Channel Requirement Check
    if (!voiceChannel) {
      return interaction.reply({ 
        content: '❌ You must be connected to a voice channel first!', 
        flags: [EPHEMERAL_FLAG] 
      });
    }

    // 2. Prevent Pulling Bot from Another Voice Channel
    const botMember = interaction.guild.members.me || await interaction.guild.members.fetch(client.user.id).catch(() => null);
    if (botMember?.voice?.channelId && botMember.voice.channelId !== voiceChannel.id) {
      return interaction.reply({ 
        content: `❌ I am already playing music in <#${botMember.voice.channelId}>! Join my channel or wait for the queue to finish.`, 
        flags: [EPHEMERAL_FLAG] 
      });
    }

    // 3. Permission Checks
    const permissions = voiceChannel.permissionsFor(botMember || interaction.client.user);
    if (!permissions?.has(PermissionFlagsBits.Connect) || !permissions?.has(PermissionFlagsBits.Speak)) {
      return interaction.reply({ 
        content: '❌ I do not have permission to **Connect** or **Speak** in your voice channel!', 
        flags: [EPHEMERAL_FLAG] 
      });
    }

    await interaction.deferReply();

    try {
      // 4. Spotify Blend Guard
      if (query.includes('spotify.com/blend') && !query.includes('/playlist/')) {
        return interaction.editReply('⚠️ **Spotify Blend Notice:** Please copy the actual **Playlist Link** rather than the joint blend invite!');
      }

      // 5. 10-Second Anti-Hang Guard Promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('NODE_TIMEOUT')), 10000)
      );

      // 6. Get or Create Kazagumo Player
      let player = client.manager.getPlayer(interaction.guild.id);
      if (!player) {
        const playerPromise = client.manager.createPlayer({
          guildId: interaction.guild.id,
          textId: interaction.channel.id,
          voiceId: voiceChannel.id,
          volume: 100,
          deaf: true
        });

        player = await Promise.race([playerPromise, timeoutPromise]);
      }

      if (!player) {
        return interaction.editReply('❌ Could not connect to the Lavalink music engine. Please try again in a few seconds!');
      }

      // 7. Multi-Engine Smart Search Strategy
      let result = null;

      if (query.startsWith('http://') || query.startsWith('https://')) {
        // Direct URL Search
        result = await Promise.race([
          client.manager.search(query, { requester: interaction.user }),
          timeoutPromise
        ]);
      } else {
        // Plain Text Search with Multi-Engine Fallback (Spotify -> SoundCloud -> YouTube Music -> YouTube)
        const engines = ['spotify', 'soundcloud', 'youtube'];
        for (const engine of engines) {
          try {
            const searchRes = await Promise.race([
              client.manager.search(query, { requester: interaction.user, engine: engine }),
              timeoutPromise
            ]);
            if (searchRes && searchRes.tracks && searchRes.tracks.length > 0 && searchRes.type !== 'EXCEPTION') {
              result = searchRes;
              break;
            }
          } catch (e) {
            // Fallthrough to next engine if one stutters
          }
        }

        // Final YTM Fallback if all engines return empty
        if (!result || !result.tracks.length) {
          result = await client.manager.search(`ytmsearch:${query}`, { requester: interaction.user }).catch(() => null);
        }
      }

      if (!result || !result.tracks || !result.tracks.length || result.type === 'EXCEPTION') {
        return interaction.editReply('❌ No results found on Spotify, SoundCloud, or YouTube. Ensure track or playlist is public!');
      }

      // Pass interaction reference so playerStart event in index.js turns this deferred reply into the Master Music Control Panel
      player.data.set('interaction', interaction);

      if (typeof player.setFilters === 'function') {
        player.setFilters({
          // Raised defaults for better loudness and clarity
          volume: 2.0,
          equalizer: [
            { band: 0, gain: 0.95 },
            { band: 1, gain: 0.9 },
            { band: 2, gain: 0.5 },
            { band: 3, gain: 0.12 },
            { band: 4, gain: 0.05 },
            { band: 5, gain: 0.01 },
            { band: 6, gain: 0.06 },
            { band: 7, gain: 0.05 },
            { band: 8, gain: 0.09 },
            { band: 9, gain: 0.05 },
            { band: 10, gain: 0.02 },
            { band: 11, gain: 0.01 },
            { band: 12, gain: 0.0 },
            { band: 13, gain: 0.0 },
            { band: 14, gain: 0.0 }
          ],
          timescale: { speed: 1.0, pitch: 1.0, rate: 1.0 },
          lowPass: { smoothing: 12 }
        }).catch(() => null);
      }

      // 8. PLAYLIST HANDLER
      if (result.type === 'PLAYLIST' || result.type === 'PLAYLIST_LOADED') {
        for (const track of result.tracks) {
          player.queue.add(track);
        }
        // persist simplified queue
        try {
          const simplified = player.queue.map(t => ({ title: t.title || t.info?.title, uri: t.uri || t.info?.uri, author: t.author || t.info?.author, length: t.length || t.info?.length, thumbnail: t.thumbnail || t.info?.thumbnail, requester: (t.requester && t.requester.id) || (t.info?.requester?.id) || null }));
          db.saveMusicQueue(interaction.guild.id, simplified);
        } catch (e) { /* non-fatal */ }
        
        if (!player.playing && !player.paused) {
          await player.play(); // playerStart in index.js will replace this reply with the Master Control Panel Embed
        } else {
          const embed = new EmbedBuilder()
            .setColor('#1DB954')
            .setAuthor({ name: 'Playlist Added to Queue', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTitle(result.playlistName || 'Spotify / Web Playlist')
            .setDescription(`✅ Successfully added **${result.tracks.length}** tracks to the server queue!`)
            .addFields(
              { name: '🔠 Total Queue', value: `\`${player.queue.length}\` songs`, inline: true },
              { name: '👤 Requested By', value: `${interaction.user}`, inline: true }
            )
            .setFooter({ text: 'Starry Supreme Music Engine' })
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        }
      } 
      // 9. SINGLE TRACK HANDLER
      else {
        const track = result.tracks[0];
        player.queue.add(track);
        // persist simplified queue
        try {
          const simplified = player.queue.map(t => ({ title: t.title || t.info?.title, uri: t.uri || t.info?.uri, author: t.author || t.info?.author, length: t.length || t.info?.length, thumbnail: t.thumbnail || t.info?.thumbnail, requester: (t.requester && t.requester.id) || (t.info?.requester?.id) || null }));
          db.saveMusicQueue(interaction.guild.id, simplified);
        } catch (e) { /* non-fatal */ }

        if (!player.playing && !player.paused) {
          await player.play(); // playerStart in index.js will replace this reply with the Master Control Panel Embed
        } else {
          const formatTime = (ms) => {
            if (!ms) return '0:00';
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
          };

          const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: 'Added to Queue', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTitle(track.title)
            .setURL(track.uri)
            .setThumbnail(track.thumbnail || 'https://i.imgur.com/8QJ8zuz.png')
            .setDescription(`👤 **Artist:** \`${track.author || 'Unknown'}\`\n🕒 **Duration:** \`${track.isStream ? '🔴 LIVE' : formatTime(track.length)}\`\n🔠 **Queue Position:** \`#${player.queue.length}\``)
            .setFooter({ text: 'Starry Supreme Music Engine' })
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        }
      }

    } catch (error) {
      console.error('❌ Play Command Error:', error);
      if (error.message === 'NODE_TIMEOUT') {
        return interaction.editReply('🔴 **Timeout:** Lavalink nodes did not respond in time. Please try running the command again!');
      }
      return interaction.editReply(`❌ **Error:** \`${error.message || 'Failed to process audio stream'}\``);
    }
  }
};
