const User = require('../../database/models/User');

// Game room management
const gameRooms = new Map();
const waitingPlayers = new Map();

// Game board representation
class TicTacToeGame {
    constructor(player1, player2) {
        this.board = [
            ['1️⃣', '2️⃣', '3️⃣'],
            ['4️⃣', '5️⃣', '6️⃣'],
            ['7️⃣', '8️⃣', '9️⃣']
        ];
        this.players = {
            X: player1,
            O: player2
        };
        this.currentTurn = Math.random() < 0.5 ? 'X' : 'O';
        this.moves = 0;
        this.lastMoveTime = Date.now();
        this.symbols = {
            X: '❌',
            O: '⭕'
        };
        this.gameMessageId = null;
    }

    makeMove(position, symbol) {
        const row = Math.floor((position - 1) / 3);
        const col = (position - 1) % 3;

        if (this.isValidMove(row, col)) {
            this.board[row][col] = this.symbols[symbol];
            this.moves++;
            this.lastMoveTime = Date.now();
            this.currentTurn = symbol === 'X' ? 'O' : 'X';
            return true;
        }
        return false;
    }

    isValidMove(row, col) {
        return this.board[row][col] && !['❌', '⭕'].includes(this.board[row][col]);
    }

    checkWin() {
        // Check rows
        for (let i = 0; i < 3; i++) {
            if (this.board[i][0] === this.board[i][1] && 
                this.board[i][1] === this.board[i][2]) {
                return this.board[i][0] === this.symbols.X ? 'X' : 'O';
            }
        }

        // Check columns
        for (let i = 0; i < 3; i++) {
            if (this.board[0][i] === this.board[1][i] && 
                this.board[1][i] === this.board[2][i]) {
                return this.board[0][i] === this.symbols.X ? 'X' : 'O';
            }
        }

        // Check diagonals
        if (this.board[0][0] === this.board[1][1] && 
            this.board[1][1] === this.board[2][2]) {
            return this.board[0][0] === this.symbols.X ? 'X' : 'O';
        }
        if (this.board[0][2] === this.board[1][1] && 
            this.board[1][1] === this.board[2][0]) {
            return this.board[0][2] === this.symbols.X ? 'X' : 'O';
        }

        // Check draw
        if (this.moves === 9) return 'draw';

        return null;
    }

    getBoardDisplay() {
        return this.board.map(row => row.join('')).join('\n');
    }

    getCurrentPlayer() {
        return this.players[this.currentTurn];
    }

    getOpponentPlayer() {
        return this.players[this.currentTurn === 'X' ? 'O' : 'X'];
    }
}

// Clean up expired rooms and waiting players
setInterval(() => {
    const now = Date.now();
    
    // Clean up waiting players (3 minutes timeout)
    for (const [jid, time] of waitingPlayers) {
        if (now - time > 3 * 60 * 1000) {
            waitingPlayers.delete(jid);
        }
    }
    
    // Clean up game rooms (1 minute per move timeout)
    for (const [roomId, game] of gameRooms) {
        if (now - game.lastMoveTime > 60 * 1000) {
            handleGameTimeout(roomId);
        }
    }
}, 10000);

async function handleGameTimeout(roomId) {
    const game = gameRooms.get(roomId);
    if (!game) return;

    // Get the player who timed out (current turn)
    const timedOutPlayer = game.getCurrentPlayer();
    const winner = game.getOpponentPlayer();

    // Award winner and update balances
    if (winner && timedOutPlayer) {
        try {
            const winnerUser = await User.model.findOne({ jid: winner });
            const loserUser = await User.model.findOne({ jid: timedOutPlayer });

            if (winnerUser) {
                winnerUser.balance += 400;
                await winnerUser.save();
            }

            if (loserUser) {
                loserUser.balance += 50;
                await loserUser.save();
            }
        } catch (error) {
            console.error('Error updating balances:', error);
        }
    }

    // Clean up the game room
    gameRooms.delete(roomId);
}

async function tictactoeHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Check if player is already in a game
        for (const game of gameRooms.values()) {
            if (senderJid === game.players.X || senderJid === game.players.O) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Anda sedang dalam permainan!',
                    quoted: msg
                });
                return;
            }
        }

        // Check if player is waiting
        if (waitingPlayers.has(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Anda sudah dalam antrian menunggu lawan!',
                quoted: msg
            });
            return;
        }

        // If there's a waiting player, start the game
        const waitingPlayer = [...waitingPlayers.keys()][0];
        if (waitingPlayer && waitingPlayer !== senderJid) {
            // Create new game room
            const roomId = `${waitingPlayer}_${senderJid}`;
            const game = new TicTacToeGame(waitingPlayer, senderJid);
            gameRooms.set(roomId, game);
            waitingPlayers.delete(waitingPlayer);

            // Send game start message
            const gameMsg = await sock.sendMessage(msg.key.remoteJid, {
                text: `🎮 Permainan TicTacToe dimulai!\n\n` +
                      `Pemain ❌: @${waitingPlayer.split('@')[0]}\n` +
                      `Pemain ⭕: @${senderJid.split('@')[0]}\n\n` +
                      `Giliran: @${game.getCurrentPlayer().split('@')[0]}\n\n` +
                      `${game.getBoardDisplay()}\n\n` +
                      `Ketik angka 1-9 untuk memilih posisi`,
                mentions: [waitingPlayer, senderJid]
            });

            game.gameMessageId = gameMsg.key.id;
        } else {
            // Add player to waiting list
            waitingPlayers.set(senderJid, Date.now());
            await sock.sendMessage(msg.key.remoteJid, {
                text: '⌛ Menunggu lawan...\nKetik .ttt untuk bergabung!',
                quoted: msg
            });
        }
    } catch (error) {
        console.error('Error in tictactoe handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses permainan',
            quoted: msg
        });
    }
}

async function handleTicTacToeMove(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const move = parseInt(msg.message?.conversation || 
                            msg.message?.extendedTextMessage?.text);

        if (isNaN(move) || move < 1 || move > 9) return;

        let currentGame = null;
        let roomId = null;

        for (const [rid, game] of gameRooms) {
            if (senderJid === game.players.X || senderJid === game.players.O) {
                currentGame = game;
                roomId = rid;
                break;
            }
        }

        if (!currentGame) return;

        if (currentGame.getCurrentPlayer() !== senderJid) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Bukan giliran anda!',
                quoted: msg
            });
            return;
        }

        const symbol = senderJid === currentGame.players.X ? 'X' : 'O';
        if (!currentGame.makeMove(move, symbol)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Posisi sudah terisi atau tidak valid!',
                quoted: msg
            });
            return;
        }

        const gameStatus = currentGame.checkWin();
        let gameEndMessage = '';
        
        if (gameStatus) {
            if (gameStatus === 'draw') {
                // Handle draw - both players get 75 balance
                try {
                    for (const playerJid of [currentGame.players.X, currentGame.players.O]) {
                        const user = await User.model.findOne({ jid: playerJid });
                        if (user) {
                            user.balance += 75;
                            await user.save();
                            gameEndMessage += `@${playerJid.split('@')[0]} mendapat 75 balance (Total: ${user.balance})\n`;
                        }
                    }
                    gameEndMessage = '🤝 Permainan Seri!\n' + gameEndMessage;
                } catch (error) {
                    console.error('Error handling draw:', error);
                }
            } else {
                // Handle win/lose - winner gets 400, loser gets 50
                try {
                    const winner = currentGame.players[gameStatus];
                    const loser = gameStatus === 'X' ? currentGame.players.O : currentGame.players.X;
                    
                    const winnerUser = await User.model.findOne({ jid: winner });
                    const loserUser = await User.model.findOne({ jid: loser });

                    if (winnerUser) {
                        winnerUser.balance += 400;
                        await winnerUser.save();
                        gameEndMessage += `🎉 @${winner.split('@')[0]} menang! (+400 balance, Total: ${winnerUser.balance})\n`;
                    }

                    if (loserUser) {
                        loserUser.balance += 50;
                        await loserUser.save();
                        gameEndMessage += `@${loser.split('@')[0]} kalah (+50 balance, Total: ${loserUser.balance})`;
                    }
                } catch (error) {
                    console.error('Error handling win/lose:', error);
                }
            }

            gameRooms.delete(roomId);
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎮 TicTacToe\n\n` +
                  `${currentGame.getBoardDisplay()}\n\n` +
                  `${gameStatus ? gameEndMessage : 
                    `Giliran: @${currentGame.getCurrentPlayer().split('@')[0]}`}`,
            mentions: gameStatus ? [currentGame.players.X, currentGame.players.O] : 
                     [currentGame.getCurrentPlayer()]
        });

    } catch (error) {
        console.error('Error handling TicTacToe move:', error);
    }
}

module.exports = {
    tictactoeHandler,
    handleTicTacToeMove
};