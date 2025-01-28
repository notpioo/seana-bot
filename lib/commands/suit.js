const User = require('../../database/models/User');

const gameStates = new Map();

const REWARDS = {
    WIN: 300,
    DRAW: 100
};

const CHOICES = {
    'G': '✂️',
    'B': '🪨',
    'K': '📄'
};

const determineWinner = (choice1, choice2) => {
    if (choice1 === choice2) return 'DRAW';
    
    const wins = {
        'G': 'K',
        'K': 'B',
        'B': 'G'
    };
    
    return wins[choice1] === choice2 ? 'P1' : 'P2';
};

async function suitHandler(sock, msg) {
    try {
        console.log('Processing suit command...');
        
        // Only allow in groups
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: 'Permainan suit hanya bisa dimainkan di dalam grup!'
            });
            return;
        }

        let challenged;
        const challenger = msg.key.participant;
        const messageText = msg.message.extendedTextMessage?.text || msg.message.conversation || '';
        
        // Check if message is a reply
        if (msg.message.extendedTextMessage?.contextInfo?.participant) {
            challenged = msg.message.extendedTextMessage.contextInfo.participant;
        } 
        // Check if number is provided after .suit command
        else {
            const args = messageText.split(' ');
            if (args.length < 2) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Cara bermain suit:\n1. Reply pesan seseorang dengan .suit\n2. Ketik .suit nomor\nContoh: .suit 628123456789'
                });
                return;
            }

            // Clean and validate the number
            let number = args[1].replace(/[^0-9]/g, '');
            
            // Add country code if not present
            if (!number.startsWith('62')) {
                if (number.startsWith('0')) {
                    number = '62' + number.slice(1);
                } else {
                    number = '62' + number;
                }
            }
            
            challenged = `${number}@s.whatsapp.net`;
        }

        // Make sure we're not challenging ourselves
        if (challenger === challenged) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: 'Kamu tidak bisa menantang diri sendiri!'
            });
            return;
        }

        // Check for existing game
        if (gameStates.has(msg.key.remoteJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: 'Sedang ada permainan suit yang berlangsung di grup ini!'
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
            text: `@${challenged.split('@')[0]} kamu ditantang suit oleh @${challenger.split('@')[0]}!\nKetik Y untuk menerima atau T untuk menolak.`,
            mentions: [challenged, challenger]
        });

        // Add timeout to clean up stale games
        setTimeout(() => {
            const gameState = gameStates.get(msg.key.remoteJid);
            if (gameState && gameState.status === 'WAITING_ACCEPTANCE') {
                gameStates.delete(msg.key.remoteJid);
                sock.sendMessage(msg.key.remoteJid, {
                    text: 'Permainan suit dibatalkan karena tidak ada respon.'
                }).catch(console.error);
            }
        }, 60000); // 1 minute timeout

    } catch (error) {
        console.error('Error in suitHandler:', error);
        gameStates.delete(msg.key.remoteJid);
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Terjadi kesalahan saat mengirim tantangan. Silakan coba lagi.'
        });
    }
}

async function handleSuitResponse(sock, msg) {
    const groupId = msg.key.remoteJid;
    const gameState = gameStates.get(groupId);
    
    if (!gameState || gameState.status !== 'WAITING_ACCEPTANCE') return;
    
    const response = msg.message.conversation.trim().toUpperCase();
    const responder = msg.key.participant;
    
    if (responder !== gameState.challenged) return;
    
    if (response === 'Y') {
        gameState.status = 'PLAYING';
        await sock.sendMessage(groupId, {
            text: 'Silahkan kirim melalui private message untuk suitnya',
            mentions: [gameState.challenger, gameState.challenged]
        });

        // Send private messages to both players
        const message = 'Pilih opsi:\nG = ✂️ (Gunting)\nB = 🪨 (Batu)\nK = 📄 (Kertas)';
        await sock.sendMessage(gameState.challenger, { text: message });
        await sock.sendMessage(gameState.challenged, { text: message });
    } else if (response === 'T') {
        await sock.sendMessage(groupId, {
            text: `@${gameState.challenged.split('@')[0]} tidak menerima tantangan anda!`,
            mentions: [gameState.challenger]
        });
        gameStates.delete(groupId);
    }
}

async function handleSuitChoice(sock, msg) {
    const choice = msg.message.conversation.trim().toUpperCase();
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
            text: 'Pilihan tidak valid! Gunakan G (Gunting), B (Batu), atau K (Kertas)'
        });
        return;
    }
    
    // Record the player's choice
    gameState.choices[player] = choice;
    await sock.sendMessage(player, { text: `Kamu memilih: ${CHOICES[choice]}` });
    
    // If both players have made their choices
    if (Object.keys(gameState.choices).length === 2) {
        const choice1 = gameState.choices[gameState.challenger];
        const choice2 = gameState.choices[gameState.challenged];
        const result = determineWinner(choice1, choice2);
        
        let resultMessage = `Hasil Suit:\n@${gameState.challenger.split('@')[0]}: ${CHOICES[choice1]}\n@${gameState.challenged.split('@')[0]}: ${CHOICES[choice2]}\n\n`;
        
        if (result === 'DRAW') {
            const challenger_number = gameState.challenger.split('@')[0];
            const challenged_number = gameState.challenged.split('@')[0];

            // Get users
            let challenger = User.getUser(gameState.challenger);
            let challenged = User.getUser(gameState.challenged);

            // Create users if they don't exist
            if (!challenger) challenger = User.createUser(gameState.challenger, challenger_number);
            if (!challenged) challenged = User.createUser(gameState.challenged, challenged_number);

            // Update balances
            challenger.balance += REWARDS.DRAW;
            challenged.balance += REWARDS.DRAW;

            // Save changes
            User.updateUser(gameState.challenger, { balance: challenger.balance });
            User.updateUser(gameState.challenged, { balance: challenged.balance });
            
            resultMessage += `Hasil: Seri! Kedua pemain mendapatkan ${REWARDS.DRAW} balance\n\n`;
            resultMessage += `Balance @${challenger_number}: ${challenger.balance}\n`;
            resultMessage += `Balance @${challenged_number}: ${challenged.balance}`;
        } else {
            const winner = result === 'P1' ? gameState.challenger : gameState.challenged;
            const winner_number = winner.split('@')[0];
            
            // Get or create winner user
            let winnerUser = User.getUser(winner);
            if (!winnerUser) winnerUser = User.createUser(winner, winner_number);

            // Update balance
            winnerUser.balance += REWARDS.WIN;
            User.updateUser(winner, { balance: winnerUser.balance });
            
            resultMessage += `Pemenang: @${winner_number}!\n`;
            resultMessage += `Mendapatkan: ${REWARDS.WIN} balance\n`;
            resultMessage += `Balance sekarang: ${winnerUser.balance}`;
        }
        
        await sock.sendMessage(groupId, {
            text: resultMessage,
            mentions: [gameState.challenger, gameState.challenged]
        });
        
        gameStates.delete(groupId);
    }
}

module.exports = {
    suitHandler,
    handleSuitResponse,
    handleSuitChoice
};