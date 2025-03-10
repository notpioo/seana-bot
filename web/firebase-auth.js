
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
export function checkAuthState(callback) {
  onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

// Register new user
export async function registerUser(username, email, password) {
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
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Logout user
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get user data
export async function getUserData(userId) {
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
export async function updateUserProfile(userId, data) {
  try {
    await set(ref(database, 'users/' + userId + '/profile'), data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export { auth, database };
