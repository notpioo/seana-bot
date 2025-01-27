const logger = require('../utils/logger')  

// Menyimpan status permainan yang sedang berlangsung  
const activeGames = new Map()  

async function suitHandler(sock, msg, mentionedJid) {  
    try {  
        const groupId = msg.key.remoteJid  
        const challenger = msg.key.participant  
        const opponent = mentionedJid[0]  

        // Cek apakah dalam grup  
        if (!msg.key.remoteJid.endsWith('@g.us')) {  
            await sock.sendMessage(groupId, { text: 'Fitur ini hanya dapat digunakan di dalam grup!' })  
            return  
        }  

        // Cek apakah sudah ada permainan yang berlangsung  
        if (activeGames.has(groupId)) {  
            await sock.sendMessage(groupId, { text: 'Sedang ada permainan yang berlangsung di grup ini!' })  
            return  
        }  

        // Buat game baru  
        activeGames.set(groupId, {  
            challenger,  
            opponent,  
            choices: {},  
            status: 'waiting'  
        })  

        // Kirim tantangan  
        await sock.sendMessage(groupId, {  
            text: `@${opponent.split('@')[0]} kamu ditantang suit oleh @${challenger.split('@')[0]}, ketik Y untuk menerima T untuk menolak.`,  
            mentions: [opponent, challenger]  
        })  

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
            await sock.sendMessage(groupId, { text: 'Tantangan ditolak!' })  
            activeGames.delete(groupId)  
            return  
        }  

        if (response === 'Y') {  
            game.status = 'playing'  
            
            // Kirim pilihan ke kedua pemain  
            const optionsMessage = 'Silahkan pilih:\nG = Gunting\nB = Batu\nK = Kertas'  
            await sock.sendMessage(game.challenger, { text: optionsMessage })  
            await sock.sendMessage(game.opponent, { text: optionsMessage })  
            
            await sock.sendMessage(groupId, { text: 'Permainan dimulai! Silahkan cek private chat untuk memilih!' })  
        }  

    } catch (error) {  
        logger.error(`Error in suit response handler: ${error}`)  
    }  
}  

async function handleSuitChoice(sock, msg) {  
    try {  
        const playerId = msg.key.remoteJid  
        // Tambahkan .trim() dan toUpperCase()  
        const choice = (msg.message?.conversation ||   
                       msg.message?.extendedTextMessage?.text ||   
                       '').trim().toUpperCase()  
        
        logger.info(`Received choice from ${playerId}: ${choice}`) // Debug log  

        // Cari game yang melibatkan player ini  
        for (const [groupId, game] of activeGames) {  
            if (game.status !== 'playing') continue  
            if (playerId !== game.challenger && playerId !== game.opponent) continue  

            if (!['G', 'B', 'K'].includes(choice)) {  
                await sock.sendMessage(playerId, {   
                    text: 'Pilihan tidak valid! Gunakan G/B/K (Gunting/Batu/Kertas)'   
                })  
                return  
            }  

            game.choices[playerId] = choice  
            await sock.sendMessage(playerId, {   
                text: `Pilihan ${translateChoice(choice)} diterima!`   
            })  

            // Cek apakah kedua pemain sudah memilih  
            if (Object.keys(game.choices).length === 2) {  
                // Tentukan pemenang  
                const result = determineWinner(game.choices[game.challenger], game.choices[game.opponent])  
                const resultMessage = getResultMessage(result, game)  
                
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

function getResultMessage(result, game) {  
    const challengerChoice = translateChoice(game.choices[game.challenger])  
    const opponentChoice = translateChoice(game.choices[game.opponent])  
    
    let message = `Hasil Suit:\n@${game.challenger.split('@')[0]}: ${challengerChoice}\n@${game.opponent.split('@')[0]}: ${opponentChoice}\n\n`  
    
    if (result === 'draw') {  
        message += 'Hasil: Seri!'  
    } else if (result === 'challenger') {  
        message += `@${game.challenger.split('@')[0]} Menang!`  
    } else {  
        message += `@${game.opponent.split('@')[0]} Menang!`  
    }  
    
    return message  
}  

function translateChoice(choice) {  
    const translations = { 'G': 'Gunting', 'B': 'Batu', 'K': 'Kertas' }  
    return translations[choice]  
}  

module.exports = {  
    suitHandler,  
    handleSuitResponse,  
    handleSuitChoice  
}