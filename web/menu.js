document.addEventListener('DOMContentLoaded', function() {
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyAHzj3JT2_PFdQQNvIf8yD4Z95wNJ8GEF0",
        authDomain: "seanabot.firebaseapp.com",
        projectId: "seanabot",
        storageBucket: "seanabot.appspot.com",
        messagingSenderId: "368082526817",
        appId: "1:368082526817:web:5e793555a52e0fe24d5eb4"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    // Check if user is signed in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in.
            document.getElementById('username').textContent = user.displayName || user.email;
            document.getElementById('userAvatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`;

            // Fetch menu data
            fetchMenuData();
        } else {
            // User is not signed in. Redirect to login.
            window.location.href = 'login.html';
        }
    });

    // Toggle user dropdown
    const userAvatarTrigger = document.getElementById('userAvatarTrigger');
    const userDropdown = document.getElementById('userDropdown');

    if (userAvatarTrigger && userDropdown) {
        userAvatarTrigger.addEventListener('click', function(event) {
            event.stopPropagation();
            userDropdown.classList.toggle('active');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (userDropdown && userDropdown.classList.contains('active') && !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('active');
        }
    });

    // Handle hamburger menu
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.querySelector('.sidebar');
    const menuOverlay = document.getElementById('menuOverlay');

    if (hamburgerMenu && sidebar) {
        hamburgerMenu.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            menuOverlay.classList.toggle('active');
        });
    }

    if (menuOverlay) {
        menuOverlay.addEventListener('click', function() {
            sidebar.classList.remove('collapsed');
            menuOverlay.classList.remove('active');
        });
    }

    // Handle logout button
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(event) {
            event.preventDefault();
            firebase.auth().signOut().then(() => {
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Logout Error', error);
            });
        });
    }

    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', function(event) {
            event.preventDefault();
            firebase.auth().signOut().then(() => {
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Logout Error', error);
            });
        });
    }

    // Menu editor functionality
    const menuTextArea = document.getElementById('menuTextArea');
    const menuPreview = document.getElementById('menuPreview');
    const submitMenuBtn = document.getElementById('submitMenu');
    const resetMenuBtn = document.getElementById('resetMenu');
    const successMessage = document.getElementById('successMessage');

    // Update preview as user types
    if (menuTextArea && menuPreview) {
        menuTextArea.addEventListener('input', function() {
            menuPreview.textContent = menuTextArea.value || 'Preview akan muncul di sini';
        });
    }

    // Submit menu to server
    if (submitMenuBtn && menuTextArea) {
        submitMenuBtn.addEventListener('click', function() {
            const menuText = menuTextArea.value;

            // Here you would typically send this to your server
            // For demo purposes, we'll just show success message
            fetch('/api/menu', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ menu: menuText })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Show success message
                if (successMessage) {
                    successMessage.style.display = 'block';
                    setTimeout(() => {
                        successMessage.style.display = 'none';
                    }, 3000);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Gagal menyimpan menu. Silakan coba lagi.');
            });
        });
    }

    // Reset menu to default
    if (resetMenuBtn) {
        resetMenuBtn.addEventListener('click', function() {
            if (menuTextArea) {
                menuTextArea.value = '';
                if (menuPreview) {
                    menuPreview.textContent = 'Preview akan muncul di sini';
                }
            }
        });
    }

    // Function to fetch menu data from server
    function fetchMenuData() {
        fetch('/api/menu')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (menuTextArea && data.menu) {
                    menuTextArea.value = data.menu;
                    if (menuPreview) {
                        menuPreview.textContent = data.menu;
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching menu:', error);
                // Set default menu if fetch fails
                if (menuTextArea) {
                    const defaultMenu = 
`╔═══❲ {namebot} ❳═══❒
║
╠❒ ʜᴀʟᴏ {pushname} 👋
╠❒ {ucapan}
╠❒
╠❒ ᴛᴀɴɢɢᴀʟ : {tanggal}
╠❒ ᴡᴀᴋᴛᴜ   : {wib}
╠❒ 
╠❒ INFO PENGGUNA
╠❒ ɴᴀᴍᴀ   : {pushname}
╠❒ ɴᴏᴍᴏʀ  : {sender}
╠❒ sᴛᴀᴛᴜs : {status}
╠❒ ʟɪᴍɪᴛ  : {limit}
╠❒ ʙᴀʟᴀɴᴄᴇ: {balance}
╠❒ ʀᴜɴᴛɪᴍᴇ: {runtime}
║
╠❒ ▄▄▄▄▄ {namebot} ▄▄▄▄▄
╠❒ ❒ ✦ MENU UTAMA ✦ ❒
╠❒ {prefix}ai
╠❒ {prefix}sticker
╠❒ {prefix}download
╠❒ {prefix}group
╠❒ {prefix}tools
╠❒ {prefix}owner
╠❒ {prefix}info
╠❒ 
╚❒ Dibuat oleh SeanaBot`;

                    menuTextArea.value = defaultMenu;
                    if (menuPreview) {
                        menuPreview.textContent = defaultMenu;
                    }
                }
            });
    }
});