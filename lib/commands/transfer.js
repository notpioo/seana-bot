const User = require('../../database/models/User');
const logger = require('../../lib/utils/logger');

async function transferHandler(sock, msg) {
    try {
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        const args = body.split(' ');
        
        // Check if enough arguments are provided
        if (args.length !== 3) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan:\n.tf @mention jumlah\n.tf nomor jumlah',
                quoted: msg
            });
            return;
        }

        const senderJid = msg.key.participant || msg.key.remoteJid;
        let targetJid;
        const amount = parseInt(args[2]);

        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Jumlah transfer harus berupa angka positif!',
                quoted: msg
            });
            return;
        }

        // Get target JID from mention or number
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else {
            const number = args[1].replace(/[^0-9]/g, '');
            targetJid = number + '@s.whatsapp.net';
        }

        // Validate target JID
        if (!targetJid || !targetJid.includes('@s.whatsapp.net')) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Penerima tidak valid!',
                quoted: msg
            });
            return;
        }

        // Check if trying to transfer to self
        if (targetJid === senderJid) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak dapat transfer ke diri sendiri!',
                quoted: msg
            });
            return;
        }

        // Get sender and target users
        const sender = await User.getUser(senderJid);
        const target = await User.getUser(targetJid);

        // Check if target exists
        if (!target) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Pengguna tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        // Check if sender has enough balance
        if (sender.balance < amount) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Balance tidak cukup! Balance kamu: ${sender.balance}`,
                quoted: msg
            });
            return;
        }

        // Perform transfer
        await User.updateUser(senderJid, { balance: sender.balance - amount });
        await User.updateUser(targetJid, { balance: target.balance + amount });

        // Send success message to both users
        const successMessage = `✅ Transfer berhasil!\n\nDari: @${senderJid.split('@')[0]}\nKe: @${targetJid.split('@')[0]}\nJumlah: ${amount}`;
        
        await sock.sendMessage(msg.key.remoteJid, {
            text: successMessage,
            mentions: [senderJid, targetJid],
            quoted: msg
        });

        // If transfer is in private chat, notify the recipient
        if (msg.key.remoteJid !== targetJid && !msg.key.remoteJid.endsWith('@g.us')) {
            await sock.sendMessage(targetJid, {
                text: `💰 Kamu menerima transfer balance!\n\nDari: @${senderJid.split('@')[0]}\nJumlah: ${amount}\nBalance sekarang: ${target.balance + amount}`,
                mentions: [senderJid]
            });
        }

    } catch (error) {
        logger.error('Error in transfer handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses transfer',
            quoted: msg
        });
    }
}

module.exports = { transferHandler };