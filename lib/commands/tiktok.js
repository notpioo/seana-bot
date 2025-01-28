const User = require('../../database/models/User');
const axios = require('axios');

// Fungsi untuk mengekstrak video ID dari URL TikTok
function extractVideoId(url) {
    try {
        // Handle berbagai format URL TikTok
        const patterns = [
            /\/video\/(\d+)/,                    // Format: /video/7093219391759764782
            /\/v\/(\d+)/,                        // Format: /v/7093219391759764782
            /video\/(\d+)/,                      // Format: video/7093219391759764782
            /\/@[\w.-]+\/video\/(\d+)/           // Format: /@username/video/7093219391759764782
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    } catch (error) {
        console.error('Error extracting video ID:', error);
        return null;
    }
}

async function tiktokHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Check user limit
        const user = User.getUser(senderJid);
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ User tidak terdaftar!', 
                quoted: msg 
            });
            return;
        }

        if (!User.useLimit(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Limit anda habis! Tunggu besok atau upgrade ke premium!', 
                quoted: msg 
            });
            return;
        }

        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        const args = body.split(' ');

        if (args.length < 2) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Masukkan link TikTok! Contoh: .ttnowm https://www.tiktok.com/@username/video/1234567890', 
                quoted: msg 
            });
            return;
        }

        const tiktokUrl = args[1];
        if (!tiktokUrl.match(/tiktok\.com/)) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Link tidak valid! Pastikan link dari TikTok', 
                quoted: msg 
            });
            return;
        }

        // Extract video ID
        const videoId = extractVideoId(tiktokUrl);
        if (!videoId) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Tidak dapat menemukan ID video dari link yang diberikan!', 
                quoted: msg 
            });
            return;
        }

        // Send processing message
        await sock.sendMessage(msg.key.remoteJid, { 
            text: '⏳ Sedang memproses video...', 
            quoted: msg 
        });

        // RapidAPI configuration
        const options = {
            method: 'GET',
            url: 'https://tiktok-video-no-watermark2.p.rapidapi.com/comment/reply',
            params: {
                video_id: videoId,
                comment_id: '7093219663211053829', // Default comment ID
                count: '10',
                cursor: '0'
            },
            headers: {
                'X-RapidAPI-Key': 'b986f8d213msha1fbc9ed0828927p1dd44djsn487232937197',
                'X-RapidAPI-Host': 'tiktok-video-no-watermark2.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        
        if (response.data && response.data.video_url) {
            // Send the video
            await sock.sendMessage(msg.key.remoteJid, { 
                video: { url: response.data.video_url },
                caption: '✅ Download berhasil!\n\nPowered by SeanaBOT',
                quoted: msg 
            });
        } else {
            throw new Error('Failed to get video URL from API response');
        }

    } catch (error) {
        console.error('Error in tiktok handler:', error);
        await sock.sendMessage(msg.key.remoteJid, { 
            text: '❌ Gagal mengunduh video! Pastikan link valid dan dapat diakses', 
            quoted: msg 
        });
    }
}

module.exports = { tiktokHandler };