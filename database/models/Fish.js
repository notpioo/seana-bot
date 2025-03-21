
const mongoose = require('mongoose');

const fishSchema = new mongoose.Schema({
    jid: { 
        type: String, 
        required: true 
    },
    currentArea: {
        type: String,
        default: 'indonesia'
    },
    currentRod: {
        type: String,
        default: 'ranting_pohon'
    },
    lastFishing: {
        type: Date,
        default: null
    },
    unlockedAreas: {
        type: [String],
        default: ['indonesia']
    },
    currentBait: {
        type: String,
        default: 'normal'
    },
    inventory: {
        rods: [{
            name: String,
            durability: Number
        }],
        fish: [{
            name: String,
            rarity: String,
            quantity: Number,
            isLocked: { type: Boolean, default: false } 
        }],
        baits: [{
            name: String,
            quantity: Number
        }]
    },
    stats: {
        totalCatch: { type: Number, default: 0 },
        totalProfit: { type: Number, default: 0 },
        rareCatch: { type: Number, default: 0 },
        epicCatch: { type: Number, default: 0 },
        legendaryCatch: { type: Number, default: 0 },
        mythicCatch: { type: Number, default: 0 },
        secretCatch: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        xp: { type: Number, default: 0 }
    },
    endTime: { type: Date, default: null },
    lunarBait: { type: Number, default: 0 }
});

module.exports = mongoose.model('Fish', fishSchema);
