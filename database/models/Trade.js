const mongoose = require('mongoose');

const tradeSlotSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['rod', 'bait', 'fish', 'special', 'balance'],
        required: true
    },
    itemName: String,
    quantity: Number,
    balance: Number
});

const tradeSchema = new mongoose.Schema({
    initiator: {
        userId: { type: String, required: true },
        slots: [tradeSlotSchema],
        isReady: { type: Boolean, default: false }
    },
    receiver: {
        userId: { type: String, required: true },
        slots: [tradeSlotSchema],
        isReady: { type: Boolean, default: false }
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // Auto-delete after 5 minutes if not completed
    }
});

module.exports = mongoose.model('Trade', tradeSchema);