import { useState, useEffect, useCallback } from 'react'

const CORRECT_PIN = '8303'
const SESSION_KEY = 'openpad_unlocked'

export function useAuth() {
  const [unlocked, setUnlocked] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === 'true'
  })

  const unlock = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, 'true')
    setUnlocked(true)
  }, [])

  return { unlocked, unlock }
}

export default function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const addDigit = useCallback((d: string) => {
    setError(false)
    setPin(prev => {
      if (prev.length >= 4) return prev
      const next = prev + d
      if (next.length === 4) {
        if (next === CORRECT_PIN) {
          setTimeout(onUnlock, 200)
        } else {
          setError(true)
          setShake(true)
          setTimeout(() => { setShake(false); setPin('') }, 600)
        }
      }
      return next
    })
  }, [onUnlock])

  const removeDigit = useCallback(() => {
    setError(false)
    setPin(prev => prev.slice(0, -1))
  }, [])

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') addDigit(e.key)
      else if (e.key === 'Backspace') removeDigit()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [addDigit, removeDigit])

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length)

  return (
    <div className="h-screen w-screen bg-office-bg flex flex-col items-center justify-center overflow-hidden">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-3">🖥️</div>
        <h1 className="font-pixel text-[12px] text-office-accent tracking-widest mb-2">OPENPAD</h1>
        <p className="font-pixel text-[6px] text-gray-600">Sláðu inn PIN</p>
      </div>

      {/* PIN dots */}
      <div className={`flex gap-4 mb-10 ${shake ? 'animate-shake' : ''}`}>
        {dots.map((filled, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              error
                ? 'border-red-500 bg-red-500/30'
                : filled
                  ? 'border-office-accent bg-office-accent shadow-[0_0_12px_rgba(123,104,238,0.5)]'
                  : 'border-gray-600 bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => {
          if (key === '') return <div key={i} />
          const isBackspace = key === '⌫'
          return (
            <button
              key={i}
              onClick={() => isBackspace ? removeDigit() : addDigit(key)}
              className={`w-16 h-16 rounded-2xl font-pixel text-[14px] transition-all duration-150 active:scale-90 ${
                isBackspace
                  ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  : 'text-gray-200 bg-white/[0.04] border border-office-border hover:bg-white/[0.08] hover:border-office-accent/30 active:bg-office-accent/20'
              }`}
            >
              {key}
            </button>
          )
        })}
      </div>

      {/* Error text */}
      <div className={`mt-6 font-pixel text-[6px] text-red-400 transition-opacity duration-300 ${error ? 'opacity-100' : 'opacity-0'}`}>
        Rangt PIN — reyndu aftur
      </div>
    </div>
  )
}
