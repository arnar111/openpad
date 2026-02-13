// OpenPad API layer
// Since OpenClaw gateway doesn't expose a REST API, we use a data bridge:
// A background script writes status to /public/data/status.json every 30s
// OpenPad polls this file for live data.

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

const DATA_URL = '/data/status.json'
const POLL_INTERVAL = 15000

type Listener = (data: OpenClawStatus) => void

class OpenPadAPI {
  private listeners: Set<Listener> = new Set()
  private data: OpenClawStatus | null = null
  private polling = false
  private timer: ReturnType<typeof setInterval> | null = null

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    if (this.data) fn(this.data)
    if (!this.polling) this.startPolling()
    return () => {
      this.listeners.delete(fn)
      if (this.listeners.size === 0) this.stopPolling()
    }
  }

  private startPolling() {
    this.polling = true
    this.poll()
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL)
  }

  private stopPolling() {
    this.polling = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async poll() {
    try {
      const res = await fetch(DATA_URL + '?t=' + Date.now())
      if (res.ok) {
        const data = await res.json()
        this.data = data
        this.listeners.forEach(fn => fn(data))
      }
    } catch {
      // Data bridge not running yet, silently retry
    }
  }

  getLatest(): OpenClawStatus | null {
    return this.data
  }
}

export const api = new OpenPadAPI()
