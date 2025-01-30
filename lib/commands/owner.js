const User = require('../../database/models/User');
const config = require('../../config/owner.json');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const logger = require('../../lib/utils/logger');
const InventoryModel = require('../../database/models/Inventory');

// Function to check if user is owner
function isOwner(jid) {
    return config.ownerNumber.includes(jid.split('@')[0]);
}

// Function to parse duration to milliseconds
function parseDuration(duration) {
    const value = parseInt(duration);
    const unit = duration.replace(/[0-9]/g, '').toLowerCase();

    switch (unit) {
        case 'day':
        case 'days':
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        case 'hour':
        case 'hours':
        case 'h':
            return value * 60 * 60 * 1000;
        default:
            return null;
    }
}

// Handler for adding/reducing balance
async function balanceHandler(sock, msg, type) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        if (!isOwner(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Command ini hanya untuk owner bot!',
                quoted: msg
            });
            return;
        }

        const body = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text || '';
        const args = body.split(' ');

        if (args.length < 3) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Format salah! Gunakan: .${type}balance @mention/number jumlah`,
                quoted: msg
            });
            return;
        }

        let targetJid;
        const amount = parseInt(args[2]);

        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else {
            const number = args[1].replace(/[^0-9]/g, '');
            targetJid = number + '@s.whatsapp.net';
        }

        const user = await User.getUser(targetJid);
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ User tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        const newBalance = type === 'add' ? user.balance + amount : user.balance - amount;
        const updatedUser = await User.updateUser(targetJid, { balance: newBalance });

        if (!updatedUser) {
            throw new Error('Failed to update user balance');
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil ${type === 'add' ? 'menambah' : 'mengurangi'} balance untuk @${targetJid.split('@')[0]} sebesar ${amount}\nBalance sekarang: ${newBalance}`,
            mentions: [targetJid],
            quoted: msg
        });

    } catch (error) {
        logger.error(`Error in ${type}balance handler:`, error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

// Handler for adding/reducing limit
async function limitHandler(sock, msg, type) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        if (!isOwner(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Command ini hanya untuk owner bot!',
                quoted: msg
            });
            return;
        }

        const body = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text || '';
        const args = body.split(' ');

        if (args.length < 3) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Format salah! Gunakan: .${type}limit @mention/number jumlah`,
                quoted: msg
            });
            return;
        }

        let targetJid;
        const amount = parseInt(args[2]);

        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else {
            const number = args[1].replace(/[^0-9]/g, '');
            targetJid = number + '@s.whatsapp.net';
        }

        const user = await User.getUser(targetJid);
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ User tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        const newLimit = type === 'add' ? user.limit + amount : user.limit - amount;
        const updatedUser = await User.updateUser(targetJid, { limit: newLimit });

        if (!updatedUser) {
            throw new Error('Failed to update user limit');
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil ${type === 'add' ? 'menambah' : 'mengurangi'} limit untuk @${targetJid.split('@')[0]} sebesar ${amount}\nLimit sekarang: ${newLimit}`,
            mentions: [targetJid],
            quoted: msg
        });

    } catch (error) {
        logger.error(`Error in ${type}limit handler:`, error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

// Handler for adding/removing premium
async function premiumHandler(sock, msg, type) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        if (!isOwner(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Command ini hanya untuk owner bot!',
                quoted: msg
            });
            return;
        }

        const body = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || '';
        const args = body.split(' ');

        if (args.length < 3) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Format salah! Gunakan: .${type}prem @mention/number durasi(day/hour)`,
                quoted: msg
            });
            return;
        }

        let targetJid;
        const duration = args[2];

        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else {
            const number = args[1].replace(/[^0-9]/g, '');
            targetJid = number + '@s.whatsapp.net';
        }

        const durationMs = parseDuration(duration);
        if (!durationMs) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format durasi salah! Gunakan: 1day, 2days, 1hour, 2hours',
                quoted: msg
            });
            return;
        }

        const user = await User.getUser(targetJid);
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ User tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        if (type === 'add') {
            const now = Date.now();
            const currentExpiry = user.premiumExpiry ? new Date(user.premiumExpiry).getTime() : now;
            const newExpiry = currentExpiry > now ? currentExpiry + durationMs : now + durationMs;

            const updatedUser = await User.updateUser(targetJid, {
                status: 'premium',
                premiumExpiry: new Date(newExpiry),
                limit: Infinity
            });

            if (!updatedUser) {
                throw new Error('Failed to update user premium status');
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ Berhasil menambahkan premium untuk @${targetJid.split('@')[0]} selama ${duration}\nBerlaku sampai: ${new Date(newExpiry).toLocaleString()}`,
                mentions: [targetJid],
                quoted: msg
            });
        } else {
            const updatedUser = await User.updateUser(targetJid, {
                status: 'basic',
                premiumExpiry: null,
                limit: 25
            });

            if (!updatedUser) {
                throw new Error('Failed to update user premium status');
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ Berhasil menghapus premium dari @${targetJid.split('@')[0]}`,
                mentions: [targetJid],
                quoted: msg
            });
        }

    } catch (error) {
        logger.error(`Error in ${type}prem handler:`, error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

// Handler for banning/unbanning users
async function banHandler(sock, msg, type) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        if (!isOwner(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Command ini hanya untuk owner bot!',
                quoted: msg
            });
            return;
        }

        const body = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text || '';
        const args = body.split(' ');

        if (type === 'ban' && args.length < 3) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan: .ban @mention/number durasi(day/hour)',
                quoted: msg
            });
            return;
        }

        let targetJid;

        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else {
            const number = args[1].replace(/[^0-9]/g, '');
            targetJid = number + '@s.whatsapp.net';
        }

        const user = await User.getUser(targetJid);
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ User tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        if (type === 'ban') {
            const duration = args[2];
            const durationMs = parseDuration(duration);
            if (!durationMs) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Format durasi salah! Gunakan: 1day, 2days, 1hour, 2hours',
                    quoted: msg
                });
                return;
            }

            const expiry = new Date(Date.now() + durationMs);
            const updatedUser = await User.updateUser(targetJid, {
                isBanned: true,
                banExpiry: expiry
            });

            if (!updatedUser) {
                throw new Error('Failed to update user ban status');
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ Berhasil ban @${targetJid.split('@')[0]} selama ${duration}\nBerlaku sampai: ${expiry.toLocaleString()}`,
                mentions: [targetJid],
                quoted: msg
            });
        } else {
            const updatedUser = await User.updateUser(targetJid, {
                isBanned: false,
                banExpiry: null
            });

            if (!updatedUser) {
                throw new Error('Failed to update user ban status');
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ Berhasil unban @${targetJid.split('@')[0]}`,
                mentions: [targetJid],
                quoted: msg
            });
        }

    } catch (error) {
        logger.error(`Error in ${type} handler:`, error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

async function addCdCryptoHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Fix the isOwner check
        if (!isOwner(senderJid)) { // Changed from if (!isOwner)
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Command ini hanya untuk owner!',
                quoted: msg
            });
            return;
        }

        // Get target user
        let targetJid;
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else {
            const body = msg.message?.conversation || 
                        msg.message?.extendedTextMessage?.text || '';
            const number = body.split(' ')[1]?.replace(/[^0-9]/g, '');
            if (number) {
                targetJid = number + '@s.whatsapp.net';
            }
        }

        if (!targetJid) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tag user atau masukkan nomor yang akan diberi boost!\nContoh: .addcdcrypto @user atau .addcdcrypto 628xxx',
                quoted: msg
            });
            return;
        }

        // Get or create inventory
        let inventory = await InventoryModel.findOne({ userId: targetJid });
        if (!inventory) {
            inventory = await InventoryModel.create({
                userId: targetJid,
                boosts: []
            });
        }

        // Add cdcrypto boost
        inventory.boosts.push({
            id: 'cdcrypto_' + Date.now(),
            name: 'Mining Cooldown Reset',
            type: 'cdcrypto',
            multiplier: 1,
            duration: 0, // instant use
            quantity: 1
        });

        await inventory.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: '✅ Berhasil memberikan Mining Cooldown Reset boost!',
            quoted: msg
        });

    } catch (error) {
        console.error('Error in addcdcrypto handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menambahkan boost',
            quoted: msg
        });
    }
}

module.exports = {
    balanceHandler,
    limitHandler,
    premiumHandler,
    banHandler,
    addCdCryptoHandler
};