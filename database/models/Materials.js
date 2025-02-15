// models/Materials.js
const mongoose = require('mongoose');

const materialsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    materials: [{
        name: String,
        quantity: Number
    }]
});

module.exports = mongoose.model('Materials', materialsSchema);