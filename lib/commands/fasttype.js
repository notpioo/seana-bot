
const activeGames = new Map();
const logger = require('../utils/logger');
const User = require('../../database/models/User');

// Word list for the game
const words = [
    // Technology
    "algoritma", "komputer", "internet", "database", "javascript", "python", "aplikasi", "website", "server", "cloud",
    "program", "software", "hardware", "network", "firewall", "browser", "keyboard", "monitor", "printer", "router",
    "laptop", "tablet", "smartphone", "gadget", "bluetooth", "wireless", "processor", "memory", "storage", "interface",
    
    // Daily Objects
    "televisi", "kulkas", "microwave", "blender", "dispenser", "kompor", "kipas", "remote", "charger", "headset",
    "earphone", "speaker", "kamera", "proyektor", "scanner", "flashdisk", "hardisk", "powerbank", "adaptor", "terminal",
    
    // Activities
    "menulis", "membaca", "belajar", "bekerja", "bermain", "berjalan", "berlari", "berenang", "memasak", "makan",
    "minum", "tidur", "bangun", "mandi", "berpakaian", "berbicara", "mendengar", "melihat", "berpikir", "bernyanyi",
    
    // Nature
    "matahari", "bulan", "bintang", "awan", "hujan", "petir", "pelangi", "gunung", "laut", "sungai",
    "danau", "hutan", "padang", "pantai", "pulau", "lautan", "samudra", "daratan", "benua", "planet",
    
    // Animals
    "kucing", "anjing", "burung", "ikan", "kura", "kelinci", "hamster", "merpati", "ayam", "bebek",
    "sapi", "kambing", "kerbau", "kuda", "zebra", "jerapah", "gajah", "harimau", "singa", "beruang",
    
    // Food & Drinks
    "nasi", "mie", "roti", "pizza", "burger", "sushi", "sashimi", "dimsum", "bakso", "soto",
    "rendang", "sate", "gado", "pecel", "rujak", "kopi", "teh", "susu", "jus", "sirup",
    
    // Professions
    "dokter", "guru", "pilot", "polisi", "tentara", "perawat", "koki", "petani", "nelayan", "penjahit",
    "sopir", "montir", "arsitek", "insinyur", "pengacara", "hakim", "wartawan", "fotografer", "penyanyi", "pelukis",
    
    // Places
    "rumah", "sekolah", "kantor", "restoran", "hotel", "mall", "pasar", "toko", "bank", "perpustakaan",
    "museum", "stadion", "bioskop", "terminal", "bandara", "pelabuhan", "taman", "kebun", "pantai", "gunung",
    
    // Transportation
    "mobil", "motor", "sepeda", "bus", "kereta", "pesawat", "kapal", "perahu", "truk", "taksi",
    
    // Colors
    "merah", "kuning", "hijau", "biru", "ungu", "orange", "putih", "hitam", "abu", "coklat",
    
    // Clothes
    "baju", "celana", "jaket", "kemeja", "kaos", "rok", "dress", "sweater", "hoodie", "sandal",
    "sepatu", "topi", "dasi", "kacamata", "gelang", "kalung", "cincin", "anting", "jam", "sabuk",
    
    // Emotions
    "senang", "sedih", "marah", "takut", "cemas", "gembira", "bahagia", "kecewa", "bosan", "semangat",
    
    // Weather
    "cerah", "mendung", "hujan", "gerimis", "badai", "angin", "panas", "dingin", "lembab", "kering"
];

function getRandomWord() {
    return {
        word: words[Math.floor(Math.random() * words.length)],
        category: 'random'
    };
}

async function endGame(sock, chatId, msg) {
    try {
        const game = activeGames.get(chatId);
        if (!game) return;

        // Sort players by time
        const sortedPlayers = Array.from(game.players.entries())
            .sort((a, b) => a[1] - b[1]);

        let resultText = `🎮 *FAST TYPE SELESAI!*\n\n` +
                        `📝 Kata: ${game.word}\n\n` +
                        `🏆 Hasil:\n`;

        const rewards = game.difficulty === 'Hard' ? 
            [500, 300, 150] : [300, 200, 100];
        
        for (let i = 0; i < sortedPlayers.length && i < 3; i++) {
            const [playerId, time] = sortedPlayers[i];
            resultText += `${i + 1}. @${playerId.split('@')[0]} (${(time/1000).toFixed(2)}s)\n`;
            
            // Update balance
            try {
                const user = await User.getUser(playerId);
                if (user) {
                    await User.model.findOneAndUpdate(
                        { jid: playerId },
                        { $inc: { balance: rewards[i] } }
                    );
                }
            } catch (err) {
                logger.error('Error updating user balance:', err);
            }
        }

        await sock.sendMessage(chatId, {
            text: resultText,
            mentions: sortedPlayers.map(([id]) => id),
            quoted: msg
        });

        activeGames.delete(chatId);
    } catch (error) {
        logger.error('Error ending game:', error);
    }
}

async function handleAnswer(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || msg.key.remoteJid;
        
        if (!activeGames.has(chatId)) return;

        const game = activeGames.get(chatId);
        const answer = msg.message?.conversation?.toLowerCase() || 
                      msg.message?.extendedTextMessage?.text?.toLowerCase();

        if (answer === game.word && !game.players.has(senderId)) {
            const timeElapsed = Date.now() - game.startTime;
            game.players.set(senderId, timeElapsed);

            // Get current rankings
            const sortedPlayers = Array.from(game.players.entries())
                .sort((a, b) => a[1] - b[1]);
            
            let rankText = `🏃 *STATUS PERMAINAN!*\n\n`;
            
            for (let i = 0; i < sortedPlayers.length; i++) {
                const [playerId, time] = sortedPlayers[i];
                rankText += `${i + 1}. @${playerId.split('@')[0]} (${(time/1000).toFixed(2)}s)\n`;
            }

            await sock.sendMessage(chatId, {
                text: rankText,
                mentions: sortedPlayers.map(([id]) => id),
                quoted: msg
            });

            // If we have 3 players, end the game
            if (game.players.size >= 3) {
                await endGame(sock, chatId, msg);
            }
        }
    } catch (error) {
        logger.error('Error handling answer:', error);
    }
}

async function fastTypeHandler(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        
        // Clear any stale games that might exist
        if (activeGames.has(chatId)) {
            const game = activeGames.get(chatId);
            const timePassed = Date.now() - game.startTime;
            
            // If game is older than 30 seconds, consider it stale
            if (timePassed > 30000) {
                activeGames.delete(chatId);
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ Masih ada permainan fast type yang berlangsung!',
                    quoted: msg
                });
                return;
            }
        }

        // Select random word and create game
        const { word, category } = getRandomWord();
        const game = {
            word: word,
            category: category,
            startTime: Date.now(),
            players: new Map(),
            difficulty: word.length > 6 ? 'Hard' : 'Easy'
        };
        
        activeGames.set(chatId, game);

        const reward = game.difficulty === 'Hard' ? 
            { first: 500, second: 300, third: 150 } : 
            { first: 300, second: 200, third: 100 };

        await sock.sendMessage(chatId, { 
            text: `🎮 *FAST TYPE*\n\n` +
                  `⌨️ Ketik kata berikut secepat mungkin:\n` +
                  `*${word}*\n\n` +
                  `⏱️ Waktu: 30 detik\n\n` +
                  `💰 Reward:\n` +
                  `🥇 Tercepat: ${reward.first} balance\n` +
                  `🥈 Kedua: ${reward.second} balance\n` +
                  `🥉 Ketiga: ${reward.third} balance`,
            quoted: msg
        });

        // Game timeout after 30 seconds
        setTimeout(async () => {
            const currentGame = activeGames.get(chatId);
            if (currentGame) {
                await endGame(sock, chatId, msg);
            }
        }, 30000);

    } catch (error) {
        logger.error('Error in fast type handler:', error);
        if (msg?.key?.remoteJid) {
            activeGames.delete(msg.key.remoteJid);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Terjadi kesalahan saat memulai permainan',
                quoted: msg
            });
        }
    }
}

module.exports = {
    fastTypeHandler,
    handleAnswer
};
