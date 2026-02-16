import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// Firebase client config.
// Uses Vite env vars when available; otherwise falls back to placeholders so the app compiles.
// Set these in your hosting environment (Netlify/Vercel/etc) as:
// - VITE_FIREBASE_API_KEY
// - VITE_FIREBASE_AUTH_DOMAIN
// - VITE_FIREBASE_PROJECT_ID
// - VITE_FIREBASE_STORAGE_BUCKET
// - VITE_FIREBASE_MESSAGING_SENDER_ID
// - VITE_FIREBASE_APP_ID
// - VITE_FIREBASE_DATABASE_URL
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const rtdb = getDatabase(firebaseApp)
