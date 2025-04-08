const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { handleMessages } = require('./handlers/message');
const logger = require('./lib/utils/logger');
const fs = require('fs');
const path = require('path');
const connectDB = require('./database/config/mongoose');
require('dotenv').config();

const AUTH_PATH = process.env.AUTH_PATH || path.join(process.cwd(), 'sessions', 'auth_info');

async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);

        const sock = makeWASocket({
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            browser: ['SeaBot', 'Chrome', '5.0'],
            logger: logger,
            generateHighQualityLinkPreview: true,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            version: [2, 2323, 4]
        });

        // Handle pairing code request
        if (!sock.authState.creds.registered) {
            const phoneNumber = process.env.PAIRING_NUMBER;
            if (phoneNumber) {
                try {
                    logger.info('Requesting pairing code for:', phoneNumber);
                    const code = await sock.requestPairingCode(phoneNumber);
                    logger.info('Your pairing code:', code);
                } catch (error) {
                    logger.error('Failed to request pairing code:', error);
                }
            }
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info('Connection closed due to:', lastDisconnect?.error?.output?.payload?.message);

                if (shouldReconnect) {
                    logger.info('Reconnecting...');
                    connectToWhatsApp();
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
                logger.info('Connected successfully!');
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
        logger.error('Error in connection:', err);
        throw err;
    }
}

async function startBot() {
    try {
        await connectDB();
        logger.info('Connected to MongoDB');
        await connectToWhatsApp();
    } catch (err) {
        logger.error('Failed to start bot:', err);
        process.exit(1);
    }
}

startBot();