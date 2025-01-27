const User = require('../../database/models/User');

async function setUsernameHandler(sock, msg) {
    try {
        const body = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || '';
        const args = body.split(' ');

        // Periksa format command
        if (args.length < 2) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan: .setusername (nama)',
                quoted: msg
            });
            return;
        }

        const newUsername = args.slice(1).join(' '); // Ambil nama baru
        const jid = msg.key.participant || msg.key.remoteJid; // ID pengguna

        // Update username
        const success = User.setUsername(jid, newUsername);
        if (success) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ Username berhasil diubah menjadi: ${newUsername}`,
                quoted: msg
            });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ User tidak ditemukan!',
                quoted: msg
            });
        }

    } catch (error) {
        console.error('Error in setUsername handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengubah username',
            quoted: msg
        });
    }
}

module.exports = { setUsernameHandler };