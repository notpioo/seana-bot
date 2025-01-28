const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const { handleMessages } = require('./handlers/message')
const logger = require('./lib/utils/logger')
const fs = require('fs')
const path = require('path')

// Gunakan environment variable untuk auth path
const AUTH_PATH = process.env.AUTH_PATH || path.join(process.cwd(), 'sessions', 'auth_info')

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
        // Pastikan direktori auth ada
        ensureDirectoryExists(path.dirname(AUTH_PATH))
        
        logger.info(`Using auth directory: ${AUTH_PATH}`)
        
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH)
        
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

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            // Tambahkan logging untuk QR code
            if (qr) {
                logger.info('QR Code received, please scan with WhatsApp')
            }

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
                            fs.rmSync(AUTH_PATH, { recursive: true, force: true })
                            logger.info('Auth files deleted')
                        } catch (err) {
                            logger.error('Failed to delete auth files:', err)
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
            }
        })

        sock.ev.on('creds.update', async () => {
            try {
                await saveCreds()
                logger.info('Credentials updated and saved successfully')
            } catch (err) {
                logger.error('Failed to save credentials:', err)
            }
        })

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

// Langsung jalankan fungsi
connectToWhatsApp().catch((err) => {
    logger.error('Fatal error:', err)
    process.exit(1)
})