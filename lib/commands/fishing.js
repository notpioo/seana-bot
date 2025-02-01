const Fish = require('../../database/models/Fish');
const User = require('../../database/models/User');

// Fish data constants
const FISH_DATA = {
    // Common (60%)
    common: {
        ikanMas: { name: "Ikan Mas", emoji: "🐟", price: 5 },
        lele: { name: "Lele", emoji: "🐟", price: 8 },
        mujair: { name: "Mujair", emoji: "🐟", price: 12 },
        nila: { name: "Nila", emoji: "🐟", price: 15 },
        bandeng: { name: "Bandeng", emoji: "🐟", price: 20 }
    },
    // Uncommon (25%)
    uncommon: {
        gurame: { name: "Gurame", emoji: "🐠", price: 30 },
        bawal: { name: "Bawal", emoji: "🐠", price: 35 },
        patin: { name: "Patin", emoji: "🐠", price: 40 },
        kakap: { name: "Kakap", emoji: "🐠", price: 50 },
        tongkol: { name: "Tongkol", emoji: "🐠", price: 60 }
    },
    // Rare (10%)
    rare: {
        salmon: { name: "Salmon", emoji: "🐡", price: 80 },
        tuna: { name: "Tuna", emoji: "🐡", price: 100 },
        kerapu: { name: "Kerapu", emoji: "🐡", price: 110 },
        tenggiri: { name: "Tenggiri", emoji: "🐡", price: 130 },
        baronang: { name: "Baronang", emoji: "🐡", price: 150 }
    },
    // Epic (4%)
    epic: {
        arwana: { name: "Arwana Super Red", emoji: "🎏", price: 250 },
        koi: { name: "Koi Platinum", emoji: "🎏", price: 280 },
        belida: { name: "Belida", emoji: "🎏", price: 300 },
        napoleon: { name: "Napoleon", emoji: "🎏", price: 325 },
        botia: { name: "Botia", emoji: "🎏", price: 400 }
    },
    // Legendary (1%)
    legendary: {
        pausBiru: { name: "Paus Biru", emoji: "🐋", price: 550 },
        hiuPaus: { name: "Hiu Paus", emoji: "🦈", price: 550 },
        arapaima: { name: "Arapaima", emoji: "🐋", price: 600 },
        megalodon: { name: "Megalodon", emoji: "🦈", price: 650 },
        coelacanth: { name: "Coelacanth", emoji: "🐋", price: 650 }
    }
};

const FISHING_RODS = {
    bambu: {
        name: "Pancingan Bambu",
        price: 0,
        rarities: ["common"],
        duration: 180000, // 3 minutes
        cooldown: 300000, // 5 minutes
        maxCatch: 1
    },
    kayu: {
        name: "Pancingan Kayu",
        price: 10000,
        rarities: ["common", "uncommon"],
        duration: 150000, // 2.5 minutes
        cooldown: 240000, // 4 minutes
        maxCatch: 2
    },
    fiber: {
        name: "Pancingan Fiber",
        price: 30000,
        rarities: ["common", "uncommon", "rare"],
        duration: 120000, // 2 minutes
        cooldown: 180000, // 3 minutes
        maxCatch: 2
    },
    carbon: {
        name: "Pancingan Carbon",
        price: 70000,
        rarities: ["uncommon", "rare", "epic"],
        duration: 90000, // 1.5 minutes
        cooldown: 120000, // 2 minutes
        maxCatch: 3
    },
    titanium: {
        name: "Pancingan Titanium",
        price: 100000,
        rarities: ["rare", "epic", "legendary"],
        duration: 60000, // 1 minute
        cooldown: 60000, // 1 minute
        maxCatch: 4
    }
};

// Fishing animation frames
const FISHING_ANIMATION = [
    "🎣 Casting line...",
    "🎣 Waiting for fish... ><>",
    "🎣 Something's nibbling! ><>",
    "🎣 Almost got it! ><>>",
    "🎣 Reeling in! ><>>>",
];

// Helper function to format numbers with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Helper function to get rarity color emoji
function getRaritySymbol(rarity) {
    switch(rarity) {
        case 'common': return '⚪';
        case 'uncommon': return '🟢';
        case 'rare': return '🔵';
        case 'epic': return '🟣';
        case 'legendary': return '🟡';
        default: return '⚪';
    }
}

// Helper function to get random fish based on rod type
function getRandomFish(rodType) {
    const rod = FISHING_RODS[rodType];
    const allowedRarities = rod.rarities;
    
    // Calculate rarity first
    let rarity;
    const rand = Math.random() * 100;
    if (allowedRarities.includes("legendary") && rand < 1) rarity = "legendary";
    else if (allowedRarities.includes("epic") && rand < 5) rarity = "epic";
    else if (allowedRarities.includes("rare") && rand < 15) rarity = "rare";
    else if (allowedRarities.includes("uncommon") && rand < 40) rarity = "uncommon";
    else rarity = "common";

    // Get random fish from that rarity
    const fishInRarity = Object.keys(FISH_DATA[rarity]);
    const randomFish = fishInRarity[Math.floor(Math.random() * fishInRarity.length)];
    return { key: randomFish, ...FISH_DATA[rarity][randomFish] };
}

async function startFishing(sock, msg) {
    const userId = msg.key.participant || msg.key.remoteJid;
    
    try {
        // Get user fishing data
        let fishData = await Fish.findOne({ userId });
        if (!fishData) {
            fishData = await Fish.create({ userId });
        }

        // Check cooldown
        const now = Date.now();
        const lastFished = fishData.stats.lastFished?.getTime() || 0;
        const rod = FISHING_RODS[fishData.equipment.currentRod];
        
        if (now - lastFished < rod.cooldown) {
            const remainingTime = Math.ceil((rod.cooldown - (now - lastFished)) / 1000);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `⏳ Tunggu ${remainingTime} detik lagi untuk memancing kembali!`,
                quoted: msg
            });
            return;
        }

        // Get current location data
        const location = FISHING_LOCATIONS[fishData.location.currentLocation || 'default'];
        
        // Check if location has time restrictions
        if (location.timeRestricted) {
            const currentHour = new Date().getHours();
            if (!location.availableHours.includes(currentHour)) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `🕒 Lokasi ${location.name} hanya bisa dipancing pada jam ${location.availableHours.join(', ')}!`,
                    quoted: msg
                });
                return;
            }
        }

        // Start fishing animation
        const fishingMsg = await sock.sendMessage(msg.key.remoteJid, {
            text: FISHING_ANIMATION[0],
            quoted: msg
        });

        // Animate fishing process
        for (let i = 1; i < FISHING_ANIMATION.length; i++) {
            await new Promise(resolve => setTimeout(resolve, rod.duration / FISHING_ANIMATION.length));
            await sock.sendMessage(msg.key.remoteJid, {
                edit: fishingMsg.key,
                text: FISHING_ANIMATION[i]
            });
        }

        // Catch fish
        const numCatch = Math.floor(Math.random() * rod.maxCatch) + 1;
        const catches = [];
        let totalValue = 0;

        for (let i = 0; i < numCatch; i++) {
            let fish;
            
            // Determine if catching location-exclusive fish
            if (location.exclusive && Math.random() < location.exclusiveChance) {
                fish = getRandomFishFromPool(location.exclusiveFish, fishData.equipment.currentRod);
            } else {
                // Merge location-specific fish with general pool if applicable
                const fishPool = location.additionalFish 
                    ? [...GENERAL_FISH_POOL, ...location.additionalFish]
                    : GENERAL_FISH_POOL;
                fish = getRandomFishFromPool(fishPool, fishData.equipment.currentRod);
            }

            // Apply location-specific bonuses
            if (location.priceMultiplier) {
                fish.price = Math.floor(fish.price * location.priceMultiplier);
            }

            catches.push(fish);
            totalValue += fish.price;
            
            // Update inventory
            fishData.inventory[fish.key]++;
            
            // Update stats
            fishData.stats.totalCatch++;
            fishData.stats[`${location.key}Catch`] = (fishData.stats[`${location.key}Catch`] || 0) + 1;
            if (["rare", "epic", "legendary"].includes(fish.rarity)) {
                fishData.stats[`${fish.rarity}Catch`]++;
            }
        }

        // Update last fished time and location stats
        fishData.stats.lastFished = new Date();
        fishData.location.visits = fishData.location.visits || {};
        fishData.location.visits[location.key] = (fishData.location.visits[location.key] || 0) + 1;
        await fishData.save();

        // Format catch message with location info
        const catchText = catches.map(fish => `${fish.emoji} ${fish.name} (${fish.price} balance)`).join("\n");
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎣 Hasil Memancing di ${location.name}:\n\n${catchText}\n\nTotal: ${totalValue} balance`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in fishing:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memancing',
            quoted: msg
        });
    }
}

// Helper function to get random fish from a specific pool
function getRandomFishFromPool(pool, rodType) {
    const totalWeight = pool.reduce((sum, fish) => sum + (fish.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const fish of pool) {
        random -= (fish.weight || 1);
        if (random <= 0) {
            return {
                ...fish,
                price: calculatePrice(fish, rodType)
            };
        }
    }
    
    return pool[0]; // Fallback to first fish if something goes wrong
}

// Helper function to calculate fish price based on rod bonuses
function calculatePrice(fish, rodType) {
    const rod = FISHING_RODS[rodType];
    let price = fish.basePrice;
    
    if (rod.priceMultiplier) {
        price *= rod.priceMultiplier;
    }
    
    return Math.floor(price);
}

// Helper function to format numbers with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function viewFishBag(sock, msg) {
    const userId = msg.key.participant || msg.key.remoteJid;
    
    try {
        const fishData = await Fish.findOne({ userId });
        if (!fishData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum memiliki ikan apapun. Mulai memancing dengan command .fish',
                quoted: msg
            });
            return;
        }

        let inventory = '';
        let totalValue = 0;

        // Process each rarity category
        for (const [rarity, fishes] of Object.entries(FISH_DATA)) {
            let hasRarityFish = false;
            let raritySection = `\n${getRaritySymbol(rarity)} *${rarity.toUpperCase()}*\n`;

            for (const [key, fish] of Object.entries(fishes)) {
                const count = fishData.inventory[key];
                if (count > 0) {
                    hasRarityFish = true;
                    const value = count * fish.price;
                    totalValue += value;
                    raritySection += `${fish.emoji} ${fish.name}: ${count}x (${formatNumber(value)} balance)\n`;
                }
            }

            if (hasRarityFish) {
                inventory += raritySection;
            }
        }

        const currentRod = FISHING_RODS[fishData.equipment.currentRod];
        const message = `🎣 *FISH BAG*\n` +
            `Pancingan: ${currentRod.name}\n` +
            `${inventory}\n` +
            `💰 Total Value: ${formatNumber(totalValue)} balance`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            quoted: msg
        });

    } catch (error) {
        console.error('Error viewing fish bag:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat melihat inventory',
            quoted: msg
        });
    }
}

async function sellFish(sock, msg) {
    const userId = msg.key.participant || msg.key.remoteJid;
    const args = msg.message?.conversation?.split(' ').slice(1) || 
                msg.message?.extendedTextMessage?.text?.split(' ').slice(1) || [];
    
    try {
        const fishData = await Fish.findOne({ userId });
        if (!fishData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum memiliki ikan apapun',
                quoted: msg
            });
            return;
        }

        let totalEarnings = 0;
        const soldFish = [];

        if (args.length === 0) {
            // Sell all fish
            for (const [rarity, fishes] of Object.entries(FISH_DATA)) {
                for (const [key, fish] of Object.entries(fishes)) {
                    const count = fishData.inventory[key];
                    if (count > 0) {
                        const earnings = count * fish.price;
                        totalEarnings += earnings;
                        soldFish.push(`${fish.emoji} ${fish.name}: ${count}x (${formatNumber(earnings)} balance)`);
                        fishData.inventory[key] = 0;
                    }
                }
            }
        } else {
            // Sell specific fish
            const fishName = args.join(' ').toLowerCase();
            let foundFish = false;

            for (const fishes of Object.values(FISH_DATA)) {
                for (const [key, fish] of Object.entries(fishes)) {
                    if (fish.name.toLowerCase() === fishName) {
                        const count = fishData.inventory[key];
                        if (count > 0) {
                            const earnings = count * fish.price;
                            totalEarnings += earnings;
                            soldFish.push(`${fish.emoji} ${fish.name}: ${count}x (${formatNumber(earnings)} balance)`);
                            fishData.inventory[key] = 0;
                            foundFish = true;
                        }
                        break;
                    }
                }
                if (foundFish) break;
            }

            if (!foundFish) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Ikan tidak ditemukan atau kamu tidak memilikinya',
                    quoted: msg
                });
                return;
            }
        }

        if (totalEarnings > 0) {
            // Update user balance
            await User.updateUser(userId, {
                $inc: { balance: totalEarnings }
            });

            // Update fishing stats
            fishData.stats.totalEarnings += totalEarnings;
            await fishData.save();

            const message = `💰 *FISH SOLD*\n\n${soldFish.join('\n')}\n\nTotal earnings: ${formatNumber(totalEarnings)} balance`;
            await sock.sendMessage(msg.key.remoteJid, {
                text: message,
                quoted: msg
            });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada ikan yang bisa dijual',
                quoted: msg
            });
        }

    } catch (error) {
        console.error('Error selling fish:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menjual ikan',
            quoted: msg
        });
    }
}

async function fishShop(sock, msg) {
    const userId = msg.key.participant || msg.key.remoteJid;
    const args = msg.message?.conversation?.split(' ').slice(1) || 
                msg.message?.extendedTextMessage?.text?.split(' ').slice(1) || [];
    
    try {
        if (args.length === 0) {
            // Show shop menu
            let shopMessage = '🎣 *FISHING SHOP*\n\n';
            
            for (const [key, rod] of Object.entries(FISHING_RODS)) {
                const rarities = rod.rarities.map(r => getRaritySymbol(r)).join(' ');
                shopMessage += `${key === 'bambu' ? '✅' : '🛒'} ${rod.name}\n` +
                    `💰 Price: ${formatNumber(rod.price)} balance\n` +
                    `🎯 Rarities: ${rarities}\n` +
                    `⏱️ Durasi: ${rod.duration / 1000 / 60} menit\n` +
                    `⏳ Cooldown: ${rod.cooldown / 1000 / 60} menit\n` +
                    `🎣 Max Catch: ${rod.maxCatch}\n\n`;
            }

            shopMessage += '\nUntuk membeli: .fishshop <nama_pancingan>';
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: shopMessage,
                quoted: msg
            });
            return;
        }

        // Buy fishing rod
        const rodName = args.join(' ').toLowerCase();
        const rod = Object.entries(FISHING_RODS).find(([key, value]) => 
            value.name.toLowerCase() === rodName || key === rodName
        );

        if (!rod) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Pancingan tidak ditemukan',
                quoted: msg
            });
            return;
        }

        const [rodKey, rodData] = rod;
        const fishData = await Fish.findOne({ userId });
        
        if (fishData.equipment.rods[rodKey]) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu sudah memiliki pancingan ini',
                quoted: msg
            });
            return;
        }

        const user = await User.getUser(userId);
        if (user.balance < rodData.price) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Balance tidak cukup',
                quoted: msg
            });
            return;
        }

        // Update user balance and fishing equipment
        await User.updateUser(userId, {
            $inc: { balance: -rodData.price }
        });

        fishData.equipment.rods[rodKey] = true;
        fishData.equipment.currentRod = rodKey;
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil membeli ${rodData.name}!\nPancingan otomatis diequip`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in fish shop:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengakses toko',
            quoted: msg
        });
    }
}

async function fishStats(sock, msg) {
    const userId = msg.key.participant || msg.key.remoteJid;
    
    try {
        const fishData = await Fish.findOne({ userId });
        if (!fishData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum memiliki statistik memancing',
                quoted: msg
            });
            return;
        }

        const stats = fishData.stats;
        const currentRod = FISHING_RODS[fishData.equipment.currentRod];
        
        let ownedRods = Object.entries(fishData.equipment.rods)
            .filter(([, owned]) => owned)
            .map(([key]) => FISHING_RODS[key].name)
            .join(', ');

        const message = `📊 *FISHING STATS*\n\n` +
            `🎣 Pancingan Aktif: ${currentRod.name}\n` +
            `🛍️ Pancingan Dimiliki: ${ownedRods}\n\n` +
            `🐟 Total Tangkapan: ${formatNumber(stats.totalCatch)}\n` +
            `🔵 Rare Catch: ${formatNumber(stats.rareCatch)}\n` +
            `🟣 Epic Catch: ${formatNumber(stats.epicCatch)}\n` +
            `🟡 Legendary Catch: ${formatNumber(stats.legendaryCatch)}\n` +
            `💰 Total Penghasilan: ${formatNumber(stats.totalEarnings)} balance\n\n` +
            `⏱️ Terakhir Mancing: ${stats.lastFished ? new Date(stats.lastFished).toLocaleString() : 'Belum Pernah'}`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            quoted: msg
        });

    } catch (error) {
        console.error('Error viewing fish stats:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat melihat statistik',
            quoted: msg
        });
    }
}

const FISHING_LOCATIONS = {
    danau: {
        name: "Danau",
        emoji: "🌊",
        description: "Danau air tawar yang tenang",
        unlockCost: 0,
        exclusive: {
            common: {
                ikanNila: { name: "Ikan Nila", emoji: "🐟", price: 40 },
                gurami: { name: "Gurami", emoji: "🐟", price: 45 }
            },
            uncommon: {
                belut: { name: "Belut", emoji: "🐠", price: 95 },
                gabus: { name: "Gabus", emoji: "🐠", price: 100 }
            }
        }
    },
    sungai: {
        name: "Sungai",
        emoji: "🏞️",
        description: "Sungai mengalir dengan arus deras",
        unlockCost: 5000,
        requires: "danau",
        minCatch: 50,
        exclusive: {
            common: {
                udangAir: { name: "Udang Air Tawar", emoji: "🦐", price: 55 },
                sidat: { name: "Sidat", emoji: "🐟", price: 60 }
            },
            rare: {
                lobsterAir: { name: "Lobster Air Tawar", emoji: "🦞", price: 250 }
            }
        }
    },
    rawa: {
        name: "Rawa",
        emoji: "🥬",
        description: "Rawa-rawa yang penuh misteri",
        unlockCost: 15000,
        requires: "sungai",
        minCatch: 150,
        exclusive: {
            uncommon: {
                lelePithi: { name: "Lele Pithi", emoji: "🐠", price: 150 },
                snakehead: { name: "Snakehead", emoji: "🐠", price: 180 }
            },
            epic: {
                belutListrik: { name: "Belut Listrik", emoji: "⚡", price: 600 }
            }
        }
    },
    pantai: {
        name: "Pantai",
        emoji: "🏖️",
        description: "Pantai dengan ombak yang tenang",
        unlockCost: 50000,
        requires: "rawa",
        minCatch: 300,
        exclusive: {
            rare: {
                kepiting: { name: "Kepiting Raja", emoji: "🦀", price: 280 },
                udangKarang: { name: "Udang Karang", emoji: "🦐", price: 300 }
            },
            legendary: {
                dugong: { name: "Dugong", emoji: "🐋", price: 2800 }
            }
        }
    },
    laut: {
        name: "Laut Dalam",
        emoji: "🌊",
        description: "Kedalaman laut yang misterius",
        unlockCost: 150000,
        requires: "pantai",
        minCatch: 500,
        exclusive: {
            epic: {
                parisManta: { name: "Pari Manta", emoji: "🎏", price: 800 },
                hiuMartil: { name: "Hiu Martil", emoji: "🦈", price: 1000 }
            },
            legendary: {
                guritaRaksasa: { name: "Gurita Raksasa", emoji: "🐙", price: 3500 },
                cachalot: { name: "Cachalot", emoji: "🐋", price: 4000 }
            }
        }
    }
};

// Add location field to Fish schema if not exists
const fishSchema = require('../../database/models/Fish').schema;
if (!fishSchema.paths.location) {
    fishSchema.add({
        location: {
            currentLocation: { type: String, default: 'danau' },
            unlockedLocations: {
                danau: { type: Boolean, default: true },
                sungai: { type: Boolean, default: false },
                rawa: { type: Boolean, default: false },
                pantai: { type: Boolean, default: false },
                laut: { type: Boolean, default: false }
            }
        }
    });
}

// Function to switch fishing rod
async function switchRod(sock, msg) {
    const userId = msg.key.participant || msg.key.remoteJid;
    const rodName = msg.message?.conversation?.split(' ').slice(1).join(' ') || 
                   msg.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');

    try {
        const fishData = await Fish.findOne({ userId });
        if (!fishData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum memiliki data memancing',
                quoted: msg
            });
            return;
        }

        // Find rod by name
        const rodEntry = Object.entries(FISHING_RODS).find(([key, rod]) => 
            rod.name.toLowerCase() === rodName.toLowerCase() || key === rodName.toLowerCase()
        );

        if (!rodEntry) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Pancingan tidak ditemukan',
                quoted: msg
            });
            return;
        }

        const [rodKey] = rodEntry;

        // Check if user owns the rod
        if (!fishData.equipment.rods[rodKey]) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum memiliki pancingan ini',
                quoted: msg
            });
            return;
        }

        // Switch rod
        fishData.equipment.currentRod = rodKey;
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil mengganti ke ${FISHING_RODS[rodKey].name}!`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error switching rod:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengganti pancingan',
            quoted: msg
        });
    }
}

// Function to view fishing dashboard
async function fishingDashboard(sock, msg) {
    const userId = msg.key.participant || msg.key.remoteJid;

    try {
        const fishData = await Fish.findOne({ userId });
        if (!fishData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum memiliki data memancing',
                quoted: msg
            });
            return;
        }

        // Calculate inventory value
        let totalValue = 0;
        let totalFish = 0;
        Object.entries(FISH_DATA).forEach(([rarity, fishes]) => {
            Object.entries(fishes).forEach(([key, fish]) => {
                const count = fishData.inventory[key] || 0;
                totalValue += count * fish.price;
                totalFish += count;
            });
        });

        // Get unlocked locations info
        const locations = Object.entries(FISHING_LOCATIONS)
            .map(([key, loc]) => {
                const unlocked = fishData.location.unlockedLocations[key];
                return `${unlocked ? '🔓' : '🔒'} ${loc.emoji} ${loc.name}`;
            })
            .join('\n');

        const currentLocation = FISHING_LOCATIONS[fishData.location.currentLocation];
        const currentRod = FISHING_RODS[fishData.equipment.currentRod];

        const message = `🎣 *FISHING DASHBOARD*\n\n` +
            `👤 *Status Pemain*\n` +
            `Pancingan: ${currentRod.name}\n` +
            `Lokasi: ${currentLocation.emoji} ${currentLocation.name}\n` +
            `Total Ikan: ${formatNumber(totalFish)}\n` +
            `Total Value: ${formatNumber(totalValue)} balance\n\n` +
            `📊 *Statistik*\n` +
            `Total Tangkapan: ${formatNumber(fishData.stats.totalCatch)}\n` +
            `Rare Catch: ${formatNumber(fishData.stats.rareCatch)}\n` +
            `Epic Catch: ${formatNumber(fishData.stats.epicCatch)}\n` +
            `Legendary Catch: ${formatNumber(fishData.stats.legendaryCatch)}\n` +
            `Total Penghasilan: ${formatNumber(fishData.stats.totalEarnings)} balance\n\n` +
            `📍 *Lokasi Tersedia*\n${locations}\n\n` +
            `💡 Ketik .location untuk melihat detail lokasi dan cara unlock`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            quoted: msg
        });

    } catch (error) {
        console.error('Error viewing fishing dashboard:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat melihat dashboard',
            quoted: msg
        });
    }
}

// Function to manage fishing locations
async function handleLocation(sock, msg) {
    const userId = msg.key.participant || msg.key.remoteJid;
    const args = msg.message?.conversation?.split(' ').slice(1) || 
                msg.message?.extendedTextMessage?.text?.split(' ').slice(1) || [];

    try {
        const fishData = await Fish.findOne({ userId });
        if (!fishData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum memiliki data memancing',
                quoted: msg
            });
            return;
        }

        // If no arguments, show location info
        if (args.length === 0) {
            let message = '📍 *FISHING LOCATIONS*\n\n';
            
            for (const [key, loc] of Object.entries(FISHING_LOCATIONS)) {
                const unlocked = fishData.location.unlockedLocations[key];
                const status = unlocked ? '🔓 Terbuka' : '🔒 Terkunci';
                const requirement = !unlocked && loc.requires ? 
                    `\n└ Butuh: ${FISHING_LOCATIONS[loc.requires].name} & ${loc.minCatch} tangkapan` : '';
                
                message += `${loc.emoji} *${loc.name}* (${status})\n` +
                    `├ ${loc.description}\n` +
                    `├ Unlock: ${formatNumber(loc.unlockCost)} balance${requirement}\n` +
                    `└ Fish: ${Object.values(loc.exclusive || {}).flat().length} exclusive fish\n\n`;
            }

            message += 'Untuk pindah lokasi: .location <nama_lokasi>';
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: message,
                quoted: msg
            });
            return;
        }

        // Handle location change
        const locationName = args.join(' ').toLowerCase();
        const location = Object.entries(FISHING_LOCATIONS).find(([key, loc]) => 
            loc.name.toLowerCase() === locationName || key === locationName
        );

        if (!location) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Lokasi tidak ditemukan',
                quoted: msg
            });
            return;
        }

        const [locationKey, locationData] = location;

        // Check if location is unlocked
        if (!fishData.location.unlockedLocations[locationKey]) {
            const user = await User.getUser(userId);
            
            // Check requirements
            if (locationData.requires) {
                const requiredLocation = locationData.requires;
                if (!fishData.location.unlockedLocations[requiredLocation] || 
                    fishData.stats.totalCatch < locationData.minCatch) {
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `❌ Kamu perlu membuka ${FISHING_LOCATIONS[requiredLocation].name} dan memiliki minimal ${locationData.minCatch} tangkapan terlebih dahulu!`,
                        quoted: msg
                    });
                    return;
                }
            }

            // Check balance
            if (user.balance < locationData.unlockCost) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Balance tidak cukup untuk membuka lokasi ini',
                    quoted: msg
                });
                return;
            }

            // Unlock location
            await User.updateUser(userId, {
                $inc: { balance: -locationData.unlockCost }
            });

            fishData.location.unlockedLocations[locationKey] = true;
        }

        // Change location
        fishData.location.currentLocation = locationKey;
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil pindah ke lokasi ${locationData.emoji} ${locationData.name}!`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error handling location:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengakses lokasi',
            quoted: msg
        });
    }
}

module.exports = {
    startFishing,
    viewFishBag,
    sellFish,
    fishShop,
    fishStats,
    switchRod,
    fishingDashboard,
    handleLocation
};