
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
        const [cmd, plantName, amount] = msg.message?.conversation?.split(' ') || 
                                       msg.message?.extendedTextMessage?.text?.split(' ') || [];
        
        if (!plantName || !amount) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan: .plant <nama_tanaman> <jumlah>',
                quoted: msg
            });
            return;
        }

        const farm = await initFarm(senderJid);
        if (!farm) return;

        const seed = farm.seeds.find(s => s.name === plantName);
        if (!seed || seed.quantity < parseInt(amount)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Benih tidak cukup!',
                quoted: msg
            });
            return;
        }

        const usedSlots = farm.plants.reduce((acc, plant) => acc + plant.quantity, 0);
        if (usedSlots + parseInt(amount) > farm.slots) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Slot tanah tidak cukup!',
                quoted: msg
            });
            return;
        }

        // Plant the seeds
        seed.quantity -= parseInt(amount);
        farm.plants.push({
            name: plantName,
            plantedAt: new Date(),
            quantity: parseInt(amount),
            slot: usedSlots + 1
        });

        await farm.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil menanam ${amount} ${plantName}!`,
            quoted: msg
        });

    } catch (error) {
        logger.error('Error in plant handler:', error);
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
