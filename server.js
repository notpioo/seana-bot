const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { exec, spawn } = require('child_process');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const http = require('http');
const { Server } = require('socket.io');

const execAsync = promisify(exec);
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'web')));

// Bot state
let botProcess = null;
let botState = {
    status: 'offline',
    startTime: null
};

// Socket connection for real-time logs
io.on('connection', (socket) => {
    console.log('Client connected to websocket');

    // Send current bot status on connection
    socket.emit('botStatus', {
        status: botState.status,
        startTime: botState.startTime
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected from websocket');
    });
});

// Function to send logs to all connected clients
function sendLogToClients(message, type = 'info') {
    io.emit('botLog', {
        time: new Date().toLocaleTimeString(),
        message,
        type
    });
}

// API Routes
app.get('/api/bot/status', (req, res) => {
    res.json({
        status: botState.status,
        startTime: botState.startTime
    });
});

// Bot Config API Routes
app.get('/api/bot/config', async (req, res) => {
    try {
        const configFilePath = path.join(__dirname, 'config', 'settings.json');
        let configData = {
            botName: 'BabyChand Bot',
            packname: 'BabyChand',
            authorname: 'Darraaaa',
            footerText: '2022 © BabyChand Bot',
            limit: 20,
            balanceLimit: 250,
            owners: [
                { name: 'Darraaaa', number: '628570957572' },
                { name: 'Renn', number: '6287883480816' },
                { name: 'Pioo', number: '6289536066429' }
            ],
            prefix: '.#/!',
            prefixType: 'multi',
            onlineOnConnect: true,
            premiumNotification: true,
            sewaNotification: true,
            joinToUse: false
        };

        try {
            const fileData = await fs.readFile(configFilePath, 'utf8');
            configData = JSON.parse(fileData);
        } catch (error) {
            // File tidak ada atau format tidak valid, kembalikan default
            console.log('Config file not found or invalid, using default config');
            // Buat file config default jika tidak ada
            const configDir = path.dirname(configFilePath);
            try {
                await fs.mkdir(configDir, { recursive: true });
                await fs.writeFile(configFilePath, JSON.stringify(configData, null, 2), 'utf8');
                console.log('Created default config file');
            } catch (writeError) {
                console.error('Failed to create default config file:', writeError);
            }
        }

        res.json({ success: true, config: configData });
    } catch (error) {
        console.error('Error reading config file:', error);
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/bot/config', async (req, res) => {
    try {
        const configData = req.body;

        if (!configData || !configData.botName) {
            return res.json({ success: false, message: 'Invalid configuration data' });
        }

        const configFilePath = path.join(__dirname, 'config', 'settings.json');
        const configDir = path.dirname(configFilePath);

        // Pastikan direktori config ada
        try {
            await fs.mkdir(configDir, { recursive: true });
        } catch (error) {
            console.log('Config directory already exists or error creating it:', error);
        }

        // Simpan konfigurasi ke file JSON
        await fs.writeFile(configFilePath, JSON.stringify(configData, null, 2), 'utf8');

        // Kirim pesan ke semua klien WebSocket bahwa konfigurasi telah diperbarui
        sendLogToClients('Bot configuration updated successfully', 'info');

        // Kirim event ke bot agar memuat ulang konfigurasi
        global.botConfigUpdated = true;

        res.json({ success: true, message: 'Configuration saved successfully' });
    } catch (error) {
        console.error('Error saving config file:', error);
        res.json({ success: false, message: error.message });
    }
});

// Menu API Routes
app.get('/api/bot/menu', async (req, res) => {
    try {
        const menuFilePath = path.join(__dirname, 'config', 'menu.json');
        let menuContent = "";

        try {
            const fileData = await fs.readFile(menuFilePath, 'utf8');
            const menuData = JSON.parse(fileData);
            menuContent = menuData.menu || "";
        } catch (error) {
            // File tidak ada atau format tidak valid, kembalikan default
            console.log('Menu file not found or invalid, returning empty menu');
        }

        res.json({ success: true, menu: menuContent });
    } catch (error) {
        console.error('Error reading menu file:', error);
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/bot/menu', async (req, res) => {
    try {
        const { menu } = req.body;
        if (menu === undefined) {
            return res.json({ success: false, message: 'Menu content is required' });
        }

        const menuFilePath = path.join(__dirname, 'config', 'menu.json');
        const menuDir = path.dirname(menuFilePath);

        // Pastikan direktori config ada
        try {
            await fs.mkdir(menuDir, { recursive: true });
        } catch (error) {
            console.log('Config directory already exists or error creating it:', error);
        }

        // Simpan menu ke file JSON
        await fs.writeFile(menuFilePath, JSON.stringify({ menu }, null, 2), 'utf8');

        res.json({ success: true, message: 'Menu saved successfully' });
    } catch (error) {
        console.error('Error saving menu file:', error);
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/bot/start', async (req, res) => {
    try {
        if (botState.status === 'online') {
            return res.json({ success: false, message: 'Bot is already running' });
        }

        if (botProcess) {
            botProcess.kill();
            botProcess = null;
        }

        const method = req.body.method || 'qr';
        const phoneNumber = req.body.phoneNumber;

        sendLogToClients(`Starting bot with ${method}...`);

        const env = {
            ...process.env,
            START_METHOD: method,
            PHONE_NUMBER: phoneNumber
        };

        botProcess = spawn('node', ['index.js'], {
            env,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        botProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`Bot stdout: ${output}`);
            sendLogToClients(output);

            // Check if the output contains a QR code
            if (output.includes('scan QR code') || output.includes('QR Code received')) {
                sendLogToClients('QR Code ready for scanning! Check logs below.', 'qr');
            }

            // Deteksi tampilan QR code di terminal
            if (output.includes('█') || output.includes('▄') || output.includes('▀') || output.includes('▓') || output.includes('▒')) {
                // Ini adalah baris QR code
                sendLogToClients(output, 'qrcode');
            }
            
            // Deteksi pairing code
            if (output.includes('Your WhatsApp pairing code:') || output.includes('phone connected, code:')) {
                const pairingCode = output.match(/(?:Your WhatsApp pairing code:|phone connected, code:)\s*(\d+)/i)?.[1];
                if (pairingCode) {
                    sendLogToClients(`Kode Pairing WhatsApp Anda: ${pairingCode}`, 'pairingcode');
                }
            }

            // Deteksi status koneksi
            if (output.includes('Connected to WhatsApp')) {
                sendLogToClients('✅ Berhasil terhubung ke WhatsApp', 'success');
            } else if (output.includes('Connection closed')) {
                sendLogToClients('❌ Koneksi terputus dari WhatsApp', 'error');
            }
        });

        botProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.error(`Bot stderr: ${error}`);
            sendLogToClients(error, 'error');
        });

        botProcess.on('close', (code) => {
            const message = `Bot process exited with code ${code}`;
            console.log(message);
            sendLogToClients(message);
            botState.status = 'offline';
            botState.startTime = null;
            botProcess = null;
        });

        botState.status = 'online';
        botState.startTime = new Date().toISOString();

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to start bot:', error);
        sendLogToClients(`Failed to start bot: ${error.message}`, 'error');
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/bot/stop', async (req, res) => {
    try {
        if (botState.status === 'offline') {
            return res.json({ success: false, message: 'Bot is not running' });
        }

        if (botProcess) {
            botProcess.kill();
            botProcess = null;
        }

        botState.status = 'offline';
        botState.startTime = null;

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to stop bot:', error);
        res.json({ success: false, message: error.message });
    }
});

app.delete('/api/bot/session', async (req, res) => {
    try {
        if (botState.status === 'online') {
            return res.json({ success: false, message: 'Stop the bot first before deleting session' });
        }

        const authPath = process.env.AUTH_PATH || path.join(__dirname, 'sessions', 'auth_info');

        try {
            await execAsync(`rm -rf ${authPath}`);
            res.json({ success: true });
        } catch (error) {
            console.error('Failed to delete session:', error);
            res.json({ success: false, message: error.message });
        }
    } catch (error) {
        console.error('Error in delete session endpoint:', error);
        res.json({ success: false, message: error.message });
    }
});

// Routes for auth pages
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'register.html'));
});

// Authentication middleware to protect routes
const authenticateMiddleware = (req, res, next) => {
    // For API routes, check authentication header
    const authHeader = req.headers.authorization;

    if (req.path === '/login.html' || req.path === '/register.html' || 
        req.path === '/login' || req.path === '/register' || 
        req.path.startsWith('/firebase-auth.js') || 
        req.path.startsWith('/login.js') || 
        req.path.startsWith('/register.js') ||
        req.path.startsWith('/style.css')) {
        // Allow access to auth pages without authentication
        return next();
    }

    // If accessing main page or dashboard, redirect to login
    if (!authHeader && (req.path === '/' || req.path === '/index.html')) {
        return res.redirect('/login.html');
    }

    // For API calls, return 401 if not authenticated
    if (!authHeader && req.path.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    next();
};

// Apply authentication middleware
app.use(authenticateMiddleware);

// Route middleware for protected routes
const checkAuth = (req, res, next) => {
    // Firebase auth will be handled client-side
    // This is just to ensure direct URL access is redirected to login
    const authPages = ['/login', '/register'];
    if (!authPages.includes(req.path) && req.path !== '/firebase-auth.js') {
        res.sendFile(path.join(__dirname, 'web', 'index.html'));
    } else {
        next();
    }
};

// Apply auth middleware to all routes except login and register
app.get('/', checkAuth);

// Catch-all route to serve the main HTML file
app.get('*', (req, res, next) => {
    if (req.path.includes('.')) {
        next(); // Allow static files to be served
    } else {
        res.sendFile(path.join(__dirname, 'web', 'index.html'));
    }
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Dashboard web server running on port ${PORT}`);
});