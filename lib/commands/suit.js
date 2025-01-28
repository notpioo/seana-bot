const User = require('../../database/models/User');

// Constants
const REWARDS = {
    WIN: 300,
    DRAW: 100
};

const CHOICES = {
    'G': '✂️',
    'B': '🪨',
    'K': '📄'
};

// Game state management
const gameStates = new Map();

// Helper function to determine winner
const determineWinner = (choice1, choice2) => {
    if (choice1 === choice2) return 'DRAW';
    
    const wins = {
        'G': 'K',
        'K': 'B',
        'B': 'G'
    };
    
    return wins[choice1] === choice2 ? 'P1' : 'P2';
};

// Main suit handler
async function suitHandler(sock, msg, mentionedJid) {
    try {
        // Only allow in groups
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Permainan suit hanya bisa dimainkan di dalam grup!',
                quoted: msg
            });
            return;
        }

        const challenger = msg.key.participant;
        const challenged = mentionedJid[0];

        // Make sure we're not challenging ourselves
        if (challenger === challenged) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu tidak bisa menantang diri sendiri!',
                quoted: msg
            });
            return;
        }

        // Check for existing game
        if (gameStates.has(msg.key.remoteJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Sedang ada permainan suit yang berlangsung di grup ini!',
                quoted: msg
            });
            return;
        }

        // Initialize game state
        gameStates.set(msg.key.remoteJid, {
            challenger,
            challenged,
            status: 'WAITING_ACCEPTANCE',
            choices: {},
            timestamp: Date.now()
        });

        // Send challenge message
        await sock.sendMessage(msg.key.remoteJid, {
            text: `@${challenged.split('@')[0]} kamu ditantang suit oleh @${challenger.split('@')[0]}!\n\nKetik Y untuk menerima atau T untuk menolak.`,
            mentions: [challenged, challenger],
            quoted: msg
        });

        // Add timeout to clean up stale games
        setTimeout(() => {
            const gameState = gameStates.get(msg.key.remoteJid);
            if (gameState && gameState.status === 'WAITING_ACCEPTANCE') {
                gameStates.delete(msg.key.remoteJid);
                sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Permainan suit dibatalkan karena tidak ada respon.',
                    quoted: msg
                }).catch(console.error);
            }
        }, 60000); // 1 minute timeout

    } catch (error) {
        console.error('Error in suitHandler:', error);
        gameStates.delete(msg.key.remoteJid);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengirim tantangan. Silakan coba lagi.',
            quoted: msg
        });
    }
}

// Handle Y/T response
async function handleSuitResponse(sock, msg) {
    try {
        const groupId = msg.key.remoteJid;
        const gameState = gameStates.get(groupId);
        
        if (!gameState || gameState.status !== 'WAITING_ACCEPTANCE') return;
        
        const response = msg.message?.conversation?.trim().toUpperCase() || '';
        const responder = msg.key.participant;
        
        if (responder !== gameState.challenged) return;
        
        if (response === 'Y') {
            gameState.status = 'PLAYING';
            await sock.sendMessage(groupId, {
                text: '✨ Permainan dimulai!\n\nSilakan kirim pilihan melalui private message:\nG = ✂️ (Gunting)\nB = 🪨 (Batu)\nK = 📄 (Kertas)',
                mentions: [gameState.challenger, gameState.challenged],
                quoted: msg
            });

            // Send private messages to both players
            const pmMessage = 'Pilih opsi:\nG = ✂️ (Gunting)\nB = 🪨 (Batu)\nK = 📄 (Kertas)';
            await sock.sendMessage(gameState.challenger, { text: pmMessage });
            await sock.sendMessage(gameState.challenged, { text: pmMessage });
        } else if (response === 'T') {
            await sock.sendMessage(groupId, {
                text: `❌ @${gameState.challenged.split('@')[0]} menolak tantangan suit!`,
                mentions: [gameState.challenger, gameState.challenged],
                quoted: msg
            });
            gameStates.delete(groupId);
        }
    } catch (error) {
        console.error('Error in handleSuitResponse:', error);
    }
}

// Handle G/B/K choice
async function handleSuitChoice(sock, msg) {
    try {
        const choice = msg.message?.conversation?.trim().toUpperCase() || '';
        const player = msg.key.remoteJid;
        
        // Find the game this player is participating in
        const [groupId, gameState] = Array.from(gameStates.entries())
            .find(([_, state]) => 
                state.status === 'PLAYING' && 
                (state.challenger === player || state.challenged === player)
            ) || [];
        
        if (!gameState) return;
        
        if (!['G', 'B', 'K'].includes(choice)) {
            await sock.sendMessage(player, {
                text: '❌ Pilihan tidak valid! Gunakan:\nG = Gunting\nB = Batu\nK = Kertas'
            });
            return;
        }
        
        // Record the player's choice
        gameState.choices[player] = choice;
        await sock.sendMessage(player, { 
            text: `✅ Kamu memilih: ${CHOICES[choice]}`
        });
        
        // If both players have made their choices
        if (Object.keys(gameState.choices).length === 2) {
            const choice1 = gameState.choices[gameState.challenger];
            const choice2 = gameState.choices[gameState.challenged];
            const result = determineWinner(choice1, choice2);
            
            let resultMessage = `🎮 Hasil Suit:\n\n@${gameState.challenger.split('@')[0]}: ${CHOICES[choice1]}\n@${gameState.challenged.split('@')[0]}: ${CHOICES[choice2]}\n\n`;
            
            // Handle rewards
            if (result === 'DRAW') {
                const challenger_jid = gameState.challenger;
                const challenged_jid = gameState.challenged;
                
                // Update balance for both players
                let challenger = User.getUser(challenger_jid);
                let challenged = User.getUser(challenged_jid);
                
                challenger.balance += REWARDS.DRAW;
                challenged.balance += REWARDS.DRAW;
                
                User.updateUser(challenger_jid, { balance: challenger.balance });
                User.updateUser(challenged_jid, { balance: challenged.balance });
                
                resultMessage += `🤝 Hasil: Seri!\nKedua pemain mendapatkan ${REWARDS.DRAW} balance\n\n`;
                resultMessage += `💰 Balance @${challenger_jid.split('@')[0]}: ${challenger.balance}\n`;
                resultMessage += `💰 Balance @${challenged_jid.split('@')[0]}: ${challenged.balance}`;
            } else {
                const winner = result === 'P1' ? gameState.challenger : gameState.challenged;
                const winner_jid = winner;
                
                // Update winner's balance
                let winnerUser = User.getUser(winner_jid);
                winnerUser.balance += REWARDS.WIN;
                User.updateUser(winner_jid, { balance: winnerUser.balance });
                
                resultMessage += `🎉 Pemenang: @${winner_jid.split('@')[0]}!\n`;
                resultMessage += `💰 Mendapatkan: ${REWARDS.WIN} balance\n`;
                resultMessage += `💰 Balance sekarang: ${winnerUser.balance}`;
            }
            
            await sock.sendMessage(groupId, {
                text: resultMessage,
                mentions: [gameState.challenger, gameState.challenged]
            });
            
            gameStates.delete(groupId);
        }
    } catch (error) {
        console.error('Error in handleSuitChoice:', error);
    }
}

module.exports = {
    suitHandler,
    handleSuitResponse,
    handleSuitChoice
};