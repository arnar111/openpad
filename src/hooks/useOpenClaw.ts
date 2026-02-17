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

// Maps OpenClaw agent IDs to OpenPad agent IDs
// main = Blær, mufc = Friðrik (Discord bot, separate), regn = Regn
// Frost, Ylur, Stormur are conceptual team members — they work through
// subagent sessions and Discord, so we detect them from session patterns
const AGENT_ID_MAP: Record<string, string> = {
  main: 'blaer',
  regn: 'regn',
  dogg: 'dogg',
  udi: 'udi',
}

function inferAgentFromSession(session: SessionData): string | null {
  const key = session.key || ''
  // Subagent sessions = Frost's team working
  if (key.includes('subagent')) return 'frost'
  // Discord agent-team channel = team collaboration
  if (key.includes('discord') && key.includes('1471287901')) return 'frost'
  // Cron jobs with specific patterns
  if (key.includes('cron')) {
    // Distribute cron work across team for visual variety
    const hash = key.split(':').pop() || ''
    const n = hash.charCodeAt(0) % 3
    if (n === 0) return 'ylur'
    if (n === 1) return 'stormur'
    return 'frost'
  }
  return null
}

export function useLiveAgents(): { agents: LiveAgent[]; connected: boolean } {
  const { status, connected } = useOpenClawStatus()

  const liveAgents: LiveAgent[] = agents.map((agent) => {
    if (!status) {
      return {
        ...agent,
        currentTask: 'Waiting for data...',
        sessions: [],
        totalTokensToday: 0,
        lastActive: null,
        activeSessions: 0,
        primaryModel: agent.model,
      }
    }

    if (agent.isHuman) {
      // Count active conversations for human
      const recentCount = status.sessions.recent.filter(s => s.age < 600000).length
      return {
        ...agent,
        currentTask: recentCount > 0 ? `${recentCount} active conversations` : 'Away',
        sessions: [],
        totalTokensToday: 0,
        lastActive: recentCount > 0 ? Date.now() : null,
        activeSessions: recentCount,
        primaryModel: agent.model,
        status: recentCount > 0 ? 'active' as const : 'offline' as const,
      }
    }

    // Direct mapping for Blær and Regn
    const openclawId = Object.entries(AGENT_ID_MAP).find(([, padId]) => padId === agent.id)?.[0]

    let agentSessions: SessionData[]

    if (openclawId) {
      // Direct OpenClaw agent
      agentSessions = status.sessions.recent.filter(
        (s) => s.agentId === openclawId
      )
    } else {
      // Inferred agents (Frost, Ylur, Stormur) — match from session patterns
      agentSessions = status.sessions.recent.filter(
        (s) => inferAgentFromSession(s) === agent.id
      )
    }
    
    const activeSessions = agentSessions.filter(s => s.age < 300000).length
    const totalTokens = agentSessions.reduce((sum, s) => sum + s.totalTokens, 0)
    const lastSession = agentSessions.sort((a, b) => b.updatedAt - a.updatedAt)[0]
    
    // Determine status from session activity
    let liveStatus: Agent['status'] = 'offline'
    if (lastSession) {
      if (lastSession.age < 120000) liveStatus = 'active'
      else if (lastSession.age < 600000) liveStatus = 'idle'
      else if (lastSession.age < 3600000) liveStatus = 'idle'
    }

    // For Frost: also check if any subagent ran recently
    if (agent.id === 'frost' && liveStatus === 'offline') {
      const anySubagent = status.sessions.recent.find(
        s => s.key.includes('subagent') && s.age < 3600000
      )
      if (anySubagent) liveStatus = 'idle'
    }

    // If agent is configured in OpenClaw but has no recent sessions,
    // show as idle (standby) rather than offline
    if (liveStatus === 'offline') {
      const isConfigured = openclawId 
        ? status.agents?.list?.some((a: { id: string }) => a.id === openclawId)
        : ['frost', 'ylur', 'stormur', 'dogg', 'udi'].includes(agent.id) // team members always configured
      if (isConfigured) liveStatus = 'idle'
    }

    // Get model from config
    const agentConfig = status.agents?.list?.find((a: { id: string }) => a.id === openclawId)
    // Get model: prefer what's actually being used in sessions, then config, then agent default
    const sessionModel = lastSession?.model || null
    const configModel = agentConfig?.model?.primary || null
    const model = sessionModel || configModel || agent.model || status.sessions.defaults.model

    // Get real task from agentActivity (extracted from transcripts)
    const agentActivity = status.agentActivity || {}
    const openclawAgentId = Object.entries(AGENT_ID_MAP).find(([, padId]) => padId === agent.id)?.[0]
    // Check both mapped ID and direct agent ID
    const realTask = openclawAgentId 
      ? agentActivity[openclawAgentId] 
      : agentActivity[agent.id] || null

    let task = '—'
    if (agent.isHuman) {
      task = activeSessions > 0 ? `${activeSessions} active conversations` : 'Away'
    } else if (realTask) {
      // Use real last message from transcript
      task = realTask
      if (totalTokens > 100000) task += ' 🔥'
    } else if (agentSessions.length === 0) {
      task = 'Standby'
    } else {
      // Fallback: show session info
      const recentWithName = agentSessions
        .filter(s => (s as SessionData & { displayName?: string }).displayName)
        .sort((a, b) => b.updatedAt - a.updatedAt)

      if (recentWithName.length > 0) {
        const recent = recentWithName[0] as SessionData & { displayName?: string }
        const others = recentWithName.length - 1
        task = (recent.displayName || 'Session') + (others > 0 ? ` +${others} more` : '')
      } else {
        task = `${agentSessions.length} sessions`
      }
      if (totalTokens > 100000) task += ' 🔥'
    }

    return {
      ...agent,
      status: liveStatus,
      sessions: agentSessions,
      totalTokensToday: totalTokens,
      lastActive: lastSession?.updatedAt || null,
      activeSessions,
      primaryModel: model,
      currentTask: task,
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
      memoryPercent: 0,
      disk: '—',
      diskPercent: 0,
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

  const os = status.os || { platform: '', arch: '', hostname: '', uptime: 0, freeMemMb: 0, totalMemMb: 0, cpuCount: 0, nodeVersion: '' }
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
    memoryFiles: status.memory?.files || 0,
    memoryChunks: status.memory?.chunks || 0,
    gatewayLatency: status.gateway?.latencyMs || 0,
  }
}
