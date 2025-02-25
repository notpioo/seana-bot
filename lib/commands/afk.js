
const User = require('../../database/models/User');

async function afkHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const reason = msg.message?.conversation?.split('.afk')[1]?.trim() || 
                      msg.message?.extendedTextMessage?.text?.split('.afk')[1]?.trim() || 
                      'AFK!';

        // Set AFK status in database
        await User.updateUser(senderJid, {
            isAfk: true,
            afkReason: reason,
            afkTimestamp: Date.now()
        });

        await sock.sendMessage(msg.key.remoteJid, {
            text: `@${senderJid.split('@')[0]} sedang ${reason}!`,
            mentions: [senderJid]
        });
    } catch (error) {
        console.error('Error in AFK handler:', error);
    }
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours} jam ${minutes % 60} menit`;
    if (minutes > 0) return `${minutes} menit`;
    return `${seconds} detik`;
}

async function checkAfkStatus(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Skip AFK check for commands
        if (msg.message?.conversation?.startsWith('.') || 
            msg.message?.extendedTextMessage?.text?.startsWith('.')) {
            return;
        }

        const user = await User.getUser(senderJid);
        if (user?.isAfk) {
            const duration = formatDuration(Date.now() - user.afkTimestamp);
            
            // Clear AFK status
            await User.updateUser(senderJid, {
                isAfk: false,
                afkReason: null,
                afkTimestamp: null
            });
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: `@${senderJid.split('@')[0]} telah kembali dari ${user.afkReason} selama ${duration}`,
                mentions: [senderJid]
            });
        }
    } catch (error) {
        console.error('Error checking AFK status:', error);
    }
}

module.exports = {
    afkHandler,
    checkAfkStatus
};
