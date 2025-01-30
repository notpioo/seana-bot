// handlers/inventory.js
const User = require('../../database/models/User');
const Inventory = require('../../database/models/Inventory');

async function inventoryHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Get or create inventory
        let inventory = await Inventory.findOne({ userId: senderJid });
        if (!inventory) {
            inventory = await Inventory.create({
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
                const timeLeft = Math.ceil((boost.expireAt - new Date()) / (1000 * 60)); // in minutes
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
            inventoryText += '\n📪 You have no boost items.';
        }

        inventoryText += `\n╭───「 *COMMANDS* 」
│ • .use <boost_number>
│ • .boostinfo <boost_number>
╰────────────────────`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: inventoryText,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in inventory handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses inventory',
            quoted: msg
        });
    }
}

// Utility functions
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

module.exports = {
    inventoryHandler,
    Inventory
};