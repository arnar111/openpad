import { useEffect, useMemo, useState } from 'react'
import type { Agent } from '../../data/agents'
import { loadAgentCommandHistory, sendAgentCommand, type AgentCommand } from '../../lib/commands'

export default function AgentCommandPanel(props: {
  agent: Agent
  open: boolean
  onClose: () => void
}) {
  const { agent, open, onClose } = props
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<AgentCommand[]>([])

  const placeholder = useMemo(() => `Send command to ${agent.name}...`, [agent.name])

  useEffect(() => {
    if (!open) return
    setError(null)
    setHistory(loadAgentCommandHistory(agent.id, 5))
  }, [open, agent.id])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleString()
    } catch {
      return ''
    }
  }

  const onSend = async () => {
    const cmd = text.trim()
    if (!cmd) return
    setSending(true)
    setError(null)
    try {
      await sendAgentCommand(agent.id, cmd)
      setText('')
      setHistory(loadAgentCommandHistory(agent.id, 5))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send command')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="absolute inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close command panel"
      />

      {/* Panel */}
      <div className="absolute left-0 right-0 bottom-0 border-t border-office-border bg-office-panel/95 backdrop-blur-md animate-slide-up">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{agent.emoji}</div>
              <div>
                <div className="font-pixel text-[11px]" style={{ color: agent.color }}>
                  {agent.name} — {agent.role}
                </div>
                <div className="font-pixel text-[8px] text-gray-400 mt-1">
                  {agent.status.toUpperCase()} • {agent.model}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="font-pixel text-[10px] text-gray-300 hover:text-white px-2 py-1 rounded border border-office-border bg-black/20"
              aria-label="Close"
            >
              X
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSend()
              }}
              placeholder={placeholder}
              className="flex-1 bg-black/30 border border-office-border rounded px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 font-pixel"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={sending || !text.trim()}
              className="px-4 py-2 rounded border border-office-border bg-black/30 hover:bg-black/40 disabled:opacity-50 font-pixel text-[10px] text-gray-100"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          <div className="font-pixel text-[8px] text-gray-500 mt-2">
            Tip: Press Ctrl+Enter to send
          </div>

          {error && (
            <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 font-pixel text-[9px] text-red-200">
              {error}
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="font-pixel text-[9px] text-gray-300">Recent commands</div>
              <div className="font-pixel text-[8px] text-gray-600">last 5</div>
            </div>

            <div className="mt-2 space-y-2">
              {history.length === 0 ? (
                <div className="font-pixel text-[8px] text-gray-600 border border-office-border/50 bg-black/10 rounded px-3 py-3">
                  No commands yet.
                </div>
              ) : (
                history.map((h, idx) => (
                  <div key={`${h.timestamp}-${idx}`} className="rounded border border-office-border/60 bg-black/15 px-3 py-2">
                    <div className="font-pixel text-[9px] text-gray-100 break-words">{h.text}</div>
                    <div className="mt-1 font-pixel text-[7px] text-gray-500">
                      {formatTime(h.timestamp)} • {h.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
