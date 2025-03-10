
document.addEventListener('DOMContentLoaded', function() {
    // Connect to WebSocket for real-time logs
    const socket = io();
    
    // Status elements
    const statusEl = document.getElementById('botStatus');
    const runtimeEl = document.getElementById('runtime');
    const connectionStatusEl = document.getElementById('connection-status');
    const logsContainer = document.getElementById('logs-container');
    const startBtn = document.getElementById('startBot');
    const stopBtn = document.getElementById('stopBot');
    const deleteBtn = document.getElementById('deleteSession');
    const toggleMode = document.querySelector('.toggle-mode');
    const faqItems = document.querySelectorAll('.faq-item');

    // Toggle dark mode
    toggleMode.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const icon = this.querySelector('i');
        if (icon.classList.contains('fa-moon')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    });

    // Toggle FAQ items
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            item.classList.toggle('active');
        });
    });

    let startTime = null;
    let runtimeInterval = null;
    let botRunning = false;

    function updateRuntime() {
        if (!startTime) return;
        
        const now = new Date();
        const diff = now - startTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        runtimeEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
    }

    function addLog(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        // Jika ini adalah QR code, jangan tambahkan timestamp
        if (type === 'qrcode') {
            logEntry.textContent = message;
        } else {
            logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        }
        
        // Special styling for QR code message
        if (type === 'qr') {
            logEntry.style.color = '#ff9800';
            logEntry.style.fontWeight = 'bold';
        } else if (type === 'error') {
            logEntry.style.color = '#f44336';
        }
        
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    // Socket event handlers
    socket.on('connect', () => {
        console.log('Connected to server websocket');
        connectionStatusEl.textContent = 'Connected';
        connectionStatusEl.classList.add('connected');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server websocket');
        connectionStatusEl.textContent = 'Disconnected';
        connectionStatusEl.classList.remove('connected');
    });
    
    socket.on('botLog', (data) => {
        addLog(data.message, data.type);
    });
    
    socket.on('botStatus', (data) => {
        if (data.status === 'online') {
            setBotOnline();
            startTime = new Date(data.startTime);
        } else {
            setBotOffline();
        }
        addLog(`Bot status: ${data.status}`);
    });

    // Check bot status on load as fallback
    fetch('/api/bot/status')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'online') {
                setBotOnline();
            } else {
                setBotOffline();
            }
            addLog(`Bot status: ${data.status}`);
        })
        .catch(error => {
            console.error('Error:', error);
            addLog('Error fetching bot status', 'error');
        });

    function setBotOnline() {
        statusEl.textContent = 'Online';
        statusEl.style.color = '#4CAF50';
        connectionStatusEl.textContent = 'Connected';
        connectionStatusEl.classList.add('connected');
        botRunning = true;
        startTime = new Date();
        
        if (runtimeInterval) clearInterval(runtimeInterval);
        runtimeInterval = setInterval(updateRuntime, 1000);
    }

    function setBotOffline() {
        statusEl.textContent = 'Offline';
        statusEl.style.color = '#f44336';
        connectionStatusEl.textContent = 'Disconnected';
        connectionStatusEl.classList.remove('connected');
        botRunning = false;
        
        if (runtimeInterval) {
            clearInterval(runtimeInterval);
            runtimeInterval = null;
        }
    }

    // Start bot button
    startBtn.addEventListener('click', function() {
        if (botRunning) return;
        
        addLog('Starting bot...');
        
        fetch('/api/bot/start', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                setBotOnline();
                addLog('Bot started successfully');
            } else {
                addLog(`Failed to start bot: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            addLog('Error starting bot');
        });
    });

    // Stop bot button
    stopBtn.addEventListener('click', function() {
        if (!botRunning) return;
        
        addLog('Stopping bot...');
        
        fetch('/api/bot/stop', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                setBotOffline();
                addLog('Bot stopped successfully');
            } else {
                addLog(`Failed to stop bot: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            addLog('Error stopping bot');
        });
    });

    // Delete session button
    deleteBtn.addEventListener('click', function() {
        if (botRunning) {
            addLog('Stop the bot first before deleting session');
            return;
        }
        
        if (!confirm('Are you sure you want to delete the session? This will log out your WhatsApp connection.')) {
            return;
        }
        
        addLog('Deleting session...');
        
        fetch('/api/bot/session', {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addLog('Session deleted successfully');
            } else {
                addLog(`Failed to delete session: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            addLog('Error deleting session');
        });
    });
});
