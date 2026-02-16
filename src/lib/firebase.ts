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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCBorNR1KJVwB3tszq-GhIbP-r2BIzTN7w',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'openpad-b903a.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'openpad-b903a',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'openpad-b903a.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '641819620338',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:641819620338:web:e4bd6093fe92da6c1db16b',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://openpad-b903a-default-rtdb.firebaseio.com',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const rtdb = getDatabase(firebaseApp)
