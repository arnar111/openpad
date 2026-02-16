import { ref, push, set } from 'firebase/database'
import { rtdb } from './firebase'

export interface AgentCommand {
  text: string
  timestamp: number
  status: 'pending' | 'sent' | 'error'
}

function historyKey(agentId: string) {
  return `openpad:commands:${agentId}`
}

export function loadAgentCommandHistory(agentId: string, limit = 5): AgentCommand[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(historyKey(agentId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as AgentCommand[]
    if (!Array.isArray(parsed)) return []
    const sorted = [...parsed].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    return sorted.slice(0, limit)
  } catch {
    return []
  }
}

function saveAgentCommandToHistory(agentId: string, cmd: AgentCommand) {
  if (typeof window === 'undefined') return
  try {
    const existing = loadAgentCommandHistory(agentId, 50)
    const next = [cmd, ...existing].slice(0, 50)
    window.localStorage.setItem(historyKey(agentId), JSON.stringify(next))
  } catch {
    // ignore localStorage failures
  }
}

export async function sendAgentCommand(agentId: string, command: string): Promise<void> {
  const text = command.trim()
  if (!text) return

  const payload: AgentCommand = {
    text,
    timestamp: Date.now(),
    status: 'pending',
  }

  const listRef = ref(rtdb, `/openpad/commands/${agentId}`)
  const itemRef = push(listRef)
  await set(itemRef, payload)

  saveAgentCommandToHistory(agentId, payload)
}
