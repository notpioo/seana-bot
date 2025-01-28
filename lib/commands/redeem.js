// commands/redeem.js
const User = require('../../database/models/User');
const Redeem = require('../../database/models/Redeem');
const config = require('../../config/owner.json');

async function createRedeemHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Check if sender is owner
        if (!config.ownerNumber.includes(senderJid.split('@')[0])) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Command ini hanya untuk owner bot!',
                quoted: msg
            });
            return;
        }

        const template = Redeem.getTemplate();
        await sock.sendMessage(msg.key.remoteJid, {
            text: '📝 Template Create Redeem:\n\n' + template,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in createredeem handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

async function handleCreateRedeem(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Check if sender is owner
        if (!config.ownerNumber.includes(senderJid.split('@')[0])) {
            return;
        }

        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        
        // Parse the template data
        const lines = body.split('\n');
        const data = {};
        
        lines.forEach(line => {
            const [key, value] = line.split(': ');
            if (key && value) {
                data[key.trim()] = value.trim();
            }
        });

        if (!data.code || !data.expired || !data.max) {
            return;
        }

        const result = Redeem.createCode(data);
        
        await sock.sendMessage(msg.key.remoteJid, {
            text: result.message,
            quoted: msg
        });

    } catch (error) {
        console.error('Error handling create redeem:', error);
    }
}

async function redeemHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        const code = body.split(' ')[1];

        if (!code) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Gunakan: .redeem code',
                quoted: msg
            });
            return;
        }

        const result = Redeem.redeemCode(code, senderJid);
        
        if (!result.status) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: result.message,
                quoted: msg
            });
            return;
        }

        // Update user data if redeem successful
        const user = User.getUser(senderJid);
        if (user) {
            const updates = {};
            
            // Update balance if any
            if (result.rewards.balance > 0) {
                updates.balance = user.balance + result.rewards.balance;
            }

            // Update premium status if any
            if (result.rewards.premium !== '0') {
                const parseDuration = (duration) => {
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
                };

                const durationMs = parseDuration(result.rewards.premium);
                if (durationMs) {
                    const now = Date.now();
                    const currentExpiry = user.premiumExpiry ? new Date(user.premiumExpiry).getTime() : now;
                    const newExpiry = currentExpiry > now ? currentExpiry + durationMs : now + durationMs;
                    
                    updates.status = 'premium';
                    updates.premiumExpiry = newExpiry;
                    updates.limit = Infinity;
                }
            }

            User.updateUser(senderJid, updates);

            // Send success message with rewards
            let rewardText = '🎉 Selamat! Anda mendapatkan:\n';
            if (result.rewards.balance > 0) {
                rewardText += `💰 Balance: ${result.rewards.balance}\n`;
            }
            if (result.rewards.premium !== '0') {
                rewardText += `👑 Premium: ${result.rewards.premium}\n`;
            }
            rewardText += `\n💌 ${result.rewards.pesan}`;

            await sock.sendMessage(msg.key.remoteJid, {
                text: rewardText,
                quoted: msg
            });
        }

    } catch (error) {
        console.error('Error in redeem handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses command',
            quoted: msg
        });
    }
}

module.exports = {
    createRedeemHandler,
    handleCreateRedeem,
    redeemHandler
};