// domino-sticker.js - Sticker detection for domino game

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@adiwajshing/baileys');

// Store mappings of sticker IDs/hashes to domino values
const stickerMap = new Map();

/**
 * Initialize the sticker detection system
 * This would normally load predefined stickers from a directory
 */
const initStickerDetection = () => {
    try {
        // In a real implementation, you would load sticker mappings from a JSON file or database
        // This is a simulated implementation with some example mappings

        // Format: stickerID/hash -> { left: number, right: number }
        stickerMap.set('sticker1_hash', { left: 0, right: 0 });
        stickerMap.set('sticker2_hash', { left: 0, right: 1 });
        stickerMap.set('sticker3_hash', { left: 0, right: 2 });
        stickerMap.set('sticker4_hash', { left: 0, right: 3 });
        stickerMap.set('sticker5_hash', { left: 0, right: 4 });
        stickerMap.set('sticker6_hash', { left: 0, right: 5 });
        stickerMap.set('sticker7_hash', { left: 0, right: 6 });
        stickerMap.set('sticker8_hash', { left: 1, right: 1 });
        stickerMap.set('sticker9_hash', { left: 1, right: 2 });
        // ... add all combinations (0-0 through 6-6)

        console.log('Domino sticker detection initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize sticker detection:', error);
        return false;
    }
};

/**
 * Register a new sticker with its corresponding domino values
 * This could be used by an admin to add new stickers
 */
const registerDominoSticker = async (stickerMsg, dominoValues) => {
    try {
        // Download the sticker
        const buffer = await downloadStickerBuffer(stickerMsg);
        if (!buffer) {
            return { success: false, message: 'Failed to download sticker' };
        }

        // Calculate hash to use as identifier
        const hash = calculateStickerHash(buffer);

        // Map the hash to domino values
        stickerMap.set(hash, dominoValues);

        // Optionally save the updated map to persistent storage
        saveStickerMap();

        return { 
            success: true, 
            message: `Sticker registered for domino ${dominoValues.left}|${dominoValues.right}`,
            hash
        };
    } catch (error) {
        console.error('Error registering domino sticker:', error);
        return { success: false, message: 'Internal error registering sticker' };
    }
};

/**
 * Detect domino values from a sticker message
 */
const detectDominoFromSticker = async (stickerMsg) => {
    try {
        // Get sticker metadata
        const stickerInfo = stickerMsg.message?.stickerMessage;
        if (!stickerInfo) {
            return null;
        }

        // Check if we can identify using sticker ID first (faster)
        const stickerId = stickerInfo.fileSha256?.toString('hex') || 
                          stickerInfo.fileEncSha256?.toString('hex') ||
                          stickerInfo.mediaKey?.toString('hex');

        if (stickerId && stickerMap.has(stickerId)) {
            return stickerMap.get(stickerId);
        }

        // If we can't identify by ID, download and hash the image
        const buffer = await downloadStickerBuffer(stickerMsg);
        if (!buffer) {
            return null;
        }

        const hash = calculateStickerHash(buffer);

        if (stickerMap.has(hash)) {
            return stickerMap.get(hash);
        }

        // Not a recognized domino sticker
        return null;
    } catch (error) {
        console.error('Error detecting domino from sticker:', error);
        return null;
    }
};

/**
 * Find if player has a specific domino card in their hand
 */
const findMatchingCardInHand = (playerCards, detectedValues) => {
    // Check if player has the exact card (in either orientation)
    for (let i = 0; i < playerCards.length; i++) {
        const card = playerCards[i];

        // Check both orientations
        if ((card.left === detectedValues.left && card.right === detectedValues.right) ||
            (card.left === detectedValues.right && card.right === detectedValues.left)) {
            return {
                found: true,
                index: i,
                card: card
            };
        }
    }

    return { found: false };
};

/**
 * Download sticker buffer from message
 */
const downloadStickerBuffer = async (msg) => {
    try {
        const stickerInfo = msg.message?.stickerMessage;
        if (!stickerInfo) return null;

        const stream = await downloadContentFromMessage(stickerInfo, 'sticker');
        let buffer = Buffer.alloc(0);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        return buffer;
    } catch (error) {
        console.error('Error downloading sticker:', error);
        return null;
    }
};

/**
 * Calculate a hash for a sticker buffer
 */
const calculateStickerHash = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Save the sticker map to persistent storage
 */
const saveStickerMap = () => {
    try {
        // Convert Map to object for storage
        const mapObj = Object.fromEntries(stickerMap);
        const mapJson = JSON.stringify(mapObj, null, 2);

        // Create directory if it doesn't exist
        const dirPath = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // Write to file
        fs.writeFileSync(
            path.join(__dirname, '..', 'data', 'domino-stickers.json'),
            mapJson
        );

        return true;
    } catch (error) {
        console.error('Error saving sticker map:', error);
        return false;
    }
};

/**
 * Load the sticker map from storage
 */
const loadStickerMap = () => {
    try {
        const filePath = path.join(__dirname, '..', 'data', 'domino-stickers.json');

        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            const mapObj = JSON.parse(data);

            // Clear and reload the map
            stickerMap.clear();
            for (const [key, value] of Object.entries(mapObj)) {
                stickerMap.set(key, value);
            }

            console.log(`Loaded ${stickerMap.size} domino sticker mappings`);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error loading sticker map:', error);
        return false;
    }
};

// Initialize when this module is loaded
initStickerDetection();
loadStickerMap();

module.exports = {
    registerDominoSticker,
    detectDominoFromSticker,
    findMatchingCardInHand,
    initStickerDetection
};