// database/models/Crypto.js
const mongoose = require('mongoose');

const cryptoSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0
    },
    ram: {
        size: {
            type: Number,
            default: 1  // GB
        },
        efficiency: {
            type: Number,
            default: 0.6  // 60% success rate base
        }
    },
    lastMining: {
        type: Date,
        default: null
    },
    totalMined: {
        type: Number,
        default: 0
    },
    successfulMines: {
        type: Number,
        default: 0
    },
    failedMines: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Crypto', cryptoSchema);