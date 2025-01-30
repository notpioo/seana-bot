// database/models/Inventory.js
const mongoose = require('mongoose');

const boostSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['limit', 'balance', 'exp', 'cdcrypto']
    },
    multiplier: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        default: 1
    }
});

const inventorySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    boosts: [boostSchema],
    activeBoosts: [{
        boostId: String,
        type: String,
        multiplier: Number,
        expireAt: Date
    }]
});

module.exports = mongoose.model('Inventory', inventorySchema);