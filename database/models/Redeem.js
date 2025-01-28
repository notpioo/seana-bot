// models/Redeem.js
const fs = require('fs');
const path = require('path');
const logger = require('../../lib/utils/logger');

class Redeem {
    constructor() {
        this.dbPath = path.join(__dirname, '../data/redeem.json');
        this.redeemedPath = path.join(__dirname, '../data/redeemed.json');
        this.codes = this.loadCodes();
        this.redeemed = this.loadRedeemed();
    }

    loadCodes() {
        try {
            if (!fs.existsSync(this.dbPath)) {
                fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
                fs.writeFileSync(this.dbPath, '[]');
                return [];
            }
            return JSON.parse(fs.readFileSync(this.dbPath));
        } catch (error) {
            logger.error(`Error loading redeem codes: ${error}`);
            return [];
        }
    }

    loadRedeemed() {
        try {
            if (!fs.existsSync(this.redeemedPath)) {
                fs.mkdirSync(path.dirname(this.redeemedPath), { recursive: true });
                fs.writeFileSync(this.redeemedPath, '{}');
                return {};
            }
            return JSON.parse(fs.readFileSync(this.redeemedPath));
        } catch (error) {
            logger.error(`Error loading redeemed data: ${error}`);
            return {};
        }
    }

    saveCodes() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.codes, null, 2));
        } catch (error) {
            logger.error(`Error saving redeem codes: ${error}`);
        }
    }

    saveRedeemed() {
        try {
            fs.writeFileSync(this.redeemedPath, JSON.stringify(this.redeemed, null, 2));
        } catch (error) {
            logger.error(`Error saving redeemed data: ${error}`);
        }
    }

    createCode(data) {
        const { balance, premium, code, expired, max, pesan } = data;
        
        // Check if code already exists
        if (this.codes.some(c => c.code === code)) {
            return { status: false, message: 'Code already exists!' };
        }

        const now = Date.now();
        const parseDuration = (duration) => {
            const value = parseInt(duration);
            const unit = duration.replace(/[0-9]/g, '').toLowerCase();
            
            switch (unit) {
                case 'day':
                case 'days':
                case 'd':
                    return value * 24 * 60 * 60 * 1000;
                case 'hour':
                case 'hours':
                case 'h':
                    return value * 60 * 60 * 1000;
                default:
                    return null;
            }
        };

        const expiredMs = parseDuration(expired);
        if (!expiredMs) {
            return { status: false, message: 'Invalid expiry duration!' };
        }

        const newCode = {
            balance: parseInt(balance) || 0,
            premium: premium || '0',
            code,
            created: now,
            expired: now + expiredMs,
            max: parseInt(max) || 1,
            used: 0,
            pesan,
        };

        this.codes.push(newCode);
        this.saveCodes();

        return { status: true, message: 'Code created successfully!' };
    }

    redeemCode(code, userJid) {
        // Check if code exists
        const codeData = this.codes.find(c => c.code === code);
        if (!codeData) {
            return { status: false, message: '❌ Invalid code!' };
        }

        // Check if code is expired
        if (Date.now() > codeData.expired) {
            return { status: false, message: '❌ Code has expired!' };
        }

        // Check if max redemptions reached
        if (codeData.used >= codeData.max) {
            return { status: false, message: '❌ Code has reached maximum redemptions!' };
        }

        // Check if user has already redeemed
        const userRedeemed = this.redeemed[userJid] || [];
        if (userRedeemed.includes(code)) {
            return { status: false, message: '❌ You have already redeemed this code!' };
        }

        // Update redeemed data
        if (!this.redeemed[userJid]) {
            this.redeemed[userJid] = [];
        }
        this.redeemed[userJid].push(code);
        this.saveRedeemed();

        // Update code usage
        codeData.used += 1;
        this.saveCodes();

        return {
            status: true,
            message: '✅ Code redeemed successfully!',
            rewards: {
                balance: codeData.balance,
                premium: codeData.premium,
                pesan: codeData.pesan
            }
        };
    }

    getTemplate() {
        return `balance: 0
premium: 0
code: CUSTOMCODE
expired: 1day
max: 10
pesan: Selamat anda mendapatkan hadiah!`;
    }
}

module.exports = new Redeem();