const User = require('../../database/models/User');

async function topGlobalHandler(sock, msg) {
    try {
        // Get all users
        const users = await User.getAllUsers();
        
        // Convert users object to array and sort by balance
        const sortedUsers = Object.entries(users)
            .map(([jid, userData]) => ({
                jid,
                ...userData
            }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10); // Get top 10

        // Create message
        let message = `🏆 *TOP 10 GLOBAL RICH* 🏆\n`;
        message += `──────────────────\n\n`;

        // Add each user to the message with their rank
        for (let i = 0; i < sortedUsers.length; i++) {
            const user = sortedUsers[i];
            const crown = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅';
            const username = user.username || user.name;
            
            message += `${crown} *${i + 1}.* @${user.jid.split('@')[0]}\n`;
            message += `┗⊱ Balance: $${user.balance.toLocaleString()}\n`;
            if (i !== sortedUsers.length - 1) {
                message += `──────────────────\n`;
            }
        }

        // Add footer with total player count
        message += `\n📊 Total Players: ${Object.keys(users).length}`;

        // Send the message with mentions
        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            mentions: sortedUsers.map(user => user.jid),
            quoted: msg
        });

    } catch (error) {
        console.error('Error in topglobal handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

module.exports = {
    topGlobalHandler
};