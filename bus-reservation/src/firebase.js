// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyA0fEm16a9ULnLrUMPUwGV3-mjdtE3LAjs",
    authDomain: "hanseo-bus-reservation.firebaseapp.com",
    projectId: "hanseo-bus-reservation",
    storageBucket: "hanseo-bus-reservation.firebasestorage.app",
    messagingSenderId: "575771662395",
    appId: "1:575771662395:web:ee2057f43f966414dd241e",
    measurementId: "G-F39H4B99CM"
  };
  
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
