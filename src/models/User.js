const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    credits: { type: Number, default: 0 },
    prestige: { type: Number, default: 0 },
    // NEW INVENTORY & PET SYSTEM
    inventory: { type: Array, default: [] },
    activePet: { type: String, default: null },
    petHappiness: { type: Number, default: 0 } // Max 100
});

userSchema.index({ userId: 1, guildId: 1 }, { unique: true });
module.exports = mongoose.model('User', userSchema);
