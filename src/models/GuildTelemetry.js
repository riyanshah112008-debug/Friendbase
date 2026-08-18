const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    guildName: { type: String, default: 'Unknown Guild' },
    
    // Member Velocity Metrics
    joinsThisHour: { type: Number, default: 0 },
    lastHourJoinsRecord: { type: Number, default: 0 },
    
    // Voice Engagement (in seconds)
    totalVcSeconds: { type: Number, default: 0 },
    
    // Security & Moderation Telemetry
    modStats: {
        warns: { type: Number, default: 0 },
        kicks: { type: Number, default: 0 },
        bans: { type: Number, default: 0 },
        automodTriggers: { type: Number, default: 0 }
    },

    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GuildTelemetry', telemetrySchema);
