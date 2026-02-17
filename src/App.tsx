import { useState, useEffect, useCallback } from 'react'
import OfficeView from './components/Office/OfficeView'
import OrgChart from './components/OrgChart/OrgChart'
import Dashboard from './components/Dashboard/Dashboard'
import ChatRoom from './components/Chat/ChatRoom'
import Settings from './components/Settings/Settings'
import ActivityLog from './components/ActivityLog/ActivityLog'
import PinLock, { useAuth } from './components/PinLock/PinLock'
import ErrorBoundary from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette/CommandPalette'
import NotificationSystem from './components/Notifications/NotificationSystem'

type Tab = 'office' | 'org' | 'dashboard' | 'chat' | 'activity' | 'settings'

const tabs: { id: Tab; label: string; shortLabel: string; icon: string; shortcut: string }[] = [
  { id: 'office', label: 'Office', shortLabel: 'Office', icon: '🏢', shortcut: '1' },
  { id: 'chat', label: 'Samtöl', shortLabel: 'Chat', icon: '💬', shortcut: '2' },
  { id: 'org', label: 'Org Chart', shortLabel: 'Org', icon: '📊', shortcut: '3' },
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dash', icon: '📈', shortcut: '4' },
  { id: 'activity', label: 'Activity', shortLabel: 'Log', icon: '📋', shortcut: '5' },
  { id: 'settings', label: 'Settings', shortLabel: 'Set', icon: '⚙️', shortcut: '6' },
]

function getTabFromHash(): Tab {
  const hash = window.location.hash.slice(1)
  const found = tabs.find(t => t.id === hash)
  return found ? found.id : 'office'
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromHash)
  const { unlocked, unlock } = useAuth()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navigateTo = useCallback((tab: string) => {
    const validTab = tabs.find(t => t.id === tab)
    if (validTab) {
      setActiveTab(validTab.id)
      window.location.hash = validTab.id
      setMobileNavOpen(false)
    }
  }, [])

  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    if (!unlocked) return

    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
        return
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const tabIndex = parseInt(e.key) - 1
      if (tabIndex >= 0 && tabIndex < tabs.length && !e.metaKey && !e.ctrlKey && !e.altKey) {
        navigateTo(tabs[tabIndex].id)
        return
      }

      if (e.key === 'Escape') {
        setPaletteOpen(false)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [unlocked, navigateTo])

  if (!unlocked) {
    return <PinLock onUnlock={unlock} />
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-office-bg overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 bg-office-panel border-b border-office-border shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-lg">🖥️</span>
          <h1 className="font-pixel text-[10px] text-office-accent tracking-wider hidden sm:block">OPENPAD</h1>
          <h1 className="font-pixel text-[8px] text-office-accent tracking-wider sm:hidden">OP</h1>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigateTo(tab.id)}
              className={`font-pixel text-[8px] px-3 lg:px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-office-accent/20 text-office-accent border border-office-accent/40'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
              }`}
              title={`${tab.label} (${tab.shortcut})`}
            >
              <span className="mr-1">{tab.icon}</span>
              <span className="hidden lg:inline">{tab.label}</span>
              <span className="lg:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="font-pixel text-[7px] px-2 py-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-office-border hidden sm:flex items-center gap-1.5"
            title="Command Palette (⌘K)"
          >
            <span>⌘K</span>
          </button>
          <div className="font-pixel text-[8px] text-gray-600 hidden sm:block">v2.0.0</div>
          <button
            className="md:hidden font-pixel text-[10px] text-gray-400 px-2 py-1"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            ☰
          </button>
        </div>
      </header>

      {/* Mobile nav dropdown */}
      {mobileNavOpen && (
        <div className="md:hidden bg-office-panel border-b border-office-border px-2 py-2 animate-slide-up">
          <div className="grid grid-cols-3 gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => navigateTo(tab.id)}
                className={`font-pixel text-[7px] px-2 py-2.5 rounded-lg text-center transition-colors ${
                  activeTab === tab.id
                    ? 'bg-office-accent/20 text-office-accent border border-office-accent/40'
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                }`}
              >
                <div className="text-sm mb-1">{tab.icon}</div>
                {tab.shortLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary fallbackLabel="Office view error">
          {activeTab === 'office' && <OfficeView />}
        </ErrorBoundary>
        <ErrorBoundary fallbackLabel="Chat error">
          {activeTab === 'chat' && <ChatRoom />}
        </ErrorBoundary>
        <ErrorBoundary fallbackLabel="Org chart error">
          {activeTab === 'org' && <OrgChart />}
        </ErrorBoundary>
        <ErrorBoundary fallbackLabel="Dashboard error">
          {activeTab === 'dashboard' && <Dashboard />}
        </ErrorBoundary>
        <ErrorBoundary fallbackLabel="Activity log error">
          {activeTab === 'activity' && <ActivityLog />}
        </ErrorBoundary>
        <ErrorBoundary fallbackLabel="Settings error">
          {activeTab === 'settings' && <Settings />}
        </ErrorBoundary>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigateTo} />
      <NotificationSystem />
    </div>
  )
}
