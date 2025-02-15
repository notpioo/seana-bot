// Pokemon data pools grouped by rarity
const POKEMON_POOLS = {
    common: [
        {
            name: 'Rattata',
            type: 'normal',
            stats: { hp: 30, attack: 56, defense: 35, speed: 72 },
            moves: [
                { name: 'Tackle', power: 40, type: 'normal' },
                { name: 'Quick Attack', power: 40, type: 'normal' }
            ],
            evolution: {
                canEvolve: true,
                evolvesTo: 'Raticate',
                levelRequired: 20
            }
        },
        {
            name: 'Pidgey',
            type: 'flying',
            stats: { hp: 40, attack: 45, defense: 40, speed: 56 },
            moves: [
                { name: 'Tackle', power: 40, type: 'normal' },
                { name: 'Gust', power: 40, type: 'flying' }
            ],
            evolution: {
                canEvolve: true,
                evolvesTo: 'Pidgeotto',
                levelRequired: 18
            }
        },
        {
            name: 'Caterpie',
            type: 'bug',
            stats: { hp: 45, attack: 30, defense: 35, speed: 45 },
            moves: [
                { name: 'Tackle', power: 40, type: 'normal' },
                { name: 'String Shot', power: 30, type: 'bug' }
            ],
            evolution: {
                canEvolve: true,
                evolvesTo: 'Metapod',
                levelRequired: 7
            }
        }
    ],
    uncommon: [
        {
            name: 'Sandshrew',
            type: 'ground',
            stats: { hp: 50, attack: 75, defense: 85, speed: 40 },
            moves: [
                { name: 'Scratch', power: 40, type: 'normal' },
                { name: 'Sand Attack', power: 35, type: 'ground' }
            ],
            evolution: {
                canEvolve: true,
                evolvesTo: 'Sandslash',
                levelRequired: 22
            }
        },
        {
            name: 'Nidoran♂',
            type: 'poison',
            stats: { hp: 46, attack: 57, defense: 40, speed: 50 },
            moves: [
                { name: 'Peck', power: 35, type: 'flying' },
                { name: 'Poison Sting', power: 35, type: 'poison' }
            ],
            evolution: {
                canEvolve: true,
                evolvesTo: 'Nidorino',
                levelRequired: 16
            }
        }
    ],
    rare: [
        {
            name: 'Abra',
            type: 'psychic',
            stats: { hp: 25, attack: 20, defense: 15, speed: 90 },
            moves: [
                { name: 'Teleport', power: 30, type: 'psychic' },
                { name: 'Hidden Power', power: 60, type: 'normal' }
            ],
            evolution: {
                canEvolve: true,
                evolvesTo: 'Kadabra',
                levelRequired: 16
            }
        },
        {
            name: 'Machop',
            type: 'fighting',
            stats: { hp: 70, attack: 80, defense: 50, speed: 35 },
            moves: [
                { name: 'Karate Chop', power: 50, type: 'fighting' },
                { name: 'Low Kick', power: 45, type: 'fighting' }
            ],
            evolution: {
                canEvolve: true,
                evolvesTo: 'Machoke',
                levelRequired: 28
            }
        }
    ],
    epic: [
        {
            name: 'Dratini',
            type: 'dragon',
            stats: { hp: 41, attack: 64, defense: 45, speed: 50 },
            moves: [
                { name: 'Dragon Rage', power: 65, type: 'dragon' },
                { name: 'Wrap', power: 45, type: 'normal' }
            ],
            evolution: {
                canEvolve: true,
                evolvesTo: 'Dragonair',
                levelRequired: 30
            }
        }
    ],
    legendary: [
        {
            name: 'Articuno',
            type: 'ice',
            stats: { hp: 90, attack: 85, defense: 100, speed: 85 },
            moves: [
                { name: 'Ice Beam', power: 90, type: 'ice' },
                { name: 'Ancient Power', power: 80, type: 'rock' }
            ],
            evolution: {
                canEvolve: false
            }
        }
    ],
    mythic: [
        {
            name: 'Mew',
            type: 'psychic',
            stats: { hp: 100, attack: 100, defense: 100, speed: 100 },
            moves: [
                { name: 'Psychic', power: 90, type: 'psychic' },
                { name: 'Ancient Power', power: 80, type: 'rock' }
            ],
            evolution: {
                canEvolve: false
            }
        }
    ]
};

// Rarity weights for Pokemon generation
const RARITY_WEIGHTS = {
    common: 0.5,      // 50%
    uncommon: 0.25,   // 25%
    rare: 0.15,       // 15%
    epic: 0.07,       // 7%
    legendary: 0.02,  // 2%
    mythic: 0.01      // 1%
};

function generateWildPokemon() {
    // Determine rarity based on weights
    const rand = Math.random();
    let rarity;
    let cumulative = 0;
    
    for (const [r, weight] of Object.entries(RARITY_WEIGHTS)) {
        cumulative += weight;
        if (rand <= cumulative) {
            rarity = r;
            break;
        }
    }

    // Get random Pokemon from the rarity pool
    const pool = POKEMON_POOLS[rarity];
    const pokemon = pool[Math.floor(Math.random() * pool.length)];

    // Generate random level based on rarity
    const levelRanges = {
        common: { min: 1, max: 2 },
        uncommon: { min: 1, max: 2 },
        rare: { min: 1, max: 2 },
        epic: { min: 1, max: 2 },
        legendary: { min: 1, max: 2 },
        mythic: { min: 1, max: 2 }
    };

    const level = Math.floor(
        Math.random() * 
        (levelRanges[rarity].max - levelRanges[rarity].min + 1) + 
        levelRanges[rarity].min
    );

    // Return a new object with level and other properties
    return {
        ...pokemon,
        level,
        xp: 0,
        rarity,
        isActive: false,
        isFainted: false
    };
}

// This function can be used for evolution as well
function generatePokemon(pokemonName, level = 1) {
    // Search for the Pokemon in all pools
    for (const pool of Object.values(POKEMON_POOLS)) {
        const pokemon = pool.find(p => p.name === pokemonName);
        if (pokemon) {
            return {
                ...pokemon,
                level,
                xp: 0,
                rarity: getRarityForPokemon(pokemonName),
                isActive: false,
                isFainted: false
            };
        }
    }
    throw new Error(`Pokemon ${pokemonName} not found`);
}

// Helper function to get rarity for a specific Pokemon
function getRarityForPokemon(pokemonName) {
    for (const [rarity, pool] of Object.entries(POKEMON_POOLS)) {
        if (pool.some(p => p.name === pokemonName)) {
            return rarity;
        }
    }
    return 'common'; // Default fallback
}

module.exports = {
    generateWildPokemon,
    generatePokemon,
    POKEMON_POOLS
};