const User = require('../../database/models/User');
const config = require('../../config/owner.json');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');

// Fungsi untuk mengecek apakah pengguna adalah owner
function isOwner(jid) {
    return config.ownerNumber.includes(jid.split('@')[0]);
}

// Fungsi untuk mengkonversi durasi ke milidetik
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

// Handler untuk menambah/mengurangi balance
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

        let user = User.getUser(targetJid);
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ User tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        if (type === 'add') {
            user.balance += amount;
        } else {
            user.balance -= amount;
        }

        User.updateUser(targetJid, { balance: user.balance });

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil ${type === 'add' ? 'menambah' : 'mengurangi'} balance untuk @${targetJid.split('@')[0]} sebesar ${amount}\nBalance sekarang: ${user.balance}`,
            mentions: [targetJid],
            quoted: msg
        });

    } catch (error) {
        console.error(`Error in ${type}balance handler:`, error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

// Handler untuk menambah/mengurangi limit
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

        let user = User.getUser(targetJid);
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ User tidak ditemukan!',
                quoted: msg
            });
            return;
        }

        if (type === 'add') {
            user.limit += amount;
        } else {
            user.limit -= amount;
        }

        User.updateUser(targetJid, { limit: user.limit });

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Berhasil ${type === 'add' ? 'menambah' : 'mengurangi'} limit untuk @${targetJid.split('@')[0]} sebesar ${amount}\nLimit sekarang: ${user.limit}`,
            mentions: [targetJid],
            quoted: msg
        });

    } catch (error) {
        console.error(`Error in ${type}limit handler:`, error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

// Handler untuk menambah/menghapus premium
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

        let user = User.getUser(targetJid);
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

            User.updateUser(targetJid, {  
                status: 'premium',  
                premiumExpiry: newExpiry,  
                limit: Infinity  
            });  

            await sock.sendMessage(msg.key.remoteJid, {  
                text: `✅ Berhasil menambahkan premium untuk @${targetJid.split('@')[0]} selama ${duration}\nBerlaku sampai: ${new Date(newExpiry).toLocaleString()}`,  
                mentions: [targetJid],  
                quoted: msg  
            });  
        } else {  
            User.updateUser(targetJid, {  
                status: 'basic',  
                premiumExpiry: null,  
                limit: 25  
            });  
            await sock.sendMessage(msg.key.remoteJid, {  
                text: `✅ Berhasil menghapus premium dari @${targetJid.split('@')[0]}`,  
                mentions: [targetJid],  
                quoted: msg  
            });  
        }

    } catch (error) {
        console.error(`Error in ${type}prem handler:`, error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

// Handler untuk ban/unban pengguna
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

        let user = User.getUser(targetJid);
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

            const expiry = Date.now() + durationMs;
            User.updateUser(targetJid, {
                isBanned: true,
                banExpiry: expiry
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ Berhasil ban @${targetJid.split('@')[0]} selama ${duration}\nBerlaku sampai: ${new Date(expiry).toLocaleString()}`,
                mentions: [targetJid],
                quoted: msg
            });
        } else {
            User.updateUser(targetJid, {
                isBanned: false,
                banExpiry: null
            });
            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ Berhasil unban @${targetJid.split('@')[0]}`,
                mentions: [targetJid],
                quoted: msg
            });
        }

    } catch (error) {
        console.error(`Error in ${type} handler:`, error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

// Handler untuk mengubah foto profil bot
async function setppHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        if (!isOwner(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Command ini hanya untuk owner bot!',
                quoted: msg
            });
            return;
        }

        if (!msg.message?.imageMessage) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kirim gambar dengan caption .setpp',
                quoted: msg
            });
            return;
        }

        // Log untuk memastikan gambar diterima
        console.log('Menerima gambar untuk dijadikan foto profil...');

        const media = await downloadMediaMessage(msg, 'buffer');
        
        // Log untuk memastikan gambar berhasil diunduh
        console.log('Gambar berhasil diunduh:', media);

        await sock.updateProfilePicture(sock.user.id, media);

        // Log untuk memastikan foto profil berhasil diubah
        console.log('Foto profil berhasil diubah.');

        await sock.sendMessage(msg.key.remoteJid, {
            text: '✅ Berhasil mengubah foto profile bot',
            quoted: msg
        });

    } catch (error) {
        console.error('Error in setpp handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

module.exports = {
    balanceHandler,
    limitHandler,
    premiumHandler,
    banHandler,
    setppHandler
};