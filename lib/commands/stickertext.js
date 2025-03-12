const { Sticker } = require('wa-sticker-formatter');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const Jimp = require('jimp');
const emoji = require('node-emoji');

function createTempFolder() {
    const tempPath = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
    }
    return tempPath;
}

function generateRandomFileName() {
    return randomBytes(16).toString('hex');
}

function preprocessText(text) {
    // Convert emoji to :emoji_name: format
    return emoji.replace(text, (emoji) => ` ${emoji} `);
}

async function createTextSticker(text) {
    // Create new image with Jimp
    const image = new Jimp(512, 512, '#FFFFFF');

    // Load font
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);

    // Preprocess text to handle emoji better
    const processedText = preprocessText(text);

    // Get text dimensions
    const maxWidth = 480;
    let lines = [];
    let words = processedText.split(' ').filter(word => word.length > 0);
    let currentLine = words[0];

    // Word wrap
    for (let i = 1; i < words.length; i++) {
        let word = words[i];
        let width = Jimp.measureText(font, currentLine + " " + word);
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);

    // Calculate vertical position to center text
    const lineHeight = 80;
    const totalHeight = lines.length * lineHeight;
    let y = (512 - totalHeight) / 2;

    // Print each line
    for (let line of lines) {
        const width = Jimp.measureText(font, line);
        const x = (512 - width) / 2;
        image.print(font, x, y, line);
        y += lineHeight;
    }

    return image;
}

async function stickertextHandler(sock, msg) {
    try {
        const body = msg.message?.conversation || 
            msg.message?.extendedTextMessage?.text || 
            msg.message?.imageMessage?.caption || '';

        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Extract text after command
        const text = body.slice(4).trim();

        if (!text) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Teks tidak ditemukan. Gunakan: .st text',
                quoted: msg 
            });
            return;
        }

        // Show processing message
        await sock.sendMessage(msg.key.remoteJid, { 
            react: {
                text: "⏳",
                key: msg.key
            }
        });

        const tempPath = createTempFolder();
        const outputFileName = generateRandomFileName();
        const pngPath = path.join(tempPath, `${outputFileName}.png`);

        // Create image with text
        const image = await createTextSticker(text);
        await image.writeAsync(pngPath);


        const buffer = await Jimp.read(pngPath);

        // Get latest configuration (from settings.json)
        const settings = require('../../config/settings');
        const config = await settings.getBotConfig(true);


        // Create sticker with config values
        const sticker = new Sticker(buffer, {
            pack: config.packname || 'BabyChand Sticker',
            author: config.authorname || 'Text Sticker',
            type: 'full',
            categories: ['🎨', '✏️'],
            id: '12345',
            quality: 50,
            background: '#00000000'
        });

        const stickerBuffer = await sticker.toBuffer();

        // Send sticker
        await sock.sendMessage(msg.key.remoteJid, {
            sticker: stickerBuffer
        });

        // Cleanup
        fs.unlinkSync(pngPath);

    } catch (error) {
        console.error('Error in stickertext handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat membuat sticker text',
            quoted: msg
        });
    }
}

module.exports = {
    stickertextHandler
};