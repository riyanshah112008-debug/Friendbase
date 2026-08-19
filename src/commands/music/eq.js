const { getSettings, updateSettings } = require('../../utils/guildSettings');

module.exports = {
  name: 'eq',
  category: 'Music',
  description: 'Manage per-server EQ presets. Use `eq set <name> <comma-separated gain values>` or `eq apply <name>` or `eq list` or `eq remove <name>`',
  usage: 'eq <set|apply|list|remove> [name] [values] ',
  permissions: ['ManageGuild'],
  async execute(message, args, client) {
    const guildId = message.guild.id;
    const settings = getSettings(guildId);

    const sub = args[0] ? args[0].toLowerCase() : 'list';
    if (sub === 'list') {
      const names = Object.keys(settings.eqPresets || {});
      if (!names.length) return message.reply('No EQ presets saved for this server.');
      return message.reply(`EQ presets: ${names.join(', ')}`);
    }

    if (sub === 'set') {
      if (!args[1] || !args[2]) return message.reply('Usage: eq set <name> <comma-separated gains 15 values>');
      const name = args[1];
      const values = args.slice(2).join(' ').split(/[,\s]+/).map(v => parseFloat(v)).filter(v => !isNaN(v)).slice(0,15);
      if (values.length < 1) return message.reply('Provide at least one numeric gain value.');
      const presets = settings.eqPresets || {};
      presets[name] = { gains: values };
      updateSettings(guildId, { eqPresets: presets });
      return message.reply(`Saved EQ preset '${name}' with ${values.length} bands.`);
    }

    if (sub === 'remove') {
      const name = args[1];
      if (!name) return message.reply('Usage: eq remove <name>');
      const presets = settings.eqPresets || {};
      if (!presets[name]) return message.reply('Preset not found.');
      delete presets[name];
      updateSettings(guildId, { eqPresets: presets });
      return message.reply(`Removed preset '${name}'.`);
    }

    if (sub === 'apply') {
      const name = args[1];
      if (!name) return message.reply('Usage: eq apply <name>');
      const presets = settings.eqPresets || {};
      const preset = presets[name];
      if (!preset) return message.reply('Preset not found.');
      // apply to current player if exists
      const player = client.manager?.getPlayer(message.guild.id);
      if (!player) return message.reply('No active music session to apply EQ to.');
      try {
        const audioTarget = player.shoukaku || player;
        if (typeof audioTarget.setFilters === 'function') {
          // build equalizer bands
          const eq = (preset.gains || []).map((gain, i) => ({ band: i, gain: parseFloat(gain) || 0 }));
          await audioTarget.setFilters({ equalizer: eq });
          return message.reply(`Applied preset '${name}'.`);
        }
        return message.reply('Player does not support filters.');
      } catch (e) {
        console.error('[EQ Command Error]', e);
        return message.reply('Failed to apply EQ preset.');
      }
    }

    return message.reply('Unknown subcommand. Use set/apply/list/remove.');
  }
};