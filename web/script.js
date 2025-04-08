// Pairing handlers
document.addEventListener('DOMContentLoaded', function() {
    const startBotQR = document.getElementById('startBotQR');
    const startBotCode = document.getElementById('startBotCode');
    const pairButton = document.getElementById('pairButton');
    const pairingSection = document.getElementById('pairingSection');
    const stopBtn = document.getElementById('stopBot');
    const deleteBtn = document.getElementById('deleteSession');

    if (startBotQR) {
        startBotQR.addEventListener('click', async () => {
            try {
                pairingSection.style.display = 'none';
                const response = await fetch('/api/bot/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({ mode: 'qr' })
                });

                const data = await response.json();
                if (data.success) {
                    console.log('Starting bot with QR...');
                } else {
                    alert('Failed to start bot: ' + data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error starting bot');
            }
        });
    }

    if (startBotCode) {
        startBotCode.addEventListener('click', () => {
            pairingSection.style.display = 'block';
            const phoneInput = document.getElementById('phoneNumber');
            if (phoneInput) {
                phoneInput.focus();
            }
        });
    }

    if (pairButton) {
        pairButton.addEventListener('click', async () => {
            const phoneNumber = document.getElementById('phoneNumber').value;

            if (!phoneNumber || !phoneNumber.match(/^62\d{9,}$/)) {
                alert('Masukkan nomor yang valid (contoh: 628123456789)');
                return;
            }

            try {
                const response = await fetch('/api/bot/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({ 
                        mode: 'code',
                        phoneNumber: phoneNumber 
                    })
                });

                const data = await response.json();
                if (data.success) {
                    document.getElementById('pairingCode').innerHTML = `
                        <div class="code-container">
                            <h4>Menunggu kode pairing...</h4>
                            <p>Silakan cek WhatsApp Anda untuk kode otentikasi</p>
                        </div>
                    `;
                } else {
                    alert(data.message || 'Gagal memulai pairing');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Terjadi kesalahan saat memulai pairing');
            }
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/bot/stop', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });

                const data = await response.json();
                if (data.success) {
                    console.log('Bot stopped successfully');
                } else {
                    alert('Failed to stop bot: ' + data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error stopping bot');
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete the session?')) {
                return;
            }

            try {
                const response = await fetch('/api/bot/session', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });

                const data = await response.json();
                if (data.success) {
                    console.log('Session deleted successfully');
                } else {
                    alert('Failed to delete session: ' + data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error deleting session');
            }
        });
    }

    // Socket.io connection
    const socket = io();

    socket.on('connect', () => {
        console.log('Connected to server websocket');
        if (document.getElementById('connection-status')) {
            document.getElementById('connection-status').textContent = 'Connected';
            document.getElementById('connection-status').classList.add('connected');
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server websocket');
        if (document.getElementById('connection-status')) {
            document.getElementById('connection-status').textContent = 'Disconnected';
            document.getElementById('connection-status').classList.remove('connected');
        }
    });

    socket.on('botLog', (data) => {
        const logsContainer = document.getElementById('logs-container');
        if (!logsContainer) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${data.type}`;

        if (data.type === 'pairingCode') {
            const pairingCode = document.getElementById('pairingCode');
            if (pairingCode) {
                pairingCode.innerHTML = `
                    <div class="code-container">
                        <h4>Kode Pairing:</h4>
                        <div class="code">${data.message}</div>
                        <p>Masukkan kode ini di WhatsApp Anda</p>
                    </div>
                `;
            }
        }

        logEntry.textContent = `[${data.time}] ${data.message}`;
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    });
});

// Firebase auth functions
let auth, checkAuthState, getUserData, logoutUser;

document.addEventListener('DOMContentLoaded', function() {
    // Load firebase-auth.js using a script tag
    const script = document.createElement('script');
    script.src = './firebase-auth.js';
    script.type = 'module';
    document.head.appendChild(script);

    script.onload = function() {
        // Once loaded, check if functions are available in global scope
        setTimeout(() => {
            if (typeof window.checkAuthState === 'function') {
                checkAuthState = window.checkAuthState;
                getUserData = window.getUserData;
                logoutUser = window.logoutUser;
                auth = window.auth;

                // Initialize auth checks
                initializeAuth();
            } else {
                console.log("Auth module not loaded properly, retrying...");
                // Try again after a delay
                setTimeout(() => {
                    if (typeof window.checkAuthState === 'function') {
                        checkAuthState = window.checkAuthState;
                        getUserData = window.getUserData;
                        logoutUser = window.logoutUser;
                        auth = window.auth;
                        initializeAuth();
                    } else {
                        console.error("Auth module failed to load");
                    }
                }, 1000);
            }
        }, 500);
    };

    // Initialize the auth checks after modules are loaded
    const initializeAuth = () => {
        console.log("Auth check pending...");
        if (typeof checkAuthState === 'function') {
            checkAuthState((user) => {
                if (!user) {
                    // Not logged in, redirect to login page
                    window.location.replace('login.html');
                    return;
                }

                // User is logged in, load user data
                loadUserData(user);
            });
        } else {
            console.error("Auth module not loaded properly");
        }
    };

    // Load user data and update UI
    const loadUserData = async (user) => {
        if (typeof getUserData === 'function') {
            const userDataResult = await getUserData(user.uid);
            if (userDataResult.success) {
                const userData = userDataResult.data;

                // Save username to localStorage for use across pages
                localStorage.setItem('userName', userData.username || 'User');
                localStorage.setItem('userRole', userData.role || 'User');

                // Update UI with user data
                const usernameElements = document.querySelectorAll('#username');
                usernameElements.forEach(elem => {
                    elem.textContent = userData.username || 'User';
                });

                const userRoleElements = document.querySelectorAll('#userRole');
                userRoleElements.forEach(elem => {
                    elem.textContent = userData.role || 'User';
                });

                // Update avatars - first check if there's a stored avatar in localStorage
                const storedAvatar = localStorage.getItem('userAvatar');
                const avatarUrl = storedAvatar || userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username || 'User')}&background=random`;
                
                // Store the avatar URL if we got it from userData
                if (userData.photoURL && !storedAvatar) {
                    localStorage.setItem('userAvatar', userData.photoURL);
                }
                
                const avatarElements = document.querySelectorAll('#userAvatar');
                avatarElements.forEach(elem => {
                    elem.src = avatarUrl;
                });
            }
        }
    };

    // Sidebar toggle functionality
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    // Toggle sidebar function
    const toggleSidebar = () => {
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            sidebar.classList.toggle('expanded');
            if (menuOverlay) {
                menuOverlay.classList.toggle('active');
                // Prevent scrolling on body when menu is open
                if (menuOverlay.classList.contains('active')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            }
        } else {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        }

        // Ensure scrolling is always restored when closing sidebar on any device
        if (!sidebar.classList.contains('expanded') && isMobile) {
            document.body.style.overflow = '';
        }
    };

    // Close menu when clicking outside on mobile
    if (menuOverlay) {
        menuOverlay.addEventListener('click', () => {
            sidebar.classList.remove('expanded');
            menuOverlay.classList.remove('active');
            // Restore scrolling
            document.body.style.overflow = '';
        });
    }

    // Add event listeners for hamburger menu toggle
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', toggleSidebar);
    }

    // Adjust sidebar behavior on window resize
    window.addEventListener('resize', () => {
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            sidebar.classList.remove('collapsed');
            if (sidebar.classList.contains('expanded')) {
                if (menuOverlay) menuOverlay.classList.add('active');
            }
        } else {
            if (menuOverlay) menuOverlay.classList.remove('active');
            if (!sidebar.classList.contains('collapsed')) {
                mainContent.classList.remove('expanded');
            }
        }
    });

    // Logout buttons (handle all logout buttons on the page)
    const logoutBtns = document.querySelectorAll('[id="logoutBtn"], #sidebarLogoutBtn');

    logoutBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Logout clicked");
            if (typeof window.logoutUser === 'function') {
                window.logoutUser().then(result => {
                    if (result.success) {
                        window.location.href = 'login.html';
                    } else {
                        alert("Logout failed: " + (result.error || "Unknown error"));
                    }
                });
            } else if (typeof logoutUser === 'function') {
                logoutUser().then(result => {
                    if (result.success) {
                        window.location.href = 'login.html';
                    } else {
                        alert("Logout failed: " + (result.error || "Unknown error"));
                    }
                });
            } else {
                console.error("Logout function not available");
            }
        });
    });

    // Connect to WebSocket for real-time logs
    //This part is already handled in the edited snippet

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
    if (toggleMode) {
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
    }

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

        if (runtimeEl) {
            runtimeEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
        }
    }

    function addLog(message, type = 'info') {
        if (!logsContainer) return;

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


    // Socket event handlers (already handled in the edited snippet)


    function setBotOnline() {
        if (!statusEl) return;

        statusEl.textContent = 'Online';
        statusEl.style.color = '#4CAF50';
        if (connectionStatusEl) {
            connectionStatusEl.textContent = 'Connected';
            connectionStatusEl.classList.add('connected');
        }
        botRunning = true;
        startTime = new Date();

        if (runtimeInterval) clearInterval(runtimeInterval);
        runtimeInterval = setInterval(updateRuntime, 1000);
    }

    function setBotOffline() {
        if (!statusEl) return;

        statusEl.textContent = 'Offline';
        statusEl.style.color = '#f44336';
        if (connectionStatusEl) {
            connectionStatusEl.textContent = 'Disconnected';
            connectionStatusEl.classList.remove('connected');
        }
        botRunning = false;

        if (runtimeInterval) {
            clearInterval(runtimeInterval);
            runtimeInterval = null;
        }
    }

    // Start bot button
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            if (botRunning) return;

            addLog('Starting bot...');

            fetch('/api/bot/start', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
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
    }

    // Stop bot button (already handled in edited snippet)

    // Delete session button (already handled in edited snippet)

    // Toggle user dropdown
    const userAvatarTrigger = document.getElementById('userAvatarTrigger');
    const userDropdown = document.getElementById('userDropdown');

    if (userAvatarTrigger && userDropdown) {
        userAvatarTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userAvatarTrigger.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });

        // Mark current page as active in dropdown
        const currentPage = window.location.pathname.split('/').pop();
        const menuLinks = userDropdown.querySelectorAll('a');
        menuLinks.forEach(link => {
            const linkPage = link.getAttribute('href');
            if (linkPage === currentPage) {
                link.classList.add('active');
            }
        });
    }
});