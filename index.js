const makeWASocket = require('@whiskeysockets/baileys').default  
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')  
const { handleMessages } = require('./handlers/message')  
const logger = require('./lib/utils/logger')  
const fs = require('fs')  

async function connectToWhatsApp() {  
    // Pastikan folder sessions ada  
    if (!fs.existsSync('./sessions')) {  
        fs.mkdirSync('./sessions')  
    }  

    const { state, saveCreds } = await useMultiFileAuthState('./sessions/auth_info')  
    
    const sock = makeWASocket({  
        printQRInTerminal: true,  
        auth: state,  
        browser: ['SeaBot', 'Chrome', '5.0']  
    })  

    sock.ev.on('connection.update', async (update) => {  
        const { connection, lastDisconnect } = update  
        
        if (connection === 'close') {  
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401  
            logger.info(`Koneksi ditutup. Reconnect: ${shouldReconnect}`)  
            if (shouldReconnect) {  
                connectToWhatsApp()  
            }  
        }   
        
        if (connection === 'open') {  
            logger.info('Terhubung ke WhatsApp')  
            // Tambahan log untuk fitur suit  
            logger.info('Fitur suit game telah dimuat')  
        }  
    })  

    sock.ev.on('creds.update', saveCreds)  

    // Tambahkan handler pesan  
    handleMessages(sock)  

    return sock  
}  

connectToWhatsApp().catch(console.error)