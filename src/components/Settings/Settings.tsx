import { useEffect, useMemo, useState } from 'react'
import { agents as staticAgents } from '../../data/agents'
import { LiveAgent, useLiveAgents, useOpenClawStatus } from '../../hooks/useOpenClaw'

const OPENPAD_VERSION = '1.2.0'

const LS_PIXEL_FONT = 'openpad:display:pixelFont'
const LS_CANVAS_QUALITY = 'openpad:display:canvasQuality'

type CanvasQuality = 'low' | 'medium' | 'high'

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return fallback
    if (raw === 'true') return true
    if (raw === 'false') return false
    return fallback
  } catch {
    return fallback
  }
}

function readCanvasQuality(): CanvasQuality {
  if (typeof window === 'undefined') return 'medium'
  try {
    const raw = window.localStorage.getItem(LS_CANVAS_QUALITY)
    if (raw === 'low' || raw === 'medium' || raw === 'high') return raw
    return 'medium'
  } catch {
    return 'medium'
  }
}

function setLocalStorage(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

function applyPixelFont(enabled: boolean) {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('font-system', !enabled)
}

function emitDisplaySettingsChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('openpad:display-settings'))
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-office-panel border border-office-border rounded-xl p-4">
      <h2 className="font-pixel text-[9px] text-office-accent tracking-widest mb-3">{title}</h2>
      <div className="border-t border-office-border/70 pt-3">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="font-pixel text-[7px] text-gray-500">{label}</div>
      <div className="font-pixel text-[7px] text-gray-300 text-right">{value}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="font-pixel text-[7px] text-gray-300">{label}</div>
        {description && <div className="font-pixel text-[6px] text-gray-600 mt-1">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full border transition-colors ${
          checked
            ? 'bg-office-accent/30 border-office-accent/50'
            : 'bg-white/5 border-office-border'
        }`}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-all ${
            checked ? 'left-5 bg-office-accent' : 'left-1 bg-gray-500'
          }`}
        />
      </button>
    </div>
  )
}

export default function Settings() {
  const { status, connected } = useOpenClawStatus()
  const { agents: liveAgents } = useLiveAgents()

  const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '(not set)'

  const lastUpdate = useMemo(() => {
    const ts = status?.timestamp || null
    if (!ts) return '—'
    try {
      return new Date(ts).toLocaleString()
    } catch {
      return String(ts)
    }
  }, [status?.timestamp])

  const [pixelFont, setPixelFont] = useState<boolean>(() => readBool(LS_PIXEL_FONT, true))
  const [canvasQuality, setCanvasQuality] = useState<CanvasQuality>(() => readCanvasQuality())

  useEffect(() => {
    applyPixelFont(pixelFont)
    setLocalStorage(LS_PIXEL_FONT, String(pixelFont))
    emitDisplaySettingsChanged()
  }, [pixelFont])

  useEffect(() => {
    setLocalStorage(LS_CANVAS_QUALITY, canvasQuality)
    emitDisplaySettingsChanged()
  }, [canvasQuality])

  function resetLayout() {
    if (typeof window === 'undefined') return
    try {
      const prefixes = [
        'openpad:layout:',
        'openpad:agentPos:',
        'openpad:agents:pos:',
        'openpad:office:pos:',
        'openpad.office.agentPositions',
      ]
      const keys: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k) keys.push(k)
      }
      keys.forEach((k) => {
        if (prefixes.some((p) => k.startsWith(p))) {
          window.localStorage.removeItem(k)
        }
      })
    } catch {
      // ignore
    }
  }

  function clearCommandHistory() {
    if (typeof window === 'undefined') return
    try {
      const keys: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k) keys.push(k)
      }
      keys.forEach((k) => {
        if (k.startsWith('openpad:commands:')) window.localStorage.removeItem(k)
      })
    } catch {
      // ignore
    }
  }

  const agentsToShow: Array<(typeof staticAgents)[number] | LiveAgent> = liveAgents?.length ? liveAgents : staticAgents

  return (
    <div className="w-full h-full overflow-y-auto bg-office-bg p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-pixel text-[10px] text-office-accent tracking-widest">SETTINGS</h1>
            <div className="font-pixel text-[6px] text-gray-600 mt-2">Configure OpenPad (read-only agent config for now).</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="FIREBASE CONFIG">
            <Row label="Project ID" value={firebaseProjectId} />
            <Row
              label="Connection"
              value={
                <span className={connected ? 'text-green-400' : 'text-red-400'}>
                  {connected ? 'connected' : 'disconnected'}
                </span>
              }
            />
            <Row label="Last data update" value={lastUpdate} />
          </Section>

          <Section title="AGENT CONFIG">
            <div className="space-y-2">
              {agentsToShow.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 py-2 border-b border-office-border/50 last:border-b-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{a.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-pixel text-[7px] text-gray-300 truncate">{a.name}</div>
                      <div className="font-pixel text-[6px] text-gray-600 truncate">{a.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-pixel text-[6px] text-gray-400">{('primaryModel' in a ? a.primaryModel : a.model) || '—'}</div>
                    <div className={`font-pixel text-[6px] mt-1 ${a.status === 'active' ? 'text-green-400' : a.status === 'idle' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {a.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="DISPLAY">
            <Toggle
              checked={pixelFont}
              onChange={setPixelFont}
              label="Pixel font"
              description="When off, the UI uses system fonts (easier to read)."
            />

            <div className="py-2">
              <div className="font-pixel text-[7px] text-gray-300">Canvas quality</div>
              <div className="font-pixel text-[6px] text-gray-600 mt-1">Controls ambient particle count.</div>
              <div className="flex gap-2 mt-3">
                {(['low', 'medium', 'high'] as CanvasQuality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setCanvasQuality(q)}
                    className={`font-pixel text-[7px] px-3 py-2 rounded-lg border transition-colors ${
                      canvasQuality === q
                        ? 'bg-office-accent/20 text-office-accent border-office-accent/40'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-white/5 border-office-border'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="ABOUT">
            <Row label="Version" value={`v${OPENPAD_VERSION}`} />
            <div className="pt-2 space-y-2">
              <a
                className="font-pixel text-[7px] text-office-accent underline"
                href="https://openclaw.ai"
                target="_blank"
                rel="noreferrer"
              >
                OpenClaw docs
              </a>
              <div>
                <a
                  className="font-pixel text-[7px] text-office-accent underline"
                  href="https://discord.com/invite/openclaw"
                  target="_blank"
                  rel="noreferrer"
                >
                  Discord
                </a>
              </div>
              <div>
                <a
                  className="font-pixel text-[7px] text-office-accent underline"
                  href="https://github.com/openclaw"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </div>
            </div>
          </Section>

          <div className="lg:col-span-2">
            <Section title="DANGER ZONE">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={resetLayout}
                  className="font-pixel text-[7px] px-4 py-3 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10"
                >
                  Reset Layout
                </button>
                <button
                  type="button"
                  onClick={clearCommandHistory}
                  className="font-pixel text-[7px] px-4 py-3 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10"
                >
                  Clear Command History
                </button>
              </div>
              <div className="font-pixel text-[6px] text-gray-600 mt-3">
                These actions only affect your browser storage.
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  )
}
