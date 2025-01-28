const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const { handleMessages } = require('./handlers/message')
const logger = require('./lib/utils/logger')
const fs = require('fs')
const path = require('path')

// Tambahkan fungsi untuk memastikan direktori ada
function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true })
    }
}

// Fungsi untuk menangani reconnect
let reconnectAttempts = 0
const maxReconnectAttempts = 5
const reconnectInterval = 3000 // 3 detik

async function connectToWhatsApp() {
    try {
        // Gunakan path absolut untuk sessions
        const sessionDir = path.join(process.cwd(), 'sessions')
        const authPath = path.join(sessionDir, 'auth_info')
        
        // Pastikan direktori sessions ada
        ensureDirectoryExists(sessionDir)

        // Tambahkan logging untuk debug
        logger.info(`Using session directory: ${sessionDir}`)
        
        const { state, saveCreds } = await useMultiFileAuthState(authPath)
        
        const sock = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            browser: ['SeaBot', 'Chrome', '5.0'],
            // Tambahkan signal key store yang bisa di-cache
            keys: makeCacheableSignalKeyStore(state.keys, logger),
            // Tambahkan retry ketika disconnect
            retryRequestDelayMs: 2000,
            // Tambahkan timeout yang lebih lama
            connectTimeoutMs: 60000,
            // Tambahkan keep-alive
            keepAliveIntervalMs: 10000,
            // Tambahkan max retries
            maxRetries: 5,
            // Generate session ID yang konsisten
            generateHighQualityLinkPreview: true,
        })

        // Handle connection updates
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
                    // Reset session jika logout
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
                reconnectAttempts = 0 // Reset attempts on successful connection
                logger.info('Connected to WhatsApp')
                
                // Verify connection by sending presence update
                try {
                    await sock.sendPresenceUpdate('available')
                    logger.info('Presence update sent successfully')
                } catch (err) {
                    logger.error('Failed to send presence update:', err)
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
        // Retry connection if failed
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