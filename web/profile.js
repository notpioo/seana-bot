document.addEventListener('DOMContentLoaded', function() {
    // User dropdown toggle
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

    // Load firebase-auth.js using a script tag
    const script = document.createElement('script');
    script.src = './firebase-auth.js';
    script.type = 'module';
    document.head.appendChild(script);

    script.onload = function() {
        // Once loaded, check if functions are available in global scope
        setTimeout(() => {
            if (typeof window.checkAuthState === 'function') {
                // Check authentication
                window.checkAuthState(async (user) => {
                    if (!user) {
                        // Not logged in, redirect to login page
                        window.location.replace('login.html');
                        return;
                    }

                    // User is logged in, get user data
                    const userDataResult = await window.getUserData(user.uid);
                    if (userDataResult.success) {
                        const userData = userDataResult.data;
                        populateUserData(userData, user);
                    }
                });
            } else {
                console.log("Auth module not loaded properly, retrying...");
                // Try again after a delay
                setTimeout(() => {
                    if (typeof window.checkAuthState === 'function') {
                        // Check authentication
                        window.checkAuthState(async (user) => {
                            if (!user) {
                                // Not logged in, redirect to login page
                                window.location.replace('login.html');
                                return;
                            }

                            // User is logged in, get user data
                            const userDataResult = await window.getUserData(user.uid);
                            if (userDataResult.success) {
                                const userData = userDataResult.data;
                                populateUserData(userData, user);
                            }
                        });
                    } else {
                        console.error("Auth module failed to load");
                    }
                }, 1000);
            }
        }, 500);
    };

    // Setup password visibility toggles
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);

            // Toggle icon
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    });

    // Password strength meter
    const newPassword = document.getElementById('newPassword');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');

    if (newPassword) {
        newPassword.addEventListener('input', function() {
            const password = this.value;
            const strength = checkPasswordStrength(password);

            // Update the strength meter
            strengthBar.style.width = `${strength.score * 25}%`;
            strengthBar.style.backgroundColor = strength.color;
            strengthText.textContent = `Password strength: ${strength.text}`;
        });
    }

    // Save profile button
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveUserProfile);
    }

    // Reset profile button
    const resetProfileBtn = document.getElementById('resetProfileBtn');
    if (resetProfileBtn) {
        resetProfileBtn.addEventListener('click', resetForm);
    }

    // Delete account button
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', confirmDeleteAccount);
    }

    // Create hidden file input for avatar upload
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.id = 'avatarFileInput';
    document.body.appendChild(fileInput);

    // Handle file selection
    fileInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const file = this.files[0];

            // Validate file type
            if (!file.type.match('image.*')) {
                alert('Please select an image file');
                return;
            }

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('Image size should not exceed 2MB');
                return;
            }

            // Show loading state
            const profileAvatar = document.getElementById('profileAvatar');
            const userAvatar = document.getElementById('userAvatar');
            const originalSrc = profileAvatar.src;
            profileAvatar.classList.add('uploading');

            // Create and show the loading indicator
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = '<div class="spinner"></div>';
            document.querySelector('.profile-image').appendChild(loadingOverlay);

            // Get current user
            const user = window.auth.currentUser;
            if (!user) {
                alert('You must be logged in to change your avatar');
                profileAvatar.classList.remove('uploading');
                loadingOverlay.remove();
                return;
            }

            // Upload the avatar
            window.uploadAvatar(user.uid, file)
                .then(result => {
                    if (result.success) {
                        // Update all avatar images
                        profileAvatar.src = result.photoURL;
                        userAvatar.src = result.photoURL;

                        // Save avatar URL to localStorage for consistency across pages
                        localStorage.setItem('userAvatar', result.photoURL);

                        // Hide the loading indicator
                        profileAvatar.classList.remove('uploading');
                        loadingOverlay.remove();

                        // Show success message
                        alert('Avatar updated successfully!');
                    } else {
                        throw new Error(result.error || 'Failed to upload avatar');
                    }
                })
                .catch(error => {
                    console.error('Error uploading avatar:', error);
                    alert('Failed to upload avatar: ' + error.message);
                    profileAvatar.src = originalSrc;
                    profileAvatar.classList.remove('uploading');
                    loadingOverlay.remove();
                });
        }
    });

    // Handle avatar change via button and image overlay
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const imageOverlay = document.querySelector('.image-overlay');

    // Function to trigger file selection
    const triggerFileSelect = () => {
        fileInput.click();
    };

    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', triggerFileSelect);
    }

    if (imageOverlay) {
        imageOverlay.addEventListener('click', triggerFileSelect);
    }

    // Set up logout buttons
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
            } else {
                alert("Auth module not loaded properly");
            }
        });
    });
});

// Populate user data in the form
function populateUserData(userData, authUser) {
    // Update avatar
    const avatarSrc = userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username || 'User')}&background=random`;

    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) profileAvatar.src = avatarSrc;

    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.src = avatarSrc;

    // Update username in header and form
    const usernameElements = document.querySelectorAll('#username');
    usernameElements.forEach(elem => {
        elem.textContent = userData.username || 'User';
    });

    const displayName = document.getElementById('displayName');
    if (displayName) displayName.value = userData.username || '';

    // Update other fields
    const emailField = document.getElementById('email');
    if (emailField) emailField.value = authUser.email || '';

    const roleField = document.getElementById('role');
    if (roleField) roleField.value = userData.role || 'User';

    // Format joined date (if available)
    const joinedField = document.getElementById('joined');
    if (joinedField) {
        if (userData.createdAt) {
            const joinedDate = new Date(userData.createdAt);
            joinedField.value = joinedDate.toLocaleDateString();
        } else {
            joinedField.value = 'N/A';
        }
    }
}

// Check password strength
function checkPasswordStrength(password) {
    if (!password) {
        return { score: 0, text: 'None', color: '#ddd' };
    }

    let score = 0;

    // Length check
    if (password.length > 7) score++;
    if (password.length > 10) score++;

    // Complexity checks
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    // Cap the score at 4
    score = Math.min(score, 4);

    const strength = {
        0: { text: 'Very Weak', color: '#ff4d4d' },
        1: { text: 'Weak', color: '#ffa64d' },
        2: { text: 'Medium', color: '#ffff4d' },
        3: { text: 'Strong', color: '#4dff4d' },
        4: { text: 'Very Strong', color: '#00cc00' }
    };

    return {
        score: score,
        text: strength[score].text,
        color: strength[score].color
    };
}

// Save user profile
async function saveUserProfile() {
    const displayName = document.getElementById('displayName').value;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (!displayName.trim()) {
        alert('Display name cannot be empty!');
        return;
    }

    // If changing password, do additional checks
    if (newPassword) {
        if (!currentPassword) {
            alert('Please enter your current password');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }

        const strength = checkPasswordStrength(newPassword);
        if (strength.score < 2) {
            alert('Password is too weak. Please choose a stronger password.');
            return;
        }
    }

    // Show saving in progress
    const saveBtn = document.getElementById('saveProfileBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
        // Check if auth is loaded
        if (typeof window.auth === 'undefined') {
            console.log("Auth not loaded yet, waiting...");
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit for auth to load
            if (typeof window.auth === 'undefined') {
                throw new Error('Auth module not loaded');
            }
        }

        // Get current user
        const user = window.auth.currentUser;
        if (!user) {
            throw new Error('User not logged in');
        }

        console.log("Current user UID:", user.uid);

        // First get current user data to preserve photoURL if exists
        let currentUserData = null;

        try {
            const userDataResult = await window.getUserData(user.uid);
            if (userDataResult.success) {
                currentUserData = userDataResult.data;
            }
        } catch (e) {
            console.log("No existing user data found, creating new");
        }

        // Prepare new user data
        const newUserData = {
            username: displayName,
            email: user.email,
            role: 'admin', // Default to admin
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Preserve the existing photo URL if available
        if (currentUserData && currentUserData.photoURL) {
            newUserData.photoURL = currentUserData.photoURL;
        }

        console.log("Attempting to update user with data:", newUserData);

        // Direct write to set user data regardless of whether it exists
        const result = await window.setUserData(user.uid, newUserData);

        if (!result || !result.success) {
            console.error("Save error:", result ? result.error : "No result");
            throw new Error((result && result.error) || 'Failed to update profile');
        }

        console.log("Profile update success!");

        // Update display name in all places
        const usernameElements = document.querySelectorAll('#username');
        usernameElements.forEach(elem => {
            elem.textContent = displayName;
        });

        // Update avatar if no custom one is set
        if (!newUserData.photoURL) {
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;

            const avatarElements = document.querySelectorAll('#userAvatar, #profileAvatar');
            avatarElements.forEach(elem => {
                elem.src = avatarUrl;
            });
        }

        // Save to local storage so other pages can use it immediately
        localStorage.setItem('userName', displayName);
        localStorage.setItem('userRole', 'admin');

        alert('Profile updated successfully!');
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile: ' + error.message);
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Reset form to original values
function resetForm() {
    // Reload the page to reset all fields
    location.reload();
}

// Confirm account deletion
function confirmDeleteAccount() {
    const result = confirm('Are you sure you want to delete your account? This action cannot be undone!');

    if (result) {
        // Here you would delete user account from Firebase
        // For demo, we'll simulate and redirect to login
        alert('Account deleted successfully');
        window.location.href = 'login.html';
    }
}