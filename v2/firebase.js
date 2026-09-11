// ===============================
// Hub Tool ICT v2
// Firebase Configuration
// ===============================

// Firebase SDK v10 (ES Module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// ===============================
// Firebase Config
// ===============================

const firebaseConfig = {
    apiKey: "AIzaSyAPz0zv7RuEHHrmVyO8ECLHv-Hn3dGDZnE",
    authDomain: "skamis-hubtool.firebaseapp.com",
    projectId: "skamis-hubtool",
    storageBucket: "skamis-hubtool.firebasestorage.app",
    messagingSenderId: "236769370780",
    appId: "1:236769370780:web:9dfa07d772a721ecfe0359"
};

// ===============================
// Initialize
// ===============================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const provider = new GoogleAuthProvider();

provider.setCustomParameters({
    prompt: "select_account"
});

// ===============================
// Export
// ===============================

export {

    auth,
    db,
    provider,

    signInWithPopup,
    signOut,
    onAuthStateChanged,

    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,

    collection,
    getDocs,
    addDoc,

    serverTimestamp

};
