
document.addEventListener("DOMContentLoaded", async function() {
    // Load header content
    try {
        const response = await fetch('header.html');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const headerContent = await response.text();
        
        // Replace header div with loaded content
        const headerContainer = document.querySelector('.header');
        if (headerContainer) {
            headerContainer.outerHTML = headerContent;
        }
        
        // Re-initialize header event listeners after content is loaded
        initHeaderFunctions();
    } catch (error) {
        console.error("Error loading header:", error);
    }
});

function initHeaderFunctions() {
    // Toggle sidebar
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const menuOverlay = document.getElementById('menuOverlay');
    
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            sidebar.classList.toggle('expanded');
            mainContent.classList.toggle('expanded');
            menuOverlay.classList.toggle('active');
        });
    }
    
    if (menuOverlay) {
        menuOverlay.addEventListener('click', function() {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
            menuOverlay.classList.remove('active');
        });
    }
    
    // Toggle dark mode
    const toggleMode = document.querySelector('.toggle-mode');
    if (toggleMode) {
        toggleMode.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('dark-mode', document.body.classList.contains('dark-mode'));
        });
    }
    
    // User dropdown
    const userAvatarTrigger = document.getElementById('userAvatarTrigger');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userAvatarTrigger && userDropdown) {
        userAvatarTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', function(e) {
            if (!userDropdown.contains(e.target) && !userAvatarTrigger.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }
    
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Handle logout logic - this should match your existing logout code
            if (typeof handleLogout === 'function') {
                handleLogout();
            } else {
                console.log('Logout clicked, but handler not found');
                localStorage.removeItem('auth');
                window.location.href = 'login.html';
            }
        });
    }
    
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', function() {
            // Handle logout logic - this should match your existing logout code
            if (typeof handleLogout === 'function') {
                handleLogout();
            } else {
                console.log('Logout clicked, but handler not found');
                localStorage.removeItem('auth');
                window.location.href = 'login.html';
            }
        });
    }
    
    // Check dark mode preference
    if (localStorage.getItem('dark-mode') === 'true') {
        document.body.classList.add('dark-mode');
    }
}
