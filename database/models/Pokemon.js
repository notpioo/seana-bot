const mongoose = require('mongoose');

const pokemonSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    name: {
        type: String,
        required: true
    },
    nickname: {
        type: String,
        default: null
    },
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        required: true
    },
    rarity: {
        type: String,
        enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
        required: true
    },
    stats: {
        hp: { type: Number, required: true },
        attack: { type: Number, required: true },
        defense: { type: Number, required: true },
        speed: { type: Number, required: true }
    },
    moves: [{
        name: { type: String, required: true },
        power: { type: Number, required: true },
        type: { type: String, required: true }
    }],
    evolution: {
        canEvolve: { type: Boolean, default: false },
        evolvesTo: { type: String, default: null },
        levelRequired: { type: Number, default: null },
        itemRequired: { type: String, default: null }
    },
    isActive: {
        type: Boolean,
        default: false
    },
    isFainted: {
        type: Boolean,
        default: false
    },
    catchDate: {
        type: Date,
        default: Date.now
    }
});

// Add index for efficient queries
pokemonSchema.index({ userId: 1 });

const PokemonModel = mongoose.model('Pokemon', pokemonSchema);

class Pokemon {
    constructor() {
        this.model = PokemonModel;
    }

    async createPokemon(userId, pokemonData) {
        try {
            const pokemon = await this.model.create({
                userId,
                ...pokemonData
            });
            return pokemon.toObject();
        } catch (error) {
            console.error(`Error creating pokemon: ${error}`); // Changed from logger.error
            return null;
        }
    }

    async getUserPokemons(userId) {
        try {
            const pokemons = await this.model.find({ userId });
            return pokemons.map(pokemon => pokemon.toObject());
        } catch (error) {
            console.error(`Error getting user pokemons: ${error}`); // Changed from logger.error
            return [];
        }
    }

    async getActivePokemon(userId) {
        try {
            const pokemon = await this.model.findOne({ 
                userId, 
                isActive: true 
            });
            return pokemon ? pokemon.toObject() : null;
        } catch (error) {
             console.error(`Error getting active pokemon: ${error}`);
            return null;
        }
    }

    async updatePokemon(pokemonId, updates) {
        try {
            const pokemon = await this.model.findByIdAndUpdate(
                pokemonId,
                { $set: updates },
                { new: true }
            );
            return pokemon ? pokemon.toObject() : null;
        } catch (error) {
             console.error(`Error updating pokemon: ${error}`);
            return null;
        }
    }

    async gainExperience(pokemonId, xpAmount) {
        try {
            const pokemon = await this.model.findById(pokemonId);
            if (!pokemon) return null;

            pokemon.xp += xpAmount;
            
            // Level up logic
            const xpNeeded = pokemon.level * 100;
            if (pokemon.xp >= xpNeeded) {
                pokemon.level += 1;
                pokemon.xp = 0;
                
                // Update stats on level up
                pokemon.stats.hp += 5;
                pokemon.stats.attack += 2;
                pokemon.stats.defense += 2;
                pokemon.stats.speed += 2;
            }

            await pokemon.save();
            return pokemon.toObject();
        } catch (error) {
             console.error(`Error gaining experience: ${error}`);
            return null;
        }
    }

    async releasePokemon(userId, pokemonId) {
        try {
            const result = await this.model.deleteOne({
                _id: pokemonId,
                userId
            });
            return result.deletedCount > 0;
        } catch (error) {
             console.error(`Error releasing pokemon: ${error}`);
            return false;
        }
    }
}

module.exports = new Pokemon();