const WerewolfGame = require('../utils/werewolf-game');
const gameRooms = new Map();

async function wwHandler(sock, msg) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

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

  const game = gameRooms.get(groupId);
  if (!game || game.creator !== sender) {
    await sock.sendMessage(groupId, { text: "You're not the game creator or no active game exists!" });
    return;
  }

  if (game.getPlayerCount() < 4) {
    await sock.sendMessage(groupId, { text: "Need at least 4 players to start!" });
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

async function wwVoteHandler(msg, sock) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const game = gameRooms.get(groupId);

  if (!game || game.phase !== 'day') {
    await sock.sendMessage(groupId, { text: "No active voting phase!" });
    return;
  }

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentioned || !game.players.has(mentioned)) {
    await sock.sendMessage(groupId, { text: "Invalid vote target! Use .wwvote @mention" });
    return;
  }

  if (!game.players.has(sender)) {
    await sock.sendMessage(groupId, { text: "Only active players can vote!" });
    return;
  }

  game.votes.set(sender, mentioned);
  await sock.sendMessage(groupId, { 
    text: `@${sender.split('@')[0]} voted for @${mentioned.split('@')[0]}!`,
    mentions: [sender, mentioned]
  });
}

async function wwVoteHandler(sock, msg) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
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

module.exports = {
  wwHandler,
  wwJoinHandler,
  wwStartHandler, 
  wwHelpHandler,
  wwVoteHandler,
  wwJoinHandler,
  wwStartHandler,
  wwHelpHandler,
  wwVoteHandler
};
async function handleNightAction(sock, msg) {
  const sender = msg.key.remoteJid;
  const choice = parseInt(msg.message?.conversation);

  // Find the game where this player is participating
  const game = Array.from(gameRooms.values()).find(g => 
    g.phase === 'night' && g.roles.has(sender)
  );

  if (!game || !game.nightActions.has(sender)) return;

  const action = game.nightActions.get(sender);
  if (action.hasVoted || isNaN(choice) || choice < 1 || choice > action.targets.length) return;

  const target = action.targets[choice - 1];
  action.hasVoted = true;

  switch(action.role) {
    case 'werewolf':
      game.nightActions.set(sender, { ...action, type: 'kill', target });
      break;
    case 'seer':
      const targetRole = game.roles.get(target);
      await sock.sendMessage(sender, { 
        text: `👁️ @${target.split('@')[0]} adalah ${targetRole === 'lycan' ? 'werewolf' : targetRole}`,
        mentions: [target]
      });
      break;
    case 'guardian':
      game.nightActions.set(sender, { ...action, type: 'protect', target });
      break;
    case 'witch':
      if (choice === 1 && game.witch.heal) {
        game.nightActions.set(sender, { ...action, type: 'heal', target });
      } else if (choice === 2 && game.witch.kill) {
        game.nightActions.set(sender, { ...action, type: 'kill', target });
      }
      break;
  }
}

module.exports = {
  wwHandler,
  wwJoinHandler,
  wwStartHandler,
  wwHelpHandler,
  wwVoteHandler,
  handleNightAction
};
