/**
 * firebase-config.js
 * Initializes Firebase App, Firebase Authentication, and Cloud Firestore.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Live Firebase Configuration for anirudh-449ca
const firebaseConfig = {
  apiKey: "AIzaSyC29Gb6Nufox_ZK_lawNlKShGjAded72gk",
  authDomain: "anirudh-449ca.firebaseapp.com",
  projectId: "anirudh-449ca",
  storageBucket: "anirudh-449ca.firebasestorage.app",
  messagingSenderId: "653879382530",
  appId: "1:653879382530:web:4ab9de818de35a4a4f0d1b",
  measurementId: "G-WBYRPD7HBK"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, auth, db, googleProvider };
