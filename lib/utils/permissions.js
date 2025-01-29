// lib/utils/permissions.js
const config = require('../../config/owner.json');

async function isGroupAdmin(sock, groupJid, participantJid) {
    try {
        const groupMetadata = await sock.groupMetadata(groupJid);
        const admins = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id);
        return admins.includes(participantJid);
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

function isOwner(senderJid) {
    return config.ownerNumber.includes(senderJid);
}

module.exports = {
    isGroupAdmin,
    isOwner
};