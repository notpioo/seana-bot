
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_IDjadFfYD9rofVbsRDP66x1Jh_gfXmM",
  authDomain: "seana-93b14.firebaseapp.com",
  databaseURL: "https://seana-93b14-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "seana-93b14",
  storageBucket: "seana-93b14.firebasestorage.app",
  messagingSenderId: "880418111638",
  appId: "1:880418111638:web:5fcdc8834d2f5490ea02b7",
  measurementId: "G-K5Q0GEXW9N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Check authentication state
function checkAuthState(callback) {
  onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

// Register new user
async function registerUser(username, email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save additional user data to database
    await set(ref(database, 'users/' + user.uid), {
      username: username,
      email: email,
      role: 'user',
      createdAt: new Date().toISOString()
    });
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Login user
async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Logout user
async function logoutUser() {
  try {
    await signOut(auth);
    // Clear all storages
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    console.log("User logged out successfully");
    window.location.replace('/login.html');
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    // Force clear all data even if error
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    window.location.replace('/login.html');
    return { success: true };
  }
}

// Get user data
async function getUserData(userId) {
  try {
    const snapshot = await get(ref(database, 'users/' + userId));
    if (snapshot.exists()) {
      return { success: true, data: snapshot.val() };
    } else {
      return { success: false, error: 'User data not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update user profile
async function updateUserProfile(userId, data) {
  try {
    // Get current user data
    const snapshot = await get(ref(database, 'users/' + userId));
    if (!snapshot.exists()) {
      return { success: false, error: 'User data not found' };
    }
    
    // Update only the fields that were provided
    const userData = snapshot.val();
    const updatedData = { ...userData, ...data };
    
    // Save back to the database
    await set(ref(database, 'users/' + userId), updatedData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Upload avatar and update user profile
async function uploadAvatar(userId, file) {
  try {
    // Convert file to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64String = e.target.result;
          
          // Get current user data
          const snapshot = await get(ref(database, 'users/' + userId));
          if (!snapshot.exists()) {
            reject({ success: false, error: 'User data not found' });
            return;
          }
          
          // Update the user data with the new avatar
          const userData = snapshot.val();
          const updatedData = { 
            ...userData, 
            photoURL: base64String,
            updatedAt: new Date().toISOString()
          };
          
          // Save back to the database
          await set(ref(database, 'users/' + userId), updatedData);
          
          // Update localStorage for consistency across pages
          localStorage.setItem('userAvatar', base64String);
          
          resolve({ success: true, photoURL: base64String });
        } catch (error) {
          reject({ success: false, error: error.message });
        }
      };
      
      reader.onerror = () => {
        reject({ success: false, error: 'Error reading file' });
      };
      
      reader.readAsDataURL(file);
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Directly set user data (create or update)
async function setUserData(userId, data) {
  try {
    console.log(`Setting data for user ${userId}:`, data);
    
    // Create or update user data directly
    await set(ref(database, 'users/' + userId), data);
    return { success: true };
  } catch (error) {
    console.error("Firebase error setting user data:", error);
    return { success: false, error: error.message };
  }
}

// Export functions to the global scope (for script tag usage)
window.auth = auth;
window.database = database;
window.checkAuthState = checkAuthState;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.getUserData = getUserData;
window.updateUserProfile = updateUserProfile;
window.setUserData = setUserData;
window.uploadAvatar = uploadAvatar;

// Also keep the export for modules
export { auth, database, checkAuthState, registerUser, loginUser, logoutUser, getUserData, updateUserProfile, setUserData, uploadAvatar };
