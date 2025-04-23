
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
        const user = await User.getUser(userId);
        if (!user) {
            logger.error('User not found:', userId);
            return null;
        }

        // Use full JID as unique identifier to ensure each user has their own farm
        let farm = await Farm.findOne({ userId: userId });
        if (!farm) {
            farm = await Farm.create({
                userId: userId, // Store full JID
                seeds: [{ name: 'wortel', quantity: 5 }]
            });
            logger.info(`New farm created for user: ${userId}`);
        }
        return farm;
    } catch (error) {
        logger.error('Error initializing farm:', error);
        return null;
    }
}

async function farmHandler(sock, msg) {
    try {
        // Get the actual sender's JID, handling both private and group chats
        const senderJid = msg.key.fromMe ? msg.key.remoteJid : (msg.key.participant || msg.key.remoteJid);
        const user = await User.getUser(senderJid);
        
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Silahkan daftar terlebih dahulu dengan mengetik .register <nama>',
                quoted: msg
            });
            return;
        }

        // Initialize farm with sender's JID to ensure each user has their own farm
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

        const ownerNumber = (msg.key.participant || msg.key.remoteJid).split('@')[0];
        const dashboard = `🌾 *FARM DASHBOARD*\n\n` +
            `👤 Pemilik: @${ownerNumber}\n` +
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

async function farmBagHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const farm = await initFarm(senderJid);
        
        if (!farm) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum memiliki farm!',
                quoted: msg
            });
            return;
        }

        // Format inventory crops
        let inventoryText = '🎒 *FARM INVENTORY*\n\n';
        
        // Group crops by tier
        const cropsByTier = {};
        farm.inventory.crops.forEach(crop => {
            if (!cropsByTier[crop.tier]) {
                cropsByTier[crop.tier] = [];
            }
            cropsByTier[crop.tier].push(crop);
        });

        // Display crops by tier
        const tiers = ['common', 'rare', 'epic', 'legendary', 'mythical', 'divine'];
        const tierEmojis = {
            'common': '⚪',
            'rare': '🔵',
            'epic': '🟣',
            'legendary': '🟡',
            'mythical': '🔴',
            'divine': '🟢'
        };

        tiers.forEach(tier => {
            if (cropsByTier[tier]?.length > 0) {
                inventoryText += `\n${tierEmojis[tier]} *${tier.toUpperCase()}*\n`;
                cropsByTier[tier].forEach(crop => {
                    inventoryText += `├ ${crop.name}\n`;
                    inventoryText += `│ ├ 📦 Jumlah: ${crop.quantity}\n`;
                    inventoryText += `│ └ ⚖️ Total Berat: ${crop.weight.toFixed(2)}kg\n`;
                });
            }
        });

        // Display seeds
        if (farm.seeds.length > 0) {
            inventoryText += '\n🌱 *SEEDS*\n';
            farm.seeds.forEach(seed => {
                inventoryText += `├ ${seed.name}\n`;
                inventoryText += `│ └ 📦 Jumlah: ${seed.quantity}\n`;
            });
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: inventoryText,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in farm bag handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menampilkan inventory',
            quoted: msg
        });
    }
}

async function farmShopHandler(sock, msg) {
    try {
        const shopText = `🏪 *FARM SHOP*\n\n` +
            Object.entries(PLANTS).map(([name, plant]) => 
                `${name.toUpperCase()}\n` +
                `├ 💰 Harga Benih: ${plant.seedPrice}\n` +
                `├ 🌱 Waktu Tumbuh: ${plant.growthTime}s\n` +
                `├ ⭐ Tier: ${plant.tier}\n` +
                `└ 📈 XP: ${plant.xpGain}\n`
            ).join('\n');

        await sock.sendMessage(msg.key.remoteJid, {
            text: shopText + '\nGunakan .buy <nama_tanaman> <jumlah> untuk membeli benih',
            quoted: msg
        });

    } catch (error) {
        console.error('Error in farm shop handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menampilkan shop',
            quoted: msg
        });
    }
}

module.exports = {
    farmHandler,
    plantHandler,
    harvestHandler,
    farmBagHandler,
    farmShopHandler
};
