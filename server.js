
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const { promisify } = require('util');

const execAsync = promisify(exec);
require('dotenv').config();

const app = express();
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

// API Routes
app.get('/api/bot/status', (req, res) => {
    res.json({
        status: botState.status,
        startTime: botState.startTime
    });
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

        botProcess = exec('node index.js');
        
        botProcess.stdout.on('data', (data) => {
            console.log(`Bot stdout: ${data}`);
        });
        
        botProcess.stderr.on('data', (data) => {
            console.error(`Bot stderr: ${data}`);
        });
        
        botProcess.on('close', (code) => {
            console.log(`Bot process exited with code ${code}`);
            botState.status = 'offline';
            botState.startTime = null;
            botProcess = null;
        });

        botState.status = 'online';
        botState.startTime = new Date().toISOString();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to start bot:', error);
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

// Catch-all route to serve the main HTML file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dashboard web server running on port ${PORT}`);
});
