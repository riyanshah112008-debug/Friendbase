const mongoose = require('mongoose');

const guildTrackerSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    customLogChannel: { type: String, default: null },
    privateAdminChannel: { type: String, default: null }
});

module.exports = mongoose.model('GuildTrackerSettings', guildTrackerSettingsSchema);
