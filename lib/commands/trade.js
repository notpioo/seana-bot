const Trade = require('../../database/models/Trade');
const User = require('../../database/models/User');
const Fish = require('../../database/models/Fish');

const tradeHandler = async (sock, msg) => {
    try {
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentionedJid || mentionedJid.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tag player yang ingin diajak trade! Contoh: .trade @user',
                quoted: msg
            });
            return;
        }

        const initiatorJid = msg.key.participant || msg.key.remoteJid;
        const receiverJid = mentionedJid[0];

        // Check if either user is already in a trade
        const existingTrade = await Trade.findOne({
            $or: [
                { 'initiator.userId': initiatorJid },
                { 'receiver.userId': initiatorJid },
                { 'initiator.userId': receiverJid },
                { 'receiver.userId': receiverJid }
            ],
            status: { $in: ['pending', 'active'] }
        });

        if (existingTrade) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Salah satu player sedang dalam sesi trade',
                quoted: msg
            });
            return;
        }

        // Create new trade session
        await Trade.create({
            initiator: { userId: initiatorJid, slots: [] },
            receiver: { userId: receiverJid, slots: [] },
            status: 'pending'
        });

        await sock.sendMessage(msg.key.remoteJid, {
            text: `@${initiatorJid.split('@')[0]} meminta untuk trade denganmu @${receiverJid.split('@')[0]}\n\nKetik Y untuk menerima dan T untuk menolak`,
            mentions: [initiatorJid, receiverJid],
            quoted: msg
        });

    } catch (error) {
        console.error('Trade handler error:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memulai trade',
            quoted: msg
        });
    }
};

const handleTradeResponse = async (sock, msg) => {
    try {
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        const response = body.toUpperCase();
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Find pending trade where user is receiver
        const trade = await Trade.findOne({
            'receiver.userId': senderJid,
            status: 'pending'
        });

        if (!trade) {
            return false; // Not a trade response
        }

        if (response === 'Y') {
            trade.status = 'active';
            await trade.save();

            await sock.sendMessage(msg.key.remoteJid, {
                text: `💹 Trade diterima! Silakan gunakan .puttrade untuk memasukkan item.\n\nContoh:\n.puttrade fish salmon 1\n.puttrade balance 1000\n.puttrade rod kayu 1`,
                quoted: msg
            });
            return true;
        } else if (response === 'T') {
            trade.status = 'cancelled';
            await trade.save();

            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Trade ditolak',
                quoted: msg
            });
            return true;
        }

        return false;
    } catch (error) {
        console.error('Trade response error:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses respon trade',
            quoted: msg
        });
        return false;
    }
};

const putTradeHandler = async (sock, msg) => {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const args = msg.message?.conversation?.split(' ').slice(1) || 
                    msg.message?.extendedTextMessage?.text?.split(' ').slice(1) || [];

        if (args.length < 2) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Format salah! Contoh: .puttrade fish salmon 1',
                quoted: msg
            });
            return;
        }

        const [itemType, ...itemDetails] = args;
        const quantity = parseInt(itemDetails[itemDetails.length - 1]) || 1;
        const itemName = itemDetails.slice(0, -1).join(' ');

        // Find active trade
        const trade = await Trade.findOne({
            $or: [
                { 'initiator.userId': senderJid },
                { 'receiver.userId': senderJid }
            ],
            status: 'active'
        });

        if (!trade) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada sesi trade yang aktif',
                quoted: msg
            });
            return;
        }

        const userRole = trade.initiator.userId === senderJid ? 'initiator' : 'receiver';

        // Check slot limit
        if (trade[userRole].slots.length >= 3) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Slot trade sudah penuh (maksimal 3 item)',
                quoted: msg
            });
            return;
        }

        // Verify item ownership and add to trade
        const user = await User.getUser(senderJid);
        let isValid = false;

        switch (itemType.toLowerCase()) {
            case 'fish':
                const fishData = await Fish.findOne({ jid: senderJid });
                const fishItem = fishData?.inventory?.fish?.find(f => 
                    f.name.toLowerCase() === itemName.toLowerCase() && 
                    f.quantity >= quantity &&
                    !f.isLocked
                );
                isValid = !!fishItem;
                break;

            case 'rod':
                const rodData = await Fish.findOne({ jid: senderJid });
                const rodItem = rodData?.inventory?.rods?.find(r => 
                    r.name.toLowerCase() === itemName.toLowerCase()
                );
                isValid = !!rodItem;
                break;

            case 'balance':
                isValid = user && user.balance >= quantity;
                break;

            default:
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Tipe item tidak valid! (fish/rod/balance)',
                    quoted: msg
                });
                return;
        }

        if (!isValid) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Item tidak ditemukan atau jumlah tidak mencukupi',
                quoted: msg
            });
            return;
        }

        // Add item to trade
        trade[userRole].slots.push({
            type: itemType.toLowerCase(),
            itemName: itemType.toLowerCase() === 'balance' ? 'balance' : itemName,
            quantity,
            balance: itemType.toLowerCase() === 'balance' ? quantity : 0
        });

        await trade.save();

        const otherRole = userRole === 'initiator' ? 'receiver' : 'initiator';
        const tradeStatus = `📦 Status Trade:\n\n@${trade.initiator.userId.split('@')[0]}:\n${formatTradeSlots(trade.initiator.slots)}\n\n@${trade.receiver.userId.split('@')[0]}:\n${formatTradeSlots(trade.receiver.slots)}`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: tradeStatus,
            mentions: [trade.initiator.userId, trade.receiver.userId],
            quoted: msg
        });

    } catch (error) {
        console.error('Put trade error:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menambahkan item ke trade',
            quoted: msg
        });
    }
};

const acceptTradeHandler = async (sock, msg) => {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        const trade = await Trade.findOne({
            $or: [
                { 'initiator.userId': senderJid },
                { 'receiver.userId': senderJid }
            ],
            status: 'active'
        });

        if (!trade) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada sesi trade yang aktif',
                quoted: msg
            });
            return;
        }

        const userRole = trade.initiator.userId === senderJid ? 'initiator' : 'receiver';
        trade[userRole].isReady = true;
        await trade.save();

        if (trade.initiator.isReady && trade.receiver.isReady) {
            // Execute trade
            await executeTrade(trade);
            trade.status = 'completed';
            await trade.save();

            await sock.sendMessage(msg.key.remoteJid, {
                text: '✅ Trade berhasil diselesaikan!',
                quoted: msg
            });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `@${senderJid.split('@')[0]} siap untuk trade. Menunggu partner...`,
                mentions: [senderJid],
                quoted: msg
            });
        }

    } catch (error) {
        console.error('Accept trade error:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menyelesaikan trade',
            quoted: msg
        });
    }
};

const cancelTradeHandler = async (sock, msg) => {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        const trade = await Trade.findOne({
            $or: [
                { 'initiator.userId': senderJid },
                { 'receiver.userId': senderJid }
            ],
            status: { $in: ['pending', 'active'] }
        });

        if (!trade) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Tidak ada sesi trade yang aktif',
                quoted: msg
            });
            return;
        }

        trade.status = 'cancelled';
        await trade.save();

        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Trade dibatalkan',
            quoted: msg
        });

    } catch (error) {
        console.error('Cancel trade error:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat membatalkan trade',
            quoted: msg
        });
    }
};

// Helper function to format trade slots for display
const formatTradeSlots = (slots) => {
    if (slots.length === 0) return 'Belum ada item';
    return slots.map(slot => {
        if (slot.type === 'balance') {
            return `💰 Balance: ${slot.quantity}`;
        }
        return `📦 ${slot.type}: ${slot.itemName} (${slot.quantity}x)`;
    }).join('\n');
};

// Helper function to execute trade
const executeTrade = async (trade) => {
    try {
        // Process initiator's items
        for (const slot of trade.initiator.slots) {
            await transferItem(trade.initiator.userId, trade.receiver.userId, slot);
        }

        // Process receiver's items
        for (const slot of trade.receiver.slots) {
            await transferItem(trade.receiver.userId, trade.initiator.userId, slot);
        }
    } catch (error) {
        console.error('Execute trade error:', error);
        throw error;
    }
};

// Helper function to transfer items between users
const transferItem = async (fromJid, toJid, item) => {
    try {
        switch (item.type) {
            case 'fish':
                const fromFish = await Fish.findOne({ jid: fromJid });
                const toFish = await Fish.findOne({ jid: toJid });
                
                if (!fromFish || !toFish) throw new Error('Fish data not found');

                // Find source fish with complete details
                const sourceFish = fromFish.inventory.fish.find(f => 
                    f.name.toLowerCase() === item.itemName.toLowerCase()
                );

                if (!sourceFish || sourceFish.quantity < item.quantity || sourceFish.isLocked) {
                    throw new Error('Invalid fish or insufficient quantity');
                }

                // Remove from sender
                sourceFish.quantity -= item.quantity;
                if (sourceFish.quantity <= 0) {
                    fromFish.inventory.fish = fromFish.inventory.fish.filter(f => 
                        f.name.toLowerCase() !== item.itemName.toLowerCase()
                    );
                }

                // Add to receiver with complete details
                const existingFish = toFish.inventory.fish.find(f => 
                    f.name.toLowerCase() === item.itemName.toLowerCase()
                );

                if (existingFish) {
                    existingFish.quantity += item.quantity;
                } else {
                    toFish.inventory.fish.push({
                        name: sourceFish.name,
                        rarity: sourceFish.rarity,
                        quantity: item.quantity,
                        isLocked: false // Reset lock status for new owner
                    });
                }

                await fromFish.save();
                await toFish.save();
                break;

            case 'rod':
                const fromRodData = await Fish.findOne({ jid: fromJid });
                const toRodData = await Fish.findOne({ jid: toJid });

                if (!fromRodData || !toRodData) throw new Error('Rod data not found');

                // Find source rod with complete details
                const sourceRod = fromRodData.inventory.rods.find(r => 
                    r.name.toLowerCase() === item.itemName.toLowerCase()
                );

                if (!sourceRod) {
                    throw new Error('Rod not found');
                }

                // Remove from sender
                fromRodData.inventory.rods = fromRodData.inventory.rods.filter(r => 
                    r.name.toLowerCase() !== item.itemName.toLowerCase()
                );

                // Check if current rod needs to be reset
                if (fromRodData.currentRod === item.itemName) {
                    fromRodData.currentRod = 'ranting_pohon'; // Reset to default rod
                }

                // Add to receiver
                toRodData.inventory.rods.push({
                    name: sourceRod.name,
                    durability: sourceRod.durability
                });

                await fromRodData.save();
                await toRodData.save();
                break;

            case 'balance':
                const fromUser = await User.getUser(fromJid);
                const toUser = await User.getUser(toJid);

                if (!fromUser || !toUser) throw new Error('User data not found');

                if (fromUser.balance < item.quantity) {
                    throw new Error('Insufficient balance');
                }

                fromUser.balance -= item.quantity;
                toUser.balance += item.quantity;

                await User.updateUser(fromJid, { balance: fromUser.balance });
                await User.updateUser(toJid, { balance: toUser.balance });
                break;

            default:
                throw new Error('Invalid item type');
        }
    } catch (error) {
        console.error('Transfer item error:', error);
        throw error;
    }
};

module.exports = {
    tradeHandler,
    handleTradeResponse,
    putTradeHandler,
    acceptTradeHandler,
    cancelTradeHandler
};