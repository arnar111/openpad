import { agents, Agent } from '../../data/agents'

function AgentCard({ agent }: { agent: Agent }) {
  const statusColor = agent.status === 'active' ? '#00ff88' : agent.status === 'idle' ? '#ffcc00' : '#ff4444'
  const statusBg = agent.status === 'active' ? 'bg-green-900/20' : agent.status === 'idle' ? 'bg-yellow-900/20' : 'bg-red-900/20'

  return (
    <div
      className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl animate-slide-up"
      style={{
        background: `linear-gradient(135deg, ${agent.color}08, #111128)`,
        borderColor: agent.color + '30',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{agent.emoji}</span>
          <div>
            <div className="font-pixel text-[9px]" style={{ color: agent.color }}>{agent.name}</div>
            <div className="font-pixel text-[6px] text-gray-500">{agent.role}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusBg}`}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
          <span className="font-pixel text-[6px]" style={{ color: statusColor }}>
            {agent.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Current task */}
      <div className="mb-3 px-2 py-1.5 rounded-lg bg-black/30 border border-white/5">
        <div className="font-pixel text-[5px] text-gray-600 mb-0.5">CURRENT TASK</div>
        <div className="font-pixel text-[7px] text-gray-300">{agent.currentTask || 'None'}</div>
      </div>

      {/* Model */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-pixel text-[5px] text-gray-600">MODEL</span>
        <span className="font-pixel text-[6px] text-gray-400">{agent.model}</span>
      </div>

      {/* Token usage bar (fake data) */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="font-pixel text-[5px] text-gray-600">TOKENS TODAY</span>
          <span className="font-pixel text-[5px] text-gray-500">
            {agent.isHuman ? '—' : `${Math.floor(Math.random() * 50 + 10)}k`}
          </span>
        </div>
        {!agent.isHuman && (
          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.floor(Math.random() * 60 + 20)}%`,
                background: `linear-gradient(90deg, ${agent.color}80, ${agent.color})`,
              }}
            />
          </div>
        )}
      </div>

      {/* Reports to */}
      {agent.reportsTo && (
        <div className="mt-2 flex justify-between">
          <span className="font-pixel text-[5px] text-gray-600">REPORTS TO</span>
          <span className="font-pixel text-[6px] text-gray-400">
            {agents.find((a) => a.id === agent.reportsTo)?.emoji}{' '}
            {agents.find((a) => a.id === agent.reportsTo)?.name}
          </span>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const uptime = '3d 14h 22m'

  return (
    <div className="w-full h-full overflow-auto p-4">
      {/* System header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-pixel text-[9px] text-office-accent/60 tracking-widest">AGENT DASHBOARD</h2>
        <div className="flex items-center gap-4">
          <div className="font-pixel text-[6px] text-gray-600">
            UPTIME: <span className="text-green-400">{uptime}</span>
          </div>
          <div className="font-pixel text-[6px] text-gray-600">
            AGENTS: <span className="text-office-accent">{agents.filter((a) => !a.isHuman).length}</span>
          </div>
        </div>
      </div>

      {/* System health */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'CPU', value: '23%', color: '#00ff88' },
          { label: 'MEMORY', value: '4.2 GB', color: '#00BFFF' },
          { label: 'DISK', value: '142 GB', color: '#7B68EE' },
          { label: 'SESSIONS', value: '3', color: '#FF6347' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-office-border bg-office-panel p-3">
            <div className="font-pixel text-[5px] text-gray-600 mb-1">{stat.label}</div>
            <div className="font-pixel text-[11px]" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Agent cards grid */}
      <div className="grid grid-cols-3 gap-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Activity feed */}
      <div className="mt-4 rounded-xl border border-office-border bg-office-panel p-4">
        <div className="font-pixel text-[7px] text-gray-500 mb-3">RECENT ACTIVITY</div>
        {[
          { time: '15:02', agent: '🌀 Blær', action: 'Started new session — coordinating task assignments' },
          { time: '14:58', agent: '❄️ Frost', action: 'Completed code review on PR #42' },
          { time: '14:45', agent: '🔥 Ylur', action: 'Building OpenPad components' },
          { time: '14:30', agent: '🌧️ Regn', action: 'Research complete — market analysis report ready' },
          { time: '14:15', agent: '⛈️ Stormur', action: 'Updated UI mockups for dashboard' },
        ].map((entry, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-1.5 border-b border-office-border/30 last:border-0"
          >
            <span className="font-pixel text-[6px] text-gray-600 w-10 shrink-0">{entry.time}</span>
            <span className="font-pixel text-[6px] text-gray-400 w-16 shrink-0">{entry.agent}</span>
            <span className="font-pixel text-[6px] text-gray-500 truncate">{entry.action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
