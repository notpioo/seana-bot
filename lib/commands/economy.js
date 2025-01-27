const User = require('../../database/models/User')  

async function buyPremium(sock, msg) {  
    const jid = msg.key.participant || msg.key.remoteJid  
    const user = User.getUser(jid)  
    
    if (!user) return  
    
    const premiumPrice = 100000 // 100k balance  

    if (user.balance >= premiumPrice) {  
        User.updateUser(jid, {  
            status: 'premium',  
            balance: user.balance - premiumPrice  
        })  
        await sock.sendMessage(msg.key.remoteJid, {   
            text: '🎉 Selamat! Kamu sekarang adalah premium user!'   
        })  
    } else {  
        await sock.sendMessage(msg.key.remoteJid, {   
            text: `Balance tidak cukup! Dibutuhkan ${premiumPrice} balance`   
        })  
    }  
}  

async function buyLimit(sock, msg, amount) {  
    const jid = msg.key.participant || msg.key.remoteJid  
    const user = User.getUser(jid)  
    
    if (!user) return  
    
    const limitPrice = 1000 // 1k per limit  
    const totalPrice = limitPrice * amount  
    const maxLimit = 25  

    if (user.balance >= totalPrice) {  
        const newLimit = Math.min(user.limit + amount, maxLimit)  
        User.updateUser(jid, {  
            limit: newLimit,  
            balance: user.balance - totalPrice  
        })  
        await sock.sendMessage(msg.key.remoteJid, {   
            text: `Berhasil membeli ${amount} limit! Limit sekarang: ${newLimit}`   
        })  
    } else {  
        await sock.sendMessage(msg.key.remoteJid, {   
            text: `Balance tidak cukup! Dibutuhkan ${totalPrice} balance`   
        })  
    }  
}  

module.exports = { buyPremium, buyLimit }