// werewolf.js
const User = require('../../database/models/User');

// Menyimpan state permainan
const activeGames = new Map();

// Peran yang tersedia
const roles = {
    WEREWOLF: 'werewolf',
    VILLAGER: 'warga',
    SEER: 'seer',
    WITCH: 'witch',
    GUARDIAN: 'guardian'
};

// Distribusi peran berdasarkan jumlah pemain (sama seperti sebelumnya)
const roleDistribution = {
    4: [
        { role: roles.WEREWOLF, count: 1 },
        { role: roles.SEER, count: 1 },
        { role: roles.VILLAGER, count: 2 }
    ],
    5: [
        { role: roles.WEREWOLF, count: 1 },
        { role: roles.SEER, count: 1 },
        { role: roles.GUARDIAN, count: 1 },
        { role: roles.VILLAGER, count: 2 }
    ],
    6: [
        { role: roles.WEREWOLF, count: 2 },
        { role: roles.SEER, count: 1 },
        { role: roles.WITCH, count: 1 },
        { role: roles.VILLAGER, count: 2 }
    ],
    7: [
        { role: roles.WEREWOLF, count: 2 },
        { role: roles.SEER, count: 1 },
        { role: roles.WITCH, count: 1 },
        { role: roles.GUARDIAN, count: 1 },
        { role: roles.VILLAGER, count: 2 }
    ],
    8: [
        { role: roles.WEREWOLF, count: 2 },
        { role: roles.SEER, count: 1 },
        { role: roles.WITCH, count: 1 },
        { role: roles.GUARDIAN, count: 1 },
        { role: roles.VILLAGER, count: 3 }
    ]
};

// Handler untuk memulai permainan werewolf
const werewolfHandler = async (sock, msg) => {
    const chatId = msg.key.remoteJid;
    const senderId = msg.key.participant || msg.key.remoteJid;
    
    // Verifikasi limit user
    const user = await User.getUser(senderId);
    if (!user) {
        await sock.sendMessage(chatId, { 
            text: '❌ Kamu belum terdaftar! Ketik .menu untuk melihat cara mendaftar.',
            quoted: msg 
        });
        return;
    }

    if (!await User.useLimit(senderId)) {
        await sock.sendMessage(chatId, { 
            text: '❌ Limit kamu sudah habis! Ketik .limit untuk mengecek limit.',
            quoted: msg 
        });
        return;
    }
    
    // Cek apakah sudah ada game yang berjalan
    if (activeGames.has(chatId)) {
        await sock.sendMessage(chatId, { 
            text: '❌ Masih ada permainan Werewolf yang sedang berlangsung di grup ini!',
            quoted: msg 
        });
        return;
    }
    
    // Inisialisasi game baru
    activeGames.set(chatId, {
        status: 'WAITING',
        players: [{
            id: senderId,
            number: senderId.split('@')[0],
            name: user.username || user.name
        }],
        phase: null,
        votes: new Map(),
        timeouts: [],
        roles: new Map(),
        nightActions: new Map(),
        deaths: []
    });
    
    await sock.sendMessage(chatId, { 
        text: `🐺 *WEREWOLF GAME*\n\n` +
              `Game dimulai oleh @${senderId.split('@')[0]}\n\n` +
              `Minimal: 4 pemain\n` +
              `Maksimal: 8 pemain\n\n` +
              `Ketik .joinww untuk bergabung\n` +
              `Ketik .startww untuk memulai permainan\n\n` +
              `⏱️ Waktu pendaftaran: 60 detik`,
        mentions: [senderId],
        quoted: msg
    });
    
    // Set timeout untuk pendaftaran
    setTimeout(async () => {
        const game = activeGames.get(chatId);
        if (game && game.status === 'WAITING') {
            await sock.sendMessage(chatId, { 
                text: '⏱️ Waktu pendaftaran habis! Game dibatalkan.',
                quoted: msg 
            });
            activeGames.delete(chatId);
        }
    }, 60000);
};

// Handler untuk join game
const joinWerewolfHandler = async (sock, msg) => {
    const chatId = msg.key.remoteJid;
    const senderId = msg.key.participant || msg.key.remoteJid;
    
    // Verifikasi user
    const user = await User.getUser(senderId);
    if (!user) {
        await sock.sendMessage(chatId, { 
            text: '❌ Kamu belum terdaftar! Ketik .menu untuk melihat cara mendaftar.',
            quoted: msg 
        });
        return;
    }

    const game = activeGames.get(chatId);
    if (!game) {
        await sock.sendMessage(chatId, { 
            text: '❌ Tidak ada permainan Werewolf yang sedang menunggu pemain.',
            quoted: msg 
        });
        return;
    }
    
    if (game.status !== 'WAITING') {
        await sock.sendMessage(chatId, { 
            text: '❌ Permainan sudah dimulai!',
            quoted: msg 
        });
        return;
    }
    
    // Cek apakah pemain sudah bergabung
    if (game.players.some(p => p.id === senderId)) {
        await sock.sendMessage(chatId, { 
            text: '❌ Kamu sudah bergabung dalam permainan!',
            quoted: msg 
        });
        return;
    }
    
    // Cek maksimal pemain
    if (game.players.length >= 8) {
        await sock.sendMessage(chatId, { 
            text: '❌ Permainan sudah penuh (8 pemain)!',
            quoted: msg 
        });
        return;
    }
    
    // Tambahkan pemain baru
    game.players.push({
        id: senderId,
        number: senderId.split('@')[0],
        name: user.username || user.name
    });
    
    await sock.sendMessage(chatId, { 
        text: `✅ @${senderId.split('@')[0]} bergabung ke dalam permainan!\n\n` +
              `👥 Jumlah pemain: ${game.players.length}/8`,
        mentions: [senderId],
        quoted: msg
    });
};

// Handler untuk memulai game
const startWerewolfHandler = async (sock, msg) => {
    const chatId = msg.key.remoteJid;
    const game = activeGames.get(chatId);
    
    if (!game) {
        await sock.sendMessage(chatId, { 
            text: '❌ Tidak ada permainan Werewolf yang sedang menunggu pemain.',
            quoted: msg 
        });
        return;
    }
    
    if (game.status !== 'WAITING') {
        await sock.sendMessage(chatId, { 
            text: '❌ Permainan sudah dimulai!',
            quoted: msg 
        });
        return;
    }
    
    // Cek minimal pemain
    if (game.players.length < 4) {
        await sock.sendMessage(chatId, { 
            text: '❌ Minimal 4 pemain untuk memulai permainan!',
            quoted: msg 
        });
        return;
    }
    
    // Bagikan peran
    const distribution = roleDistribution[game.players.length];
    let availablePlayers = [...game.players];
    
    for (const roleInfo of distribution) {
        for (let i = 0; i < roleInfo.count; i++) {
            const randomIndex = Math.floor(Math.random() * availablePlayers.length);
            const player = availablePlayers[randomIndex];
            game.roles.set(player.id, roleInfo.role);
            availablePlayers.splice(randomIndex, 1);
            
            // Kirim peran ke masing-masing pemain
            await sock.sendMessage(player.id, { 
                text: `🎭 *PERAN KAMU DI WEREWOLF*\n\n` +
                      `Kamu adalah: ${roleInfo.role.toUpperCase()}\n\n` +
                      `Instruksi akan diberikan saat giliranmu.`
            });
        }
    }
    
    game.status = 'PLAYING';
    game.phase = 'NIGHT';
    
    // Mulai fase malam
    await startNightPhase(sock, chatId);
};

// Fungsi untuk memulai fase malam
const startNightPhase = async (sock, chatId) => {
    const game = activeGames.get(chatId);
    if (!game) return;
    
    game.phase = 'NIGHT';
    game.nightActions.clear();
    
    await sock.sendMessage(chatId, { 
        text: `🌙 *MALAM HARI*\n\n` +
              `Semua pemain tertidur...\n` +
              `Para pemain dengan peran khusus akan menerima pesan pribadi.\n\n` +
              `⏱️ Waktu: 30 detik`,
        quoted: msg
    });
    
    // Kirim instruksi ke pemain dengan peran khusus
    for (const [playerId, role] of game.roles.entries()) {
        if (role === roles.WEREWOLF) {
            const targets = game.players
                .filter(p => game.roles.get(p.id) !== roles.WEREWOLF && !game.deaths.includes(p.id))
                .map(p => `${p.number}`);
            
            await sock.sendMessage(playerId, { 
                text: `🐺 *GILIRAN WEREWOLF*\n\n` +
                      `Pilih targetmu:\n\n` +
                      targets.map((t, i) => `${i + 1}. @${t}`).join('\n') + '\n\n' +
                      `Balas dengan nomor target.`,
                mentions: targets.map(t => `${t}@s.whatsapp.net`)
            });
        } else if (role === roles.SEER) {
            const targets = game.players
                .filter(p => p.id !== playerId && !game.deaths.includes(p.id))
                .map(p => `${p.number}`);
            
            await sock.sendMessage(playerId, { 
                text: `👁️ *GILIRAN SEER*\n\n` +
                      `Pilih pemain yang ingin dilihat identitasnya:\n\n` +
                      targets.map((t, i) => `${i + 1}. @${t}`).join('\n') + '\n\n' +
                      `Balas dengan nomor pemain.`,
                mentions: targets.map(t => `${t}@s.whatsapp.net`)
            });
        }
        // Tambahkan peran khusus lainnya di sini
    }
    
    // Set timeout untuk fase malam
    setTimeout(async () => {
        if (game.phase === 'NIGHT') {
            await startDayPhase(sock, chatId);
        }
    }, 30000);
};

// Fungsi untuk memulai fase siang
const startDayPhase = async (sock, chatId) => {
    const game = activeGames.get(chatId);
    if (!game) return;
    
    game.phase = 'DAY';
    game.votes.clear();

    // Proses hasil malam
    let nightReport = '🌅 *PAGI HARI*\n\n';
    
    // Proses kematian
    if (game.nightActions.has('werewolf_kill')) {
        const victimId = game.nightActions.get('werewolf_kill');
        game.deaths.push(victimId);
        const victim = game.players.find(p => p.id === victimId);
        nightReport += `☠️ @${victim.number} telah mati dimakan Werewolf!\n`;
    }

    // Cek kondisi 1v1
    const alivePlayers = game.players.filter(p => !game.deaths.includes(p.id));
    const aliveWerewolves = alivePlayers.filter(p => game.roles.get(p.id) === roles.WEREWOLF);
    const aliveVillagers = alivePlayers.filter(p => game.roles.get(p.id) !== roles.WEREWOLF);

    // Jika tersisa 1 werewolf dan 1 villager, langsung menang werewolf
    if (aliveWerewolves.length === 1 && aliveVillagers.length === 1) {
        await sock.sendMessage(chatId, { 
            text: nightReport,
            mentions: game.players.map(p => p.id),
            quoted: msg
        });
        return await checkWinCondition(sock, chatId);
    }

    // Buat list pemain yang masih hidup untuk voting
    const voteCandidates = alivePlayers.map(player => ({
        player,
        id: player.id,
        name: player.name || `Player ${player.number}` // Use name if available, otherwise use Player + number
    }));

    // Kirim polling menggunakan fitur list WhatsApp
    await sock.sendMessage(chatId, {
        text: nightReport + '\n' +
              `Waktu untuk voting! Pilih pemain yang mencurigakan.\n\n` +
              `⏱️ Waktu diskusi: 60 detik`,
        mentions: game.players.map(p => p.id),
        quoted: msg
    });

    // Create and send poll
    const poll = await sock.sendMessage(chatId, {
        poll: {
            name: "VOTING WEREWOLF GAME",
            values: voteCandidates.map(c => c.name),
            selectableCount: 1
        }
    });
    
    // Store poll message ID for later reference
    game.currentPoll = poll.key.id;
    
    // Set timeout for voting
    game.timeouts.push(setTimeout(async () => {
        if (game.phase === 'DAY') {
            await processVoting(sock, chatId);
        }
    }, 60000));
};

// Handler untuk voting
const handleVote = async (sock, msg) => {
    const chatId = msg.key.remoteJid;
    const senderId = msg.key.participant || msg.key.remoteJid;
    
    const game = activeGames.get(chatId);
    if (!game || game.phase !== 'DAY') return;
    
    // Proses voting
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned || mentioned.length === 0) {
        await sock.sendMessage(chatId, { 
            text: '❌ Tag pemain yang ingin di-vote!',
            quoted: msg
        });
        return;
    }
    
    const targetId = mentioned[0];
    if (game.deaths.includes(targetId)) {
        await sock.sendMessage(chatId, { 
            text: '❌ Pemain tersebut sudah mati!',
            quoted: msg
        });
        return;
    }
    
    game.votes.set(senderId, targetId);
    
    await sock.sendMessage(chatId, { 
        text: `✅ @${senderId.split('@')[0]} vote untuk @${targetId.split('@')[0]}`,
        mentions: [senderId, targetId],
        quoted: msg
    });
};

// Fungsi untuk memproses hasil voting
const processVoting = async (sock, chatId) => {
    const game = activeGames.get(chatId);
    if (!game) return;

    try {
        // Get poll results
        const pollResults = await sock.getMessage(chatId, game.currentPoll);
        if (!pollResults?.messageContextInfo?.pollUpdates) {
            throw new Error('Could not get poll results');
        }

        const votes = pollResults.messageContextInfo.pollUpdates;
        
        // Count votes
        const voteCount = new Map();
        const alivePlayers = game.players.filter(p => !game.deaths.includes(p.id));
        
        votes.forEach(vote => {
            const targetIndex = vote.selectedOptions[0];
            const target = alivePlayers[targetIndex];
            if (target) {
                voteCount.set(target.id, (voteCount.get(target.id) || 0) + 1);
            }
        });

        // Find player with most votes
        let maxVotes = 0;
        let eliminated = null;

        for (const [targetId, voteCount] of voteCount.entries()) {
            if (voteCount > maxVotes) {
                maxVotes = voteCount;
                eliminated = targetId;
            }
        }

        if (eliminated) {
            game.deaths.push(eliminated);
            const eliminatedPlayer = game.players.find(p => p.id === eliminated);
            const role = game.roles.get(eliminated);

            await sock.sendMessage(chatId, {
                text: `🗳️ *HASIL VOTING*\n\n` +
                      `@${eliminatedPlayer.number} telah dieksekusi!\n` +
                      `Dia adalah seorang ${role.toUpperCase()}!`,
                mentions: [eliminated],
                quoted: msg
            });
        } else {
            await sock.sendMessage(chatId, {
                text: '🗳️ *HASIL VOTING*\n\n' +
                      'Tidak ada yang dieksekusi hari ini.',
                quoted: msg
            });
        }

        // Cek kondisi kemenangan
        await checkWinCondition(sock, chatId);
        
    } catch (error) {
        console.error('Error processing votes:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Terjadi kesalahan saat memproses hasil voting.',
            quoted: msg
        });
    }
};

// Fungsi untuk mengecek kondisi kemenangan
const checkWinCondition = async (sock, chatId) => {
    const game = activeGames.get(chatId);
    if (!game) return;

    const alivePlayers = game.players.filter(p => !game.deaths.includes(p.id));
    const aliveWerewolves = alivePlayers.filter(p => game.roles.get(p.id) === roles.WEREWOLF);
    const aliveVillagers = alivePlayers.filter(p => game.roles.get(p.id) !== roles.WEREWOLF);

    let winners = null;
    let winningTeam = null;
    const REWARD_AMOUNT = 1000;

    if (aliveWerewolves.length >= aliveVillagers.length) {
        winners = aliveWerewolves;
        winningTeam = 'WEREWOLF';
    } else if (aliveWerewolves.length === 0) {
        winners = aliveVillagers;
        winningTeam = 'VILLAGER';
    }

    if (winners) {
        let rewardText = '';
        
        // Process rewards one by one like in other games
        for (const winner of winners) {
            try {
                const newBalance = await User.addBalance(winner.number, REWARD_AMOUNT);
                if (newBalance !== false) {
                    rewardText += `@${winner.number}: +${REWARD_AMOUNT} balance → ${newBalance} balance\n`;
                }
            } catch (error) {
                console.error(`Error giving reward to ${winner.number}:`, error);
            }
        }

        await sock.sendMessage(chatId, {
            text: `🎮 *GAME OVER*\n\n` +
                  `Tim ${winningTeam} Menang! 🎉\n\n` +
                  `Pemenang:\n${rewardText}\n` +
                  `Peran semua pemain:\n` +
                  game.players.map(p => `@${p.number}: ${game.roles.get(p.id).toUpperCase()}`).join('\n'),
            mentions: game.players.map(p => p.id),
            quoted: msg
        });

        // Clear game data
        activeGames.delete(chatId);
    } else {
        // Continue to next night
        setTimeout(() => startNightPhase(sock, chatId), 5000);
    }
};

// Handler untuk menerima aksi malam dari Werewolf
const handleWerewolfAction = async (sock, msg) => {
    const chatId = msg.key.remoteJid;
    const senderId = msg.key.participant || msg.key.remoteJid;
    
    const game = activeGames.values().next().value;
    if (!game || game.phase !== 'NIGHT') return;
    
    if (game.roles.get(senderId) !== roles.WEREWOLF) return;
    
    const choice = parseInt(msg.message.conversation);
    const targets = game.players.filter(p => 
        game.roles.get(p.id) !== roles.WEREWOLF && 
        !game.deaths.includes(p.id)
    );
    
    if (isNaN(choice) || choice < 1 || choice > targets.length) {
        await sock.sendMessage(senderId, {
            text: '❌ Pilihan tidak valid!',
            quoted: msg
        });
        return;
    }
    
    const target = targets[choice - 1];
    game.nightActions.set('werewolf_kill', target.id);
    
    await sock.sendMessage(senderId, {
        text: `✅ Kamu memilih untuk membunuh @${target.number}`,
        mentions: [target.id],
        quoted: msg
    });
};

// Handler untuk menerima aksi malam dari Seer
const handleSeerAction = async (sock, msg) => {
    const chatId = msg.key.remoteJid;
    const senderId = msg.key.participant || msg.key.remoteJid;
    
    const game = activeGames.values().next().value;
    if (!game || game.phase !== 'NIGHT') return;
    
    if (game.roles.get(senderId) !== roles.SEER) return;
    
    const choice = parseInt(msg.message.conversation);
    const targets = game.players.filter(p => 
        p.id !== senderId && 
        !game.deaths.includes(p.id)
    );
    
    if (isNaN(choice) || choice < 1 || choice > targets.length) {
        await sock.sendMessage(senderId, {
            text: '❌ Pilihan tidak valid!',
            quoted: msg
        });
        return;
    }
    
    const target = targets[choice - 1];
    const targetRole = game.roles.get(target.id);
    
    await sock.sendMessage(senderId, {
        text: `👁️ Hasil penglihatan:\n\n` +
              `@${target.number} adalah seorang ${targetRole.toUpperCase()}`,
        mentions: [target.id],
        quoted: msg
    });
};

// Handler untuk membatalkan permainan
const handleCancelWerewolf = async (sock, msg) => {
    const chatId = msg.key.remoteJid;
    const game = activeGames.get(chatId);
    
    if (!game) {
        await sock.sendMessage(chatId, {
            text: '❌ Tidak ada permainan Werewolf yang sedang berlangsung.',
            quoted: msg
        });
        return;
    }
    
    // Batalkan semua timeout
    for (const timeout of game.timeouts) {
        clearTimeout(timeout);
    }
    
    // Hapus game
    activeGames.delete(chatId);
    
    await sock.sendMessage(chatId, {
        text: '🚫 Permainan Werewolf telah dibatalkan.',
        quoted: msg
    });
};

// Export semua handler
module.exports = {
    werewolfHandler,
    joinWerewolfHandler,
    startWerewolfHandler,
    handleVote,
    handleWerewolfAction,
    handleSeerAction,
    handleCancelWerewolf,
    activeGames
};
