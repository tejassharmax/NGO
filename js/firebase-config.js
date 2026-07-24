/**
 * firebase-config.js
 * Initializes Firebase App, Firebase Authentication, and Cloud Firestore.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Default Firebase Configuration for Child Health Management Platform
const firebaseConfig = {
  apiKey: "AIzaSyDemoKeyChildHealthManagementNgo2026",
  authDomain: "child-health-ngo-demo.firebaseapp.com",
  projectId: "child-health-ngo-demo",
  storageBucket: "child-health-ngo-demo.appspot.com",
  messagingSenderId: "987654321098",
  appId: "1:987654321098:web:abcdef1234567890"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, auth, db, googleProvider };
