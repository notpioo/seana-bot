// database/models/Market.js
const mongoose = require('mongoose');

const marketSchema = new mongoose.Schema({
    currentRate: {
        type: Number,
        default: 10000 // Base rate: 0.005000 COIN = 10000 balance
    },
    baseRate: {
        type: Number,
        default: 10000
    },
    volatility: {
        type: Number,
        default: 0.15 // 15% max price movement
    },
    lastUpdate: {
        type: Date,
        default: Date.now
    },
    totalSupply: {
        type: Number,
        default: 0
    },
    totalTransactions: {
        type: Number,
        default: 0
    },
    priceHistory: [{
        rate: Number,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});

// Method to update rate based on market conditions
marketSchema.methods.updateRate = async function() {
    const now = new Date();
    const timeDiff = (now - this.lastUpdate) / (1000 * 60); // minutes
    
    if (timeDiff >= 5) { // Update every 5 minutes
        // Calculate new rate based on supply and demand
        const randomFactor = 1 + (Math.random() * 2 - 1) * this.volatility;
        const supplyFactor = Math.max(0.8, Math.min(1.2, 1 + (this.totalSupply / 1000000))); // Supply impact
        
        let newRate = this.currentRate * randomFactor * supplyFactor;
        
        // Ensure rate stays within reasonable bounds
        newRate = Math.max(this.baseRate * 0.5, Math.min(this.baseRate * 2, newRate));
        
        // Update rate and history
        this.currentRate = Math.round(newRate);
        this.priceHistory.push({
            rate: this.currentRate,
            timestamp: now
        });
        
        // Keep only last 24 hours of history
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        this.priceHistory = this.priceHistory.filter(p => p.timestamp > oneDayAgo);
        
        this.lastUpdate = now;
        await this.save();
    }
    
    return this.currentRate;
};

module.exports = mongoose.model('Market', marketSchema);