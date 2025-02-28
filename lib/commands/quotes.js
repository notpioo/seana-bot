
const fs = require('fs');
const path = require('path');
const User = require('../../database/models/User');
const logger = require('../utils/logger');

async function quotesHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const user = await User.getUser(senderJid);
        
        // Read quotes from JSON file
        const quotesPath = path.join(__dirname, '../utils/quotes.json');
        const quotesData = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
        
        // Get random quote
        const randomIndex = Math.floor(Math.random() * quotesData.length);
        const randomQuote = quotesData[randomIndex];
        
        // Format the quote message
        const quoteMessage = `💬 *Quote of the moment*\n\n"${randomQuote.quote}"\n\n~ *${randomQuote.by}*`;
        
        // Send the quote
        await sock.sendMessage(msg.key.remoteJid, {
            text: quoteMessage,
            quoted: msg
        });
        
    } catch (error) {
        logger.error('Error in quotes handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengambil quote',
            quoted: msg
        });
    }
}

module.exports = { quotesHandler };
