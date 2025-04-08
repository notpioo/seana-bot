// Firebase auth functions
let auth, checkAuthState, getUserData, logoutUser;

async function updateUIBasedOnRole(userId) {
    const adminElements = document.querySelectorAll('.admin-only');
    const memberElements = document.querySelectorAll('.member-only');
    
    const isUserAdmin = await isAdmin(userId);
    
    adminElements.forEach(element => {
        element.style.display = isUserAdmin ? '' : 'none';
    });
    
    memberElements.forEach(element => {
        element.style.display = isUserAdmin ? 'none' : '';
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    // Check auth state
    checkAuthState(async (user) => {
        if (user) {
            await updateUIBasedOnRole(user.uid);
        }
    });
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

    // Socket event handlers
    socket.on('connect', () => {
        console.log('Connected to server websocket');
        if (connectionStatusEl) {
            connectionStatusEl.textContent = 'Connected';
            connectionStatusEl.classList.add('connected');
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server websocket');
        if (connectionStatusEl) {
            connectionStatusEl.textContent = 'Disconnected';
            connectionStatusEl.classList.remove('connected');
        }
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
    fetch('/api/bot/status', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    })
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

    // Start with QR button
    const startWithQRBtn = document.getElementById('startWithQR');
    const startWithCodeBtn = document.getElementById('startWithCode');
    const pairingCodeForm = document.getElementById('pairingCodeForm');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const submitPairingBtn = document.getElementById('submitPairing');

    if (startWithQRBtn) {
        startWithQRBtn.addEventListener('click', function() {
            if (botRunning) return;
            pairingCodeForm.style.display = 'none';
            addLog('Starting bot with QR...');

            fetch('/api/bot/start', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ method: 'qr' })
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

    if (startWithCodeBtn) {
        startWithCodeBtn.addEventListener('click', function() {
            if (botRunning) return;
            pairingCodeForm.style.display = 'block';
        });
    }

    if (submitPairingBtn) {
        submitPairingBtn.addEventListener('click', function() {
            const phoneNumber = phoneNumberInput.value.trim();
            if (!phoneNumber) {
                addLog('Please enter a phone number', 'error');
                return;
            }

            if (!phoneNumber.match(/^628\d{8,12}$/)) {
                addLog('Invalid phone number format. Use 628xxxxx', 'error');
                return;
            }

            addLog('Starting bot with pairing code...');
            
            fetch('/api/bot/start', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    method: 'code',
                    phoneNumber: phoneNumber
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    pairingCodeForm.style.display = 'none';
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

    // Stop bot button
    if (stopBtn) {
        stopBtn.addEventListener('click', function() {
            if (!botRunning) return;

            addLog('Stopping bot...');

            fetch('/api/bot/stop', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
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
    }

    // Delete session button
    if (deleteBtn) {
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
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
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
    }

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