const { profileHandler } = require('../lib/commands/profile');
const { setUsernameHandler } = require('../lib/commands/username');
const { menuHandler } = require('../lib/commands/menu');
const { suitHandler, handleSuitResponse, handleSuitChoice } = require('../lib/commands/suit');
const { stickerHandler } = require('../lib/commands/sticker');
const { 
    balanceHandler, 
    limitHandler, 
    premiumHandler, 
    banHandler, 
    setppHandler 
} = require('../lib/commands/owner');
const { cekPremHandler } = require('../lib/commands/cekprem');
const { listPremHandler } = require('../lib/commands/listprem');
const { listBanHandler } = require('../lib/commands/listban');
const User = require('../database/models/User');
const { stickertextHandler } = require('../lib/commands/stickertext');
const { quoteChatHandler } = require('../lib/commands/quotechat');

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
            const user = User.getUser(senderJid);

            if (user?.isBanned) {
                if (user.banExpiry && user.banExpiry > Date.now()) {
                    await sock.sendMessage(msg.key.remoteJid, { 
                        text: `❌ Anda sedang dalam masa banned sampai ${new Date(user.banExpiry).toLocaleString()}`, 
                        quoted: msg 
                    });
                    return;
                } else {
                    User.updateUser(senderJid, { 
                        isBanned: false, 
                        banExpiry: null 
                    });
                }
            }

            // Check premium expiry
            if (user?.status === 'premium' && user.premiumExpiry) {
                if (new Date(user.premiumExpiry).getTime() < Date.now()) {
                    User.updateUser(senderJid, { 
                        status: 'basic', 
                        premiumExpiry: null, 
                        limit: 25 
                    });
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
                    case 'setpp':
                        await setppHandler(sock, msg);
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
                    default:
                        // Handle unknown commands
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: '❌ Command tidak dikenali!',
                            quoted: msg
                        });
                        break;
                }
            }

            // Handle suit responses (Y/T)
            if (body.toUpperCase() === 'Y' || body.toUpperCase() === 'T') {
                await handleSuitResponse(sock, msg);
            }

            // Handle suit choices (G/B/K)
            if (['G', 'B', 'K'].includes(body.toUpperCase())) {
                await handleSuitChoice(sock, msg);
            }

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