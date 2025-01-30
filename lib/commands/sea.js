// lib/commands/sea.js
const { OpenAI } = require("openai");
const User = require('../../database/models/User');
const ApiKey = require('../../database/models/Apikey');

// Konfigurasi AI/ML API
const AI_CONFIG = {
    baseURL: 'https://api.aimlapi.com/v1',
    defaultModel: 'mistralai/Mistral-7B-Instruct-v0.2'
};

async function getAIResponse(query, apiKey) {
    const systemPrompt = "You are a helpful assistant. Be descriptive and informative in your responses.";
    
    try {
        const api = new OpenAI({
            apiKey: apiKey,
            baseURL: AI_CONFIG.baseURL,
        });

        const completion = await api.chat.completions.create({
            model: AI_CONFIG.defaultModel,
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: query,
                },
            ],
            temperature: 0.7,
            max_tokens: 256,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Detailed error:', error);
        throw new Error(`Error from AI: ${error.message}`);
    }
}

async function seaHandler(sock, msg) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Cek user dan limit
        const user = await User.getUser(senderJid);
        if (!user) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Anda belum terdaftar! Silahkan daftar terlebih dahulu.',
                quoted: msg
            });
            return;
        }

        if (!(await User.useLimit(senderJid))) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Limit anda sudah habis! Silahkan tunggu reset harian atau upgrade ke premium.',
                quoted: msg
            });
            return;
        }

        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        
        // Format: .sea <query>
        const query = body.slice(5).trim();

        if (!query) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Silahkan masukkan pertanyaan! Contoh: .sea Siapa presiden Indonesia?',
                quoted: msg
            });
            return;
        }

        // Ambil API key dari database
        const apiKeyDoc = await ApiKey.findOne({ name: 'aiml' });
        if (!apiKeyDoc || !apiKeyDoc.key) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ API key belum diatur. Gunakan .setapikey <apikey>',
                quoted: msg
            });
            return;
        }

        await sock.sendPresenceUpdate('composing', msg.key.remoteJid);

        const answer = await getAIResponse(query, apiKeyDoc.key);

        await sock.sendMessage(msg.key.remoteJid, {
            text: `🤖 *AI Response*\n\n*Q:* ${query}\n\n*A:* ${answer}`,
            quoted: msg
        });

    } catch (error) {
        console.error('Error in sea command:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ ' + (error.message || 'Terjadi kesalahan saat memproses permintaan.'),
            quoted: msg
        });
    }
}

module.exports = { seaHandler };