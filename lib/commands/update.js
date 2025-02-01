async function updateHandler(sock, msg) {
    const menu = `
━━━━┗Changelog┛━━━━

Fishing Simulator

.fishing : untuk melihat dashboard memancing kamu
.fish : untuk memancing ikan
.sellfish : untuk menjual semua ikan
.sellfish <nama_ikan> : untuk menjual ikan tertentu
.fishshop : untuk melihat toko alat pancing
.buyrod <nama_rod> : untuk membeli alat pancing
.fishbag : untuk melihat isi tas ikan kamu
.area : untuk ke area memancing
.switchrod : untuk mengganti alat pancing
.fishstats : untuk melihat statistik memancing kamu
.sellrod : untuk menjual alat pancing

━━━━┗THANK YOU┛━━━━
`;

    await sock.sendMessage(msg.key.remoteJid, { text: menu });
}

module.exports = { updateHandler };