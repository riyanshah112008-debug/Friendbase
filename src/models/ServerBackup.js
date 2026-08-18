const mongoose = require('mongoose');

const serverBackupSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    timestamp: { type: Date, default: Date.now },
    roles: Array,
    categories: Array,
    channels: Array
});

module.exports = mongoose.model('ServerBackup', serverBackupSchema);
