import { useRef, useEffect, useCallback, useState } from 'react'
import { agents, Agent } from '../../data/agents'
import { useLiveAgents } from '../../hooks/useOpenClaw'
import AgentCommandPanel from './AgentCommandPanel'

// Office layout positions for each agent's desk
const deskPositions: Record<string, { x: number; y: number }> = {
  arnar:   { x: 0.12, y: 0.18 },
  blaer:   { x: 0.50, y: 0.22 },
  frost:   { x: 0.82, y: 0.18 },
  regn:    { x: 0.18, y: 0.55 },
  ylur:    { x: 0.72, y: 0.55 },
  stormur: { x: 0.88, y: 0.48 },
  dogg:    { x: 0.30, y: 0.72 },
  udi:     { x: 0.58, y: 0.72 },
}

// Furniture
const meetingTable = { x: 0.48, y: 0.48, w: 0.18, h: 0.12 }
const watercooler = { x: 0.05, y: 0.85 }
const plants = [
  { x: 0.02, y: 0.12 }, { x: 0.96, y: 0.12 }, { x: 0.02, y: 0.88 },
  { x: 0.96, y: 0.85 }, { x: 0.42, y: 0.08 },
]
const serverRack = { x: 0.92, y: 0.88 }

function drawPixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

function drawCheckerFloor(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const size = 32
  for (let row = 0; row < H / size + 1; row++) {
    for (let col = 0; col < W / size + 1; col++) {
      const dark = (row + col) % 2 === 0
      ctx.fillStyle = dark ? '#0d0d22' : '#111133'
      ctx.fillRect(col * size, row * size, size, size)
    }
  }
  // subtle grid lines
  ctx.strokeStyle = 'rgba(60,60,120,0.15)'
  ctx.lineWidth = 1
  for (let i = 0; i < W; i += size) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke()
  }
  for (let i = 0; i < H; i += size) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke()
  }
}

function drawDesk(ctx: CanvasRenderingContext2D, cx: number, cy: number, agent: Agent, time: number) {
  const dw = 72, dh = 36
  // desk surface
  drawPixelRect(ctx, cx - dw / 2, cy, dw, dh, '#1a1a3a')
  drawPixelRect(ctx, cx - dw / 2 + 2, cy + 2, dw - 4, dh - 4, '#222250')
  // monitor
  const mw = 28, mh = 20
  const mx = cx - mw / 2, my = cy - mh + 4
  drawPixelRect(ctx, mx, my, mw, mh, '#0a0a18')
  drawPixelRect(ctx, mx + 2, my + 2, mw - 4, mh - 6, '#1a2a4a')
  // screen glow
  const screenFlicker = 0.7 + 0.3 * Math.sin(time * 0.003 + cx)
  ctx.fillStyle = `rgba(${hexToRgb(agent.color)}, ${0.15 * screenFlicker})`
  ctx.fillRect(mx + 2, my + 2, mw - 4, mh - 6)
  // monitor stand
  drawPixelRect(ctx, cx - 3, my + mh - 2, 6, 4, '#333360')
  // keyboard
  drawPixelRect(ctx, cx - 12, cy + 8, 24, 6, '#2a2a50')
  // small colored accent on desk
  drawPixelRect(ctx, cx + dw / 2 - 14, cy + 4, 8, 8, agent.color + '60')
}

function drawAgent(ctx: CanvasRenderingContext2D, cx: number, cy: number, agent: Agent, time: number) {
  const breathe = Math.sin(time * 0.004 + cx * 0.01) * 2
  const ay = cy - 30 + breathe

  const c = agent.color
  const darker = shadeColor(c, -40)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(cx, cy - 2, 10, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // Body (pixel style)
  drawPixelRect(ctx, cx - 8, ay, 16, 16, c)
  drawPixelRect(ctx, cx - 6, ay + 2, 12, 12, darker)
  // shoulders
  drawPixelRect(ctx, cx - 10, ay + 4, 4, 8, c)
  drawPixelRect(ctx, cx + 6, ay + 4, 4, 8, c)

  // Head
  const headY = ay - 12
  drawPixelRect(ctx, cx - 6, headY, 12, 12, agent.isHuman ? '#ffd5a0' : c)
  // eyes
  drawPixelRect(ctx, cx - 3, headY + 4, 2, 2, '#111')
  drawPixelRect(ctx, cx + 1, headY + 4, 2, 2, '#111')
  // mouth
  drawPixelRect(ctx, cx - 2, headY + 8, 4, 1, '#111')

  // Hair / top accent
  if (agent.isHuman) {
    drawPixelRect(ctx, cx - 7, headY - 2, 14, 4, '#8B6914')
  } else {
    drawPixelRect(ctx, cx - 7, headY - 2, 14, 3, darker)
  }

  // Status dot
  const statusColor = agent.status === 'active' ? '#00ff88' : agent.status === 'idle' ? '#ffcc00' : '#ff4444'
  ctx.fillStyle = statusColor
  ctx.beginPath()
  ctx.arc(cx + 10, headY, 3, 0, Math.PI * 2)
  ctx.fill()
  // dot glow
  ctx.fillStyle = statusColor + '40'
  ctx.beginPath()
  ctx.arc(cx + 10, headY, 6, 0, Math.PI * 2)
  ctx.fill()

  // Name label
  ctx.font = '8px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = c
  ctx.fillText(`${agent.emoji} ${agent.name}`, cx, ay - 20)

  // Role
  ctx.font = '6px "Press Start 2P", monospace'
  ctx.fillStyle = '#666688'
  ctx.fillText(agent.role, cx, ay - 12)
}

function drawMeetingTable(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cx = meetingTable.x * W, cy = meetingTable.y * H
  const rw = meetingTable.w * W / 2, rh = meetingTable.h * H / 2
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 4, rw + 2, rh + 2, 0, 0, Math.PI * 2)
  ctx.fill()
  // table
  ctx.fillStyle = '#1f1f42'
  ctx.beginPath()
  ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#333366'
  ctx.lineWidth = 2
  ctx.stroke()
  // surface highlight
  ctx.fillStyle = 'rgba(100,100,200,0.05)'
  ctx.beginPath()
  ctx.ellipse(cx, cy - 3, rw - 6, rh - 4, 0, 0, Math.PI * 2)
  ctx.fill()
  // label
  ctx.font = '6px "Press Start 2P", monospace'
  ctx.fillStyle = '#444466'
  ctx.textAlign = 'center'
  ctx.fillText('MEETING TABLE', cx, cy + 3)
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const sway = Math.sin(time * 0.002 + x * 10) * 1.5
  // pot
  drawPixelRect(ctx, x - 6, y, 12, 10, '#664422')
  drawPixelRect(ctx, x - 4, y + 2, 8, 6, '#553311')
  // leaves
  ctx.fillStyle = '#22aa44'
  ctx.fillRect(x - 4 + sway, y - 10, 3, 10)
  ctx.fillRect(x + 1 + sway, y - 12, 3, 12)
  ctx.fillRect(x - 7 + sway, y - 6, 3, 6)
  ctx.fillStyle = '#33cc55'
  ctx.fillRect(x - 2 + sway, y - 14, 4, 4)
  ctx.fillRect(x + 2 + sway, y - 8, 4, 4)
}

function drawWatercooler(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawPixelRect(ctx, x - 8, y - 30, 16, 30, '#aabbcc')
  drawPixelRect(ctx, x - 6, y - 28, 12, 12, '#88ccff')
  drawPixelRect(ctx, x - 10, y - 6, 20, 6, '#8899aa')
  ctx.font = '5px "Press Start 2P", monospace'
  ctx.fillStyle = '#445566'
  ctx.textAlign = 'center'
  ctx.fillText('WATER', x, y + 10)
}

function drawServerRack(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  drawPixelRect(ctx, x - 14, y - 40, 28, 40, '#1a1a2e')
  drawPixelRect(ctx, x - 12, y - 38, 24, 36, '#0f0f22')
  // blinking lights
  for (let i = 0; i < 5; i++) {
    const on = Math.sin(time * 0.005 + i * 1.5) > 0
    ctx.fillStyle = on ? '#00ff88' : '#003322'
    ctx.fillRect(x - 8, y - 34 + i * 7, 4, 3)
    ctx.fillStyle = on ? '#ff4444' : '#330011'
    ctx.fillRect(x + 2, y - 34 + i * 7, 4, 3)
  }
  ctx.font = '5px "Press Start 2P", monospace'
  ctx.fillStyle = '#334455'
  ctx.textAlign = 'center'
  ctx.fillText('SERVERS', x, y + 10)
}

function drawCoffeeMachine(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  drawPixelRect(ctx, x - 10, y - 20, 20, 20, '#2a2a3a')
  drawPixelRect(ctx, x - 8, y - 16, 16, 10, '#1a1a28')
  // steam
  const steam = Math.sin(time * 0.006) * 2
  ctx.fillStyle = 'rgba(200,200,255,0.15)'
  ctx.fillRect(x - 2 + steam, y - 26, 3, 6)
  ctx.fillRect(x + 1 - steam, y - 30, 2, 4)
  ctx.font = '5px "Press Start 2P", monospace'
  ctx.fillStyle = '#445566'
  ctx.textAlign = 'center'
  ctx.fillText('COFFEE', x, y + 10)
}

function drawAmbientParticles(ctx: CanvasRenderingContext2D, W: number, H: number, time: number, count: number) {
  for (let i = 0; i < count; i++) {
    const px = (Math.sin(time * 0.001 + i * 7.3) * 0.5 + 0.5) * W
    const py = (Math.cos(time * 0.0008 + i * 4.1) * 0.5 + 0.5) * H
    const alpha = 0.03 + 0.03 * Math.sin(time * 0.003 + i)
    ctx.fillStyle = `rgba(120, 120, 240, ${alpha})`
    ctx.fillRect(px, py, 2, 2)
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // top wall
  const grad = ctx.createLinearGradient(0, 0, 0, 60)
  grad.addColorStop(0, '#16163a')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, 60)
  // left wall
  const grad2 = ctx.createLinearGradient(0, 0, 40, 0)
  grad2.addColorStop(0, '#12122a')
  grad2.addColorStop(1, 'transparent')
  ctx.fillStyle = grad2
  ctx.fillRect(0, 0, 40, H)
  // window on top wall
  drawPixelRect(ctx, W * 0.3, 4, 80, 36, '#0a0a20')
  drawPixelRect(ctx, W * 0.3 + 2, 6, 76, 32, '#0e1530')
  // moonlight from window
  ctx.fillStyle = 'rgba(100,120,200,0.03)'
  ctx.beginPath()
  ctx.moveTo(W * 0.3, 40)
  ctx.lineTo(W * 0.3 + 80, 40)
  ctx.lineTo(W * 0.3 + 140, H * 0.5)
  ctx.lineTo(W * 0.3 - 60, H * 0.5)
  ctx.fill()
  // second window
  drawPixelRect(ctx, W * 0.65, 4, 80, 36, '#0a0a20')
  drawPixelRect(ctx, W * 0.65 + 2, 6, 76, 32, '#0e1530')
  // OpenClaw logo on wall
  ctx.font = '10px "Press Start 2P", monospace'
  ctx.fillStyle = '#222244'
  ctx.textAlign = 'center'
  ctx.fillText('⚡ OPENCLAW HQ ⚡', W / 2, 28)
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function shadeColor(color: string, amount: number): string {
  let r = parseInt(color.slice(1, 3), 16) + amount
  let g = parseInt(color.slice(3, 5), 16) + amount
  let b = parseInt(color.slice(5, 7), 16) + amount
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export default function OfficeView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const particleCountRef = useRef<number>(30)
  const { agents: liveAgents } = useLiveAgents()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const POSITIONS_KEY = 'openpad.office.agentPositions.v1'

  // Persisted + draggable positions (normalized 0..1)
  const [agentPositions, setAgentPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const raw = localStorage.getItem(POSITIONS_KEY)
      if (!raw) return deskPositions
      const parsed = JSON.parse(raw) as unknown
      if (!parsed || typeof parsed !== 'object') return deskPositions

      const out: Record<string, { x: number; y: number }> = { ...deskPositions }
      for (const [id, v] of Object.entries(parsed as Record<string, any>)) {
        if (!v || typeof v !== 'object') continue
        const x = Number((v as any).x)
        const y = Number((v as any).y)
        if (Number.isFinite(x) && Number.isFinite(y)) {
          out[id] = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
        }
      }
      return out
    } catch {
      return deskPositions
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(POSITIONS_KEY, JSON.stringify(agentPositions))
    } catch {
      // ignore
    }
  }, [agentPositions])

  // Display setting: canvas quality (ambient particle count)
  useEffect(() => {
    const readQuality = () => {
      try {
        const q = localStorage.getItem('openpad:display:canvasQuality')
        if (q === 'low') particleCountRef.current = 10
        else if (q === 'high') particleCountRef.current = 60
        else particleCountRef.current = 30
      } catch {
        particleCountRef.current = 30
      }
    }

    readQuality()
    window.addEventListener('openpad:display-settings', readQuality)
    return () => window.removeEventListener('openpad:display-settings', readQuality)
  }, [])

  // Merge live status into static agents for rendering
  const mergedAgents = agents.map(a => {
    const live = liveAgents.find(la => la.id === a.id)
    return live ? { ...a, status: live.status, currentTask: live.currentTask } : a
  })

  const drawAgentGlow = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number, agent: Agent, time: number) => {
    if (agent.status === 'offline') return

    const rgb = hexToRgb(agent.color)
    const isActive = agent.status === 'active'
    const speed = isActive ? 0.008 : 0.0025
    const pulse = (Math.sin(time * speed + cx * 0.01) + 1) / 2

    const centerY = cy - 30
    const baseR = isActive ? 42 : 32
    const r = baseR + pulse * (isActive ? 12 : 6)

    const alphaInner = (isActive ? 0.35 : 0.14) + pulse * (isActive ? 0.15 : 0.06)

    const grad = ctx.createRadialGradient(cx, centerY, 0, cx, centerY, r)
    grad.addColorStop(0, 'rgba(' + rgb + ', ' + alphaInner + ')')
    grad.addColorStop(0.55, 'rgba(' + rgb + ', ' + (alphaInner * 0.45) + ')')
    grad.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, centerY, r, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    // Clear
    ctx.clearRect(0, 0, W, H)

    // Floor
    drawCheckerFloor(ctx, W, H)

    // Ambient particles
    drawAmbientParticles(ctx, W, H, time, 30)

    // Walls
    drawWalls(ctx, W, H)

    // Furniture
    drawMeetingTable(ctx, W, H)
    plants.forEach((p) => drawPlant(ctx, p.x * W, p.y * H, time))
    drawWatercooler(ctx, watercooler.x * W, watercooler.y * H)
    drawServerRack(ctx, serverRack.x * W, serverRack.y * H, time)
    drawCoffeeMachine(ctx, W * 0.12, H * 0.85, time)

    // Desks and agents
    mergedAgents.forEach((agent) => {
      const pos = agentPositions[agent.id] || deskPositions[agent.id]
      if (!pos) return
      const dx = pos.x * W, dy = pos.y * H
      drawDesk(ctx, dx, dy, agent, time)
      drawAgentGlow(ctx, dx, dy, agent, time)
      drawAgent(ctx, dx, dy, agent, time)
    })

    // Vignette
    const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.7)
    vignette.addColorStop(0, 'transparent')
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, W, H)

    animRef.current = requestAnimationFrame(draw)
  }, [agentPositions, drawAgentGlow, mergedAgents])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Prevent touch scrolling while dragging on iPad
    canvas.style.touchAction = 'none'

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      // Reset canvas dimensions for drawing (logical)
      canvas.width = rect.width
      canvas.height = rect.height
    }

    resize()
    window.addEventListener('resize', resize)
    animRef.current = requestAnimationFrame(draw)

    const getCanvasPointFromMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, W: rect.width, H: rect.height }
    }

    const getCanvasPointFromTouch = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const t = e.touches[0] || e.changedTouches[0]
      return { x: t.clientX - rect.left, y: t.clientY - rect.top, W: rect.width, H: rect.height }
    }

    const hitTestAgent = (cx: number, cy: number, W: number, H: number): Agent | null => {
      for (const agent of mergedAgents) {
        const pos = agentPositions[agent.id] || deskPositions[agent.id]
        if (!pos) continue
        const ax = pos.x * W
        const ay = pos.y * H - 30
        if (Math.abs(cx - ax) < 40 && Math.abs(cy - ay) < 40) {
          return agent
        }
      }
      return null
    }

    const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

    const dragRef: {
      draggingId: string | null
      startX: number
      startY: number
      startPos: { x: number; y: number } | null
      moved: boolean
    } = { draggingId: null, startX: 0, startY: 0, startPos: null, moved: false }

    const DRAG_THRESHOLD = 6

    let onMouseMove: ((e: MouseEvent) => void) | null = null
    let onMouseUp: ((e: MouseEvent) => void) | null = null
    let onTouchMove: ((e: TouchEvent) => void) | null = null
    let onTouchEnd: ((e: TouchEvent) => void) | null = null

    const beginDrag = (agentId: string, x: number, y: number, W: number, H: number) => {
      const pos = agentPositions[agentId] || deskPositions[agentId]
      if (!pos) return
      dragRef.draggingId = agentId
      dragRef.startX = x
      dragRef.startY = y
      dragRef.startPos = { ...pos }
      dragRef.moved = false

      // If you start dragging something else, hide previous selection until drop/click resolves
      setSelectedAgent(null)

      const updateDrag = (nx: number, ny: number) => {
        if (!dragRef.draggingId || !dragRef.startPos) return
        const dx = nx - dragRef.startX
        const dy = ny - dragRef.startY
        if (!dragRef.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) dragRef.moved = true

        const nextX = clamp01(dragRef.startPos.x + dx / W)
        const nextY = clamp01(dragRef.startPos.y + dy / H)

        setAgentPositions(prev => ({ ...prev, [dragRef.draggingId as string]: { x: nextX, y: nextY } }))
      }

      const endDrag = () => {
        const wasMoved = dragRef.moved
        const releasedId = dragRef.draggingId
        dragRef.draggingId = null
        dragRef.startPos = null

        if (!wasMoved && releasedId) {
          // Treat as click
          const clicked = mergedAgents.find(a => a.id === releasedId) || null
          setSelectedAgent(clicked)
        }

        if (onMouseMove) window.removeEventListener('mousemove', onMouseMove)
        if (onMouseUp) window.removeEventListener('mouseup', onMouseUp)
        if (onTouchMove) window.removeEventListener('touchmove', onTouchMove)
        if (onTouchEnd) window.removeEventListener('touchend', onTouchEnd)
      }

      onMouseMove = (e: MouseEvent) => {
        const p = getCanvasPointFromMouse(e)
        updateDrag(p.x, p.y)
      }

      onMouseUp = () => {
        endDrag()
      }

      onTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        const p = getCanvasPointFromTouch(e)
        updateDrag(p.x, p.y)
      }

      onTouchEnd = (e: TouchEvent) => {
        e.preventDefault()
        endDrag()
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', onTouchEnd, { passive: false })
    }

    const handleMouseDown = (e: MouseEvent) => {
      const p = getCanvasPointFromMouse(e)
      const found = hitTestAgent(p.x, p.y, p.W, p.H)
      if (!found) {
        setSelectedAgent(null)
        return
      }
      beginDrag(found.id, p.x, p.y, p.W, p.H)
    }

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const p = getCanvasPointFromTouch(e)
      const found = hitTestAgent(p.x, p.y, p.W, p.H)
      if (!found) {
        setSelectedAgent(null)
        return
      }
      beginDrag(found.id, p.x, p.y, p.W, p.H)
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('touchstart', handleTouchStart)
      if (onMouseMove) window.removeEventListener('mousemove', onMouseMove)
      if (onMouseUp) window.removeEventListener('mouseup', onMouseUp)
      if (onTouchMove) window.removeEventListener('touchmove', onTouchMove)
      if (onTouchEnd) window.removeEventListener('touchend', onTouchEnd)
      cancelAnimationFrame(animRef.current)
    }
  }, [agentPositions, draw, mergedAgents])

  const statusLabel = (s: string) => s === 'active' ? '🟢 Active' : s === 'idle' ? '🟡 Idle' : '🔴 Offline'

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full" />
      {selectedAgent && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-4 rounded-xl border animate-slide-up backdrop-blur-sm cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, ' + selectedAgent.color + '15, rgba(17,17,40,0.95))',
            borderColor: selectedAgent.color + '40',
            boxShadow: '0 0 30px ' + selectedAgent.color + '20',
          }}
          onClick={() => setSelectedAgent(null)}
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl">{selectedAgent.emoji}</span>
            <div>
              <div className="font-pixel text-[11px]" style={{ color: selectedAgent.color }}>
                {selectedAgent.name} — {selectedAgent.role}
              </div>
              <div className="font-pixel text-[8px] text-gray-400 mt-1">
                {statusLabel(selectedAgent.status)} • {selectedAgent.model}
              </div>
              {selectedAgent.currentTask && (
                <div className="font-pixel text-[7px] text-gray-500 mt-1">
                  📋 {selectedAgent.currentTask}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
