const User = require('../../database/models/User');
const logger = require('../utils/logger');

// Daftar kata untuk permainan
const words = [
    // Kata sehari-hari
    "indonesia", "komputer", "handphone", "keyboard", "monitor",
    "laptop", "printer", "speaker", "mouse", "headset",
    "terminal", "program", "internet", "website", "aplikasi",
    "database", "jaringan", "sistem", "memori","buku","pensil",
    "kertas","meja","kursi","lemari","kasur","bantal","selimut",
    "lampu","kulkas","kompor","sendok","garpu","pisau","piring",
    "gelas","mangkok","sisir","sikat","sabun","shampoo","boneka",
    "topi","baju","celana","sepatu","sandal","tas","jam","kalender",
    "kunci","dompet","uang","kartu","baterai","charger","kabel",
    "kamera","teleskop","mikroskop","termometer","jamur","bawang",
    "cabai","wortel","kentang","tomat","mentimun","terong","bayam",
    "kangkung","sawi","kol","buncis","kacang","kacang hijau","television",
    "radio","kulkas","kompor","sendok","garpu","pisau","gelas","plastik",
    "kayu","besi","aluminium","tembaga","emas","perak","rumah","kantor",
    "sekolah","rumah sakit","masjid","gereja","pura","kuil","stasiun",
    "bandara","pelabuhan","terminal","taman","kebun","sawah","ladang",
    "hutan","gunung","sungai","danau","laut","samudra","pulau","benua",
    "negara","kota","desa","kecamatan","provinsi","kabupaten","kampung",
    "jalan","taman","toko","pasar","mall","restoran","cafe","warung",
    "kantin","hotel","motel","penginapan","villa","apartemen","gedung",
    "pabrik","gudang","lapangan","kolam","tangga","jembatan","pintu",
    "jendela","atap","lantai","dinding","plafon","kamar","ruang","halaman",
    "masjid",
    // Kata buah
    "mangga", "pisang", "apel", "jeruk", "anggur","semangka","melon",
    "durian","nangka","sirsak","salak","rambutan","kelapa","nanas",
    "pepaya","jambu","manggis","sawo","srikaya","alpukat","stroberi",
    "kiwi","leci","markisa","mangga","mangga","mangga","mangga",
    // Kata hewan
    "kucing", "anjing", "kelinci", "burung", "ikan","kuda","sapi",
    "kambing","ayam","bebek","domba","babi","ular","kodok","kecoa",
    "semut","lalat","nyamuk","kupu-kupu","labalaba","cicak","katak",
    "tikus","kelabang","kumbang","kura-kura","kadal","buaya","gajah",
    "harimau","singa","beruang","serigala","macan","badak","kanguru",
    "koala","panda","monyet","gorila","simpanse","jerapah","zebra",
    "kuda","kuda laut","dugong","paus",
    // Kata profesi
    "dokter", "guru", "polisi", "pilot", "koki","presiden","menteri","pengusaha",
    "dosen","mahasiswa","pelajar","penyanyi","aktor","aktris","atlet","pemadam",
    "petani","nelayan","tukang","montir","sopir","pelayan","pramugari","pramugara",
    "penjaga","satpam"
];

// Menyimpan state permainan yang sedang berlangsung
const gameState = {};

// Function to get random word from words array
function getRandomWord() {
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
}

// Fungsi untuk mengacak kata dengan dash
function shuffleWord(word) {
    let shuffled = word.split('');
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.join('-');
}

// Fungsi untuk menghitung hadiah berdasarkan waktu
function calculateReward(timeElapsed) {
    // Base reward: 75
    // Bonus maksimal: 75 (total maksimal: 150)
    // Waktu optimal: 0-10 detik
    if (timeElapsed <= 10) {
        return 150; // Hadiah maksimal
    } else if (timeElapsed <= 20) {
        return 125; // 75 + 50 bonus
    } else if (timeElapsed <= 30) {
        return 100; // 75 + 25 bonus
    } else {
        return 75; // Base reward
    }
}

// Handler untuk game susun kata
async function susunKataHandler(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Cek user dan limit
        const user = await User.getUser(senderJid);
        if (!user) {
            await sock.sendMessage(chatId, {
                text: '❌ Anda belum terdaftar! Silahkan daftar terlebih dahulu.',
                quoted: msg
            });
            return;
        }

        // Cek dan kurangi limit
        if (!(await User.useLimit(senderJid))) {
            await sock.sendMessage(chatId, {
                text: '❌ Limit anda habis! Silahkan tunggu reset harian atau upgrade ke premium.',
                quoted: msg
            });
            return;
        }

        // Cek apakah sudah ada permainan yang berlangsung
        if (gameState[chatId] && gameState[chatId].isActive) {
            await sock.sendMessage(chatId, {
                text: '❌ Permainan sedang berlangsung! Silahkan selesaikan terlebih dahulu.',
                quoted: msg
            });
            return;
        }

        // Pilih kata random dan acak
        const originalWord = getRandomWord();
        let scrambledWord = shuffleWord(originalWord);
        
        // Pastikan kata yang diacak berbeda dengan kata asli
        while (scrambledWord === originalWord) {
            scrambledWord = shuffleWord(originalWord);
        }

        // Simpan state permainan dengan ID unik
        const gameId = Date.now().toString();
        gameState[chatId] = {
            gameId,
            originalWord,
            scrambledWord,
            startTime: Date.now(),
            isActive: true,
            hint: `Kata ini terdiri dari ${originalWord.length} huruf`
        };

        // Kirim pesan permainan dimulai
        await sock.sendMessage(chatId, {
            text: `🎮 *SUSUN KATA*\n\n` +
                  `Susun kata berikut menjadi kata yang benar:\n` +
                  `*${scrambledWord}*\n\n` +
                  `⏰ Waktu: 60 detik\n\n` +
                  `💰 Hadiah:\n` +
                  `• 0-10 detik: 150 Balance\n` +
                  `• 11-20 detik: 125 Balance\n` +
                  `• 21-30 detik: 100 Balance\n` +
                  `• >30 detik: 75 Balance`,
            quoted: msg
        });

        // Set timer untuk mengakhiri permainan dengan referensi ke state yang benar
        setTimeout(async () => {
            const currentGame = gameState[chatId];
            if (currentGame && currentGame.gameId === gameId && currentGame.isActive) {
                delete gameState[chatId];
                await sock.sendMessage(chatId, {
                    text: `⏰ Waktu habis!\n\nJawaban yang benar adalah: *${currentGame.originalWord}*`
                });
            }
        }, 60000);

    } catch (error) {
        logger.error('Error in susunkata handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memulai permainan',
            quoted: msg
        });
    }
}

// Handler untuk mengecek jawaban
async function handleSusunKataAnswer(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const answer = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || '';

        // Cek apakah ada permainan yang berlangsung
        const game = gameState[chatId];
        if (!game || !game.isActive) return;

        // Cek jawaban dengan kata asli yang tersimpan di state
        if (answer.toLowerCase() === game.originalWord.toLowerCase()) {
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const timeElapsed = Math.floor((Date.now() - game.startTime) / 1000);
            const reward = calculateReward(timeElapsed);
            
            // Update statistik user
            const user = await User.getUser(senderJid);
            if (user) {
                await User.updateUser(senderJid, {
                    balance: user.balance + reward,
                    'susunkata.wins': (user.susunkata?.wins || 0) + 1,
                    'susunkata.profit': (user.susunkata?.profit || 0) + reward
                });
            }

            // Akhiri permainan dengan menghapus state
            delete gameState[chatId];

            // Kirim pesan kemenangan
            await sock.sendMessage(chatId, {
                text: `🎉 Selamat @${senderJid.split('@')[0]}!\n\n` +
                      `Kamu berhasil menyusun kata dengan benar!\n` +
                      `✨ Kata: *${game.originalWord}*\n` +
                      `⏱️ Waktu: *${timeElapsed} detik*\n` +
                      `💰 Hadiah: *${reward} Balance*\n\n` +
                      `ketik *.lbsusun* untuk melihat peringkat\n` +
                      `Mainkan lagi dengan mengetik *.susunkata*`,
                mentions: [senderJid],
                quoted: msg
            });
        }
    } catch (error) {
        logger.error('Error in susunkata answer handler:', error);
    }
}

// Handler baru untuk leaderboard susunkata
async function leaderboardSusunHandler(sock, msg) {
    try {
        const users = await User.model.find({
            'susunkata.wins': { $gt: 0 }
        }).sort({
            'susunkata.wins': -1,
            'susunkata.profit': -1
        }).limit(10);

        if (users.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Belum ada data leaderboard susun kata.',
                quoted: msg
            });
            return;
        }

        let leaderboardText = `🏆 *LEADERBOARD SUSUN KATA*\n\n`;
        users.forEach((user, index) => {
            leaderboardText += `${index + 1}. @${user.jid.split('@')[0]}\n` +
                             `   ├ Menang: ${user.susunkata?.wins || 0}x\n` +
                             `   └ Total Profit: ${user.susunkata?.profit || 0} Balance\n\n`;
        });

        await sock.sendMessage(msg.key.remoteJid, {
            text: leaderboardText,
            mentions: users.map(user => user.jid),
            quoted: msg
        });

    } catch (error) {
        logger.error('Error in susunkata leaderboard handler:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat mengambil leaderboard',
            quoted: msg
        });
    }
}

module.exports = {
    susunKataHandler,
    handleSusunKataAnswer,
    leaderboardSusunHandler,
    gameState
};