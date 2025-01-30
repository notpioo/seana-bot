const User = require('../../database/models/User');
const logger = require('../utils/logger');

// Daftar kata untuk permainan
const words = [
    "indonesia", "komputer", "handphone", "keyboard", "monitor",
    "laptop", "printer", "speaker", "mouse", "headset",
    "terminal", "program", "internet", "website", "aplikasi",
    "database", "jaringan", "sistem", "memori", "processor"
];

// Menyimpan state permainan yang sedang berlangsung
const gameState = {};

// Fungsi untuk mengacak kata
function shuffleWord(word) {
    let shuffled = word.split('');
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.join('');
}

// Fungsi untuk memilih kata random
function getRandomWord() {
    return words[Math.floor(Math.random() * words.length)];
}

// Handler untuk game susun kata
async function susunKataHandler(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;

        // Cek apakah sudah ada permainan yang berlangsung
        if (gameState[chatId]) {
            await sock.sendMessage(chatId, {
                text: '❌ Permainan sedang berlangsung! Silahkan selesaikan terlebih dahulu.',
                quoted: msg
            });
            return;
        }

        // Pilih kata random dan acak
        const originalWord = getRandomWord();
        let scrambledWord = shuffleWord(originalWord);
        
        // Pastikan kata yang diacak berbeda dengan kata asli
        while (scrambledWord === originalWord) {
            scrambledWord = shuffleWord(originalWord);
        }

        // Simpan state permainan
        gameState[chatId] = {
            originalWord,
            startTime: Date.now(),
            isActive: true
        };

        // Kirim pesan permainan dimulai
        await sock.sendMessage(chatId, {
            text: `🎮 *SUSUN KATA*\n\n` +
                  `Susun kata berikut menjadi kata yang benar:\n` +
                  `*${scrambledWord}*\n\n` +
                  `Waktu: 60 detik`,
            quoted: msg
        });

        // Set timer untuk mengakhiri permainan
        setTimeout(async () => {
            if (gameState[chatId] && gameState[chatId].isActive) {
                delete gameState[chatId];
                await sock.sendMessage(chatId, {
                    text: `⏰ Waktu habis!\n\nJawaban yang benar adalah: *${originalWord}*`
                });
            }
        }, 60000);

    } catch (error) {
        logger.error('Error in susunkata handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memulai permainan',
            quoted: msg
        });
    }
}

// Handler untuk mengecek jawaban
async function handleSusunKataAnswer(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const answer = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || '';

        // Cek apakah ada permainan yang berlangsung
        const game = gameState[chatId];
        if (!game || !game.isActive) return;

        // Cek jawaban
        if (answer.toLowerCase() === game.originalWord.toLowerCase()) {
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            // Update balance pemenang
            const user = await User.getUser(senderJid);
            if (user) {
                await User.updateUser(senderJid, {
                    balance: user.balance + 100
                });
            }

            // Akhiri permainan
            game.isActive = false;
            delete gameState[chatId];

            // Kirim pesan kemenangan
            await sock.sendMessage(chatId, {
                text: `🎉 Selamat @${senderJid.split('@')[0]}!\n\n` +
                      `Kamu berhasil menyusun kata dengan benar!\n` +
                      `Kata: *${game.originalWord}*\n` +
                      `Hadiah: *100 Balance*`,
                mentions: [senderJid],
                quoted: msg
            });
        }
    } catch (error) {
        logger.error('Error in susunkata answer handler:', error);
    }
}

module.exports = {
    susunKataHandler,
    handleSusunKataAnswer,
    gameState
};