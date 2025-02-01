const Fish = require('../../database/models/Fish');
const User = require('../../database/models/User');

// Fish data constants
const FISH_DATA = {
    // Common (60%)
    common: {
        ikanMas: { name: "Ikan Mas", emoji: "🐟", price: 15 },
        lele: { name: "Lele", emoji: "🐟", price: 20 },
        mujair: { name: "Mujair", emoji: "🐟", price: 25 },
        nila: { name: "Nila", emoji: "🐟", price: 30 },
        bandeng: { name: "Bandeng", emoji: "🐟", price: 35 }
    },
    // Uncommon (25%)
    uncommon: {
        gurame: { name: "Gurame", emoji: "🐠", price: 50 },
        bawal: { name: "Bawal", emoji: "🐠", price: 60 },
        patin: { name: "Patin", emoji: "🐠", price: 70 },
        kakap: { name: "Kakap", emoji: "🐠", price: 80 },
        tongkol: { name: "Tongkol", emoji: "🐠", price: 90 }
    },
    // Rare (10%)
    rare: {
        salmon: { name: "Salmon", emoji: "🐡", price: 120 },
        tuna: { name: "Tuna", emoji: "🐡", price: 150 },
        kerapu: { name: "Kerapu", emoji: "🐡", price: 180 },
        tenggiri: { name: "Tenggiri", emoji: "🐡", price: 200 },
        baronang: { name: "Baronang", emoji: "🐡", price: 220 }
    },
    // Epic (4%)
    epic: {
        arwana: { name: "Arwana Super Red", emoji: "🎏", price: 350 },
        koi: { name: "Koi Platinum", emoji: "🎏", price: 400 },
        belida: { name: "Belida", emoji: "🎏", price: 450 },
        napoleon: { name: "Napoleon", emoji: "🎏", price: 500 },
        botia: { name: "Botia", emoji: "🎏", price: 550 }
    },
    // Legendary (1%)
    legendary: {
        pausBiru: { name: "Paus Biru", emoji: "🐋", price: 1200 },
        hiuPaus: { name: "Hiu Paus", emoji: "🦈", price: 1500 },
        arapaima: { name: "Arapaima", emoji: "🐋", price: 1800 },
        megalodon: { name: "Megalodon", emoji: "🦈", price: 2000 },
        coelacanth: { name: "Coelacanth", emoji: "🐋", price: 2500 }
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
        price: 500,
        rarities: ["common", "uncommon"],
        duration: 150000, // 2.5 minutes
        cooldown: 240000, // 4 minutes
        maxCatch: 2
    },
    fiber: {
        name: "Pancingan Fiber",
        price: 2000,
        rarities: ["common", "uncommon", "rare"],
        duration: 120000, // 2 minutes
        cooldown: 180000, // 3 minutes
        maxCatch: 2
    },
    carbon: {
        name: "Pancingan Carbon",
        price: 5000,
        rarities: ["uncommon", "rare", "epic"],
        duration: 90000, // 1.5 minutes
        cooldown: 120000, // 2 minutes
        maxCatch: 3
    },
    titanium: {
        name: "Pancingan Titanium",
        price: 15000,
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
            const fish = getRandomFish(fishData.equipment.currentRod);
            catches.push(fish);
            totalValue += fish.price;
            
            // Update inventory
            fishData.inventory[fish.key]++;
            
            // Update stats
            fishData.stats.totalCatch++;
            if (["rare", "epic", "legendary"].includes(fish.rarity)) {
                fishData.stats[`${fish.rarity}Catch`]++;
            }
        }

        // Update last fished time
        fishData.stats.lastFished = new Date();
        await fishData.save();

        // Format catch message
        const catchText = catches.map(fish => `${fish.emoji} ${fish.name} (${fish.price} balance)`).join("\n");
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎣 Hasil Memancing:\n\n${catchText}\n\nTotal: ${totalValue} balance`,
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

const Fish = require('../models/Fish');
const User = require('../models/User');

// Previous constants (FISH_DATA, FISHING_RODS, etc.) remain the same...

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

module.exports = {
    startFishing,
    viewFishBag,
    sellFish,
    fishShop,
    fishStats
};