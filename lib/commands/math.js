const logger = require('../utils/logger');
const User = require('../../database/models/User');

// Store active math games
const activeMathGames = new Map();

// Reward configuration based on difficulty
const REWARDS = {
    easy: 100,
    normal: 250,
    hard: 500
};

// Function to generate questions based on difficulty
function generateQuestion(difficulty) {
    let num1, num2, num3, operator, answer;
    
    switch(difficulty) {
        case 'easy':
            num1 = Math.floor(Math.random() * 50) + 10;
            num2 = Math.floor(Math.random() * 50) + 10;
            operator = ['+', '-', '*'][Math.floor(Math.random() * 3)];
            answer = eval(`${num1}${operator}${num2}`);
            
            return {
                question: `${num1} ${operator} ${num2} = ?`,
                answer: answer
            };
            
        case 'normal':
            num1 = Math.floor(Math.random() * 100) + 20;
            num2 = Math.floor(Math.random() * 50) + 10;
            num3 = Math.floor(Math.random() * 20) + 5;
            
            const ops = ['+', '-', '*'];
            operator = ops[Math.floor(Math.random() * ops.length)];
            const secondOp = ops[Math.floor(Math.random() * ops.length)];
            
            answer = eval(`(${num1}${operator}${num2})${secondOp}${num3}`);
            return {
                question: `(${num1} ${operator} ${num2}) ${secondOp} ${num3} = ?`,
                answer: answer
            };
            
        case 'hard':
            num1 = Math.floor(Math.random() * 200) + 50;
            num2 = Math.floor(Math.random() * 100) + 20;
            num3 = Math.floor(Math.random() * 30) + 10;
            
            const templates = [
                {
                    question: `(${num1} × ${num2}) ÷ ${num3}`,
                    answer: Math.round((num1 * num2) / num3)
                },
                {
                    question: `(${num1} + ${num2}) × ${num3}`,
                    answer: (num1 + num2) * num3
                },
                {
                    question: `${num1} - (${num2} × ${num3})`,
                    answer: num1 - (num2 * num3)
                }
            ];
            
            return templates[Math.floor(Math.random() * templates.length)];
    }
}

async function mathHandler(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || msg.key.remoteJid;
        
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        const args = body.toLowerCase().split(' ');
        
        // Show help menu if only .math
        if (args.length === 1) {
            await sock.sendMessage(chatId, { 
                text: `🎮 *MATH GAME*\n\n` +
                      `Pilih tingkat kesulitan:\n\n` +
                      `1️⃣ .math easy\n` +
                      `   • Operasi dasar\n` +
                      `   • Reward: ${REWARDS.easy} balance\n\n` +
                      `2️⃣ .math normal\n` +
                      `   • Operasi dua tingkat\n` +
                      `   • Reward: ${REWARDS.normal} balance\n\n` +
                      `3️⃣ .math hard\n` +
                      `   • Operasi kompleks\n` +
                      `   • Reward: ${REWARDS.hard} balance\n\n` +
                      `Ketik perintah sesuai tingkat kesulitan yang diinginkan.`,
                quoted: msg
            });
            return;
        }

        const difficulty = args[1];
        
        if (!['easy', 'normal', 'hard'].includes(difficulty)) {
            await sock.sendMessage(chatId, { 
                text: '❌ Kesulitan tidak valid! Gunakan: .math easy/normal/hard',
                quoted: msg
            });
            return;
        }
        
        if (activeMathGames.has(chatId)) {
            await sock.sendMessage(chatId, { 
                text: '❌ Masih ada game math yang berlangsung di grup ini!',
                quoted: msg
            });
            return;
        }
        
        const game = generateQuestion(difficulty);
        
        activeMathGames.set(chatId, {
            ...game,
            startTime: Date.now(),
            difficulty,
            attempts: 0,
            maxAttempts: difficulty === 'hard' ? 2 : 3
        });
        
        await sock.sendMessage(chatId, { 
            text: `🎮 Math Game (${difficulty.toUpperCase()})\n\n` +
                  `📝 Soal: ${game.question}\n\n` +
                  `💰 Reward: ${REWARDS[difficulty]} balance\n` +
                  `🎯 Kesempatan: ${difficulty === 'hard' ? 2 : 3}x\n` +
                  `⏱️ Waktu: 60 detik\n\n` +
                  `Ketik angka jawabannya saja...`,
            quoted: msg
        });
        
        setTimeout(async () => {
            const game = activeMathGames.get(chatId);
            if (game) {
                await sock.sendMessage(chatId, { 
                    text: `⏱️ Waktu habis!\n\n` +
                          `Jawaban yang benar adalah: ${game.answer}`,
                    quoted: msg
                });
                activeMathGames.delete(chatId);
            }
        }, 60000);
        
    } catch (error) {
        logger.error('Error in math handler:', error);
        await sock.sendMessage(msg.key.remoteJid, { 
            text: '❌ Terjadi kesalahan saat memulai game.',
            quoted: msg
        });
    }
}

async function handleMathAnswer(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || msg.key.remoteJid;
        
        if (!activeMathGames.has(chatId)) return;
        
        const game = activeMathGames.get(chatId);
        const userAnswer = parseInt(msg.message?.conversation?.trim());
        
        if (isNaN(userAnswer)) return;
        
        game.attempts++;
        
        if (userAnswer === game.answer) {
            const user = await User.getUser(senderId);
            if (!user) return;
            
            const newBalance = user.balance + REWARDS[game.difficulty];
            await User.updateUser(senderId, { balance: newBalance });
            
            await sock.sendMessage(chatId, { 
                text: `🎉 Selamat @${senderId.split('@')[0]}!\n\n` +
                      `✅ Jawaban benar!\n` +
                      `💰 Reward: +${REWARDS[game.difficulty]} balance\n` +
                      `💳 Balance sekarang: ${newBalance}`,
                mentions: [senderId],
                quoted: msg
            });
            
            activeMathGames.delete(chatId);
        } else {
            if (game.attempts >= game.maxAttempts) {
                await sock.sendMessage(chatId, { 
                    text: `❌ Game Over!\n\n` +
                          `Kesempatan habis!\n` +
                          `Jawaban yang benar: ${game.answer}`,
                    quoted: msg
                });
                activeMathGames.delete(chatId);
            } else {
                await sock.sendMessage(chatId, { 
                    text: `❌ Jawaban salah!\n` +
                          `Sisa kesempatan: ${game.maxAttempts - game.attempts}x`,
                    quoted: msg
                });
            }
        }
    } catch (error) {
        logger.error('Error handling math answer:', error);
    }
}

function hasMathGame(chatId) {
    return activeMathGames.has(chatId);
}

module.exports = {
    mathHandler,
    handleMathAnswer,
    hasMathGame
};