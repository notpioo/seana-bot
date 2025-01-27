const User = require('../../database/models/User');

async function profileHandler(sock, msg) {
    try {
        const body = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || '';
        const args = body.split(' ');

        let targetJid;

        // Cek apakah ada mention atau nomor
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (args[1]) {
            const number = args[1].replace(/[^0-9]/g, '');
            targetJid = number + '@s.whatsapp.net'; // Format untuk chat private
        } else {
            // Jika tidak ada mention atau nomor, gunakan pengirim pesan
            targetJid = msg.key.participant || msg.key.remoteJid;
        }

        // Pastikan targetJid valid
        if (!targetJid || !targetJid.includes('@s.whatsapp.net')) {
            // Jika tidak valid, coba ambil dari remoteJid
            targetJid = msg.key.remoteJid;
            if (!targetJid || !targetJid.includes('@s.whatsapp.net')) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ JID tidak valid!',
                    quoted: msg
                });
                return;
            }
        }

        // Dapatkan atau buat user
        let user = User.getUser(targetJid);
        if (!user) {
            // Gunakan fetchStatus untuk mendapatkan nama pengguna
            const status = await sock.fetchStatus(targetJid);
            const waName = status?.status || 'User';
            user = User.createUser(targetJid, waName);
        }

        // Format teks profil
        const profileText = `╭────✎「 *User Info* 」  
│• Name: ${user.username}  
│• Tag: @${targetJid.split('@')[0]}  
│• Status: ${user.status}  
│• Limit: ${user.limit === Infinity ? '∞' : user.limit}  
│• Balance: ${user.balance}  
│• Member since: ${new Date(user.memberSince).toLocaleDateString()}  
╰─────────❍`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: profileText,
            mentions: [targetJid], // Mention pengguna
            quoted: msg
        });

    } catch (error) {
        console.error('Error in profile handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses profile',
            quoted: msg
        });
    }
}

module.exports = { profileHandler };