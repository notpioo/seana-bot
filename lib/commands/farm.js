
const Farm = require('../../database/models/Farm');
const User = require('../../database/models/User');
const logger = require('../utils/logger');

const PLANTS = {
    // Common Tier
    wortel: {
        tier: 'common',
        growthTime: 10,
        minWeight: 0.20,
        maxWeight: 2.00,
        seedPrice: 100,
        basePrice: 100,
        xpGain: 5
    },
    jagung: {
        tier: 'common',
        growthTime: 15,
        minWeight: 0.30,
        maxWeight: 2.50,
        seedPrice: 120,
        basePrice: 120,
        xpGain: 6
    },
    // Rare Tier
    tomat: {
        tier: 'rare',
        growthTime: 20,
        minWeight: 0.40,
        maxWeight: 3.00,
        seedPrice: 200,
        basePrice: 200,
        xpGain: 10
    },
    // Epic Tier
    anggur: {
        tier: 'epic',
        growthTime: 30,
        minWeight: 0.50,
        maxWeight: 4.00,
        seedPrice: 400,
        basePrice: 400,
        xpGain: 20
    },
    // Legendary Tier
    apel: {
        tier: 'legendary',
        growthTime: 45,
        minWeight: 0.75,
        maxWeight: 5.00,
        seedPrice: 800,
        basePrice: 800,
        xpGain: 40
    },
    // Mythical Tier
    nanas: {
        tier: 'mythical',
        growthTime: 60,
        minWeight: 1.00,
        maxWeight: 6.00,
        seedPrice: 1600,
        basePrice: 1600,
        xpGain: 80
    },
    // Divine Tier
    mangga: {
        tier: 'divine',
        growthTime: 90,
        minWeight: 1.50,
        maxWeight: 8.00,
        seedPrice: 3200,
        basePrice: 3200,
        xpGain: 160
    }
};

async function initFarm(userId) {
    try {
        // Extract pure number from JID
        const userNumber = userId.split('@')[0];
        
        const user = await User.getUser(userId);
        if (!user) {
            logger.error('User not found:', userNumber);
            return null;
        }

        // Use phone number as unique identifier
        let farm = await Farm.findOne({ userId: userNumber });
        if (!farm) {
            farm = await Farm.create({
                userId: userNumber,
                seeds: [{ name: 'wortel', quantity: 5 }]
            });
            logger.info(`New farm created for user: ${userNumber}`);
        }
        return farm;
    } catch (error) {
        logger.error('Error initializing farm:', error);
        return null;
    }
}

async function farmHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const user = await User.getUser(senderJid);
        
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Silahkan daftar terlebih dahulu dengan mengetik .register <nama>',
                quoted: msg
            });
            return;
        }

        const farm = await initFarm(senderJid);
        
        if (!farm) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum memiliki farm!',
                quoted: msg
            });
            return;
        }

        // Count active plants
        const activePlants = {};
        farm.plants.forEach(plant => {
            if (!activePlants[plant.name]) {
                activePlants[plant.name] = 0;
            }
            activePlants[plant.name] += plant.quantity;
        });

        // Create active plants text
        const activePlantsText = Object.entries(activePlants)
            .map(([name, count]) => `🌱 ${name}: ${count}`)
            .join('\n');

        const dashboard = `🌾 *FARM DASHBOARD*\n\n` +
            `👤 Pemilik: @${senderJid.split('@')[0]}\n` +
            `👨‍🌾 Level: ${farm.level || 1}\n` +
            `💰 Farm Coins: ${farm.coins}\n` +
            `🏡 Slot Tanah: ${farm.slots}\n\n` +
            `*Benih yang dimiliki:*\n` +
            farm.seeds.map(seed => `🌱 ${seed.name}: ${seed.quantity}`).join('\n') + '\n\n' +
            `*Tanaman Aktif:*\n${activePlantsText || 'Tidak ada tanaman yang ditanam'}`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: dashboard,
            mentions: [senderJid],
            quoted: msg
        });

    } catch (error) {
        console.error('Error in farm handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menampilkan farm',
            quoted: msg
        });
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
        // Generate land slots visualization
        const totalSlots = farm.slots;
        const totalUsedSlots = farm.plants.reduce((acc, plant) => acc + plant.quantity, 0);
        const slotsEmoji = '🟫'.repeat(totalSlots);

        // Generate active plants status
        const plantStatus = farm.plants.map(plant => {
            const timeLeft = Math.max(0, PLANTS[plant.name].growthTime - 
                Math.floor((Date.now() - new Date(plant.plantedAt).getTime()) / 1000));
            return `${plant.name} x${plant.quantity} (⏳ ${timeLeft}s)`;
        }).join('\n');

        await sock.sendMessage(msg.key.remoteJid, {
            text: `*FARM SLOTS*\n${slotsEmoji}\n\n*Tanaman Aktif:*\n${plantStatus}\n\n✅ Berhasil menanam ${amount} ${plantName}!`,
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
        let totalXP = 0;

        readyToHarvest.forEach(plant => {
            const plantInfo = PLANTS[plant.name];
            const harvests = [];

            for (let i = 0; i < plant.quantity; i++) {
                // Calculate weight with diminishing probability for higher weights
                const rand = Math.random();
                const weightRange = plantInfo.maxWeight - plantInfo.minWeight;
                const weight = +(plantInfo.minWeight + (weightRange * Math.pow(rand, 2))).toFixed(2);
                
                // Add to inventory
                const existingCrop = farm.inventory.crops.find(c => c.name === plant.name);
                if (existingCrop) {
                    existingCrop.quantity += 1;
                    existingCrop.weight += weight;
                } else {
                    farm.inventory.crops.push({
                        name: plant.name,
                        quantity: 1,
                        weight: weight,
                        tier: plantInfo.tier
                    });
                }

                harvests.push(`${weight}kg (${plantInfo.tier})`);
                totalXP += plantInfo.xpGain;
            }

            harvestReport += `${plant.name.toUpperCase()}:\n${harvests.join('\n')}\n\n`;
        });

        // Remove harvested plants and add XP
        farm.plants = farm.plants.filter(plant => !readyToHarvest.includes(plant));
        farm.xp += totalXP;

        // Level up check
        const xpNeeded = farm.level * 100;
        if (farm.xp >= xpNeeded) {
            farm.level += 1;
            farm.xp -= xpNeeded;
            harvestReport += `🎉 Level Up! Sekarang level ${farm.level}\n`;
        }

        await farm.save();

        harvestReport += `✨ XP didapat: ${totalXP}\n`;
        harvestReport += `📊 Progress Level: ${farm.xp}/${farm.level * 100} XP`;

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
    farmHandler,
    plantHandler,
    harvestHandler
};
