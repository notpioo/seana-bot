const Farm = require('../../database/models/Farm');
const User = require('../../database/models/User');
const logger = require('../utils/logger');

const PLANTS = {
    // Common Tier
    wortel: {
        tier: 'common',
        growthTime: 30,
        minWeight: 0.80,
        maxWeight: 2.50,
        seedPrice: 100,
        basePrice: 80,
        xpGain: 3,
        maxHarvest: 2
    },
    kentang: {
        tier: 'common',
        growthTime: 35,
        minWeight: 0.60,
        maxWeight: 2.00,
        seedPrice: 110,
        basePrice: 85,
        xpGain: 3,
        maxHarvest: 2
    },
    jagung: {
        tier: 'common',
        growthTime: 40,
        minWeight: 0.70,
        maxWeight: 2.20,
        seedPrice: 120,
        basePrice: 90,
        xpGain: 4,
        maxHarvest: 2
    },
    kubis: {
        tier: 'common',
        growthTime: 45,
        minWeight: 0.75,
        maxWeight: 2.30,
        seedPrice: 130,
        basePrice: 95,
        xpGain: 4,
        maxHarvest: 2
    },
    bawang: {
        tier: 'common',
        growthTime: 50,
        minWeight: 0.50,
        maxWeight: 1.80,
        seedPrice: 90,
        basePrice: 75,
        xpGain: 3,
        maxHarvest: 2
    },
    // Rare Tier
    tomat: {
        tier: 'rare',
        growthTime: 60,
        minWeight: 1.00,
        maxWeight: 3.50,
        seedPrice: 300,
        basePrice: 200,
        xpGain: 7,
        maxHarvest: 2
    },
    terong: {
        tier: 'rare',
        growthTime: 65,
        minWeight: 0.90,
        maxWeight: 3.20,
        seedPrice: 320,
        basePrice: 210,
        xpGain: 7,
        maxHarvest: 2
    },
    labu: {
        tier: 'rare',
        growthTime: 70,
        minWeight: 0.95,
        maxWeight: 3.40,
        seedPrice: 340,
        basePrice: 220,
        xpGain: 8,
        maxHarvest: 2
    },
    paprika: {
        tier: 'rare',
        growthTime: 75,
        minWeight: 0.85,
        maxWeight: 3.10,
        seedPrice: 280,
        basePrice: 190,
        xpGain: 9,
        maxHarvest: 2
    },
    timun: {
        tier: 'rare',
        growthTime: 55,
        minWeight: 0.80,
        maxWeight: 3.00,
        seedPrice: 260,
        basePrice: 180,
        xpGain: 8,
        maxHarvest: 3
    },
    // Epic Tier
    anggur: {
        tier: 'epic',
        growthTime: 90,
        minWeight: 1.20,
        maxWeight: 4.00,
        seedPrice: 600,
        basePrice: 350,
        xpGain: 15,
        maxHarvest: 2
    },
    jeruk: {
        tier: 'epic',
        growthTime: 95,
        minWeight: 1.25,
        maxWeight: 4.20,
        seedPrice: 650,
        basePrice: 375,
        xpGain: 16,
        maxHarvest: 2
    },
    lemon: {
        tier: 'epic',
        growthTime: 100,
        minWeight: 1.15,
        maxWeight: 3.80,
        seedPrice: 550,
        basePrice: 325,
        xpGain: 14,
        maxHarvest: 3
    },
    pisang: {
        tier: 'epic',
        growthTime: 105,
        minWeight: 1.30,
        maxWeight: 4.50,
        seedPrice: 700,
        basePrice: 400,
        xpGain: 17,
        maxHarvest: 2
    },
    kiwi: {
        tier: 'epic',
        growthTime: 110,
        minWeight: 1.10,
        maxWeight: 3.70,
        seedPrice: 500,
        basePrice: 300,
        xpGain: 13,
        maxHarvest: 3
    },
    // Legendary Tier
    apel: {
        tier: 'legendary',
        growthTime: 180,
        minWeight: 0.75,
        maxWeight: 4.00,
        seedPrice: 1600,
        basePrice: 800,
        xpGain: 26,
        maxHarvest: 2
    },
    pir: {
        tier: 'legendary',
        growthTime: 190,
        minWeight: 0.80,
        maxWeight: 4.20,
        seedPrice: 1700,
        basePrice: 850,
        xpGain: 26,
        maxHarvest: 2
    },
    persik: {
        tier: 'legendary',
        growthTime: 200,
        minWeight: 0.70,
        maxWeight: 3.80,
        seedPrice: 1500,
        basePrice: 750,
        xpGain: 25,
        maxHarvest: 3
    },
    plum: {
        tier: 'legendary',
        growthTime: 210,
        minWeight: 0.85,
        maxWeight: 4.50,
        seedPrice: 1800,
        basePrice: 900,
        xpGain: 24,
        maxHarvest: 2
    },
    ceri: {
        tier: 'legendary',
        growthTime: 170,
        minWeight: 0.65,
        maxWeight: 3.60,
        seedPrice: 1400,
        basePrice: 700,
        xpGain: 26,
        maxHarvest: 3
    },
    // Mythical Tier
    nanas: {
        tier: 'mythical',
        growthTime: 300,
        minWeight: 1.00,
        maxWeight: 5.00,
        seedPrice: 3200,
        basePrice: 1600,
        xpGain: 40,
        maxHarvest: 2
    },
    kelapa: {
        tier: 'mythical',
        growthTime: 320,
        minWeight: 1.20,
        maxWeight: 5.50,
        seedPrice: 3500,
        basePrice: 1750,
        xpGain: 40,
        maxHarvest: 2
    },
    durian: {
        tier: 'mythical',
        growthTime: 340,
        minWeight: 1.50,
        maxWeight: 6.00,
        seedPrice: 3800,
        basePrice: 1900,
        xpGain: 45,
        maxHarvest: 1
    },
    manggis: {
        tier: 'mythical',
        growthTime: 280,
        minWeight: 0.90,
        maxWeight: 4.80,
        seedPrice: 3000,
        basePrice: 1500,
        xpGain: 45,
        maxHarvest: 2
    },
    rambutan: {
        tier: 'mythical',
        growthTime: 260,
        minWeight: 0.80,
        maxWeight: 4.50,
        seedPrice: 2800,
        basePrice: 1200,
        xpGain: 30,
        maxHarvest: 3
    },
    // Divine Tier
    mangga: {
        tier: 'divine',
        growthTime: 480,
        minWeight: 1.50,
        maxWeight: 7.00,
        seedPrice: 6400,
        basePrice: 3200,
        xpGain: 65,
        maxHarvest: 2
    },
    alpukat: {
        tier: 'divine',
        growthTime: 520,
        minWeight: 1.80,
        maxWeight: 7.50,
        seedPrice: 7000,
        basePrice: 3500,
        xpGain: 65,
        maxHarvest: 2
    },
    sawo: {
        tier: 'divine',
        growthTime: 540,
        minWeight: 1.60,
        maxWeight: 7.20,
        seedPrice: 6800,
        basePrice: 3400,
        xpGain: 65,
        maxHarvest: 2
    },
    sukun: {
        tier: 'divine',
        growthTime: 560,
        minWeight: 2.00,
        maxWeight: 8.00,
        seedPrice: 7500,
        basePrice: 3750,
        xpGain: 70,
        maxHarvest: 1
    },
    sirsak: {
        tier: 'divine',
        growthTime: 500,
        minWeight: 1.70,
        maxWeight: 7.30,
        seedPrice: 6600,
        basePrice: 3300,
        xpGain: 70,
        maxHarvest: 2
    }
};

// Global shop state
let shopStock = {};
let lastRefresh = Date.now();
const REFRESH_INTERVAL = 150000; // 2.5 minutes

// Initialize shop stock immediately
refreshStock(true);

// Initialize shop refresh interval
setInterval(() => {
    refreshStock(true);
}, REFRESH_INTERVAL);

function refreshStock(force = false) {
    const now = Date.now();
    if (force || now - lastRefresh >= REFRESH_INTERVAL) {
        // Reset stock
        shopStock = {};

        // Tier chances
        const tierChances = {
            'common': 0.40,    // 40% chance
            'rare': 0.30,      // 30% chance
            'epic': 0.15,      // 15% chance
            'legendary': 0.10, // 10% chance
            'mythical': 0.04,  // 4% chance
            'divine': 0.01     // 1% chance
        };

        // Generate random total stock between 35-60
        const totalStock = Math.floor(Math.random() * 26) + 35;
        let remainingStock = totalStock;

        // Group plants by tier
        const plantsByTier = {};
        Object.entries(PLANTS).forEach(([name, plant]) => {
            if (!plantsByTier[plant.tier]) {
                plantsByTier[plant.tier] = [];
            }
            plantsByTier[plant.tier].push(name);
        });

        // Add stock based on tier chances
        const tiers = ['common', 'rare', 'epic', 'legendary', 'mythical', 'divine'];
        const shopItems = {};

        tiers.forEach(tier => {
            if (plantsByTier[tier]) {
                const tierPlants = plantsByTier[tier];
                const plantsToAdd = Math.min(Math.floor(Math.random() * 3) + 1, tierPlants.length); //1-3 plants or less if tierPlants.length is less

                for (let i = 0; i < plantsToAdd && remainingStock > 0; i++) {
                    const randomIndex = Math.floor(Math.random() * tierPlants.length);
                    const plantName = tierPlants[randomIndex];
                    const stock = Math.floor(Math.random() * Math.min(remainingStock, 15)) + 1;
                    shopItems[plantName] = stock;
                    remainingStock -= stock;
                }
            }
        });


        // Limit to max 6 items
        const sortedShopItems = Object.entries(shopItems)
            .sort(([, stockA], [, stockB]) => stockB - stockA) //Sort by stock in descending order
            .slice(0, 6) // Take the top 6
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});


        shopStock = sortedShopItems;

        lastRefresh = now;
    }
}

const WEATHER_TYPES = {
    'rain': { name: 'Hujan', description: 'Mempercepat pertumbuhan tanaman sebesar 20%' },
    'storm': { name: 'Badai', description: '20% tanaman dapat hancur' },
    'sun': { name: 'Panas', description: 'Kondisi cuaca normal' },
    'snow': { name: 'Salju', description: 'Memperlambat pertumbuhan tanaman sebesar 50%' },
    'blessing': { name: 'Blessing', description: 'Meningkatkan kesempatan mendapatkan diamond' },
    'fog': { name: 'Kabut', description: 'Tidak berpengaruh pada pertumbuhan tanaman'}
};

let currentWeather = generateWeather();
setInterval(() => {
    currentWeather = generateWeather();
}, (Math.random() * 2) * 60000 + 300000); // 5-7 minutes

function generateWeather() {
    const weatherTypes = Object.keys(WEATHER_TYPES);
    const randomType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    const duration = (Math.random() * 2 + 5) * 60 * 1000; // 5-7 minutes in milliseconds
    return {
        type: randomType,
        startTime: Date.now(),
        endTime: Date.now() + duration
    };
}

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
                seeds: [{ name: 'wortel', quantity: 5 }],
                coins: 0, // Initialize farm coins
                inventory: { crops: [] }, // Initialize empty inventory
                stats: { totalProfit: 0 },
                slots: 5,
                plants: [],
                level: 1,
                xp: 0,
                diamonds: 0
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

        // Create active plants text with countdown
        const activePlantsText = farm.plants.map(plant => {
            const plantInfo = PLANTS[plant.name];
            let growthTime = plantInfo.growthTime * 1000; // Convert to ms

            // Apply weather effects
            if (currentWeather.type === 'rain') {
                growthTime *= 0.8; // 20% faster
            } else if (currentWeather.type === 'snow') {
                growthTime *= 1.5; // 50% slower
            }

            const timeLeft = Math.max(0, Math.ceil((growthTime - (Date.now() - new Date(plant.plantedAt).getTime())) / 1000));
            return `🌱 ${plant.name} (x${plant.quantity}) ⏳ ${timeLeft}s`;
        }).join('\n');

        const ownerNumber = (msg.key.participant || msg.key.remoteJid).split('@')[0];
        const weather = WEATHER_TYPES[currentWeather.type];
        const timeLeft = Math.max(0, Math.floor((currentWeather.endTime - Date.now()) / 1000));

        const dashboard = `🌾 *FARM DASHBOARD*\n\n` +
            `👤 Pemilik: @${ownerNumber}\n` +
            `👨‍🌾 Level: ${farm.level || 1}\n` +
            `💰 Farm Coins: ${farm.coins}\n` +
            `💎 Farm Diamonds: ${farm.diamonds || 0}\n` +
            `🏡 Slot Tanah: ${farm.slots}\n\n` +
            `*Cuaca Saat Ini:*\n` +
            `${weather.name}\n` +
            `└ ${weather.description}\n` +
            `⏳ Berakhir dalam: ${timeLeft}s\n\n` +
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
        const farm = await initFarm(senderJid);
        if (!farm) return;

        const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const [cmd, ...args] = messageText.trim().split(/\s+/);

        // Parse command arguments
        const plantName = args[0]?.toLowerCase();
        const amount = parseInt(args[1]);

        if (!plantName || isNaN(amount) || amount <= 0) {
            // Generate slots visualization
            const totalSlots = farm.slots;
            let slotsVisual = '';
            for (let i = 0; i < totalSlots; i++) {
                const plantInSlot = farm.plants.find(p => p.slot <= i + 1 && p.slot + p.quantity > i + 1);
                const greenhouse = farm.greenhouse.find(gh => gh.slot === i + 1);
                slotsVisual += greenhouse ? '🏘️' : (plantInSlot ? '🌱' : '🟫');
            }

            // Generate active plants status
            const plantStatus = farm.plants.map(plant => {
                let growthTime = PLANTS[plant.name].growthTime;
                const greenhouse = farm.greenhouse.find(gh => gh.slot === plant.slot);
                
                if(greenhouse) {
                    growthTime *= (1 - greenhouse.growthBonus/100);
                }
                
                const timeLeft = Math.max(0, growthTime -
                    Math.floor((Date.now() - new Date(plant.plantedAt).getTime()) / 1000));
                
                const icon = greenhouse ? '🏘️' : '🌱';
                return `${icon} ${plant.name} x${plant.quantity} (⏳ ${timeLeft}s)${greenhouse ? ` [+${greenhouse.growthBonus}% speed]` : ''}`;
            }).join('\n');

            const message = `*FARM SLOTS*\n${slotsVisual}\n\n*Tanaman Aktif:*\n${plantStatus || 'Tidak ada tanaman'}\n\n❌ Format salah! Gunakan: .plant <nama_tanaman> <jumlah>\nContoh: .plant wortel 5`;
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: message,
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
        // Generate slots visualization with plant indicators
        let slotsVisual = '';
        for (let i = 0; i < totalSlots; i++) {
            const plantInSlot = farm.plants.find(p => p.slot <= i + 1 && p.slot + p.quantity > i + 1);
            slotsVisual += plantInSlot ? '🌱' : '🟫';
        }

        // Generate active plants status
        const plantStatus = farm.plants.map(plant => {
            let growthTime = PLANTS[plant.name].growthTime;
            const greenhouse = farm.greenhouse.find(gh => gh.slot === plant.slot);
            
            if(greenhouse) {
                growthTime *= (1 - greenhouse.growthBonus/100); // Apply greenhouse bonus
            }
            
            const timeLeft = Math.max(0, growthTime -
                Math.floor((Date.now() - new Date(plant.plantedAt).getTime()) / 1000));
            
            const icon = greenhouse ? '🏘️' : '🌱';
            return `${icon} ${plant.name} x${plant.quantity} (⏳ ${timeLeft}s)${greenhouse ? ` [+${greenhouse.growthBonus}% speed]` : ''}`;
        }).join('\n');

        await sock.sendMessage(msg.key.remoteJid, {
            text: `*FARM SLOTS*\n${slotsVisual}\n\n*Tanaman Aktif:*\n${plantStatus}\n\n✅ Berhasil menanam ${amount} ${plantName}!`,
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
            let growthTime = PLANTS[plant.name].growthTime * 1000; // convert to ms

            // Apply weather effects to growth time
            if (currentWeather.type === 'rain') {
                growthTime *= 0.8; // 20% faster
            } else if (currentWeather.type === 'snow') {
                growthTime *= 1.5; // 50% slower
            }

            return (now - new Date(plant.plantedAt)) >= growthTime;
        });

        // Handle storm weather effects
        if (currentWeather.type === 'storm') {
            const destroyedPlants = [];
            farm.plants = farm.plants.filter(plant => {
                if (Math.random() <= 0.2) {
                    destroyedPlants.push({ name: plant.name, quantity: plant.quantity });
                    return false;
                }
                return true;
            });
            if (destroyedPlants.length > 0) {
                let destroyedPlantsMessage = "⛈️ Tanaman rusak karena badai:\n";
                destroyedPlants.forEach(plant => {
                    destroyedPlantsMessage += `- ${plant.name} (x${plant.quantity})\n`;
                });
                await sock.sendMessage(msg.key.remoteJid, { text: destroyedPlantsMessage, quoted: msg });
            }
        }

        // Diamond chance based on tier (increased chances)
        const diamondChances = {
            'common': 0.03,    // 3% chance
            'rare': 0.05,      // 5% chance
            'epic': 0.07,      // 7% chance
            'legendary': 0.10, // 10% chance
            'mythical': 0.15,  // 15% chance
            'divine': 0.20     // 20% chance
        };

        // Adjust diamond chances for blessing weather
        if (currentWeather.type === 'blessing') {
            Object.keys(diamondChances).forEach(tier => {
                diamondChances[tier] *= 1.2; // 20% increased chance
            });
        }


        if (readyToHarvest.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada tanaman yang siap panen!',
                quoted: msg
            });
            return;
        }

        let harvestReport = '🌾 *HASIL PANEN*\n\n';
        let totalXP = 0;
        let totalFarmCoins = 0;
        let totalDiamonds = 0; // Initialize total farm coins earned

        readyToHarvest.forEach(plant => {
            const plantInfo = PLANTS[plant.name];
            const harvests = [];

            for (let i = 0; i < plant.quantity; i++) {
                // Calculate number of items harvested (1 to maxHarvest)
                const harvestCount = Math.floor(Math.random() * plantInfo.maxHarvest) + 1;

                for (let j = 0; j < harvestCount; j++) {
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

                    // Check for diamond drop
                    if (Math.random() <= diamondChances[plantInfo.tier]) {
                        const diamondAmount = Math.floor(Math.random() * 3) + 1; // 1-3 diamonds
                        totalDiamonds += diamondAmount;
                        harvests.push(`${weight}kg (${plantInfo.tier}) + 💎${diamondAmount}`);
                    } else {
                        harvests.push(`${weight}kg (${plantInfo.tier})`);
                    }
                    totalXP += plantInfo.xpGain;
                }
            }

            harvestReport += `${plant.name.toUpperCase()}:\n${harvests.join('\n')}\n\n`;
        });

        // Remove harvested plants and add XP
        farm.plants = farm.plants.filter(plant => !readyToHarvest.includes(plant));
        farm.xp += totalXP;
        farm.diamonds += totalDiamonds;


        // Level up check
        const xpNeeded = Math.floor(farm.level * 250 * (1 + farm.level * 0.1)); // Increased XP requirement with level scaling
        if (farm.xp >= xpNeeded) {
            farm.level += 1;
            farm.xp -= xpNeeded;
            harvestReport += `🎉 Level Up! Sekarang level ${farm.level}\n`;
        }

        await farm.save();

        harvestReport += `✨ XP didapat: ${totalXP}\n`;
        harvestReport += `💎 Diamonds didapat: ${totalDiamonds}\n`;
        harvestReport += `📊 Progress Level: ${farm.xp}/${xpNeeded} XP`;

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
        refreshStock();

        // Calculate time until next refresh
        const timeLeft = Math.max(0, REFRESH_INTERVAL - (Date.now() - lastRefresh));
        const secondsLeft = Math.ceil(timeLeft / 1000);

        let shopText = `🏪 *FARM SHOP*\n⏰ Refresh dalam: ${secondsLeft} detik\n\n`;

        // Display available stock
        const tiers = ['common', 'rare', 'epic', 'legendary', 'mythical', 'divine'];
        tiers.forEach(tier => {
            const itemsInTier = Object.entries(shopStock).filter(([name, stock]) => PLANTS[name].tier === tier);
            if (itemsInTier.length > 0) {
                shopText += `⭐ ${tier.toUpperCase()}\n`;
                itemsInTier.forEach(([name, stock]) => {
                    const plant = PLANTS[name];
                    shopText += `${name.toUpperCase()}\n├ 💰 Harga Benih: ${plant.seedPrice} Farm Coins\n` + // Specify farm coins
                        `├ 🌱 Waktu Tumbuh: ${plant.growthTime}s\n` +
                        `├ 📦 Stock: ${stock}\n` +
                        `└ 📈 XP: ${plant.xpGain}\n\n`;
                });
            }
        });

        if (Object.keys(shopStock).length === 0) {
            shopText += "*Tidak ada stock tersedia saat ini*\n";
        }

        shopText += '\nGunakan .buy <nama_tanaman> <jumlah> untuk membeli benih';

        await sock.sendMessage(msg.key.remoteJid, {
            text: shopText,
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

async function buyHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const [cmd, plantName, amount] = messageText.trim().split(/\s+/);

        if (!plantName || !amount) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan: .fbuy <nama_tanaman> <jumlah>',
                quoted: msg
            });
            return;
        }

        const quantity = parseInt(amount);
        if (isNaN(quantity) || quantity <= 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Jumlah harus berupa angka positif!',
                quoted: msg
            });
            return;
        }

        // Check if plant exists in shop stock
        if (!shopStock[plantName]) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tanaman tidak tersedia di shop saat ini!',
                quoted: msg
            });
            return;
        }

        // Check stock availability
        if (shopStock[plantName] < quantity) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Stock tidak cukup! Tersedia: ${shopStock[plantName]}`,
                quoted: msg
            });
            return;
        }

        // Get user and farm data
        const user = await User.getUser(senderJid);
        const farm = await initFarm(senderJid);

        if (!user || !farm) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Terjadi kesalahan saat mengakses data',
                quoted: msg
            });
            return;
        }

        // Calculate total price
        const totalPrice = PLANTS[plantName].seedPrice * quantity;

        // Check user balance
        if (farm.coins < totalPrice) { // Use farm coins for payment
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Farm Coins tidak cukup! Dibutuhkan: ${totalPrice}`,
                quoted: msg
            });
            return;
        }

        // Update user balance
        farm.coins -= totalPrice; // Deduct farm coins from farm balance

        // Update shop stock
        shopStock[plantName] -= quantity;

        // Add seeds to farm inventory
        const seedIndex = farm.seeds.findIndex(s => s.name === plantName);
        if (seedIndex === -1) {
            farm.seeds.push({
                name: plantName,
                quantity: quantity
            });
        } else {
            farm.seeds[seedIndex].quantity += quantity;
        }

        await farm.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil membeli ${quantity} benih ${plantName}!\n💰 -${totalPrice} Farm Coins`, // Specify farm coins
            quoted: msg
        });

    } catch (error) {
        console.error('Error in buy handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat membeli benih',
            quoted: msg
        });
    }
}

async function sellAllHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const farm = await initFarm(senderJid);
        const user = await User.getUser(senderJid);

        if (!farm || !user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Terjadi kesalahan saat mengakses data',
                quoted: msg
            });
            return;
        }

        if (!farm.inventory.crops || farm.inventory.crops.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada hasil panen untuk dijual!',
                quoted: msg
            });
            return;
        }

        let totalProfit = 0;
        const soldItems = [];

        farm.inventory.crops.forEach(crop => {
            const plantInfo = PLANTS[crop.name];
            let sellMultiplier;
            switch(plantInfo.tier) {
                case 'common':
                    sellMultiplier = 1.2; // 120% dari base price
                    break;
                case 'rare':
                    sellMultiplier = 1.1; // 110% dari base price
                    break;
                case 'epic':
                    sellMultiplier = 1.0; // 100% dari base price
                    break;
                case 'legendary':
                    sellMultiplier = 0.85; // 85% dari base price
                    break;
                case 'mythical':
                    sellMultiplier = 0.70; // 70% dari base price
                    break;
                case 'divine':
                    sellMultiplier = 0.55; // 55% dari base price
                    break;
                default:
                    sellMultiplier = 0.6;
            }
            const profit = Math.floor(plantInfo.basePrice * crop.weight * sellMultiplier);
            totalProfit += profit;
            soldItems.push(`${crop.name} (${crop.weight.toFixed(2)}kg) - 💰${profit}`);
        });

        // Clear inventory
        farm.inventory.crops = [];
        farm.coins += totalProfit; // Add profit to farm coins
        //farm.stats.totalProfit += totalProfit;  //This line is no longer needed since we're using farm.coins directly.

        // Update user balance - No longer needed since we are using farm coins.
        //await User.updateUser(senderJid, {
        //    balance: user.balance + totalProfit
        //});

        await farm.save();

        const sellReport = `🌾 *HASIL PENJUALAN*\n\n${soldItems.join('\n')}\n\n💰 Total Farm Coins: ${totalProfit}`; // Specify farm coins

        await sock.sendMessage(msg.key.remoteJid, {
            text: sellReport,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in sell all handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menjual hasil panen',
            quoted: msg
        });
    }
}

async function fupgradeHandler(sock, msg){
    try{
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const farm = await initFarm(senderJid);
        if(!farm) return;

        const baseLandCost = 25000;
        const baseGreenhouseCost = 40000;
        const maxLandLevel = 10;
        
        const currentLandLevel = farm.landLevel || 0;
        const landCost = Math.floor(baseLandCost * (1 + currentLandLevel * 0.2));
        const greenhouseCost = Math.floor(baseGreenhouseCost * (1 + farm.greenhouse.length * 0.3));

        const upgradeOptions = [
            `🏡 Tanah (${currentLandLevel}/${maxLandLevel}): ${landCost} coins`,
            `🏘️ Greenhouse (${farm.greenhouse.length}/${farm.slots}): ${greenhouseCost} coins`
        ];
        
        const upgradeMessage = `🔧 *UPGRADE MENU*\n\n${upgradeOptions.join('\n')}\n\nKetik:\n.fupland - Upgrade tanah\n.fghouse - Upgrade greenhouse`;
        await sock.sendMessage(msg.key.remoteJid, { text: upgradeMessage, quoted: msg });

    } catch(error){
        console.error("Error in fupgrade handler:", error);
        await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error saat menampilkan upgrade", quoted: msg });
    }
}

async function fuplandHandler(sock, msg){
    try{
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const farm = await initFarm(senderJid);
        if(!farm) return;

        const maxLandLevel = 10;
        const currentLandLevel = farm.landLevel || 0;
        
        if(currentLandLevel >= maxLandLevel) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Level tanah sudah maksimal (${maxLandLevel})`, quoted: msg });
            return;
        }

        const upgradeCost = Math.floor(25000 * (1 + currentLandLevel * 0.2));
        if(farm.coins < upgradeCost){
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Koin tidak cukup! Butuh ${upgradeCost} coins`, quoted: msg });
            return;
        }

        farm.coins -= upgradeCost;
        farm.slots += 1;
        farm.landLevel = (farm.landLevel || 0) + 1;
        await farm.save();

        await sock.sendMessage(msg.key.remoteJid, { 
            text: `✅ Upgrade tanah berhasil!\n🏡 Level tanah: ${farm.landLevel}/${maxLandLevel}\n🌱 Slot tanah: ${farm.slots}`, 
            quoted: msg 
        });
    } catch(error){
        console.error("Error in fupland handler:", error);
        await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error saat mengupgrade tanah", quoted: msg });
    }
}

async function fghouseHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const farm = await initFarm(senderJid);
        if(!farm) return;

        if(farm.greenhouse.length >= farm.slots) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Semua slot sudah menjadi greenhouse!`, quoted: msg });
            return;
        }

        const upgradeCost = Math.floor(40000 * (1 + farm.greenhouse.length * 0.3));
        if(farm.coins < upgradeCost) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Koin tidak cukup! Butuh ${upgradeCost} coins`, quoted: msg });
            return;
        }

        const nextSlot = farm.greenhouse.length + 1;
        farm.coins -= upgradeCost;
        farm.greenhouse.push({
            slot: nextSlot,
            growthBonus: Math.floor(Math.random() * 21) + 10 // 10-30% bonus
        });
        await farm.save();

        await sock.sendMessage(msg.key.remoteJid, { 
            text: `✅ Greenhouse berhasil dibangun!\n🏘️ Total greenhouse: ${farm.greenhouse.length}/${farm.slots}`, 
            quoted: msg 
        });
    } catch(error) {
        console.error("Error in greenhouse handler:", error);
        await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error saat mengupgrade greenhouse", quoted: msg });
    }
}

module.exports = {
    farmHandler,
    plantHandler,
    harvestHandler,
    farmBagHandler,
    farmShopHandler,
    buyHandler,
    sellAllHandler,
    fupgradeHandler,
    fuplandHandler,
    fghouseHandler
};