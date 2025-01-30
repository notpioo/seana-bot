// lib/commands/market.js
const Market = require('../../database/models/Market');
const CryptoModel = require('../../database/models/Crypto');
const User = require('../../database/models/User');

async function getOrCreateMarket() {
    let market = await Market.findOne({});
    if (!market) {
        market = await Market.create({});
    }
    await market.updateRate();
    return market;
}

async function marketHandler(sock, msg) {
    try {
        const market = await getOrCreateMarket();
        const priceChange = market.priceHistory.length > 1 
            ? ((market.currentRate - market.priceHistory[0].rate) / market.priceHistory[0].rate * 100).toFixed(2)
            : '0.00';
        
        // Calculate min/max prices from history
        const prices = market.priceHistory.map(p => p.rate);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        const marketText = `╭━『 *CRYPTO MARKET* 』━
┃ 
┃ 📊 *Current Market Rate*
┃ ├ 1 COIN = ${market.currentRate.toLocaleString()} balance
┃ ├ Min Rate: ${minPrice.toLocaleString()}
┃ └ Max Rate: ${maxPrice.toLocaleString()}
┃
┃ 📈 *Market Statistics*
┃ ├ 24h Change: ${priceChange}%
┃ ├ Total Supply: ${market.totalSupply.toFixed(6)} COIN
┃ └ Total Trades: ${market.totalTransactions}
┃
┃ 💡 *Trading Info*
┃ ├ Min Sell: 0.005000 COIN
┃ └ Use .sellcrypto <amount>
╰━━━━━━━━━━━━━━━━━━━╯`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: marketText,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in market handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses market',
            quoted: msg
        });
    }
}

async function sellCryptoHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        
        const amount = parseFloat(body.split(' ')[1]);
        
        if (!amount || amount < 0.005000) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Minimal jual 0.005000 COIN\nContoh: .sellcrypto 0.005000',
                quoted: msg
            });
            return;
        }

        const crypto = await CryptoModel.findOne({ userId: senderJid });
        if (!crypto || crypto.balance < amount) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Balance COIN tidak cukup!',
                quoted: msg
            });
            return;
        }

        const market = await getOrCreateMarket();
        const balanceToReceive = Math.floor(amount * market.currentRate);
        
        // Update crypto balance
        crypto.balance -= amount;
        await crypto.save();
        
        // Update user balance
        const user = await User.getUser(senderJid);
        await User.updateUser(senderJid, {
            balance: user.balance + balanceToReceive
        });
        
        // Update market statistics
        market.totalSupply += amount;
        market.totalTransactions += 1;
        await market.save();

        const sellText = `🎉 *Crypto Sold Successfully!*
        
💰 Amount Sold: ${amount.toFixed(6)} COIN
💵 Rate: ${market.currentRate.toLocaleString()} balance/COIN
💸 Received: ${balanceToReceive.toLocaleString()} balance

📊 *Updated Balances*
├ COIN: ${crypto.balance.toFixed(6)}
└ Balance: ${(user.balance + balanceToReceive).toLocaleString()}`;

        await sock.sendMessage(msg.key.remoteJid, {
            text: sellText,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in sellcrypto handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat menjual crypto',
            quoted: msg
        });
    }
}

module.exports = {
    marketHandler,
    sellCryptoHandler
};