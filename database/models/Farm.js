
const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true // Add index for better query performance
    },
    coins: {
        type: Number,
        default: 1500
    },
    diamonds: {
        type: Number,
        default: 0
    },
    slots: {
        type: Number,
        default: 10
    },
    greenhouse: {
        type: Array,
        default: []
    },
    landLevel: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    seeds: [{
        name: String,
        quantity: Number
    }],
    plants: [{
        name: String,
        plantedAt: Date,
        quantity: Number,
        slot: Number
    }],
    inventory: {
        crops: [{
            name: String,
            quantity: Number,
            weight: Number,
            tier: String
        }]
    }
});

module.exports = mongoose.model('Farm', farmSchema);
