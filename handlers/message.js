const { profileHandler } = require('../lib/commands/profile');
const { setUsernameHandler } = require('../lib/commands/username');
const { menuHandler } = require('../lib/commands/menu');
const { suitHandler, handleSuitResponse, handleSuitChoice } = require('../lib/commands/suit');
const { stickerHandler } = require('../lib/commands/sticker');
const { cekPremHandler } = require('../lib/commands/cekprem');
const { listPremHandler } = require('../lib/commands/listprem');
const { listBanHandler } = require('../lib/commands/listban');
const User = require('../database/models/User');
const { stickertextHandler } = require('../lib/commands/stickertext');
const { quoteChatHandler } = require('../lib/commands/quotechat');
const { mathHandler, handleMathAnswer, hasMathGame } = require('../lib/commands/math');
const { confessHandler, handleConfessReply } = require('../lib/commands/confess');
const { tiktokHandler } = require('../lib/commands/tiktok');
const { tictactoeHandler, handleTicTacToeMove } = require('../lib/commands/tictactoe');
const { topGlobalHandler } = require('../lib/commands/topglobal');
const { addHandler, kickHandler } = require('../lib/commands/group');
const { seaHandler } = require('../lib/commands/sea');
const { setApikeyHandler } = require('../lib/commands/setapikey');
const { susunKataHandler,
    handleSusunKataAnswer, 
    gameState, 
    leaderboardSusunHandler 
} = require('../lib/commands/susunkata');
const { cryptoHandler,
    mineHandler,
    buyRamHandler
} = require('../lib/commands/crypto');
const { marketHandler,
    sellCryptoHandler
} = require('../lib/commands/market');
const { diceHandler,
    joinDiceHandler,
    startDiceHandler,
    handleDiceChoice,
    diceStatsHandler  
 } = require('../lib/commands/dice');
const { inventoryHandler, useBoostHandler } = require('../lib/commands/inventory');
const { transferHandler } = require('../lib/commands/transfer');

async function handleMessages(sock) {
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (msg.key.fromMe) return;

            const body = msg.message?.conversation || 
             msg.message?.extendedTextMessage?.text || 
             msg.message?.imageMessage?.caption || 
             msg.message?.videoMessage?.caption ||
             msg.message?.viewOnceMessage?.message?.imageMessage?.caption ||
             msg.message?.viewOnceMessage?.message?.videoMessage?.caption || '';

            // Reset daily limits
            User.resetDailyLimits();

            // Check if user is banned
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const user = await User.getUser(senderJid);

            if (user?.isBanned) {
                if (user.banExpiry && user.banExpiry > Date.now()) {
                    await sock.sendMessage(msg.key.remoteJid, { 
                        text: `❌ Anda sedang dalam masa banned sampai ${new Date(user.banExpiry).toLocaleString()}`, 
                        quoted: msg 
                    });
                    return;
                } else {
                    await User.updateUser(senderJid, { 
                        isBanned: false, 
                        banExpiry: null 
                    });
                }
            }

            // Check premium expiry
            if (user?.status === 'premium' && user.premiumExpiry) {
                const now = new Date();
                const expiry = new Date(user.premiumExpiry);
                
                if (expiry < now) {
                    try {
                        const updated = await User.updateUser(senderJid, { 
                            status: 'basic', 
                            premiumExpiry: null, 
                            limit: 25 
                        });
                        
                        if (updated) {
                            await sock.sendMessage(msg.key.remoteJid, { 
                                text: '⚠️ Status premium Anda telah berakhir. Status diubah menjadi basic.',
                                quoted: msg 
                            });
                        }
                    } catch (error) {
                        console.error('Error updating expired premium status:', error);
                    }
                }
            }

            // Handle commands
            if (body.startsWith('.')) {
                const command = body.slice(1).split(' ')[0];

                switch (command) {
                    case 'profile':
                        await profileHandler(sock, msg);
                        break;
                    case 'setusername':
                        await setUsernameHandler(sock, msg);
                        break;
                    case 'menu':
                        await menuHandler(sock, msg);
                        break;
                    case 'suit':
                        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                        if (mentionedJid.length === 0) {
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: '❌ Tag lawan untuk memulai suit! Contoh: .suit @mention',
                                quoted: msg
                            });
                            return;
                        }
                        await suitHandler(sock, msg, mentionedJid);
                        break;
                    case 'addbalance':
                        await balanceHandler(sock, msg, 'add');
                        break;
                    case 'delbalance':
                        await balanceHandler(sock, msg, 'del');
                        break;
                    case 'addlimit':
                        await limitHandler(sock, msg, 'add');
                        break;
                    case 'dellimit':
                        await limitHandler(sock, msg, 'del');
                        break;
                    case 'addprem':
                        await premiumHandler(sock, msg, 'add');
                        break;
                    case 'delprem':
                        await premiumHandler(sock, msg, 'del');
                        break;
                    case 'ban':
                        await banHandler(sock, msg, 'ban');
                        break;
                    case 'unban':
                        await banHandler(sock, msg, 'unban');
                        break;
                    case 'cekprem':
                        await cekPremHandler(sock, msg);
                        break;
                    case 'listprem':
                        await listPremHandler(sock, msg);
                        break;
                    case 'listban':
                        await listBanHandler(sock, msg);
                        break;
                    case 'sticker':
                    case 's':
                        await stickerHandler(sock, msg);
                        break;
                    case 'st':
                        await stickertextHandler(sock, msg);
                        break;
                    case 'qc':
                        await quoteChatHandler(sock, msg);
                        break;
                    case 'math':
                        await mathHandler(sock, msg);
                        break;
                    case 'confess':
                        await confessHandler(sock, msg);
                        break;
                    case 'ttnowm':
                        await tiktokHandler(sock, msg);
                        break;
                    case 'ttt':
                        await tictactoeHandler(sock, msg);
                        break;
                    case 'topglobal':
                        await topGlobalHandler(sock, msg);
                        break;
                    case 'add':
                        await addHandler(sock, msg);
                        break;
                    case 'kick':
                        await kickHandler(sock, msg);
                        break;
                    case 'sea':
                        await seaHandler(sock, msg);
                        break;
                    case 'setapikey':
                        await setApikeyHandler(sock, msg);
                        break;
                    case 'susunkata':
                        await susunKataHandler(sock, msg);
                        break;
                    case 'lbsusun':
                        await leaderboardSusunHandler(sock, msg);
                        break;
                    case 'dice':
                        await diceHandler(sock, msg);
                        break;
                    case 'joindice':
                        await joinDiceHandler(sock, msg);
                        break;
                    case 'startdice':
                        await startDiceHandler(sock, msg);
                        break;
                    case 'dicestats':
                        await diceStatsHandler(sock, msg);
                        break;
                    case 'inventory':
                        await inventoryHandler(sock, msg);
                        break;
                    case 'crypto':
                        await cryptoHandler(sock, msg);
                        break;
                    case 'mine':
                        await mineHandler(sock, msg);
                        break;
                    case 'buyram':
                        await buyRamHandler(sock, msg);
                        break;
                    case 'market':
                        await marketHandler(sock, msg);
                        break;
                    case 'sellcrypto':
                        await sellCryptoHandler(sock, msg);
                        break;
                    case 'addcdcrypto':
                        await addCdCryptoHandler(sock, msg);
                        break;
                    case 'use':
                        await useBoostHandler(sock, msg);
                        break;
                    case 'tf':
                        await transferHandler(sock, msg);
                        break;
                    case 'boostinfo':
                        const infoNumber = parseInt(body.split(' ')[1]);
                        if (isNaN(infoNumber)) {
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: '❌ Silakan masukkan nomor boost yang ingin dilihat. Contoh: .boostinfo 1',
                                quoted: msg
                            });
                            return;
                        }
                        await boostInfoHandler(sock, msg, infoNumber);
                        break;
                    default:
                        // Handle unknown commands
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: '❌ Command tidak dikenali!',
                            quoted: msg
                        });
                        break;
                }
            }

            // Handle game moves
            const moveNumber = parseInt(body);
            if (!isNaN(moveNumber) && moveNumber >= 1 && moveNumber <= 9) {
                await handleTicTacToeMove(sock, msg);
            }

            // Handle dice choices (K/B)
            if (['K', 'B'].includes(body.toUpperCase())) {
                await handleDiceChoice(sock, msg);
            }

            // Handle susun kata answers
            if (gameState[msg.key.remoteJid]?.isActive) {
                await handleSusunKataAnswer(sock, msg);
            }

            // Handle suit responses (Y/T)
            if (body.toUpperCase() === 'Y' || body.toUpperCase() === 'T') {
                await handleSuitResponse(sock, msg);
            }

            // Handle suit choices (G/B/K)
            if (['G', 'B', 'K'].includes(body.toUpperCase())) {
                await handleSuitChoice(sock, msg);
            }

            // Handle math game answers
            if (!isNaN(body) && hasMathGame(msg.key.remoteJid)) {
                await handleMathAnswer(sock, msg);
            }

            // Handle confess replies
            await handleConfessReply(sock, msg);

        } catch (error) {
            console.error('Error handling message:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Terjadi kesalahan saat memproses command',
                quoted: msg
            });
        }
    });
}

module.exports = { handleMessages };