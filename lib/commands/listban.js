const User = require('../../database/models/User');

async function listBanHandler(sock, msg) {
    try {
        const users = await User.getAllUsers();
        const bannedUsers = [];

        // Find all banned users
        for (const jid in users) {
            const user = users[jid];
            if (user.isBanned && user.banExpiry) {
                const expiry = new Date(user.banExpiry).getTime();
                const remainingTime = expiry - Date.now();

                if (remainingTime > 0) {
                    const remainingDays = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
                    const remainingHours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    bannedUsers.push({
                        jid,
                        name: user.username,
                        remainingTime: `${remainingDays} hari ${remainingHours} jam`
                    });
                } else {
                    // If ban has expired, update user
                    await User.updateUser(jid, {
                        isBanned: false,
                        banExpiry: null
                    });
                }
            }
        }

        // Format banned users list
        if (bannedUsers.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '✅ Tidak ada pengguna yang sedang banned saat ini.',
                quoted: msg
            });
            return;
        }

        let listText = '╭────✎「 *Daftar Banned Users* 」\n';
        bannedUsers.forEach((user, index) => {
            listText += `│• ${index + 1}. @${user.jid.split('@')[0]} (${user.name})\n`;
            listText += `│  Sisa durasi: ${user.remainingTime}\n`;
        });
        listText += '╰─────────❍';

        await sock.sendMessage(msg.key.remoteJid, {
            text: listText,
            mentions: bannedUsers.map(user => user.jid),
            quoted: msg
        });

    } catch (error) {
        console.error('Error in listBan handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

module.exports = { listBanHandler };