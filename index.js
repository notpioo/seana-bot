const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const { handleMessages } = require('./handlers/message')
const logger = require('./lib/utils/logger')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

// Fungsi untuk membaca input dari terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true })
    }
}

let reconnectAttempts = 0
const maxReconnectAttempts = 5
const reconnectInterval = 3000

async function connectToWhatsApp() {
    try {
        const sessionDir = path.join(process.cwd(), 'sessions')
        const authPath = path.join(sessionDir, 'auth_info')
        
        ensureDirectoryExists(sessionDir)
        logger.info(`Using session directory: ${sessionDir}`)
        
        const { state, saveCreds } = await useMultiFileAuthState(authPath)
        
        const sock = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            browser: ['SeaBot', 'Chrome', '5.0'],
            keys: makeCacheableSignalKeyStore(state.keys, logger),
            retryRequestDelayMs: 2000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            maxRetries: 5,
            generateHighQualityLinkPreview: true,
        })

        // Handle connection updates with pairing code
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut && 
                                      reconnectAttempts < maxReconnectAttempts

                logger.info(`Connection closed. Status: ${statusCode}, Reconnect: ${shouldReconnect}, Attempt: ${reconnectAttempts + 1}/${maxReconnectAttempts}`)

                if (shouldReconnect) {
                    reconnectAttempts++
                    logger.info(`Reconnecting in ${reconnectInterval}ms...`)
                    setTimeout(() => {
                        connectToWhatsApp()
                    }, reconnectInterval)
                } else {
                    logger.info('Connection closed permanently')
                    if (statusCode === DisconnectReason.loggedOut) {
                        try {
                            fs.rmSync(authPath, { recursive: true, force: true })
                            logger.info('Session files deleted')
                        } catch (err) {
                            logger.error('Failed to delete session:', err)
                        }
                    }
                }
            } else if (connection === 'open') {
                reconnectAttempts = 0
                logger.info('Connected to WhatsApp')
                
                try {
                    await sock.sendPresenceUpdate('available')
                    logger.info('Presence update sent successfully')
                } catch (err) {
                    logger.error('Failed to send presence update:', err)
                }
            } else if (update.qr) {
                // Jika tidak ada session yang tersimpan, minta nomor telepon
                if (!fs.existsSync(path.join(authPath, 'creds.json'))) {
                    rl.question('Masukkan nomor WhatsApp (contoh: 628123456789): ', async (number) => {
                        try {
                            const code = await sock.requestPairingCode(number)
                            logger.info(`Kode pairing Anda adalah: ${code}`)
                            logger.info('Masukkan kode ini di WhatsApp di perangkat Anda')
                        } catch (error) {
                            logger.error('Gagal mendapatkan kode pairing:', error)
                        }
                    })
                }
            }
        })

        // Handle credential updates
        sock.ev.on('creds.update', async () => {
            try {
                await saveCreds()
                logger.info('Credentials updated and saved successfully')
            } catch (err) {
                logger.error('Failed to save credentials:', err)
            }
        })

        // Handle messages
        handleMessages(sock)

        return sock
    } catch (err) {
        logger.error('Failed to connect:', err)
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            logger.info(`Retrying connection in ${reconnectInterval}ms... Attempt: ${reconnectAttempts}/${maxReconnectAttempts}`)
            setTimeout(() => {
                connectToWhatsApp()
            }, reconnectInterval)
        }
    }
}

// Start the connection
connectToWhatsApp().catch((err) => {
    logger.error('Fatal error:', err)
    process.exit(1)
})