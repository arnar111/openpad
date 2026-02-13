import { useLiveAgents, useSystemHealth, LiveAgent } from '../../hooks/useOpenClaw'
import { agents as staticAgents } from '../../data/agents'

function StatusDot({ status }: { status: string }) {
  const color = status === 'active' ? '#00ff88' : status === 'idle' ? '#ffcc00' : '#ff4444'
  return <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
}

function AgentCard({ agent }: { agent: LiveAgent }) {
  const statusColor = agent.status === 'active' ? '#00ff88' : agent.status === 'idle' ? '#ffcc00' : '#ff4444'
  const statusBg = agent.status === 'active' ? 'bg-green-900/20' : agent.status === 'idle' ? 'bg-yellow-900/20' : 'bg-red-900/20'

  const tokenPercent = agent.sessions.length > 0
    ? Math.round(agent.sessions.reduce((s, sess) => s + sess.percentUsed, 0) / agent.sessions.length)
    : 0

  const lastActiveStr = agent.lastActive
    ? new Date(agent.lastActive).toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div
      className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl animate-slide-up"
      style={{
        background: `linear-gradient(135deg, ${agent.color}08, #111128)`,
        borderColor: agent.color + '30',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{agent.emoji}</span>
          <div>
            <div className="font-pixel text-[9px]" style={{ color: agent.color }}>{agent.name}</div>
            <div className="font-pixel text-[6px] text-gray-500">{agent.role}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusBg}`}>
          <StatusDot status={agent.status} />
          <span className="font-pixel text-[6px]" style={{ color: statusColor }}>
            {agent.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="mb-3 px-2 py-1.5 rounded-lg bg-black/30 border border-white/5">
        <div className="font-pixel text-[5px] text-gray-600 mb-0.5">CURRENT TASK</div>
        <div className="font-pixel text-[7px] text-gray-300">{agent.currentTask || 'None'}</div>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="font-pixel text-[5px] text-gray-600">MODEL</span>
        <span className="font-pixel text-[6px] text-gray-400">{agent.primaryModel}</span>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="font-pixel text-[5px] text-gray-600">SESSIONS</span>
        <span className="font-pixel text-[6px] text-gray-400">{agent.activeSessions} active</span>
      </div>

      <div className="flex justify-between items-center mb-3">
        <span className="font-pixel text-[5px] text-gray-600">LAST ACTIVE</span>
        <span className="font-pixel text-[6px] text-gray-400">{lastActiveStr}</span>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span className="font-pixel text-[5px] text-gray-600">TOKENS</span>
          <span className="font-pixel text-[5px] text-gray-500">
            {agent.isHuman ? '—' : `${(agent.totalTokensToday / 1000).toFixed(0)}k`}
          </span>
        </div>
        {!agent.isHuman && (
          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(tokenPercent, 100)}%`,
                background: `linear-gradient(90deg, ${agent.color}80, ${agent.color})`,
              }}
            />
          </div>
        )}
      </div>

      {agent.reportsTo && (
        <div className="mt-2 flex justify-between">
          <span className="font-pixel text-[5px] text-gray-600">REPORTS TO</span>
          <span className="font-pixel text-[6px] text-gray-400">
            {staticAgents.find((a) => a.id === agent.reportsTo)?.emoji}{' '}
            {staticAgents.find((a) => a.id === agent.reportsTo)?.name}
          </span>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { agents: liveAgents, connected } = useLiveAgents()
  const health = useSystemHealth()

  return (
    <div className="w-full h-full overflow-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-pixel text-[9px] text-office-accent/60 tracking-widest">AGENT DASHBOARD</h2>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${connected ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className={`font-pixel text-[5px] ${connected ? 'text-green-400' : 'text-red-400'}`}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="font-pixel text-[6px] text-gray-600">
            UPTIME: <span className="text-green-400">{health.uptime}</span>
          </div>
          <div className="font-pixel text-[6px] text-gray-600">
            SESSIONS: <span className="text-office-accent">{health.totalSessions}</span>
          </div>
        </div>
      </div>

      {/* System health */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        {[
          { label: 'MEMORY', value: health.memory, color: '#00BFFF', sub: `${health.memoryPercent}%` },
          { label: 'DISK', value: health.disk, color: '#7B68EE', sub: `${health.diskPercent}%` },
          { label: 'SESSIONS', value: String(health.sessions), color: '#FF6347' },
          { label: 'GATEWAY', value: `${health.gatewayLatency}ms`, color: '#00ff88' },
          { label: 'WHATSAPP', value: health.whatsapp ? '🟢 Linked' : '🔴 Down', color: health.whatsapp ? '#00ff88' : '#ff4444' },
          { label: 'DISCORD', value: health.discord ? '🟢 Online' : '🔴 Off', color: health.discord ? '#00ff88' : '#ff4444' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-office-border bg-office-panel p-3">
            <div className="font-pixel text-[5px] text-gray-600 mb-1">{stat.label}</div>
            <div className="font-pixel text-[10px]" style={{ color: stat.color }}>{stat.value}</div>
            {stat.sub && <div className="font-pixel text-[5px] text-gray-600 mt-0.5">{stat.sub}</div>}
          </div>
        ))}
      </div>

      {/* Memory info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-office-border bg-office-panel p-3">
          <div className="font-pixel text-[5px] text-gray-600 mb-1">MEMORY FILES</div>
          <div className="font-pixel text-[10px] text-office-accent">{health.memoryFiles}</div>
        </div>
        <div className="rounded-lg border border-office-border bg-office-panel p-3">
          <div className="font-pixel text-[5px] text-gray-600 mb-1">MEMORY CHUNKS</div>
          <div className="font-pixel text-[10px] text-office-accent">{health.memoryChunks}</div>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-3 gap-3">
        {liveAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  )
}
