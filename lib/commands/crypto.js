// lib/commands/crypto.js
const CryptoModel = require('../../database/models/Crypto');
const User = require('../../database/models/User');

// RAM configurations
const RAM_CONFIGS = {};
for (let i = 1; i <= 30; i++) {
    RAM_CONFIGS[i] = {
        price: 50000 * Math.pow(1.5, i-1), // Starts at 50000, increases by 50%
        minReward: 0.0001 * (1 + (i-1) * 0.15), // 15% increase per level
        maxReward: 0.0005 * (1 + (i-1) * 0.2),  // 20% increase per level
        efficiency: 0.6 + (i-1) * 0.01 // Each GB adds 1% efficiency, max 90%
    };
}

async function cryptoHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        let crypto = await CryptoModel.findOne({ userId: senderJid });
        if (!crypto) {
            crypto = await CryptoModel.create({ userId: senderJid });
        }

        const user = await User.getUser(senderJid);
        const ramConfig = RAM_CONFIGS[crypto.ram.size];

        const successRate = (crypto.successfulMines / (crypto.successfulMines + crypto.failedMines) * 100) || 0;

        const dashboardText = `╭━『 *CRYPTO DASHBOARD* 』━
┃ 👤 *${user.username}'s Mining Stats*
┃
┃ 💰 Balance: ${crypto.balance.toFixed(6)} COIN
┃ 🖥️ RAM: ${crypto.ram.size}GB
┃ ⚡ Efficiency: ${(crypto.ram.efficiency * 100).toFixed(1)}%
┃
┃ 📊 *Mining Statistics*
┃ ├ Total Mined: ${crypto.totalMined.toFixed(6)} COIN
┃ ├ Success Rate: ${successRate.toFixed(1)}%
┃ └ Total Attempts: ${crypto.successfulMines + crypto.failedMines}
┃
┃ 🔧 *Current RAM Stats*
┃ ├ Min: ${ramConfig.minReward.toFixed(6)} COIN
┃ ├ Max: ${ramConfig.maxReward.toFixed(6)} COIN
┃ └ Success Rate: ${(ramConfig.efficiency * 100).toFixed(1)}%
╰━━━━━━━━━━━━━━━━━━━╯

ketik .mine untuk mulai mining!
ketik .buyram <GB> untuk upgrade RAM!`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: dashboardText,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in crypto handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses crypto dashboard',
            quoted: msg
        });
    }
}

async function mineHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        let crypto = await CryptoModel.findOne({ userId: senderJid });
        if (!crypto) {
            crypto = await CryptoModel.create({ userId: senderJid });
        }

        const user = await User.getUser(senderJid);
        const now = new Date();

        // Check cooldown
        if (crypto.lastMining) {
            const cooldown = user.status === 'premium' ? 48 : 60; // 20% reduction for premium
            const timeDiff = (now - new Date(crypto.lastMining)) / (1000 * 60); // in minutes
            
            if (timeDiff < cooldown) {
                const remaining = Math.ceil(cooldown - timeDiff);
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `⏳ Please wait ${remaining} minutes before mining again.`,
                    quoted: msg
                });
                return;
            }
        }

        // Calculate mining result
        const ramConfig = RAM_CONFIGS[crypto.ram.size];
        const success = Math.random() < ramConfig.efficiency;
        let reward = 0;

        if (success) {
            reward = ramConfig.minReward + (Math.random() * (ramConfig.maxReward - ramConfig.minReward));
            crypto.balance += reward;
            crypto.totalMined += reward;
            crypto.successfulMines += 1;
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🎉 Mining successful!\n💰 You got ${reward.toFixed(6)} COIN`,
                quoted: msg
            });
        } else {
            crypto.failedMines += 1;
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Mining failed! Your RAM wasn't powerful enough this time.`,
                quoted: msg
            });
        }

        crypto.lastMining = now;
        await crypto.save();

    } catch (error) {
        console.error('Error in mine handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mining',
            quoted: msg
        });
    }
}

async function buyRamHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        
        const ramSize = parseInt(body.split(' ')[1]);
        
        if (!ramSize || ramSize < 1 || ramSize > 30) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Masukkan ukuran RAM yang valid (1-30GB)\nContoh: .buyram 2',
                quoted: msg
            });
            return;
        }

        let crypto = await CryptoModel.findOne({ userId: senderJid });
        if (!crypto) {
            crypto = await CryptoModel.create({ userId: senderJid });
        }

        const user = await User.getUser(senderJid);
        const ramConfig = RAM_CONFIGS[ramSize];

        if (ramSize <= crypto.ram.size) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu sudah memiliki RAM yang sama atau lebih tinggi!',
                quoted: msg
            });
            return;
        }

        if (user.balance < ramConfig.price) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Kamu membutuhkan ${ramConfig.price.toLocaleString()} balance untuk membeli RAM ${ramSize}GB!\nBalance kamu saat ini: ${user.balance.toLocaleString()}`,
                quoted: msg
            });
            return;
        }

        // Update user balance and crypto RAM
        await User.updateUser(senderJid, {
            balance: user.balance - ramConfig.price
        });

        crypto.ram.size = ramSize;
        crypto.ram.efficiency = ramConfig.efficiency;
        await crypto.save();

        const upgradeText = `🎉 *RAM Berhasil Diupgrade!*
        
📦 RAM Sebelumnya: ${crypto.ram.size}GB
📦 RAM Baru: ${ramSize}GB

💰 Biaya: ${ramConfig.price.toLocaleString()} balance

⚡ Mining Stats Baru:
├ Success Rate: ${(ramConfig.efficiency * 100).toFixed(1)}%
├ Min Reward: ${ramConfig.minReward.toFixed(6)} COIN
└ Max Reward: ${ramConfig.maxReward.toFixed(6)} COIN`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: upgradeText,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in buyram handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat membeli RAM',
            quoted: msg
        });
    }
}

module.exports = {
    cryptoHandler,
    mineHandler,
    buyRamHandler
};