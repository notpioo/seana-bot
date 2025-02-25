async function menuHandler(sock, msg) {
    const menu = `
━━━┗Seana Bot┛━━━

↓━━━━┗MENU┛━━━━↓

━━━━━━┗AI┛━━━━━━━
• .sea

━━━━━┗OWNER┛━━━━━
• .ban
• .unban
• .addprem 
• .delprem
• .addbalance
• .delbalance
• .addlimit
• .dellimit
• .setpp

━━━━┗GROUP┛━━━━
• .add
• .kick

━━━┗DOWNLOAD┛━━━
• .ttnowm Ⓛ
• .tiktoknowmⓁ

━━━━━┗GAME┛━━━━━
• .inventory
• .math 
• .suit 
• .ttt
• .dice
• .fish
• .fasttype
• .susunkata
• .tebakangka
• .tebakbom

━━━━┗Editor┛━━━━
• .sticker Ⓛ

━━━━┗SEARCH┛━━━━
• .spotify Ⓛ

━━━━┗RANDOM┛━━━━
• .afk 
• .confess

━━━━━┗INFO┛━━━━━
• .topglobal
• .cekprem
• .listprem
• .listban
• .profile
• .ping

Ⓟ : Premium
Ⓛ : Limit

━━━━┗THANK YOU┛━━━━
`;

    await sock.sendMessage(msg.key.remoteJid, { text: menu });
}

module.exports = { menuHandler };