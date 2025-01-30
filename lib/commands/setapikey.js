// lib/commands/setapikey.js
const ApiKey = require('../../database/models/Apikey');

async function setApikeyHandler(sock, msg) {
    try {
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        const apiKey = body.slice(10).trim();

        if (!apiKey) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format: .setapikey <apikey>',
                quoted: msg
            });
            return;
        }

        // Update atau create API key di database
        await ApiKey.findOneAndUpdate(
            { name: 'aiml' },
            { 
                key: apiKey,
                lastUpdated: new Date()
            },
            { upsert: true }
        );

        await sock.sendMessage(msg.key.remoteJid, {
            text: '✅ API key berhasil diperbarui!',
            quoted: msg
        });

    } catch (error) {
        console.error('Error in setapikey command:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memperbarui API key.',
            quoted: msg
        });
    }
}

module.exports = { setApikeyHandler };