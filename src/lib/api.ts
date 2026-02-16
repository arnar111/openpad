// OpenPad API layer
//
// Previously: polled /public/data/status.json written by a bridge script.
// Now: subscribes to Firebase Realtime Database at /openpad/status.

export interface SessionData {
  agentId: string
  key: string
  kind: string
  sessionId: string
  updatedAt: number
  age: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  remainingTokens: number
  percentUsed: number
  model: string
  contextTokens: number
}

export interface AgentConfig {
  id: string
  name: string
  workspace: string
  model?: { primary: string }
}

export interface OpenClawStatus {
  timestamp: number
  os: {
    platform: string
    arch: string
    hostname: string
    uptime: number
    freeMemMb: number
    totalMemMb: number
    cpuCount: number
    nodeVersion: string
  }
  gateway: {
    reachable: boolean
    latencyMs: number
    mode: string
    bind: string
    port: number
  }
  agents: {
    list: AgentConfig[]
    count: number
  }
  sessions: {
    count: number
    recent: SessionData[]
    defaults: {
      model: string
      contextTokens: number
    }
  }
  heartbeat: {
    agents: {
      agentId: string
      enabled: boolean
      every: string
    }[]
  }
  channels: {
    whatsapp: { linked: boolean; number?: string }
    discord: { configured: boolean }
  }
  memory: {
    files: number
    chunks: number
  }
  disk: {
    totalGb: number
    usedGb: number
    freeGb: number
    percentUsed: number
  }
}

import snapshot from '../data/status-snapshot.json'
import { onValue, off, ref, type DatabaseReference, type Unsubscribe } from 'firebase/database'
import { rtdb } from './firebase'

type Listener = (data: OpenClawStatus, live: boolean) => void

function computeLive(data: OpenClawStatus, connected: boolean): boolean {
  if (!connected) return false
  const age = Date.now() - (data.timestamp || 0)
  return age < 60000
}

class OpenPadAPI {
  private listeners: Set<Listener> = new Set()
  private data: OpenClawStatus
  private live = false

  private started = false
  private connected = false

  private statusRef: DatabaseReference | null = null
  private connectedRef: DatabaseReference | null = null
  private statusUnsub: Unsubscribe | null = null
  private connectedUnsub: Unsubscribe | null = null

  constructor() {
    // Start with baked-in snapshot so static hosting always has data.
    this.data = snapshot as unknown as OpenClawStatus
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.data, this.live)
    if (!this.started) this.start()

    return () => {
      this.listeners.delete(fn)
      if (this.listeners.size === 0) this.stop()
    }
  }

  private start() {
    this.started = true

    // If Firebase is misconfigured or blocked, keep snapshot and mark as not live.
    try {
      this.statusRef = ref(rtdb, '/openpad/status')
      this.connectedRef = ref(rtdb, '.info/connected')

      this.connectedUnsub = onValue(
        this.connectedRef,
        snap => {
          this.connected = Boolean(snap.val())
          this.live = computeLive(this.data, this.connected)
          this.emit()
        },
        () => {
          // Permission/network error
          this.connected = false
          this.live = false
          this.emit()
        },
      )

      this.statusUnsub = onValue(
        this.statusRef,
        snap => {
          const val = snap.val()
          if (val && typeof val === 'object') {
            const next = val as OpenClawStatus
            this.data = next
            this.live = computeLive(next, this.connected)
            this.emit()
          }
        },
        () => {
          // Permission/network error
          this.connected = false
          this.live = false
          this.emit()
        },
      )
    } catch {
      this.connected = false
      this.live = false
      this.emit()
    }
  }

  private stop() {
    this.started = false

    // Best-effort cleanup (also fine if Firebase was never initialized).
    try {
      if (this.statusUnsub) this.statusUnsub()
      if (this.connectedUnsub) this.connectedUnsub()
      if (this.statusRef) off(this.statusRef)
      if (this.connectedRef) off(this.connectedRef)
    } catch {
      // ignore
    }

    this.statusUnsub = null
    this.connectedUnsub = null
    this.statusRef = null
    this.connectedRef = null
    this.connected = false
    this.live = false
  }

  private emit() {
    this.listeners.forEach(fn => fn(this.data, this.live))
  }

  getLatest(): OpenClawStatus {
    return this.data
  }

  isLive(): boolean {
    return this.live
  }
}

export const api = new OpenPadAPI()
