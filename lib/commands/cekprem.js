// cekprem.js
const User = require('../../database/models/User');

async function cekPremHandler(sock, msg) {
    try {
        const body = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || '';
        const args = body.split(' ');

        let targetJid;

        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (args[1]) {
            const number = args[1].replace(/[^0-9]/g, '');
            targetJid = number + '@s.whatsapp.net';
        } else {
            targetJid = msg.key.participant || msg.key.remoteJid;
        }

        if (!targetJid || !targetJid.includes('@s.whatsapp.net')) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ JID tidak valid!',
                quoted: msg
            });
            return;
        }

        const user = await User.getUser(targetJid);
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ User tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        if (user.status !== 'premium' || !user.premiumExpiry) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `@${targetJid.split('@')[0]} tidak memiliki status premium.`,
                mentions: [targetJid],
                quoted: msg
            });
            return;
        }

        const now = Date.now();
        const expiry = new Date(user.premiumExpiry).getTime();
        const remainingTime = expiry - now;

        if (remainingTime <= 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `@${targetJid.split('@')[0]} sudah tidak memiliki status premium.`,
                mentions: [targetJid],
                quoted: msg
            });
            return;
        }

        const remainingDays = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
        const remainingHours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

        await sock.sendMessage(msg.key.remoteJid, {
            text: `@${targetJid.split('@')[0]} memiliki sisa durasi premium: ${remainingDays} hari ${remainingHours} jam ${remainingMinutes} menit.`,
            mentions: [targetJid],
            quoted: msg
        });

    } catch (error) {
        console.error('Error in cekPrem handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

module.exports = { cekPremHandler };