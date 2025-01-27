async function menuHandler(sock, msg) {
    const menu = `
━━━┗MASIH TEST┛━━━

↓━━━━┗MENU┛━━━━↓
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

━━━┗DOWNLOAD┛━━━
• .ttnowm Ⓛ
• .tiktoknowmⓁ
• .ytmp3
• .ytmp4 

━━━━━┗GAME┛━━━━━
• .math 
• .ttt
• .suit 
• .sambungkata 
• .dice 
• .werewolf (Maintenance) 

━━━━┗Editor┛━━━━
• .sticker Ⓛ

━━━━┗SEARCH┛━━━━
• .spotify Ⓛ

━━━━┗RANDOM┛━━━━
• .afk 
• .quotes

━━━━━┗INFO┛━━━━━
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