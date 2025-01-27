const fs = require('fs');
const path = require('path');
const logger = require('../../lib/utils/logger');

class User {
    constructor() {
        this.dbPath = path.join(__dirname, '../data/users.json');
        this.users = this.loadUsers();
    }

    loadUsers() {
        try {
            if (!fs.existsSync(this.dbPath)) {
                fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
                fs.writeFileSync(this.dbPath, '{}');
                return {};
            }
            return JSON.parse(fs.readFileSync(this.dbPath));
        } catch (error) {
            logger.error(`Error loading users: ${error}`);
            return {};
        }
    }

    saveUsers() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.users, null, 2));
        } catch (error) {
            logger.error(`Error saving users: ${error}`);
        }
    }

    createUser(jid, name) {
        // Pastikan jid valid
        if (!jid || !jid.includes('@s.whatsapp.net')) {
            logger.error(`Invalid JID: ${jid}`);
            return null;
        }

        if (!this.users[jid]) {
            this.users[jid] = {
                name: name, // Nama default (dari WhatsApp)
                username: name, // Nama custom (bisa diubah oleh pengguna)
                number: jid.split('@')[0],
                status: 'basic',
                limit: 25,
                balance: 0,
                memberSince: new Date().toISOString(),
                lastLimitReset: new Date().toISOString(),
                premiumExpiry: null,
                isBanned: false,
                banExpiry: null
            };
            this.saveUsers();
        }
        return this.users[jid];
    }

    getUser(jid) {
        return this.users[jid];
    }

    updateUser(jid, data) {
        if (this.users[jid]) {
            this.users[jid] = { ...this.users[jid], ...data };
            this.saveUsers();
        }
        return this.users[jid];
    }

    setUsername(jid, newUsername) {
        if (this.users[jid]) {
            this.users[jid].username = newUsername; // Update username
            this.saveUsers(); // Simpan perubahan ke database
            return true;
        }
        return false; // Jika user tidak ditemukan
    }

    resetDailyLimits() {
        const now = new Date();
        Object.keys(this.users).forEach(jid => {
            const user = this.users[jid];
            const lastReset = new Date(user.lastLimitReset);
            if (now.getDate() !== lastReset.getDate()) {
                user.limit = user.status === 'premium' ? Infinity : 25;
                user.lastLimitReset = now.toISOString();
            }
        });
        this.saveUsers();
    }

    useLimit(jid) {
        const user = this.users[jid];
        if (!user) return false;
        if (user.status === 'premium') return true;
        if (user.limit > 0) {
            user.limit--;
            this.saveUsers();
            return true;
        }
        return false;
    }

    // Method baru untuk mendapatkan semua pengguna
    getAllUsers() {
        return this.users;
    }
}

module.exports = new User();