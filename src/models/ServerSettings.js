const mongoose = require('mongoose');

const serverSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    triggerWord: { type: String, default: 'starry' },
    setupCompleted: { type: Boolean, default: false },
    verifiedRoleId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

serverSettingsSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.models.ServerSettings || mongoose.model('ServerSettings', serverSettingsSchema);
