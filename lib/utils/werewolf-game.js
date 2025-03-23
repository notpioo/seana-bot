class WerewolfGame {
  constructor(groupId, creator) {
    this.groupId = groupId;
    this.creator = creator;
    this.players = new Set();
    this.players.add(creator);
    this.roles = new Map();
    this.phase = "waiting";
    this.votes = new Map();
    this.nightActions = new Map();
    this.witch = {
      heal: true,
      kill: true,
    };
    this.dayCount = 1; // Initialize day count
    this.protectedPlayer = null; // Add protectedPlayer property
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

    if (count === 4) {
      roles = ["werewolf", "seer", "guardian", "villager"];
    } else if (count === 5) {
      roles = ["werewolf", "seer", "guardian", "villager", "villager"];
    } else if (count === 6) {
      roles = ["werewolf", "seer", "guardian", "lycan", "villager", "villager"];
    } else if (count === 7) {
      roles = [
        "werewolf",
        "werewolf",
        "seer",
        "guardian",
        "witch",
        "villager",
        "villager",
      ];
    } else if (count === 8) {
      roles = [
        "werewolf",
        "werewolf",
        "seer",
        "guardian",
        "witch",
        "lycan",
        "villager",
        "villager",
      ];
    } else if (count === 9) {
      roles = [
        "werewolf",
        "werewolf",
        "seer",
        "guardian",
        "witch",
        "hunter",
        "lycan",
        "villager",
        "villager",
      ];
    }

    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    players.forEach((player, index) => {
      this.roles.set(player, roles[index]);
    });
  }

  async start(sock) {
    this.assignRoles();
    this.phase = "night";

    const roleDescs = {
      werewolf:
        "🐺 Serigala - Setiap malam dapat memilih satu penduduk desa untuk dibunuh",
      seer: "👁️ Peramal - Setiap malam dapat melihat peran dari satu pemain",
      guardian:
        "🛡️ Pelindung - Setiap malam dapat melindungi satu pemain dari serangan",
      villager:
        "👨 Penduduk - Harus mencari tahu siapa serigala dan menyelamatkan desa",
      witch:
        "🧙‍♀️ Penyihir - Memiliki ramuan penyembuh dan racun (masing-masing sekali pakai)",
      hunter: "🏹 Pemburu - Saat mati dapat membawa satu pemain bersamanya",
      lycan:
        "🐾 Manusia Serigala - Terlihat sebagai serigala oleh Peramal tapi berada di pihak desa",
    };

    for (const [player, role] of this.roles) {
      await sock.sendMessage(player, {
        text: `*Peran Kamu:* ${roleDescs[role]}\n\nTunggu instruksi selanjutnya di grup.`,
      });
    }

    await this.nightPhase(sock);
  }

  async nightPhase(sock) {
    this.phase = "night";
    this.nightActions.clear();
    const msg = {
      text: `🌙 *MALAM KE-${this.dayCount}*\n\n━━━━━━━━━━━━━━━\nPenduduk desa tertidur lelap dalam kegelapan malam...\n\n👥 *Pemain Aktif:* ${Array.from(
        this.players,
      )
        .map((p) => `@${p.split("@")[0]}`)
        .join(
          ", ",
        )}\n\n🎭 Para pemain dengan peran khusus, silakan cek pesan pribadi dari bot untuk melakukan aksi malam!\n━━━━━━━━━━━━━━━`,
      mentions: Array.from(this.players),
    };
    await sock.sendMessage(this.groupId, msg, { quoted: null });

    for (const [player, role] of this.roles) {
      if (!["werewolf", "seer", "guardian", "witch"].includes(role)) continue;

      const availableTargets = Array.from(this.players).filter(
        (p) => p !== player,
      );
      const targets = availableTargets
        .map((p, i) => `${i + 1}. @${p.split("@")[0]}`)
        .join("\n");

      let promptText = "";
      this.nightActions.set(player, {
        role,
        targets: availableTargets,
        hasVoted: false,
      });

      switch (role) {
        case "werewolf":
          promptText = `🐺 *MALAM PEMBUNUHAN*\n\n━━━━━━━━━━━━━━━\n\n*Daftar Target:*\n${targets}\n\n📝 *Cara Memilih:*\nKetik *.wwc nomor* (1-${availableTargets.length})\nContoh: .wwc 1\n\n⏰ Waktu: 60 detik\n━━━━━━━━━━━━━━━`;
          break;
        case "seer":
          promptText = `👁️ *MALAM PENGLIHATAN*\n\n━━━━━━━━━━━━━━━\n\n*Daftar Target:*\n${targets}\n\n📝 *Cara Memilih:*\nKetik *.wwc nomor* (1-${availableTargets.length})\nContoh: .wwc 1\n\n⏰ Waktu: 60 detik\n━━━━━━━━━━━━━━━`;
          break;
        case "guardian":
          promptText = `🛡️ *MALAM PERLINDUNGAN*\n\n━━━━━━━━━━━━━━━\n\n*Daftar Target:*\n${targets}\n\n📝 *Cara Memilih:*\nKetik *.wwc nomor* (1-${availableTargets.length})\nContoh: .wwc 1\n\n⏰ Waktu: 60 detik\n━━━━━━━━━━━━━━━`;
          break;
        case "witch":
          if (this.witch.heal || this.witch.kill) {
            promptText = `🧙‍♀️ *MALAM SIHIR*\n\n━━━━━━━━━━━━━━━\n\n*Pilihan Sihir:*${this.witch.heal ? "\n1. 💊 Gunakan Ramuan Penyembuh" : ""}${this.witch.kill ? "\n2. ☠️ Gunakan Racun" : ""}\n\n📝 *Cara Memilih:*\nKetik *.wwc nomor* (1-2)\nContoh: .wwc 1\n\n⏰ Waktu: 60 detik\n━━━━━━━━━━━━━━━`;
          }
          break;
      }

      if (promptText) {
        await sock.sendMessage(player, {
          text: promptText,
          mentions: availableTargets,
        });
      }
    }

    setTimeout(() => this.dayPhase(sock), 60000);
  }

  async dayPhase(sock) {
    this.phase = "day";
    this.dayCount++; // Increment day count

    const targets = new Map();
    const protectedPlayers = new Set();

    for (const [player, action] of this.nightActions) {
      if (this.roles.get(player) === "guardian" && action.type === "protect") {
        protectedPlayers.add(action.target);
      }
    }

    for (const [player, action] of this.nightActions) {
      if (this.roles.get(player) === "werewolf" && action.type === "kill") {
        if (!protectedPlayers.has(action.target)) {
          targets.set(action.target, "killed");
        }
      }
    }

    for (const [player, action] of this.nightActions) {
      if (this.roles.get(player) === "witch") {
        if (action.type === "heal" && this.witch.heal) {
          targets.delete(action.target);
          this.witch.heal = false;
        } else if (action.type === "kill" && this.witch.kill) {
          targets.set(action.target, "poisoned");
          this.witch.kill = false;
        }
      }
    }

    let deathAnnouncement = `🌅 *PAGI HARI - HARI ${this.dayCount}*\n\n━━━━━━━━━━━━━━━\n`;
    if (targets.size === 0) {
      deathAnnouncement += "😇 Tidak ada korban malam ini!";
    } else {
      deathAnnouncement += "☠️ *KABAR KEMATIAN:*\n";
      for (const [target, cause] of targets) {
        this.players.delete(target);
        const deathMsg =
          cause === "killed"
            ? "telah mati dimangsa Serigala"
            : "telah mati keracunan";
        deathAnnouncement += `› @${target.split("@")[0]} ${deathMsg}!\n`;
      }
    }
    if (
      this.protectedPlayer &&
      targets.size > 0 &&
      !targets.has(this.protectedPlayer)
    ) {
      deathAnnouncement += `🛡️ Guardian berhasil melindungi @${this.protectedPlayer.split("@")[0]} dari serangan Werewolf!\n`;
    }

    await sock.sendMessage(this.groupId, {
      text: deathAnnouncement,
      mentions: Array.from(targets.keys()).concat(
        this.protectedPlayer ? [this.protectedPlayer] : [],
      ),
    });

    const werewolves = Array.from(this.players).filter(
      (p) => this.roles.get(p) === "werewolf",
    ).length;
    const villagers = this.players.size - werewolves;

    if (werewolves === 0) {
      await this.endGame(sock, "villagers");
      return;
    } else if (werewolves >= villagers) {
      await this.endGame(sock, "werewolves");
      return;
    }

    await sock.sendMessage(this.groupId, {
      text: `🗳️ *FASE VOTING - HARI ${this.dayCount}*\n\n━━━━━━━━━━━━━━━\n\n👥 *Pemain yang Tersisa:*\n${Array.from(
        this.players,
      )
        .map((p) => `› @${p.split("@")[0]}`)
        .join(
          "\n",
        )}\n\n📝 *Cara Voting:*\nKetik *.wwvote @pemain*\nContoh: .wwvote @user\n\n⏰ Waktu: 60 detik\n━━━━━━━━━━━━━━━`,
      mentions: Array.from(this.players),
    });

    setTimeout(() => this.processVotes(sock), 60000);
  }

  async processVotes(sock) {
    if (this.phase !== "day") return;

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
        text: `⚖️ The village has decided!\n@${eliminated.split("@")[0]} has been eliminated!`,
        mentions: [eliminated],
      });

      const werewolves = Array.from(this.players).filter(
        (p) => this.roles.get(p) === "werewolf",
      ).length;
      const villagers = this.players.size - werewolves;

      if (werewolves === 0) {
        await this.endGame(sock, "villagers");
        return;
      } else if (werewolves >= villagers) {
        await this.endGame(sock, "werewolves");
        return;
      }
    }

    this.nightActions.clear();
    setTimeout(() => this.nightPhase(sock), 5000);
  }

  async endGame(sock, winners) {
    this.phase = "ended";

    let endMessage = `🎮 *Permainan Selesai - Hari ${this.dayCount}!*\n\n`;
    endMessage += `${winners === "villagers" ? "🎉 Penduduk Desa" : "🐺 Serigala"} menang!\n\n`;
    endMessage += "*Peran setiap pemain:*\n";

    const roleNames = {
      werewolf: "🐺 Serigala",
      seer: "👁️ Peramal",
      guardian: "🛡️ Pelindung",
      villager: "👨 Penduduk",
      witch: "🧙‍♀️ Penyihir",
      hunter: "🏹 Pemburu",
      lycan: "🐾 Manusia Serigala",
    };

    for (const [player, role] of this.roles) {
      endMessage += `@${player.split("@")[0]} adalah ${roleNames[role]}\n`;
    }

    await sock.sendMessage(this.groupId, {
      text: endMessage,
      mentions: Array.from(this.roles.keys()),
    });
  }

  processNightActions() {
    let killedPlayer = null;
    for (const [player, action] of this.nightActions) {
      if (action.type === "kill") {
        killedPlayer = action.target;
        break; // Only one kill per night
      }
    }
    return killedPlayer;
  }
}

module.exports = WerewolfGame;
