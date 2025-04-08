const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { handleMessages } = require('./handlers/message');
const logger = require('./lib/utils/logger');
const fs = require('fs');
const path = require('path');
const connectDB = require('./database/config/mongoose');
const botSettings = require('./config/settings');
require('dotenv').config();

const AUTH_PATH = process.env.AUTH_PATH || path.join(process.cwd(), 'sessions', 'auth_info');

function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

let sock = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectInterval = 3000;

async function connectToWhatsApp() {
    try {
        ensureDirectoryExists(path.dirname(AUTH_PATH));
        logger.info(`Using auth directory: ${AUTH_PATH}`);

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
        const config = await botSettings.getBotConfig(true);
        global.botConfigUpdated = false;

        sock = makeWASocket({
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            browser: [config.botName || 'SeaBot', 'Chrome', '5.0'],
            logger: logger,
            generateHighQualityLinkPreview: true,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            version: [2, 2323, 4],
            getMessage: async () => {
                return { conversation: 'hello' };
            }
        });

        // Handle pairing code
        if (!sock.authState.creds.registered) {
            const phoneNumber = process.env.PAIRING_NUMBER;
            if (phoneNumber) {
                try {
                    logger.info('Requesting pairing code for:', phoneNumber);
                    const code = await sock.requestPairingCode(phoneNumber);
                    logger.info('Pairing code:', code);
                    global.pairingCode = code;
                } catch (error) {
                    logger.error('Failed to request pairing code:', error);
                }
            }
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) && 
                                     reconnectAttempts < maxReconnectAttempts;

                logger.info(`Connection closed. Reconnect: ${shouldReconnect}`);

                if (shouldReconnect) {
                    reconnectAttempts++;
                    logger.info(`Reconnecting... Attempt ${reconnectAttempts}`);
                    setTimeout(connectToWhatsApp, reconnectInterval);
                } else {
                    logger.info('Connection closed permanently');
                    if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                        try {
                            await fs.promises.rm(AUTH_PATH, { recursive: true, force: true });
                            logger.info('Auth files deleted');
                        } catch (err) {
                            logger.error('Failed to delete auth files:', err);
                        }
                    }
                }
            } else if (connection === 'open') {
                reconnectAttempts = 0;
                logger.info('Connected to WhatsApp');

                try {
                    const config = await botSettings.getBotConfig();
                    if (config.onlineOnConnect) {
                        await sock.sendPresenceUpdate('available');
                    }
                } catch (err) {
                    logger.error('Failed to process startup configuration:', err);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);
        handleMessages(sock);

        return sock;
    } catch (err) {
        logger.error('Failed to connect:', err);
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(connectToWhatsApp, reconnectInterval);
        }
    }
}

(async () => {
    try {
        await connectDB();
        await connectToWhatsApp();
    } catch (err) {
        logger.error('Fatal error:', err);
        process.exit(1);
    }
})();

module.exports = { connectToWhatsApp };