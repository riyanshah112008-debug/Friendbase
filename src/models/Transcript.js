const mongoose = require('mongoose');

const transcriptSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    deletedCount: { type: Number, required: true },
    messages: [
        {
            authorId: String,
            authorTag: String,
            content: String,
            timestamp: Date
        }
    ],
    clearedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transcript', transcriptSchema);
