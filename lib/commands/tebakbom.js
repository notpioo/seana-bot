const User = require('../../database/models/User');
const gameState = {};

function initializeGame(groupId) {
    const bombPosition = Math.floor(Math.random() * 9) + 1;
    let bonusPosition;
    
    // Memastikan posisi bonus tidak sama dengan posisi bom
    do {
        bonusPosition = Math.floor(Math.random() * 9) + 1;
    } while (bonusPosition === bombPosition);
    
    return {
        bombPosition,
        bonusPosition,
        guessedBoxes: [],
        players: {},
        isActive: true,
        startTime: Date.now(),
        lastActivity: Date.now()
    };
 }

 function generateGameBoard(guessedBoxes, bombPosition, bonusPosition, gameOver = false) {
    let board = '';
    for (let i = 1; i <= 9; i++) {
        if (guessedBoxes.includes(i)) {
            if (i === bombPosition && gameOver) {
                board += '💣';
            } else if (i === bonusPosition && gameOver) {
                board += '🎁';
            } else if (i === bonusPosition) {
                board += '🎁';
            } else {
                board += '✅';
            }
        } else {
            if (gameOver) {
                if (i === bombPosition) {
                    board += '💣';
                } else if (i === bonusPosition) {
                    board += '🎁';
                } else {
                    board += '⬜';
                }
            } else {
                board += '⬜';
            }
        }
        if (i % 3 === 0) board += '\n';
    }
    return board;
}

async function checkTimeout(sock, groupId) {
    const game = gameState[groupId];
    if (!game) return;
 
    const timeoutDuration = 3 * 60 * 1000; // 3 menit
    const now = Date.now();
 
    if (now - game.lastActivity >= timeoutDuration) {
        const board = generateGameBoard(game.guessedBoxes, game.bombPosition, game.bonusPosition, true);
        
        await sock.sendMessage(groupId, {
            text: `⏰ *GAME DIBATALKAN*\n\n` +
                  `Permainan dibatalkan karena tidak ada aktivitas selama 3 menit.\n\n` +
                  `${board}\n` +
                  `💣 Posisi bom ada di kotak ${game.bombPosition}\n` +
                  `🎁 Posisi bonus ada di kotak ${game.bonusPosition}`
        });
 
        delete gameState[groupId];
    }
 }

 async function tebakBomHandler(sock, msg) {
    try {
        const groupId = msg.key.remoteJid;
        
        if (gameState[groupId]?.isActive) {
            await sock.sendMessage(groupId, {
                text: '❌ Permainan Tebak Bom sedang berlangsung!',
                quoted: msg
            });
            return;
        }
 
        gameState[groupId] = initializeGame(groupId);
        const board = generateGameBoard([], gameState[groupId].bombPosition, gameState[groupId].bonusPosition);
 
        await sock.sendMessage(groupId, {
            text: `🎮 *TEBAK BOM*\n\n` +
                  `${board}\n` +
                  `Tebak kotak 1-9 yang tidak berisi bom! 💣\n\n` +
                  `Hadiah:\n` +
                  `• Kotak benar: +25 balance 💰\n` +
                  `• Kotak bonus: +50 balance 🎁\n` +
                  `• Kena Bom: -20% balance yang didapat 💥\n` +
                  `• Bonus semua benar: +100 balance ✨\n\n` +
                  `⏰ Game akan dibatalkan jika tidak ada aktivitas selama 3 menit\n\n` +
                  `Ketik angka 1-9 untuk menebak!`,
            quoted: msg
        });
 
        // Set interval untuk mengecek timeout
        const intervalId = setInterval(() => {
            checkTimeout(sock, groupId);
            if (!gameState[groupId]) {
                clearInterval(intervalId);
            }
        }, 30000); // Cek setiap 30 detik
 
    } catch (error) {
        console.error('Error in tebakBomHandler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memulai permainan',
            quoted: msg
        });
    }
 }

 async function handleBombGuess(sock, msg) {
    try {
        const groupId = msg.key.remoteJid;
        const game = gameState[groupId];
        
        if (!game?.isActive) return;
 
        const guess = parseInt(msg.message?.conversation || 
                            msg.message?.extendedTextMessage?.text);
        
        if (isNaN(guess) || guess < 1 || guess > 9) return;
        
        const playerId = msg.key.participant || msg.key.remoteJid;
 
        // Update last activity
        game.lastActivity = Date.now();
 
        if (!game.players[playerId]) {
            game.players[playerId] = {
                balance: 0,
                guesses: []
            };
        }
 
        if (game.guessedBoxes.includes(guess)) {
            await sock.sendMessage(groupId, {
                text: '❌ Kotak ini sudah ditebak!',
                quoted: msg
            });
            return;
        }
 
        game.guessedBoxes.push(guess);
        game.players[playerId].guesses.push(guess);
 
        if (guess === game.bombPosition) {
            const currentBalance = game.players[playerId].balance;
            const penalty = Math.floor(currentBalance * 0.2);
            
            if (currentBalance > 0) {
                await User.updateUser(playerId, {
                    $inc: { balance: -penalty }
                });
            }
 
            const board = generateGameBoard(game.guessedBoxes, game.bombPosition, game.bonusPosition, true);
            
            let summary = `💥 *BOOM! GAME OVER*\n\n${board}\n`;
            summary += `@${playerId.split('@')[0]} terkena bom!\n\n`;
            summary += `📊 *RINGKASAN PERMAINAN*\n`;
            
            for (const [pid, data] of Object.entries(game.players)) {
                const playerBalance = data.balance - (pid === playerId ? penalty : 0);
                summary += `@${pid.split('@')[0]}: ${playerBalance} balance\n`;
            }
 
            await sock.sendMessage(groupId, {
                text: summary,
                mentions: Object.keys(game.players)
            });
 
            delete gameState[groupId];
            
        } else {
            let bonusMessage = '';
            if (guess === game.bonusPosition) {
                game.players[playerId].balance += 75; // 25 normal + 50 bonus
                bonusMessage = `\n🎁 Bonus +50 balance!`;
                
                await User.updateUser(playerId, {
                    $inc: { balance: 75 }
                });
            } else {
                game.players[playerId].balance += 25;
                
                await User.updateUser(playerId, {
                    $inc: { balance: 25 }
                });
            }
 
            const board = generateGameBoard(game.guessedBoxes, game.bombPosition, game.bonusPosition);
            
            const remainingBoxes = 9 - game.guessedBoxes.length;
            const safeBoxesLeft = remainingBoxes - (game.guessedBoxes.includes(game.bombPosition) ? 0 : 1);
 
            if (safeBoxesLeft === 0) {
                const players = Object.keys(game.players);
                for (const player of players) {
                    game.players[player].balance += 100;
                    await User.updateUser(player, {
                        $inc: { balance: 100 }
                    });
                }
 
                let summary = `🎉 *SELAMAT! PERMAINAN SELESAI*\n\n${board}\n`;
                summary += `Semua kotak aman ditemukan!\n`;
                summary += `Bonus +100 balance untuk semua pemain!\n\n`;
                summary += `📊 *TOTAL PEROLEHAN*\n`;
                
                for (const [pid, data] of Object.entries(game.players)) {
                    summary += `@${pid.split('@')[0]}: ${data.balance} balance\n`;
                }
 
                await sock.sendMessage(groupId, {
                    text: summary,
                    mentions: players
                });
 
                delete gameState[groupId];
            } else {
                await sock.sendMessage(groupId, {
                    text: `✨ *AMAN!*\n\n` +
                          `${board}\n` +
                          `@${playerId.split('@')[0]} mendapat +25 balance${bonusMessage}\n` +
                          `Balance terkumpul: ${game.players[playerId].balance}\n` +
                          `Sisa kotak: ${remainingBoxes}`,
                    mentions: [playerId]
                });
            }
        }
 
    } catch (error) {
        console.error('Error in handleBombGuess:', error);
    }
}

module.exports = {
    tebakBomHandler,
    handleBombGuess
};