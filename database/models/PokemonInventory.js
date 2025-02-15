const mongoose = require('mongoose');

const pokemonInventorySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    items: {
        pokeball: { type: Number, default: 5 },
        greatball: { type: Number, default: 0 },
        ultraball: { type: Number, default: 0 },
        masterball: { type: Number, default: 0 },
        potion: { type: Number, default: 3 },
        superpotion: { type: Number, default: 0 },
        revive: { type: Number, default: 1 },
        // Evolution stones
        firestone: { type: Number, default: 0 },
        waterstone: { type: Number, default: 0 },
        thunderstone: { type: Number, default: 0 },
        leafstone: { type: Number, default: 0 },
        moonstone: { type: Number, default: 0 }
    },
    lastShopRefresh: {
        type: Date,
        default: Date.now
    }
});

// Add index for efficient queries
pokemonInventorySchema.index({ userId: 1 });

const PokemonInventoryModel = mongoose.model('PokemonInventory', pokemonInventorySchema);

class PokemonInventory {
    constructor() {
        this.model = PokemonInventoryModel;
    }

    async getInventory(userId) {
        try {
            let inventory = await this.model.findOne({ userId });
            if (!inventory) {
                inventory = await this.model.create({ userId });
            }
            return inventory.toObject();
        } catch (error) {
            logger.error(`Error getting inventory: ${error}`);
            return null;
        }
    }

    async addItem(userId, itemName, quantity) {
        try {
            const inventory = await this.model.findOne({ userId });
            if (!inventory) return null;

            if (inventory.items[itemName] === undefined) {
                throw new Error(`Invalid item: ${itemName}`);
            }

            inventory.items[itemName] += quantity;
            await inventory.save();
            return inventory.toObject();
        } catch (error) {
            logger.error(`Error adding item: ${error}`);
            return null;
        }
    }

    async useItem(userId, itemName) {
        try {
            const inventory = await this.model.findOne({ userId });
            if (!inventory || inventory.items[itemName] <= 0) {
                return false;
            }

            inventory.items[itemName]--;
            await inventory.save();
            return true;
        } catch (error) {
            logger.error(`Error using item: ${error}`);
            return false;
        }
    }

    async hasItem(userId, itemName, quantity = 1) {
        try {
            const inventory = await this.model.findOne({ userId });
            return inventory && inventory.items[itemName] >= quantity;
        } catch (error) {
            logger.error(`Error checking item: ${error}`);
            return false;
        }
    }
}

module.exports = new PokemonInventory();