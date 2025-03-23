const gameRooms = new Map();

class WerewolfGame {
  constructor(groupId, creator) {
    this.groupId = groupId;
    this.creator = creator;
    this.players = new Set();
    this.players.add(creator);
    this.roles = new Map();
    this.phase = 'waiting';
    this.votes = new Map();
    this.nightActions = new Map();
    this.witch = {
      heal: true,
      kill: true
    };
  }

  getPlayerCount() {
    return this.players.size;
  }

  addPlayer(playerId) {
    if (this.players.has(playerId) || this.players.size >= 9) {
      return false;
    }
    this.players.add(playerId);
    return true;
  }

  assignRoles() {
    const players = Array.from(this.players);
    const count = players.length;
    let roles = [];

    // Assign roles based on player count
    if (count === 4) {
      roles = ['werewolf', 'seer', 'guardian', 'villager'];
    } else if (count === 5) {
      roles = ['werewolf', 'seer', 'guardian', 'villager', 'villager'];
    } else if (count === 6) {
      roles = ['werewolf', 'seer', 'guardian', 'lycan', 'villager', 'villager'];
    } else if (count === 7) {
      roles = ['werewolf', 'werewolf', 'seer', 'guardian', 'witch', 'villager', 'villager'];
    } else if (count === 8) {
      roles = ['werewolf', 'werewolf', 'seer', 'guardian', 'witch', 'lycan', 'villager', 'villager'];
    } else if (count === 9) {
      roles = ['werewolf', 'werewolf', 'seer', 'guardian', 'witch', 'hunter', 'lycan', 'villager', 'villager'];
    }

    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Assign to players
    players.forEach((player, index) => {
      this.roles.set(player, roles[index]);
    });
  }

  async start(sock) {
    this.assignRoles();
    this.phase = 'night';

    // Send roles to players privately
    for (const [player, role] of this.roles) {
      const roleDescs = {
        werewolf: "🐺 Serigala - Bunuh penduduk desa setiap malam",
        seer: "👁️ Peramal - Dapat melihat peran pemain lain",
        guardian: "🛡️ Pelindung - Lindungi satu pemain setiap malam",
        villager: "👨 Penduduk - Bantu desa mengalahkan serigala",
        witch: "🧙‍♀️ Penyihir - Dapat menyembuhkan atau meracuni pemain",
        hunter: "🏹 Pemburu - Dapat membunuh pemain saat mati",
        lycan: "🐾 Manusia Serigala - Terlihat sebagai serigala oleh Peramal"
      };

      await sock.sendMessage(player, {
        text: `*Peran Kamu:* ${roleDescs[role]}\n\nTunggu instruksi selanjutnya di grup.`
      });
    }

    // Start night phase
    await this.nightPhase(sock);
  }

  async nightPhase(sock) {
    this.phase = 'night';
    this.nightActions.clear(); // Clear previous night actions
    await sock.sendMessage(this.groupId, { text: "🌙 *Malam Tiba*\nPenduduk desa tertidur lelap...\n\nPara pemain dengan peran khusus silakan cek chat pribadi dengan bot!" });

    // Send prompts to special roles
    for (const [player, role] of this.roles) {
      const availableTargets = Array.from(this.players).filter(p => p !== player);
      const targets = availableTargets
        .map((p, i) => `${i + 1}. @${p.split('@')[0]}`)
        .join('\n');

      let promptText = '';

      // Store targets for processing responses
      if (['werewolf', 'seer', 'guardian', 'witch'].includes(role)) {
        this.nightActions.set(player, {
          role,
          targets: availableTargets,
          hasVoted: false
        });
      }

      switch (role) {
        case 'werewolf':
          promptText = `🐺 *Pilih target untuk dibunuh:*\n\n${targets}\n\nBalas dengan angka pilihan.`;
          break;
        case 'seer':
          promptText = `👁️ *Pilih pemain untuk dilihat perannya:*\n\n${targets}\n\nBalas dengan angka pilihan.`;
          break;
        case 'guardian':
          promptText = `🛡️ *Pilih pemain untuk dilindungi:*\n\n${targets}\n\nBalas dengan angka pilihan.`;
          break;
        case 'witch':
          if (this.witch.heal || this.witch.kill) {
            promptText = `🧙‍♀️ *Pilih aksi:*\n${this.witch.heal ? '\n1. Sembuhkan pemain' : ''}${this.witch.kill ? '\n2. Racuni pemain' : ''}\n\nBalas dengan angka pilihan.`;
          }
          break;
      }

      if (promptText) {
        await sock.sendMessage(player, {
          text: promptText,
          mentions: Array.from(this.players).filter(p => p !== player)
        });
      }
    }

    // Set timeout for night phase
    setTimeout(() => this.dayPhase(sock), 60000);
  }

  async dayPhase(sock) {
    this.phase = 'day';
    this.votes.clear();

    // Process night actions
    const targets = new Map();
    const protectedPlayers = new Set();

    // Process guardian protection
    for (const [player, action] of this.nightActions) {
      if (this.roles.get(player) === 'guardian' && action.type === 'protect') {
        protectedPlayers.add(action.target);
      }
    }

    // Process werewolf kills
    for (const [player, action] of this.nightActions) {
      if (this.roles.get(player) === 'werewolf' && action.type === 'kill') {
        if (!protectedPlayers.has(action.target)) {
          targets.set(action.target, 'killed');
        }
      }
    }

    // Process witch actions
    for (const [player, action] of this.nightActions) {
      if (this.roles.get(player) === 'witch') {
        if (action.type === 'heal' && this.witch.heal) {
          targets.delete(action.target);
          this.witch.heal = false;
        } else if (action.type === 'kill' && this.witch.kill) {
          targets.set(action.target, 'poisoned');
          this.witch.kill = false;
        }
      }
    }

    // Announce deaths
    let deathAnnouncement = '🌅 *Dawn breaks...*\n\n';
    if (targets.size === 0) {
      deathAnnouncement += 'No one died last night!';
    } else {
      deathAnnouncement += 'Last night:\n';
      for (const [target, cause] of targets) {
        this.players.delete(target);
        deathAnnouncement += `@${target.split('@')[0]} was ${cause}!\n`;
      }
    }

    await sock.sendMessage(this.groupId, {
      text: deathAnnouncement,
      mentions: Array.from(targets.keys())
    });

    // Check win conditions
    const werewolves = Array.from(this.players).filter(p => this.roles.get(p) === 'werewolf').length;
    const villagers = this.players.size - werewolves;

    if (werewolves === 0) {
      await this.endGame(sock, 'villagers');
      return;
    } else if (werewolves >= villagers) {
      await this.endGame(sock, 'werewolves');
      return;
    }

    // Start voting phase
    await sock.sendMessage(this.groupId, {
      text: '🗳️ *Voting Phase*\n\nDiscuss and vote who to eliminate!\n' +
        'Use .wwvote @mention to cast your vote.\n' +
        'You have 60 seconds to vote.'
    });

    // Set timeout for voting phase
    setTimeout(() => this.processVotes(sock), 60000);
  }

  async processVotes(sock) {
    if (this.phase !== 'day') return;

    const voteCount = new Map();
    for (const target of this.votes.values()) {
      voteCount.set(target, (voteCount.get(target) || 0) + 1);
    }

    let maxVotes = 0;
    let eliminated = null;

    for (const [player, votes] of voteCount) {
      if (votes > maxVotes) {
        maxVotes = votes;
        eliminated = player;
      }
    }

    if (eliminated) {
      this.players.delete(eliminated);
      await sock.sendMessage(this.groupId, {
        text: `⚖️ The village has decided!\n@${eliminated.split('@')[0]} has been eliminated!`,
        mentions: [eliminated]
      });

      // Check win conditions again
      const werewolves = Array.from(this.players).filter(p => this.roles.get(p) === 'werewolf').length;
      const villagers = this.players.size - werewolves;

      if (werewolves === 0) {
        await this.endGame(sock, 'villagers');
        return;
      } else if (werewolves >= villagers) {
        await this.endGame(sock, 'werewolves');
        return;
      }
    }

    // Reset for next night
    this.nightActions.clear();
    setTimeout(() => this.nightPhase(sock), 5000);
  }

  async endGame(sock, winners) {
    this.phase = 'ended';

    let endMessage = '🎮 *Permainan Selesai!*\n\n';
    endMessage += `${winners === 'villagers' ? '🎉 Penduduk Desa' : '🐺 Serigala'} menang!\n\n`;
    endMessage += '*Peran setiap pemain:*\n';

    const roleNames = {
      'werewolf': '🐺 Serigala',
      'seer': '👁️ Peramal',
      'guardian': '🛡️ Pelindung',
      'villager': '👨 Penduduk',
      'witch': '🧙‍♀️ Penyihir',
      'hunter': '🏹 Pemburu',
      'lycan': '🐾 Manusia Serigala'
    };

    for (const [player, role] of this.roles) {
      endMessage += `@${player.split('@')[0]} adalah ${roleNames[role]}\n`;
    }

    await sock.sendMessage(this.groupId, {
      text: endMessage,
      mentions: Array.from(this.roles.keys())
    });

    // Remove game room
    gameRooms.delete(this.groupId);
  }
}

module.exports = {
  WerewolfGame,
  gameRooms
};