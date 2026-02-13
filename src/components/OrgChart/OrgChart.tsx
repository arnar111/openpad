import { useRef, useEffect, useState } from 'react'
import { agents, Agent } from '../../data/agents'

interface NodePos {
  agent: Agent
  x: number
  y: number
  children: NodePos[]
}

function buildTree(): NodePos {
  const arnar = agents.find((a) => a.id === 'arnar')!
  const blaer = agents.find((a) => a.id === 'blaer')!
  const frost = agents.find((a) => a.id === 'frost')!
  const regn = agents.find((a) => a.id === 'regn')!
  const ylur = agents.find((a) => a.id === 'ylur')!
  const stormur = agents.find((a) => a.id === 'stormur')!

  return {
    agent: arnar, x: 0.5, y: 0.08,
    children: [{
      agent: blaer, x: 0.5, y: 0.30,
      children: [
        {
          agent: frost, x: 0.65, y: 0.52,
          children: [
            { agent: ylur, x: 0.55, y: 0.76, children: [] },
            { agent: stormur, x: 0.75, y: 0.76, children: [] },
          ],
        },
        { agent: regn, x: 0.30, y: 0.52, children: [] },
      ],
    }],
  }
}

function AgentNode({ agent, x, y, onClick, selected }: {
  agent: Agent; x: number; y: number
  onClick: () => void; selected: boolean
}) {
  const statusColor = agent.status === 'active' ? '#00ff88' : agent.status === 'idle' ? '#ffcc00' : '#ff4444'

  return (
    <button
      onClick={onClick}
      className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out animate-slide-up group"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      <div
        className={`relative px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
          selected
            ? 'scale-110 shadow-2xl'
            : 'hover:scale-105 hover:shadow-xl'
        }`}
        style={{
          background: `linear-gradient(135deg, ${agent.color}15, ${agent.color}08)`,
          borderColor: selected ? agent.color : agent.color + '40',
          boxShadow: selected ? `0 0 30px ${agent.color}30` : `0 0 10px ${agent.color}10`,
        }}
      >
        {/* Status dot */}
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse-glow"
          style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
        />
        {/* Content */}
        <div className="text-center">
          <div className="text-2xl mb-1">{agent.emoji}</div>
          <div className="font-pixel text-[9px] mb-0.5" style={{ color: agent.color }}>
            {agent.name}
          </div>
          <div className="font-pixel text-[6px] text-gray-500">{agent.role}</div>
          {agent.isHuman && (
            <div className="font-pixel text-[5px] text-yellow-600 mt-1">HUMAN</div>
          )}
        </div>
      </div>
    </button>
  )
}

function ConnectionLines({ tree }: { tree: NodePos }) {
  const svgRef = useRef<SVGSVGElement>(null)

  function renderLines(node: NodePos): React.JSX.Element[] {
    const lines: React.JSX.Element[] = []
    node.children.forEach((child, i) => {
      lines.push(
        <g key={`${node.agent.id}-${child.agent.id}`}>
          <line
            x1={`${node.x * 100}%`} y1={`${node.y * 100}%`}
            x2={`${child.x * 100}%`} y2={`${child.y * 100}%`}
            stroke={node.agent.color + '30'}
            strokeWidth="2"
            strokeDasharray="6 4"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0" to="-20"
              dur="2s"
              repeatCount="indefinite"
            />
          </line>
          {/* Flowing dot */}
          <circle r="3" fill={child.agent.color} opacity="0.7">
            <animateMotion
              dur={`${2 + i * 0.5}s`}
              repeatCount="indefinite"
              path={`M${node.x * 1000},${node.y * 600} L${child.x * 1000},${child.y * 600}`}
            />
          </circle>
        </g>
      )
      lines.push(...renderLines(child))
    })
    return lines
  }

  return (
    <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 600" preserveAspectRatio="none">
      {renderLines(tree)}
    </svg>
  )
}

export default function OrgChart() {
  const [selected, setSelected] = useState<string | null>(null)
  const tree = buildTree()

  function renderNodes(node: NodePos): React.JSX.Element[] {
    const nodes: React.JSX.Element[] = [
      <AgentNode
        key={node.agent.id}
        agent={node.agent}
        x={node.x}
        y={node.y}
        selected={selected === node.agent.id}
        onClick={() => setSelected(selected === node.agent.id ? null : node.agent.id)}
      />,
    ]
    node.children.forEach((child) => {
      nodes.push(...renderNodes(child))
    })
    return nodes
  }

  const selectedAgent = selected ? agents.find((a) => a.id === selected) : null

  return (
    <div className="w-full h-full relative overflow-hidden bg-office-bg">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle, #7B68EE 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      <ConnectionLines tree={tree} />

      {/* Nodes */}
      <div className="absolute inset-0">
        {renderNodes(tree)}
      </div>

      {/* Detail panel */}
      {selectedAgent && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-4 rounded-xl border animate-slide-up"
          style={{
            background: `linear-gradient(135deg, ${selectedAgent.color}10, #111128)`,
            borderColor: selectedAgent.color + '40',
          }}
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl">{selectedAgent.emoji}</span>
            <div>
              <div className="font-pixel text-[10px]" style={{ color: selectedAgent.color }}>
                {selectedAgent.name} — {selectedAgent.role}
              </div>
              <div className="font-pixel text-[7px] text-gray-500 mt-1">
                Model: {selectedAgent.model} • Status: {selectedAgent.status}
              </div>
              <div className="font-pixel text-[7px] text-gray-600 mt-1">
                {selectedAgent.currentTask}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2">
        <h2 className="font-pixel text-[9px] text-office-accent/60 tracking-widest">ORGANIZATION</h2>
      </div>
    </div>
  )
}
