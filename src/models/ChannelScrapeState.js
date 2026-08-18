const mongoose = require('mongoose');

const scrapeStateSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, unique: true },
    oldestScrapedId: { type: String, default: null },
    newestScrapedId: { type: String, default: null },
    isFullyScraped: { type: Boolean, default: false },
    totalMessagesProcessed: { type: Number, default: 0 }
});

module.exports = mongoose.model('ChannelScrapeState', scrapeStateSchema);
