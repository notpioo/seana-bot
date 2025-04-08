const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const { handleMessages } = require('./handlers/message')
const logger = require('./lib/utils/logger')
const fs = require('fs')
const path = require('path')
const connectDB = require('./database/config/mongoose');
const botSettings = require('./config/settings');
require('dotenv').config();

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
        
        // Load bot configuration
        const config = await botSettings.getBotConfig(true); // Force reload
        
        // Initialize global flag for config update notification
        global.botConfigUpdated = false;
        
        const phoneNumber = process.env.BOT_NUMBER || '6285709557572';
        
        const sock = makeWASocket({
            auth: state,
            browser: [config.botName || 'SeaBot', 'Chrome', '5.0'],
            keys: makeCacheableSignalKeyStore(state.keys, logger),
            retryRequestDelayMs: 2000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            maxRetries: 5,
            generateHighQualityLinkPreview: true,
            mobile: true,
            pairingCode: true,
            printQRInTerminal: false,
        })

        // Handle pairing code
        if (!sock.authState.creds.registered) {
            const code = await sock.requestPairingCode(phoneNumber)
            logger.info(`Pairing code: ${code}`)
            console.log(`Pairing code: ${code}`)
        }
        
        // Setup config checker interval
        setInterval(async () => {
            try {
                if (global.botConfigUpdated) {
                    // Reset the flag
                    global.botConfigUpdated = false;
                    
                    // Get fresh config
                    const freshConfig = await botSettings.getBotConfig(true);
                    
                    logger.info('Bot configuration has been updated, applying changes...');
                    
                    // Update bot name in connections
                    if (sock?.user?.name !== freshConfig.botName) {
                        logger.info(`Bot name updated from ${sock?.user?.name || 'unknown'} to ${freshConfig.botName}`);
                    }
                }
            } catch (err) {
                logger.error('Error checking configuration updates:', err);
            }
        }, 10000); // Check every 10 seconds

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            if (qr) {
                logger.info('QR Code received, please scan with WhatsApp')
            }
            
            // Update bot config if flag is set
            if (global.botConfigUpdated === true) {
                const freshConfig = await botSettings.getBotConfig(true);
                sock.authState.creds.me.name = freshConfig.botName;
                logger.info(`Bot name updated to: ${freshConfig.botName}`);
                global.botConfigUpdated = false;
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
                    // Check if online status is enabled in config
                    const config = await botSettings.getBotConfig();
                    
                    if (config.onlineOnConnect) {
                        await sock.sendPresenceUpdate('available')
                        logger.info('Presence update sent successfully')
                    } else {
                        logger.info('Online status disabled in configuration')
                    }
                    
                    // Log bot configuration
                    logger.info(`Bot started with name: ${config.botName}`)
                    logger.info(`Prefix type: ${config.prefixType}, Prefix: ${config.prefix}`)
                    logger.info(`Owners: ${config.owners.map(o => o.name).join(', ')}`)
                } catch (err) {
                    logger.error('Failed to process startup configuration:', err)
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

// Bungkus dalam IIFE untuk menggunakan await
(async () => {
    try {
        await connectDB();
        await connectToWhatsApp();
    } catch (err) {
        logger.error('Fatal error:', err);
        process.exit(1);
    }
})();