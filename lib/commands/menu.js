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

━━━━━┗GAME┛━━━━━
• .math 
• .suit 

━━━━┗Editor┛━━━━
• .sticker Ⓛ

━━━━┗SEARCH┛━━━━
• .spotify Ⓛ

━━━━┗RANDOM┛━━━━
• .afk 
• .confess

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