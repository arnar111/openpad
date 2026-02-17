import { useState, useEffect, useRef, useCallback } from 'react'
import { agents } from '../../data/agents'

export type CommandAction = {
  id: string
  label: string
  icon: string
  category: string
  onSelect: () => void
}

interface Props {
  open: boolean
  onClose: () => void
  onNavigate: (tab: string) => void
}

export default function CommandPalette({ open, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const actions: CommandAction[] = [
    { id: 'nav-office', label: 'Go to Office', icon: '🏢', category: 'Navigation', onSelect: () => { onNavigate('office'); onClose() } },
    { id: 'nav-chat', label: 'Go to Chat', icon: '💬', category: 'Navigation', onSelect: () => { onNavigate('chat'); onClose() } },
    { id: 'nav-org', label: 'Go to Org Chart', icon: '📊', category: 'Navigation', onSelect: () => { onNavigate('org'); onClose() } },
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: '📈', category: 'Navigation', onSelect: () => { onNavigate('dashboard'); onClose() } },
    { id: 'nav-activity', label: 'Go to Activity Log', icon: '📋', category: 'Navigation', onSelect: () => { onNavigate('activity'); onClose() } },
    { id: 'nav-settings', label: 'Go to Settings', icon: '⚙️', category: 'Navigation', onSelect: () => { onNavigate('settings'); onClose() } },
    ...agents.filter(a => !a.isHuman).map(a => ({
      id: `agent-${a.id}`,
      label: `View ${a.name} (${a.role})`,
      icon: a.emoji,
      category: 'Agents',
      onSelect: () => { onNavigate('dashboard'); onClose() },
    })),
    { id: 'reset-layout', label: 'Reset Office Layout', icon: '🔄', category: 'Actions', onSelect: () => {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith('openpad.office.agentPositions')) keys.push(k)
      }
      keys.forEach(k => localStorage.removeItem(k))
      onClose()
      window.location.reload()
    }},
    { id: 'toggle-font', label: 'Toggle Pixel Font', icon: '🔤', category: 'Actions', onSelect: () => {
      const current = localStorage.getItem('openpad:display:pixelFont')
      localStorage.setItem('openpad:display:pixelFont', current === 'false' ? 'true' : 'false')
      window.dispatchEvent(new Event('openpad:display-settings'))
      onClose()
    }},
  ]

  const filtered = query
    ? actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase()))
    : actions

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      filtered[selectedIndex].onSelect()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [filtered, selectedIndex, onClose])

  if (!open) return null

  const categories = [...new Set(filtered.map(a => a.category))]

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close palette"
      />
      <div className="relative w-full max-w-lg bg-office-panel border border-office-border rounded-xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-office-border">
          <span className="font-pixel text-[8px] text-gray-500">⌘K</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent font-pixel text-[9px] text-gray-200 placeholder-gray-600 outline-none"
          />
        </div>

        <div className="max-h-[40vh] overflow-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center">
              <span className="font-pixel text-[7px] text-gray-600">No results found</span>
            </div>
          )}

          {categories.map(cat => (
            <div key={cat}>
              <div className="px-4 py-1.5">
                <span className="font-pixel text-[5px] text-gray-600 tracking-widest">{cat.toUpperCase()}</span>
              </div>
              {filtered.filter(a => a.category === cat).map(action => {
                const globalIdx = filtered.indexOf(action)
                return (
                  <button
                    key={action.id}
                    onClick={action.onSelect}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      globalIdx === selectedIndex
                        ? 'bg-office-accent/15 text-office-accent'
                        : 'text-gray-300 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="text-sm w-6 text-center">{action.icon}</span>
                    <span className="font-pixel text-[8px]">{action.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-office-border flex items-center gap-4">
          <span className="font-pixel text-[5px] text-gray-600">↑↓ navigate</span>
          <span className="font-pixel text-[5px] text-gray-600">↵ select</span>
          <span className="font-pixel text-[5px] text-gray-600">esc close</span>
        </div>
      </div>
    </div>
  )
}
