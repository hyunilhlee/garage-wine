import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyDa9aQYl9hSbD8Sq2gXj-uF2nMkLvLN2-k",
  authDomain: "garage-wine.firebaseapp.com",
  projectId: "garage-wine",
  storageBucket: "garage-wine.firebasestorage.app",
  messagingSenderId: "83611939066",
  appId: "1:83611939066:web:cf7d076dbf8bcb03ffd943",
  measurementId: "G-Y8FNCCQP6W"
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export { app };
