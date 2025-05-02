// domino.js - Domino game implementation for WhatsApp bot

const fs = require('fs');
const path = require('path');
const { MessageType } = require('@whiskeysockets/baileys');
const User = require("../../database/models/User");
const { detectDominoFromSticker, findMatchingCardInHand } = require("./domino-sticker");

// Game state storage
const dominoGames = {};

// Constants
const ROOM_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
const GAME_MAX_PLAYERS = 4;
const GAME_MIN_PLAYERS = 2;
const CARDS_PER_PLAYER = 7;

// Full domino set (0-6 values)
const generateDominoSet = () => {
    const cards = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            cards.push({ left: i, right: j });
        }
    }
    return cards;
};

// Utility functions
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// Create a new domino room
const dominoHandler = async (sock, msg) => {
    try {
        const groupJid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Check if group chat
        if (!groupJid.endsWith('@g.us')) {
            await sock.sendMessage(groupJid, {
                text: '❌ Command ini hanya dapat digunakan di grup.',
                quoted: msg,
            });
            return;
        }

        // Check if room already exists
        if (dominoGames[groupJid]) {
            await sock.sendMessage(groupJid, {
                text: '❌ Sudah ada permainan domino yang sedang berlangsung di grup ini.',
                quoted: msg,
            });
            return;
        }

        // Check user limits
        const user = await User.getUser(senderJid);
        if (user.limit <= 0) {
            await sock.sendMessage(groupJid, {
                text: '❌ Limit harian kamu habis. Silakan tunggu hingga besok atau upgrade ke premium.',
                quoted: msg,
            });
            return;
        }

        // Create a new game room
        dominoGames[groupJid] = {
            creator: senderJid,
            players: [{ jid: senderJid, cards: [] }],
            deck: [],
            playedCards: [],
            boardEnds: { left: null, right: null },
            currentPlayerIndex: 0,
            isStarted: false,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            timerId: null
        };

        // Set room expiry timer
        dominoGames[groupJid].timerId = setTimeout(() => {
            if (dominoGames[groupJid] && !dominoGames[groupJid].isStarted) {
                sock.sendMessage(groupJid, {
                    text: '⏰ Room domino telah kadaluarsa karena tidak ada aktivitas.',
                });
                delete dominoGames[groupJid];
            }
        }, ROOM_EXPIRY_TIME);

        // Deduct user limit
        await User.updateUser(senderJid, { limit: user.limit - 1 });

        // Get username
        const username = user.username || senderJid.split('@')[0];

        // Send confirmation
        await sock.sendMessage(groupJid, {
            text: `🎮 Room domino berhasil dibuat oleh ${username}!\n\nGunakan .joindom untuk bergabung\nJumlah player saat ini: 1/${GAME_MAX_PLAYERS}`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in dominoHandler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat membuat room domino.',
            quoted: msg,
        });
    }
};

// Join a domino room
const joinDomHandler = async (sock, msg) => {
    try {
        const groupJid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Check if group chat
        if (!groupJid.endsWith('@g.us')) {
            await sock.sendMessage(groupJid, {
                text: '❌ Command ini hanya dapat digunakan di grup.',
                quoted: msg,
            });
            return;
        }

        // Check if room exists
        if (!dominoGames[groupJid]) {
            await sock.sendMessage(groupJid, {
                text: '❌ Tidak ada room domino yang aktif. Buat room dengan .domino',
                quoted: msg,
            });
            return;
        }

        // Check if game already started
        if (dominoGames[groupJid].isStarted) {
            await sock.sendMessage(groupJid, {
                text: '❌ Permainan sudah dimulai. Tunggu hingga permainan selesai.',
                quoted: msg,
            });
            return;
        }

        // Check if player already joined
        const isPlayerJoined = dominoGames[groupJid].players.some(player => player.jid === senderJid);
        if (isPlayerJoined) {
            await sock.sendMessage(groupJid, {
                text: '❌ Kamu sudah bergabung dalam permainan ini.',
                quoted: msg,
            });
            return;
        }

        // Check if room is full
        if (dominoGames[groupJid].players.length >= GAME_MAX_PLAYERS) {
            await sock.sendMessage(groupJid, {
                text: '❌ Room sudah penuh. Maksimal 4 pemain.',
                quoted: msg,
            });
            return;
        }

        // Check user limits
        const user = await User.getUser(senderJid);
        if (user.limit <= 0) {
            await sock.sendMessage(groupJid, {
                text: '❌ Limit harian kamu habis. Silakan tunggu hingga besok atau upgrade ke premium.',
                quoted: msg,
            });
            return;
        }

        // Add player to the game
        dominoGames[groupJid].players.push({ jid: senderJid, cards: [] });
        dominoGames[groupJid].lastActivity = Date.now();

        // Deduct user limit
        await User.updateUser(senderJid, { limit: user.limit - 1 });

        // Get username
        const username = user.username || senderJid.split('@')[0];

        // Send confirmation
        await sock.sendMessage(groupJid, {
            text: `👋 ${username} bergabung dalam permainan domino!\n\nJumlah player saat ini: ${dominoGames[groupJid].players.length}/${GAME_MAX_PLAYERS}\n\nGunakan .startdom untuk memulai permainan.`,
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in joinDomHandler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat bergabung ke room domino.',
            quoted: msg,
        });
    }
};

// Start the domino game
const startDomHandler = async (sock, msg) => {
    try {
        const groupJid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Check if group chat
        if (!groupJid.endsWith('@g.us')) {
            await sock.sendMessage(groupJid, {
                text: '❌ Command ini hanya dapat digunakan di grup.',
                quoted: msg,
            });
            return;
        }

        // Check if room exists
        if (!dominoGames[groupJid]) {
            await sock.sendMessage(groupJid, {
                text: '❌ Tidak ada room domino yang aktif. Buat room dengan .domino',
                quoted: msg,
            });
            return;
        }

        // Check if sender is the creator
        if (dominoGames[groupJid].creator !== senderJid) {
            await sock.sendMessage(groupJid, {
                text: '❌ Hanya pembuat room yang dapat memulai permainan.',
                quoted: msg,
            });
            return;
        }

        // Check if game already started
        if (dominoGames[groupJid].isStarted) {
            await sock.sendMessage(groupJid, {
                text: '❌ Permainan sudah dimulai.',
                quoted: msg,
            });
            return;
        }

        // Check for minimum players
        if (dominoGames[groupJid].players.length < GAME_MIN_PLAYERS) {
            await sock.sendMessage(groupJid, {
                text: `❌ Minimal ${GAME_MIN_PLAYERS} pemain untuk memulai permainan domino.`,
                quoted: msg,
            });
            return;
        }

        // Generate and shuffle domino deck
        const deck = shuffleArray(generateDominoSet());
        dominoGames[groupJid].deck = deck;

        // Deal cards to players
        for (let i = 0; i < dominoGames[groupJid].players.length; i++) {
            const playerCards = [];
            for (let j = 0; j < CARDS_PER_PLAYER; j++) {
                if (dominoGames[groupJid].deck.length > 0) {
                    playerCards.push(dominoGames[groupJid].deck.pop());
                }
            }
            dominoGames[groupJid].players[i].cards = playerCards;
        }

        // Mark game as started and update timestamp
        dominoGames[groupJid].isStarted = true;
        dominoGames[groupJid].lastActivity = Date.now();

        // Clear room expiry timer
        if (dominoGames[groupJid].timerId) {
            clearTimeout(dominoGames[groupJid].timerId);
        }

        // Send private messages to players with their cards
        const playersInfo = [];
        for (const player of dominoGames[groupJid].players) {
            try {
                const user = await User.getUser(player.jid);
                const username = user.username || player.jid.split('@')[0];
                playersInfo.push(username);

                // Send cards to player in private chat
                const cardsMessage = `🎮 *KARTU DOMINO KAMU*\n\n${player.cards.map((card, index) =>
                    `${index + 1}. ${card.left} | ${card.right}`).join('\n')}\n\nGunakan sticker domino saat giliranmu.`;

                await sock.sendMessage(player.jid, {
                    text: cardsMessage
                });
            } catch (error) {
                console.error(`Error sending cards to player ${player.jid}:`, error);
            }
        }

        // Get first player
        const currentPlayer = dominoGames[groupJid].players[0];
        const user = await User.getUser(currentPlayer.jid);
        const username = user.username || currentPlayer.jid.split('@')[0];

        // Send game start notification in group
        await sock.sendMessage(groupJid, {
            text: `🎲 *PERMAINAN DOMINO DIMULAI!*\n\nPemain: ${playersInfo.join(', ')}\nSisa kartu di deck: ${dominoGames[groupJid].deck.length}\n\nKartu telah dikirim ke masing-masing pemain di private chat.\n\nGiliran: @${currentPlayer.jid.split('@')[0]}`,
            mentions: [currentPlayer.jid],
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in startDomHandler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memulai permainan domino.',
            quoted: msg,
        });
    }
};

// Handle domino pass (skip turn)
const domPassHandler = async (sock, msg) => {
    try {
        const groupJid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Check if group chat
        if (!groupJid.endsWith('@g.us')) {
            await sock.sendMessage(groupJid, {
                text: '❌ Command ini hanya dapat digunakan di grup.',
                quoted: msg,
            });
            return;
        }

        // Check if game exists and is started
        if (!dominoGames[groupJid] || !dominoGames[groupJid].isStarted) {
            await sock.sendMessage(groupJid, {
                text: '❌ Tidak ada permainan domino yang sedang berlangsung.',
                quoted: msg,
            });
            return;
        }

        // Check if it's the player's turn
        const currentPlayerIndex = dominoGames[groupJid].currentPlayerIndex;
        const currentPlayer = dominoGames[groupJid].players[currentPlayerIndex];

        if (currentPlayer.jid !== senderJid) {
            await sock.sendMessage(groupJid, {
                text: '❌ Bukan giliranmu untuk bermain.',
                quoted: msg,
            });
            return;
        }

        // Check if the deck is empty (only then can pass)
        if (dominoGames[groupJid].deck.length > 0) {
            await sock.sendMessage(groupJid, {
                text: '❌ Kamu tidak bisa melewati giliran jika masih ada kartu di deck. Gunakan .dom untuk mengambil kartu.',
                quoted: msg,
            });
            return;
        }

        // Move to next player
        dominoGames[groupJid].currentPlayerIndex = (currentPlayerIndex + 1) % dominoGames[groupJid].players.length;
        const nextPlayer = dominoGames[groupJid].players[dominoGames[groupJid].currentPlayerIndex];

        // Update last activity
        dominoGames[groupJid].lastActivity = Date.now();

        // Get usernames
        const currentUser = await User.getUser(currentPlayer.jid);
        const currentUsername = currentUser.username || currentPlayer.jid.split('@')[0];

        const nextUser = await User.getUser(nextPlayer.jid);
        const nextUsername = nextUser.username || nextPlayer.jid.split('@')[0];

        // Get board status
        let boardStatus = '🎮 *PAPAN DOMINO*\n\n';
        if (dominoGames[groupJid].playedCards.length === 0) {
            boardStatus += 'Belum ada kartu yang dimainkan.';
        } else {
            // Show ends of the board
            const { left, right } = dominoGames[groupJid].boardEnds;
            boardStatus += `(kiri) ${left} ... ${right} (kanan)`;
        }

        // Send notification
        await sock.sendMessage(groupJid, {
            text: `🚶 ${currentUsername} melewati giliran.\n\n${boardStatus}\n\nSisa kartu di deck: ${dominoGames[groupJid].deck.length}\n\nSekarang giliran: @${nextPlayer.jid.split('@')[0]}`,
            mentions: [nextPlayer.jid],
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in domPassHandler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat melewati giliran.',
            quoted: msg,
        });
    }
};

// Handle drawing a card
const domHandler = async (sock, msg) => {
    try {
        const groupJid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Check if group chat
        if (!groupJid.endsWith('@g.us')) {
            await sock.sendMessage(groupJid, {
                text: '❌ Command ini hanya dapat digunakan di grup.',
                quoted: msg,
            });
            return;
        }

        // Check if game exists and is started
        if (!dominoGames[groupJid] || !dominoGames[groupJid].isStarted) {
            await sock.sendMessage(groupJid, {
                text: '❌ Tidak ada permainan domino yang sedang berlangsung.',
                quoted: msg,
            });
            return;
        }

        // Check if it's the player's turn
        const currentPlayerIndex = dominoGames[groupJid].currentPlayerIndex;
        const currentPlayer = dominoGames[groupJid].players[currentPlayerIndex];

        if (currentPlayer.jid !== senderJid) {
            await sock.sendMessage(groupJid, {
                text: '❌ Bukan giliranmu untuk bermain.',
                quoted: msg,
            });
            return;
        }

        // Check if there are cards left in the deck
        if (dominoGames[groupJid].deck.length === 0) {
            await sock.sendMessage(groupJid, {
                text: '❌ Tidak ada lagi kartu di deck. Gunakan .dompass untuk melewati giliran.',
                quoted: msg,
            });
            return;
        }

        // Draw a card from the deck
        const drawnCard = dominoGames[groupJid].deck.pop();
        currentPlayer.cards.push(drawnCard);

        // Update last activity
        dominoGames[groupJid].lastActivity = Date.now();

        // Send card to player in private chat
        const cardsMessage = `🎮 *KARTU DOMINO KAMU*\n\nKamu mendapatkan kartu baru: ${drawnCard.left} | ${drawnCard.right}\n\nSekarang kamu memiliki kartu:\n${currentPlayer.cards.map((card, index) =>
            `${index + 1}. ${card.left} | ${card.right}`).join('\n')}\n\nGunakan sticker domino saat giliranmu.`;

        await sock.sendMessage(currentPlayer.jid, {
            text: cardsMessage
        });

        // Get username
        const user = await User.getUser(currentPlayer.jid);
        const username = user.username || currentPlayer.jid.split('@')[0];

        // Send notification to group
        await sock.sendMessage(groupJid, {
            text: `🃏 ${username} mengambil kartu dari deck.\nSisa kartu di deck: ${dominoGames[groupJid].deck.length}\n\nGiliran masih: @${currentPlayer.jid.split('@')[0]}`,
            mentions: [currentPlayer.jid],
            quoted: msg,
        });
    } catch (error) {
        console.error("Error in domHandler:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengambil kartu.',
            quoted: msg,
        });
    }
};

// Process a played domino card (using sticker)
const processPlayedCard = async (sock, msg) => {
    try {
        // Only process if it has a sticker
        if (!msg.message || !msg.message.stickerMessage) {
            return false;
        }

        const groupJid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Check if in a group
        if (!groupJid.endsWith('@g.us')) {
            return false;
        }

        // Check if game exists and is started
        if (!dominoGames[groupJid] || !dominoGames[groupJid].isStarted) {
            return false;
        }

        // Check if it's the player's turn
        const currentPlayerIndex = dominoGames[groupJid].currentPlayerIndex;
        const currentPlayer = dominoGames[groupJid].players[currentPlayerIndex];

        if (currentPlayer.jid !== senderJid) {
            await sock.sendMessage(groupJid, {
                text: '❌ Bukan giliranmu untuk bermain.',
                quoted: msg,
            });
            return true; // We've handled this sticker
        }

        // Import sticker detection module
        const { detectDominoFromSticker, findMatchingCardInHand } = require("../lib/domino-sticker");

        // Detect domino values from sticker
        const detectedCard = await detectDominoFromSticker(msg);
        if (!detectedCard) {
            // Not a domino sticker or unrecognized
            return false;
        }

        // Find matching card in player's hand
        const { found, index, card } = findMatchingCardInHand(currentPlayer.cards, detectedCard);

        if (!found) {
            await sock.sendMessage(groupJid, {
                text: `❌ Kamu tidak memiliki kartu ${detectedCard.left}|${detectedCard.right} di tanganmu.`,
                quoted: msg,
            });
            return true;
        }

        // Use the matched card
        const playedCard = card;

        // Check if this is the first card played
        if (dominoGames[groupJid].playedCards.length === 0) {
            // First card can be any card
            dominoGames[groupJid].playedCards.push(playedCard);
            dominoGames[groupJid].boardEnds = {
                left: playedCard.left,
                right: playedCard.right
            };

            // Remove card from player's hand
            currentPlayer.cards = currentPlayer.cards.filter((card, index) => index !== 0);
        } else {
            // Check if card can be played on either end
            const { left, right } = dominoGames[groupJid].boardEnds;
            let canPlay = false;
            let playedEnd = '';

            if (playedCard.left === left) {
                canPlay = true;
                playedEnd = 'left';
                dominoGames[groupJid].boardEnds.left = playedCard.right;
            } else if (playedCard.right === left) {
                canPlay = true;
                playedEnd = 'left';
                dominoGames[groupJid].boardEnds.left = playedCard.left;
            } else if (playedCard.left === right) {
                canPlay = true;
                playedEnd = 'right';
                dominoGames[groupJid].boardEnds.right = playedCard.right;
            } else if (playedCard.right === right) {
                canPlay = true;
                playedEnd = 'right';
                dominoGames[groupJid].boardEnds.right = playedCard.left;
            }

            if (!canPlay) {
                await sock.sendMessage(groupJid, {
                    text: '❌ Kartu tidak bisa dimainkan. Coba kartu lain, gunakan .dom untuk mengambil kartu, atau .dompass untuk melewati giliran.',
                    quoted: msg,
                });
                return true;
            }

            // Add card to played cards
            dominoGames[groupJid].playedCards.push({ ...playedCard, playedOn: playedEnd });

            // Remove card from player's hand
            currentPlayer.cards = currentPlayer.cards.filter((card, index) => index !== 0);
        }

        // Update last activity
        dominoGames[groupJid].lastActivity = Date.now();

        // Check if player has won
        if (currentPlayer.cards.length === 0) {
            // Get username
            const user = await User.getUser(currentPlayer.jid);
            const username = user.username || currentPlayer.jid.split('@')[0];

            // Award bonus to winner
            await User.updateUser(currentPlayer.jid, {
                balance: user.balance + 500  // Give 500 balance as reward
            });

            // Send win notification
            await sock.sendMessage(groupJid, {
                text: `🏆 *PERMAINAN SELESAI!*\n\n@${currentPlayer.jid.split('@')[0]} memenangkan permainan domino!\nHadiah: 500 balance\n\nTerima kasih telah bermain!`,
                mentions: [currentPlayer.jid],
                quoted: msg,
            });

            // Delete the game
            delete dominoGames[groupJid];
            return true;
        }

        // Move to next player
        dominoGames[groupJid].currentPlayerIndex = (currentPlayerIndex + 1) % dominoGames[groupJid].players.length;
        const nextPlayer = dominoGames[groupJid].players[dominoGames[groupJid].currentPlayerIndex];

        // Get usernames
        const currentUser = await User.getUser(currentPlayer.jid);
        const currentUsername = currentUser.username || currentPlayer.jid.split('@')[0];

        const nextUser = await User.getUser(nextPlayer.jid);
        const nextUsername = nextUser.username || nextPlayer.jid.split('@')[0];

        // Send notification
        await sock.sendMessage(groupJid, {
            text: `🎮 Kartu terdeteksi: ${playedCard.left} | ${playedCard.right}\n\nPapan:\n(kiri) ${dominoGames[groupJid].boardEnds.left} ... ${dominoGames[groupJid].boardEnds.right} (kanan)\n\nSisa kartu ${currentUsername}: ${currentPlayer.cards.length}\nSisa kartu di deck: ${dominoGames[groupJid].deck.length}\n\nSekarang giliran: @${nextPlayer.jid.split('@')[0]}`,
            mentions: [nextPlayer.jid],
            quoted: msg,
        });

        return true;
    } catch (error) {
        console.error("Error in processPlayedCard:", error);
        if (msg.key && msg.key.remoteJid) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Terjadi kesalahan saat memproses kartu domino.',
                quoted: msg,
            });
        }
        return true;
    }
};

// Clean up expired games (call this periodically)
const cleanupExpiredGames = async (sock) => {
    const now = Date.now();
    const GAME_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

    for (const [groupJid, game] of Object.entries(dominoGames)) {
        if (now - game.lastActivity > GAME_EXPIRY_TIME) {
            try {
                await sock.sendMessage(groupJid, {
                    text: '⏰ Permainan domino telah dihentikan karena tidak ada aktivitas dalam 30 menit.',
                });
            } catch (error) {
                console.error(`Error sending timeout message to ${groupJid}:`, error);
            }

            delete dominoGames[groupJid];
        }
    }
};

module.exports = {
    dominoHandler,
    joinDomHandler,
    startDomHandler,
    domPassHandler,
    domHandler,
    processPlayedCard,
    cleanupExpiredGames
};