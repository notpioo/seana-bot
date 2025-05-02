// Handle registering domino stickers for admins
const registerDominoStickerHandler = async (sock, msg) => {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Get the user
        const user = await User.getUser(senderJid);

        // Check if user is admin or owner
        if (user.role !== 'admin' && user.role !== 'owner') {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Hanya admin yang dapat mendaftarkan sticker domino.',
                quoted: msg,
            });
            return;
        }

        // Parse command: .regdomino [quoted sticker] left|right
        // Example: .regdomino 3|4

        // Check if message quotes a sticker
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg || !quotedMsg.stickerMessage) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Silakan quote/reply sebuah sticker untuk mendaftarkannya.\nContoh: .regdomino 3|4',
                quoted: msg,
            });
            return;
        }

        // Extract domino values from command
        const body = msg.message?.extendedTextMessage?.text || '';
        const parts = body.split(' ');

        if (parts.length < 2) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah. Gunakan: .regdomino [nilai kartu]\nContoh: .regdomino 3|4',
                quoted: msg,
            });
            return;
        }

        const valueStr = parts[1];
        const valueParts = valueStr.split('|');

        if (valueParts.length !== 2) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format nilai kartu salah. Gunakan: angka|angka\nContoh: 3|4',
                quoted: msg,
            });
            return;
        }

        const left = parseInt(valueParts[0]);
        const right = parseInt(valueParts[1]);

        if (isNaN(left) || isNaN(right) || left < 0 || left > 6 || right < 0 || right > 6) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Nilai kartu harus antara 0-6.',
                quoted: msg,
            });
            return;
        }

        // Import domino sticker module
        const { registerDominoSticker } = require("../lib/domino-sticker");

        // Create a modified message with the quoted sticker as the main message
        const stickerMsg = {
            ...msg,
            message: quotedMsg
        };

        // Register the sticker
        const result = await registerDominoSticker(stickerMsg, { left, right });

        if (result.success) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ ${result.message}\nHash: ${result.hash}`,
                quoted: msg,
            });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ ${result.message}`,
                quoted: msg,
            });
        }
    } catch (error) {
        console.error("Error in registerDominoStickerHandler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mendaftarkan sticker domino.',
            quoted: msg,
        });
    }
};

module.exports = { registerDominoStickerHandler };