const Fish = require('../../database/models/Fish');
const User = require('../../database/models/User');

const COOLDOWN = 45 * 1000; // 45 detik

const AREA_REQUIREMENTS = {
    indonesia: {
        price: 0,
        fishingCount: 0,
        requiredFish: null
    },
    malaysia: {
        price: 15000,
        fishingCount: 50,
        requiredFish: 'Arwana' // ikan legendary dari indonesia
    },
    singapore: {
        price: 30000,
        fishingCount: 100,
        requiredFish: 'tomann' // ikan legendary dari malaysia
    },
    goa_berair: {
        price: 30000,
        fishingCount: 150,
        requiredFish: 'Jelawat' // ikan dari area danau
    },
    pantai: {
        price: 50000,
        fishingCount: 200,
        requiredFish: 'Ikan Buta' // ikan legendary dari goa
    },
    laut: {
        price: 100000,
        fishingCount: 300,
        requiredFish: 'Tuna' // ikan legendary dari pantai
    }
};

const BAITS = {
    normal: {
        name: 'Normal Bait',
        price: 5000,
        quantity: 50,
        effects: {
            rare: 0,
            epic: 0,
            legendary: 0
        },
        description: 'Umpan biasa tanpa efek khusus'
    },
    cacing: {
        name: 'Cacing',
        price: 15000,
        quantity: 40,
        effects: {
            rare: 0.15, // +15% untuk rare
            epic: 0.10, // +10% untuk epic
            legendary: 0
        },
        description: 'Umpan cacing meningkatkan kemungkinan mendapat ikan rare dan epic'
    },
    daging: {
        name: 'Daging',
        price: 30000,
        quantity: 20,
        effects: {
            rare: 0,
            epic: 0.15, // +15% untuk epic
            legendary: 0.05 // +5% untuk legendary
        },
        description: 'Umpan daging meningkatkan kemungkinan mendapat ikan epic dan legendary'
    }
};

const AREAS = {
    indonesia: {
        name: 'Indonesia',
        fish: [
            { name: 'Lele', rarity: 'Common', price: 250 },
            { name: 'Mujair', rarity: 'Common', price: 210 },
            { name: 'Nila', rarity: 'common', price: 230 },
            { name: 'Teri', rarity: 'common', price: 240 },
            { name: 'Mas', rarity: 'common', price: 250 },

            { name: 'Kakap', rarity: 'Uncommon', price: 300 },
            { name: 'Tenggiri', rarity: 'Uncommon', price: 310 },
            { name: 'Kerapu', rarity: 'Uncommon', price: 320 },
            { name: 'Gurame', rarity: 'Uncommon', price: 330 },
            { name: 'Koi', rarity: 'Uncommon', price: 340 },

            { name: 'Tongkol', rarity: 'Rare', price: 350 },
            { name: 'Belut', rarity: 'Rare', price: 360 },
            { name: 'Gabus', rarity: 'Rare', price: 380 },
            { name: 'Cakalang', rarity: 'Rare', price: 390 },
            { name: 'Patin', rarity: 'Rare', price: 400 },

            { name: 'Bandeng', rarity: 'Epic', price: 410 },
            { name: 'Bawal', rarity: 'Epic', price: 420 },
            { name: 'Sarden', rarity: 'Epic', price: 430 },
            { name: 'Sidat', rarity: 'Epic', price: 440 },
            { name: 'Belanak', rarity: 'Epic', price: 450 },

            { name: 'Koi', rarity: 'Legendary', price: 550 },
            { name: 'Hiu', rarity: 'Legendary', price: 560 },
            { name: 'Buntal', rarity: 'Legendary', price: 570 },
            { name: 'Louhan', rarity: 'Legendary', price: 580 },
            { name: 'Arwana', rarity: 'Legendary', price: 600 }
        ]
    },
    malaysia: {
        name: 'Malaysia',
        fish: [
            { name: 'Lele', rarity: 'Common', price: 100 },
            { name: 'Gabus', rarity: 'Common', price: 110 },
            { name: 'Nila', rarity: 'common', price: 120 },
            { name: 'Baung', rarity: 'common', price: 130 },
            { name: 'Patin', rarity: 'common', price: 140 },
            { name: 'Jelawat', rarity: 'Uncommon', price: 170 },
            { name: 'Kelah', rarity: 'Uncommon', price: 180 },
            { name: 'Kerapu', rarity: 'Uncommon', price: 190 },
            { name: 'Bawal', rarity: 'Uncommon', price: 200 },
            { name: 'Cencaru', rarity: 'Uncommon', price: 210 },
            { name: 'Selar', rarity: 'Rare', price: 230 },
            { name: 'Tongkol', rarity: 'Rare', price: 240 },
            { name: 'Cakalang', rarity: 'Rare', price: 250 },
            { name: 'Kembung', rarity: 'Rare', price: 260 },
            { name: 'Pari', rarity: 'Rare', price: 270 },
            { name: 'Duri', rarity: 'Epic', price: 290 },
            { name: 'Gelama', rarity: 'Epic', price: 300 },
            { name: 'Lampam', rarity: 'Epic', price: 310 },
            { name: 'Tenggalan', rarity: 'Epic', price: 320 },
            { name: 'Toman', rarity: 'Epic', price: 330 },
            { name: 'Siakap', rarity: 'Legendary', price: 350 },
            { name: 'Hiu', rarity: 'Legendary', price: 370 },
            { name: 'Kerisi', rarity: 'Legendary', price: 380 },
            { name: 'Toman', rarity: 'Legendary', price: 390 },
            { name: 'Ketutu', rarity: 'Legendary', price: 400 }
        ]
    },
    singapore: {
        name: 'Singapore',
        fish: [
            { name: 'Mas', rarity: 'Common', price: 300 },
            { name: 'Tawes', rarity: 'Uncommon', price: 600 },
            { name: 'Bandeng', rarity: 'Rare', price: 1200 },
            { name: 'Jelawat', rarity: 'Epic', price: 2500 }
        ]
    },
    goa_berair: {
        name: 'Goa Berair',
        fish: [
            { name: 'Kerapu', rarity: 'Uncommon', price: 800 },
            { name: 'Belut Goa', rarity: 'Rare', price: 1500 },
            { name: 'Ikan Goa', rarity: 'Epic', price: 3000 },
            { name: 'Ikan Buta', rarity: 'Legendary', price: 5000 }
        ]
    },
    pantai: {
        name: 'Pantai',
        fish: [
            { name: 'Tongkol', rarity: 'Uncommon', price: 1000 },
            { name: 'Kakap', rarity: 'Rare', price: 2000 },
            { name: 'Tenggiri', rarity: 'Epic', price: 4000 },
            { name: 'Tuna', rarity: 'Legendary', price: 8000 }
        ]
    },
    laut: {
        name: 'Laut',
        fish: [
            { name: 'Cakalang', rarity: 'Rare', price: 2500 },
            { name: 'Marlin', rarity: 'Epic', price: 5000 },
            { name: 'Hiu', rarity: 'Legendary', price: 10000 },
            { name: 'Paus', rarity: 'Legendary', price: 15000 }
        ]
    }
};

const RODS = {
    ranting_pohon: {
        name: 'Ranting pohon',
        price: 1000,
        maxCatch: 1,
        areas: ['indonesia', 'malaysia', 'singapore', 'goa_berair', 'pantai', 'laut'],
        durability: 25,
        description: 'Pancingan pemula berbahan ranting pohon, bisa dipakai di semua area'
    },
    kayu: {
        name: 'Kayu',
        price: 6000,
        maxCatch: 1,
        areas: ['indonesia', 'malaysia', 'singapore', 'goa_berair', 'pantai', 'laut'],
        durability: 45,
        description: 'Pancingan kayu untuk semua area'
    },
    bamboo: {
        name: 'Bamboo',
        price: 15000,
        maxCatch: 2,
        areas: ['indonesia'],
        durability: 80,
        description: 'Pancingan bambu khas Indonesia, hanya bisa di Indonesia'
    },
    indonesia_fiber: {
        name: 'Indonesia Fiber',
        price: 25000,
        maxCatch: 3,
        areas: ['indonesia'],
        durability: 125,
        description: 'Pancingan fiber untuk area Indonesia'
    },
    indonesia_gold: {
        name: 'Indonesia Gold',
        price: 30000,
        maxCatch: 4,
        areas: ['indonesia'],
        durability: 200,
        description: 'Pancingan Emas untuk area Indonesia'
    },
    ultimate_rod: {
        name: 'Comming Soon Yeaa!',
        price: 10000000,
        maxCatch: 5,
        areas: ['goa_berair', 'pantai', 'laut'],
        durability: 500,
        description: 'Comming Soon'
    }
};

function getRarityEmoji(rarity) {
    switch(rarity) {
        case 'Common': return '⚪';
        case 'Uncommon': return '🟢';
        case 'Rare': return '🔵';
        case 'Epic': return '🟣';
        case 'Legendary': return '🟡';
        default: return '⚪';
    }
}

function getRarityChance(rarity) {
    switch(rarity) {
        case 'Common': return 0.6;
        case 'Uncommon': return 0.25;
        case 'Rare': return 0.1;
        case 'Epic': return 0.04;
        case 'Legendary': return 0.01;
        default: return 0;
    }
}

function generateCatches(maxCatch, availableFish, baitData) {
    const catches = [];
    const numCatches = Math.floor(Math.random() * maxCatch) + 1;
    
    for(let i = 0; i < numCatches; i++) {
        const rand = Math.random();
        let cumulativeChance = 0;
        let selectedFish = null;
        
        const fishByRarity = {
            Common: availableFish.filter(f => f.rarity.toLowerCase() === 'common'),
            Uncommon: availableFish.filter(f => f.rarity.toLowerCase() === 'uncommon'),
            Rare: availableFish.filter(f => f.rarity.toLowerCase() === 'rare'),
            Epic: availableFish.filter(f => f.rarity.toLowerCase() === 'epic'),
            Legendary: availableFish.filter(f => f.rarity.toLowerCase() === 'legendary')
        };

        // Menggunakan chance yang sudah dimodifikasi bait
        const modifiedChances = {
            Common: 0.6,
            Uncommon: 0.25,
            Rare: 0.1 + (baitData.effects.rare || 0),
            Epic: 0.04 + (baitData.effects.epic || 0),
            Legendary: 0.01 + (baitData.effects.legendary || 0)
        };

        // Normalisasi chances agar total tetap 1
        const total = Object.values(modifiedChances).reduce((a, b) => a + b, 0);
        Object.keys(modifiedChances).forEach(key => {
            modifiedChances[key] = modifiedChances[key] / total;
        });

        for(const [rarity, chance] of Object.entries(modifiedChances)) {
            cumulativeChance += chance;
            if(rand <= cumulativeChance && fishByRarity[rarity].length > 0) {
                const fishOfRarity = fishByRarity[rarity];
                selectedFish = fishOfRarity[Math.floor(Math.random() * fishOfRarity.length)];
                break;
            }
        }

        if (selectedFish) {
            catches.push(selectedFish);
        }
    }
    
    return catches;
}

// Handler Functions
async function fishingHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        let fishData = await Fish.findOne({ jid: senderJid });
        
        if (!fishData) {
            fishData = await Fish.create({ 
                jid: senderJid,
                inventory: {
                    rods: [{ name: 'basic_rod', durability: 50 }],
                    baits: [],
                    fish: []
                }
            });
        }

        // Check cooldown
        if (fishData.lastFishing && Date.now() - new Date(fishData.lastFishing).getTime() < COOLDOWN) {
            const remainingTime = Math.ceil((COOLDOWN - (Date.now() - new Date(fishData.lastFishing).getTime())) / 1000);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `⏳ Tunggu ${remainingTime} detik lagi untuk memancing kembali!`,
                quoted: msg
            });
            return;
        }

        // Check if has rod
        if (!fishData.currentRod) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu tidak memiliki pancingan! Beli dulu di .fishshop',
                quoted: msg
            });
            return;
        }

        const currentRod = fishData.inventory.rods.find(r => r.name === fishData.currentRod);
        if (!currentRod) {
            // Reset currentRod karena rod tidak ditemukan di inventory
            fishData.currentRod = null;
            await fishData.save();
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu tidak memiliki pancingan! Beli dulu di .fishshop',
                quoted: msg
            });
            return;
        }

        // Check rod durability
        if (currentRod.durability <= 0) {
            // Hapus rod dari inventory
            fishData.inventory.rods = fishData.inventory.rods.filter(r => r.name !== fishData.currentRod);
            fishData.currentRod = null;
            await fishData.save();

            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Pancingan kamu rusak! Beli pancingan baru di .fishshop',
                quoted: msg
            });
            return;
        }

        // Check bait
        if (!fishData.currentBait || !fishData.inventory.baits.find(b => b.name === fishData.currentBait && b.quantity > 0)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu tidak memiliki bait! Beli dulu di .baitshop',
                quoted: msg
            });
            return;
        }

        // Animation messages
        const animations = [
            '🎣 Melempar pancingan...',
            '〽️ Menunggu ikan...',
            '〽️ Ada yang nyangkut!',
            '🎣 Menarik pancingan...'
        ];

        let currentMsg = await sock.sendMessage(msg.key.remoteJid, {
            text: animations[0],
            quoted: msg
        });

        for (let i = 1; i < animations.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sock.sendMessage(msg.key.remoteJid, {
                text: animations[i],
                edit: currentMsg.key
            });
        }

        // Calculate catch with bait effects
        const rodData = RODS[fishData.currentRod];
        const areaData = AREAS[fishData.currentArea];
        const baitData = BAITS[fishData.currentBait];

        // Generate catches with modified chances
        const catches = generateCatches(rodData.maxCatch, areaData.fish, baitData);

        // Update bait quantity
        const currentBait = fishData.inventory.baits.find(b => b.name === fishData.currentBait);
        currentBait.quantity -= 1;
        if (currentBait.quantity <= 0) {
            fishData.inventory.baits = fishData.inventory.baits.filter(b => b.name !== fishData.currentBait);
            fishData.currentBait = null;
        }

        // Update database
        fishData.lastFishing = new Date();
        fishData.stats.totalCatch += catches.length;
        
        // Update rod durability
        currentRod.durability -= Math.floor(Math.random() * 3) + 1;

        // Cek apakah rod rusak
        if (currentRod.durability <= 0) {
            // Hapus rod dari inventory
            fishData.inventory.rods = fishData.inventory.rods.filter(r => r.name !== fishData.currentRod);
            
            // Reset currentRod
            fishData.currentRod = null;
            
            await fishData.save();
            
            // Kirim notifikasi rod rusak
            await sock.sendMessage(msg.key.remoteJid, {
                text: `⚠️ *PANCINGAN RUSAK!*\n\n` +
                      `Pancingan ${RODS[currentRod.name].name} kamu telah rusak dan hilang!\n` +
                      `Silahkan beli pancingan baru di .fishshop`,
                quoted: msg
            });
            
            return;
        }

        // Update inventory
        catches.forEach(fishCatch => {
            const existingFish = fishData.inventory.fish.find(f => f.name === fishCatch.name);
            if (existingFish) {
                existingFish.quantity += 1;
            } else {
                fishData.inventory.fish.push({
                    name: fishCatch.name,
                    rarity: fishCatch.rarity,
                    quantity: 1
                });
            }

            // Update stats based on rarity
            switch(fishCatch.rarity) {
                case 'Rare':
                    fishData.stats.rareCatch += 1;
                    break;
                case 'Epic':
                    fishData.stats.epicCatch += 1;
                    break;
                case 'Legendary':
                    fishData.stats.legendaryCatch += 1;
                    break;
            }
        });

        await fishData.save();

        // Send result
        let catchText = catches.map(c => `${getRarityEmoji(c.rarity)} ${c.name}`).join('\n');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎣 *HASIL MEMANCING*\n` +
                `👤 Pemancing: @${senderJid.split('@')[0]}\n\n` +
                `${catchText}\n\n` +
                `💪 Durability: ${currentRod.durability}\n` +
                `🪱 Bait: ${baitData.name} (${currentBait.quantity} left)`,
            mentions: [senderJid], // Menambahkan mention ke pemancing
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

async function dashboardHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });
        
        if (!fishData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum mulai memancing! Gunakan .fish untuk mulai',
                quoted: msg
            });
            return;
        }

        // Validasi rod yang aktif
        const currentRod = fishData.currentRod ? 
            fishData.inventory.rods.find(r => r.name === fishData.currentRod) : null;

        // Reset currentRod jika rod tidak ditemukan di inventory
        if (fishData.currentRod && !currentRod) {
            fishData.currentRod = null;
            await fishData.save();
        }

        const rodData = currentRod ? RODS[currentRod.name] : null;
        const areaData = AREAS[fishData.currentArea];

        // Validasi bait yang aktif
        const currentBait = fishData.currentBait ? 
            fishData.inventory.baits.find(b => b.name === fishData.currentBait && b.quantity > 0) : null;

        // Reset currentBait jika bait habis
        if (fishData.currentBait && !currentBait) {
            fishData.currentBait = null;
            await fishData.save();
        }

        const baitInfo = currentBait ? 
            `${BAITS[fishData.currentBait].name} (${currentBait.quantity} left)` : 
            'Tidak ada';

        // Status rod dengan warna berdasarkan durability
        let durabilityStatus = '';
        if (currentRod) {
            const durabilityPercentage = (currentRod.durability / rodData.durability) * 100;
            if (durabilityPercentage > 75) {
                durabilityStatus = `💚 ${currentRod.durability}`;
            } else if (durabilityPercentage > 50) {
                durabilityStatus = `💛 ${currentRod.durability}`;
            } else if (durabilityPercentage > 25) {
                durabilityStatus = `🟧 ${currentRod.durability}`;
            } else {
                durabilityStatus = `❤️ ${currentRod.durability}`;
            }
        }

        // Format angka dengan pemisah ribuan
        const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
        const dashboard = `🎣 *FISHING DASHBOARD*\n` +
            `👤 Player: @${senderJid.split('@')[0]}\n\n` +
            `🗺️ Area: ${areaData.name}\n` +
            `🎣 Rod: ${currentRod ? rodData.name : 'Tidak ada'}\n` +
            `💪 Durability: ${currentRod ? durabilityStatus : '❌ Tidak ada rod'}\n` +
            `🪱 Bait: ${baitInfo}\n\n` +
            `📊 *STATISTIK*\n` +
            `🎯 Total Tangkapan: ${formatNumber(fishData.stats.totalCatch)}\n` +
            `💰 Total Profit: ${formatNumber(fishData.stats.totalProfit)}\n\n` +
            `*Rare Catches:*\n` +
            `🔵 Rare: ${formatNumber(fishData.stats.rareCatch)}\n` +
            `🟣 Epic: ${formatNumber(fishData.stats.epicCatch)}\n` +
            `🟡 Legendary: ${formatNumber(fishData.stats.legendaryCatch)}\n\n` +
            `⚠️ ${currentRod && currentRod.durability < 10 ? 
                'Peringatan: Durability rod hampir habis!' : 
                'Tip: Gunakan bait untuk meningkatkan chance dapat ikan langka'}`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: dashboard,
            mentions: [senderJid],
            quoted: msg
        });

    } catch (error) {
        console.error('Error in dashboard:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menampilkan dashboard',
            quoted: msg
        });
    }
}

// Handler untuk area
async function areaHandler(sock, msg) {
    try {
        const areaNumber = parseInt(msg.message?.conversation?.split(' ')[1] || 
                                 msg.message?.extendedTextMessage?.text?.split(' ')[1]);
        
        if (isNaN(areaNumber)) {
            let areaList = Object.entries(AREAS).map(([key, area], index) => {
                const req = AREA_REQUIREMENTS[key];
                return `${index + 1}. ${area.name}\n` +
                       `💰 Harga: ${req.price}\n` +
                       `🎣 Syarat Mancing: ${req.fishingCount}x\n` +
                       `${req.requiredFish ? `🐟 Perlu ikan: ${req.requiredFish}` : ''}\n`;
            }).join('\n');
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🗺️ *AREA LIST*\n\n${areaList}\n\nGunakan .area <nomor> untuk pindah area`,
                quoted: msg
            });
            return;
        }

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });
        const areaKey = Object.keys(AREAS)[areaNumber - 1];
        const targetArea = AREAS[areaKey];
        const requirements = AREA_REQUIREMENTS[areaKey];

        if (!targetArea) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Area tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        if (!fishData.unlockedAreas.includes(areaKey)) {
            // Cek persyaratan
            const user = await User.getUser(senderJid);
            let failedRequirements = [];

            // Cek balance
            if (user.balance < requirements.price) {
                failedRequirements.push(`💰 Kurang balance: ${requirements.price - user.balance}`);
            }

            // Cek jumlah mancing
            if (fishData.stats.totalCatch < requirements.fishingCount) {
                failedRequirements.push(`🎣 Kurang mancing: ${requirements.fishingCount - fishData.stats.totalCatch}x lagi`);
            }

            // Cek ikan yang dibutuhkan
            if (requirements.requiredFish) {
                const hasRequiredFish = fishData.inventory.fish.some(fish => 
                    fish.name === requirements.requiredFish && fish.quantity > 0
                );
                if (!hasRequiredFish) {
                    failedRequirements.push(`🐟 Belum punya ikan: ${requirements.requiredFish}`);
                }
            }

            if (failedRequirements.length > 0) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ Syarat belum terpenuhi!\n\n${failedRequirements.join('\n')}`,
                    quoted: msg
                });
                return;
            }

            // Jika semua syarat terpenuhi
            await User.updateUser(senderJid, { balance: user.balance - requirements.price });
            
            // Jika ada ikan yang dibutuhkan, kurangi 1 dari inventory
            if (requirements.requiredFish) {
                const fishIndex = fishData.inventory.fish.findIndex(f => f.name === requirements.requiredFish);
                if (fishData.inventory.fish[fishIndex].quantity === 1) {
                    fishData.inventory.fish.splice(fishIndex, 1);
                } else {
                    fishData.inventory.fish[fishIndex].quantity -= 1;
                }
            }

            fishData.unlockedAreas.push(areaKey);
        }

        fishData.currentArea = areaKey;
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil pindah ke area ${targetArea.name}!`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in area handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengganti area',
            quoted: msg
        });
    }
}

// Handler untuk ganti rod
async function switchRodHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });
        
        // Get rod name from command
        const rodName = msg.message?.conversation?.split(' ').slice(1).join('_').toLowerCase() || 
                       msg.message?.extendedTextMessage?.text?.split(' ').slice(1).join('_').toLowerCase();

        if (!rodName) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `📝 *CARA PENGGUNAAN*\n\n` +
                      `Format: .switchrod <nama_rod>\n\n` + 
                      `Contoh:\n` +
                      `• .switchrod ranting_pohon\n` +
                      `• .switchrod kayu\n` +
                      `• .switchrod bamboo\n\n` +
                      `Gunakan .fishshop untuk melihat daftar rod yang tersedia.`,
                quoted: msg
            });
            return;
        }

        if (!fishData || !fishData.inventory.rods.length) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu tidak memiliki pancingan!',
                quoted: msg
            });
            return;
        }

        // Check if player owns the rod
        const hasRod = fishData.inventory.rods.find(rod => rod.name === rodName);
        if (!hasRod) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu tidak memiliki pancingan tersebut!',
                quoted: msg
            });
            return;
        }

        // Switch to the selected rod
        fishData.currentRod = rodName;
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil mengganti ke ${RODS[rodName].name}!`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in switch rod handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengganti pancingan',
            quoted: msg
        });
    }
}

// Handler untuk inventory ikan
async function fishBagHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });

        if (!fishData || !fishData.inventory.fish.length) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '🎣 Inventory kosong!',
                quoted: msg
            });
            return;
        }

        const inventory = fishData.inventory.fish
            .sort((a, b) => {
                const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
                return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
            })
            .map(fish => `${getRarityEmoji(fish.rarity)} ${fish.name} (${fish.quantity})`)
            .join('\n');

        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎒 *FISH BAG*\n\n${inventory}`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in fish bag handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menampilkan inventory',
            quoted: msg
        });
    }
}

// Handler untuk jual ikan
async function sellFishHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });
        
        if (!fishData || !fishData.inventory.fish.length) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada ikan untuk dijual!',
                quoted: msg
            });
            return;
        }

        const fishName = msg.message?.conversation?.split(' ').slice(1).join(' ') || 
                        msg.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');

        let totalProfit = 0;
        const user = await User.getUser(senderJid);

        if (fishName) {
            // Sell specific fish
            const fishIndex = fishData.inventory.fish.findIndex(f => 
                f.name.toLowerCase() === fishName.toLowerCase()
            );

            if (fishIndex === -1) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Ikan tidak ditemukan!',
                    quoted: msg
                });
                return;
            }

            const fish = fishData.inventory.fish[fishIndex];
            const areaWithFish = Object.values(AREAS).find(area => 
                area.fish.some(f => f.name === fish.name)
            );
            const fishPrice = areaWithFish.fish.find(f => f.name === fish.name).price;
            totalProfit = fishPrice * fish.quantity;

            fishData.inventory.fish.splice(fishIndex, 1);
            fishData.stats.totalProfit += totalProfit;

        } else {
            // Sell all fish
            fishData.inventory.fish.forEach(fish => {
                const areaWithFish = Object.values(AREAS).find(area => 
                    area.fish.some(f => f.name === fish.name)
                );
                const fishPrice = areaWithFish.fish.find(f => f.name === fish.name).price;
                totalProfit += fishPrice * fish.quantity;
            });

            fishData.inventory.fish = [];
            fishData.stats.totalProfit += totalProfit;
        }

        await User.updateUser(senderJid, { balance: user.balance + totalProfit });
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `💰 Berhasil menjual ikan!\nProfit: ${totalProfit}`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in sell fish handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menjual ikan',
            quoted: msg
        });
    }
}

// Handler untuk shop
async function fishShopHandler(sock, msg) {
    try {
        const rodList = Object.entries(RODS).map(([key, rod]) => 
            `🎣 ${rod.name}\n` +
            `💰 Price: ${rod.price}\n` +
            `💪 Durability: ${rod.durability}\n` +
            `📝 ${rod.description}\n`
        ).join('\n');

        await sock.sendMessage(msg.key.remoteJid, {
            text: `🏪 *FISH SHOP*\n\n${rodList}\n\nGunakan .buyrod <nama_rod> untuk membeli`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in fish shop handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menampilkan shop',
            quoted: msg
        });
    }
}

// Handler untuk statistik
async function fishStatsHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });

        if (!fishData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum mulai memancing!',
                quoted: msg
            });
            return;
        }

        const stats = `📊 *FISHING STATS*\n\n` +
            `🎣 Total Tangkapan: ${fishData.stats.totalCatch}\n` +
            `💰 Total Profit: ${fishData.stats.totalProfit}\n\n` +
            `*Rare Catches:*\n` +
            `🔵 Rare: ${fishData.stats.rareCatch}\n` +
            `🟣 Epic: ${fishData.stats.epicCatch}\n` +
            `🟡 Legendary: ${fishData.stats.legendaryCatch}\n\n` +
            `*Area Terbuka:*\n` +
            fishData.unlockedAreas.map(area => `• ${AREAS[area].name}`).join('\n');

        await sock.sendMessage(msg.key.remoteJid, {
            text: stats,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in fish stats handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menampilkan statistik',
            quoted: msg
        });
    }
}

async function buyRodHandler(sock, msg) {
    try {
        const rodName = msg.message?.conversation?.split(' ').slice(1).join('_').toLowerCase() || 
                       msg.message?.extendedTextMessage?.text?.split(' ').slice(1).join('_').toLowerCase();

        if (!rodName) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan .buyrod <nama_rod>',
                quoted: msg
            });
            return;
        }

        // Cek apakah rod ada
        const rod = RODS[rodName];
        if (!rod) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Rod tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const user = await User.getUser(senderJid);
        let fishData = await Fish.findOne({ jid: senderJid });

        // Buat data fishing jika belum ada
        if (!fishData) {
            fishData = await Fish.create({ 
                jid: senderJid,
                inventory: {
                    rods: [],
                    fish: []
                }
            });
        }

        // Cek balance
        if (user.balance < rod.price) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Balance tidak cukup! Butuh 💰 ${rod.price}`,
                quoted: msg
            });
            return;
        }

        // Cek apakah sudah punya rod yang sama
        const hasRod = fishData.inventory.rods.some(r => r.name === rodName);
        if (hasRod) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu sudah memiliki rod ini!',
                quoted: msg
            });
            return;
        }

        // Beli rod
        await User.updateUser(senderJid, { balance: user.balance - rod.price });
        fishData.inventory.rods.push({
            name: rodName,
            durability: rod.durability
        });

        // Set sebagai rod aktif jika belum punya rod aktif
        if (!fishData.currentRod) {
            fishData.currentRod = rodName;
        }

        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil membeli ${rod.name}!\n` +
                  `💪 Durability: ${rod.durability}\n` +
                  `📝 ${rod.description}`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in buy rod handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat membeli rod',
            quoted: msg
        });
    }
}

async function baitShopHandler(sock, msg) {
    try {
        const baitList = Object.entries(BAITS).map(([key, bait]) => 
            `🎣 ${bait.name}\n` +
            `💰 Price: ${bait.price} (${bait.quantity} bait)\n` +
            `📊 Effects:\n` +
            `- Rare: ${bait.effects.rare ? `+${bait.effects.rare * 100}%` : '-'}\n` +
            `- Epic: ${bait.effects.epic ? `+${bait.effects.epic * 100}%` : '-'}\n` +
            `- Legendary: ${bait.effects.legendary ? `+${bait.effects.legendary * 100}%` : '-'}\n` +
            `📝 ${bait.description}\n`
        ).join('\n');

        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎣 *BAIT SHOP*\n\n${baitList}\n\nGunakan .buybait <nama_bait> untuk membeli`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in bait shop handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menampilkan bait shop',
            quoted: msg
        });
    }
}

// Add handler for buying bait
async function buyBaitHandler(sock, msg) {
    try {
        const baitName = msg.message?.conversation?.split(' ').slice(1).join('_').toLowerCase() || 
                        msg.message?.extendedTextMessage?.text?.split(' ').slice(1).join('_').toLowerCase();

        if (!baitName) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan .buybait <nama_bait>',
                quoted: msg
            });
            return;
        }

        const bait = BAITS[baitName];
        if (!bait) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Bait tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const user = await User.getUser(senderJid);
        let fishData = await Fish.findOne({ jid: senderJid });

        if (user.balance < bait.price) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Balance tidak cukup! Butuh 💰 ${bait.price}`,
                quoted: msg
            });
            return;
        }

        // Update inventory
        const existingBait = fishData.inventory.baits.find(b => b.name === baitName);
        if (existingBait) {
            existingBait.quantity += bait.quantity;
        } else {
            fishData.inventory.baits.push({
                name: baitName,
                quantity: bait.quantity
            });
        }

        // Update balance
        await User.updateUser(senderJid, { balance: user.balance - bait.price });
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil membeli ${bait.name}!\n` +
                  `📊 Jumlah: ${bait.quantity} umpan\n` +
                  `📝 ${bait.description}`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in buy bait handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat membeli bait',
            quoted: msg
        });
    }
}

// Add handler for switching bait
async function switchBaitHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });
        
        const baitName = msg.message?.conversation?.split(' ').slice(1).join('_').toLowerCase() || 
                        msg.message?.extendedTextMessage?.text?.split(' ').slice(1).join('_').toLowerCase();

        if (!baitName) {
            const currentBait = fishData.currentBait ? BAITS[fishData.currentBait].name : 'Tidak ada';
            const baitInventory = fishData.inventory.baits.map(b => 
                `- ${BAITS[b.name].name}: ${b.quantity} umpan`
            ).join('\n');

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🎣 *BAIT INFO*\n\n` +
                      `Current Bait: ${currentBait}\n\n` +
                      `Inventory Bait:\n${baitInventory || 'Kosong'}`,
                quoted: msg
            });
            return;
        }

        const hasBait = fishData.inventory.baits.find(b => b.name === baitName && b.quantity > 0);
        if (!hasBait) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu tidak memiliki bait tersebut atau jumlahnya habis!',
                quoted: msg
            });
            return;
        }

        fishData.currentBait = baitName;
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil mengganti ke ${BAITS[baitName].name}!`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in switch bait handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengganti bait',
            quoted: msg
        });
    }
}

module.exports = {
    fishingHandler,
    dashboardHandler,
    areaHandler,
    switchRodHandler,
    fishBagHandler,
    sellFishHandler,
    fishShopHandler,
    buyRodHandler,
    fishStatsHandler,
    switchBaitHandler,
    baitShopHandler,
    buyBaitHandler
};