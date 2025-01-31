const mongoose = require('mongoose');

const marketSchema = new mongoose.Schema({
    currentRate: {
        type: Number,
        default: 40000000 // Base rate: 1 COIN = 40,000,000 balance
    },
    baseRate: {
        type: Number,
        default: 40000000
    },
    volatility: {
        type: Number,
        default: 0.08 // 8% max price movement per update (more realistic)
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
    marketTrend: {
        type: String,
        enum: ['bullish', 'bearish', 'sideways'],
        default: 'sideways'
    },
    trendStrength: {
        type: Number,
        default: 0.5 // 0-1 scale
    },
    trendDuration: {
        type: Number,
        default: 0 // Number of intervals the trend has persisted
    },
    priceHistory: [{
        rate: Number,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});

// Method to update market trend
marketSchema.methods.updateMarketTrend = function() {
    // 10% chance to change trend each update
    if (Math.random() < 0.10) {
        const trends = ['bullish', 'bearish', 'sideways'];
        this.marketTrend = trends[Math.floor(Math.random() * trends.length)];
        this.trendStrength = 0.3 + Math.random() * 0.7; // Random strength between 0.3-1.0
        this.trendDuration = 0;
    } else {
        this.trendDuration++;
        // Gradually decrease trend strength over time
        if (this.trendDuration > 12) { // After 1 hour (12 * 5 minutes)
            this.trendStrength *= 0.95;
        }
    }
};

// Method to update rate based on market conditions
marketSchema.methods.updateRate = async function() {
    const now = new Date();
    const timeDiff = (now - this.lastUpdate) / (1000 * 60); // minutes
    
    if (timeDiff >= 5) { // Update every 5 minutes
        // Update market trend first
        this.updateMarketTrend();
        
        // Base volatility adjusted by trend
        let effectiveVolatility = this.volatility;
        if (this.marketTrend === 'bullish' || this.marketTrend === 'bearish') {
            effectiveVolatility *= (1 + this.trendStrength);
        }
        
        // Calculate trend bias (-1 to 1)
        let trendBias = 0;
        switch(this.marketTrend) {
            case 'bullish':
                trendBias = this.trendStrength * 0.5;
                break;
            case 'bearish':
                trendBias = -this.trendStrength * 0.5;
                break;
            default: // sideways
                trendBias = 0;
        }
        
        // Calculate price movement
        const randomFactor = (Math.random() * 2 - 1) * effectiveVolatility;
        const supplyFactor = Math.max(0.9, Math.min(1.1, 1 + (this.totalSupply / 10000000))); // Supply impact
        const marketSentiment = randomFactor + trendBias;
        
        let newRate = this.currentRate * (1 + marketSentiment) * supplyFactor;
        
        // Ensure rate stays within reasonable bounds (20M - 80M)
        newRate = Math.max(20000000, Math.min(80000000, newRate));
        
        // Round to nearest 1000 for cleaner numbers
        this.currentRate = Math.round(newRate / 1000) * 1000;
        
        // Update price history
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