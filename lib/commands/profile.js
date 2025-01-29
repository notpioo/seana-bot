const User = require('../../database/models/User');
const logger = require('../../lib/utils/logger');

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
            targetJid = number + '@s.whatsapp.net';
        } else {
            targetJid = msg.key.participant || msg.key.remoteJid;
        }

        // Pastikan targetJid valid
        if (!targetJid || !targetJid.includes('@s.whatsapp.net')) {
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
        let user = await User.getUser(targetJid);
        
        if (!user) {
            try {
                const statusResult = await sock.fetchStatus(targetJid).catch(() => null);
                const waName = statusResult?.status || 'User';
                user = await User.createUser(targetJid, waName);
                
                if (!user) {
                    throw new Error('Failed to create user');
                }
            } catch (error) {
                logger.error('Error creating user:', error);
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Gagal membuat profil pengguna',
                    quoted: msg
                });
                return;
            }
        }

        // Format teks profil dengan informasi premium
        const premiumStatus = user.status === 'premium' ? '✓ Premium' : 'Basic';
        const limitDisplay = user.status === 'premium' ? '∞' : user.limit;
        
        const profileText = `╭────✎「 *User Info* 」  
│• Username: ${user.username}  
│• Tag: @${targetJid.split('@')[0]}  
│• Status: ${premiumStatus}  
│• Limit: ${limitDisplay}  
│• Balance: ${user.balance}  
│• Member since: ${new Date(user.memberSince).toLocaleDateString()}  
╰─────────❍
ketik .setusername untuk mengganti username kamu`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: profileText,
            mentions: [targetJid],
            quoted: msg
        });

    } catch (error) {
        logger.error('Error in profile handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses profile',
            quoted: msg
        });
    }
}

module.exports = { profileHandler };