import { useState, useRef, useEffect, useCallback } from 'react'
import { agents, Agent } from '../../data/agents'

interface DiscordMessage {
  id: string
  agentId: string
  authorName: string
  authorAvatar: string | null
  text: string
  timestamp: string
  reactions: { emoji: string; count: number }[]
  attachments: string[]
}

interface ChannelData {
  id: string
  name: string
  icon: string
  desc: string
  messages: DiscordMessage[]
}

interface DiscordData {
  guildId: string
  updatedAt: string
  channels: Record<string, ChannelData>
}

interface DisplayMessage {
  id: string
  from: Agent
  text: string
  timestamp: Date
  reactions?: { emoji: string; count: number }[]
  attachments?: string[]
}

const BRIDGE_HOST = `http://172.28.160.83:5181`
const BRIDGE_SEND_URL = `${BRIDGE_HOST}/send`
const BRIDGE_MESSAGES_URL = `${BRIDGE_HOST}/messages`
const POLL_INTERVAL = 5000

const CHANNEL_ORDER = ['adalras', 'devchannel']

function getAgentForMessage(msg: DiscordMessage): Agent {
  const exact = agents.find(a => a.id === msg.agentId)
  if (exact) return exact
  const byName = agents.find(a => a.name.toLowerCase() === msg.authorName.toLowerCase())
  if (byName) return byName
  return {
    id: msg.agentId || 'unknown',
    name: msg.authorName || 'Unknown',
    emoji: '❓',
    role: '',
    color: '#888888',
    model: '',
    status: 'idle',
  }
}

function toDisplay(msgs: DiscordMessage[]): DisplayMessage[] {
  return msgs
    .filter(m => m.text.trim() !== '')
    .map(m => ({
      id: m.id,
      from: getAgentForMessage(m),
      text: m.text,
      timestamp: new Date(m.timestamp),
      reactions: m.reactions,
      attachments: m.attachments,
    }))
}

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

function MessageBubble({ message, prevMessage }: { message: DisplayMessage; prevMessage?: DisplayMessage }) {
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
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border"
              style={{ background: message.from.color + '15', borderColor: message.from.color + '30' }}
            >
              {message.from.emoji}
            </div>
            <span className="font-pixel text-[8px] font-bold" style={{ color: message.from.color }}>
              {message.from.name}
            </span>
            <span className="font-pixel text-[5px] text-gray-600">{message.from.role}</span>
            <span className="font-pixel text-[5px] text-gray-700">{formatTime(message.timestamp)}</span>
          </div>
        )}
        <div className="ml-10">
          <p className="font-pixel text-[7px] text-gray-300 leading-relaxed whitespace-pre-wrap">{message.text}</p>
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.attachments.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener" className="block max-w-[300px]">
                  {url.match(/\.(png|jpg|jpeg|gif|webp)/i) ? (
                    <img src={url} className="rounded-lg border border-office-border max-h-48" />
                  ) : (
                    <span className="font-pixel text-[6px] text-office-accent underline">📎 Attachment</span>
                  )}
                </a>
              ))}
            </div>
          )}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1.5 mt-1.5">
              {message.reactions.map((r, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-office-border/50 bg-office-panel/50">
                  <span className="text-xs">{r.emoji}</span>
                  <span className="font-pixel text-[5px] text-gray-500">{r.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function AgentPresence({ agent, isOnline }: { agent: Agent; isOnline: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer">
      <div className="relative">
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs border"
          style={{ background: agent.color + '10', borderColor: agent.color + '25' }}>
          {agent.emoji}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-office-panel ${isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-pixel text-[6px] truncate" style={{ color: agent.color }}>{agent.name}</div>
        <div className="font-pixel text-[4px] text-gray-600 truncate">{agent.role}</div>
      </div>
    </div>
  )
}

export default function ChatRoom() {
  const [activeChannel, setActiveChannel] = useState('adalras')
  const [inputValue, setInputValue] = useState('')
  const [channelData, setChannelData] = useState<Record<string, ChannelData>>({})
  const [showSidebar, setShowSidebar] = useState(true)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastMessageCounts = useRef<Record<string, number>>({})

  const currentChannel = channelData[activeChannel]
  const messages = currentChannel ? toDisplay(currentChannel.messages) : []

  const fetchMessages = useCallback(async () => {
    try {
      // Try bridge API first (works from Netlify), fall back to local file
      let resp: Response
      try {
        resp = await fetch(BRIDGE_MESSAGES_URL + '?' + Date.now())
      } catch {
        resp = await fetch('/data/discord-messages.json?' + Date.now())
      }
      if (!resp.ok) return
      const data: DiscordData = await resp.json()
      setChannelData(data.channels || {})
      setConnected(true)
      setLastUpdate(new Date(data.updatedAt).toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

      // Auto-scroll on new messages in active channel
      const activeMsgs = data.channels?.[activeChannel]?.messages || []
      if (activeMsgs.length > (lastMessageCounts.current[activeChannel] || 0)) {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
      for (const [slug, ch] of Object.entries(data.channels || {})) {
        lastMessageCounts.current[slug] = ch.messages.length
      }
    } catch {
      setConnected(false)
    }
  }, [activeChannel])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchMessages])

  // Scroll to bottom on channel switch
  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 50)
  }, [activeChannel])

  const sendMessage = async () => {
    if (!inputValue.trim() || sending) return
    setSending(true)
    try {
      const resp = await fetch(BRIDGE_SEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputValue.trim(),
          username: 'Arnar 👑',
          channel: activeChannel,
        }),
      })
      if (resp.ok) {
        setInputValue('')
        setTimeout(fetchMessages, 1000)
      }
    } catch (e) {
      console.error('Send failed:', e)
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const channels = CHANNEL_ORDER
    .map(slug => {
      const ch = channelData[slug]
      return ch ? { slug, ...ch } : null
    })
    .filter(Boolean) as (ChannelData & { slug: string })[]

  // Fallback channels if bridge hasn't loaded yet
  const displayChannels = channels.length > 0 ? channels : [
    { slug: 'adalras', id: '', name: 'aðalrás', icon: '💬', desc: 'Fyrirtækjaspjall', messages: [] },
    { slug: 'devchannel', id: '', name: 'devchannel', icon: '⚙️', desc: 'Kóði og tækni', messages: [] },
  ]

  const onlineAgents = agents.filter(a => a.status === 'active' || a.isHuman)
  const offlineAgents = agents.filter(a => a.status !== 'active' && !a.isHuman)

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Channel sidebar */}
      <div className="w-52 shrink-0 bg-[#0d0d22] border-r border-office-border flex flex-col">
        <div className="px-3 py-3 border-b border-office-border">
          <div className="flex items-center gap-2">
            <span className="text-sm">🏢</span>
            <span className="font-pixel text-[8px] text-office-accent">Arnar & Co</span>
          </div>
          <div className="font-pixel text-[5px] text-gray-600 mt-1">AI Agent Team</div>
        </div>

        <div className="px-2 py-3">
          <div className="font-pixel text-[5px] text-gray-600 px-2 mb-2 tracking-widest">DISCORD</div>
          {displayChannels.map(ch => (
            <button
              key={ch.slug}
              onClick={() => setActiveChannel(ch.slug)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                activeChannel === ch.slug
                  ? 'bg-office-accent/15 text-office-accent'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
            >
              <span className="text-xs">{ch.icon}</span>
              <div>
                <div className="font-pixel text-[7px]">#{ch.name}</div>
                <div className="font-pixel text-[4px] text-gray-600">{ch.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-3 py-2 border-t border-office-border">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="font-pixel text-[5px] text-gray-600">{connected ? 'LIVE' : 'DISCONNECTED'}</span>
          </div>
          {lastUpdate && <div className="font-pixel text-[4px] text-gray-700 mt-1">Uppfært: {lastUpdate}</div>}
        </div>

        <div className="flex-1 overflow-auto px-2 py-2 border-t border-office-border">
          <div className="font-pixel text-[5px] text-gray-600 px-2 mb-2 tracking-widest">ONLINE — {onlineAgents.length}</div>
          {onlineAgents.map(a => <AgentPresence key={a.id} agent={a} isOnline={true} />)}
          {offlineAgents.length > 0 && (
            <>
              <div className="font-pixel text-[5px] text-gray-600 px-2 mb-2 mt-3 tracking-widest">OFFLINE — {offlineAgents.length}</div>
              {offlineAgents.map(a => <AgentPresence key={a.id} agent={a} isOnline={false} />)}
            </>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-2.5 border-b border-office-border bg-office-panel/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{currentChannel?.icon || '💬'}</span>
            <span className="font-pixel text-[9px] text-gray-200">#{currentChannel?.name || activeChannel}</span>
            <span className="font-pixel text-[5px] text-gray-600 ml-2">Discord · {currentChannel?.desc || ''}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-pixel text-[5px] text-gray-600">{messages.length} skilaboð</span>
            <button onClick={() => setShowSidebar(!showSidebar)}
              className="font-pixel text-[6px] text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-white/5">👥</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto py-2">
          {!connected && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <span className="text-3xl mb-4">🔌</span>
              <h3 className="font-pixel text-[10px] text-gray-400 mb-2">Discord Bridge ekki tengdur</h3>
              <p className="font-pixel text-[6px] text-gray-600 max-w-sm">
                Keyrðu <code className="bg-white/5 px-1 rounded">python3 discord-bridge.py</code> til að tengja við Discord.
              </p>
            </div>
          )}

          {messages.length > 0 && (
            <div className="px-4 py-6 border-b border-office-border/30 mb-2">
              <div className="text-2xl mb-2">{currentChannel?.icon || '💬'}</div>
              <h3 className="font-pixel text-[10px] text-gray-200 mb-1">#{currentChannel?.name || activeChannel}</h3>
              <p className="font-pixel text-[6px] text-gray-600">{currentChannel?.desc || ''}</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={msg.id} message={msg} prevMessage={i > 0 ? messages[i - 1] : undefined} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-3 border-t border-office-border bg-office-panel/30 shrink-0">
          <div className="flex items-center gap-2 bg-[#0d0d22] rounded-xl border border-office-border px-4 py-2.5 focus-within:border-office-accent/40 transition-colors">
            <input ref={inputRef} type="text" value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={`Skrifa í #${currentChannel?.name || activeChannel}...`}
              className="flex-1 bg-transparent font-pixel text-[7px] text-gray-200 placeholder-gray-600 outline-none"
              disabled={sending} />
            <button onClick={sendMessage} disabled={!inputValue.trim() || sending}
              className="font-pixel text-[7px] px-3 py-1.5 rounded-lg bg-office-accent/20 text-office-accent border border-office-accent/30 hover:bg-office-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              {sending ? '...' : 'Senda →'}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1.5 ml-1">
            <span className="font-pixel text-[4px] text-gray-700 ml-auto">
              {connected ? '🟢 Live' : '🔴 Ótengdur'} · Senda sem 👑 Arnar
            </span>
          </div>
        </div>
      </div>

      {showSidebar && (
        <div className="w-56 shrink-0 bg-[#0d0d22] border-l border-office-border overflow-auto">
          <div className="px-3 py-3 border-b border-office-border">
            <div className="font-pixel text-[6px] text-gray-600 tracking-widest">AGENT DETAILS</div>
          </div>
          <div className="p-3 space-y-3">
            {agents.filter(a => !a.isHuman).map(agent => (
              <div key={agent.id} className="rounded-lg border p-3"
                style={{ borderColor: agent.color + '20', background: agent.color + '05' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{agent.emoji}</span>
                  <div>
                    <div className="font-pixel text-[7px]" style={{ color: agent.color }}>{agent.name}</div>
                    <div className="font-pixel text-[4px] text-gray-600">{agent.role}</div>
                  </div>
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-green-400' : 'bg-gray-600'}`} />
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
