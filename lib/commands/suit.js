const logger = require('../utils/logger')
const User = require('../../database/models/User')

// Store ongoing game states
const activeGames = new Map()

// Reward configuration
const REWARDS = {
    WIN: 250,
    LOSE: 25,
    DRAW: 50
}

async function suitHandler(sock, msg, mentionedJid) {  
    try {  
        const groupId = msg.key.remoteJid  
        const challenger = msg.key.participant  
        const opponent = mentionedJid[0]  

        if (!msg.key.remoteJid.endsWith('@g.us')) {  
            await sock.sendMessage(groupId, { text: '❌ Fitur ini hanya dapat digunakan di dalam grup!' })  
            return  
        }  

        if (activeGames.has(groupId)) {  
            await sock.sendMessage(groupId, { text: '❌ Sedang ada permainan yang berlangsung di grup ini!' })  
            return  
        }  

        if (challenger === opponent) {
            await sock.sendMessage(groupId, { text: '❌ Tidak bisa menantang diri sendiri!' })
            return
        }

        activeGames.set(groupId, {  
            challenger,  
            opponent,  
            choices: {},  
            status: 'waiting',
            timestamp: Date.now()
        })  

        await sock.sendMessage(groupId, {  
            text: `@${opponent.split('@')[0]} kamu ditantang suit oleh @${challenger.split('@')[0]}!

📋 Hadiah:
🏆 Menang: ${REWARDS.WIN} balance
🥈 Kalah: ${REWARDS.LOSE} balance
🤝 Seri: ${REWARDS.DRAW} balance

Ketik Y untuk menerima atau T untuk menolak.`,  
            mentions: [opponent, challenger]  
        })  

        setTimeout(async () => {
            const game = activeGames.get(groupId)
            if (game && game.status === 'waiting') {
                await sock.sendMessage(groupId, { 
                    text: '⏰ Waktu untuk menerima tantangan telah habis!',
                    mentions: [opponent, challenger]
                })
                activeGames.delete(groupId)
            }
        }, 60000)

    } catch (error) {  
        logger.error(`Error in suit handler: ${error}`)  
    }  
}  

async function handleSuitResponse(sock, msg) {  
    try {  
        const groupId = msg.key.remoteJid  
        const responderId = msg.key.participant  
        const response = msg.message?.conversation?.toUpperCase()  
        
        const game = activeGames.get(groupId)  
        if (!game || game.status !== 'waiting') return  
        
        if (responderId !== game.opponent) return  

        if (response === 'T') {  
            await sock.sendMessage(groupId, { 
                text: '❌ Tantangan ditolak!',
                mentions: [game.challenger, game.opponent]
            })  
            activeGames.delete(groupId)  
            return  
        }  

        if (response === 'Y') {  
            game.status = 'playing'
            game.timestamp = Date.now()
            
            const optionsMessage = `📢 Silahkan pilih:
G = ✂️ Gunting
B = 🪨 Batu
K = 📄 Kertas`

            await sock.sendMessage(game.challenger, { text: optionsMessage })  
            await sock.sendMessage(game.opponent, { text: optionsMessage })  
            
            await sock.sendMessage(groupId, { 
                text: '🎮 Permainan dimulai! Silahkan cek private chat untuk memilih!',
                mentions: [game.challenger, game.opponent]
            })

            setTimeout(async () => {
                const currentGame = activeGames.get(groupId)
                if (currentGame && currentGame.status === 'playing') {
                    const missingPlayers = []
                    if (!currentGame.choices[currentGame.challenger]) {
                        missingPlayers.push(currentGame.challenger)
                    }
                    if (!currentGame.choices[currentGame.opponent]) {
                        missingPlayers.push(currentGame.opponent)
                    }

                    if (missingPlayers.length > 0) {
                        await sock.sendMessage(groupId, { 
                            text: `⏰ Waktu habis! ${missingPlayers.map(p => `@${p.split('@')[0]}`).join(', ')} tidak memilih tepat waktu!`,
                            mentions: missingPlayers
                        })
                        activeGames.delete(groupId)
                    }
                }
            }, 30000)
        }  

    } catch (error) {  
        logger.error(`Error in suit response handler: ${error}`)  
    }  
}  

async function handleSuitChoice(sock, msg) {  
    try {  
        const playerId = msg.key.remoteJid  
        const choice = (msg.message?.conversation ||   
                       msg.message?.extendedTextMessage?.text ||   
                       '').trim().toUpperCase()  
        
        logger.info(`Received choice from ${playerId}: ${choice}`)

        for (const [groupId, game] of activeGames) {  
            if (game.status !== 'playing') continue  
            if (playerId !== game.challenger && playerId !== game.opponent) continue  

            if (!['G', 'B', 'K'].includes(choice)) {  
                await sock.sendMessage(playerId, {   
                    text: '❌ Pilihan tidak valid! Gunakan G/B/K (Gunting/Batu/Kertas)'   
                })  
                return  
            }  

            game.choices[playerId] = choice  
            await sock.sendMessage(playerId, {   
                text: `✅ Pilihan ${translateChoice(choice)} diterima!`   
            })  

            if (Object.keys(game.choices).length === 2) {  
                const result = determineWinner(game.choices[game.challenger], game.choices[game.opponent])
                
                await distributeRewards(game, result)
                
                const resultMessage = await getResultMessage(result, game)  
                
                await sock.sendMessage(groupId, {  
                    text: resultMessage,  
                    mentions: [game.challenger, game.opponent]  
                })  

                activeGames.delete(groupId)  
            }  
        }  

    } catch (error) {  
        logger.error(`Error in suit choice handler: ${error}`)  
    }  
}

async function distributeRewards(game, result) {
    try {
        const challengerUser = await User.getUser(game.challenger)
        const opponentUser = await User.getUser(game.opponent)

        if (!challengerUser || !opponentUser) return

        let challengerReward = 0
        let opponentReward = 0

        if (result === 'draw') {
            challengerReward = REWARDS.DRAW
            opponentReward = REWARDS.DRAW
        } else if (result === 'challenger') {
            challengerReward = REWARDS.WIN
            opponentReward = REWARDS.LOSE
        } else {
            challengerReward = REWARDS.LOSE
            opponentReward = REWARDS.WIN
        }

        await User.updateUser(game.challenger, { 
            balance: challengerUser.balance + challengerReward 
        })
        await User.updateUser(game.opponent, { 
            balance: opponentUser.balance + opponentReward 
        })
    } catch (error) {
        logger.error(`Error distributing rewards: ${error}`)
    }
}

function determineWinner(choice1, choice2) {  
    if (choice1 === choice2) return 'draw'  
    if (  
        (choice1 === 'G' && choice2 === 'K') ||  
        (choice1 === 'B' && choice2 === 'G') ||  
        (choice1 === 'K' && choice2 === 'B')  
    ) {  
        return 'challenger'  
    }  
    return 'opponent'  
}  

async function getResultMessage(result, game) {  
    const challengerChoice = translateChoice(game.choices[game.challenger])  
    const opponentChoice = translateChoice(game.choices[game.opponent])
    
    const challengerUser = await User.getUser(game.challenger)
    const opponentUser = await User.getUser(game.opponent)

    if (!challengerUser || !opponentUser) return '❌ Error getting user data'
    
    let message = `🎮 Hasil Suit:\n@${game.challenger.split('@')[0]}: ${challengerChoice}\n@${game.opponent.split('@')[0]}: ${opponentChoice}\n\n`  
    
    if (result === 'draw') {  
        message += `🤝 Hasil: Seri!\n\n💰 Hadiah:\n`
        message += `@${game.challenger.split('@')[0]}: +${REWARDS.DRAW} balance (Total: ${challengerUser.balance})\n`
        message += `@${game.opponent.split('@')[0]}: +${REWARDS.DRAW} balance (Total: ${opponentUser.balance})`
    } else if (result === 'challenger') {  
        message += `🏆 @${game.challenger.split('@')[0]} Menang!\n\n💰 Hadiah:\n`
        message += `@${game.challenger.split('@')[0]}: +${REWARDS.WIN} balance (Total: ${challengerUser.balance})\n`
        message += `@${game.opponent.split('@')[0]}: +${REWARDS.LOSE} balance (Total: ${opponentUser.balance})`
    } else {  
        message += `🏆 @${game.opponent.split('@')[0]} Menang!\n\n💰 Hadiah:\n`
        message += `@${game.opponent.split('@')[0]}: +${REWARDS.WIN} balance (Total: ${opponentUser.balance})\n`
        message += `@${game.challenger.split('@')[0]}: +${REWARDS.LOSE} balance (Total: ${challengerUser.balance})`
    }  
    
    return message  
}  

function translateChoice(choice) {  
    const translations = { 
        'G': '✂️ Gunting', 
        'B': '🪨 Batu', 
        'K': '📄 Kertas' 
    }  
    return translations[choice]  
}  

module.exports = {  
    suitHandler,  
    handleSuitResponse,  
    handleSuitChoice  
}