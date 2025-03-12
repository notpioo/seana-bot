const fs = require('fs').promises;
const path = require('path');
const User = require('../../database/models/User'); // Added User model import

async function menuHandler(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const menuFilePath = path.join(__dirname, '../../config', 'menu.json');

        let menuContent = "";
        try {
            const fileData = await fs.readFile(menuFilePath, 'utf8');
            const menuData = JSON.parse(fileData);
            menuContent = menuData.menu || "";
        } catch (error) {
            // Jika file tidak ada atau terjadi error, gunakan menu default
            menuContent = `
━━━┗Seana Bot┛━━━

↓━━━━┗MENU┛━━━━↓

━━━━━━┗AI┛━━━━━━━
• .sea

━━━━━┗OWNER┛━━━━━
• .ban
• .unban
• .addprem 
• .delprem
• .addbalance
• .delbalance
• .addlimit
• .dellimit
• .setpp

━━━━┗GROUP┛━━━━
• .add
• .kick

━━━┗DOWNLOAD┛━━━
• .ttnowm Ⓛ
• .tiktoknowmⓁ

━━━━━┗GAME┛━━━━━
• .inventory
• .math 
• .suit 
• .ttt
• .dice
• .fish
• .fasttype
• .susunkata
• .tebakangka
• .tebakbom

━━━━┗Editor┛━━━━
• .sticker Ⓛ

━━━━┗SEARCH┛━━━━
• .spotify Ⓛ

━━━━
`;
        }

        // Proses variabel dalam menu jika ada
        // Contoh: Ganti {pushname} dengan nama pengguna
        const pushname = msg.pushName || 'User';
        const prefix = '.'; // Atau ambil dari config
        const namebot = 'Seana Bot'; // Atau ambil dari config

        // Menentukan ucapan berdasarkan waktu Indonesia (WIB)
        const jakartaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
        const jakartaDate = new Date(jakartaTime);
        const hour = jakartaDate.getHours();

        let ucapan = "Selamat Pagi";

        if (hour >= 4 && hour < 12) {
            ucapan = "Selamat Pagi";
        } else if (hour >= 12 && hour < 15) {
            ucapan = "Selamat Siang";
        } else if (hour >= 15 && hour < 18) {
            ucapan = "Selamat Sore";
        } else if (hour >= 18 || hour < 4) {
            ucapan = "Selamat Malam";
        }


        // Tanggal dan waktu
        const now = new Date();
        const tanggal = now.toLocaleDateString('id-ID', {
            weekday: 'long',
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

        // Sender ID - Removing @s.whatsapp.net
        const sender = msg.key.participant?.split('@')[0] || msg.key.remoteJid?.split('@')[0];


        // Mengambil data pengguna dari database
        let limit, balance, status;
        try {
            const user = await User.findOne({ id: sender });
            if (user) {
                limit = user.limit || '10';
                balance = user.balance || '1000';
                status = user.status || 'Free';
            } else {
                limit = '10';
                balance = '1000';
                status = 'Free';
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            limit = '10';
            balance = '1000';
            status = 'Free';
        }



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
            .replace(/{wib}/g, wib)
            .replace(/{wita}/g, wita)
            .replace(/{wit}/g, wit)
            .replace(/{sender}/g, sender)
            .replace(/{limit}/g, limit)
            .replace(/{balance}/g, balance)
            .replace(/{status}/g, status)
            .replace(/{runtime}/g, runtime)
            .replace(/{hari}/g, hari);

        // Kirim menu ke pengguna
        await sock.sendMessage(chatId, { 
            text: menuContent 
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in menu handler:', error);
        const chatId = msg.key.remoteJid;
        await sock.sendMessage(chatId, { 
            text: '❌ Terjadi kesalahan saat memuat menu.' 
        }, { quoted: msg });
    }
}

module.exports = {
    menuHandler
};