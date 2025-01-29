// lib/commands/sea.js
const { Configuration, OpenAIApi } = require('openai');
const User = require('../../database/models/User');

const configuration = new Configuration({
    apiKey: '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'
});

const openai = new OpenAIApi(configuration);

async function seaHandler(sock, msg) {
    try {
        // Get the sender's JID
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Check if user exists and has limits
        const user = await User.getUser(senderJid);
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Anda belum terdaftar! Silahkan daftar terlebih dahulu.',
                quoted: msg
            });
            return;
        }

        // Check if user has enough limit
        if (!(await User.useLimit(senderJid))) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Limit anda sudah habis! Silahkan tunggu reset harian atau upgrade ke premium.',
                quoted: msg
            });
            return;
        }

        // Get the query text
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        const query = body.slice(5).trim(); // Remove '.sea ' from the message

        if (!query) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Silahkan masukkan pertanyaan! Contoh: .sea Siapa presiden Indonesia?',
                quoted: msg
            });
            return;
        }

        // Send typing indicator
        await sock.sendPresenceUpdate('composing', msg.key.remoteJid);

        // Get response from OpenAI
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "user",
                    content: query
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const answer = response.data.choices[0].message.content;

        // Send the response
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🌊 *SEA AI*\n\n*Q:* ${query}\n\n*A:* ${answer}`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in sea command:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan saat memproses permintaan.',
            quoted: msg
        });
    }
}

module.exports = { seaHandler };