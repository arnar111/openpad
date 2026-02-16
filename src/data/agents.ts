export interface Agent {
  id: string
  name: string
  emoji: string
  role: string
  color: string
  model: string
  isHuman?: boolean
  status: 'active' | 'idle' | 'offline'
  currentTask?: string
  reportsTo?: string
}

export const agents: Agent[] = [
  {
    id: 'arnar',
    name: 'Arnar',
    emoji: '👑',
    role: 'CEO',
    color: '#FFD700',
    model: 'human',
    isHuman: true,
    status: 'active',
    currentTask: 'Strategic planning',
  },
  {
    id: 'blaer',
    name: 'Blær',
    emoji: '🌀',
    role: 'COO',
    color: '#7B68EE',
    model: 'claude-opus-4-6',
    status: 'active',
    currentTask: 'Coordinating agents',
    reportsTo: 'arnar',
  },
  {
    id: 'frost',
    name: 'Frost',
    emoji: '❄️',
    role: 'CTO',
    color: '#00BFFF',
    model: 'discord-bot',
    status: 'active',
    currentTask: 'Code review',
    reportsTo: 'blaer',
  },
  {
    id: 'regn',
    name: 'Regn',
    emoji: '🌧️',
    role: 'Researcher',
    color: '#4682B4',
    model: 'gemini-3-flash',
    status: 'idle',
    currentTask: 'Analyzing data',
    reportsTo: 'blaer',
  },
  {
    id: 'ylur',
    name: 'Ylur',
    emoji: '🔥',
    role: 'Software Designer',
    color: '#FF6347',
    model: 'claude-sonnet',
    status: 'active',
    currentTask: 'Building components',
    reportsTo: 'frost',
  },
  {
    id: 'stormur',
    name: 'Stormur',
    emoji: '⛈️',
    role: 'UI Designer',
    color: '#9370DB',
    model: 'gemini-3-flash',
    status: 'idle',
    currentTask: 'Designing layouts',
    reportsTo: 'frost',
  },
  {
    id: 'dogg',
    name: 'Dögg',
    emoji: '💧',
    role: 'Content & Copy',
    color: '#20B2AA',
    model: 'gemini-3-flash',
    status: 'idle',
    currentTask: 'Writing content',
    reportsTo: 'regn',
  },
  {
    id: 'udi',
    name: 'Úði',
    emoji: '📊',
    role: 'Data & Analytics',
    color: '#DAA520',
    model: 'gemini-3-flash',
    status: 'idle',
    currentTask: 'Analyzing data',
    reportsTo: 'regn',
  },
]

export function getAgentById(id: string): Agent | undefined {
  return agents.find((a) => a.id === id)
}
