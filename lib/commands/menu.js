const fs = require('fs').promises;
const path = require('path');
const User = require('../../database/models/User');

async function menuHandler(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const menuFilePath = path.join(__dirname, '../../config', 'menu.json');

        let menuContent = "";
        try {
            const fileData = await fs.readFile(menuFilePath, 'utf8');
            menuContent = JSON.parse(fileData).menu || 
            `
╔━━━━「 *SEANA-BOT* 」━━━━
║
║ Hai, {pushname}
║ {ucapan}
║
║ Tanggal: {tanggal}
║ Hari: {hari}
║ Waktu: {wib} WIB
║
║ Status: {status}
║ Saldo: Rp{balance}
║ Limit: {limit}
║
╚━━━━━━━━━━━━━━━━━━━
`;
        } catch (error) {
            console.error('Error reading menu file:', error);
            menuContent = `
╔━━━━「 *SEANA-BOT* 」━━━━
║
║ Hai, {pushname}
║ {ucapan}
║
║ Tanggal: {tanggal}
║ Hari: {hari}
║ Waktu: {wib} WIB
║
║ Status: {status}
║ Saldo: Rp{balance}
║ Limit: {limit}
║
╚━━━━
`;
        }

        // Proses variabel dalam menu jika ada
        // Contoh: Ganti {pushname} dengan nama pengguna
        const pushname = msg.pushName || 'User';
        const prefix = '.'; // Atau ambil dari config
        const namebot = 'Seana Bot'; // Atau ambil dari config

        // Menentukan ucapan berdasarkan waktu
        const now = new Date();
        const hour = now.getHours();
        let ucapan = "Selamat Pagi";

        if (hour >= 4 && hour < 12) {
            ucapan = "Selamat Pagi";
        } else if (hour >= 12 && hour < 15) {
            ucapan = "Selamat Siang";
        } else if (hour >= 15 && hour < 18) {
            ucapan = "Selamat Sore";
        } else {
            ucapan = "Selamat Malam";
        }

        // Tanggal dan waktu
        const tanggal = now.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const wib = now.toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Jakarta'
        });

        const wita = now.toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Makassar'
        });

        const wit = now.toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Jayapura'
        });

        // Sender ID
        const sender = msg.key.participant || msg.key.remoteJid;

        // Mengambil data pengguna dari database
        const userInstance = new User();
        const userData = await userInstance.getUser(sender);

        // Menggunakan data dari database atau nilai default jika tidak ada
        const status = userData?.status || 'Free';
        const balance = userData?.balance?.toLocaleString() || '0';
        const limit = userData?.status === 'premium' ? 'Unlimited' : (userData?.limit?.toString() || '0');

        // Hari
        const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];

        // Runtime (contoh: waktu sejak bot dijalankan)
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const runtime = `${hours}h ${minutes}m ${seconds}s`;

        // Proses variabel dalam menu
        menuContent = menuContent
            .replace(/{pushname}/g, pushname)
            .replace(/{prefix}/g, prefix)
            .replace(/{namebot}/g, namebot)
            .replace(/{ucapan}/g, ucapan)
            .replace(/{tanggal}/g, tanggal)
            .replace(/{hari}/g, hari)
            .replace(/{wib}/g, wib)
            .replace(/{wita}/g, wita)
            .replace(/{wit}/g, wit)
            .replace(/{balance}/g, balance)
            .replace(/{limit}/g, limit)
            .replace(/{status}/g, status)
            .replace(/{runtime}/g, runtime);

        // Kirim menu ke pengguna
        await sock.sendMessage(chatId, { 
            text: menuContent 
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in menu handler:', error);
        const chatId = msg.key.remoteJid;
        await sock.sendMessage(chatId, { 
            text: '❌ Terjadi kesalahan saat memproses menu' 
        }, { quoted: msg });
    }
}

module.exports = { menuHandler };