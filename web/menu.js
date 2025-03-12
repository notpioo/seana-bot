document.addEventListener('DOMContentLoaded', function() {
    // Load firebase-auth.js using a script tag
    const script = document.createElement('script');
    script.src = './firebase-auth.js';
    script.type = 'module';
    document.head.appendChild(script);

    let auth, checkAuthState, getUserData, logoutUser;

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
                // Load menu data
                loadMenuData();
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

    // Load saved menu content
    const loadMenuData = async () => {
        try {
            const response = await fetch('/api/bot/menu', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.menu) {
                    document.getElementById('menuTextArea').value = data.menu;
                }
            } else {
                console.error('Failed to load menu data');
            }
        } catch (error) {
            console.error('Error loading menu data:', error);
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

    // Submit menu button
    const submitMenuBtn = document.getElementById('submitMenu');
    if (submitMenuBtn) {
        submitMenuBtn.addEventListener('click', async () => {
            const menuContent = document.getElementById('menuTextArea').value;
            const successMessage = document.getElementById('successMessage');

            try {
                const response = await fetch('/api/bot/menu', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({ menu: menuContent })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        // Show success message
                        successMessage.style.display = 'block';
                        
                        // Hide after 3 seconds
                        setTimeout(() => {
                            successMessage.style.display = 'none';
                        }, 3000);
                    } else {
                        alert('Gagal memperbarui menu: ' + (data.message || 'Unknown error'));
                    }
                } else {
                    alert('Gagal memperbarui menu. Server error.');
                }
            } catch (error) {
                console.error('Error updating menu:', error);
                alert('Terjadi kesalahan saat memperbarui menu.');
            }
        });
    }

    // Reset menu button
    const resetMenuBtn = document.getElementById('resetMenu');
    if (resetMenuBtn) {
        resetMenuBtn.addEventListener('click', () => {
            if (confirm('Apakah Anda yakin ingin mereset menu?')) {
                document.getElementById('menuTextArea').value = '';
                updateMenuPreview('');
            }
        });
    }
    
    // Live preview functionality
    const menuTextArea = document.getElementById('menuTextArea');
    const menuPreview = document.getElementById('menuPreview');
    
    // Function to update the preview
    function updateMenuPreview(text) {
        if (!menuPreview) return;
        
        if (!text || text.trim() === '') {
            menuPreview.textContent = 'Masukkan teks menu untuk melihat preview';
            return;
        }
        
        // Replace variables with example values for preview
        let previewText = text
            .replace(/{pushname}/g, 'Pengguna')
            .replace(/{prefix}/g, '.')
            .replace(/{namebot}/g, 'SeaBot')
            .replace(/{ucapan}/g, getGreeting())
            .replace(/{tanggal}/g, new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}))
            .replace(/{wib}/g, new Date().toLocaleTimeString('id-ID', {timeZone: 'Asia/Jakarta'}))
            .replace(/{wita}/g, new Date().toLocaleTimeString('id-ID', {timeZone: 'Asia/Makassar'}))
            .replace(/{wit}/g, new Date().toLocaleTimeString('id-ID', {timeZone: 'Asia/Jayapura'}))
            .replace(/{sender}/g, '62812345678@s.whatsapp.net')
            .replace(/{limit}/g, '100')
            .replace(/{balance}/g, '5000')
            .replace(/{status}/g, 'Premium')
            .replace(/{runtime}/g, '2 hari 5 jam 30 menit')
            .replace(/{hari}/g, new Date().toLocaleDateString('id-ID', {weekday: 'long'}));
        
        // Handle simple Markdown-like formatting
        previewText = previewText
            .replace(/\*([^*]+)\*/g, '<strong>$1</strong>') // Bold text
            .replace(/_([^_]+)_/g, '<em>$1</em>'); // Italic text
        
        menuPreview.innerHTML = previewText;
    }
    
    // Get appropriate greeting based on time of day
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'pagi';
        if (hour >= 12 && hour < 15) return 'siang';
        if (hour >= 15 && hour < 19) return 'sore';
        return 'malam';
    }
    
    // Listen for changes in the textarea
    if (menuTextArea) {
        menuTextArea.addEventListener('input', function() {
            updateMenuPreview(this.value);
        });
        
        // Also update preview when menu data is loaded
        const originalLoadMenuData = loadMenuData;
        loadMenuData = async () => {
            await originalLoadMenuData();
            updateMenuPreview(menuTextArea.value);
        };
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
    }

    // Toggle dark mode
    const toggleMode = document.querySelector('.toggle-mode');
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

    // Logout buttons
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
});