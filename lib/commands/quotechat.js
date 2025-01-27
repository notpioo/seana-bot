const { Sticker } = require('wa-sticker-formatter');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const axios = require('axios');

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

async function downloadProfilePic(sock, jid) {
    try {
        const ppUrl = await sock.profilePictureUrl(jid, 'image');
        const response = await axios.get(ppUrl, { responseType: 'arraybuffer' });
        return response.data;
    } catch (error) {
        return null;
    }
}

async function getParticipantName(sock, jid) {
    try {
        // Coba dapatkan contact info
        const contact = await sock.contacts?.[jid];
        if (contact?.notify) return contact.notify;
        if (contact?.verifiedName) return contact.verifiedName;
        if (contact?.name) return contact.name;
        
        // Jika tidak ada di contacts, coba ambil dari profile
        try {
            const [result] = await sock.onWhatsApp(jid);
            if (result?.exists) {
                return result.name || jid.split('@')[0];
            }
        } catch (err) {
            console.log('Error getting WhatsApp info:', err);
        }
        
        // Fallback ke nomor jika tidak dapat nama
        return jid.split('@')[0];
    } catch (error) {
        console.log('Error getting participant name:', error);
        return jid.split('@')[0];
    }
}

async function createQuoteSticker(quotedMsg, profileBuffer, sock) {
    try {
        // Significantly increased dimensions
        const width = 2048;  // Increased from 1536
        const height = 512;  // Increased from 384
        const image = new Jimp(width, height, 0x00000000);

        // Larger profile picture
        let avatar;
        if (profileBuffer) {
            avatar = await Jimp.read(profileBuffer);
        } else {
            avatar = new Jimp(160, 160, '#757575'); // Increased from 120
        }
        avatar.resize(160, 160).circle();
        image.composite(avatar, 80, 80); // Adjusted position

        // Even larger fonts
        const nameFont = await Jimp.loadFont(Jimp.FONT_SANS_128_BLACK); // Increased from 64
        const messageFont = await Jimp.loadFont(Jimp.FONT_SANS_128_BLACK); // Increased from 64

        // Get message content
        let message = '';
        if (quotedMsg.message?.stickerMessage) {
            message = '[Sticker]';
        } else {
            message = quotedMsg.message?.conversation || 
                     quotedMsg.message?.extendedTextMessage?.text || 
                     'No message';
        }

        // Get and resolve sender name
        const senderId = quotedMsg.key.participant || quotedMsg.key.remoteJid;
        const senderName = quotedMsg.pushName || await getParticipantName(sock, senderId);

        // Draw sender name with orange color
        const nameImage = new Jimp(800, 80, 0x00000000); // Increased width
        nameImage.print(nameFont, 0, 0, {
            text: senderName,
            alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
        });
        nameImage.color([{ apply: 'xor', params: ['#FF9933'] }]);
        image.composite(nameImage, 280, 90); // Adjusted position

        // Create improved chat bubble
        const bubbleWidth = Math.min(Jimp.measureText(messageFont, message) + 160, width - 320);
        const bubbleHeight = 200; // Increased height
        const bubble = new Jimp(bubbleWidth, bubbleHeight, '#FFFFFF');

        // Improved corner rounding
        const radius = 40; // Increased radius
        const circle = new Jimp(radius * 2, radius * 2, 0x00000000);
        circle.circle({ radius: radius });

        // Apply rounded corners
        bubble.composite(circle, 0, 0);
        bubble.composite(circle, bubbleWidth - radius * 2, 0);
        bubble.composite(circle, 0, bubbleHeight - radius * 2);
        bubble.composite(circle, bubbleWidth - radius * 2, bubbleHeight - radius * 2);

        // Add message text
        bubble.print(messageFont, 40, 60, { // Adjusted padding
            text: message,
            alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
        });

        // Add bubble to main image
        image.composite(bubble, 280, 180); // Adjusted position

        return image;
    } catch (error) {
        console.error('Error creating quote sticker:', error);
        throw error;
    }
}

async function quoteChatHandler(sock, msg) {
    try {
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (!quotedMessage) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Reply pesan yang ingin dijadikan sticker quote!',
                quoted: msg
            });
            return;
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: '⏳ Sedang membuat quote sticker...',
            quoted: msg
        });

        const profileBuffer = await downloadProfilePic(sock, quotedParticipant);
        const tempPath = createTempFolder();
        const outputFileName = generateRandomFileName();
        const pngPath = path.join(tempPath, `${outputFileName}.png`);

        const quotedMsg = {
            pushName: msg.message.extendedTextMessage.contextInfo.pushName,
            message: quotedMessage,
            key: {
                participant: quotedParticipant,
                remoteJid: msg.key.remoteJid
            }
        };

        const image = await createQuoteSticker(quotedMsg, profileBuffer, sock);
        await image.writeAsync(pngPath);

        const sticker = new Sticker(pngPath, {
            pack: 'Bot',
            author: 'Bot',
            type: 'full',
            quality: 100,
            background: '#00000000'
        });

        const stickerBuffer = await sticker.toBuffer();

        await sock.sendMessage(msg.key.remoteJid, {
            sticker: stickerBuffer
        });

        fs.unlinkSync(pngPath);

    } catch (error) {
        console.error('Error in quote chat handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat membuat quote sticker',
            quoted: msg
        });
    }
}

module.exports = {
    quoteChatHandler
};