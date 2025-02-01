// lib/commands/slot.js

const User = require('../../database/models/User');

// Slot symbols with their respective emojis and multipliers
const SLOT_SYMBOLS = [
    { emoji: '🍓', name: 'Strawberry', multiplier: 1 },
    { emoji: '🍊', name: 'Orange', multiplier: 1 },
    { emoji: '🍇', name: 'Grape', multiplier: 1 },
    { emoji: '🍎', name: 'Apple', multiplier: 1 },
    { emoji: '💎', name: 'Diamond', multiplier: 5 }
];

const BASE_WIN_AMOUNT = 100;
const PLAY_COST = 10;

// Manages active games to prevent multiple instances
const activeGames = new Set();

function getRandomSymbol() {
    return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
}

function generateSlotResult() {
    return [
        getRandomSymbol(),
        getRandomSymbol(),
        getRandomSymbol()
    ];
}

function checkWin(slots) {
    return slots[0].emoji === slots[1].emoji && slots[1].emoji === slots[2].emoji;
}

function getWinAmount(slots) {
    if (!checkWin(slots)) return 0;
    return BASE_WIN_AMOUNT * slots[0].multiplier;
}

function generateSpinAnimation() {
    const frames = [
        '🎰 Memutar slot...\n\n⟳ | ⟳ | ⟳',
        '🎰 Memutar slot...\n\n🎲 | ⟳ | ⟳',
        '🎰 Memutar slot...\n\n🎲 | 🎲 | ⟳',
        '🎰 Memutar slot...\n\n🎲 | 🎲 | 🎲'
    ];
    return frames;
}

async function slotHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Check if user is already playing
        if (activeGames.has(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Anda sedang dalam permainan slot. Tunggu hingga selesai.',
                quoted: msg
            });
            return;
        }

        // Get user data and check balance
        const user = await User.getUser(senderJid);
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ User tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        if (user.balance < PLAY_COST) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Balance tidak cukup! Dibutuhkan ${PLAY_COST} balance untuk bermain slot.`,
                quoted: msg
            });
            return;
        }

        // Add user to active games
        activeGames.add(senderJid);

        // Deduct play cost
        await User.updateUser(senderJid, {
            balance: user.balance - PLAY_COST
        });

        // Generate and display initial spinning animation
        const spinMsg = await sock.sendMessage(msg.key.remoteJid, {
            text: generateSpinAnimation()[0],
            quoted: msg
        });

        // Generate final result
        const slots = generateSlotResult();
        const winAmount = getWinAmount(slots);
        const isWin = winAmount > 0;

        // Update user balance if won
        if (isWin) {
            await User.updateUser(senderJid, {
                balance: user.balance - PLAY_COST + winAmount
            });
        }

        // Create result message with emoji decorations
        const resultText = `
╔════════════════╗
║     🎰 SLOT 🎰     ║
╠════════════════╣
║                    ║
║   ${slots[0].emoji} | ${slots[1].emoji} | ${slots[2].emoji}   ║
║                    ║
╠════════════════╣
${isWin ? `║ 🎉 MENANG! ${winAmount} 💰 ║` : '║  😢 COBA LAGI!  ║'}
╚════════════════╝

${isWin ? 
    slots[0].emoji === '💎' ? 
    '🌟 JACKPOT! 5x BONUS! 🌟' : 
    '✨ Selamat! ✨' 
    : ''}

Biaya Main: ${PLAY_COST} balance
${isWin ? `Hadiah: ${winAmount} balance` : ''}
Balance Anda: ${user.balance - PLAY_COST + (isWin ? winAmount : 0)} balance

💡 Info:
💎💎💎 = 5x (${BASE_WIN_AMOUNT * 5} balance)
🍓/🍊/🍇/🍎 = 1x (${BASE_WIN_AMOUNT} balance)`;

        // Small delay for spinning animation
        setTimeout(async () => {
            await sock.sendMessage(msg.key.remoteJid, {
                text: resultText,
                edit: spinMsg.key
            });

            // Remove user from active games
            activeGames.delete(senderJid);
        }, 2000);

    } catch (error) {
        console.error('Error in slot game:', error);
        activeGames.delete(senderJid);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memainkan slot',
            quoted: msg
        });
    }
}

module.exports = {
    slotHandler
};