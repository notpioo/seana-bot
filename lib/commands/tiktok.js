const User = require('../../database/models/User');
const axios = require('axios');

// Fungsi untuk mengekstrak video ID dari URL TikTok
async function getVideoDetails(url) {
    try {
        // Konfigurasi untuk API TikTok
        const options = {
            method: 'GET',
            url: 'https://tiktok-video-no-watermark2.p.rapidapi.com/info',
            params: { url: url },
            headers: {
                'X-RapidAPI-Key': 'b986f8d213msha1fbc9ed0828927p1dd44djsn487232937197',
                'X-RapidAPI-Host': 'tiktok-video-no-watermark2.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        return response.data;
    } catch (error) {
        console.error('Error mendapatkan detail video:', error);
        return null;
    }
}

// Fungsi untuk mengunduh video TikTok
async function downloadTikTokVideo(url) {
    try {
        const options = {
            method: 'GET',
            url: 'https://tiktok-video-no-watermark2.p.rapidapi.com/download',
            params: { url: url },
            headers: {
                'X-RapidAPI-Key': 'b986f8d213msha1fbc9ed0828927p1dd44djsn487232937197',
                'X-RapidAPI-Host': 'tiktok-video-no-watermark2.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        return response.data;
    } catch (error) {
        console.error('Error mengunduh video:', error);
        return null;
    }
}

async function tiktokHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Cek limit pengguna
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
                text: '❌ Masukkan link TikTok!\nContoh: .ttnowm https://www.tiktok.com/@username/video/1234567890', 
                quoted: msg 
            });
            return;
        }

        const tiktokUrl = args[1];

        // Validasi URL
        if (!tiktokUrl.includes('tiktok.com')) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Link tidak valid! Pastikan link dari TikTok', 
                quoted: msg 
            });
            return;
        }

        // Kirim pesan sedang memproses
        await sock.sendMessage(msg.key.remoteJid, { 
            text: '⏳ Sedang memproses video...', 
            quoted: msg 
        });

        // Dapatkan informasi video
        const videoInfo = await getVideoDetails(tiktokUrl);
        if (!videoInfo) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Gagal mendapatkan informasi video!', 
                quoted: msg 
            });
            return;
        }

        // Unduh video
        const downloadData = await downloadTikTokVideo(tiktokUrl);
        if (!downloadData || !downloadData.video_url) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Gagal mengunduh video!', 
                quoted: msg 
            });
            return;
        }

        // Kirim video
        await sock.sendMessage(msg.key.remoteJid, { 
            video: { url: downloadData.video_url },
            caption: `✅ Download berhasil!\n\n👤 Author: ${videoInfo.author?.nickname || 'Unknown'}\n📝 Desc: ${videoInfo.description || '-'}\n\nPowered by SeanaBOT`,
            quoted: msg 
        });

    } catch (error) {
        console.error('Error dalam tiktok handler:', error);
        await sock.sendMessage(msg.key.remoteJid, { 
            text: '❌ Gagal mengunduh video! Pastikan link valid dan dapat diakses', 
            quoted: msg 
        });
    }
}

module.exports = { tiktokHandler };