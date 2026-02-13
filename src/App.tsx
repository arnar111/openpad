import { useState } from 'react'
import OfficeView from './components/Office/OfficeView'
import OrgChart from './components/OrgChart/OrgChart'
import Dashboard from './components/Dashboard/Dashboard'
import ChatRoom from './components/Chat/ChatRoom'

type Tab = 'office' | 'org' | 'dashboard' | 'chat'

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'office', label: 'Office', icon: '🏢' },
  { id: 'chat', label: 'Samtöl', icon: '💬' },
  { id: 'org', label: 'Org Chart', icon: '📊' },
  { id: 'dashboard', label: 'Dashboard', icon: '📈' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('office')

  return (
    <div className="h-screen w-screen flex flex-col bg-office-bg overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-office-panel border-b border-office-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg">🖥️</span>
          <h1 className="font-pixel text-[10px] text-office-accent tracking-wider">OPENPAD</h1>
        </div>
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-pixel text-[8px] px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-office-accent/20 text-office-accent border border-office-accent/40'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="font-pixel text-[7px] text-gray-600">v1.0</div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'office' && <OfficeView />}
        {activeTab === 'chat' && <ChatRoom />}
        {activeTab === 'org' && <OrgChart />}
        {activeTab === 'dashboard' && <Dashboard />}
      </main>
    </div>
  )
}
