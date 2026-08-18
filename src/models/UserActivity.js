const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    joinedAt: { type: Number, default: 0 },
    inviterId: { type: String, default: 'Unknown' },
    inviteCode: { type: String, default: 'Direct/Vanity' },
    logChannelId: { type: String, default: null },
    logMessageId: { type: String, default: null },
    is14DayTracker: { type: Boolean, default: false }, // Separates onboarding alerts from historical scrapes
    alerted: { type: Boolean, default: false },
    stats: {
        msgs: { type: Number, default: 0 },
        media: { type: Number, default: 0 },
        links: { type: Number, default: 0 },
        voice: { type: Number, default: 0 },
        reacts: { type: Number, default: 0 },
        invites: { type: Number, default: 0 }
    }
});

// Compound index for lightning-fast queries during live updates
userActivitySchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('UserActivity', userActivitySchema);
