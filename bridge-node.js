#!/usr/bin/env node
// OpenPad Data Bridge (Node.js version)
// Writes live OpenClaw status to:
//   1. public/data/status.json (local dev)
//   2. src/data/status-snapshot.json (build snapshot)
//   3. Firebase Realtime DB /openpad/status (live for Netlify)
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set } from 'firebase/database'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'public', 'data', 'status.json')
const SNAPSHOT = join(__dirname, 'src', 'data', 'status-snapshot.json')
mkdirSync(dirname(OUT), { recursive: true })

// Firebase setup
const firebaseConfig = {
  apiKey: 'AIzaSyCBorNR1KJVwB3tszq-GhIbP-r2BIzTN7w',
  authDomain: 'openpad-b903a.firebaseapp.com',
  projectId: 'openpad-b903a',
  storageBucket: 'openpad-b903a.firebasestorage.app',
  messagingSenderId: '641819620338',
  appId: '1:641819620338:web:e4bd6093fe92da6c1db16b',
  databaseURL: 'https://openpad-b903a-default-rtdb.europe-west1.firebasedatabase.app',
}

let db = null
try {
  const app = initializeApp(firebaseConfig)
  db = getDatabase(app)
  console.log('🔥 Firebase connected')
} catch (err) {
  console.log('⚠️ Firebase init failed:', err.message)
}

console.log(`🔗 OpenPad Bridge started — writing to ${OUT} + Firebase`)

async function update() {
  try {
    const raw = JSON.parse(execSync('openclaw status --json 2>/dev/null', { encoding: 'utf8', timeout: 10000 }))
    
    let disk = {}
    try {
      const df = execSync("df -BG / | tail -1", { encoding: 'utf8' }).trim().split(/\s+/)
      disk = {
        totalGb: parseInt(df[1]),
        usedGb: parseInt(df[2]),
        freeGb: parseInt(df[3]),
        percentUsed: parseInt(df[4])
      }
    } catch {}

    const status = {
      timestamp: Date.now(),
      os: raw.os || {},
      gateway: raw.gateway || {},
      agents: raw.agents || {},
      sessions: raw.sessions || {},
      heartbeat: raw.heartbeat || {},
      memory: raw.memory || {},
      disk,
      channels: {
        whatsapp: { linked: raw.linkChannel?.linked || false },
        discord: { configured: true }
      }
    }

    // Write local files
    const json = JSON.stringify(status, null, 2)
    writeFileSync(OUT, json)
    writeFileSync(SNAPSHOT, json)
    
    // Push to Firebase
    if (db) {
      try {
        await set(ref(db, '/openpad/status'), status)
      } catch (fbErr) {
        console.log(`  ⚠️ Firebase write failed: ${fbErr.message}`)
      }
    }

    const time = new Date().toLocaleTimeString('is-IS')
    console.log(`${time} ✅ Updated (${status.sessions?.count || 0} sessions)`)
  } catch (err) {
    const time = new Date().toLocaleTimeString('is-IS')
    console.log(`${time} ❌ ${err.message}`)
  }
}

update()
setInterval(update, 15000)
