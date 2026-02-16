#!/usr/bin/env node
// OpenPad Data Bridge (Node.js version)
// Writes live OpenClaw status to public/data/status.json every 15s
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'public', 'data', 'status.json')
const SNAPSHOT = join(__dirname, 'src', 'data', 'status-snapshot.json')
mkdirSync(dirname(OUT), { recursive: true })

console.log(`🔗 OpenPad Bridge started — writing to ${OUT}`)

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

    const json = JSON.stringify(status, null, 2)
    writeFileSync(OUT, json)
    writeFileSync(SNAPSHOT, json)
    const time = new Date().toLocaleTimeString('is-IS')
    console.log(`${time} ✅ Updated (${status.sessions?.count || 0} sessions)`)
  } catch (err) {
    const time = new Date().toLocaleTimeString('is-IS')
    console.log(`${time} ❌ ${err.message}`)
  }
}

update()
setInterval(update, 15000)
