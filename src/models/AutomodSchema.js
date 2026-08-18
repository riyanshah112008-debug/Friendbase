const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true }
});

const channelSchema = new mongoose.Schema({
    channelId: { type: String, required: true, unique: true },
    links: { type: Boolean, default: false },
    emojis: { type: Boolean, default: false }
});

module.exports = {
    // This makes sure Mongoose doesn't crash if it tries to load the model twice
    AutomodGuild: mongoose.models.AutomodGuild || mongoose.model('AutomodGuild', guildSchema),
    AutomodChannel: mongoose.models.AutomodChannel || mongoose.model('AutomodChannel', channelSchema)
};
