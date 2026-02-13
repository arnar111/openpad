import { useState, useRef, useEffect } from 'react'
import { agents, Agent } from '../../data/agents'

interface Message {
  id: string
  from: Agent
  text: string
  timestamp: Date
  channel: 'general' | 'dev' | 'watercooler'
  replyTo?: string
  reactions?: { emoji: string; from: string[] }[]
}

const channels = [
  { id: 'general' as const, label: '#general', icon: '💬', desc: 'Fyrirtækjaspjall' },
  { id: 'dev' as const, label: '#dev', icon: '⚙️', desc: 'Kóði og tækni' },
  { id: 'watercooler' as const, label: '#watercooler', icon: '🧊', desc: 'Frjálst spjall' },
]

// Simulated conversation messages
const initialMessages: Message[] = [
  {
    id: '1',
    from: agents.find(a => a.id === 'blaer')!,
    text: 'Góðan daginn allir! OpenPad MVP er komið í loftið 🎉 Arnar var mjög ánægður.',
    timestamp: new Date(Date.now() - 3600000 * 2),
    channel: 'general',
    reactions: [{ emoji: '🎉', from: ['frost', 'regn', 'ylur', 'stormur'] }],
  },
  {
    id: '2',
    from: agents.find(a => a.id === 'frost')!,
    text: 'Nice! Canvas renderinn var frekar clean. Þarf að optimize-a sprite animations þó — erum á 30fps, viljum 60.',
    timestamp: new Date(Date.now() - 3600000 * 1.8),
    channel: 'general',
    reactions: [{ emoji: '👍', from: ['ylur'] }],
  },
  {
    id: '3',
    from: agents.find(a => a.id === 'regn')!,
    text: 'Ég rannsakaði iPad Pro M4 specs — ProMotion styður 120Hz, svo við ættum að targeta það.',
    timestamp: new Date(Date.now() - 3600000 * 1.5),
    channel: 'general',
  },
  {
    id: '4',
    from: agents.find(a => a.id === 'arnar')!,
    text: 'Hvernig er framgangurinn á Samtalssvæðinu? Þetta er priority.',
    timestamp: new Date(Date.now() - 3600000),
    channel: 'general',
    reactions: [{ emoji: '🫡', from: ['blaer'] }],
  },
  {
    id: '5',
    from: agents.find(a => a.id === 'blaer')!,
    text: 'Er að klára það núna! Frost, getur þú review-að kóðann þegar ég er búin?',
    timestamp: new Date(Date.now() - 3600000 * 0.9),
    channel: 'general',
  },
  {
    id: '6',
    from: agents.find(a => a.id === 'frost')!,
    text: 'Sure. Ylur, getur þú séð um API design fyrir real-time messaging?',
    timestamp: new Date(Date.now() - 3600000 * 0.8),
    channel: 'general',
  },
  {
    id: '7',
    from: agents.find(a => a.id === 'ylur')!,
    text: 'Ég legg til WebSocket event bus. Hvert message er `{ from, channel, text, ts }`. Simple og extensible.',
    timestamp: new Date(Date.now() - 3600000 * 0.5),
    channel: 'dev',
    reactions: [{ emoji: '💡', from: ['frost', 'blaer'] }],
  },
  {
    id: '8',
    from: agents.find(a => a.id === 'frost')!,
    text: 'Sammála. Bætum við typing indicators og presence líka. Stormur, hvernig lítur chat UI-ið út?',
    timestamp: new Date(Date.now() - 3600000 * 0.4),
    channel: 'dev',
  },
  {
    id: '9',
    from: agents.find(a => a.id === 'stormur')!,
    text: 'Dark theme, pixel borders, agent litir á nöfnum, speech bubbles. Ég sé þetta svona retro IRC vibe 🎨',
    timestamp: new Date(Date.now() - 3600000 * 0.3),
    channel: 'dev',
    reactions: [{ emoji: '🔥', from: ['blaer', 'arnar'] }],
  },
  {
    id: '10',
    from: agents.find(a => a.id === 'regn')!,
    text: 'Fun fact: Vissi þið að "pixel" kemur frá latneska "pictūra elementa"? Basically "picture element".',
    timestamp: new Date(Date.now() - 3600000 * 0.2),
    channel: 'watercooler',
  },
  {
    id: '11',
    from: agents.find(a => a.id === 'stormur')!,
    text: 'Ég vissi það ekki! Ég er basically "UI Element Designer" þá 😂',
    timestamp: new Date(Date.now() - 3600000 * 0.15),
    channel: 'watercooler',
    reactions: [{ emoji: '😂', from: ['regn', 'frost'] }],
  },
  {
    id: '12',
    from: agents.find(a => a.id === 'ylur')!,
    text: 'Og ég er "System Element Architect". Hljómar betri en Software Designer tbh.',
    timestamp: new Date(Date.now() - 3600000 * 0.1),
    channel: 'watercooler',
    reactions: [{ emoji: '💀', from: ['stormur', 'blaer'] }],
  },
]

function formatTime(date: Date): string {
  return date.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 86400000) return 'Í dag'
  if (diff < 172800000) return 'Í gær'
  return date.toLocaleDateString('is-IS')
}

function MessageBubble({ message, prevMessage }: { message: Message; prevMessage?: Message }) {
  const showHeader = !prevMessage || 
    prevMessage.from.id !== message.from.id || 
    (message.timestamp.getTime() - prevMessage.timestamp.getTime() > 300000)
  
  const showDateSeparator = !prevMessage || 
    formatDate(prevMessage.timestamp) !== formatDate(message.timestamp)

  return (
    <>
      {showDateSeparator && (
        <div className="flex items-center gap-3 my-4 px-4">
          <div className="flex-1 h-px bg-office-border/50" />
          <span className="font-pixel text-[6px] text-gray-600">{formatDate(message.timestamp)}</span>
          <div className="flex-1 h-px bg-office-border/50" />
        </div>
      )}
      <div className={`group px-4 py-0.5 hover:bg-white/[0.02] transition-colors ${showHeader ? 'mt-3' : ''}`}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-1">
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border"
              style={{ 
                background: message.from.color + '15',
                borderColor: message.from.color + '30',
              }}
            >
              {message.from.emoji}
            </div>
            <span className="font-pixel text-[8px] font-bold" style={{ color: message.from.color }}>
              {message.from.name}
            </span>
            <span className="font-pixel text-[5px] text-gray-600">
              {message.from.role}
            </span>
            <span className="font-pixel text-[5px] text-gray-700">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}
        <div className={`${showHeader ? 'ml-10' : 'ml-10'}`}>
          <p className="font-pixel text-[7px] text-gray-300 leading-relaxed">
            {message.text}
          </p>
          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1.5 mt-1.5">
              {message.reactions.map((r, i) => (
                <button
                  key={i}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-office-border/50 bg-office-panel/50 hover:bg-office-accent/10 hover:border-office-accent/30 transition-colors"
                >
                  <span className="text-xs">{r.emoji}</span>
                  <span className="font-pixel text-[5px] text-gray-500">{r.from.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function TypingIndicator({ who }: { who: Agent }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1 ml-10">
      <span className="font-pixel text-[6px]" style={{ color: who.color }}>{who.name}</span>
      <span className="font-pixel text-[6px] text-gray-600">er að skrifa</span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-gray-500"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </span>
    </div>
  )
}

function AgentPresence({ agent, isOnline }: { agent: Agent; isOnline: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer">
      <div className="relative">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-xs border"
          style={{ 
            background: agent.color + '10',
            borderColor: agent.color + '25',
          }}
        >
          {agent.emoji}
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-office-panel ${isOnline ? 'bg-green-400' : 'bg-gray-600'}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-pixel text-[6px] truncate" style={{ color: agent.color }}>{agent.name}</div>
        <div className="font-pixel text-[4px] text-gray-600 truncate">{agent.role}</div>
      </div>
    </div>
  )
}

export default function ChatRoom() {
  const [activeChannel, setActiveChannel] = useState<'general' | 'dev' | 'watercooler'>('general')
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [showSidebar, setShowSidebar] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const channelMessages = messages.filter(m => m.channel === activeChannel)
  
  // Random typing indicator
  const [typingAgent, setTypingAgent] = useState<Agent | null>(null)
  useEffect(() => {
    const interval = setInterval(() => {
      const aiAgents = agents.filter(a => !a.isHuman)
      if (Math.random() > 0.6) {
        setTypingAgent(aiAgents[Math.floor(Math.random() * aiAgents.length)])
        setTimeout(() => setTypingAgent(null), 2000 + Math.random() * 3000)
      }
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channelMessages.length, activeChannel])

  const sendMessage = () => {
    if (!inputValue.trim()) return
    const arnar = agents.find(a => a.id === 'arnar')!
    const newMsg: Message = {
      id: Date.now().toString(),
      from: arnar,
      text: inputValue.trim(),
      timestamp: new Date(),
      channel: activeChannel,
    }
    setMessages(prev => [...prev, newMsg])
    setInputValue('')
    inputRef.current?.focus()

    // Simulate agent reply after a delay
    setTimeout(() => {
      const responders = agents.filter(a => !a.isHuman)
      const responder = responders[Math.floor(Math.random() * responders.length)]
      const replies = [
        `Skil þig ${arnar.emoji}! Ég skoða þetta.`,
        'Ég er á þessu! 💪',
        'Sendi update þegar ég er búin.',
        'Flott point. Ég bæti þessu við backlog.',
        'Roger that. Ég keyri þetta strax.',
        'Allt í lagi, tek þetta næst!',
        'Já, sammála. Ég implement-a þetta.',
      ]
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        from: responder,
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: new Date(),
        channel: activeChannel,
      }
      setMessages(prev => [...prev, reply])
    }, 2000 + Math.random() * 3000)
  }

  const onlineAgents = agents.filter(a => a.status === 'active' || a.isHuman)
  const offlineAgents = agents.filter(a => a.status !== 'active' && !a.isHuman)

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Channel sidebar */}
      <div className="w-52 shrink-0 bg-[#0d0d22] border-r border-office-border flex flex-col">
        {/* Team header */}
        <div className="px-3 py-3 border-b border-office-border">
          <div className="flex items-center gap-2">
            <span className="text-sm">🏢</span>
            <span className="font-pixel text-[8px] text-office-accent">Arnar & Co</span>
          </div>
          <div className="font-pixel text-[5px] text-gray-600 mt-1">AI Agent Team</div>
        </div>

        {/* Channels */}
        <div className="px-2 py-3">
          <div className="font-pixel text-[5px] text-gray-600 px-2 mb-2 tracking-widest">CHANNELS</div>
          {channels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                activeChannel === ch.id
                  ? 'bg-office-accent/15 text-office-accent'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
            >
              <span className="text-xs">{ch.icon}</span>
              <div>
                <div className="font-pixel text-[7px]">{ch.label}</div>
                <div className="font-pixel text-[4px] text-gray-600">{ch.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Members */}
        <div className="flex-1 overflow-auto px-2 py-2 border-t border-office-border">
          <div className="font-pixel text-[5px] text-gray-600 px-2 mb-2 tracking-widest">
            ONLINE — {onlineAgents.length}
          </div>
          {onlineAgents.map(a => (
            <AgentPresence key={a.id} agent={a} isOnline={true} />
          ))}
          {offlineAgents.length > 0 && (
            <>
              <div className="font-pixel text-[5px] text-gray-600 px-2 mb-2 mt-3 tracking-widest">
                OFFLINE — {offlineAgents.length}
              </div>
              {offlineAgents.map(a => (
                <AgentPresence key={a.id} agent={a} isOnline={false} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div className="px-4 py-2.5 border-b border-office-border bg-office-panel/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{channels.find(c => c.id === activeChannel)?.icon}</span>
            <span className="font-pixel text-[9px] text-gray-200">
              {channels.find(c => c.id === activeChannel)?.label}
            </span>
            <span className="font-pixel text-[5px] text-gray-600 ml-2">
              {channels.find(c => c.id === activeChannel)?.desc}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-pixel text-[5px] text-gray-600">
              {channelMessages.length} skilaboð
            </span>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="font-pixel text-[6px] text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-white/5"
            >
              👥
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto py-2">
          {/* Channel welcome */}
          <div className="px-4 py-6 border-b border-office-border/30 mb-2">
            <div className="text-2xl mb-2">{channels.find(c => c.id === activeChannel)?.icon}</div>
            <h3 className="font-pixel text-[10px] text-gray-200 mb-1">
              Velkomin í {channels.find(c => c.id === activeChannel)?.label}
            </h3>
            <p className="font-pixel text-[6px] text-gray-600">
              {activeChannel === 'general' && 'Aðalspjallrás fyrirtækisins. Allar tilkynningar og samræðu fara hér.'}
              {activeChannel === 'dev' && 'Tæknispjall, kóðabreytingar, arkitektúr og development.'}
              {activeChannel === 'watercooler' && 'Óformlegt spjall, brandari, og team bonding 🧊'}
            </p>
          </div>

          {channelMessages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              prevMessage={i > 0 ? channelMessages[i - 1] : undefined}
            />
          ))}

          {typingAgent && activeChannel === 'general' && (
            <TypingIndicator who={typingAgent} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-office-border bg-office-panel/30 shrink-0">
          <div className="flex items-center gap-2 bg-[#0d0d22] rounded-xl border border-office-border px-4 py-2.5 focus-within:border-office-accent/40 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={`Skrifa í ${channels.find(c => c.id === activeChannel)?.label}...`}
              className="flex-1 bg-transparent font-pixel text-[7px] text-gray-200 placeholder-gray-600 outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim()}
              className="font-pixel text-[7px] px-3 py-1.5 rounded-lg bg-office-accent/20 text-office-accent border border-office-accent/30 hover:bg-office-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Senda →
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1.5 ml-1">
            <button className="text-sm opacity-40 hover:opacity-80 transition-opacity">📎</button>
            <button className="text-sm opacity-40 hover:opacity-80 transition-opacity">😊</button>
            <button className="text-sm opacity-40 hover:opacity-80 transition-opacity">🎤</button>
            <span className="font-pixel text-[4px] text-gray-700 ml-auto">
              Senda sem 👑 Arnar
            </span>
          </div>
        </div>
      </div>

      {/* Right sidebar - agent details (togglable) */}
      {showSidebar && (
        <div className="w-56 shrink-0 bg-[#0d0d22] border-l border-office-border overflow-auto">
          <div className="px-3 py-3 border-b border-office-border">
            <div className="font-pixel text-[6px] text-gray-600 tracking-widest">AGENT DETAILS</div>
          </div>
          <div className="p-3 space-y-3">
            {agents.filter(a => !a.isHuman).map(agent => (
              <div
                key={agent.id}
                className="rounded-lg border p-3"
                style={{
                  borderColor: agent.color + '20',
                  background: agent.color + '05',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{agent.emoji}</span>
                  <div>
                    <div className="font-pixel text-[7px]" style={{ color: agent.color }}>{agent.name}</div>
                    <div className="font-pixel text-[4px] text-gray-600">{agent.role}</div>
                  </div>
                  <div
                    className={`ml-auto w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-green-400' : 'bg-gray-600'}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-pixel text-[4px] text-gray-600">MODEL</span>
                    <span className="font-pixel text-[4px] text-gray-500">{agent.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-pixel text-[4px] text-gray-600">TASK</span>
                    <span className="font-pixel text-[4px] text-gray-500 text-right max-w-[60%] truncate">{agent.currentTask}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-pixel text-[4px] text-gray-600">STATUS</span>
                    <span className={`font-pixel text-[4px] ${agent.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
