// lib/commands/confess.js

const User = require('../../database/models/User');

// Simpan data confess sementara dalam memory
const confessMessages = new Map();

async function confessHandler(sock, msg) {
    try {
        // Pastikan command digunakan di private chat
        if (msg.key.remoteJid.includes('@g.us')) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Fitur ini hanya dapat digunakan di private chat!',
                quoted: msg
            });
            return;
        }

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const user = User.getUser(senderJid);

        // Cek apakah user sudah terdaftar
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum terdaftar! Silahkan daftar terlebih dahulu.',
                quoted: msg
            });
            return;
        }

        // Cek limit user
        if (!User.useLimit(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Limit kamu sudah habis! Silahkan tunggu reset limit harian atau upgrade ke premium.',
                quoted: msg
            });
            return;
        }

        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        const args = body.slice(9).trim().split(' '); // Remove ".confess "

        // Cek format command
        if (args.length < 2) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan: .confess nomor pesan\nContoh: .confess 628123456789 Hai, aku suka kamu',
                quoted: msg
            });
            return;
        }

        // Ambil nomor tujuan dan pesan
        const targetNumber = args[0].replace(/[^0-9]/g, '');
        const message = args.slice(1).join(' ');

        // Validasi nomor
        if (!targetNumber || targetNumber.length < 10) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Nomor tidak valid!',
                quoted: msg
            });
            return;
        }

        // Format nomor tujuan
        const targetJid = `${targetNumber}@s.whatsapp.net`;

        // Generate message ID unik
        const messageId = Math.random().toString(36).substring(7);

        // Simpan data confess
        confessMessages.set(messageId, {
            sender: senderJid,
            target: targetJid,
            message: message,
            timestamp: Date.now()
        });

        // Kirim pesan ke target
        await sock.sendMessage(targetJid, {
            text: `━━━『 *CONFESS MESSAGE* 』━━━\n\n` +
                  `Ada seseorang yang mengirimkan pesan untuk kamu:\n\n` +
                  `"${message}"\n\n` +
                  `_Pesan ini dikirim secara anonim menggunakan fitur confess._\n\n` +
                  `Reply pesan ini untuk mengirim balasan ke pengirim secara anonim.`,
            quoted: msg
        });

        // Kirim konfirmasi ke pengirim
        await sock.sendMessage(msg.key.remoteJid, {
            text: '✅ Confess berhasil terkirim!\n\nJika ada balasan, kamu akan menerimanya secara otomatis.',
            quoted: msg
        });

    } catch (error) {
        console.error('Error in confess handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengirim confess',
            quoted: msg
        });
    }
}

// Handler untuk memproses balasan confess
async function handleConfessReply(sock, msg) {
    try {
        // Pastikan ini adalah balasan ke pesan confess
        if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) return;

        const quotedMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        const messageText = quotedMessage?.conversation || 
                          quotedMessage?.extendedTextMessage?.text || '';

        // Cek apakah ini balasan untuk pesan confess
        if (!messageText.includes('CONFESS MESSAGE')) return;

        const reply = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || '';

        // Cari data confess yang sesuai
        for (const [messageId, confessData] of confessMessages.entries()) {
            if (confessData.target === msg.key.remoteJid) {
                // Kirim balasan ke pengirim asal
                await sock.sendMessage(confessData.sender, {
                    text: `━━━『 *CONFESS REPLY* 』━━━\n\n` +
                          `Balasan untuk confess kamu:\n\n` +
                          `"${reply}"\n\n` +
                          `_Ini adalah balasan anonim untuk pesan confess kamu sebelumnya._`
                });

                // Konfirmasi ke pembalas
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '✅ Balasan confess terkirim!',
                    quoted: msg
                });

                // Hapus data confess setelah dibalas
                confessMessages.delete(messageId);
                break;
            }
        }
    } catch (error) {
        console.error('Error handling confess reply:', error);
    }
}

module.exports = { confessHandler, handleConfessReply };