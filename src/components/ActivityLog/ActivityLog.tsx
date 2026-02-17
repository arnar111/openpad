import { useLiveAgents, useSystemHealth } from '../../hooks/useOpenClaw'
import { agents as staticAgents } from '../../data/agents'

interface ActivityEvent {
  id: string
  timestamp: Date
  agentId: string
  type: 'status_change' | 'task' | 'session' | 'system'
  message: string
  icon: string
  color: string
}

function generateActivityFromLiveData(liveAgents: ReturnType<typeof useLiveAgents>['agents']): ActivityEvent[] {
  const events: ActivityEvent[] = []

  liveAgents.forEach(agent => {
    if (agent.isHuman) return

    const staticAgent = staticAgents.find(a => a.id === agent.id)
    const color = staticAgent?.color || '#888'

    // Status
    events.push({
      id: `status-${agent.id}`,
      timestamp: agent.lastActive ? new Date(agent.lastActive) : new Date(),
      agentId: agent.id,
      type: 'status_change',
      message: `${agent.name} is ${agent.status}`,
      icon: agent.status === 'active' ? '🟢' : agent.status === 'idle' ? '🟡' : '🔴',
      color,
    })

    // Current task
    if (agent.currentTask && agent.currentTask !== '—' && agent.currentTask !== 'Standby') {
      events.push({
        id: `task-${agent.id}`,
        timestamp: agent.lastActive ? new Date(agent.lastActive) : new Date(),
        agentId: agent.id,
        type: 'task',
        message: `${agent.name}: ${agent.currentTask}`,
        icon: agent.emoji,
        color,
      })
    }

    // Sessions
    if (agent.activeSessions > 0) {
      events.push({
        id: `sessions-${agent.id}`,
        timestamp: new Date(),
        agentId: agent.id,
        type: 'session',
        message: `${agent.name} has ${agent.activeSessions} active session${agent.activeSessions > 1 ? 's' : ''} (${(agent.totalTokensToday / 1000).toFixed(0)}k tokens)`,
        icon: '📊',
        color,
      })
    }
  })

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString('is-IS')
}

export default function ActivityLog() {
  const { agents: liveAgents, connected } = useLiveAgents()
  const health = useSystemHealth()
  const events = generateActivityFromLiveData(liveAgents)

  const activeCount = liveAgents.filter(a => a.status === 'active' && !a.isHuman).length
  const totalTokens = liveAgents.reduce((sum, a) => sum + a.totalTokensToday, 0)

  return (
    <div className="w-full h-full overflow-auto p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-pixel text-[9px] text-office-accent/60 tracking-widest">ACTIVITY LOG</h2>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${connected ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className={`font-pixel text-[5px] ${connected ? 'text-green-400' : 'text-red-400'}`}>
                {connected ? 'LIVE' : 'SNAPSHOT'}
              </span>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg border border-office-border bg-office-panel p-3">
            <div className="font-pixel text-[5px] text-gray-600 mb-1">ACTIVE AGENTS</div>
            <div className="font-pixel text-[12px] text-green-400">{activeCount}</div>
          </div>
          <div className="rounded-lg border border-office-border bg-office-panel p-3">
            <div className="font-pixel text-[5px] text-gray-600 mb-1">TOTAL SESSIONS</div>
            <div className="font-pixel text-[12px] text-office-accent">{health.totalSessions}</div>
          </div>
          <div className="rounded-lg border border-office-border bg-office-panel p-3">
            <div className="font-pixel text-[5px] text-gray-600 mb-1">TOKENS TODAY</div>
            <div className="font-pixel text-[12px] text-yellow-400">{(totalTokens / 1000).toFixed(0)}k</div>
          </div>
          <div className="rounded-lg border border-office-border bg-office-panel p-3">
            <div className="font-pixel text-[5px] text-gray-600 mb-1">UPTIME</div>
            <div className="font-pixel text-[12px] text-blue-400">{health.uptime}</div>
          </div>
        </div>

        {/* Agent status strip */}
        <div className="flex flex-wrap gap-2 mb-6">
          {liveAgents.filter(a => !a.isHuman).map(agent => {
            const sa = staticAgents.find(s => s.id === agent.id)
            return (
              <div
                key={agent.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ borderColor: (sa?.color || '#888') + '30', background: (sa?.color || '#888') + '08' }}
              >
                <span className="text-sm">{sa?.emoji}</span>
                <div>
                  <div className="font-pixel text-[7px]" style={{ color: sa?.color }}>{agent.name}</div>
                  <div className="font-pixel text-[5px] text-gray-500">{agent.primaryModel}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ml-2 ${
                  agent.status === 'active' ? 'bg-green-400 animate-pulse' :
                  agent.status === 'idle' ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
              </div>
            )
          })}
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-office-border/50" />

          {events.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-3xl mb-3 block">📋</span>
              <div className="font-pixel text-[8px] text-gray-500">No activity yet</div>
              <div className="font-pixel text-[6px] text-gray-600 mt-1">Events will appear here when agents are active</div>
            </div>
          ) : (
            events.map((event, i) => (
              <div key={event.id} className="flex items-start gap-3 mb-3 relative animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0 border z-10"
                  style={{ background: event.color + '15', borderColor: event.color + '30' }}
                >
                  {event.icon}
                </div>
                <div className="flex-1 rounded-lg border border-office-border/50 bg-office-panel/50 px-3 py-2">
                  <div className="font-pixel text-[7px] text-gray-300">{event.message}</div>
                  <div className="font-pixel text-[5px] text-gray-600 mt-1">
                    {formatTimeAgo(event.timestamp)}
                    <span className="mx-2">•</span>
                    <span className="capitalize">{event.type.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
