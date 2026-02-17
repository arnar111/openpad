import { useState, useEffect, useCallback, useRef } from 'react'
import { useLiveAgents, useSystemHealth } from '../../hooks/useOpenClaw'

interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: number
  dismissed: boolean
}

const NOTIFICATION_TIMEOUT = 8000

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { agents, connected } = useLiveAgents()
  const health = useSystemHealth()
  const prevStateRef = useRef<Record<string, string>>({})
  const prevConnectedRef = useRef<boolean>(true)

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'dismissed'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setNotifications(prev => [...prev.slice(-9), { ...n, id, timestamp: Date.now(), dismissed: false }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n))
  }, [])

  // Monitor agent status changes
  useEffect(() => {
    agents.forEach(agent => {
      if (agent.isHuman) return
      const prev = prevStateRef.current[agent.id]
      const curr = agent.status

      if (prev && prev !== curr) {
        if (curr === 'offline' && prev === 'active') {
          addNotification({ type: 'warning', title: `${agent.emoji} ${agent.name} went offline`, message: agent.currentTask || '' })
        } else if (curr === 'active' && prev === 'offline') {
          addNotification({ type: 'success', title: `${agent.emoji} ${agent.name} is now active`, message: agent.currentTask || '' })
        }
      }

      prevStateRef.current[agent.id] = curr
    })
  }, [agents, addNotification])

  // Monitor connection status
  useEffect(() => {
    if (prevConnectedRef.current && !connected) {
      addNotification({ type: 'error', title: 'Connection lost', message: 'Firebase connection dropped' })
    } else if (!prevConnectedRef.current && connected) {
      addNotification({ type: 'success', title: 'Reconnected', message: 'Firebase connection restored' })
    }
    prevConnectedRef.current = connected
  }, [connected, addNotification])

  // Monitor system health
  useEffect(() => {
    if (health.diskPercent > 90) {
      addNotification({ type: 'warning', title: 'Disk space low', message: `${health.diskPercent}% used` })
    }
    if (health.memoryPercent > 90) {
      addNotification({ type: 'warning', title: 'Memory usage high', message: `${health.memoryPercent}% used` })
    }
  }, [health.diskPercent, health.memoryPercent, addNotification])

  // Auto-dismiss after timeout
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      setNotifications(prev =>
        prev.map(n => (!n.dismissed && now - n.timestamp > NOTIFICATION_TIMEOUT) ? { ...n, dismissed: true } : n)
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Clean up dismissed notifications after animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => !n.dismissed))
    }, 500)
    return () => clearTimeout(timer)
  }, [notifications])

  return { notifications: notifications.filter(n => !n.dismissed), dismiss }
}

const typeStyles = {
  info: { bg: 'bg-blue-900/20', border: 'border-blue-500/30', icon: 'ℹ️', text: 'text-blue-300' },
  warning: { bg: 'bg-yellow-900/20', border: 'border-yellow-500/30', icon: '⚠️', text: 'text-yellow-300' },
  error: { bg: 'bg-red-900/20', border: 'border-red-500/30', icon: '🔴', text: 'text-red-300' },
  success: { bg: 'bg-green-900/20', border: 'border-green-500/30', icon: '✅', text: 'text-green-300' },
}

export default function NotificationSystem() {
  const { notifications, dismiss } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-16 right-4 z-[90] flex flex-col gap-2 max-w-sm">
      {notifications.map(n => {
        const style = typeStyles[n.type]
        return (
          <div
            key={n.id}
            className={`${style.bg} ${style.border} border rounded-lg px-4 py-3 backdrop-blur-sm animate-slide-up cursor-pointer shadow-lg`}
            onClick={() => dismiss(n.id)}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm shrink-0">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-pixel text-[7px] ${style.text}`}>{n.title}</div>
                {n.message && (
                  <div className="font-pixel text-[5px] text-gray-500 mt-0.5 truncate">{n.message}</div>
                )}
              </div>
              <button className="font-pixel text-[8px] text-gray-500 hover:text-gray-300 shrink-0" onClick={(e) => { e.stopPropagation(); dismiss(n.id) }}>
                ×
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
