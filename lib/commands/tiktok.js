// lib/commands/tiktok.js

const axios = require('axios');
const User = require('../../database/models/User');

async function tiktokHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const user = User.getUser(senderJid);

        // Cek apakah user terdaftar
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Kamu belum terdaftar! Silahkan daftar terlebih dahulu.',
                quoted: msg
            });
            return;
        }

        // Cek limit user
        if (!User.useLimit(senderJid)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Limit kamu sudah habis! Silahkan tunggu reset limit harian atau upgrade ke premium.',
                quoted: msg
            });
            return;
        }

        // Ambil URL dari pesan
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        const url = body.split(' ')[1];

        // Validasi URL
        if (!url || !url.includes('tiktok.com')) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ URL tidak valid! Gunakan format: .ttnowm [URL TikTok]',
                quoted: msg
            });
            return;
        }

        // Kirim pesan sedang memproses
        const processingMsg = await sock.sendMessage(msg.key.remoteJid, {
            text: '⏳ Sedang memproses video...',
            quoted: msg
        });

        // Konfigurasi request ke RapidAPI
        const options = {
            method: 'GET',
            url: 'https://tiktok-video-no-watermark2.p.rapidapi.com/',
            params: {
                url: url,
                hd: '1'
            },
            headers: {
                'x-rapidapi-key': 'b986f8d213msha1fbc9ed0828927p1dd44djsn487232937197',
                'x-rapidapi-host': 'tiktok-video-no-watermark2.p.rapidapi.com'
            }
        };

        // Request ke RapidAPI
        const response = await axios.request(options);
        console.log('API Response:', JSON.stringify(response.data, null, 2)); // Debug log

        if (response.data && response.data.data) {
            const videoData = response.data.data;
            
            // Cek apakah URL video tersedia
            if (!videoData.play) {
                throw new Error('Video URL not found in response');
            }

            // Hapus pesan processing
            await sock.sendMessage(msg.key.remoteJid, { 
                delete: processingMsg.key 
            });

            // Kirim video dengan informasi yang tersedia
            let caption = `✅ Download berhasil!\n\n`;
            
            // Tambahkan informasi jika tersedia
            if (videoData.title) caption += `📝 Title: ${videoData.title}\n`;
            if (videoData.author?.unique_id) caption += `👤 Author: @${videoData.author.unique_id}\n`;
            if (videoData.author?.nickname) caption += `📛 Nickname: ${videoData.author.nickname}\n`;
            
            caption += `\n_Video ini didownload menggunakan SeanaBot_`;

            await sock.sendMessage(msg.key.remoteJid, {
                video: {
                    url: videoData.play
                },
                caption: caption
            });
        } else {
            throw new Error('Invalid response structure from API');
        }

    } catch (error) {
        console.error('Error in tiktok handler:', error);
        
        // Kirim pesan error yang lebih deskriptif
        const errorMessage = error.response?.data?.message || error.message;
        await sock.sendMessage(msg.key.remoteJid, {
            text: `❌ Gagal mendownload video!\n\nError: ${errorMessage}\n\nPastikan:\n1. URL valid\n2. Video tidak di private\n3. Video masih tersedia`,
            quoted: msg
        });
    }
}

module.exports = { tiktokHandler };