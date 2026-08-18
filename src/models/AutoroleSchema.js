const mongoose = require('mongoose');

// Stores the setup for each server
const configSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    roleIds: { type: [String], default: [] }, // Upgraded from roleId to roleIds array
    stickyRolesEnabled: { type: Boolean, default: true }
});

// Stores the automatic backup of a user's roles when they leave
const stickySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    roles: { type: [String], default: [] } // Updated to explicitly expect an array of strings
});

module.exports = {
    AutoroleConfig: mongoose.models.AutoroleConfig || mongoose.model('AutoroleConfig', configSchema),
    StickyRole: mongoose.models.StickyRole || mongoose.model('StickyRole', stickySchema)
};
