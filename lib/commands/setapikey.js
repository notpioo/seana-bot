// lib/commands/setapikey.js
const ApiKey = require('../../database/models/Apikey');

async function setApikeyHandler(sock, msg) {
    try {
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        const apiKey = body.slice(10).trim(); // Remove '.setapikey ' from the message

        if (!apiKey) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Silahkan masukkan API key! Contoh: .setapikey YOUR_API_KEY',
                quoted: msg
            });
            return;
        }

        // Update or create API key in database
        await ApiKey.findOneAndUpdate(
            { name: 'openai' },
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