const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');

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

function convertToWebp(inputPath, outputPath, isVideo) {
    return new Promise((resolve, reject) => {
        const ffmpegCommand = ffmpeg(inputPath)
            .toFormat('webp')
            .on('end', () => resolve())
            .on('error', (err) => reject(err));

        if (isVideo) {
            ffmpegCommand
                .size('512x512')
                .aspect('1:1')
                .fps(12)
                .videoBitrate('128k')
                .videoFilters([
                    'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease',
                    'pad=512:512:-1:-1:color=white@0.0',
                    'fps=12'
                ])
                .duration(10)
                .saveToFile(outputPath);
        } else {
            ffmpegCommand
                .size('512x512')
                .videoFilters([
                    'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease',
                    'pad=512:512:-1:-1:color=white@0.0'
                ])
                .saveToFile(outputPath);
        }
    });
}

async function stickerHandler(sock, msg) {
    try {
        let mediaMessage = null;
        let downloadableMsg = null;
        
        // Handle direct view once message
        if (msg.message?.viewOnceMessage?.message) {
            mediaMessage = msg.message.viewOnceMessage.message;
            downloadableMsg = msg;
        }
        else if (msg.message?.viewOnceMessageV2?.message) {
            mediaMessage = msg.message.viewOnceMessageV2.message;
            downloadableMsg = msg;
        }
        // Handle reply to view once message
        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            if (quotedMsg.viewOnceMessage) {
                mediaMessage = quotedMsg.viewOnceMessage.message;
            } else {
                mediaMessage = quotedMsg;
            }
            downloadableMsg = {
                key: {
                    ...msg.key,
                    id: msg.message.extendedTextMessage.contextInfo.stanzaId
                },
                message: mediaMessage
            };
        }
        // Handle normal message
        else {
            mediaMessage = msg.message;
            downloadableMsg = msg;
        }

        // Check media type with expanded paths
        const isImage = 
            mediaMessage?.imageMessage ||
            mediaMessage?.viewOnceMessageV2?.message?.imageMessage ||
            mediaMessage?.viewOnceMessage?.message?.imageMessage ||
            mediaMessage?.ephemeralMessage?.message?.imageMessage;
            
        const isVideo = 
            mediaMessage?.videoMessage ||
            mediaMessage?.viewOnceMessageV2?.message?.videoMessage ||
            mediaMessage?.viewOnceMessage?.message?.videoMessage ||
            mediaMessage?.ephemeralMessage?.message?.videoMessage;

        if (!isImage && !isVideo) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kirim atau reply gambar/video dengan caption .sticker atau .s',
                quoted: msg
            });
            return;
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: '⏳ Sedang membuat sticker...',
            quoted: msg
        });

        const tempPath = createTempFolder();
        const inputFile = path.join(tempPath, generateRandomFileName());
        const outputFile = path.join(tempPath, `${generateRandomFileName()}.webp`);

        try {
            const buffer = await downloadMediaMessage(
                downloadableMsg,
                'buffer',
                {},
            );

            const extension = isVideo ? '.mp4' : '.jpg';
            const inputPath = inputFile + extension;
            fs.writeFileSync(inputPath, buffer);

            await convertToWebp(inputPath, outputFile, isVideo);

            await sock.sendMessage(msg.key.remoteJid, {
                sticker: fs.readFileSync(outputFile)
            });

            // Cleanup
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputFile);
        } catch (downloadError) {
            throw new Error(`Failed to download media: ${downloadError.message}`);
        }

    } catch (error) {
        console.error('Error in sticker handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat membuat sticker',
            quoted: msg
        });
    }
}

module.exports = {
    stickerHandler
};