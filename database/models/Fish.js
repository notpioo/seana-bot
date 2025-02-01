const mongoose = require('mongoose');

const fishSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    inventory: {
        // Common Fish
        ikanMas: { type: Number, default: 0 },
        lele: { type: Number, default: 0 },
        mujair: { type: Number, default: 0 },
        nila: { type: Number, default: 0 },
        bandeng: { type: Number, default: 0 },
        // Uncommon Fish
        gurame: { type: Number, default: 0 },
        bawal: { type: Number, default: 0 },
        patin: { type: Number, default: 0 },
        kakap: { type: Number, default: 0 },
        tongkol: { type: Number, default: 0 },
        // Rare Fish
        salmon: { type: Number, default: 0 },
        tuna: { type: Number, default: 0 },
        kerapu: { type: Number, default: 0 },
        tenggiri: { type: Number, default: 0 },
        baronang: { type: Number, default: 0 },
        // Epic Fish
        arwana: { type: Number, default: 0 },
        koi: { type: Number, default: 0 },
        belida: { type: Number, default: 0 },
        napoleon: { type: Number, default: 0 },
        botia: { type: Number, default: 0 },
        // Legendary Fish
        pausBiru: { type: Number, default: 0 },
        hiuPaus: { type: Number, default: 0 },
        arapaima: { type: Number, default: 0 },
        megalodon: { type: Number, default: 0 },
        coelacanth: { type: Number, default: 0 }
    },
    equipment: {
        currentRod: { type: String, default: 'bambu' },
        rods: {
            bambu: { type: Boolean, default: true },
            kayu: { type: Boolean, default: false },
            fiber: { type: Boolean, default: false },
            carbon: { type: Boolean, default: false },
            titanium: { type: Boolean, default: false }
        }
    },
    stats: {
        totalCatch: { type: Number, default: 0 },
        rareCatch: { type: Number, default: 0 },
        epicCatch: { type: Number, default: 0 },
        legendaryCatch: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },
        lastFished: { type: Date, default: null }
    }
});

module.exports = mongoose.model('Fish', fishSchema);