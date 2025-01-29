// database/models/ApiKey.js
const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        unique: true
    },
    key: { 
        type: String, 
        required: true 
    },
    lastUpdated: { 
        type: Date, 
        default: Date.now 
    }
});

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey;