const Fish = require("../../database/models/Fish");
const User = require("../../database/models/User");
const config = require("../../config/owner.json");

// Function to check if user is owner
function isOwner(jid) {
    return config.ownerNumber.includes(jid.split("@")[0]);
}

const COOLDOWN = 45 * 1000; // 45 detik

const AREA_REQUIREMENTS = {
    indonesia: {
        price: 0,
        fishingCount: 0,
        requiredFish: null,
        minLevel: 0,
    },
    malaysia: {
        price: 25000,
        fishingCount: 250,
        requiredFish: "Konoha",
        minLevel: 4,
    },
    singapore: {
        price: 50000,
        fishingCount: 700,
        requiredFish: "Malay",
        minLevel: 9,
    },
    australia: {
        price: 85000,
        fishingCount: 1300,
        requiredFish: "Lunar",
        minLevel: 15,
    },
    jepang: {
        price: 130000,
        fishingCount: 2000,
        requiredFish: "Wibu",
        minLevel: 20,
    },
};

const BAITS = {
    normal: {
        name: "Normal Bait",
        price: 5000,
        quantity: 50,
        areas: ["indonesia", "malaysia", "singapore", "australia", "jepang"],
        effects: {
            rare: 0,
            epic: 0,
            legendary: 0,
            mythic: 0,
            secret: 0,
        },
        description:
            "Umpan biasa tanpa efek khusus, dapat digunakan di semua area",
    },
    daging: {
        name: "Daging",
        price: 30000,
        quantity: 25,
        areas: ["indonesia", "malaysia", "singapore", "australia", "jepang"],
        effects: {
            rare: 0,
            epic: 0.15,
            legendary: 0.08,
            mythic: 0.02,
            secret: 0,
        },
        description: "Umpan daging dapat digunakan di semua area",
    },
    stardust: {
        name: "Stardust",
        price: 50000,
        quantity: 12,
        areas: ["indonesia", "malaysia", "singapore", "australia", "jepang"],
        effects: {
            rare: 0,
            epic: 0,
            legendary: 0.15,
            mythic: 0.06,
            secret: 0.02,
        },
        description: "Umpan untuk mendapatkan ikan langka",
    },
    elixir: {
        name: "Elixir",
        price: 50000,
        quantity: 7,
        areas: ["indonesia", "malaysia", "singapore", "australia", "jepang"],
        effects: {
            rare: 0,
            epic: 0,
            legendary: 0.20,
            mythic: 0.11,
            secret: 0.06,
        },
        description: "Umpan persentase ikan secret",
    },
};

const AREAS = {
    indonesia: {
        name: "Indonesia",
        fish: [
            { name: "Lele", rarity: "Common", price: 130 },
            { name: "Mujair", rarity: "Common", price: 130 },
            { name: "Nila", rarity: "common", price: 130 },
            { name: "Teri", rarity: "common", price: 130 },
            { name: "Mas", rarity: "common", price: 130 },

            { name: "Kakap", rarity: "Uncommon", price: 160 },
            { name: "Tenggiri", rarity: "Uncommon", price: 160 },
            { name: "Kerapu", rarity: "Uncommon", price: 160 },
            { name: "Gurame", rarity: "Uncommon", price: 160 },
            { name: "Koi", rarity: "Uncommon", price: 160 },

            { name: "Tongkol", rarity: "Rare", price: 200 },
            { name: "Belut", rarity: "Rare", price: 200 },
            { name: "Gabus", rarity: "Rare", price: 200 },
            { name: "Cakalang", rarity: "Rare", price: 200 },
            { name: "Patin", rarity: "Rare", price: 200 },

            { name: "Bandeng", rarity: "Epic", price: 230 },
            { name: "Bawal", rarity: "Epic", price: 230 },
            { name: "Sarden", rarity: "Epic", price: 230 },
            { name: "Sidat", rarity: "Epic", price: 230 },
            { name: "Belanak", rarity: "Epic", price: 230 },

            { name: "Koi", rarity: "Legendary", price: 280 },
            { name: "Hiu", rarity: "Legendary", price: 280 },
            { name: "Buntal", rarity: "Legendary", price: 280 },
            { name: "Louhan", rarity: "Legendary", price: 280 },
            { name: "Arwana", rarity: "Legendary", price: 280 },

            { name: "Belida", rarity: "Mythic", price: 330 },
            { name: "Batak", rarity: "Mythic", price: 330 },
            { name: "Semah", rarity: "Mythic", price: 330 },
            { name: "Hiu Gergaji", rarity: "Mythic", price: 330 },
            { name: "Kancra", rarity: "Mythic", price: 330 },
            { name: "Konoha", rarity: "Mythic", price: 330 },

            { name: "Balashark", rarity: "Secret", price: 500 },
            { name: "Megalodon", rarity: "Secret", price: 500 },
        ],
    },
    malaysia: {
        name: "Malaysia",
        fish: [
            { name: "Lele", rarity: "Common", price: 460 },
            { name: "Gabus", rarity: "Common", price: 460 },
            { name: "Nila", rarity: "common", price: 460 },
            { name: "Baung", rarity: "common", price: 460 },
            { name: "Patin", rarity: "common", price: 460 },

            { name: "Jelawat", rarity: "Uncommon", price: 520 },
            { name: "Kelah", rarity: "Uncommon", price: 520 },
            { name: "Kerapu", rarity: "Uncommon", price: 520 },
            { name: "Bawal", rarity: "Uncommon", price: 520 },
            { name: "Cencaru", rarity: "Uncommon", price: 520 },

            { name: "Selar", rarity: "Rare", price: 580 },
            { name: "Tongkol", rarity: "Rare", price: 580 },
            { name: "Cakalang", rarity: "Rare", price: 580 },
            { name: "Kembung", rarity: "Rare", price: 580 },
            { name: "Pari", rarity: "Rare", price: 580 },

            { name: "Duri", rarity: "Epic", price: 640 },
            { name: "Gelama", rarity: "Epic", price: 640 },
            { name: "Lampam", rarity: "Epic", price: 640 },
            { name: "Tenggalan", rarity: "Epic", price: 640 },
            { name: "Toman", rarity: "Epic", price: 640 },

            { name: "Siakap", rarity: "Legendary", price: 690 },
            { name: "Hiu", rarity: "Legendary", price: 690 },
            { name: "Kerisi", rarity: "Legendary", price: 690 },
            { name: "Toman", rarity: "Legendary", price: 690 },
            { name: "Ketutu", rarity: "Legendary", price: 690 },

            { name: "Siakap", rarity: "Mythic", price: 750 },
            { name: "Jenahak", rarity: "Mythic", price: 750 },
            { name: "Temoleh", rarity: "Mythic", price: 750 },
            { name: "Hiu Gergaji", rarity: "Mythic", price: 750 },
            { name: "Kancra", rarity: "Mythic", price: 750 },
            { name: "Malay", rarity: "Mythic", price: 750 },

            { name: "Tapah", rarity: "Secret", price: 1000 },
            { name: "Kelisa", rarity: "Secret", price: 1000 },
        ],
    },
    singapore: {
        name: "Singapore",
        fish: [
            { name: "Lele", rarity: "Common", price: 950 },
            { name: "Gabus", rarity: "Common", price: 950 },
            { name: "Nila", rarity: "common", price: 950 },
            { name: "Baung", rarity: "common", price: 950 },
            { name: "Patin", rarity: "common", price: 950 },

            { name: "Jelawat", rarity: "Uncommon", price: 1000 },
            { name: "Kelah", rarity: "Uncommon", price: 1000 },
            { name: "Kerapu", rarity: "Uncommon", price: 1000 },
            { name: "Bawal", rarity: "Uncommon", price: 1000 },
            { name: "Cencaru", rarity: "Uncommon", price: 1000 },

            { name: "Selar", rarity: "Rare", price: 1050 },
            { name: "Tongkol", rarity: "Rare", price: 1050 },
            { name: "Cakalang", rarity: "Rare", price: 1050 },
            { name: "Kembung", rarity: "Rare", price: 1050 },
            { name: "Pari", rarity: "Rare", price: 1050 },

            { name: "Duri", rarity: "Epic", price: 1100 },
            { name: "Gelama", rarity: "Epic", price: 1100 },
            { name: "Lampam", rarity: "Epic", price: 1100 },
            { name: "Tenggalan", rarity: "Epic", price: 1100 },
            { name: "Tagih", rarity: "Epic", price: 1100 },

            { name: "Siakap", rarity: "Legendary", price: 1150 },
            { name: "Hiu", rarity: "Legendary", price: 1150 },
            { name: "Kerisi", rarity: "Legendary", price: 1150 },
            { name: "Toman", rarity: "Legendary", price: 1150 },
            { name: "Ketutu", rarity: "Legendary", price: 1150 },

            { name: "Lunar", rarity: "Mythic", price: 1200 },
            { name: "Jenahak", rarity: "Mythic", price: 1200 },
            { name: "Temoleh", rarity: "Mythic", price: 1200 },
            { name: "Hiu Gergaji", rarity: "Mythic", price: 1200 },
            { name: "Kancra", rarity: "Mythic", price: 1200 },

            { name: "Tapah", rarity: "Secret", price: 1650 },
            { name: "Kelisa", rarity: "Secret", price: 1650 },
        ],
    },
    australia: {
        name: "australia",
        fish: [
            { name: "Lidah", rarity: "Common", price: 1500 },
            { name: "Nomei", rarity: "Common", price: 1500 },
            { name: "Sebelah", rarity: "common", price: 1500 },
            { name: "Sapu-Sapu", rarity: "common", price: 1500 },
            { name: "Peperek", rarity: "common", price: 1500 },

            { name: "Boloso", rarity: "Uncommon", price: 1575 },
            { name: "Beseng", rarity: "Uncommon", price: 1575 },
            { name: "Kerapu", rarity: "Uncommon", price: 1575 },
            { name: "Kuwe", rarity: "Uncommon", price: 1575 },
            { name: "Sungli", rarity: "Uncommon", price: 1575 },

            { name: "Tanda", rarity: "Rare", price: 1650 },
            { name: "Tengkek", rarity: "Rare", price: 1650 },
            { name: "Hampala", rarity: "Rare", price: 1650 },
            { name: "Lais", rarity: "Rare", price: 1650 },
            { name: "Lempan", rarity: "Rare", price: 1650 },

            { name: "Biawan", rarity: "Epic", price: 1725 },
            { name: "Jendil", rarity: "Epic", price: 1725 },
            { name: "Tagih", rarity: "Epic", price: 1725 },
            { name: "Lampam", rarity: "Epic", price: 1725 },
            { name: "Toman", rarity: "Epic", price: 1725 },

            { name: "Daun", rarity: "Legendary", price: 1800 },
            { name: "Hiu", rarity: "Legendary", price: 1800 },
            { name: "Barjack", rarity: "Legendary", price: 1800 },
            { name: "Toman", rarity: "Legendary", price: 1800 },
            { name: "Giru", rarity: "Legendary", price: 1800 },

            { name: "Haring", rarity: "Mythic", price: 1875 },
            { name: "Hilsa", rarity: "Mythic", price: 1875 },
            { name: "Injel", rarity: "Mythic", price: 1875 },
            { name: "Tatihu", rarity: "Mythic", price: 1875 },
            { name: "Pelangi", rarity: "Mythic", price: 1875 },
            { name: "Wibu", rarity: "Mythic", price: 1875 },

            { name: "Tuna", rarity: "Secret", price: 2500 },
            { name: "Marlin", rarity: "Secret", price: 2500 },
        ],
    },
    jepang: {
        name: "Jepang",
        fish: [
            { name: "Ebi", rarity: "Common", price: 2250 },
            { name: "Kani", rarity: "Common", price: 2250 },
            { name: "Ika", rarity: "common", price: 2250 },

            { name: "Kai", rarity: "Uncommon", price: 2350 },
            { name: "Namako", rarity: "Uncommon", price: 2350 },
            { name: "Uni", rarity: "Uncommon", price: 2350 },

            { name: "Katsuo", rarity: "Rare", price: 2350 },
            { name: "Saba", rarity: "Rare", price: 2350 },
            { name: "Iwashi", rarity: "Rare", price: 2350 },

            { name: "Tako", rarity: "Epic", price: 2450 },
            { name: "Taei", rarity: "Epic", price: 2450 },
            { name: "Same", rarity: "Epic", price: 2450 },

            { name: "Siakap", rarity: "Legendary", price: 2550 },
            { name: "Namazu", rarity: "Legendary", price: 2550 },
            { name: "Unagi", rarity: "Legendary", price: 2550 },

            { name: "Sake", rarity: "Mythic", price: 2650 },
            { name: "Tirapia", rarity: "Mythic", price: 2650 },
            { name: "Taunagi", rarity: "Mythic", price: 2650 },

            { name: "Kurake", rarity: "Legendary", price: 3500 },
            { name: "Maguro", rarity: "Legendary", price: 3500 },
        ],
    },
};

const RODS = {
    ranting_pohon: {
        name: "Ranting pohon",
        price: 1000,
        maxCatch: 1,
        areas: ["indonesia", "malaysia", "singapore", ""],
        durability: 100,
        description:
            "Pancingan pemula berbahan ranting pohon, bisa dipakai di semua area",
    },
    lunastra: {
        name: "Lunastra",
        price: 30000,
        maxCatch: 4,
        areas: ["indonesia"],
        durability: 200,
        description: "Pancingan Emas untuk area Indonesia",
    },
    strombreaker: {
        name: "Strombreaker",
        price: 40000,
        maxCatch: 4,
        areas: ["malaysia"],
        durability: 220,
        description: "Pancingan Emas untuk area Malaysia",
    },
    lunarix: {
        name: "Lunarix",
        price: 50000,
        maxCatch: 4,
        areas: ["singapore"],
        durability: 240,
        description: "Pancingan Emas untuk area Singapore",
    },
    zorin: {
        name: "Zorin",
        price: 60000,
        maxCatch: 5,
        areas: ["australia"],
        durability: 260,
        description: "Pancingan Emas untuk area Australia",
    },
    raiken: {
        name: "Raiken",
        price: 70000,
        maxCatch: 5,
        areas: ["jepang"],
        durability: 280,
        description: "Pancingan Emas untuk area Jepang",
    },
    stellaris: {
        name: "Stellaris",
        price: 125000,
        maxCatch: 8,
        areas: ["indonesia", "malaysia", "singapore", "australia", "jepang"],
        durability: 850,
        description: "Pancingan Legendary!!",
    },
};

const SPECIAL_ITEMS = {
    rods: {
        divine: {
            name: "Divine",
            price: 10000,
            maxCatch: 10,
            areas: [
                "indonesia",
                "malaysia",
                "singapore",
                "australia",
                "jepang",
            ],
            durability: 10,
            stock: 0,
            description:
                "Pancingan Limited Edition!",
        },
        galaxy: {
            name: "Galaxy",
            price: 50000,
            maxCatch: 20,
            areas: [
                "indonesia",
                "malaysia",
                "singapore",
                "australia",
                "jepang",
            ],
            durability: 5,
            stock: 0,
            description:
                "Pancingan Overpowered!",
        },
    },
    baits: {
        mythic: {
            name: "Mythic",
            price: 10000,
            quantity: 7,
            areas: [
                "indonesia",
                "malaysia",
                "singapore",
                "australia",
                "jepang",
            ],
            stock: 0,
            effects: {
                rare: 0,
                epic: 0,
                legendary: 0.25,
                mythic: 0.15,
                secret: 0.9,
            },
            description:
                "Umpan legendaris yang meningkatkan chance mendapat ikan langka",
        },
        lucky: {
            name: "Lucky",
            price: 50000,
            quantity: 5,
            areas: [
                "indonesia",
                "malaysia",
                "singapore",
                "australia",
                "jepang",
            ],
            stock: 0,
            effects: {
                rare: 0,
                epic: 0,
                legendary: 0.30,
                mythic: 0.20,
                secret: 0.16,
            },
            description: "Umpan spesial yang membawa keberuntungan",
        },
    },
};

function getRarityEmoji(rarity) {
    switch (rarity) {
        case "Common":
            return "⚪";
        case "Uncommon":
            return "🟢";
        case "Rare":
            return "🔵";
        case "Epic":
            return "🟣";
        case "Legendary":
            return "🟡";
        case "Mythic":
            return "🔴";
        case "Secret":
            return "⭐";
        default:
            return "⚪";
    }
}

function getRarityChance(rarity) {
    switch (rarity) {
        case "Common":
            return 0.55; // Diturunkan dari 0.6
        case "Uncommon":
            return 0.25; // Tetap sama
        case "Rare":
            return 0.1; // Tetap sama
        case "Epic":
            return 0.0585; // Diturunkan sedikit
        case "Legendary":
            return 0.0025; // Diturunkan dari 0.01
        case "Mythic":
            return 0.009; // Rarity baru (0.25%)
        case "Secret":
            return 0.0005; // Rarity baru (0.05%)
        default:
            return 0;
    }
}

function generateCatches(maxCatch, availableFish, baitData) {
    const catches = [];
    const numCatches = Math.floor(Math.random() * maxCatch) + 1;

    for (let i = 0; i < numCatches; i++) {
        const rand = Math.random();
        let cumulativeChance = 0;
        let selectedFish = null;

        const fishByRarity = {
            Common: availableFish.filter(
                (f) => f.rarity.toLowerCase() === "common",
            ),
            Uncommon: availableFish.filter(
                (f) => f.rarity.toLowerCase() === "uncommon",
            ),
            Rare: availableFish.filter(
                (f) => f.rarity.toLowerCase() === "rare",
            ),
            Epic: availableFish.filter(
                (f) => f.rarity.toLowerCase() === "epic",
            ),
            Legendary: availableFish.filter(
                (f) => f.rarity.toLowerCase() === "legendary",
            ),
            Mythic: availableFish.filter(
                (f) => f.rarity.toLowerCase() === "mythic",
            ),
            Secret: availableFish.filter(
                (f) => f.rarity.toLowerCase() === "secret",
            ),
        };

        // Menggunakan chance yang sudah dimodifikasi bait
        const modifiedChances = {
            Common: 0.55,
            Uncommon: 0.25,
            Rare: 0.1 + (baitData.effects.rare || 0),
            Epic: 0.0585 + (baitData.effects.epic || 0),
            Legendary: 0.0025 + (baitData.effects.legendary || 0),
            Mythic: 0.009 + (baitData.effects.mythic || 0),
            Secret: 0.0005 + (baitData.effects.secret || 0),
        };

        // Normalisasi chances agar total tetap 1
        const total = Object.values(modifiedChances).reduce((a, b) => a + b, 0);
        Object.keys(modifiedChances).forEach((key) => {
            modifiedChances[key] = modifiedChances[key] / total;
        });

        for (const [rarity, chance] of Object.entries(modifiedChances)) {
            cumulativeChance += chance;
            if (rand <= cumulativeChance && fishByRarity[rarity].length > 0) {
                const fishOfRarity = fishByRarity[rarity];
                selectedFish =
                    fishOfRarity[
                        Math.floor(Math.random() * fishOfRarity.length)
                    ];
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
                    rods: [{ name: "basic_rod", durability: 50 }],
                    baits: [],
                    fish: [],
                },
                stats: {
                    level: 1,
                    xp: 0,
                    totalCatch: 0,
                    totalProfit: 0,
                    rareCatch: 0,
                    epicCatch: 0,
                    legendaryCatch: 0,
                    mythicCatch: 0,
                    secretCatch: 0,
                },
                unlockedAreas: ["indonesia"],
                currentArea: "indonesia",
                currentRod: "basic_rod",
            });
        }

        // Check cooldown
        if (
            fishData.lastFishing &&
            Date.now() - new Date(fishData.lastFishing).getTime() < COOLDOWN
        ) {
            const remainingTime = Math.ceil(
                (COOLDOWN -
                    (Date.now() - new Date(fishData.lastFishing).getTime())) /
                    1000,
            );
            await sock.sendMessage(msg.key.remoteJid, {
                text: `⏳ Tunggu ${remainingTime} detik lagi untuk memancing kembali!`,
                quoted: msg,
            });
            return;
        }

        // Check if player has current area
        if (!fishData.currentArea) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Pilih area memancing terlebih dahulu dengan .area",
                quoted: msg,
            });
            return;
        }

        // Check if area is unlocked
        if (!fishData.unlockedAreas.includes(fishData.currentArea)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Area ini belum terbuka! Gunakan .area untuk melihat persyaratan",
                quoted: msg,
            });
            return;
        }

        // Check if has rod
        if (!fishData.currentRod) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Kamu tidak memiliki pancingan! Beli dulu di .fishshop",
                quoted: msg,
            });
            return;
        }

        const currentRod = fishData.inventory.rods.find(
            (r) => r.name === fishData.currentRod,
        );
        if (!currentRod) {
            // Reset currentRod karena rod tidak ditemukan di inventory
            fishData.currentRod = null;
            await fishData.save();

            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Kamu tidak memiliki pancingan! Beli dulu di .fishshop",
                quoted: msg,
            });
            return;
        }

        // Check rod durability
        if (currentRod.durability <= 0) {
            // Hapus rod dari inventory
            fishData.inventory.rods = fishData.inventory.rods.filter(
                (r) => r.name !== fishData.currentRod,
            );
            fishData.currentRod = null;
            await fishData.save();

            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Pancingan kamu rusak! Beli pancingan baru di .fishshop",
                quoted: msg,
            });
            return;
        }

        // Check if current rod can be used in this area
        const rodData =
            RODS[fishData.currentRod] ||
            SPECIAL_ITEMS.rods[fishData.currentRod];

        if (!rodData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Rod tidak ditemukan!",
                quoted: msg,
            });
            return;
        }

        if (!rodData.areas.includes(fishData.currentArea)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ ${rodData.name} tidak bisa digunakan di area ${AREAS[fishData.currentArea].name}!`,
                quoted: msg,
            });
            return;
        }

        // Check bait
        if (
            !fishData.currentBait ||
            !fishData.inventory.baits.find(
                (b) => b.name === fishData.currentBait && b.quantity > 0,
            )
        ) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Kamu tidak memiliki bait! Beli dulu di .baitshop",
                quoted: msg,
            });
            return;
        }

        // Check if current bait can be used in this area
        const baitData =
            BAITS[fishData.currentBait] ||
            SPECIAL_ITEMS.baits[fishData.currentBait];

        if (!baitData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Umpan tidak ditemukan!",
                quoted: msg,
            });
            return;
        }

        if (!baitData.areas.includes(fishData.currentArea)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ ${baitData.name} tidak bisa digunakan di area ${AREAS[fishData.currentArea].name}!\nGunakan .switchbait untuk mengganti umpan yang sesuai`,
                quoted: msg,
            });
            return;
        }

        // Animation messages
        const animations = [
            "🎣 Melempar pancingan...",
            "〽️ Menunggu ikan...",
            "〽️ Ada yang nyangkut!",
            "🎣 Menarik pancingan...",
        ];

        let currentMsg = await sock.sendMessage(msg.key.remoteJid, {
            text: animations[0],
            quoted: msg,
        });

        for (let i = 1; i < animations.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await sock.sendMessage(msg.key.remoteJid, {
                text: animations[i],
                edit: currentMsg.key,
            });
        }

        // Calculate catch with bait effects
        const areaData = AREAS[fishData.currentArea];

        // Generate catches with modified chances
        const catches = generateCatches(
            rodData.maxCatch,
            areaData.fish,
            baitData,
        );

        // Update bait quantity
        const currentBait = fishData.inventory.baits.find(
            (b) => b.name === fishData.currentBait,
        );
        currentBait.quantity -= 1;
        if (currentBait.quantity <= 0) {
            fishData.inventory.baits = fishData.inventory.baits.filter(
                (b) => b.name !== fishData.currentBait,
            );
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
            fishData.inventory.rods = fishData.inventory.rods.filter(
                (r) => r.name !== fishData.currentRod,
            );

            // Reset currentRod
            fishData.currentRod = null;

            await fishData.save();

            // Kirim notifikasi rod rusak
            await sock.sendMessage(msg.key.remoteJid, {
                text:
                    `⚠️ *PANCINGAN RUSAK!*\n\n` +
                    `Pancingan ${RODS[currentRod.name].name} kamu telah rusak dan hilang!\n` +
                    `Silahkan beli pancingan baru di .fishshop`,
                quoted: msg,
            });

            return;
        }

        let totalXpGain = 0;

        // Update inventory
        catches.forEach((fishCatch) => {
            const existingFish = fishData.inventory.fish.find(
                (f) => f.name === fishCatch.name,
            );
            if (existingFish) {
                existingFish.quantity += 1;
            } else {
                fishData.inventory.fish.push({
                    name: fishCatch.name,
                    rarity: fishCatch.rarity,
                    quantity: 1,
                });
            }

            // Update stats based on rarity and add XP
            let catchXpGain = 0;
            switch (fishCatch.rarity) {
                case "Common":
                    catchXpGain = 5;
                    break;
                case "Uncommon":
                    catchXpGain = 10;
                    break;
                case "Rare":
                    fishData.stats.rareCatch += 1;
                    catchXpGain = 20;
                    break;
                case "Epic":
                    fishData.stats.epicCatch += 1;
                    catchXpGain = 35;
                    break;
                case "Legendary":
                    fishData.stats.legendaryCatch += 1;
                    catchXpGain = 50;
                    break;
                case "Mythic":
                    fishData.stats.mythicCatch += 1;
                    catchXpGain = 75;
                    break;
                case "Secret":
                    fishData.stats.secretCatch += 1;
                    catchXpGain = 100;
                    break;
            }

            // Add XP based on level multiplier
            catchXpGain = Math.floor(
                catchXpGain * (1 + fishData.stats.level * 0.1),
            );
            totalXpGain += catchXpGain;

            // Check for level up
            const xpNeeded = fishData.stats.level * 1000;
            if (fishData.stats.xp >= xpNeeded) {
                fishData.stats.level += 1;
                fishData.stats.xp -= xpNeeded;
            }
        });

        fishData.stats.xp += totalXpGain;

        await fishData.save();

        // Send result
        let catchText = catches
            .map((c) => `${getRarityEmoji(c.rarity)} ${c.name}`)
            .join("\n");
        await sock.sendMessage(msg.key.remoteJid, {
            text:
                `🎣 *HASIL MEMANCING*\n` +
                `👤 Pemancing: @${senderJid.split("@")[0]}\n\n` +
                `${catchText}\n\n` +
                `💪 Durability: ${currentRod.durability}\n` +
                `🪱 Bait: ${baitData.name} (${currentBait.quantity} left)\n` +
                `✨ XP gained: ${totalXpGain}`,
            mentions: [senderJid],
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in fishing:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat memancing",
            quoted: msg,
        });
    }
}

async function dashboardHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });

        if (!fishData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Kamu belum mulai memancing! Gunakan .fish untuk mulai",
                quoted: msg,
            });
            return;
        }

        // Validasi rod yang aktif
        const currentRod = fishData.currentRod
            ? fishData.inventory.rods.find(
                  (r) => r.name === fishData.currentRod,
              )
            : null;

        const rodData = currentRod
            ? RODS[currentRod.name] || SPECIAL_ITEMS.rods[currentRod.name]
            : null;

        if (fishData.currentRod && !rodData) {
            fishData.currentRod = null;
            await fishData.save();
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Rod tidak ditemukan di daftar! Silakan pilih rod lain.",
                quoted: msg,
            });
            return;
        }

        const areaData = AREAS[fishData.currentArea];
        if (!areaData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Area tidak ditemukan!",
                quoted: msg,
            });
            return;
        }

        // Validasi bait yang aktif
        const currentBait = fishData.currentBait
            ? fishData.inventory.baits.find(
                  (b) => b.name === fishData.currentBait && b.quantity > 0,
              )
            : null;

        const baitData = currentBait
            ? BAITS[fishData.currentBait] ||
              SPECIAL_ITEMS.baits[fishData.currentBait]
            : null;

        if (fishData.currentBait && !baitData) {
            fishData.currentBait = null;
            await fishData.save();
        }

        const baitInfo = baitData
            ? `${baitData.name} (${currentBait.quantity} left)`
            : "Tidak ada";

        // Status rod dengan warna berdasarkan durability
        let durabilityStatus = "";
        if (currentRod) {
            const durabilityPercentage =
                (currentRod.durability / rodData.durability) * 100;
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
        const formatNumber = (num) =>
            num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        const xpNeeded = fishData.stats.level * 1000;
        const dashboard =
            `🎣 *FISHING DASHBOARD*\n` +
            `👤 Player: @${senderJid.split("@")[0]}\n\n` +
            `👨‍🎣 Level: ${fishData.stats.level}\n` +
            `✨ XP: ${fishData.stats.xp}/${xpNeeded}\n` +
            `🗺️ Area: ${areaData.name}\n` +
            `🎣 Rod: ${currentRod ? rodData.name : "Tidak ada"}\n` +
            `💪 Durability: ${currentRod ? durabilityStatus : "❌ Tidak ada rod"}\n` +
            `🪱 Bait: ${baitInfo}\n\n` +
            `📊 *STATISTIK*\n` +
            `🎯 Total Tangkapan: ${formatNumber(fishData.stats.totalCatch)}\n` +
            `💰 Total Profit: ${formatNumber(fishData.stats.totalProfit)}\n\n` +
            `*Rare Catches:*\n` +
            `🔵 Rare: ${formatNumber(fishData.stats.rareCatch)}\n` +
            `🟣 Epic: ${formatNumber(fishData.stats.epicCatch)}\n` +
            `🟡 Legendary: ${formatNumber(fishData.stats.legendaryCatch)}\n` +
            `🔴 Mythic: ${formatNumber(fishData.stats.mythicCatch)}\n` +
            `⭐ Secret: ${formatNumber(fishData.stats.secretCatch)}\n\n` +
            `⚠️ ${
                currentRod && currentRod.durability < 10
                    ? "Peringatan: Durability rod hampir habis!"
                    : "Tip: Gunakan bait untuk meningkatkan chance dapat ikan langka"
            }`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: dashboard,
            mentions: [senderJid],
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in dashboard handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat menampilkan dashboard",
            quoted: msg,
        });
    }
}

// Handler untuk area
async function areaHandler(sock, msg) {
    try {
        const areaNumber = parseInt(
            msg.message?.conversation?.split(" ")[1] ||
                msg.message?.extendedTextMessage?.text?.split(" ")[1],
        );

        if (isNaN(areaNumber)) {
            let areaList = Object.entries(AREAS)
                .map(([key, area], index) => {
                    const req = AREA_REQUIREMENTS[key];
                    return (
                        `${index + 1}. ${area.name}\n` +
                        `💰 Harga: ${req.price}\n` +
                        `🎣 Syarat Mancing: ${req.fishingCount}x\n` +
                        `🎣 Level Minimal: ${req.minLevel}\n` + // Added minLevel requirement
                        `${req.requiredFish ? `🐟 Perlu ikan: ${req.requiredFish}` : ""}\n`
                    );
                })
                .join("\n");

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🗺️ *AREA LIST*\n\n${areaList}\n\nGunakan .area <nomor> untuk pindah area`,
                quoted: msg,
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
                text: "❌ Area tidak ditemukan!",
                quoted: msg,
            });
            return;
        }

        if (!fishData.unlockedAreas.includes(areaKey)) {
            // Cek persyaratan
            const user = await User.getUser(senderJid);
            let failedRequirements = [];

            // Cek balance
            if (user.balance < requirements.price) {
                failedRequirements.push(
                    `💰 Kurang balance: ${requirements.price - user.balance}`,
                );
            }

            // Cek jumlah mancing
            if (fishData.stats.totalCatch < requirements.fishingCount) {
                failedRequirements.push(
                    `🎣 Kurang mancing: ${requirements.fishingCount - fishData.stats.totalCatch}x lagi`,
                );
            }

            // Cek level
            if (fishData.stats.level < requirements.minLevel) {
                failedRequirements.push(
                    `🎣 Level terlalu rendah: Butuh level ${requirements.minLevel}`,
                );
            }

            // Cek ikan yang dibutuhkan
            if (requirements.requiredFish) {
                const hasRequiredFish = fishData.inventory.fish.some(
                    (fish) =>
                        fish.name.toLowerCase() ===
                            requirements.requiredFish.toLowerCase() &&
                        fish.quantity > 0,
                );

                if (!hasRequiredFish) {
                    failedRequirements.push(
                        `🐟 Belum punya ikan: ${requirements.requiredFish}`,
                    );
                }
            }

            if (failedRequirements.length > 0) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ Syarat belum terpenuhi!\n\n${failedRequirements.join("\n")}`,
                    quoted: msg,
                });
                return;
            }

            // Jika semua syarat terpenuhi
            await User.updateUser(senderJid, {
                balance: user.balance - requirements.price,
            });

            // Jika ada ikan yang dibutuhkan, kurangi 1 dari inventory
            if (requirements.requiredFish) {
                const fishIndex = fishData.inventory.fish.findIndex(
                    (f) => f.name === requirements.requiredFish,
                );
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
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in area handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat mengganti area",
            quoted: msg,
        });
    }
}

// Handler untuk ganti rod
async function switchRodHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });

        // Ambil nama rod dari command
        const rodName =
            msg.message?.conversation
                ?.split(" ")
                .slice(1)
                .join("_")
                .toLowerCase() ||
            msg.message?.extendedTextMessage?.text
                ?.split(" ")
                .slice(1)
                .join("_")
                .toLowerCase();

        if (!rodName) {
            await sock.sendMessage(msg.key.remoteJid, {
                text:
                    `📝 *CARA PENGGUNAAN*\n\n` +
                    `Format: .switchrod <nama_rod>\n\n` +
                    `Contoh:\n` +
                    `• .switchrod ranting_pohon\n` +
                    `• .switchrod divine_rod\n` +
                    `• .switchrod golden_rod\n\n` +
                    `Gunakan .fishshop atau .specialshop untuk melihat daftar rod yang tersedia.`,
                quoted: msg,
            });
            return;
        }

        if (!fishData || !fishData.inventory.rods.length) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Kamu tidak memiliki pancingan!",
                quoted: msg,
            });
            return;
        }

        // Cek apakah player memiliki rod tersebut
        const hasRod = fishData.inventory.rods.find(
            (rod) => rod.name === rodName,
        );
        if (!hasRod) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Kamu tidak memiliki pancingan tersebut!",
                quoted: msg,
            });
            return;
        }

        // Cek data rod di RODS atau SPECIAL_ITEMS
        const rodData = RODS[rodName] || SPECIAL_ITEMS.rods[rodName];

        if (!rodData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Rod tidak ditemukan di daftar!",
                quoted: msg,
            });
            return;
        }

        // Switch ke rod yang dipilih
        fishData.currentRod = rodName;
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil mengganti ke *${rodData.name}*!`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in switch rod handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat mengganti pancingan",
            quoted: msg,
        });
    }
}

// Handler untuk inventory ikan
async function fishBagHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });

        if (!fishData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Kamu belum mulai memancing! Gunakan .fish untuk mulai",
                quoted: msg,
            });
            return;
        }

        // Format Fish Inventory dengan status lock
        const fishInventory = fishData.inventory.fish
            .sort((a, b) => {
                const rarityOrder = [
                    "Common",
                    "Uncommon",
                    "Rare",
                    "Epic",
                    "Legendary",
                    "Mythic",
                    "Secret",
                ];
                return (
                    rarityOrder.indexOf(a.rarity) -
                    rarityOrder.indexOf(b.rarity)
                );
            })
            .map((fish) => {
                const lockStatus = fish.isLocked ? "🔒" : ""; // Tambah emoji kunci jika ikan di-lock
                return `${getRarityEmoji(fish.rarity)} ${fish.name} (${fish.quantity}) ${lockStatus}`;
            })
            .join("\n");

        // Format Bait Inventory
        const baitInventory = fishData.inventory.baits
            .map((bait) => {
                const baitData =
                    BAITS[bait.name] || SPECIAL_ITEMS.baits[bait.name];
                if (!baitData) return null; // Skip jika bait tidak valid
                return `🪱 ${baitData.name} (${bait.quantity})`;
            })
            .filter((item) => item !== null) // Hapus item null
            .join("\n");

        // Format Rod Inventory
        const rodInventory = fishData.inventory.rods
            .map((rod) => {
                const rodData = RODS[rod.name] || SPECIAL_ITEMS.rods[rod.name];
                if (!rodData) return null; // Skip jika rod tidak valid

                const maxDurability = rodData.durability;
                const currentPercentage =
                    (rod.durability / maxDurability) * 100;
                let durabilityEmoji;
                if (currentPercentage > 75) durabilityEmoji = "💚";
                else if (currentPercentage > 50) durabilityEmoji = "💛";
                else if (currentPercentage > 25) durabilityEmoji = "🟧";
                else durabilityEmoji = "❤️";

                return (
                    `🎣 ${rodData.name}\n` +
                    `${durabilityEmoji} Durability: ${rod.durability}/${maxDurability}` +
                    `${rod.name === fishData.currentRod ? "\n✅ (Digunakan)" : ""}`
                );
            })
            .filter((item) => item !== null) // Hapus item null
            .join("\n\n");

        // Pengecekan inventory kosong
        const hasNoItems = !fishInventory && !baitInventory && !rodInventory;

        const inventory =
            `🎒 *INVENTORY*\n` +
            `👤 Player: @${senderJid.split("@")[0]}\n\n` +
            (hasNoItems ? "❌ Inventory kosong!\n\n" : "") +
            (fishInventory
                ? `📦 *FISH COLLECTION*\n${fishInventory}\n\n`
                : "") +
            (baitInventory ? `🪱 *BAIT INVENTORY*\n${baitInventory}\n\n` : "") +
            (rodInventory ? `🎣 *ROD INVENTORY*\n${rodInventory}` : "");

        await sock.sendMessage(msg.key.remoteJid, {
            text: inventory,
            mentions: [senderJid],
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in fish bag handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat menampilkan inventory",
            quoted: msg,
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
                text: "❌ Tidak ada ikan untuk dijual!",
                quoted: msg,
            });
            return;
        }

        const fishName =
            msg.message?.conversation?.split(" ").slice(1).join(" ") ||
            msg.message?.extendedTextMessage?.text
                ?.split(" ")
                .slice(1)
                .join(" ");

        let totalProfit = 0;
        const user = await User.getUser(senderJid);

        if (fishName) {
            // Sell specific fish
            const fishIndex = fishData.inventory.fish.findIndex(
                (f) => f.name.toLowerCase() === fishName.toLowerCase(),
            );

            if (fishIndex === -1) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: "❌ Ikan tidak ditemukan!",
                    quoted: msg,
                });
                return;
            }

            const fish = fishData.inventory.fish[fishIndex];

            // Cek apakah ikan di-lock
            if (fish.isLocked) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: "❌ Ikan ini sedang dikunci! Unlock terlebih dahulu untuk menjual",
                    quoted: msg,
                });
                return;
            }

            const areaWithFish = Object.values(AREAS).find((area) =>
                area.fish.some((f) => f.name === fish.name),
            );
            const fishPrice = areaWithFish.fish.find(
                (f) => f.name === fish.name,
            ).price;
            totalProfit = fishPrice * fish.quantity;

            fishData.inventory.fish.splice(fishIndex, 1);
            fishData.stats.totalProfit += totalProfit;
        } else {
            // Sell all unlocked fish
            const lockedFish = [];
            const fishToSell = [];

            fishData.inventory.fish.forEach((fish) => {
                if (fish.isLocked) {
                    lockedFish.push(fish);
                } else {
                    const areaWithFish = Object.values(AREAS).find((area) =>
                        area.fish.some((f) => f.name === fish.name),
                    );
                    const fishPrice = areaWithFish.fish.find(
                        (f) => f.name === fish.name,
                    ).price;
                    totalProfit += fishPrice * fish.quantity;
                    fishToSell.push(fish);
                }
            });

            // Update inventory hanya dengan ikan yang di-lock
            fishData.inventory.fish = lockedFish;
            fishData.stats.totalProfit += totalProfit;
        }

        await User.updateUser(senderJid, {
            balance: user.balance + totalProfit,
        });
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `💰 Berhasil menjual ikan!\nProfit: ${totalProfit}`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in sell fish handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat menjual ikan",
            quoted: msg,
        });
    }
}

// Handler untuk shop
async function fishShopHandler(sock, msg) {
    try {
        const rodList = Object.entries(RODS)
            .map(
                ([key, rod]) =>
                    `🎣 ${rod.name}\n` +
                    `💰 Price: ${rod.price}\n` +
                    `💪 Durability: ${rod.durability}\n` +
                    `📝 ${rod.description}\n`,
            )
            .join("\n");

        await sock.sendMessage(msg.key.remoteJid, {
            text: `🏪 *FISH SHOP*\n\n${rodList}\n\nGunakan .buyrod <nama_rod> untuk membeli`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in fish shop handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat menampilkan shop",
            quoted: msg,
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
                text: "❌ Kamu belum mulai memancing!",
                quoted: msg,
            });
            return;
        }

        const xpNeeded = fishData.stats.level * 1000;
        const stats =
            `📊 *FISHING STATS*\n\n` +
            `👨‍🎣 Level: ${fishData.stats.level}\n` +
            `✨ XP: ${fishData.stats.xp}/${xpNeeded}\n` +
            `🎣 Total Tangkapan: ${fishData.stats.totalCatch}\n` +
            `💰 Total Profit: ${fishData.stats.totalProfit}\n\n` +
            `*Rare Catches:*\n` +
            `🔵 Rare: ${fishData.stats.rareCatch}\n` +
            `🟣 Epic: ${fishData.stats.epicCatch}\n` +
            `🟡 Legendary: ${fishData.stats.legendaryCatch}\n\n` +
            `*Area Terbuka:*\n` +
            fishData.unlockedAreas
                .map((area) => `• ${AREAS[area].name}`)
                .join("\n");

        await sock.sendMessage(msg.key.remoteJid, {
            text: stats,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in fish stats handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat menampilkan statistik",
            quoted: msg,
        });
    }
}

async function buyRodHandler(sock, msg) {
    try {
        const rodName =
            msg.message?.conversation
                ?.split(" ")
                .slice(1)
                .join("_")
                .toLowerCase() ||
            msg.message?.extendedTextMessage?.text
                ?.split(" ")
                .slice(1)
                .join("_")
                .toLowerCase();

        if (!rodName) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Format salah! Gunakan .buyrod <nama_rod>",
                quoted: msg,
            });
            return;
        }

        // Check both regular and special rods
        const rod = RODS[rodName] || SPECIAL_ITEMS.rods[rodName];
        if (!rod) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Rod tidak ditemukan!",
                quoted: msg,
            });
            return;
        }

        // Check stock for special items
        if (SPECIAL_ITEMS.rods[rodName] && rod.stock <= 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Stock rod ini sedang habis!",
                quoted: msg,
            });
            return;
        }

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const user = await User.getUser(senderJid);
        let fishData = await Fish.findOne({ jid: senderJid });

        if (!fishData) {
            fishData = await Fish.create({
                jid: senderJid,
                inventory: {
                    rods: [],
                    fish: [],
                },
            });
        }

        if (user.balance < rod.price) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Balance tidak cukup! Butuh 💰 ${rod.price}`,
                quoted: msg,
            });
            return;
        }

        const hasRod = fishData.inventory.rods.some((r) => r.name === rodName);
        if (hasRod) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Kamu sudah memiliki rod ini!",
                quoted: msg,
            });
            return;
        }

        // Reduce stock for special items
        if (SPECIAL_ITEMS.rods[rodName]) {
            rod.stock -= 1;
        }

        await User.updateUser(senderJid, { balance: user.balance - rod.price });
        fishData.inventory.rods.push({
            name: rodName,
            durability: rod.durability,
        });

        if (!fishData.currentRod) {
            fishData.currentRod = rodName;
        }

        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text:
                `✅ Berhasil membeli ${rod.name}!\n` +
                `💪 Durability: ${rod.durability}\n` +
                `📝 ${rod.description}`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in buy rod handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat membeli rod",
            quoted: msg,
        });
    }
}

async function baitShopHandler(sock, msg) {
    try {
        const baitList = Object.entries(BAITS)
            .map(([key, bait]) => {
                let baitInfo = `🎣 ${bait.name}\n`;
                baitInfo += `💰 Price: ${bait.price} (${bait.quantity} bait)\n`;

                // Tampilkan area yang bisa dipakai
                const areaNames = bait.areas
                    .map((area) => AREAS[area].name)
                    .join(", ");
                baitInfo += `🗺️ Areas: ${areaNames}\n`;

                // Tampilkan effects yangnon-zero
                const activeEffects = Object.entries(bait.effects)
                    .filter(([_, value]) => value > 0)
                    .map(
                        ([type, value]) =>
                            `- ${type.charAt(0).toUpperCase() + type.slice(1)}: +${value * 100}%`,
                    );

                if (activeEffects.length > 0) {
                    baitInfo += `📊 Effects:\n${activeEffects.join("\n")}`;
                }

                baitInfo += `\n📝 ${bait.description}\n`;
                return baitInfo;
            })
            .join("\n");

        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎣 *BAIT SHOP*\n\n${baitList}\n\nGunakan .buybait <nama_bait> untuk membeli`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in bait shop handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat menampilkan bait shop",
            quoted: msg,
        });
    }
}

// Add handler for buying bait
async function buyBaitHandler(sock, msg) {
    try {
        const baitName =
            msg.message?.conversation
                ?.split(" ")
                .slice(1)
                .join("_")
                .toLowerCase() ||
            msg.message?.extendedTextMessage?.text
                ?.split(" ")
                .slice(1)
                .join("_")
                .toLowerCase();

        if (!baitName) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Format salah! Gunakan .buybait <nama_bait>",
                quoted: msg,
            });
            return;
        }

        // Check both regular and special baits
        // Prevent buying lunar bait
        if (baitName === "lunar") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Lunar Bait tidak dapat dibeli! Dapatkan dengan memancing di area biasa",
                quoted: msg,
            });
            return;
        }

        const bait = BAITS[baitName] || SPECIAL_ITEMS.baits[baitName];
        if (!bait) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Bait tidak ditemukan!",
                quoted: msg,
            });
            return;
        }

        // Check stock for special items
        if (SPECIAL_ITEMS.baits[baitName] && bait.stock <= 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Stock bait ini sedang habis!",
                quoted: msg,
            });
            return;
        }

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const user = await User.getUser(senderJid);
        let fishData = await Fish.findOne({ jid: senderJid });

        if (user.balance < bait.price) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Balance tidak cukup! Butuh 💰 ${bait.price}`,
                quoted: msg,
            });
            return;
        }

        // Reduce stock for special items
        if (SPECIAL_ITEMS.baits[baitName]) {
            bait.stock -= 1;
        }

        // Update inventory
        const existingBait = fishData.inventory.baits.find(
            (b) => b.name === baitName,
        );
        if (existingBait) {
            existingBait.quantity += bait.quantity;
        } else {
            fishData.inventory.baits.push({
                name: baitName,
                quantity: bait.quantity,
            });
        }

        await User.updateUser(senderJid, {
            balance: user.balance - bait.price,
        });
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text:
                `✅ Berhasil membeli ${bait.name}!\n` +
                `📊 Jumlah: ${bait.quantity} umpan\n` +
                `📝 ${bait.description}`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in buy bait handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat membeli bait",
            quoted: msg,
        });
    }
}

// Add handler for switching bait
async function switchBaitHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });

        const baitName =
            msg.message?.conversation
                ?.split(" ")
                .slice(1)
                .join("_")
                .toLowerCase() ||
            msg.message?.extendedTextMessage?.text
                ?.split(" ")
                .slice(1)
                .join("_")
                .toLowerCase();

        if (!baitName) {
            const currentBait = fishData.currentBait
                ? BAITS[fishData.currentBait]?.name ||
                  SPECIAL_ITEMS.baits[fishData.currentBait]?.name
                : "Tidak ada";
            const baitInventory = fishData.inventory.baits
                .map((b) => {
                    const baitData =
                        BAITS[b.name] || SPECIAL_ITEMS.baits[b.name];
                    if (!baitData) return null; // Skip jika bait tidak valid
                    const areaNames = baitData.areas
                        .map((area) => AREAS[area].name)
                        .join(", ");
                    return `- ${baitData.name}: ${b.quantity} umpan\n  🗺️ Areas: ${areaNames}`;
                })
                .filter((item) => item !== null)
                .join("\n");

            await sock.sendMessage(msg.key.remoteJid, {
                text:
                    `🎣 *BAIT INFO*\n\n` +
                    `Current Bait: ${currentBait}\n\n` +
                    `Inventory Bait:\n${baitInventory || "Kosong"}`,
                quoted: msg,
            });
            return;
        }

        const hasBait = fishData.inventory.baits.find(
            (b) => b.name === baitName && b.quantity > 0,
        );
        if (!hasBait) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Kamu tidak memiliki bait tersebut atau jumlahnya habis!",
                quoted: msg,
            });
            return;
        }

        // Cek apakah bait bisa digunakan di area saat ini
        const baitData = BAITS[baitName] || SPECIAL_ITEMS.baits[baitName];
        if (!baitData) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Umpan tidak ditemukan di daftar!",
                quoted: msg,
            });
            return;
        }

        if (!baitData.areas.includes(fishData.currentArea)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ ${baitData.name} tidak bisa digunakan di area ${AREAS[fishData.currentArea].name}!\nArea yang tersedia: ${baitData.areas.map((area) => AREAS[area].name).join(", ")}`,
                quoted: msg,
            });
            return;
        }

        fishData.currentBait = baitName;
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil mengganti ke *${baitData.name}*!`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in switch bait handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat mengganti bait",
            quoted: msg,
        });
    }
}

async function lockFishHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });

        if (!fishData || !fishData.inventory.fish.length) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Tidak ada ikan di inventory!",
                quoted: msg,
            });
            return;
        }

        const fishName =
            msg.message?.conversation?.split(" ").slice(1).join(" ") ||
            msg.message?.extendedTextMessage?.text
                ?.split(" ")
                .slice(1)
                .join(" ");

        if (!fishName) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Format salah! Gunakan .lockfish <nama_ikan>",
                quoted: msg,
            });
            return;
        }

        const fishIndex = fishData.inventory.fish.findIndex(
            (f) => f.name.toLowerCase() === fishName.toLowerCase(),
        );

        if (fishIndex === -1) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Ikan tidak ditemukan di inventory!",
                quoted: msg,
            });
            return;
        }

        if (fishData.inventory.fish[fishIndex].isLocked) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Ikan ini sudah terkunci!",
                quoted: msg,
            });
            return;
        }

        // Lock ikan
        fishData.inventory.fish[fishIndex].isLocked = true;
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil mengunci ${fishName}!\nIkan ini tidak akan bisa dijual sampai di-unlock`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in lock fish handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat mengunci ikan",
            quoted: msg,
        });
    }
}

async function unlockFishHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fishData = await Fish.findOne({ jid: senderJid });

        if (!fishData || !fishData.inventory.fish.length) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Tidak ada ikan di inventory!",
                quoted: msg,
            });
            return;
        }

        const fishName =
            msg.message?.conversation?.split(" ").slice(1).join(" ") ||
            msg.message?.extendedTextMessage?.text
                ?.split(" ")
                .slice(1)
                .join(" ");

        if (!fishName) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Format salah! Gunakan .unlockfish <nama_ikan>",
                quoted: msg,
            });
            return;
        }

        const fishIndex = fishData.inventory.fish.findIndex(
            (f) => f.name.toLowerCase() === fishName.toLowerCase(),
        );

        if (fishIndex === -1) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Ikan tidak ditemukan di inventory!",
                quoted: msg,
            });
            return;
        }

        if (!fishData.inventory.fish[fishIndex].isLocked) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Ikan ini tidak dalam keadaan terkunci!",
                quoted: msg,
            });
            return;
        }

        // Unlock ikan
        fishData.inventory.fish[fishIndex].isLocked = false;
        await fishData.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil membuka kunci ${fishName}!\nIkan ini sekarang bisa dijual`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in unlock fish handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat membuka kunci ikan",
            quoted: msg,
        });
    }
}

async function specialShopHandler(sock, msg) {
    try {
        const rodList = Object.entries(SPECIAL_ITEMS.rods)
            .map(
                ([key, rod]) =>
                    `🎣 ${rod.name}\n` +
                    `💰 Price: ${rod.price}\n` +
                    `💪 Durability: ${rod.durability}\n` +
                    `📦 Stock: ${rod.stock}\n` +
                    `📝 ${rod.description}\n`,
            )
            .join("\n");

        const baitList = Object.entries(SPECIAL_ITEMS.baits)
            .map(([key, bait]) => {
                let baitInfo = `🪱 ${bait.name}\n`;
                baitInfo += `💰 Price: ${bait.price} (${bait.quantity} bait)\n`;
                baitInfo += `📦 Stock: ${bait.stock}\n`;

                // Display effects
                const activeEffects = Object.entries(bait.effects)
                    .filter(([_, value]) => value > 0)
                    .map(
                        ([type, value]) =>
                            `- ${type.charAt(0).toUpperCase() + type.slice(1)}: +${(value * 100).toFixed(1)}%`,
                    );

                if (activeEffects.length > 0) {
                    baitInfo += `📊 Effects:\n${activeEffects.join("\n")}\n`;
                }

                baitInfo += `📝 ${bait.description}\n`;
                return baitInfo;
            })
            .join("\n");

        await sock.sendMessage(msg.key.remoteJid, {
            text:
                `🏪 *SPECIAL SHOP*\n\n` +
                `*SPECIAL RODS*\n${rodList}\n` +
                `*SPECIAL BAITS*\n${baitList}\n\n` +
                `Gunakan .buyrod/.buybait <nama_item> untuk membeli\n` +
                `⚠️ Item hanya tersedia selama stock masih ada!`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in special shop handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat menampilkan special shop",
            quoted: msg,
        });
    }
}

// Add addStockHandler function
async function addStockHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        if (!isOwner(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Command ini hanya untuk owner bot!",
                quoted: msg,
            });
            return;
        }

        const args =
            msg.message?.conversation?.split(" ").slice(1) ||
            msg.message?.extendedTextMessage?.text?.split(" ").slice(1) ||
            [];

        if (args.length !== 3) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Format salah! Gunakan .addstock <bait/rod> <nama_item> <jumlah>",
                quoted: msg,
            });
            return;
        }

        const [itemType, itemName, amount] = args;
        const itemAmount = parseInt(amount);

        if (isNaN(itemAmount) || itemAmount < 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Jumlah stock harus berupa angka positif!",
                quoted: msg,
            });
            return;
        }

        if (itemType.toLowerCase() === "rod") {
            const rod = SPECIAL_ITEMS.rods[itemName.toLowerCase()];
            if (!rod) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: "❌ Rod tidak ditemukan di special shop!",
                    quoted: msg,
                });
                return;
            }
            rod.stock += itemAmount;
        } else if (itemType.toLowerCase() === "bait") {
            const bait = SPECIAL_ITEMS.baits[itemName.toLowerCase()];
            if (!bait) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: "❌ Bait tidak ditemukan di special shop!",
                    quoted: msg,
                });
                return;
            }
            bait.stock += itemAmount;
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ Tipe item tidak valid! Gunakan bait atau rod",
                quoted: msg,
            });
            return;
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil menambah stock ${itemName} sebanyak ${itemAmount}!`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in add stock handler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat menambah stock",
            quoted: msg,
        });
    }
}

// Helper function to parse duration string to milliseconds
function parseDuration(duration) {
    const match = duration.match(/^(\d+)([dh])$/);
    if (!match) return null;

    const [_, amount, unit] = match;
    const multiplier = unit === "d" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    return parseInt(amount) * multiplier;
}

module.exports = {
    fishingHandler,
    dashboardHandler,
    areaHandler,
    switchRodHandler,
    fishBagHandler,
    sellFishHandler,
    fishShopHandler,
    fishStatsHandler,
    switchBaitHandler,
    baitShopHandler,
    buyBaitHandler,
    buyRodHandler,
    lockFishHandler,
    unlockFishHandler,
    specialShopHandler,
    addStockHandler,
};