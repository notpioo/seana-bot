const User = require('../../database/models/User');

// Game state storage
const diceRooms = new Map();

// Dice emojis for numbers 1-6
const DICE_EMOJIS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

class DiceRoom {
    constructor(creator, bet, groupId) {
        this.creator = creator;
        this.groupId = groupId;
        this.players = [{
            jid: creator,
            bet: bet,
            choice: null
        }];
        this.status = 'waiting'; // waiting, choosing, finished
        this.maxPlayers = 4;
        this.createdAt = Date.now();
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
                text: '❌ Masukkan jumlah taruhan yang valid! Contoh: .dice 100',
                quoted: msg
            });
            return;
        }

        if (bet > user.balance) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Balance anda tidak cukup!',
                quoted: msg
            });
            return;
        }

        // Cleanup inactive rooms
        if (diceRooms.has(msg.key.remoteJid) && diceRooms.get(msg.key.remoteJid).shouldCleanup()) {
            diceRooms.delete(msg.key.remoteJid);
        }

        if (diceRooms.has(msg.key.remoteJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Room dice sudah ada! Gunakan .joindice untuk bergabung',
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

        if (bet > user.balance) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Balance anda tidak cukup!',
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
        // Check if message is from group
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
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return;
        }

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const room = diceRooms.get(msg.key.remoteJid);
        const choice = msg.message.conversation.toUpperCase();

        if (!room || !['K', 'B'].includes(choice) || room.status !== 'choosing') {
            return;
        }

        // Check if player has already made a choice
        const player = room.players.find(p => p.jid === senderJid);
        if (!player || player.choice !== null) {
            return; // Skip if player already chose
        }

        if (room.setChoice(senderJid, choice)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ @${senderJid.split('@')[0]} telah memilih!`,
                mentions: [senderJid]
            });

            // Add a small delay before processing all choices
            if (room.allPlayersChosen()) {
                // Set status to 'finished' immediately to prevent duplicate processing
                room.status = 'finished';
                
                // Add small delay to ensure status change is registered
                await new Promise(resolve => setTimeout(resolve, 100));

                const { total, rolls, emojis } = room.rollDice();
                const result = total > 32 ? 'B' : 'K';

                let resultMessage = `🎲 Hasil Dadu:\n${emojis.join(' ')} = ${total}\n` +
                                  `Hasil: ${result === 'B' ? 'BESAR 📈' : 'KECIL 📉'}\n\n` +
                                  `Detail Permainan:\n`;

                // Process winners and losers
                for (const player of room.players) {
                    const user = await User.getUser(player.jid);
                    const isWinner = player.choice === result;
                    
                    const currentStats = user.dice || { games: 0, wins: 0, profit: 0 };
                    const statsUpdate = {
                        'dice.games': currentStats.games + 1,
                        'dice.wins': currentStats.wins + (isWinner ? 1 : 0),
                        'dice.profit': currentStats.profit + (isWinner ? 
                            Math.floor(player.bet * 1.5) : -player.bet)
                    };

                    if (isWinner) {
                        const winAmount = Math.floor(player.bet * 1.5);
                        await User.updateUser(player.jid, {
                            balance: user.balance + winAmount,
                            ...statsUpdate
                        });
                        resultMessage += `@${player.jid.split('@')[0]} 🎯\n` +
                                       `Taruhan: ${player.bet.toLocaleString()}\n` +
                                       `Menang: +${winAmount.toLocaleString()} 💰\n\n`;
                    } else {
                        await User.updateUser(player.jid, {
                            balance: user.balance - player.bet,
                            ...statsUpdate
                        });
                        resultMessage += `@${player.jid.split('@')[0]} 💔\n` +
                                       `Taruhan: ${player.bet.toLocaleString()}\n` +
                                       `Kalah: -${player.bet.toLocaleString()} 💸\n\n`;
                    }
                }

                resultMessage += `Terima kasih telah bermain! 🎮`;

                await sock.sendMessage(msg.key.remoteJid, {
                    text: resultMessage,
                    mentions: room.players.map(p => p.jid)
                });

                diceRooms.delete(msg.key.remoteJid);
            }
        }

    } catch (error) {
        console.error('Error in handle dice choice:', error);
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
                      `┖ Profit: ${user.dice.profit > 0 ? '+' : ''}${user.dice.profit.toLocaleString()}\n\n`;
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
    diceStatsHandler 
};