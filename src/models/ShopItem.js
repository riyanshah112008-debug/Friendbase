const mongoose = require('mongoose');

const shopItemSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    type: { type: String, required: true }, // 'role' or 'pet'
    roleId: { type: String, default: null }, // Only used if type is 'role'
    emoji: { type: String, default: '📦' }
});

module.exports = mongoose.model('ShopItem', shopItemSchema);
