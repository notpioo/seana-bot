
const axios = require('axios');
const User = require('../../database/models/User');

async function youtubeHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const user = User.getUser(senderJid);

        // Check if user is registered
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum terdaftar! Silahkan daftar terlebih dahulu.',
                quoted: msg
            });
            return;
        }

        // Check user limit
        if (!User.useLimit(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Limit kamu sudah habis! Silahkan tunggu reset limit harian atau upgrade ke premium.',
                quoted: msg
            });
            return;
        }

        // Get URL from message
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        const url = body.split(' ')[1];

        // Validate URL
        if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ URL tidak valid! Gunakan format: .yt [URL YouTube]',
                quoted: msg
            });
            return;
        }

        // Send processing message
        const processingMsg = await sock.sendMessage(msg.key.remoteJid, {
            text: '⏳ Sedang memproses video...',
            quoted: msg
        });

        const encodedParams = new URLSearchParams();
        encodedParams.set('url', url);

        // Extract video ID from URL
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1]?.split('?')[0];
        if (!videoId) {
            throw new Error('Could not extract video ID from URL');
        }

        const options = {
            method: 'GET',
            url: 'https://youtube-media-downloader.p.rapidapi.com/v2/video/details',
            params: { videoId },
            headers: {
                'x-rapidapi-key': 'b986f8d213msha1fbc9ed0828927p1dd44djsn487232937197',
                'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com'
            }
        };

        // Request to RapidAPI
        const response = await axios.request(options);
        console.log('API Response:', JSON.stringify(response.data, null, 2)); // Debug log

        if (response.data && response.data.status === 'ok') {
            const videoData = response.data.video;
            
            // Delete processing message
            await sock.sendMessage(msg.key.remoteJid, { 
                delete: processingMsg.key 
            });

            // Create caption with video information
            let caption = `✅ Download berhasil!\n\n`;
            if (videoData.title) caption += `📝 Title: ${videoData.title}\n`;
            if (videoData.author) caption += `👤 Author: ${videoData.author}\n`;
            if (videoData.duration) caption += `⏱️ Duration: ${videoData.duration}\n`;
            
            caption += `\n_Video ini didownload menggunakan SeanaBot_`;

            // Get best quality video URL
            const videoUrl = videoData.formats.find(f => f.quality === '720p' || f.quality === '480p')?.url;
            
            if (!videoUrl) {
                throw new Error('No suitable video quality found');
            }

            // Send video
            await sock.sendMessage(msg.key.remoteJid, {
                video: {
                    url: videoUrl
                },
                caption: caption,
                mimetype: 'video/mp4'
            });
        } else {
            throw new Error('Invalid response structure from API');
        }

    } catch (error) {
        console.error('Error in youtube handler:', error);
        
        const errorMessage = error.response?.data?.message || error.message;
        await sock.sendMessage(msg.key.remoteJid, {
            text: `❌ Gagal mendownload video!\n\nError: ${errorMessage}\n\nPastikan:\n1. URL valid\n2. Video tidak private\n3. Video masih tersedia`,
            quoted: msg
        });
    }
}

module.exports = { youtubeHandler };
