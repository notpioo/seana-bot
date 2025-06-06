const User = require('../../database/models/User');

// Game state storage
const diceRooms = new Map();

// Dice emojis for numbers 1-6
const DICE_EMOJIS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// Owner number from config
const OWNER_NUMBER = "6285709557572@s.whatsapp.net";

class DiceRoom {
    constructor(creator, bet, groupId) {
        this.creator = creator;
        this.groupId = groupId;
        this.players = [{
            jid: creator,
            bet: bet,
            choice: null
        }];
        this.status = 'waiting';
        this.maxPlayers = 6;
        this.createdAt = Date.now();
        this.diceResult = null; // Store dice result
    }

    addPlayer(jid, bet) {
        if (this.players.length >= this.maxPlayers) return false;
        if (this.players.some(p => p.jid === jid)) return false;
        
        this.players.push({
            jid,
            bet,
            choice: null
        });
        return true;
    }

    setChoice(jid, choice) {
        const player = this.players.find(p => p.jid === jid);
        if (player) {
            player.choice = choice;
            return true;
        }
        return false;
    }

    allPlayersChosen() {
        return this.players.every(p => p.choice !== null);
    }

    rollDice() {
        let total = 0;
        const rolls = [];
        const emojis = [];
        for (let i = 0; i < 9; i++) {
            const roll = Math.floor(Math.random() * 6) + 1;
            rolls.push(roll);
            emojis.push(DICE_EMOJIS[roll - 1]);
            total += roll;
        }
        return { total, rolls, emojis };
    }

    getTotalBets() {
        return this.players.reduce((sum, player) => sum + player.bet, 0);
    }

    // Auto-cleanup for inactive rooms (5 minutes timeout)
    shouldCleanup() {
        return Date.now() - this.createdAt > 5 * 60 * 1000;
    }
}

async function diceHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Check if message is from group
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Game dice hanya dapat dimainkan di dalam grup!',
                quoted: msg
            });
            return;
        }

        const user = await User.getUser(senderJid);
        
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Silahkan daftar terlebih dahulu dengan mengetik .profile',
                quoted: msg
            });
            return;
        }

        const args = msg.message.conversation.split(' ');
        const bet = parseInt(args[1]);

        if (!bet || bet <= 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Masukkan jumlah chip yang valid! Contoh: .dice 100',
                quoted: msg
            });
            return;
        }

        if (bet > user.chips) {  // Changed from balance to chips
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Chip anda tidak cukup!',
                quoted: msg
            });
            return;
        }

        // Create new room
        diceRooms.set(msg.key.remoteJid, new DiceRoom(senderJid, bet, msg.key.remoteJid));

        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎲 Room dice telah dibuat!\n\n` +
                  `Creator: @${senderJid.split('@')[0]}\n` +
                  `Taruhan: ${bet.toLocaleString()}\n\n` +
                  `Ketik .joindice <jumlah_taruhan> untuk bergabung\n` +
                  `Ketik .startdice untuk memulai permainan\n\n` +
                  `Room akan dihapus dalam 5 menit jika tidak dimulai`,
            mentions: [senderJid]
        });

    } catch (error) {
        console.error('Error in dice handler:', error);
    }
}

async function joinDiceHandler(sock, msg) {
    try {
        // Check if message is from group
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return;
        }

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const user = await User.getUser(senderJid);
        const args = msg.message.conversation.split(' ');
        const bet = parseInt(args[1]);

        const room = diceRooms.get(msg.key.remoteJid);
        
        if (!room) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada room dice yang aktif!',
                quoted: msg
            });
            return;
        }

        if (room.status !== 'waiting') {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Permainan sudah dimulai!',
                quoted: msg
            });
            return;
        }

        if (!bet || bet <= 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Masukkan jumlah taruhan yang valid! Contoh: .joindice 100',
                quoted: msg
            });
            return;
        }

        if (bet > user.chips) {  // Changed from balance to chips
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Chip anda tidak cukup!',
                quoted: msg
            });
            return;
        }

        if (room.addPlayer(senderJid, bet)) {
            const playersList = room.players
                .map(p => `@${p.jid.split('@')[0]} (${p.bet.toLocaleString()})`)
                .join('\n');

            const totalPot = room.getTotalBets();

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🎲 Pemain bergabung!\n\nPemain:\n${playersList}\n\n` +
                      `Total Pot: ${totalPot.toLocaleString()}\n\n` +
                      `Ketik .startdice untuk memulai permainan`,
                mentions: room.players.map(p => p.jid)
            });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak bisa bergabung ke room! (Room penuh atau sudah bergabung)',
                quoted: msg
            });
        }

    } catch (error) {
        console.error('Error in join dice handler:', error);
    }
}

async function startDiceHandler(sock, msg) {
    try {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return;
        }

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const room = diceRooms.get(msg.key.remoteJid);

        if (!room) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada room dice yang aktif!',
                quoted: msg
            });
            return;
        }

        if (senderJid !== room.creator) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Hanya pembuat room yang dapat memulai permainan!',
                quoted: msg
            });
            return;
        }

        if (room.players.length < 2) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Minimal 2 pemain untuk memulai permainan!',
                quoted: msg
            });
            return;
        }

        // Roll dice and store result before showing choices
        const diceResult = room.rollDice();
        room.diceResult = diceResult;
        const result = diceResult.total > 32 ? 'BESAR (B)' : 'KECIL (K)';

        // Send result to owner
        await sock.sendMessage(OWNER_NUMBER, {
            text: `🎲 *Hasil Dadu Game Baru*\n\n` +
                 `Group: ${msg.key.remoteJid}\n` +
                 `Dadu: ${diceResult.emojis.join(' ')}\n` +
                 `Total: ${diceResult.total}\n` +
                 `Hasil: ${result}\n\n` +
                 `Pemain:\n${room.players.map(p => `@${p.jid.split('@')[0]} (${p.bet.toLocaleString()})`).join('\n')}`,
            mentions: room.players.map(p => p.jid)
        });

        room.status = 'choosing';
        const playersList = room.players
            .map(p => `@${p.jid.split('@')[0]} (${p.bet.toLocaleString()})`)
            .join('\n');

        const totalPot = room.getTotalBets();

        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎲 Permainan Dice dimulai!\n\n` +
                  `Pemain:\n${playersList}\n\n` +
                  `Total Pot: ${totalPot.toLocaleString()}\n\n` +
                  `Silahkan pilih:\n` +
                  `K = Kecil (< 32)\n` +
                  `B = Besar (> 32)\n\n` +
                  `Ketik K atau B untuk memilih!`,
            mentions: room.players.map(p => p.jid)
        });

    } catch (error) {
        console.error('Error in start dice handler:', error);
    }
}

async function handleDiceChoice(sock, msg) {
    try {
        // Verify message is from a group
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return;
        }

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const room = diceRooms.get(msg.key.remoteJid);
        const choice = msg.message.conversation.toUpperCase();

        // Basic validation checks
        if (!room || !['K', 'B'].includes(choice) || room.status !== 'choosing') {
            return;
        }

        const player = room.players.find(p => p.jid === senderJid);
        if (!player || player.choice !== null) {
            return;
        }

        // Record player's choice
        if (room.setChoice(senderJid, choice)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ @${senderJid.split('@')[0]} telah memilih!`,
                mentions: [senderJid]
            });

            // Check if all players have made their choices
            if (room.allPlayersChosen()) {
                room.status = 'finished';
                await new Promise(resolve => setTimeout(resolve, 100));

                const { total, emojis } = room.diceResult;
                const result = total > 32 ? 'B' : 'K';

                let resultMessage = `🎲 Hasil Dadu:\n${emojis.join(' ')} = ${total}\n` +
                                  `Hasil: ${result === 'B' ? 'BESAR 📈' : 'KECIL 📉'}\n\n` +
                                  `Detail Permainan:\n`;

                // Calculate total pot for display
                const totalPot = room.getTotalBets();
                resultMessage += `Total Pot: ${totalPot.toLocaleString()} chips 💰\n\n`;

                // Process winners and losers
                for (const player of room.players) {
                    const user = await User.getUser(player.jid);
                    const isWinner = player.choice === result;
                    
                    // Update game statistics
                    const currentStats = user.dice || { games: 0, wins: 0, profit: 0 };
                    const statsUpdate = {
                        'dice.games': currentStats.games + 1,
                        'dice.wins': currentStats.wins + (isWinner ? 1 : 0),
                        'dice.profit': currentStats.profit + (isWinner ? 
                            Math.floor(player.bet * 1.5) : -player.bet)
                    };

                    if (isWinner) {
                        // Winner processing
                        const winAmount = Math.floor(player.bet * 1.5);
                        await User.updateUser(player.jid, {
                            chips: user.chips + winAmount,
                            ...statsUpdate
                        });

                        resultMessage += `@${player.jid.split('@')[0]} 🎯\n` +
                                       `Pilihan: ${player.choice}\n` +
                                       `Taruhan: ${player.bet.toLocaleString()} chips\n` +
                                       `Menang: +${winAmount.toLocaleString()} chips 💰\n` +
                                       `Saldo Chips: ${(user.chips + winAmount).toLocaleString()} chips\n\n`;
                    } else {
                        // Loser processing
                        await User.updateUser(player.jid, {
                            chips: user.chips - player.bet,
                            ...statsUpdate
                        });

                        resultMessage += `@${player.jid.split('@')[0]} 💔\n` +
                                       `Pilihan: ${player.choice}\n` +
                                       `Taruhan: ${player.bet.toLocaleString()} chips\n` +
                                       `Kalah: -${player.bet.toLocaleString()} chips 💸\n` +
                                       `Saldo Chips: ${(user.chips - player.bet).toLocaleString()} chips\n\n`;
                    }
                }

                // Add game summary
                resultMessage += `\n📊 Ringkasan Permainan:\n` +
                               `• Total Pemain: ${room.players.length}\n` +
                               `• Total Pot: ${totalPot.toLocaleString()} chips\n` +
                               `• Hasil Dadu: ${total} (${result === 'B' ? 'BESAR' : 'KECIL'})\n\n` +
                               `Terima kasih telah bermain! 🎮\n` +
                               `Ketik .dice <jumlah_chip> untuk main lagi!`;

                // Send final result message
                await sock.sendMessage(msg.key.remoteJid, {
                    text: resultMessage,
                    mentions: room.players.map(p => p.jid)
                });

                // Clean up the room
                diceRooms.delete(msg.key.remoteJid);
            }
        }

    } catch (error) {
        console.error('Error in handle dice choice:', error);
        // Send error message to group
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan dalam permainan dice.'
        });
    }
}

async function diceStatsHandler(sock, msg) {
    try {
        const users = await User.model.find({
            'dice.games': { $gt: 0 }
        }).sort({ 'dice.profit': -1 }).limit(10);

        if (users.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Belum ada data permainan dice.',
                quoted: msg
            });
            return;
        }

        let message = `🎲 *LEADERBOARD DICE TOP 10* 🎲\n\n`;

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const winrate = ((user.dice.wins / user.dice.games) * 100).toFixed(1);
            
            message += `${i + 1}. @${user.jid.split('@')[0]}\n` +
                      `┠ Games: ${user.dice.games}\n` +
                      `┠ Win: ${user.dice.wins}\n` +
                      `┠ Winrate: ${winrate}%\n` +
                      `┖ Profit: ${user.dice.profit > 0 ? '+' : ''}${user.dice.profit.toLocaleString()} chips\n\n`;
        }

        message += `\n⭐ Mainkan game dice untuk masuk leaderboard!`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: message,
            mentions: users.map(u => u.jid)
        });

    } catch (error) {
        console.error('Error in dice stats handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengambil statistik.',
            quoted: msg
        });
    }
}

async function resetDiceStatsHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Check if sender is admin/owner
        if (senderJid !== OWNER_NUMBER) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Hanya owner yang dapat mereset leaderboard dice!',
                quoted: msg
            });
            return;
        }

        // Get count of players with dice stats before reset
        const playerCount = await User.model.countDocuments({ 'dice.games': { $gt: 0 } });

        // Reset all users' dice stats
        await User.model.updateMany(
            { 'dice.games': { $gt: 0 } },
            {
                $set: {
                    'dice.games': 0,
                    'dice.wins': 0,
                    'dice.profit': 0
                }
            }
        );

        // Send confirmation message with player count
        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Leaderboard dice telah direset!\n\n` +
                  `Total ${playerCount} pemain telah direset statistiknya.\n` +
                  `Selamat bermain kembali! 🎲`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in reset dice stats handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mereset statistik.',
            quoted: msg
        });
    }
}

// Cleanup function to remove inactive rooms
function cleanupInactiveRooms() {
    for (const [groupId, room] of diceRooms.entries()) {
        if (room.shouldCleanup()) {
            diceRooms.delete(groupId);
        }
    }
}

// Run cleanup every minute
setInterval(cleanupInactiveRooms, 60 * 1000);

module.exports = {
    diceHandler,
    joinDiceHandler,
    startDiceHandler,
    handleDiceChoice,
    diceStatsHandler,
    resetDiceStatsHandler
};