// lib/commands/group.js
const { isGroupAdmin, isOwner } = require('../utils/permissions');

async function addHandler(sock, msg) {
    try {
        // Check if message is from group
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Command ini hanya dapat digunakan di dalam grup!',
                quoted: msg
            });
            return;
        }

        // Check if sender is admin or owner
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const isAdmin = await isGroupAdmin(sock, msg.key.remoteJid, senderJid);
        const botIsAdmin = await isGroupAdmin(sock, msg.key.remoteJid, sock.user.id);

        if (!isAdmin && !isOwner(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Command ini hanya dapat digunakan oleh admin grup atau owner bot!',
                quoted: msg
            });
            return;
        }

        if (!botIsAdmin) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Bot harus menjadi admin untuk menambahkan anggota!',
                quoted: msg
            });
            return;
        }

        const number = msg.body.split(' ')[1];
        if (!number) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Masukkan nomor yang akan ditambahkan!\nContoh: .add 628123456789',
                quoted: msg
            });
            return;
        }

        // Format the number
        let formattedNumber = number.replace(/[^0-9]/g, '');
        if (!formattedNumber.startsWith('62')) {
            formattedNumber = '62' + formattedNumber;
        }
        formattedNumber = formattedNumber + '@s.whatsapp.net';

        // Add user to group
        await sock.groupParticipantsUpdate(
            msg.key.remoteJid,
            [formattedNumber],
            'add'
        );

        await sock.sendMessage(msg.key.remoteJid, {
            text: '✅ Berhasil menambahkan anggota ke dalam grup!',
            quoted: msg
        });

    } catch (error) {
        console.error('Error in addHandler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Gagal menambahkan anggota ke dalam grup!',
            quoted: msg
        });
    }
}

async function kickHandler(sock, msg) {
    try {
        // Check if message is from group
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Command ini hanya dapat digunakan di dalam grup!',
                quoted: msg
            });
            return;
        }

        // Check if sender is admin or owner
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const isAdmin = await isGroupAdmin(sock, msg.key.remoteJid, senderJid);
        const botIsAdmin = await isGroupAdmin(sock, msg.key.remoteJid, sock.user.id);

        if (!isAdmin && !isOwner(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Command ini hanya dapat digunakan oleh admin grup atau owner bot!',
                quoted: msg
            });
            return;
        }

        if (!botIsAdmin) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Bot harus menjadi admin untuk mengeluarkan anggota!',
                quoted: msg
            });
            return;
        }

        let targetJid;
        // Handle reply message
        if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            targetJid = msg.message.extendedTextMessage.contextInfo.participant;
        } 
        // Handle mention
        else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Handle number
        else {
            const number = msg.body.split(' ')[1];
            if (!number) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Tag atau balas pesan member yang akan dikeluarkan!\nAtau gunakan nomor: .kick 628123456789',
                    quoted: msg
                });
                return;
            }
            let formattedNumber = number.replace(/[^0-9]/g, '');
            if (!formattedNumber.startsWith('62')) {
                formattedNumber = '62' + formattedNumber;
            }
            targetJid = formattedNumber + '@s.whatsapp.net';
        }

        // Remove user from group
        await sock.groupParticipantsUpdate(
            msg.key.remoteJid,
            [targetJid],
            'remove'
        );

        await sock.sendMessage(msg.key.remoteJid, {
            text: '✅ Berhasil mengeluarkan anggota dari grup!',
            quoted: msg
        });

    } catch (error) {
        console.error('Error in kickHandler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Gagal mengeluarkan anggota dari grup!',
            quoted: msg
        });
    }
}

module.exports = {
    addHandler,
    kickHandler
};