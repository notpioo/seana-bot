// File: lib/commands/werewolf.js

const Game = require('../database/models/Game');
const werewolfRooms = new Map(); // Menyimpan ruangan aktif

/**
 * Struktur ruangan:
 * {
 *   id: String (ID Grup),
 *   creator: String (JID Pembuat),
 *   players: Array<{jid: String, name: String, role: String, isDead: Boolean, isReady: Boolean}>,
 *   status: String ("waiting", "night", "day", "discussion", "voting"),
 *   phase: Number (Urutan siklus permainan),
 *   votingResults: Map<String, String> (Pemilih -> Target),
 *   nightActions: Map<String, Object> (Pelaku -> Aksi),
 *   timer: NodeJS.Timeout,
 *   timeLeft: Number (detik)
 * }
 */

// Pengaturan game
const ROLES = {
  VILLAGER: "Warga Desa",
  WEREWOLF: "Werewolf",
  SEER: "Peramal",
  GUARDIAN: "Guardian",
  LYCAN: "Lycan",
  WITCH: "Witch",
  HUNTER: "Hunter"
};

const ROLE_DESCRIPTIONS = {
  [ROLES.VILLAGER]: "Bertahan hidup dan menemukan Werewolf",
  [ROLES.WEREWOLF]: "Memangsa warga desa tanpa ketahuan",
  [ROLES.SEER]: "Dapat memeriksa identitas satu pemain setiap malam",
  [ROLES.GUARDIAN]: "Dapat melindungi satu pemain dari serangan Werewolf setiap malam",
  [ROLES.LYCAN]: "Terlihat sebagai Werewolf oleh Seer, padahal sebenarnya adalah Warga Desa",
  [ROLES.WITCH]: "Memiliki 2 ramuan sekali pakai: Heal (menyelamatkan korban) dan Kill (membunuh satu pemain)",
  [ROLES.HUNTER]: "Saat mati dapat membunuh 1 pemain, target dibunuh di akhir fase saat Hunter mati"
};

// Distribusi peran berdasarkan jumlah pemain
const ROLE_DISTRIBUTION = {
  4: [ROLES.WEREWOLF, ROLES.SEER, ROLES.GUARDIAN, ROLES.VILLAGER],
  5: [ROLES.WEREWOLF, ROLES.SEER, ROLES.GUARDIAN, ROLES.VILLAGER, ROLES.VILLAGER],
  6: [ROLES.WEREWOLF, ROLES.SEER, ROLES.GUARDIAN, ROLES.LYCAN, ROLES.VILLAGER, ROLES.VILLAGER],
  7: [ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.SEER, ROLES.GUARDIAN, ROLES.WITCH, ROLES.VILLAGER, ROLES.VILLAGER],
  8: [ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.SEER, ROLES.GUARDIAN, ROLES.WITCH, ROLES.LYCAN, ROLES.VILLAGER, ROLES.VILLAGER],
  9: [ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.SEER, ROLES.GUARDIAN, ROLES.WITCH, ROLES.HUNTER, ROLES.LYCAN, ROLES.VILLAGER, ROLES.VILLAGER]
};

// Durasi fase
const NIGHT_DURATION = 60; // 60 detik
const DAY_DURATION = 30; // 30 detik (pengumuman korban)
const DISCUSSION_DURATION = 300; // 5 menit
const VOTING_DURATION = 60; // 60 detik

/**
 * Membuat ruangan baru
 * @param {*} sock Socket WhatsApp
 * @param {*} msg Pesan
 */
async function wwHandler(sock, msg) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // Pastikan perintah dijalankan di dalam grup
  if (!groupId.endsWith('@g.us')) {
    await sock.sendMessage(groupId, {
      text: "❌ Command ini hanya bisa digunakan di dalam grup",
      quoted: msg
    });
    return;
  }

  // Cek apakah sudah ada ruangan aktif
  if (werewolfRooms.has(groupId)) {
    await sock.sendMessage(groupId, {
      text: "❌ Ruangan Werewolf sudah dibuat di grup ini. Gunakan .wwjoin untuk bergabung!",
      quoted: msg
    });
    return;
  }

  // Dapatkan metadata grup untuk nama dan avatar grup
  let groupMetadata;
  try {
    groupMetadata = await sock.groupMetadata(groupId);
  } catch (error) {
    console.error("Error mendapatkan metadata grup:", error);
    await sock.sendMessage(groupId, {
      text: "❌ Terjadi kesalahan saat membuat room",
      quoted: msg
    });
    return;
  }

  // Dapatkan info pengirim
  const senderName = msg.pushName || "Player";

  // Buat ruangan baru
  const newRoom = {
    id: groupId,
    name: groupMetadata.subject,
    creator: sender,
    players: [{
      jid: sender,
      name: senderName,
      role: null,
      isDead: false,
      isReady: true,
      protectedBy: null,
      attackedBy: [],
      votedBy: []
    }],
    status: "waiting",
    phase: 0,
    votingResults: new Map(),
    nightActions: new Map(),
    witchPotions: { heal: true, kill: true },
    timer: null,
    timeLeft: 0
  };

  werewolfRooms.set(groupId, newRoom);

  // Kirim pesan konfirmasi
  let message = `🐺 *WEREWOLF GAME* 🐺\n\n`;
  message += `Ruangan berhasil dibuat oleh @${sender.split('@')[0]}\n\n`;
  message += `📝 Pemain (1/${Object.keys(ROLE_DISTRIBUTION)[0]}):\n`;
  message += `1. @${sender.split('@')[0]}\n\n`;
  message += `🎮 Ketik .wwjoin untuk bergabung\n`;
  message += `▶️ Ketik .wwstart untuk memulai permainan (hanya pembuat)\n`;
  message += `❓ Ketik .wwhelp untuk melihat peraturan`;

  await sock.sendMessage(groupId, {
    text: message,
    mentions: [sender],
    quoted: msg
  });
}

/**
 * Menangani pemain bergabung ke ruangan
 * @param {*} sock Socket WhatsApp
 * @param {*} msg Pesan
 */
async function wwJoinHandler(sock, msg) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // Pastikan perintah dijalankan di dalam grup
  if (!groupId.endsWith('@g.us')) {
    await sock.sendMessage(groupId, {
      text: "❌ Command ini hanya bisa digunakan di dalam grup",
      quoted: msg
    });
    return;
  }

  // Cek apakah ada ruangan aktif
  if (!werewolfRooms.has(groupId)) {
    await sock.sendMessage(groupId, {
      text: "❌ Belum ada ruangan Werewolf di grup ini. Gunakan .ww untuk membuat ruangan!",
      quoted: msg
    });
    return;
  }

  const room = werewolfRooms.get(groupId);

  // Cek apakah permainan sudah dimulai
  if (room.status !== "waiting") {
    await sock.sendMessage(groupId, {
      text: "❌ Permainan sudah dimulai, tidak bisa bergabung lagi",
      quoted: msg
    });
    return;
  }

  // Cek apakah pemain sudah bergabung
  if (room.players.some(p => p.jid === sender)) {
    await sock.sendMessage(groupId, {
      text: "❌ Anda sudah bergabung dalam permainan ini",
      quoted: msg
    });
    return;
  }

  // Cek apakah ruangan penuh
  const maxPlayers = Math.max(...Object.keys(ROLE_DISTRIBUTION).map(Number));
  if (room.players.length >= maxPlayers) {
    await sock.sendMessage(groupId, {
      text: `❌ Ruangan sudah penuh (maksimal ${maxPlayers} pemain)`,
      quoted: msg
    });
    return;
  }

  // Dapatkan info pengirim
  const senderName = msg.pushName || "Player";

  // Tambahkan pemain ke ruangan
  room.players.push({
    jid: sender,
    name: senderName,
    role: null,
    isDead: false,
    isReady: true,
    protectedBy: null,
    attackedBy: [],
    votedBy: []
  });

  werewolfRooms.set(groupId, room);

  // Kirim pesan konfirmasi
  let message = `🐺 *WEREWOLF GAME* 🐺\n\n`;
  message += `@${sender.split('@')[0]} bergabung ke dalam permainan!\n\n`;
  message += `📝 Pemain (${room.players.length}/${Object.keys(ROLE_DISTRIBUTION)[0]}):\n`;

  const mentions = [];
  room.players.forEach((player, index) => {
    message += `${index + 1}. @${player.jid.split('@')[0]}\n`;
    mentions.push(player.jid);
  });

  message += `\n📊 Status: Menunggu pemain...`;

  // Cek apakah jumlah pemain sudah cukup
  const minPlayers = Math.min(...Object.keys(ROLE_DISTRIBUTION).map(Number));
  if (room.players.length >= minPlayers) {
    message += `\n\n✅ Jumlah pemain sudah cukup! Pembuat room dapat memulai permainan dengan .wwstart`;
  } else {
    message += `\n\n⏳ Minimal ${minPlayers} pemain untuk memulai permainan`;
  }

  await sock.sendMessage(groupId, {
    text: message,
    mentions: mentions,
    quoted: msg
  });
}

/**
 * Memulai permainan Werewolf
 * @param {*} sock Socket WhatsApp
 * @param {*} msg Pesan
 */
async function wwStartHandler(sock, msg) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // Pastikan perintah dijalankan di dalam grup
  if (!groupId.endsWith('@g.us')) {
    await sock.sendMessage(groupId, {
      text: "❌ Command ini hanya bisa digunakan di dalam grup",
      quoted: msg
    });
    return;
  }

  // Cek apakah ada ruangan aktif
  if (!werewolfRooms.has(groupId)) {
    await sock.sendMessage(groupId, {
      text: "❌ Belum ada ruangan Werewolf di grup ini. Gunakan .ww untuk membuat ruangan!",
      quoted: msg
    });
    return;
  }

  const room = werewolfRooms.get(groupId);

  // Cek apakah pengirim adalah pembuat ruangan
  if (room.creator !== sender) {
    await sock.sendMessage(groupId, {
      text: "❌ Hanya pembuat ruangan yang dapat memulai permainan",
      quoted: msg
    });
    return;
  }

  // Cek apakah permainan sudah dimulai
  if (room.status !== "waiting") {
    await sock.sendMessage(groupId, {
      text: "❌ Permainan sudah dimulai",
      quoted: msg
    });
    return;
  }

  // Cek apakah jumlah pemain sudah cukup
  const minPlayers = Math.min(...Object.keys(ROLE_DISTRIBUTION).map(Number));
  if (room.players.length < minPlayers) {
    await sock.sendMessage(groupId, {
      text: `❌ Minimal ${minPlayers} pemain untuk memulai permainan (saat ini ${room.players.length})`,
      quoted: msg
    });
    return;
  }

  const maxPlayers = Math.max(...Object.keys(ROLE_DISTRIBUTION).map(Number));
  if (room.players.length > maxPlayers) {
    await sock.sendMessage(groupId, {
      text: `❌ Maksimal ${maxPlayers} pemain untuk memulai permainan (saat ini ${room.players.length})`,
      quoted: msg
    });
    return;
  }

  // Acak dan bagikan peran
  await distributeRoles(sock, room);

  // Kirim pesan ke grup bahwa permainan dimulai
  let message = `🐺 *WEREWOLF GAME DIMULAI* 🐺\n\n`;
  message += `Peran telah dibagikan ke masing-masing pemain melalui chat pribadi.\n\n`;
  message += `📝 Pemain (${room.players.length}):\n`;

  const mentions = [];
  room.players.forEach((player, index) => {
    message += `${index + 1}. @${player.jid.split('@')[0]}\n`;
    mentions.push(player.jid);
  });

  message += `\n⏳ Permainan akan segera dimulai...`;

  await sock.sendMessage(groupId, {
    text: message,
    mentions: mentions,
    quoted: msg
  });

  // Mulai siklus permainan
  setTimeout(() => {
    startNightPhase(sock, room);
  }, 5000);
}

/**
 * Mendistribusikan peran ke pemain
 * @param {*} sock Socket WhatsApp
 * @param {*} room Room yang akan dimulai
 */
async function distributeRoles(sock, room) {
  const playerCount = room.players.length;

  // Dapatkan distribusi peran berdasarkan jumlah pemain
  let roleDistribution = [...ROLE_DISTRIBUTION[playerCount]];

  // Kocok roleDistribution
  for (let i = roleDistribution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roleDistribution[i], roleDistribution[j]] = [roleDistribution[j], roleDistribution[i]];
  }

  // Bagikan peran ke pemain
  for (let i = 0; i < room.players.length; i++) {
    const player = room.players[i];
    const role = roleDistribution[i];
    player.role = role;

    // Kirim pesan pribadi ke pemain dengan peran mereka
    let message = `🐺 *WEREWOLF GAME* 🐺\n\n`;
    message += `Kamu mendapatkan peran: *${role}*\n\n`;
    message += `Deskripsi: ${ROLE_DESCRIPTIONS[role]}\n\n`;

    // Tambahkan informasi tambahan berdasarkan peran
    if (role === ROLES.WEREWOLF) {
      const otherWerewolves = room.players
        .filter(p => p.role === ROLES.WEREWOLF && p.jid !== player.jid)
        .map(p => `@${p.jid.split('@')[0]}`);

      if (otherWerewolves.length > 0) {
        message += `🐺 Teman Werewolf: ${otherWerewolves.join(', ')}\n\n`;
      } else {
        message += `🐺 Kamu adalah satu-satunya Werewolf.\n\n`;
      }
    }

    message += `⚠️ Jangan beritahu siapapun tentang peranmu!\n`;
    message += `📝 Permainan akan dimulai dari fase malam.`;

    try {
      await sock.sendMessage(player.jid, {
        text: message,
        mentions: room.players
          .filter(p => p.role === ROLES.WEREWOLF)
          .map(p => p.jid)
      });
    } catch (error) {
      console.error(`Error mengirim pesan ke ${player.jid}:`, error);
      // Kirim pesan ke grup bahwa ada error
      await sock.sendMessage(room.id, {
        text: `⚠️ Tidak dapat mengirim pesan ke @${player.jid.split('@')[0]}. Pastikan mereka telah chat bot sebelumnya.`,
        mentions: [player.jid]
      });
    }
  }

  // Update status ruangan
  room.status = "night";
  room.phase = 1;
  werewolfRooms.set(room.id, room);
}

/**
 * Memulai fase malam
 * @param {*} sock Socket WhatsApp
 * @param {*} room Room yang akan dimulai fase malamnya
 */
async function startNightPhase(sock, room) {
  // Reset data malam sebelumnya
  room.nightActions = new Map();
  room.players.forEach(player => {
    player.protectedBy = null;
    player.attackedBy = [];
  });

  // Kirim pesan ke grup bahwa malam telah tiba
  let message = `🌙 *MALAM HARI (${room.phase})* 🌙\n\n`;
  message += `Malam telah tiba, semua penduduk tertidur...\n\n`;
  message += `⏳ Para pemain dengan peran khusus akan mendapat pesan pribadi.\n`;
  message += `⏱️ Waktu: ${NIGHT_DURATION} detik`;

  await sock.sendMessage(room.id, {
    text: message
  });

  // Kirim prompt ke pemain dengan peran khusus
  for (const player of room.players) {
    if (player.isDead) continue;

    try {
      switch (player.role) {
        case ROLES.WEREWOLF:
          await promptWerewolf(sock, room, player);
          break;
        case ROLES.SEER:
          await promptSeer(sock, room, player);
          break;
        case ROLES.GUARDIAN:
          await promptGuardian(sock, room, player);
          break;
        case ROLES.WITCH:
          await promptWitch(sock, room, player);
          break;
      }
    } catch (error) {
      console.error(`Error mengirim prompt ke ${player.jid}:`, error);
    }
  }

  // Atur timer untuk fase malam
  room.timeLeft = NIGHT_DURATION;
  room.timer = setInterval(() => {
    room.timeLeft -= 5;

    // Jika waktu habis atau semua aksi malam sudah dilakukan
    if (room.timeLeft <= 0 || isNightActionsComplete(room)) {
      clearInterval(room.timer);
      resolveNightActions(sock, room);
    }
  }, 5000);

  werewolfRooms.set(room.id, room);
}

/**
 * Prompt untuk Werewolf
 * @param {*} sock Socket WhatsApp
 * @param {*} room Ruangan permainan
 * @param {*} player Pemain Werewolf
 */
async function promptWerewolf(sock, room, player) {
  const werewolves = room.players.filter(p => p.role === ROLES.WEREWOLF && !p.isDead);

  // Cek apakah werewolf lain sudah memilih
  for (const [actorJid, action] of room.nightActions.entries()) {
    if (action.role === ROLES.WEREWOLF && action.action === 'kill') {
      // Beritahu werewolf lain tentang target yang sudah dipilih
      const targetPlayer = room.players.find(p => p.jid === action.targetJid);

      await sock.sendMessage(player.jid, {
        text: `🐺 Werewolf lain telah memilih untuk memangsa ${targetPlayer.name} (@${targetPlayer.jid.split('@')[0]})`,
        mentions: [targetPlayer.jid]
      });

      return;
    }
  }

  // Daftarkan target potensial (pemain yang masih hidup dan bukan werewolf)
  const targets = room.players.filter(p => !p.isDead && p.role !== ROLES.WEREWOLF);

  let message = `🐺 *WEREWOLF ACTION* 🐺\n\n`;
  message += `Pilih pemain yang akan kamu bunuh:\n\n`;

  targets.forEach((target, index) => {
    message += `${index + 1}. ${target.name} (@${target.jid.split('@')[0]})\n`;
  });

  message += `\nBalas dengan angka (1-${targets.length}) untuk memilih target.`;
  message += `\n⏱️ Waktu: ${room.timeLeft} detik`;

  await sock.sendMessage(player.jid, {
    text: message,
    mentions: targets.map(t => t.jid)
  });
}

/**
 * Prompt untuk Seer
 * @param {*} sock Socket WhatsApp
 * @param {*} room Ruangan permainan
 * @param {*} player Pemain Seer
 */
async function promptSeer(sock, room, player) {
  // Cek apakah Seer sudah menggunakan kemampuannya
  if (room.nightActions.has(player.jid)) {
    return;
  }

  // Daftarkan target potensial (pemain lain yang masih hidup)
  const targets = room.players.filter(p => p.jid !== player.jid && !p.isDead);

  let message = `👁️ *SEER ACTION* 👁️\n\n`;
  message += `Pilih pemain yang identitasnya ingin kamu lihat:\n\n`;

  targets.forEach((target, index) => {
    message += `${index + 1}. ${target.name} (@${target.jid.split('@')[0]})\n`;
  });

  message += `\nBalas dengan angka (1-${targets.length}) untuk memilih target.`;
  message += `\n⏱️ Waktu: ${room.timeLeft} detik`;

  await sock.sendMessage(player.jid, {
    text: message,
    mentions: targets.map(t => t.jid)
  });
}

/**
 * Prompt untuk Guardian
 * @param {*} sock Socket WhatsApp
 * @param {*} room Ruangan permainan
 * @param {*} player Pemain Guardian
 */
async function promptGuardian(sock, room, player) {
  // Cek apakah Guardian sudah menggunakan kemampuannya
  if (room.nightActions.has(player.jid)) {
    return;
  }

  // Daftarkan target potensial (semua pemain yang masih hidup)
  const targets = room.players.filter(p => !p.isDead);

  let message = `🛡️ *GUARDIAN ACTION* 🛡️\n\n`;
  message += `Pilih pemain yang ingin kamu lindungi:\n\n`;

  targets.forEach((target, index) => {
    message += `${index + 1}. ${target.name} (@${target.jid.split('@')[0]})\n`;
  });

  message += `\nBalas dengan angka (1-${targets.length}) untuk memilih target.`;
  message += `\n⏱️ Waktu: ${room.timeLeft} detik`;

  await sock.sendMessage(player.jid, {
    text: message,
    mentions: targets.map(t => t.jid)
  });
}

/**
 * Prompt untuk Witch
 * @param {*} sock Socket WhatsApp
 * @param {*} room Ruangan permainan
 * @param {*} player Pemain Witch
 */
async function promptWitch(sock, room, player) {
  // Cek apakah Witch masih punya ramuan
  if (!room.witchPotions.heal && !room.witchPotions.kill) {
    await sock.sendMessage(player.jid, {
      text: `🧙‍♀️ *WITCH ACTION* 🧙‍♀️\n\nKamu sudah menggunakan semua ramuanmu.`
    });
    return;
  }

  // Cek apakah Witch sudah menggunakan kemampuannya malam ini
  if (room.nightActions.has(player.jid)) {
    return;
  }

  // Cari tahu siapa yang akan dibunuh werewolf malam ini
  let victimJid = null;
  for (const [actorJid, action] of room.nightActions.entries()) {
    if (action.role === ROLES.WEREWOLF && action.action === 'kill') {
      victimJid = action.targetJid;
      break;
    }
  }

  // Prompt untuk ramuan heal
  if (room.witchPotions.heal && victimJid) {
    const victim = room.players.find(p => p.jid === victimJid);

    let message = `🧙‍♀️ *WITCH ACTION* 🧙‍♀️\n\n`;
    message += `${victim.name} (@${victim.jid.split('@')[0]}) akan dimangsa werewolf malam ini.\n\n`;
    message += `Apakah kamu ingin menggunakan ramuan Heal untuk menyelamatkannya?\n`;
    message += `Ketik *ya* atau *tidak*\n\n`;
    message += `⏱️ Waktu: ${room.timeLeft} detik`;

    await sock.sendMessage(player.jid, {
      text: message,
      mentions: [victim.jid]
    });

    // Witch akan mendapatkan prompt untuk ramuan Kill setelah menjawab prompt Heal
  } else if (room.witchPotions.kill) {
    // Langsung ke prompt Kill jika tidak ada korban atau ramuan Heal sudah habis
    await promptWitchKill(sock, room, player);
  }
}

/**
 * Prompt Witch untuk ramuan Kill
 * @param {*} sock Socket WhatsApp
 * @param {*} room Ruangan permainan
 * @param {*} player Pemain Witch
 */
async function promptWitchKill(sock, room, player) {
  if (!room.witchPotions.kill) {
    await sock.sendMessage(player.jid, {
      text: `🧙‍♀️ *WITCH ACTION* 🧙‍♀️\n\nKamu sudah menggunakan ramuan Kill.`
    });

    // Catat bahwa Witch sudah selesai bertindak malam ini
    room.nightActions.set(player.jid, {
      role: ROLES.WITCH,
      action: 'none',
      targetJid: null
    });

    return;
  }

  // Daftarkan target potensial (pemain lain yang masih hidup)
  const targets = room.players.filter(p => p.jid !== player.jid && !p.isDead);

  let message = `🧙‍♀️ *WITCH ACTION* 🧙‍♀️\n\n`;
  message += `Apakah kamu ingin menggunakan ramuan Kill?\n\n`;

  if (targets.length > 0) {
    message += `Pilih pemain yang ingin kamu bunuh:\n\n`;
    targets.forEach((target, index) => {
      message += `${index + 1}. ${target.name} (@${target.jid.split('@')[0]})\n`;
    });

    message += `\nBalas dengan angka (1-${targets.length}) untuk memilih target, atau ketik *tidak* untuk tidak menggunakan ramuan.`;
  } else {
    message += `Tidak ada target yang tersedia.`;
  }

  message += `\n⏱️ Waktu: ${room.timeLeft} detik`;

  await sock.sendMessage(player.jid, {
    text: message,
    mentions: targets.map(t => t.jid)
  });
}

/**
 * Cek apakah semua aksi malam telah dilakukan
 * @param {*} room Ruangan permainan
 * @returns {Boolean} True jika semua aksi malam sudah dilakukan
 */
function isNightActionsComplete(room) {
  // Cek Werewolf
  const werewolves = room.players.filter(p => p.role === ROLES.WEREWOLF && !p.isDead);
  let werewolfActed = false;

  for (const [actorJid, action] of room.nightActions.entries()) {
    if (action.role === ROLES.WEREWOLF && action.action === 'kill') {
      werewolfActed = true;
      break;
    }
  }

  if (werewolves.length > 0 && !werewolfActed) {
    return false;
  }

  // Cek Seer
  const seer = room.players.find(p => p.role === ROLES.SEER && !p.isDead);
  if (seer && !room.nightActions.has(seer.jid)) {
    return false;
  }

  // Cek Guardian
  const guardian = room.players.find(p => p.role === ROLES.GUARDIAN && !p.isDead);
  if (guardian && !room.nightActions.has(guardian.jid)) {
    return false;
  }

  // Cek Witch
  const witch = room.players.find(p => p.role === ROLES.WITCH && !p.isDead);
  if (witch && !room.nightActions.has(witch.jid) && (room.witchPotions.heal || room.witchPotions.kill)) {
    return false;
  }

  return true;
}

/**
* Proses dan resolusi aksi malam
* @param {*} sock Socket WhatsApp
* @param {*} room Ruangan permainan
*/
async function resolveNightActions(sock, room) {
  // Daftar pemain yang terbunuh malam ini
  const killedPlayers = [];

  // Proses aksi Guardian
  let protectedJid = null;
  for (const [actorJid, action] of room.nightActions.entries()) {
    if (action.role === ROLES.GUARDIAN && action.action === 'protect') {
      protectedJid = action.targetJid;
      const protectedPlayer = room.players.find(p => p.jid === protectedJid);
      protectedPlayer.protectedBy = actorJid;
      break;
    }
  }

  // Proses aksi Werewolf
  let werewolfVictimJid = null;
  for (const [actorJid, action] of room.nightActions.entries()) {
    if (action.role === ROLES.WEREWOLF && action.action === 'kill') {
      werewolfVictimJid = action.targetJid;
      const victim = room.players.find(p => p.jid === werewolfVictimJid);
      victim.attackedBy.push(actorJid);
      break;
    }
  }

  // Werewolf secara default memilih korban pertama jika tidak ada pilihan
  if (!werewolfVictimJid) {
    const potentialVictims = room.players.filter(p => !p.isDead && p.role !== ROLES.WEREWOLF);
    if (potentialVictims.length > 0) {
      werewolfVictimJid = potentialVictims[0].jid;
      const victim = room.players.find(p => p.jid === werewolfVictimJid);
      victim.attackedBy.push('auto');
    }
  }

  // Proses aksi Witch
  let witchSavedWerewolfVictim = false;
  let witchVictimJid = null;

  for (const [actorJid, action] of room.nightActions.entries()) {
    if (action.role === ROLES.WITCH) {
      if (action.action === 'heal' && action.targetJid === werewolfVictimJid) {
        witchSavedWerewolfVictim = true;
        room.witchPotions.heal = false;
      } else if (action.action === 'kill') {
        witchVictimJid = action.targetJid;
        const victim = room.players.find(p => p.jid === witchVictimJid);
        victim.attackedBy.push(actorJid);
        room.witchPotions.kill = false;
      }
    }
  }

  // Tentukan siapa yang terbunuh
  if (werewolfVictimJid && !witchSavedWerewolfVictim && werewolfVictimJid !== protectedJid) {
    const victim = room.players.find(p => p.jid === werewolfVictimJid);
    killedPlayers.push(victim);
  }

  if (witchVictimJid) {
    const victim = room.players.find(p => p.jid === witchVictimJid);
    killedPlayers.push(victim);
  }

  // Catat kematian
  for (const player of killedPlayers) {
    player.isDead = true;
  }

  // Mulai fase pagi
  room.status = "day";
  werewolfRooms.set(room.id, room);

  await startDayPhase(sock, room, killedPlayers);
}

/**
* Memulai fase pagi
* @param {*} sock Socket WhatsApp
* @param {*} room Ruangan permainan
* @param {*} killedPlayers Array pemain yang terbunuh malam ini
*/
async function startDayPhase(sock, room, killedPlayers) {
  // Kirim pesan ke grup bahwa pagi telah tiba
  let message = `☀️ *PAGI HARI (${room.phase})* ☀️\n\n`;
  message += `Matahari terbit, penduduk desa mulai bangun...\n\n`;

  // Infokan korban malam
  if (killedPlayers.length === 0) {
    message += `✅ Semua penduduk desa selamat pagi ini!\n\n`;
  } else {
    message += `⚰️ *Korban Malam Ini:*\n`;

    // Pisahkan korban Werewolf dan Witch
    const werewolfVictims = killedPlayers.filter(p =>
      p.attackedBy.find(attacker => {
        const attacker_player = room.players.find(pl => pl.jid === attacker);
        return attacker_player && attacker_player.role === ROLES.WEREWOLF;
      })
    );

    const witchVictims = killedPlayers.filter(p =>
      p.attackedBy.find(attacker => {
        const attacker_player = room.players.find(pl => pl.jid === attacker);
        return attacker_player && attacker_player.role === ROLES.WITCH;
      })
    );

    if (werewolfVictims.length > 0) {
      werewolfVictims.forEach(victim => {
        message += `• ${victim.name} (@${victim.jid.split('@')[0]}) ditemukan tewas dimangsa werewolf!\n`;
      });
    }

    if (witchVictims.length > 0) {
      witchVictims.forEach(victim => {
        message += `• ${victim.name} (@${victim.jid.split('@')[0]}) ditemukan tewas secara misterius!\n`;
      });
    }

    message += `\n`;
  }

  // Proses Hunter yang mati
  let hunterVictim = null;
  for (const player of killedPlayers) {
    if (player.role === ROLES.HUNTER) {
      // Hunter akan mendapat prompt di fungsi terpisah
      await promptHunter(sock, room, player);
      // Tunda fase diskusi sampai Hunter memilih
      return;
    }
  }

  message += `⏳ Penduduk desa akan berkumpul untuk berdiskusi...`;

  const mentions = room.players
    .filter(p => killedPlayers.includes(p))
    .map(p => p.jid);

  await sock.sendMessage(room.id, {
    text: message,
    mentions: mentions
  });

  // Cek kondisi kemenangan
  const gameEndResult = checkGameEnd(room);
  if (gameEndResult) {
    await endGame(sock, room, gameEndResult);
    return;
  }

  // Tunggu sebentar sebelum memulai fase diskusi
  setTimeout(() => {
    startDiscussionPhase(sock, room);
  }, 5000);
}

/**
* Prompt untuk Hunter yang mati
* @param {*} sock Socket WhatsApp
* @param {*} room Ruangan permainan
* @param {*} player Pemain Hunter yang mati
*/
async function promptHunter(sock, room, player) {
  if (player.role !== ROLES.HUNTER) return;

  // Cek apakah Hunter mati karena ramuan Witch
  const killedByWitch = player.attackedBy.some(attackerJid => {
    const attacker = room.players.find(p => p.jid === attackerJid);
    return attacker && attacker.role === ROLES.WITCH;
  });

  if (killedByWitch) {
    // Hunter tidak bisa menggunakan kemampuan jika dibunuh oleh Witch
    await sock.sendMessage(player.jid, {
      text: `🏹 *HUNTER ACTION* 🏹\n\nKamu dibunuh menggunakan ramuan beracun Witch. Kamu tidak bisa menggunakan kemampuan Hunter.`
    });

    // Lanjut ke fase diskusi
    await sock.sendMessage(room.id, {
      text: `☀️ *PAGI HARI (${room.phase})* ☀️\n\nPenduduk desa akan berkumpul untuk berdiskusi...`
    });

    // Cek kondisi kemenangan
    const gameEndResult = checkGameEnd(room);
    if (gameEndResult) {
      await endGame(sock, room, gameEndResult);
      return;
    }

    setTimeout(() => {
      startDiscussionPhase(sock, room);
    }, 5000);

    return;
  }

  // Daftarkan target potensial (pemain lain yang masih hidup)
  const targets = room.players.filter(p => p.jid !== player.jid && !p.isDead);

  if (targets.length === 0) {
    await sock.sendMessage(player.jid, {
      text: `🏹 *HUNTER ACTION* 🏹\n\nTidak ada target yang tersedia untuk dibunuh.`
    });

    // Lanjut ke fase diskusi
    await sock.sendMessage(room.id, {
      text: `☀️ *PAGI HARI (${room.phase})* ☀️\n\nPenduduk desa akan berkumpul untuk berdiskusi...`
    });

    setTimeout(() => {
      startDiscussionPhase(sock, room);
    }, 5000);

    return;
  }

  let message = `🏹 *HUNTER ACTION* 🏹\n\n`;
  message += `Kamu adalah Hunter dan telah mati. Kamu memiliki kesempatan terakhir untuk membunuh 1 pemain:\n\n`;

  targets.forEach((target, index) => {
    message += `${index + 1}. ${target.name} (@${target.jid.split('@')[0]})\n`;
  });

  message += `\nBalas dengan angka (1-${targets.length}) untuk memilih target.`;
  message += `\n⏱️ Waktu: 30 detik`;

  await sock.sendMessage(player.jid, {
    text: message,
    mentions: targets.map(t => t.jid)
  });

  // Tunggu 30 detik atau sampai Hunter memilih
  let hunterTimeout = setTimeout(async () => {
    // Hunter tidak memilih, pilih secara acak
    const randomIndex = Math.floor(Math.random() * targets.length);
    const target = targets[randomIndex];
    await executeHunterKill(sock, room, player, target);
  }, 30000);

  // Tambahkan informasi timeout ke room untuk dibatalkan jika Hunter memilih
  room.hunterTimeout = hunterTimeout;
  werewolfRooms.set(room.id, room);
}

/**
* Eksekusi pembunuhan oleh Hunter
* @param {*} sock Socket WhatsApp
* @param {*} room Ruangan permainan
* @param {*} hunter Pemain Hunter
* @param {*} target Target yang dibunuh
*/
async function executeHunterKill(sock, room, hunter, target) {
  // Batalkan timeout jika ada
  if (room.hunterTimeout) {
    clearTimeout(room.hunterTimeout);
    room.hunterTimeout = null;
  }

  // Bunuh target
  target.isDead = true;
  target.attackedBy.push(hunter.jid);

  // Kirim pesan ke grup
  let message = `🏹 *HUNTER REVENGE* 🏹\n\n`;
  message += `${hunter.name} (@${hunter.jid.split('@')[0]}) yang merupakan seorang Hunter,\n`;
  message += `sebelum kematiannya telah menembakkan panah terakhir dan mengenai:\n\n`;
  message += `${target.name} (@${target.jid.split('@')[0]}) yang merupakan seorang ${target.role}!\n\n`;
  message += `⏳ Penduduk desa akan berkumpul untuk berdiskusi...`;

  await sock.sendMessage(room.id, {
    text: message,
    mentions: [hunter.jid, target.jid]
  });

  // Cek kondisi kemenangan
  const gameEndResult = checkGameEnd(room);
  if (gameEndResult) {
    await endGame(sock, room, gameEndResult);
    return;
  }

  // Mulai fase diskusi
  setTimeout(() => {
    startDiscussionPhase(sock, room);
  }, 5000);
}

/**
* Memulai fase diskusi
* @param {*} sock Socket WhatsApp
* @param {*} room Ruangan permainan
*/
async function startDiscussionPhase(sock, room) {
  room.status = "discussion";

  // Kirim pesan ke grup untuk diskusi
  let message = `💬 *DISKUSI (${room.phase})* 💬\n\n`;
  message += `Penduduk desa berkumpul untuk berdiskusi...\n\n`;
  message += `🧐 Siapa yang mencurigakan? Siapa yang menurut kalian werewolf?\n\n`;
  message += `📝 *Pemain yang masih hidup:*\n`;

  const alivePlayers = room.players.filter(p => !p.isDead);
  const mentions = [];

  alivePlayers.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (@${player.jid.split('@')[0]})\n`;
    mentions.push(player.jid);
  });

  message += `\n⏱️ Waktu diskusi: ${DISCUSSION_DURATION / 60} menit`;

  await sock.sendMessage(room.id, {
    text: message,
    mentions: mentions
  });

  // Atur timer untuk fase diskusi
  room.timeLeft = DISCUSSION_DURATION;
  room.timer = setInterval(() => {
    room.timeLeft -= 15;

    // Update waktu tersisa setiap 1 menit
    if (room.timeLeft % 60 === 0 && room.timeLeft > 0) {
      sock.sendMessage(room.id, {
        text: `⏱️ Waktu diskusi tersisa: ${room.timeLeft / 60} menit`
      });
    }

    // Jika waktu habis
    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      startVotingPhase(sock, room);
    }
  }, 15000);

  werewolfRooms.set(room.id, room);
}

/**
* Memulai fase voting
* @param {*} sock Socket WhatsApp
* @param {*} room Ruangan permainan
*/
async function startVotingPhase(sock, room) {
  room.status = "voting";
  room.votingResults = new Map();

  // Kirim pesan ke grup untuk voting
  let message = `🗳️ *VOTING (${room.phase})* 🗳️\n\n`;
  message += `Waktunya voting! Siapa yang mencurigakan?\n\n`;
  message += `📝 *Pemain yang masih hidup:*\n`;

  const alivePlayers = room.players.filter(p => !p.isDead);
  const mentions = [];

  alivePlayers.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (@${player.jid.split('@')[0]})\n`;
    mentions.push(player.jid);
  });

  message += `\nKetik *.wwvote nomor* untuk memilih siapa yang akan dieksekusi`;
  message += `\n⏱️ Waktu voting: ${VOTING_DURATION} detik`;

  await sock.sendMessage(room.id, {
    text: message,
    mentions: mentions
  });

  // Atur timer untuk fase voting
  room.timeLeft = VOTING_DURATION;
  room.timer = setInterval(() => {
    room.timeLeft -= 5;

    // Jika waktu habis
    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      resolveVoting(sock, room);
    }
  }, 5000);

  werewolfRooms.set(room.id, room);
}

/**
* Menangani vote dari pemain
* @param {*} sock Socket WhatsApp
* @param {*} msg Pesan
*/
async function wwVoteHandler(sock, msg) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // Pastikan perintah dijalankan di dalam grup
  if (!groupId.endsWith('@g.us')) {
    await sock.sendMessage(groupId, {
      text: "❌ Command ini hanya bisa digunakan di dalam grup",
      quoted: msg
    });
    return;
  }

  // Cek apakah ada ruangan aktif
  if (!werewolfRooms.has(groupId)) {
    await sock.sendMessage(groupId, {
      text: "❌ Tidak ada permainan Werewolf yang aktif di grup ini",
      quoted: msg
    });
    return;
  }

  const room = werewolfRooms.get(groupId);

  // Cek apakah sedang dalam fase voting
  if (room.status !== "voting") {
    await sock.sendMessage(groupId, {
      text: "❌ Voting hanya bisa dilakukan saat fase voting sedang berlangsung",
      quoted: msg
    });
    return;
  }

  // Cek apakah pengirim adalah pemain yang masih hidup
  const voter = room.players.find(p => p.jid === sender);
  if (!voter || voter.isDead) {
    await sock.sendMessage(groupId, {
      text: "❌ Hanya pemain yang masih hidup yang dapat melakukan voting",
      quoted: msg
    });
    return;
  }

  // Parse pesan untuk mendapatkan nomor vote
  const args = msg.message?.conversation?.split(' ') ||
               msg.message?.extendedTextMessage?.text?.split(' ') || [];

  if (args.length < 2) {
    await sock.sendMessage(groupId, {
      text: "❌ Format voting salah. Gunakan .wwvote nomor",
      quoted: msg
    });
    return;
  }

  const voteNumber = parseInt(args[1]);
  if (isNaN(voteNumber)) {
    await sock.sendMessage(groupId, {
      text: "❌ Nomor vote harus berupa angka",
      quoted: msg
    });
    return;
  }

  // Dapatkan daftar pemain yang masih hidup
  const alivePlayers = room.players.filter(p => !p.isDead);

  if (voteNumber < 1 || voteNumber > alivePlayers.length) {
    await sock.sendMessage(groupId, {
      text: `❌ Nomor vote harus antara 1-${alivePlayers.length}`,
      quoted: msg
    });
    return;
  }

  // Dapatkan target vote
  const targetPlayer = alivePlayers[voteNumber - 1];

  // Catat vote
  room.votingResults.set(sender, targetPlayer.jid);
  targetPlayer.votedBy.push(sender);

  // Kirim konfirmasi vote
  await sock.sendMessage(groupId, {
    text: `✅ @${sender.split('@')[0]} memilih untuk mengeksekusi @${targetPlayer.jid.split('@')[0]}`,
    mentions: [sender, targetPlayer.jid],
    quoted: msg
  });

  // Cek apakah semua pemain sudah vote
  if (room.votingResults.size === alivePlayers.length) {
    clearInterval(room.timer);
    resolveVoting(sock, room);
  }
}

/**
* Resolusi voting
* @param {*} sock Socket WhatsApp
* @param {*} room Ruangan permainan
*/
async function resolveVoting(sock, room) {
  // Hitung hasil voting
  const voteCounts = new Map();

  for (const [voterJid, targetJid] of room.votingResults.entries()) {
    if (!voteCounts.has(targetJid)) {
      voteCounts.set(targetJid, 0);
    }

    voteCounts.set(targetJid, voteCounts.get(targetJid) + 1);
  }

  // Temukan pemain dengan vote terbanyak
  let maxVotes = 0;
  let execTargets = [];

  for (const [targetJid, voteCount] of voteCounts.entries()) {
    if (voteCount > maxVotes) {
      maxVotes = voteCount;
      execTargets = [targetJid];
    } else if (voteCount === maxVotes) {
      execTargets.push(targetJid);
    }
  }

  // Jika ada lebih dari satu pemain dengan vote terbanyak, pilih secara acak
  let executedJid = null;
  if (execTargets.length > 0) {
    const randomIndex = Math.floor(Math.random() * execTargets.length);
    executedJid = execTargets[randomIndex];
  }

  // Jika tidak ada yang dipilih, tidak ada yang dieksekusi
  if (!executedJid || maxVotes === 0) {
    await sock.sendMessage(room.id, {
      text: `🗳️ *VOTING RESULTS* 🗳️\n\nTidak ada suara yang diberikan atau hasil voting seri. Tidak ada yang dieksekusi hari ini!`
    });

    // Lanjut ke fase malam berikutnya
    room.phase++;
    startNextPhase(sock, room);
    return;
  }

  // Eksekusi pemain terpilih
  const executedPlayer = room.players.find(p => p.jid === executedJid);
  executedPlayer.isDead = true;

  // Kirim hasil voting
  let message = `🗳️ *VOTING RESULTS* 🗳️\n\n`;
  message += `Penduduk desa telah memutuskan untuk mengeksekusi:\n`;
  message += `${executedPlayer.name} (@${executedPlayer.jid.split('@')[0]}) dengan ${maxVotes} suara!\n\n`;
  message += `Setelah dieksekusi, ternyata dia adalah *${executedPlayer.role}*!\n\n`;

  // Cek apakah ada Hunter yang dieksekusi
  if (executedPlayer.role === ROLES.HUNTER) {
    message += `🏹 ${executedPlayer.name} adalah seorang Hunter! Dia memiliki kesempatan terakhir untuk membunuh seseorang!`;

    await sock.sendMessage(room.id, {
      text: message,
      mentions: [executedPlayer.jid]
    });

    // Berikan Hunter kesempatan untuk membunuh
    await promptHunter(sock, room, executedPlayer);
    return;
  }

  message += `⏳ Malam akan segera tiba...`;

  await sock.sendMessage(room.id, {
    text: message,
    mentions: [executedPlayer.jid]
  });

  // Cek kondisi kemenangan
  const gameEndResult = checkGameEnd(room);
  if (gameEndResult) {
    await endGame(sock, room, gameEndResult);
    return;
  }

  // Lanjut ke fase malam berikutnya
  room.phase++;
  setTimeout(() => {
    startNextPhase(sock, room);
  }, 5000);
}

/**
* Memulai fase selanjutnya
* @param {*} sock Socket WhatsApp
* @param {*} room Ruangan permainan
*/
function startNextPhase(sock, room) {
  if (room.status === "voting" || room.status === "day" || room.status === "discussion") {
    startNightPhase(sock, room);
  } else {
    startDiscussionPhase(sock, room);
  }
}

/**
 * Menangani aksi malam dari pemain via pesan pribadi
 * @param {*} sock Socket WhatsApp
 * @param {*} msg Pesan 
 */
async function handleNightAction(sock, msg) {
  // Jangan proses pesan di grup
  if (msg.key.remoteJid.endsWith('@g.us')) return;

  const sender = msg.key.participant || msg.key.remoteJid;
  const body = msg.message?.conversation ||
               msg.message?.extendedTextMessage?.text || '';

  // Cari ruangan di mana pengirim adalah pemain
  let targetRoom = null;
  let player = null;

  for (const [groupId, room] of werewolfRooms.entries()) {
    player = room.players.find(p => p.jid === sender);
    if (player) {
      targetRoom = room;
      break;
    }
  }

  if (!targetRoom || !player) return;
  if (player.isDead) return;
  if (targetRoom.status !== "night") return;

  // Cek apakah pemain sudah melakukan aksi
  if (targetRoom.nightActions.has(sender)) return;

  // Handle aksi sesuai peran
  switch (player.role) {
    case ROLES.WEREWOLF:
      await handleWerewolfAction(sock, msg, targetRoom, player);
      break;
    case ROLES.SEER:
      await handleSeerAction(sock, msg, targetRoom, player);
      break;
    case ROLES.GUARDIAN:
      await handleGuardianAction(sock, msg, targetRoom, player);
      break;
    case ROLES.WITCH:
      await handleWitchAction(sock, msg, targetRoom, player);
      break;
    case ROLES.HUNTER:
      await handleHunterAction(sock, msg, targetRoom, player);
      break;
  }

  // Cek apakah semua aksi malam sudah dilakukan
  if (isNightActionsComplete(targetRoom)) {
    clearInterval(targetRoom.timer);
    resolveNightActions(sock, targetRoom);
  }
}

/**
* Handle aksi Werewolf
* @param {*} sock Socket WhatsApp
* @param {*} msg Pesan
* @param {*} room Ruangan permainan
* @param {*} player Pemain Werewolf
*/
async function handleWerewolfAction(sock, msg, room, player) {
  const body = msg.message?.conversation ||
               msg.message?.extendedTextMessage?.text || '';

  // Cek apakah werewolf lain sudah memilih
  for (const [actorJid, action] of room.nightActions.entries()) {
    if (action.role === ROLES.WEREWOLF && action.action === 'kill') {
      // Beritahu werewolf bahwa sudah ada pilihan
      const targetPlayer = room.players.find(p => p.jid === action.targetJid);

      await sock.sendMessage(player.jid, {
        text: `🐺 Werewolf lain telah memilih untuk memangsa ${targetPlayer.name} (@${targetPlayer.jid.split('@')[0]})`,
        mentions: [targetPlayer.jid]
      });

      // Catat bahwa werewolf ini setuju dengan pilihan tersebut
      room.nightActions.set(player.jid, {
        role: ROLES.WEREWOLF,
        action: 'kill',
        targetJid: action.targetJid
      });

      return;
    }
  }

  // Parse pilihan
  const choice = parseInt(body);
  if (isNaN(choice)) return;

  // Dapatkan daftar target potensial
  const targets = room.players.filter(p => !p.isDead && p.role !== ROLES.WEREWOLF);

  if (choice < 1 || choice > targets.length) {
    await sock.sendMessage(player.jid, {
      text: `❌ Pilihan harus antara 1-${targets.length}`,
      quoted: msg
    });
    return;
  }

  // Dapatkan target
  const targetPlayer = targets[choice - 1];

  // Catat aksi
  room.nightActions.set(player.jid, {
    role: ROLES.WEREWOLF,
    action: 'kill',
    targetJid: targetPlayer.jid
  });

  // Kirim konfirmasi
  await sock.sendMessage(player.jid, {
    text: `🐺 Kamu telah memilih untuk memangsa ${targetPlayer.name} (@${targetPlayer.jid.split('@')[0]})`,
    mentions: [targetPlayer.jid],
    quoted: msg
  });
}

/**
 * Handle aksi Seer
 * @param {*} sock Socket WhatsApp
 * @param {*} msg Pesan
 * @param {*} room Ruangan permainan
 * @param {*} player Pemain Seer
 */
async function handleSeerAction(sock, msg, room, player) {
  const body = msg.message?.conversation ||
               msg.message?.extendedTextMessage?.text || '';

  // Parse pilihan
  const choice = parseInt(body);
  if (isNaN(choice)) return;

  // Dapatkan daftar target potensial
  const targets = room.players.filter(p => p.jid !== player.jid && !p.isDead);

  if (choice < 1 || choice > targets.length) {
    await sock.sendMessage(player.jid, {
      text: `❌ Pilihan harus antara 1-${targets.length}`,
      quoted: msg
    });
    return;
  }

  // Dapatkan target
  const targetPlayer = targets[choice - 1];

  // Catat aksi
  room.nightActions.set(player.jid, {
    role: ROLES.SEER,
    action: 'see',
    targetJid: targetPlayer.jid
  });

  // Tentukan apakah target terlihat sebagai Werewolf atau bukan
  let seenRole = targetPlayer.role;
  if (targetPlayer.role === ROLES.LYCAN) {
    seenRole = ROLES.WEREWOLF; // Lycan terlihat sebagai Werewolf oleh Seer
  }

  // Kirim hasil penglihatan
  let result = seenRole === ROLES.WEREWOLF ? "WEREWOLF" : "BUKAN WEREWOLF";

  await sock.sendMessage(player.jid, {
    text: `👁️ Kamu melihat bahwa ${targetPlayer.name} (@${targetPlayer.jid.split('@')[0]}) adalah *${result}*`,
    mentions: [targetPlayer.jid],
    quoted: msg
  });
}

/**
 * Handle aksi Guardian
 * @param {*} sock Socket WhatsApp
 * @param {*} msg Pesan
 * @param {*} room Ruangan permainan
 * @param {*} player Pemain Guardian
 */
async function handleGuardianAction(sock, msg, room, player) {
  const body = msg.message?.conversation ||
               msg.message?.extendedTextMessage?.text || '';

  // Parse pilihan
  const choice = parseInt(body);
  if (isNaN(choice)) return;

  // Dapatkan daftar target potensial
  const targets = room.players.filter(p => !p.isDead);

  if (choice < 1 || choice > targets.length) {
    await sock.sendMessage(player.jid, {
      text: `❌ Pilihan harus antara 1-${targets.length}`,
      quoted: msg
    });
    return;
  }

  // Dapatkan target
  const targetPlayer = targets[choice - 1];

  // Catat aksi
  room.nightActions.set(player.jid, {
    role: ROLES.GUARDIAN,
    action: 'protect',
    targetJid: targetPlayer.jid
  });

  // Kirim konfirmasi
  await sock.sendMessage(player.jid, {
    text: `🛡️ Kamu telah melindungi ${targetPlayer.name} (@${targetPlayer.jid.split('@')[0]}) malam ini`,
    mentions: [targetPlayer.jid],
    quoted: msg
  });
}

/**
 * Handle aksi Witch
 * @param {*} sock Socket WhatsApp
 * @param {*} msg Pesan
 * @param {*} room Ruangan permainan
 * @param {*} player Pemain Witch
 */
async function handleWitchAction(sock, msg, room, player) {
  const body = msg.message?.conversation ||
               msg.message?.extendedTextMessage?.text || '';

  // Cek apakah Witch sudah menggunakan kemampuannya malam ini
  if (room.nightActions.has(player.jid)) {
    return;
  }

  // Cari tahu siapa yang akan dibunuh werewolf malam ini
  let victimJid = null;
  for (const [actorJid, action] of room.nightActions.entries()) {
    if (action.role === ROLES.WEREWOLF && action.action === 'kill') {
      victimJid = action.targetJid;
      break;
    }
  }

  // Cek apakah Witch sedang merespon prompt heal
  if (room.witchPotions.heal && victimJid && !room.witchRespondedHeal) {
    const victim = room.players.find(p => p.jid === victimJid);

    if (body.toLowerCase() === 'ya') {
      // Catat aksi heal
      room.nightActions.set(player.jid, {
        role: ROLES.WITCH,
        action: 'heal',
        targetJid: victim.jid
      });

      // Kirim konfirmasi
      await sock.sendMessage(player.jid, {
        text: `🧙‍♀️ Kamu telah memutuskan untuk menyelamatkan ${victim.name} (@${victim.jid.split('@')[0]})`,
        mentions: [victim.jid],
        quoted: msg
      });

      // Tandai bahwa Witch sudah merespon prompt heal
      room.witchRespondedHeal = true;

      // Jika masih punya ramuan kill, beri prompt untuk ramuan kill
      if (room.witchPotions.kill) {
        await promptWitchKill(sock, room, player);
      }

      return;
    } else if (body.toLowerCase() === 'tidak') {
      // Tandai bahwa Witch sudah merespon prompt heal
      room.witchRespondedHeal = true;

      // Kirim konfirmasi
      await sock.sendMessage(player.jid, {
        text: `🧙‍♀️ Kamu telah memutuskan untuk tidak menyelamatkan korban werewolf`,
        quoted: msg
      });

      // Jika masih punya ramuan kill, beri prompt untuk ramuan kill
      if (room.witchPotions.kill) {
        await promptWitchKill(sock, room, player);
      } else {
        // Catat bahwa Witch sudah selesai bertindak malam ini
        room.nightActions.set(player.jid, {
          role: ROLES.WITCH,
          action: 'none',
          targetJid: null
        });
      }

      return;
    }

    // Jika input tidak valid, abaikan
    return;
  }

  // Cek untuk aksi kill
  if (room.witchPotions.kill) {
    // Cek apakah memilih untuk tidak menggunakan ramuan kill
    if (body.toLowerCase() === 'tidak') {
      // Catat bahwa Witch sudah selesai bertindak malam ini
      room.nightActions.set(player.jid, {
        role: ROLES.WITCH,
        action: 'none',
        targetJid: null
      });

      // Kirim konfirmasi
      await sock.sendMessage(player.jid, {
        text: `🧙‍♀️ Kamu telah memutuskan untuk tidak menggunakan ramuan Kill`,
        quoted: msg
      });

      return;
    }

    // Parse pilihan
    const choice = parseInt(body);
    if (isNaN(choice)) return;

    // Dapatkan daftar target potensial
    const targets = room.players.filter(p => p.jid !== player.jid && !p.isDead);

    if (choice < 1 || choice > targets.length) {
      await sock.sendMessage(player.jid, {
        text: `❌ Pilihan harus antara 1-${targets.length}`,
        quoted: msg
      });
      return;
    }

    // Dapatkan target
    const targetPlayer = targets[choice - 1];

    // Catat aksi
    room.nightActions.set(player.jid, {
      role: ROLES.WITCH,
      action: 'kill',
      targetJid: targetPlayer.jid
    });

    // Kirim konfirmasi
    await sock.sendMessage(player.jid, {
      text: `🧙‍♀️ Kamu telah memutuskan untuk membunuh ${targetPlayer.name} (@${targetPlayer.jid.split('@')[0]})`,
      mentions: [targetPlayer.jid],
      quoted: msg
    });
  }
}

/**
 * Handle aksi Hunter (saat masih hidup)
 * @param {*} sock Socket WhatsApp
 * @param {*} msg Pesan
 * @param {*} room Ruangan permainan
 * @param {*} player Pemain Hunter
 */
async function handleHunterAction(sock, msg, room, player) {
  // Hunter tidak memiliki aksi malam saat masih hidup
  // (Hunter hanya melakukan aksi saat mati)
  // Catat bahwa Hunter sudah selesai bertindak malam ini
  room.nightActions.set(player.jid, {
    role: ROLES.HUNTER,
    action: 'none',
    targetJid: null
  });

  await sock.sendMessage(player.jid, {
    text: `🏹 Sebagai Hunter, kamu tidak memiliki aksi khusus di malam hari. Kemampuanmu akan aktif saat kamu mati.`,
    quoted: msg
  });
}

/**
 * Menangani input Hunter yang mati
 * @param {*} sock Socket WhatsApp
 * @param {*} msg Pesan
 */
async function handleHunterDeathAction(sock, msg) {
  const sender = msg.key.participant || msg.key.remoteJid;
  const body = msg.message?.conversation ||
               msg.message?.extendedTextMessage?.text || '';

  // Cari ruangan di mana pengirim adalah Hunter yang mati
  let targetRoom = null;
  let player = null;

  for (const [groupId, room] of werewolfRooms.entries()) {
    player = room.players.find(p => p.jid === sender);
    if (player && player.isDead && player.role === ROLES.HUNTER && room.hunterTimeout) {
      targetRoom = room;
      break;
    }
  }

  if (!targetRoom || !player) return;

  // Parse pilihan
  const choice = parseInt(body);
  if (isNaN(choice)) return;

  // Dapatkan daftar target potensial
  const targets = targetRoom.players.filter(p => p.jid !== player.jid && !p.isDead);

  if (choice < 1 || choice > targets.length) {
    await sock.sendMessage(player.jid, {
      text: `❌ Pilihan harus antara 1-${targets.length}`,
      quoted: msg
    });
    return;
  }

  // Dapatkan target
  const targetPlayer = targets[choice - 1];

  // Batalkan timeout
  clearTimeout(targetRoom.hunterTimeout);
  targetRoom.hunterTimeout = null;

  // Eksekusi pembunuhan
  await executeHunterKill(sock, targetRoom, player, targetPlayer);
}

/**
 * Cek kondisi kemenangan
 * @param {*} room Ruangan permainan
 * @returns {String|null} Peran yang menang, atau null jika belum ada pemenang
 */
function checkGameEnd(room) {
  const alivePlayers = room.players.filter(p => !p.isDead);
  const aliveWerewolves = alivePlayers.filter(p => p.role === ROLES.WEREWOLF);
  const aliveVillagers = alivePlayers.filter(p => p.role !== ROLES.WEREWOLF);

  // Cek kemenangan Werewolf (semua warga desa mati atau jumlah werewolf = jumlah warga desa)
  if (aliveWerewolves.length >= aliveVillagers.length) {
    return "werewolf";
  }

  // Cek kemenangan Warga Desa (semua werewolf mati)
  if (aliveWerewolves.length === 0) {
    return "villager";
  }

  // Belum ada pemenang
  return null;
}

/**
 * Akhiri permainan
 * @param {*} sock Socket WhatsApp
 * @param {*} room Ruangan permainan
 * @param {*} winner Pemenang ("werewolf" atau "villager")
 */
async function endGame(sock, room, winner) {
  // Hentikan timer jika ada
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  // Kirim pesan kemenangan
  let message = `🎮 *GAME OVER* 🎮\n\n`;

  if (winner === "werewolf") {
    message += `🐺 *WEREWOLF MENANG!* 🐺\n\n`;
    message += `Para werewolf berhasil memangsa semua warga desa!\n\n`;
  } else {
    message += `🏆 *WARGA DESA MENANG!* 🏆\n\n`;
    message += `Warga desa berhasil mengeliminasi semua werewolf!\n\n`;
  }

  message += `📝 *Peran Pemain:*\n`;
  room.players.forEach((player, index) => {
    const statusEmoji = player.isDead ? "⚰️" : "✅";
    message += `${statusEmoji} ${player.name} (@${player.jid.split('@')[0]}) - ${player.role}\n`;
  });

  message += `\nPermainan selesai! Ketik .ww untuk memulai permainan baru.`;

  await sock.sendMessage(room.id, {
    text: message,
    mentions: room.players.map(p => p.jid)
  });

  // Hapus ruangan
  werewolfRooms.delete(room.id);

  // Simpan statistik permainan ke database
  try {
    const newGame = new Game({
      groupId: room.id,
      groupName: room.name,
      players: room.players.map(p => ({
        jid: p.jid,
        name: p.name,
        role: p.role,
        isDead: p.isDead
      })),
      winner: winner,
      phases: room.phase,
      timestamp: new Date()
    });

    await newGame.save();
  } catch (error) {
    console.error("Error saving game stats:", error);
  }
}

/**
 * Menampilkan bantuan permainan
 * @param {*} sock Socket WhatsApp
 * @param {*} msg Pesan
 */
async function wwHelpHandler(sock, msg) {
  const groupId = msg.key.remoteJid;

  // Pastikan perintah dijalankan di dalam grup
  if (!groupId.endsWith('@g.us')) {
    await sock.sendMessage(groupId, {
      text: "❌ Command ini hanya bisa digunakan di dalam grup",
      quoted: msg
    });
    return;
  }

  let message = `🐺 *WEREWOLF GAME HELP* 🐺\n\n`;
  message += `📝 *Perintah:*\n`;
  message += `• .ww - Membuat ruangan baru\n`;
  message += `• .wwjoin - Bergabung ke ruangan\n`;
  message += `• .wwstart - Memulai permainan (hanya pembuat)\n`;
  message += `• .wwvote nomor - Memilih pemain untuk dieksekusi\n`;
  message += `• .wwhelp - Menampilkan bantuan\n\n`;

  message += `🎭 *Peran:*\n`;
  for (const [role, desc] of Object.entries(ROLE_DESCRIPTIONS)) {
    message += `• ${role} - ${desc}\n`;
  }

  message += `\n⏱️ *Fase Permainan:*\n`;
  message += `1. Malam - Para pemain dengan peran khusus bertindak (${NIGHT_DURATION} detik)\n`;
  message += `2. Pagi - Pengumuman korban malam\n`;
  message += `3. Diskusi - Warga desa berdiskusi (${DISCUSSION_DURATION/60} menit)\n`;
  message += `4. Voting - Pemilihan pemain untuk dieksekusi (${VOTING_DURATION} detik)\n\n`;

  message += `🏆 *Kemenangan:*\n`;
  message += `• Warga Desa - Semua Werewolf telah dieksekusi\n`;
  message += `• Werewolf - Jumlah Werewolf sama dengan atau lebih banyak dari Warga Desa\n\n`;

  message += `Minimal ${Math.min(...Object.keys(ROLE_DISTRIBUTION).map(Number))} pemain dan maksimal ${Math.max(...Object.keys(ROLE_DISTRIBUTION).map(Number))} pemain`;

  await sock.sendMessage(groupId, {
    text: message,
    quoted: msg
  });
}

// Ekspor handler
module.exports = {
  wwHandler,
  wwJoinHandler,
  wwStartHandler,
  wwVoteHandler,
  wwHelpHandler,
  handleNightAction,
  handleHunterDeathAction,
  handleWerewolfAction,
  handleSeerAction,
  handleGuardianAction,
  handleWitchAction,
  handleHunterAction,
  handleHunterDeathAction,
  isNightActionsComplete,
  resolveNightActions,
  startNextPhase,
  promptWerewolf,
  promptSeer,
  promptGuardian,
  promptWitch,
  promptWitchKill,
  executeHunterKill,
  startDayPhase,
  promptHunter,
  startDiscussionPhase,
  startVotingPhase,
  resolveVoting,
  checkGameEnd,
  endGame
};