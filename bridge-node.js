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

    // Cron name lookup (from known cron jobs — update when jobs change)
    const cronNames = {
      '788c5c26-f88a-49b6-b744-aa2920a8da7a': 'Email check',
      '2ea4d6e9-a870-4c04-b453-41c7646e235a': 'Back reset reminder',
      'c517159c-8d7f-44d5-8511-4f017480b6dd': 'MUFC News',
      '9e2361a3-8596-45d2-b7b9-7bb7f7901e6d': 'MUFC Transfers',
      'a0427e24-c51b-4bfd-adc9-71d312e5ac42': 'MUFC Transfer News',
      'd955c9d2-bcf5-45c6-a49f-a7ee196f0c1a': 'MUFC X Report',
      '0d79c133-a13e-4c01-9592-5947c177d26a': 'Frost check-in',
      '81cbe8fa-0f01-452f-9bf2-444a642f43de': 'Team sync',
      '341435bf-3bf0-4113-8a0b-55f2d9aee251': 'Fréttir 18:00',
      'd94723f0-ad30-4947-98ce-d506a7ac6fd3': 'Fréttir 12:00',
      '6e895c49-56a9-4c76-9518-3e006c8ab2d8': 'Daily Brief',
      'fc41b5d0-81aa-486d-971b-3931c03567e5': 'MUFC GameDay',
      'bf69b771-081a-4e65-85d7-34bc1dd4eaea': 'Heimamatur 17:30',
      '0d966acc-bda4-4f6d-a28e-730b5a477331': 'Heimamatur 12:30',
      'e921cf6e-db83-47a0-81e2-73f5138dd89e': 'Overnight Dev',
      '4943daeb-9aa8-4b37-b91d-7e00f263f989': 'ArnarFlow improvements',
      '4f6eca6e-fef8-4bfc-8526-f294ef592227': 'OpenPad Bridge',
      '87e706a8-a351-4171-a8fb-beba16928551': 'Memory Maintenance',
    }

    // Extract last activity per agent from transcript files
    const agentLastTask = {}
    const seenAgents = new Set()
    for (const s of (raw.sessions?.recent || []).slice(0, 30)) {
      const agentId = s.agentId
      if (seenAgents.has(agentId)) continue
      seenAgents.add(agentId)
      
      try {
        const transcriptPath = `/home/arnar111/.openclaw/agents/${agentId}/sessions/${s.sessionId}.jsonl`
        const content = execSync(`tail -10 "${transcriptPath}" 2>/dev/null`, { encoding: 'utf8', timeout: 2000 })
        const lines = content.trim().split('\n').reverse()
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line)
            const msg = entry.message || entry
            if (msg.role === 'assistant') {
              let text = ''
              if (Array.isArray(msg.content)) {
                const textPart = msg.content.find(c => c.type === 'text' && c.text)
                text = textPart?.text || ''
              } else if (typeof msg.content === 'string') {
                text = msg.content
              }
              if (text && text !== 'NO_REPLY' && text !== 'HEARTBEAT_OK' && text.length > 5) {
                // Clean and truncate
                const clean = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
                agentLastTask[agentId] = clean.length > 80 ? clean.substring(0, 77) + '...' : clean
                break
              }
            }
          } catch {}
        }
      } catch {}
    }

    // Enrich sessions with labels
    const enrichedSessions = { ...raw.sessions }
    if (enrichedSessions.recent) {
      enrichedSessions.recent = enrichedSessions.recent.map(s => {
        const enriched = { ...s }
        const key = s.key || ''
        
        // Add displayName based on session key patterns
        if (key.includes('discord:channel:1471287901986885654')) {
          enriched.displayName = '#aðalrás'
        } else if (key.includes('discord:channel:1472223401979412532')) {
          enriched.displayName = '#devchannel'
        } else if (key.includes(':main:main')) {
          enriched.displayName = 'WhatsApp (Arnar)'
        } else if (key.match(/cron:([a-f0-9-]+)/)) {
          const cronId = key.match(/cron:([a-f0-9-]+)/)[1]
          enriched.displayName = cronNames[cronId] || `Cron job`
        } else if (key.includes(':main') && !key.includes('cron')) {
          enriched.displayName = 'Direct session'
        }

        return enriched
      })
    }

    const status = {
      timestamp: Date.now(),
      os: raw.os || {},
      gateway: raw.gateway || {},
      agents: raw.agents || {},
      sessions: enrichedSessions,
      heartbeat: raw.heartbeat || {},
      memory: raw.memory || {},
      disk,
      channels: {
        whatsapp: { linked: raw.linkChannel?.linked || false },
        discord: { configured: true }
      },
      agentActivity: agentLastTask,
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
