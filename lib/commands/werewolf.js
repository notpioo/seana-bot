const WerewolfGame = require('../utils/werewolf-game');

const gameRooms = new Map();

async function wwHandler(sock, msg) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!msg.key.remoteJid.endsWith('@g.us')) {
    await sock.sendMessage(groupId, { text: "❌ Command ini hanya bisa digunakan di grup!" });
    return;
  }

  if (gameRooms.has(groupId)) {
    await sock.sendMessage(groupId, { text: "❌ Sudah ada room game yang aktif di grup ini!" });
    return;
  }

  const game = new WerewolfGame(groupId, sender);
  gameRooms.set(groupId, game);

  await sock.sendMessage(groupId, { 
    text: `🐺 *Room Werewolf Dibuat!*\n\n` +
          `👑 Host: @${sender.split('@')[0]}\n` +
          `👥 Pemain: 1/9\n\n` +
          `Ketik *.wwjoin* untuk bergabung!`,
    mentions: [sender]
  });
}

async function wwJoinHandler(sock, msg) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!msg.key.remoteJid.endsWith('@g.us')) {
    await sock.sendMessage(groupId, { text: "❌ Command ini hanya bisa digunakan di grup!" });
    return;
  }

  const game = gameRooms.get(groupId);
  if (!game) {
    await sock.sendMessage(groupId, { text: "❌ Tidak ada room yang aktif!\nBuat room dengan ketik *.ww*" });
    return;
  }

  const joined = game.addPlayer(sender);
  if (joined) {
    await sock.sendMessage(groupId, { 
      text: `✅ @${sender.split('@')[0]} bergabung ke dalam game!\n👥 Pemain: ${game.getPlayerCount()}/9`,
      mentions: [sender]
    });
  } else {
    await sock.sendMessage(groupId, { text: "❌ Kamu sudah di dalam game atau room sudah penuh!" });
  }
}

async function wwStartHandler(sock, msg) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!msg.key.remoteJid.endsWith('@g.us')) {
    await sock.sendMessage(groupId, { text: "❌ Command ini hanya bisa digunakan di grup!" });
    return;
  }

  const game = gameRooms.get(groupId);
  if (!game || game.creator !== sender) {
    await sock.sendMessage(groupId, { text: "❌ Kamu bukan host game atau tidak ada game yang aktif!" });
    return;
  }

  if (game.getPlayerCount() < 4) {
    await sock.sendMessage(groupId, { text: "❌ Minimal 4 pemain untuk memulai game!" });
    return;
  }

  await game.start(sock);
}

async function wwHelpHandler(sock, msg) {
  const help = `🐺 *Bantuan Game Werewolf* 🐺\n\n` +
               `*.ww* - Buat room baru\n` +
               `*.wwjoin* - Bergabung ke room\n` +
               `*.wwstart* - Mulai permainan (khusus host)\n` +
               `*.wwhelp* - Tampilkan bantuan ini\n\n` +
               `Minimal 4 pemain, maksimal 9 pemain\n\n` +
               `*Peran yang tersedia:*\n` +
               `🐺 Serigala\n` +
               `👁️ Peramal\n` +
               `🛡️ Pelindung\n` +
               `🧙‍♀️ Penyihir\n` +
               `🏹 Pemburu\n` +
               `🐾 Manusia Serigala\n` +
               `👨 Penduduk Desa`;

  await sock.sendMessage(msg.key.remoteJid, { text: help });
}

async function wwcHandler(sock, msg) {
  const sender = msg.key.participant || msg.key.remoteJid;
  const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  const choice = parseInt(content.split(' ')[1]);

  // Find active game where sender is a player
  const game = Array.from(gameRooms.values()).find(g => 
    g.phase === 'night' && g.players.has(sender)
  );

  if (!game || !game.nightActions.has(sender)) {
    await sock.sendMessage(sender, { text: "❌ Tidak ada aksi malam yang tersedia untukmu saat ini!" });
    return;
  }

  const action = game.nightActions.get(sender);
  if (action.hasVoted) {
    await sock.sendMessage(sender, { text: "❌ Kamu sudah melakukan aksi!" });
    return;
  }

  if (isNaN(choice) || choice < 1 || choice > action.targets.length) {
    await sock.sendMessage(sender, { text: "❌ Pilihan tidak valid!" });
    return;
  }

  const target = action.targets[choice - 1];
  action.hasVoted = true;
  
  if (action.role === 'seer') {
    const targetRole = game.roles.get(target);
    const revealedRole = targetRole === 'lycan' ? 'werewolf' : targetRole;
    const roleEmoji = {
      'werewolf': '🐺',
      'seer': '👁️',
      'guardian': '🛡️',
      'villager': '👨',
      'witch': '🧙‍♀️',
      'hunter': '🏹'
    }[revealedRole];

    await sock.sendMessage(sender, {
      text: `👁️ *Hasil Penglihatan*\n\n@${target.split('@')[0]} adalah ${roleEmoji} ${revealedRole}!`,
      mentions: [target]
    });
  } else {
    await sock.sendMessage(sender, { text: "✅ Aksi kamu telah dicatat!" });
  }

  game.nightActions.set(sender, {
    ...action,
    target,
    type: action.role === 'werewolf' ? 'kill' :
          action.role === 'guardian' ? 'protect' :
          action.role === 'seer' ? 'see' : 'none'
  });
}

async function wwVoteHandler(sock, msg) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!msg.key.remoteJid.endsWith('@g.us')) {
    await sock.sendMessage(groupId, { text: "❌ Command ini hanya bisa digunakan di grup!" });
    return;
  }

  const game = gameRooms.get(groupId);
  if (!game || game.phase !== 'day') {
    await sock.sendMessage(groupId, { text: "❌ Tidak ada sesi voting yang aktif!" });
    return;
  }

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentioned || !game.players.has(mentioned)) {
    await sock.sendMessage(groupId, { text: "❌ Tag pemain yang ingin divote! Contoh: *.wwvote @pemain*" });
    return;
  }

  if (!game.players.has(sender)) {
    await sock.sendMessage(groupId, { text: "❌ Hanya pemain aktif yang bisa voting!" });
    return;
  }

  game.votes.set(sender, mentioned);
  await sock.sendMessage(groupId, { 
    text: `🗳️ @${sender.split('@')[0]} memvote @${mentioned.split('@')[0]}!`,
    mentions: [sender, mentioned]
  });
}

async function handleNightAction(sock, msg) {
  const sender = msg.key.participant || msg.key.remoteJid;
  const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quotedMsg) return;

  const game = Array.from(gameRooms.values()).find(g => 
    g.phase === 'night' && g.players.has(sender)
  );

  if (!game || !game.nightActions.has(sender)) return;

  const action = game.nightActions.get(sender);
  if (!action || action.hasVoted) return;

  const choice = parseInt(content);
  if (isNaN(choice) || choice < 1 || choice > action.targets.length) return;

  const target = action.targets[choice - 1];
  action.hasVoted = true;
  game.nightActions.set(sender, {
    ...action,
    target,
    type: action.role === 'werewolf' ? 'kill' :
          action.role === 'guardian' ? 'protect' :
          action.role === 'seer' ? 'see' : 'none'
  });

  // Send role reveal message for Seer
  if (action.role === 'seer') {
    const targetRole = game.roles.get(target);
    // If target is Lycan, they appear as werewolf to the Seer
    const revealedRole = targetRole === 'lycan' ? 'werewolf' : targetRole;
    const roleEmoji = {
      'werewolf': '🐺',
      'seer': '👁️',
      'guardian': '🛡️',
      'villager': '👨',
      'witch': '🧙‍♀️',
      'hunter': '🏹'
    }[revealedRole];
    
    await sock.sendMessage(sender, {
      text: `👁️ *Hasil Penglihatan*\n\n@${target.split('@')[0]} adalah ${roleEmoji} ${revealedRole}!`,
      mentions: [target],
      quoted: msg
    });
  } else {
    // Send regular confirmation for other roles
    await sock.sendMessage(sender, {
      text: `✅ Aksi kamu telah dicatat!`,
      quoted: msg
    });
  }
}


module.exports = {
  wwHandler,
  wwJoinHandler,
  wwStartHandler,
  wwHelpHandler,
  wwVoteHandler,
  wwcHandler,
  handleNightAction
};