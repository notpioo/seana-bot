const { profileHandler } = require("../lib/commands/profile");
const { setUsernameHandler } = require("../lib/commands/username");
const { menuHandler } = require("../lib/commands/menu");
const { updateHandler } = require("../lib/commands/update");
const {
    suitHandler,
    handleSuitResponse,
    handleSuitChoice,
} = require("../lib/commands/suit");
const { stickerHandler } = require("../lib/commands/sticker");
const { cekPremHandler } = require("../lib/commands/cekprem");
const { listPremHandler } = require("../lib/commands/listprem");
const { listBanHandler } = require("../lib/commands/listban");
const User = require("../database/models/User");
const { stickertextHandler } = require("../lib/commands/stickertext");
const { quoteChatHandler } = require("../lib/commands/quotechat");
const {
    mathHandler,
    handleMathAnswer,
    hasMathGame,
} = require("../lib/commands/math");
const {
    confessHandler,
    handleConfessReply,
} = require("../lib/commands/confess");
const { tiktokHandler } = require("../lib/commands/tiktok");
const {
    tictactoeHandler,
    handleTicTacToeMove,
} = require("../lib/commands/tictactoe");
const { topGlobalHandler } = require("../lib/commands/topglobal");
const { addHandler, kickHandler } = require("../lib/commands/group");
const { seaHandler } = require("../lib/commands/sea");
const { setApikeyHandler } = require("../lib/commands/setapikey");
const { quotesHandler } = require("../lib/commands/quotes");
const {
    susunKataHandler,
    handleSusunKataAnswer,
    gameState,
    leaderboardSusunHandler,
} = require("../lib/commands/susunkata");
const {
    cryptoHandler,
    mineHandler,
    buyRamHandler,
} = require("../lib/commands/crypto");
const { marketHandler, sellCryptoHandler } = require("../lib/commands/market");
const {
    diceHandler,
    joinDiceHandler,
    startDiceHandler,
    handleDiceChoice,
    diceStatsHandler,
    resetDiceStatsHandler,
} = require("../lib/commands/dice");
const {
    balanceHandler,
    limitHandler,
    premiumHandler,
    banHandler,
    addCdCryptoHandler,
} = require("../lib/commands/owner");
const {
    fishingHandler,
    dashboardHandler,
    areaHandler,
    switchRodHandler,
    fishBagHandler,
    sellFishHandler,
    fishShopHandler,
    fishStatsHandler,
    switchBaitHandler,
    baitShopHandler,
    buyBaitHandler,
    buyRodHandler,
    lockFishHandler,
    unlockFishHandler,
    specialShopHandler,
    addStockHandler,
} = require("../lib/commands/fish");
const {
    tradeHandler,
    handleTradeResponse,
    putTradeHandler,
    acceptTradeHandler,
    cancelTradeHandler,
} = require("../lib/commands/trade");
const { fastTypeHandler, handleAnswer } = require("../lib/commands/fasttype");
const {
    inventoryHandler,
    useBoostHandler,
} = require("../lib/commands/inventory");
const { transferHandler } = require("../lib/commands/transfer");
const { afkHandler, checkAfkStatus } = require("../lib/commands/afk");
const Fish = require("../database/models/Fish");
const {
    tebakBomHandler,
    handleBombGuess,
} = require("../lib/commands/tebakbom");
const {
    tebakAngkaHandler,
    handleGuess,
    hasActiveGame,
} = require("../lib/commands/tebakangka");


// Added to load bot configuration.  Error handling is crucial.
const botSettings = require("../config/settings");
let config;
try {
    config = botSettings.getBotConfig();
} catch (error) {
    console.error("Error loading bot configuration:", error);
    // Handle the error appropriately, perhaps with a default config or exiting the process.
    process.exit(1);
}

async function handleMessages(sock) {
    sock.ev.on("messages.upsert", async (m) => {
        try {
            const msg = m.messages[0];
            // Allow commands from both private and group chats, including self-messages
            const body =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                msg.message?.videoMessage?.caption ||
                msg.message?.viewOnceMessage?.message?.imageMessage?.caption ||
                msg.message?.viewOnceMessage?.message?.videoMessage?.caption ||
                "";

            // Reset daily limits
            User.resetDailyLimits();

            // Check if user is banned
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const user = await User.getUser(senderJid);

            if (user?.isBanned) {
                if (user.banExpiry && user.banExpiry > Date.now()) {
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `❌ Anda sedang dalam masa banned sampai ${new Date(user.banExpiry).toLocaleString()}`,
                        quoted: msg,
                    });
                    return;
                } else {
                    await User.updateUser(senderJid, {
                        isBanned: false,
                        banExpiry: null,
                    });
                }
            }

            // Check premium expiry
            if (user?.status === "premium" && user.premiumExpiry) {
                const now = new Date();
                const expiry = new Date(user.premiumExpiry);

                if (expiry < now) {
                    try {
                        const updated = await User.updateUser(senderJid, {
                            status: "basic",
                            premiumExpiry: null,
                            limit: 25,
                        });

                        if (updated) {
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: "⚠️ Status premium Anda telah berakhir. Status diubah menjadi basic.",
                                quoted: msg,
                            });
                        }
                    } catch (error) {
                        console.error(
                            "Error updating expired premium status:",
                            error,
                        );
                    }
                }
            }

            // Handle commands
            if (body.startsWith(".")) {
                const command = body.slice(1).split(" ")[0];

                switch (command) {
                    case "profile":
                        await profileHandler(sock, msg);
                        break;
                    case "setusername":
                        await setUsernameHandler(sock, msg);
                        break;
                    case "menu":
                        await menuHandler(sock, msg);
                        break;
                    case "suit":
                        const mentionedJid =
                            msg.message?.extendedTextMessage?.contextInfo
                                ?.mentionedJid || [];
                        if (mentionedJid.length === 0) {
                            await sock.sendMessage(msg.key.remoteJid, {
                                text: "❌ Tag lawan untuk memulai suit! Contoh: .suit @mention",
                                quoted: msg,
                            });
                            return;
                        }
                        await suitHandler(sock, msg, mentionedJid);
                        break;
                    case "addbalance":
                        await balanceHandler(sock, msg, "add");
                        break;
                    case "delbalance":
                        await balanceHandler(sock, msg, "del");
                        break;
                    case "addlimit":
                        await limitHandler(sock, msg, "add");
                        break;
                    case "dellimit":
                        await limitHandler(sock, msg, "del");
                        break;
                    case "addprem":
                        await premiumHandler(sock, msg, "add");
                        break;
                    case "delprem":
                        await premiumHandler(sock, msg, "del");
                        break;
                    case "ban":
                        await banHandler(sock, msg, "ban");
                        break;
                    case "unban":
                        await banHandler(sock, msg, "unban");
                        break;
                    case "cekprem":
                        await cekPremHandler(sock, msg);
                        break;
                    case "listprem":
                        await listPremHandler(sock, msg);
                        break;
                    case "listban":
                        await listBanHandler(sock, msg);
                        break;
                    case "sticker":
                    case "s":
                        await stickerHandler(sock, msg);
                        break;
                    case "st":
                        await stickertextHandler(sock, msg);
                        break;
                    case "qc":
                        await quoteChatHandler(sock, msg);
                        break;
                    case "math":
                        await mathHandler(sock, msg);
                        break;
                    case "confess":
                        await confessHandler(sock, msg);
                        break;
                    case "ttnowm":
                        await tiktokHandler(sock, msg);
                        break;
                    case "ttt":
                        await tictactoeHandler(sock, msg);
                        break;
                    case "topglobal":
                        await topGlobalHandler(sock, msg);
                        break;
                    case "add":
                        await addHandler(sock, msg);
                        break;
                    case "kick":
                        await kickHandler(sock, msg);
                        break;
                    case "sea":
                        await seaHandler(sock, msg);
                        break;
                    case "setapikey":
                        await setApikeyHandler(sock, msg);
                        break;
                    case "susunkata":
                        await susunKataHandler(sock, msg);
                        break;
                    case "lbsusun":
                        await leaderboardSusunHandler(sock, msg);
                        break;
                    case "dice":
                        await diceHandler(sock, msg);
                        break;
                    case "joindice":
                        await joinDiceHandler(sock, msg);
                        break;
                    case "startdice":
                        await startDiceHandler(sock, msg);
                        break;
                    case "dicestats":
                        await diceStatsHandler(sock, msg);
                        break;
                    case "resetdice":
                        await resetDiceStatsHandler(sock, msg);
                        break;
                    case "inventory":
                        await inventoryHandler(sock, msg);
                        break;
                    case "crypto":
                        await cryptoHandler(sock, msg);
                        break;
                    case "mine":
                        await mineHandler(sock, msg);
                        break;
                    case "buyram":
                        await buyRamHandler(sock, msg);
                        break;
                    case "market":
                        await marketHandler(sock, msg);
                        break;
                    case "addcdcrypto":
                        await addCdCryptoHandler(sock, msg);
                        break;
                    case "use":
                        await useBoostHandler(sock, msg);
                        break;
                    case "tf":
                        await transferHandler(sock, msg);
                        break;
                    case "fish":
                        await fishingHandler(sock, msg);
                        break;
                    case "fishing":
                        await dashboardHandler(sock, msg);
                        break;
                    case "area":
                        await areaHandler(sock, msg);
                        break;
                    case "switchrod":
                        await switchRodHandler(sock, msg);
                        break;
                    case "fishbag":
                        await fishBagHandler(sock, msg);
                        break;
                    case "sellfish":
                        await sellFishHandler(sock, msg);
                        break;
                    case "fishshop":
                        await fishShopHandler(sock, msg);
                        break;
                    case "fishstats":
                        await fishStatsHandler(sock, msg);
                        break;
                    case "buyrod":
                        await buyRodHandler(sock, msg);
                        break;
                    case "switchbait":
                        await switchBaitHandler(sock, msg);
                        break;
                    case "baitshop":
                        await baitShopHandler(sock, msg);
                        break;
                    case "buybait":
                        await buyBaitHandler(sock, msg);
                        break;
                    case "lockfish":
                        await lockFishHandler(sock, msg);
                        break;
                    case "unlockfish":
                        await unlockFishHandler(sock, msg);
                        break;
                    case "specialshop":
                        await specialShopHandler(sock, msg);
                        break;
                    case "addstock":
                        await addStockHandler(sock, msg);
                        break;
                    case "trade":
                        await tradeHandler(sock, msg);
                        break;
                    case "puttrade":
                        await putTradeHandler(sock, msg);
                        break;
                    case "atrade":
                        await acceptTradeHandler(sock, msg);
                        break;
                    case "ctrade":
                        await cancelTradeHandler(sock, msg);
                        break;
                    case "update":
                        await updateHandler(sock, msg);
                        break;
                    case "tebakbom":
                        await tebakBomHandler(sock, msg);
                        break;
                    case "tebakangka":
                        await tebakAngkaHandler(sock, msg);
                        break;
                    case "fasttype":
                        await fastTypeHandler(sock, msg);
                        break;
                    case "afk":
                        await afkHandler(sock, msg);
                        break;
                    case "yt":
                        await youtubeHandler(sock, msg);
                        break;
                    
                }

                

                // Handle additional commands
                if (command === "quotes") {
                    await quotesHandler(sock, msg);
                } else if (command === "ping") {
                    const start = performance.now();
                    await sock.sendMessage(msg.key.remoteJid, {
                        react: { text: "🏓", key: msg.key },
                    });
                    const latency = (performance.now() - start).toFixed(4);
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `🏓 Pong! Latency: ${latency}ms`,
                        quoted: msg,
                    });
                } else if (command === "boostinfo") {
                    const infoNumber = parseInt(body.split(" ")[1]);
                    if (isNaN(infoNumber)) {
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: "❌ Silakan masukkan nomor boost yang ingin dilihat. Contoh: .boostinfo 1",
                            quoted: msg,
                        });
                        return;
                    }
                    await boostInfoHandler(sock, msg, infoNumber);
                }
            }

            // Handle game moves
            const moveNumber = parseInt(body);
            if (!isNaN(moveNumber) && moveNumber >= 1 && moveNumber <= 9) {
                await handleTicTacToeMove(sock, msg);
            }

            // Handle bomb guesses (1-9)
            const guess = parseInt(body);
            if (!isNaN(guess)) {
                if (guess >= 1 && guess <= 9) {
                    await handleBombGuess(sock, msg);
                }
                // Handle number guessing game
                if (hasActiveGame(msg.key.remoteJid)) {
                    await handleGuess(sock, msg);
                }
            }

            // Handle dice choices (K/B)
            if (["K", "B"].includes(body.toUpperCase())) {
                await handleDiceChoice(sock, msg);
            }

            // Handle susun kata answers
            if (gameState[msg.key.remoteJid]?.isActive) {
                await handleSusunKataAnswer(sock, msg);
            }

            // Handle suit/trade responses (Y/T)
            if (body.toUpperCase() === "Y" || body.toUpperCase() === "T") {
                // Cek apakah ada suit response handler dulu
                const isSuitResponse = await handleSuitResponse(sock, msg);

                // Jika bukan suit response, cek apakah trade response
                if (!isSuitResponse) {
                    await handleTradeResponse(sock, msg);
                }
            }

            // Handle suit choices (G/B/K)
            if (["G", "B", "K"].includes(body.toUpperCase())) {
                await handleSuitChoice(sock, msg);
            }

            // Handle math game answers
            if (!isNaN(body) && hasMathGame(msg.key.remoteJid)) {
                await handleMathAnswer(sock, msg);
            }

            // Handle fast type answers
            await handleAnswer(sock, msg);

            // Handle confess replies
            await handleConfessReply(sock, msg);

            // Check AFK status
            await checkAfkStatus(sock, msg);
        } catch (error) {
            console.error("Error handling message:", error);
            try {
                if (m && m.messages && m.messages[0] && m.messages[0].key && m.messages[0].key.remoteJid) {
                    await sock.sendMessage(m.messages[0].key.remoteJid, {
                        text: "❌ Terjadi kesalahan saat memproses command",
                        quoted: m.messages[0],
                    });
                }
            } catch (err) {
                console.error("Error in error handler:", err);
            }
        }
    });
}

module.exports = { handleMessages };