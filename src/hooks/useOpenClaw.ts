import { useState, useEffect } from 'react'
import { api, OpenClawStatus, SessionData } from '../lib/api'
import { agents, Agent } from '../data/agents'

export function useOpenClawStatus() {
  const [status, setStatus] = useState<OpenClawStatus | null>(api.getLatest())
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const unsub = api.subscribe((data, live) => {
      setStatus(data)
      setConnected(live)
    })
    return unsub
  }, [])

  return { status, connected }
}

export interface LiveAgent extends Agent {
  sessions: SessionData[]
  totalTokensToday: number
  lastActive: number | null
  activeSessions: number
  primaryModel: string
}

const AGENT_ID_MAP: Record<string, string> = {
  main: 'blaer',
  mufc: 'frost', // Frost handles Discord bot
  regn: 'regn',
}

export function useLiveAgents(): { agents: LiveAgent[]; connected: boolean } {
  const { status, connected } = useOpenClawStatus()

  const liveAgents: LiveAgent[] = agents.map((agent) => {
    if (!status || agent.isHuman) {
      return {
        ...agent,
        sessions: [],
        totalTokensToday: 0,
        lastActive: null,
        activeSessions: 0,
        primaryModel: agent.model,
      }
    }

    // Map OpenClaw agent IDs to our agent IDs
    let openclawId: string | undefined
    for (const [ocId, padId] of Object.entries(AGENT_ID_MAP)) {
      if (padId === agent.id) {
        openclawId = ocId
        break
      }
    }

    const agentSessions = status.sessions.recent.filter(
      (s) => s.agentId === openclawId
    )
    
    const activeSessions = agentSessions.filter(s => s.age < 300000).length // active in last 5 min
    const totalTokens = agentSessions.reduce((sum, s) => sum + s.totalTokens, 0)
    const lastSession = agentSessions.sort((a, b) => b.updatedAt - a.updatedAt)[0]
    
    // Determine status from session activity
    let liveStatus: Agent['status'] = 'offline'
    if (lastSession) {
      if (lastSession.age < 120000) liveStatus = 'active' // active in last 2 min
      else if (lastSession.age < 600000) liveStatus = 'idle' // active in last 10 min
    }

    // Get model from config
    const agentConfig = status.agents?.list?.find((a: { id: string }) => a.id === openclawId)
    const model = agentConfig?.model?.primary || status.sessions.defaults.model

    return {
      ...agent,
      status: liveStatus,
      sessions: agentSessions,
      totalTokensToday: totalTokens,
      lastActive: lastSession?.updatedAt || null,
      activeSessions,
      primaryModel: model,
      currentTask: lastSession ? `Session: ${lastSession.key.split(':').slice(-1)[0].slice(0, 12)}...` : agent.currentTask,
    }
  })

  return { agents: liveAgents, connected }
}

export function useSystemHealth() {
  const { status, connected } = useOpenClawStatus()

  if (!status) {
    return {
      connected: false,
      cpu: '—',
      memory: '—',
      disk: '—',
      sessions: 0,
      uptime: '—',
      whatsapp: false,
      discord: false,
      totalSessions: 0,
      memoryFiles: 0,
      memoryChunks: 0,
      gatewayLatency: 0,
    }
  }

  const os = status.os || {} as any
  const uptimeSec = os.uptime || 0
  const days = Math.floor(uptimeSec / 86400)
  const hours = Math.floor((uptimeSec % 86400) / 3600)
  const mins = Math.floor((uptimeSec % 3600) / 60)

  return {
    connected,
    cpu: `${os.cpuCount || '?'} cores`,
    memory: os.totalMemMb ? `${((os.totalMemMb - os.freeMemMb) / 1024).toFixed(1)} / ${(os.totalMemMb / 1024).toFixed(1)} GB` : '—',
    memoryPercent: os.totalMemMb ? Math.round(((os.totalMemMb - os.freeMemMb) / os.totalMemMb) * 100) : 0,
    disk: status.disk ? `${status.disk.freeGb} GB free` : '—',
    diskPercent: status.disk?.percentUsed || 0,
    sessions: status.sessions?.count || 0,
    uptime: `${days}d ${hours}h ${mins}m`,
    whatsapp: status.channels?.whatsapp?.linked || false,
    discord: status.channels?.discord?.configured || false,
    totalSessions: status.sessions?.count || 0,
    memoryFiles: (status.memory as any)?.files || 0,
    memoryChunks: (status.memory as any)?.chunks || 0,
    gatewayLatency: (status.gateway as any)?.latencyMs || 0,
  }
}
