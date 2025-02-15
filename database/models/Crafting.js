// models/Crafting.js
const mongoose = require('mongoose');

const craftingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    ingredients: [{
        item: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    result: {
        item: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            default: 1
        }
    }
});

module.exports = mongoose.model('Crafting', craftingSchema);