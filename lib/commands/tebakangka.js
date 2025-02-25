
const User = require('../../database/models/User');
const logger = require('../utils/logger');

// Store active games
const activeGames = new Map();

async function tebakAngkaHandler(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        
        if (activeGames.has(chatId)) {
            await sock.sendMessage(chatId, { 
                text: '❌ Masih ada permainan tebak angka yang berlangsung di grup ini!',
                quoted: msg
            });
            return;
        }

        // Generate random number 0-100
        const targetNumber = Math.floor(Math.random() * 101);
        
        activeGames.set(chatId, {
            number: targetNumber,
            attempts: 0,
            lives: 10,
            startTime: Date.now()
        });

        await sock.sendMessage(chatId, { 
            text: `🎮 *TEBAK ANGKA*\n\n` +
                  `Tebak angka dari 0-100\n` +
                  `❤️ Nyawa: 10\n` +
                  `💰 Reward: 500 balance\n\n` +
                  `Ketik angka tebakanmu...`,
            quoted: msg
        });

        // Game timeout after 2 minutes
        setTimeout(async () => {
            const game = activeGames.get(chatId);
            if (game) {
                await sock.sendMessage(chatId, {
                    text: `⏱️ Waktu habis!\n\nJawaban yang benar adalah: ${game.number}`,
                    quoted: msg
                });
                activeGames.delete(chatId);
            }
        }, 120000);

    } catch (error) {
        logger.error('Error in tebak angka handler:', error);
    }
}

async function handleGuess(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || msg.key.remoteJid;
        
        if (!activeGames.has(chatId)) return;

        const game = activeGames.get(chatId);
        const guess = parseInt(msg.message?.conversation || 
                             msg.message?.extendedTextMessage?.text);

        if (isNaN(guess) || guess < 0 || guess > 100) return;

        game.attempts++;

        if (parseInt(guess) === parseInt(game.number)) {
            try {
                // Update user balance
                await User.model.findOneAndUpdate(
                    { jid: senderId },
                    { $inc: { balance: 500 } }
                );
                
                await sock.sendMessage(chatId, {
                    text: `🎉 Selamat @${senderId.split('@')[0]}! Angka yang benar adalah ${game.number}\n` +
                          `💰 Kamu mendapatkan 500 balance\n` +
                          `🎯 Jumlah tebakan: ${game.attempts}\n` +
                          `❤️ Sisa nyawa: ${game.lives}`,
                    mentions: [senderId],
                    quoted: msg
                });
                
                activeGames.delete(chatId);
            } catch (err) {
                logger.error('Error handling winner:', err);
            }
        } else {
            game.lives--;
            const clue = guess > game.number ? 
                        `Di bawah ${guess}` : 
                        `Di atas ${guess}`;
            
            if (game.lives <= 0) {
                await sock.sendMessage(chatId, {
                    text: `💀 Game Over! Nyawa habis\n` +
                          `Jawaban yang benar adalah: ${game.number}`,
                    quoted: msg
                });
                activeGames.delete(chatId);
            } else {
                await sock.sendMessage(chatId, {
                    text: `❌ Angka salah @${senderId.split('@')[0]}\n` +
                          `💡 Clue: ${clue}\n` +
                          `❤️ Sisa nyawa: ${game.lives}`,
                    mentions: [senderId],
                    quoted: msg
                });
            }
        }

    } catch (error) {
        logger.error('Error handling guess:', error);
    }
}

function hasActiveGame(chatId) {
    return activeGames.has(chatId);
}

module.exports = {
    tebakAngkaHandler,
    handleGuess,
    hasActiveGame
};
