const Pokemon = require('../../database/models/Pokemon');
const PokemonInventory = require('../../database/models/PokemonInventory');
const User = require('../../database/models/User');
const { generateWildPokemon, generatePokemon } = require('../commands/pokemongenerator');

// Game state for active encounters
const encounters = {};
const battles = {};
const trainingCooldowns = new Map();

// type emojis dan list type pokemon
const TYPE_EMOJIS = {
    normal: '⚪',
    fire: '🔥',
    water: '💧',
    grass: '🌿',
    electric: '⚡',
    ice: '❄️',
    fighting: '👊',
    ground: '🌍',
    rock: '🪨',
    dragon: '🐉',
};

// Add rarity emojis and colors
const RARITY_INFO = {
    common: { emoji: '⚪', color: '```⬜```' },
    uncommon: { emoji: '🟢', color: '```🟩```' },
    rare: { emoji: '🔵', color: '```🟦```' },
    epic: { emoji: '🟣', color: '```🟪```' },
    legendary: { emoji: '🟡', color: '```🟨```' },
    mythic: { emoji: '❤️', color: '```❤️```' }
};

async function startMonHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        const userPokemons = await Pokemon.getUserPokemons(senderJid);
        if (userPokemons.length > 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu sudah memiliki Pokemon! Gunakan *.mons* untuk melihat Pokemon kamu.',
                quoted: msg
            });
            return;
        }

        const starters = [
            {
                name: 'Bulbasaur',
                type: 'grass',
                rarity: 'uncommon',
                stats: { hp: 45, attack: 49, defense: 49, speed: 45 },
                moves: [
                    { name: 'Tackle', power: 40, type: 'normal' },
                    { name: 'Vine Whip', power: 45, type: 'grass' }
                ]
            },
            {
                name: 'Charmander',
                type: 'fire',
                rarity: 'uncommon',
                stats: { hp: 39, attack: 52, defense: 43, speed: 65 },
                moves: [
                    { name: 'Scratch', power: 40, type: 'normal' },
                    { name: 'Ember', power: 40, type: 'fire' }
                ]
            },
            {
                name: 'Squirtle',
                type: 'water',
                rarity: 'uncommon',
                stats: { hp: 44, attack: 48, defense: 65, speed: 43 },
                moves: [
                    { name: 'Tackle', power: 40, type: 'normal' },
                    { name: 'Water Gun', power: 40, type: 'water' }
                ]
            }
        ];

        let message = `🌟 *Welcome to Pokemon Adventure!* 🌟\n\n`;
        message += `Pilih Pokemon pertama kamu:\n\n`;
        message += `1. *Bulbasaur* ${TYPE_EMOJIS.grass}\n`;
        message += `   ├ Type: Grass\n`;
        message += `   ├ Stats: ❤️ ${starters[0].stats.hp} | ⚔️ ${starters[0].stats.attack} | 🛡️ ${starters[0].stats.defense} | 💨 ${starters[0].stats.speed}\n`;
        message += `   └ Moves: Tackle, Vine Whip\n\n`;
        message += `2. *Charmander* ${TYPE_EMOJIS.fire}\n`;
        message += `   ├ Type: Fire\n`;
        message += `   ├ Stats: ❤️ ${starters[1].stats.hp} | ⚔️ ${starters[1].stats.attack} | 🛡️ ${starters[1].stats.defense} | 💨 ${starters[1].stats.speed}\n`;
        message += `   └ Moves: Scratch, Ember\n\n`;
        message += `3. *Squirtle* ${TYPE_EMOJIS.water}\n`;
        message += `   ├ Type: Water\n`;
        message += `   ├ Stats: ❤️ ${starters[2].stats.hp} | ⚔️ ${starters[2].stats.attack} | 🛡️ ${starters[2].stats.defense} | 💨 ${starters[2].stats.speed}\n`;
        message += `   └ Moves: Tackle, Water Gun\n\n`;
        message += `Ketik angka 1-3 untuk memilih Pokemon pertamamu! 🎮`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            quoted: msg
        });

        encounters[msg.key.remoteJid] = {
            type: 'starter',
            options: starters,
            userId: senderJid
        };

    } catch (error) {
        console.error('Error in startMonHandler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memulai game',
            quoted: msg
        });
    }
}

async function exploreHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        const userPokemons = await Pokemon.getUserPokemons(senderJid);
        if (userPokemons.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum punya Pokemon! Gunakan *.startmon* untuk memulai petualanganmu.',
                quoted: msg
            });
            return;
        }

        if (encounters[msg.key.remoteJid]) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu sedang dalam encounter! Selesaikan dulu atau ketik *.run* untuk kabur.',
                quoted: msg
            });
            return;
        }

        const wildPokemon = generateWildPokemon();
        encounters[msg.key.remoteJid] = {
            type: 'wild',
            pokemon: wildPokemon,
            userId: senderJid
        };

        let message = `🌿 *Pokemon Liar Muncul!* 🌿\n\n`;
        message += `Kamu menemukan *${wildPokemon.name}* ${TYPE_EMOJIS[wildPokemon.type]}!\n\n`;
        message += `📊 *Info Pokemon*:\n`;
        message += `├ Rarity: ${RARITY_INFO[wildPokemon.rarity].emoji} ${wildPokemon.rarity}\n`;
        message += `├ Level: ✨ ${wildPokemon.level}\n`;
        message += `└ Type: ${TYPE_EMOJIS[wildPokemon.type]} ${wildPokemon.type}\n\n`;
        message += `Apa yang akan kamu lakukan?\n`;
        message += `├ *.catch* - Mencoba menangkap\n`;
        message += `└ *.run* - Kabur dari pertarungan`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in exploreHandler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat exploring',
            quoted: msg
        });
    }
}

async function catchHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        const userPokemons = await Pokemon.getUserPokemons(senderJid);
        if (userPokemons.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum punya Pokemon! Gunakan *.startmon* untuk memulai petualanganmu.',
                quoted: msg
            });
            return;
        }

        // Check if user has Pokeballs
        const inventory = await PokemonInventory.getInventory(senderJid);
        if (!inventory || inventory.items.pokeball <= 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu tidak punya Pokeball! Beli di *.shop*.\n\n💰 Harga Pokeball: 100 coins',
                quoted: msg
            });
            return;
        }

        const encounter = encounters[msg.key.remoteJid];
        if (!encounter || encounter.type !== 'wild') {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada Pokemon liar! Gunakan *.explore* untuk mencari Pokemon.',
                quoted: msg
            });
            return;
        }

        // Calculate catch probability based on rarity
        const catchRate = calculateCatchRate(encounter.pokemon.rarity);
        const success = Math.random() < catchRate;

        // Use Pokeball
        await PokemonInventory.useItem(senderJid, 'pokeball');

        let message = `🎯 *Melempar Pokeball!*\n\n`;
        message += `Menangkap ${encounter.pokemon.name} ${TYPE_EMOJIS[encounter.pokemon.type]}...\n`;
        message += `└ Rarity: ${RARITY_INFO[encounter.pokemon.rarity].emoji} ${encounter.pokemon.rarity}\n\n`;

        if (success) {
            // Add Pokemon to user's collection
            await Pokemon.createPokemon(senderJid, encounter.pokemon);
            
            message += `🎉 *Berhasil!* 🎉\n`;
            message += `Pokemon berhasil ditangkap!\n\n`;
            message += `📊 *Info Pokemon*:\n`;
            message += `├ Nama: ${encounter.pokemon.name}\n`;
            message += `├ Type: ${TYPE_EMOJIS[encounter.pokemon.type]} ${encounter.pokemon.type}\n`;
            message += `├ Level: ✨ ${encounter.pokemon.level}\n`;
            message += `└ Stats: ❤️ ${encounter.pokemon.stats.hp} | ⚔️ ${encounter.pokemon.stats.attack} | 🛡️ ${encounter.pokemon.stats.defense} | 💨 ${encounter.pokemon.stats.speed}\n\n`;
            message += `Gunakan *.mons* untuk melihat koleksi Pokemon kamu!`;
        } else {
            message += `💨 *Gagal!* \n`;
            message += `${encounter.pokemon.name} berhasil kabur!\n\n`;
            message += `Sisa Pokeball: ${inventory.items.pokeball - 1}`;
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            quoted: msg
        });
        
        // Clear encounter
        delete encounters[msg.key.remoteJid];

    } catch (error) {
        console.error('Error in catchHandler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menangkap Pokemon',
            quoted: msg
        });
    }
}

async function monsHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const pokemons = await Pokemon.getUserPokemons(senderJid);
        
        if (pokemons.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum punya Pokemon! Gunakan *.startmon* untuk memulai.',
                quoted: msg
            });
            return;
        }

        let message = `📦 *Koleksi Pokemon Kamu* 📦\n`;
        message += `Total Pokemon: ${pokemons.length}\n\n`;

        pokemons.forEach((pokemon, index) => {
            message += `${index + 1}. *${pokemon.name}* ${TYPE_EMOJIS[pokemon.type]}`;
            if (pokemon.nickname) message += ` _(${pokemon.nickname})_`;
            message += `\n`;
            message += `   ├ Level: ✨ ${pokemon.level} (XP: ${pokemon.xp}/100)\n`;
            message += `   ├ Type: ${TYPE_EMOJIS[pokemon.type]} ${pokemon.type}\n`;
            message += `   ├ Rarity: ${RARITY_INFO[pokemon.rarity].emoji} ${pokemon.rarity}\n`;
            message += `   ├ Stats: ❤️ ${pokemon.stats.hp} | ⚔️ ${pokemon.stats.attack} | 🛡️ ${pokemon.stats.defense} | 💨 ${pokemon.stats.speed}\n`;
            message += `   └ Status: ${pokemon.isActive ? '✅ Active' : ''}${pokemon.isFainted ? '💀 Fainted' : ''}\n\n`;
        });

        message += `\n📝 *Commands*:\n`;
        message += `├ *.train* - Latih Pokemon aktif\n`;
        message += `├ *.evolve <nama>* - Evolusi Pokemon\n`;
        message += `├ *.heal* - Pulihkan Pokemon\n`;
        message += `└ *.rename <nama> <nickname>* - Beri nickname`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in monsHandler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menampilkan koleksi Pokemon',
            quoted: msg
        });
    }
}

// Handler for Pokemon training
async function trainHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Check cooldown
        const lastTrainingTime = trainingCooldowns.get(senderJid);
        const now = Date.now();
        const cooldownTime = 45000; // 45 seconds in milliseconds
        
        if (lastTrainingTime && (now - lastTrainingTime) < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (now - lastTrainingTime)) / 1000);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `⏳ Tunggu ${remainingTime} detik lagi untuk training kembali!`,
                quoted: msg
            });
            return;
        }
        
        // Get active Pokemon
        const userPokemons = await Pokemon.getUserPokemons(senderJid);
        const activePokemon = userPokemons.find(p => p.isActive);

        if (!activePokemon) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum memilih Pokemon aktif! Gunakan *.setactive <nama>* untuk memilih Pokemon.',
                quoted: msg
            });
            return;
        }

        // Check if Pokemon is fainted
        if (activePokemon.isFainted) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Pokemon kamu pingsan! Gunakan *.heal* untuk menyembuhkan.',
                quoted: msg
            });
            return;
        }

        // Check user's training limit
        if (!await User.useLimit(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Limit training kamu habis! Tunggu reset harian.',
                quoted: msg
            });
            return;
        }

        // Generate random XP gain (20-50)
        const xpGain = Math.floor(Math.random() * 31) + 20;
        
        // Apply XP gain and check for level up
        const updatedPokemon = await Pokemon.gainExperience(activePokemon._id, xpGain);
        
        let message = `⚔️ *Training Session* ⚔️\n\n`;
        message += `Pokemon: *${updatedPokemon.name}* ${TYPE_EMOJIS[updatedPokemon.type]}\n`;
        message += `├ Level: ✨ ${updatedPokemon.level}\n`;
        message += `└ XP: +${xpGain} 📈\n\n`;
        
        if (updatedPokemon.level > activePokemon.level) {
            message += `🎉 *LEVEL UP!* 🎉\n`;
            message += `${activePokemon.level} → ${updatedPokemon.level}\n\n`;
            message += `📊 *Stat Boost*:\n`;
            message += `├ ❤️ HP +5\n`;
            message += `├ ⚔️ Attack +2\n`;
            message += `├ 🛡️ Defense +2\n`;
            message += `└ 💨 Speed +2\n`;
            
            // Check for evolution
            if (updatedPokemon.evolution?.canEvolve && 
                updatedPokemon.level >= updatedPokemon.evolution.levelRequired) {
                message += `\n⭐ ${updatedPokemon.name} bisa berevolusi!\n`;
                message += `Gunakan *.evolve ${updatedPokemon.name}* untuk evolusi.`;
            }
        }

        // Set cooldown after successful training
        trainingCooldowns.set(senderJid, now);
        message += `\n\n⏳ Training cooldown: 45 detik`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in trainHandler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat training Pokemon',
            quoted: msg
        });
    }
}

// Handler for evolving Pokemon
async function evolveHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        const args = msg.body?.split(' ');
        if (args.length < 2) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan *.evolve <nama_pokemon>*',
                quoted: msg
            });
            return;
        }

        const pokemonName = args.slice(1).join(' ');
        const userPokemons = await Pokemon.getUserPokemons(senderJid);
        const pokemon = userPokemons.find(p => 
            p.name.toLowerCase() === pokemonName.toLowerCase() ||
            (p.nickname && p.nickname.toLowerCase() === pokemonName.toLowerCase())
        );

        if (!pokemon) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Pokemon tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        // Check evolution requirements
        if (!pokemon.evolution?.canEvolve) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Pokemon ini tidak bisa berevolusi!',
                quoted: msg
            });
            return;
        }

        if (pokemon.level < pokemon.evolution.levelRequired) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Level Pokemon belum cukup!\nLevel saat ini: ${pokemon.level}\nLevel yang dibutuhkan: ${pokemon.evolution.levelRequired}`,
                quoted: msg
            });
            return;
        }

        let message = `⭐ *EVOLUSI POKEMON* ⭐\n\n`;
        message += `Pokemon: *${pokemon.name}* ${TYPE_EMOJIS[pokemon.type]}\n`;
        message += `Level: ✨ ${pokemon.level}\n\n`;
        
        // Check if evolution needs item
        if (pokemon.evolution.itemRequired) {
            const hasItem = await PokemonInventory.hasItem(
                senderJid, 
                pokemon.evolution.itemRequired
            );
            
            if (!hasItem) {
                message += `❌ Evolusi gagal!\n`;
                message += `Kamu membutuhkan *${pokemon.evolution.itemRequired}* untuk evolusi.`;
                await sock.sendMessage(msg.key.remoteJid, {
                    text: message,
                    quoted: msg
                });
                return;
            }

            // Use evolution item
            await PokemonInventory.useItem(senderJid, pokemon.evolution.itemRequired);
        }

        // Perform evolution
        const evolvedPokemon = generatePokemon(pokemon.evolution.evolvesTo, pokemon.level);
        evolvedPokemon.nickname = pokemon.nickname;
        
        // Update Pokemon in database
        await Pokemon.updatePokemon(pokemon._id, {
            name: evolvedPokemon.name,
            type: evolvedPokemon.type,
            stats: evolvedPokemon.stats,
            moves: evolvedPokemon.moves,
            evolution: evolvedPokemon.evolution
        });

        message += `🌟 *EVOLUSI BERHASIL!* 🌟\n\n`;
        message += `${pokemon.name} ${TYPE_EMOJIS[pokemon.type]} → ${evolvedPokemon.name} ${TYPE_EMOJIS[evolvedPokemon.type]}\n\n`;
        message += `📊 *New Stats*:\n`;
        message += `├ ❤️ HP: ${pokemon.stats.hp} → ${evolvedPokemon.stats.hp}\n`;
        message += `├ ⚔️ Attack: ${pokemon.stats.attack} → ${evolvedPokemon.stats.attack}\n`;
        message += `├ 🛡️ Defense: ${pokemon.stats.defense} → ${evolvedPokemon.stats.defense}\n`;
        message += `└ 💨 Speed: ${pokemon.stats.speed} → ${evolvedPokemon.stats.speed}\n\n`;
        message += `Gunakan *.mons* untuk melihat Pokemon barumu!`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in evolveHandler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat evolusi Pokemon',
            quoted: msg
        });
    }
}

module.exports = {
    startMonHandler,
    exploreHandler,
    catchHandler,
    monsHandler,
    trainHandler,
    evolveHandler,
    encounters,
    trainingCooldowns
};