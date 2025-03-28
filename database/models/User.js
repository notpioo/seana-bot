const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    jid: { 
        type: String, 
        required: true, 
        unique: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    username: { 
        type: String, 
        required: true 
    },
    number: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        default: 'basic' 
    },
    limit: { 
        type: Number, 
        default: 25 
    },
    balance: { 
        type: Number, 
        default: 0 
    },
    chips: {  // Added chips field
        type: Number,
        default: 1000  // Starting chips amount
    },
    memberSince: { 
        type: Date, 
        default: Date.now 
    },
    lastLimitReset: { 
        type: Date, 
        default: Date.now 
    },
    premiumExpiry: { 
        type: Date, 
        default: null 
    },
    isBanned: { 
        type: Boolean, 
        default: false 
    },
    banExpiry: { 
        type: Date, 
        default: null 
    },
    susunkata: {
        wins: { type: Number, default: 0 },
        profit: { type: Number, default: 0 }
    },
    dice: {
        games: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        profit: { type: Number, default: 0 }
    },
});

const UserModel = mongoose.model('User', userSchema);

class User {
    constructor() {
        this.model = UserModel;
    }

    async loadUsers() {
        try {
            const users = await this.model.find();
            return users.reduce((acc, user) => {
                acc[user.jid] = user.toObject();
                return acc;
            }, {});
        } catch (error) {
            logger.error(`Error loading users: ${error}`);
            return {};
        }
    }

    async createUser(jid, name) {
        try {
            if (!jid || !jid.includes('@s.whatsapp.net')) {
                logger.error(`Invalid JID: ${jid}`);
                return null;
            }

            let user = await this.model.findOne({ jid });
            if (!user) {
                user = await this.model.create({
                    jid,
                    name,
                    username: name,
                    number: jid.split('@')[0]
                });
            }
            return user.toObject();
        } catch (error) {
            logger.error(`Error creating user: ${error}`);
            return null;
        }
    }

    async getUser(jid) {
        try {
            const user = await this.model.findOne({ jid });
            return user ? user.toObject() : null;
        } catch (error) {
            logger.error(`Error getting user: ${error}`);
            return null;
        }
    }

    async updateUser(jid, data) {
        try {
            const user = await this.model.findOneAndUpdate(
                { jid },
                { $set: data },
                { new: true }
            );
            return user ? user.toObject() : null;
        } catch (error) {
            logger.error(`Error updating user: ${error}`);
            return null;
        }
    }

    async setUsername(jid, newUsername) {
        try {
            const user = await this.model.findOneAndUpdate(
                { jid },
                { username: newUsername },
                { new: true }
            );
            return !!user;
        } catch (error) {
            logger.error(`Error setting username: ${error}`);
            return false;
        }
    }

    async resetDailyLimits() {
        try {
            const now = new Date();
            const users = await this.model.find();
            
            for (const user of users) {
                let shouldUpdate = false;
                const updates = {};
    
                // Check daily limit reset
                const lastReset = new Date(user.lastLimitReset);
                if (now.getDate() !== lastReset.getDate()) {
                    updates.limit = user.status === 'premium' ? Infinity : 25;
                    updates.lastLimitReset = now;
                    shouldUpdate = true;
                }
    
                // Check premium expiry
                if (user.status === 'premium' && user.premiumExpiry) {
                    if (new Date(user.premiumExpiry).getTime() < now.getTime()) {
                        updates.status = 'basic';
                        updates.premiumExpiry = null;
                        updates.limit = 25;
                        shouldUpdate = true;
                    }
                }
    
                // Apply updates if needed
                if (shouldUpdate) {
                    await this.model.findOneAndUpdate(
                        { _id: user._id },
                        { $set: updates },
                        { new: true }
                    );
                }
            }
        } catch (error) {
            logger.error(`Error resetting daily limits: ${error}`);
        }
    }

    async useLimit(jid) {
        try {
            const user = await this.model.findOne({ jid });
            if (!user) return false;
            if (user.status === 'premium') return true;
            if (user.limit > 0) {
                user.limit--;
                await user.save();
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`Error using limit: ${error}`);
            return false;
        }
    }

    async getAllUsers() {
        try {
            const users = await this.model.find();
            return users.reduce((acc, user) => {
                acc[user.jid] = user.toObject();
                return acc;
            }, {});
        } catch (error) {
            logger.error(`Error getting all users: ${error}`);
            return {};
        }
    }
}

module.exports = new User();