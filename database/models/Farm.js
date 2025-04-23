
const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    coins: {
        type: Number,
        default: 1500
    },
    slots: {
        type: Number,
        default: 10
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
    }]
});

module.exports = mongoose.model('Farm', farmSchema);
