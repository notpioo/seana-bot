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

async function convertToWebp(inputPath, outputPath, isVideo, inputSize) {
    // Hitung parameter kompresi berdasarkan ukuran input
    const getCompressionParams = (fileSize) => {
        // Ukuran dalam MB
        const sizeMB = fileSize / (1024 * 1024);
        
        if (sizeMB <= 1) {
            return {
                quality: 80,
                compression: 4,
                bitrate: '256k'
            };
        } else if (sizeMB <= 2) {
            return {
                quality: 60,
                compression: 5,
                bitrate: '192k'
            };
        } else if (sizeMB <= 3) {
            return {
                quality: 45,
                compression: 6,
                bitrate: '128k'
            };
        } else {
            return {
                quality: 30,
                compression: 6,
                bitrate: '96k'
            };
        }
    };

    const params = getCompressionParams(inputSize);

    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 3;

        const attemptConversion = (quality, bitrate) => {
            return new Promise((resolveAttempt, rejectAttempt) => {
                const ffmpegCommand = ffmpeg(inputPath)
                    .toFormat('webp')
                    .addOutputOptions(['-vcodec', 'libwebp'])
                    .on('end', () => {
                        // Cek ukuran output
                        const outputSize = fs.statSync(outputPath).size;
                        if (outputSize <= 1000000) { // Jika dibawah 1MB
                            resolveAttempt(true);
                        } else {
                            resolveAttempt(false);
                        }
                    })
                    .on('error', (err) => rejectAttempt(err));

                if (isVideo) {
                    ffmpegCommand
                        .addOutputOptions([
                            '-vf', `scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white@0.0,fps=12`,
                            '-loop', '0',
                            '-preset', 'default',
                            '-an',
                            '-vsync', '0',
                            '-t', '10',
                            '-compression_level', params.compression.toString(),
                            '-quality', quality.toString(),
                            '-lossless', '0',
                            '-b:v', bitrate
                        ])
                        .size('512x512')
                        .aspect('1:1')
                        .fps(12);
                } else {
                    ffmpegCommand
                        .addOutputOptions([
                            '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white@0.0',
                            '-compression_level', params.compression.toString(),
                            '-quality', quality.toString(),
                            '-lossless', '0'
                        ])
                        .size('512x512');
                }

                ffmpegCommand.saveToFile(outputPath);
            });
        };

        const tryConversion = async () => {
            attempts++;
            const currentQuality = params.quality - (attempts - 1) * 15; // Kurangi quality setiap percobaan
            const currentBitrate = parseInt(params.bitrate) - (attempts - 1) * 32 + 'k'; // Kurangi bitrate setiap percobaan

            try {
                const success = await attemptConversion(currentQuality, currentBitrate);
                if (success) {
                    resolve();
                } else if (attempts < maxAttempts) {
                    // Jika masih terlalu besar, coba lagi dengan kualitas lebih rendah
                    tryConversion();
                } else {
                    reject(new Error('Tidak dapat mengkompresi sticker ke ukuran yang sesuai'));
                }
            } catch (error) {
                reject(error);
            }
        };

        tryConversion();
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

            // Pass ukuran input file ke fungsi konversi
            const inputSize = fs.statSync(inputPath).size;
            await convertToWebp(inputPath, outputFile, isVideo, inputSize);

            await sock.sendMessage(msg.key.remoteJid, {
                sticker: fs.readFileSync(outputFile)
            });

            // Cleanup
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputFile);
        } catch (error) {
            console.error('Detailed conversion error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ ' + (error.message || 'Terjadi kesalahan saat membuat sticker'),
                quoted: msg
            });
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