// lib/commands/stickertext.js
const { Sticker } = require('wa-sticker-formatter');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const Jimp = require('jimp');

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

async function createTextSticker(text) {
    // Create new image with Jimp - Changed to white background '#FFFFFF'
    const image = new Jimp(512, 512, '#FFFFFF');
    
    // Load font - Changed to black font
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    
    // Get text dimensions
    const maxWidth = 480;
    let lines = [];
    let words = text.split(' ');
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
        const text = msg.message?.conversation?.slice(4) || 
                    msg.message?.extendedTextMessage?.text?.slice(4) || 
                    msg.message?.imageMessage?.caption?.slice(4) || '';

        if (!text) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Masukkan text untuk dijadikan sticker!\nContoh: .st Hello World',
                quoted: msg
            });
            return;
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: '⏳ Sedang membuat sticker text...',
            quoted: msg
        });

        const tempPath = createTempFolder();
        const outputFileName = generateRandomFileName();
        const pngPath = path.join(tempPath, `${outputFileName}.png`);

        // Create image with text
        const image = await createTextSticker(text);
        await image.writeAsync(pngPath);

        // Convert to sticker
        const sticker = new Sticker(pngPath, {
            pack: 'Created by',
            author: 'Bot',
            type: 'full',
            quality: 50
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