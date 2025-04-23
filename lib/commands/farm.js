
const Farm = require('../../database/models/Farm');
const logger = require('../utils/logger');

const PLANTS = {
    wortel: {
        growthTime: 10, // dalam detik
        minWeight: 0.20,
        maxWeight: 15.00,
        price: 100
    },
    // Tambahkan tanaman lain di sini
};

async function initFarm(userId) {
    try {
        let farm = await Farm.findOne({ userId });
        if (!farm) {
            farm = await Farm.create({
                userId,
                seeds: [{ name: 'wortel', quantity: 5 }]
            });
        }
        return farm;
    } catch (error) {
        logger.error('Error initializing farm:', error);
        return null;
    }
}

async function plantHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const [cmd, ...args] = messageText.trim().split(/\s+/);
        
        // Parse command arguments
        const plantName = args[0]?.toLowerCase();
        const amount = parseInt(args[1]);

        if (!plantName || isNaN(amount) || amount <= 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan: .plant <nama_tanaman> <jumlah>\nContoh: .plant wortel 5',
                quoted: msg
            });
            return;
        }

        // Validate plant exists in PLANTS
        if (!PLANTS[plantName]) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Tanaman "${plantName}" tidak tersedia!\nTanaman yang tersedia: ${Object.keys(PLANTS).join(', ')}`,
                quoted: msg
            });
            return;
        }

        // Get or create farm
        let farm = await initFarm(senderJid);
        if (!farm) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Terjadi kesalahan saat mengakses farm',
                quoted: msg
            });
            return;
        }

        // Find seed in inventory
        const seedIndex = farm.seeds.findIndex(s => s.name === plantName);
        if (seedIndex === -1 || farm.seeds[seedIndex].quantity < amount) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Benih tidak cukup! Kamu memiliki ${seedIndex === -1 ? 0 : farm.seeds[seedIndex].quantity} benih ${plantName}`,
                quoted: msg
            });
            return;
        }

        // Check available slots
        const usedSlots = farm.plants.reduce((acc, plant) => acc + plant.quantity, 0);
        if (usedSlots + amount > farm.slots) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Slot tanah tidak cukup! (${usedSlots}/${farm.slots} terpakai)`,
                quoted: msg
            });
            return;
        }

        // Update seeds quantity
        if (farm.seeds[seedIndex].quantity === amount) {
            farm.seeds.splice(seedIndex, 1);
        } else {
            farm.seeds[seedIndex].quantity -= amount;
        }

        // Add plants
        farm.plants.push({
            name: plantName,
            plantedAt: new Date(),
            quantity: amount,
            slot: usedSlots + 1
        });

        await farm.save();

        const plantInfo = PLANTS[plantName];
        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil menanam ${amount} ${plantName}!\n⏳ Waktu panen: ${plantInfo.growthTime} detik`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in plant handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menanam',
            quoted: msg
        });
    }
}

async function harvestHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const farm = await initFarm(senderJid);
        if (!farm) return;

        const now = new Date();
        const readyToHarvest = farm.plants.filter(plant => {
            const growthTime = PLANTS[plant.name].growthTime * 1000; // convert to ms
            return (now - new Date(plant.plantedAt)) >= growthTime;
        });

        if (readyToHarvest.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada tanaman yang siap panen!',
                quoted: msg
            });
            return;
        }

        let harvestReport = '🌾 *HASIL PANEN*\n\n';
        let totalEarnings = 0;

        readyToHarvest.forEach(plant => {
            const plantInfo = PLANTS[plant.name];
            const harvests = [];

            for (let i = 0; i < plant.quantity; i++) {
                const weight = +(Math.random() * (plantInfo.maxWeight - plantInfo.minWeight) + plantInfo.minWeight).toFixed(2);
                const earnings = Math.floor(weight * plantInfo.price);
                totalEarnings += earnings;
                harvests.push(`${weight}kg (${earnings} coins)`);
            }

            harvestReport += `${plant.name.toUpperCase()}:\n${harvests.join('\n')}\n\n`;
        });

        // Remove harvested plants and add coins
        farm.plants = farm.plants.filter(plant => !readyToHarvest.includes(plant));
        farm.coins += totalEarnings;
        await farm.save();

        harvestReport += `💰 Total: ${totalEarnings} coins`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: harvestReport,
            quoted: msg
        });

    } catch (error) {
        logger.error('Error in harvest handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memanen',
            quoted: msg
        });
    }
}

module.exports = {
    plantHandler,
    harvestHandler
};
