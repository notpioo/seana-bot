const User = require('../../database/models/User');

async function topGlobalHandler(sock, msg) {
    try {
        // Get all users
        const users = User.getAllUsers();
        
        // Convert users object to array and sort by balance
        const sortedUsers = Object.entries(users)
            .map(([jid, userData]) => ({
                jid,
                ...userData
            }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10); // Get top 10

        // Create a fancy message
        let message = `🏆 *TOP 10 GLOBAL RICH* 🏆\n`;
        message += `──────────────────\n\n`;

        // Add each user to the message with their rank
        sortedUsers.forEach((user, index) => {
            const crown = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
            const username = user.username || user.name; // Use custom username if set, otherwise use default name
            
            message += `${crown} *${index + 1}.* @${user.jid.split('@')[0]}\n`;
            message += `┗⊱ Balance: $${user.balance.toLocaleString()}\n`;
            if (index !== sortedUsers.length - 1) {
                message += `──────────────────\n`;
            }
        });

        // Add footer
        message += `\n📊 Total Players: ${Object.keys(users).length}`;

        // Send the message with mentions
        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            mentions: sortedUsers.map(user => user.jid)
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