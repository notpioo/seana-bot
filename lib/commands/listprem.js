// listprem.js
const User = require('../../database/models/User');

async function listPremHandler(sock, msg) {
    try {
        const users = await User.getAllUsers();
        const premiumUsers = [];

        for (const jid in users) {
            const user = users[jid];
            if (user.status === 'premium' && user.premiumExpiry) {
                const expiry = new Date(user.premiumExpiry).getTime();
                const remainingTime = expiry - Date.now();

                if (remainingTime > 0) {
                    const remainingDays = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
                    const remainingHours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    premiumUsers.push({
                        jid,
                        name: user.username,
                        remainingTime: `${remainingDays} hari ${remainingHours} jam`
                    });
                }
            }
        }

        if (premiumUsers.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada pengguna premium saat ini.',
                quoted: msg
            });
            return;
        }

        let listText = '╭────✎「 *Daftar Premium Users* 」\n';
        premiumUsers.forEach((user, index) => {
            listText += `│• ${index + 1}. @${user.jid.split('@')[0]} (${user.name})\n`;
            listText += `│  Sisa durasi: ${user.remainingTime}\n`;
        });
        listText += '╰─────────❍';

        await sock.sendMessage(msg.key.remoteJid, {
            text: listText,
            mentions: premiumUsers.map(user => user.jid),
            quoted: msg
        });

    } catch (error) {
        console.error('Error in listPrem handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

module.exports = { listPremHandler };