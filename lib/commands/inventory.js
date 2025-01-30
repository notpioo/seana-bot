// lib/commands/inventory.js
const logger = require('../utils/logger');
const InventoryModel = require('../../database/models/Inventory');
const User = require('../../database/models/User');
const CryptoModel = require('../../database/models/Crypto');

async function inventoryHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Get or create inventory
        let inventory = await InventoryModel.findOne({ userId: senderJid });
        if (!inventory) {
            inventory = await InventoryModel.create({
                userId: senderJid,
                boosts: [],
                activeBoosts: []
            });
        }

        // Get user data
        const user = await User.getUser(senderJid);
        if (!user) {
            throw new Error('User not found');
        }

        // Clean expired active boosts
        inventory.activeBoosts = inventory.activeBoosts.filter(
            boost => boost.expireAt > new Date()
        );
        await inventory.save();

        // Create inventory visualization
        let inventoryText = `╭───「 *BOOST INVENTORY* 」
│ Owner: ${user.username}
│ Items: ${inventory.boosts.length}
╰────────────────────\n`;

        // Show active boosts
        if (inventory.activeBoosts.length > 0) {
            inventoryText += '\n▸ *Active Boosts*\n';
            inventory.activeBoosts.forEach(boost => {
                const timeLeft = Math.ceil((new Date(boost.expireAt) - new Date()) / (1000 * 60));
                inventoryText += `├ ${getBoostEmoji(boost.type)} ${boost.type.toUpperCase()} ×${boost.multiplier}\n`;
                inventoryText += `│ └ Expires in: ${formatTime(timeLeft)}\n`;
            });
        }

        // Show stored boosts
        if (inventory.boosts.length > 0) {
            inventoryText += '\n▸ *Stored Boosts*\n';
            inventory.boosts.forEach((boost, index) => {
                inventoryText += `${index + 1}. ${getBoostEmoji(boost.type)} ${boost.name}\n`;
                inventoryText += `   ├ Effect: ${boost.type.toUpperCase()} ×${boost.multiplier}\n`;
                inventoryText += `   ├ Duration: ${formatTime(boost.duration)}\n`;
                inventoryText += `   └ Quantity: ${boost.quantity}x\n`;
            });
        }

        if (inventory.boosts.length === 0) {
            inventoryText += '\n📪 Kamu tidak memiliki boost.\n';
        }

        inventoryText += `\n╭───「 *COMMANDS* 」
│ • .use <boost_number>
│ • .boostinfo (belom bisa)
╰────────────────────`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: inventoryText,
            quoted: msg
        });

    } catch (error) {
        logger.error('Error in inventory handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses inventory',
            quoted: msg
        });
    }
}

function getBoostEmoji(type) {
    const emojis = {
        'limit': '🎯',
        'balance': '💰',
        'exp': '⭐'
    };
    return emojis[type] || '📦';
}

function formatTime(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return `${hours}h ${remainingMinutes}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
}

async function useBoostHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        
        const boostNumber = parseInt(body.split(' ')[1]);
        if (isNaN(boostNumber)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Masukkan nomor boost yang ingin digunakan\nContoh: .use 1',
                quoted: msg
            });
            return;
        }

        let inventory = await InventoryModel.findOne({ userId: senderJid });
        if (!inventory || !inventory.boosts[boostNumber - 1]) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Boost tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        const boost = inventory.boosts[boostNumber - 1];

        // Handle cdcrypto boost
        if (boost.type === 'cdcrypto') {
            let crypto = await CryptoModel.findOne({ userId: senderJid });
            if (crypto) {
                crypto.lastMining = null; // Reset mining cooldown
                await crypto.save();
                
                // Remove the used boost
                inventory.boosts.splice(boostNumber - 1, 1);
                await inventory.save();

                await sock.sendMessage(msg.key.remoteJid, {
                    text: '✅ Mining cooldown telah direset! Kamu bisa mining lagi sekarang.',
                    quoted: msg
                });
            }
        }
        // Handle other boost types here if needed

    } catch (error) {
        console.error('Error in use boost handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menggunakan boost',
            quoted: msg
        });
    }
}

module.exports = {
    inventoryHandler,
    useBoostHandler
};