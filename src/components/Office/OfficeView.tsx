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

// ===== Animation System =====

const WALK_SPEED = 0.13
const EVENT_MIN = 8000
const EVENT_MAX = 15000

const wcSpots = [{ x: 0.07, y: 0.80 }, { x: 0.03, y: 0.80 }]
const coffeeSpot = { x: 0.15, y: 0.82 }
const mSeats = [
  { x: 0.39, y: 0.41 }, { x: 0.57, y: 0.41 },
  { x: 0.39, y: 0.56 }, { x: 0.57, y: 0.56 },
]

const sTxt = [
  'Hæ!','Flott!','LGTM!','Ship it!','Deploy?',
  'Nice!','PR ready?','Standup!','Bless!','Takk!',
  'Wow!','Já!','Hmm...','Roger!','Sæll!',
]
const tTxt = [
  'hmm...','kaffi...','bug?','refactor?',
  '...','API...','tests...','design...','perf...',
]
const mTxt = [
  'Q2 goals?','Ship it!','KPIs...','Roadmap?',
  'Sprint!','Backlog','MVP!','Demo time!','OKRs?',
]

interface AnimS {
  state: 'at_desk' | 'walking' | 'at_location'
  x: number; y: number
  fromX: number; fromY: number
  toX: number; toY: number
  walkStart: number; walkDur: number
  faceR: boolean; retHome: boolean
  act: 'none'|'wc'|'coffee'|'meeting'|'visit'
  arrTime: number; stayDur: number
  partner: string | null
}

interface Sched {
  lastEvt: number; nextDel: number
  states: Record<string, AnimS>
}

function mkAnim(x: number, y: number): AnimS {
  return {
    state:'at_desk', x, y,
    fromX:x, fromY:y, toX:x, toY:y,
    walkStart:0, walkDur:0,
    faceR:true, retHome:false,
    act:'none', arrTime:0, stayDur:0,
    partner:null,
  }
}

function goWalk(a: AnimS, tx: number, ty: number, t: number, ret: boolean) {
  const dx = tx - a.x, dy = ty - a.y
  const dist = Math.sqrt(dx*dx + dy*dy)
  a.state = 'walking'
  a.fromX = a.x; a.fromY = a.y
  a.toX = tx; a.toY = ty
  a.walkStart = t
  a.walkDur = Math.max(1200, (dist / WALK_SPEED) * 1000)
  a.faceR = dx >= 0
  a.retHome = ret
}

function ease(t: number) {
  return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2) / 2
}

function sHash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = ((h<<5)-h)+s.charCodeAt(i); h |= 0 }
  return Math.abs(h)
}

function pick<T>(a: T[], n: number): T[] {
  return [...a].sort(() => Math.random()-0.5).slice(0, n)
}

function rng(a: number, b: number) { return a + Math.random()*(b-a) }

// ===== Draw Helpers =====

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y)
  ctx.arcTo(x+w, y, x+w, y+r, r); ctx.lineTo(x+w, y+h-r)
  ctx.arcTo(x+w, y+h, x+w-r, y+h, r); ctx.lineTo(x+r, y+h)
  ctx.arcTo(x, y+h, x, y+h-r, r); ctx.lineTo(x, y+r)
  ctx.arcTo(x, y, x+r, y, r); ctx.closePath()
}

function h2r(hex: string): string {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function shade(c: string, a: number): string {
  let r = parseInt(c.slice(1,3),16)+a
  let g = parseInt(c.slice(3,5),16)+a
  let b = parseInt(c.slice(5,7),16)+a
  r = Math.max(0,Math.min(255,r))
  g = Math.max(0,Math.min(255,g))
  b = Math.max(0,Math.min(255,b))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

// ===== Scene Drawing =====

function drawFloor(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const s = 32
  for (let r = 0; r < H/s+1; r++)
    for (let c = 0; c < W/s+1; c++) {
      ctx.fillStyle = (r+c)%2===0 ? '#0d0d22' : '#111133'
      ctx.fillRect(c*s, r*s, s, s)
    }
  ctx.strokeStyle = 'rgba(60,60,120,0.15)'; ctx.lineWidth = 1
  for (let i = 0; i < W; i += s) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke() }
  for (let i = 0; i < H; i += s) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(W,i); ctx.stroke() }
}

function drawDesk(ctx: CanvasRenderingContext2D, cx: number, cy: number, agent: Agent, time: number, away: boolean) {
  const dw=72, dh=36
  px(ctx, cx-dw/2, cy, dw, dh, '#1a1a3a')
  px(ctx, cx-dw/2+2, cy+2, dw-4, dh-4, '#222250')
  const mw=28, mh=20, mx=cx-mw/2, my=cy-mh+4
  px(ctx, mx, my, mw, mh, '#0a0a18')
  px(ctx, mx+2, my+2, mw-4, mh-6, away ? '#0e1528' : '#1a2a4a')
  if (!away) {
    const fl = 0.7 + 0.3*Math.sin(time*0.003+cx)
    ctx.fillStyle = `rgba(${h2r(agent.color)}, ${0.15*fl})`
    ctx.fillRect(mx+2, my+2, mw-4, mh-6)
  } else {
    const p = 0.03 + 0.02*Math.sin(time*0.002)
    ctx.fillStyle = `rgba(${h2r(agent.color)}, ${p})`
    ctx.fillRect(mx+2, my+2, mw-4, mh-6)
  }
  px(ctx, cx-3, my+mh-2, 6, 4, '#333360')
  px(ctx, cx-12, cy+8, 24, 6, '#2a2a50')
  px(ctx, cx+dw/2-14, cy+4, 8, 8, agent.color+'60')
}

function drawTyping(ctx: CanvasRenderingContext2D, cx: number, cy: number, agent: Agent, time: number) {
  const h = sHash(agent.id)
  const t = (time + h*137) % 6000
  if (t > 3500) return
  const col = agent.color + '90'
  if (Math.sin(time*0.02+h*3) > 0.2) px(ctx, cx-8, cy+10, 2, 2, col)
  if (Math.sin(time*0.025+h*5) > 0.1) px(ctx, cx, cy+10, 2, 2, col)
  if (Math.sin(time*0.018+h*7) > 0.3) px(ctx, cx+6, cy+10, 2, 2, col)
}

function drawAgent(ctx: CanvasRenderingContext2D, cx: number, cy: number, agent: Agent, time: number) {
  const br = Math.sin(time*0.004+cx*0.01)*2
  const ay = cy - 30 + br
  const c = agent.color, dk = shade(c, -40)

  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath(); ctx.ellipse(cx, cy-2, 10, 4, 0, 0, Math.PI*2); ctx.fill()

  px(ctx, cx-8, ay, 16, 16, c)
  px(ctx, cx-6, ay+2, 12, 12, dk)
  px(ctx, cx-10, ay+4, 4, 8, c)
  px(ctx, cx+6, ay+4, 4, 8, c)

  const hy = ay - 12
  px(ctx, cx-6, hy, 12, 12, agent.isHuman ? '#ffd5a0' : c)
  px(ctx, cx-3, hy+4, 2, 2, '#111')
  px(ctx, cx+1, hy+4, 2, 2, '#111')
  px(ctx, cx-2, hy+8, 4, 1, '#111')

  if (agent.isHuman) px(ctx, cx-7, hy-2, 14, 4, '#8B6914')
  else px(ctx, cx-7, hy-2, 14, 3, dk)

  const sc = agent.status==='active' ? '#00ff88' : agent.status==='idle' ? '#ffcc00' : '#ff4444'
  ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(cx+10, hy, 3, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = sc+'40'; ctx.beginPath(); ctx.arc(cx+10, hy, 6, 0, Math.PI*2); ctx.fill()

  ctx.font = '8px "Press Start 2P", monospace'
  ctx.textAlign = 'center'; ctx.fillStyle = c
  ctx.fillText(`${agent.emoji} ${agent.name}`, cx, ay-20)
  ctx.font = '6px "Press Start 2P", monospace'
  ctx.fillStyle = '#666688'
  ctx.fillText(agent.role, cx, ay-12)
}

function drawWalker(ctx: CanvasRenderingContext2D, cx: number, cy: number, agent: Agent, time: number, fR: boolean) {
  const wc = time * 0.008
  const bounce = Math.abs(Math.sin(wc)) * 3
  const ay = cy - 22 - bounce
  const c = agent.color, dk = shade(c, -40)

  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath(); ctx.ellipse(cx, cy, 8, 3, 0, 0, Math.PI*2); ctx.fill()

  const ls = Math.sin(wc)*4
  px(ctx, cx-4, ay+14+Math.max(0,ls), 4, 8, dk)
  px(ctx, cx, ay+14+Math.max(0,-ls), 4, 8, dk)

  px(ctx, cx-7, ay, 14, 14, c)
  px(ctx, cx-5, ay+2, 10, 10, dk)

  const as2 = Math.sin(wc)*3
  px(ctx, cx-9, ay+3+as2, 4, 7, c)
  px(ctx, cx+5, ay+3-as2, 4, 7, c)

  const hy = ay - 10
  px(ctx, cx-5, hy, 10, 10, agent.isHuman ? '#ffd5a0' : c)
  const eo = fR ? 1 : -1
  px(ctx, cx-2+eo, hy+3, 2, 2, '#111')
  px(ctx, cx+2+eo, hy+3, 2, 2, '#111')
  px(ctx, cx-1+eo, hy+7, 3, 1, '#111')

  if (agent.isHuman) px(ctx, cx-6, hy-2, 12, 3, '#8B6914')
  else px(ctx, cx-6, hy-2, 12, 3, dk)

  const sc = agent.status==='active' ? '#00ff88' : agent.status==='idle' ? '#ffcc00' : '#ff4444'
  ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(cx+8, hy, 2.5, 0, Math.PI*2); ctx.fill()

  ctx.font = '6px "Press Start 2P", monospace'
  ctx.textAlign = 'center'; ctx.fillStyle = c
  ctx.fillText(agent.name, cx, ay-14)

  const dp = time*0.01, da = 0.08+0.04*Math.sin(dp)
  const dx2 = fR ? cx-8 : cx+8
  ctx.fillStyle = `rgba(150,150,200,${da})`
  ctx.fillRect(dx2+Math.sin(dp*2)*2, cy-1, 3, 2)
  ctx.fillRect(dx2+Math.sin(dp*3+1)*3, cy-3, 2, 2)
}

function drawStander(ctx: CanvasRenderingContext2D, cx: number, cy: number, agent: Agent, time: number) {
  const br = Math.sin(time*0.004+cx*0.01)*1.5
  const ay = cy - 22 + br
  const c = agent.color, dk = shade(c, -40)

  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath(); ctx.ellipse(cx, cy, 8, 3, 0, 0, Math.PI*2); ctx.fill()

  px(ctx, cx-4, ay+14, 4, 8, dk)
  px(ctx, cx, ay+14, 4, 8, dk)

  px(ctx, cx-7, ay, 14, 14, c)
  px(ctx, cx-5, ay+2, 10, 10, dk)
  px(ctx, cx-9, ay+3, 4, 7, c)
  px(ctx, cx+5, ay+3, 4, 7, c)

  const hy = ay - 10
  px(ctx, cx-5, hy, 10, 10, agent.isHuman ? '#ffd5a0' : c)
  px(ctx, cx-2, hy+3, 2, 2, '#111')
  px(ctx, cx+2, hy+3, 2, 2, '#111')
  px(ctx, cx-1, hy+7, 3, 1, '#111')

  if (agent.isHuman) px(ctx, cx-6, hy-2, 12, 3, '#8B6914')
  else px(ctx, cx-6, hy-2, 12, 3, dk)

  const sc = agent.status==='active' ? '#00ff88' : agent.status==='idle' ? '#ffcc00' : '#ff4444'
  ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(cx+8, hy, 2.5, 0, Math.PI*2); ctx.fill()

  ctx.font = '6px "Press Start 2P", monospace'
  ctx.textAlign = 'center'; ctx.fillStyle = c
  ctx.fillText(agent.name, cx, ay-14)
}

function drawSpeech(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha
  ctx.font = '6px "Press Start 2P", monospace'
  const tw = ctx.measureText(text).width
  const pad=8, bw=tw+pad*2, bh=18, bx=x-bw/2, by=y-52-bh

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.strokeStyle = '#444466'; ctx.lineWidth = 1.5
  rr(ctx, bx, by, bw, bh, 5); ctx.fill(); ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.beginPath()
  ctx.moveTo(x-4, by+bh); ctx.lineTo(x+4, by+bh); ctx.lineTo(x, by+bh+7)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#444466'; ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x-4, by+bh); ctx.lineTo(x, by+bh+7); ctx.lineTo(x+4, by+bh)
  ctx.stroke()

  ctx.fillStyle = '#222233'; ctx.textAlign = 'center'
  ctx.fillText(text, x, by+12)
  ctx.restore()
}

function drawThought(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha
  ctx.font = '6px "Press Start 2P", monospace'
  const tw = ctx.measureText(text).width
  const pad=8, bw=tw+pad*2, bh=18, bx=x-bw/2, by=y-58-bh

  ctx.fillStyle = 'rgba(220,220,255,0.85)'
  ctx.strokeStyle = '#666688'; ctx.lineWidth = 1
  rr(ctx, bx, by, bw, bh, 7); ctx.fill(); ctx.stroke()

  ctx.fillStyle = 'rgba(220,220,255,0.85)'; ctx.strokeStyle = '#666688'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(x-3, by+bh+5, 3.5, 0, Math.PI*2); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.arc(x+1, by+bh+12, 2.5, 0, Math.PI*2); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.arc(x+3, by+bh+17, 1.5, 0, Math.PI*2); ctx.fill(); ctx.stroke()

  ctx.fillStyle = '#444455'; ctx.textAlign = 'center'
  ctx.fillText(text, x, by+12)
  ctx.restore()
}

function drawMTable(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cx=meetingTable.x*W, cy=meetingTable.y*H
  const rw=meetingTable.w*W/2, rh=meetingTable.h*H/2
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath(); ctx.ellipse(cx, cy+4, rw+2, rh+2, 0, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = '#1f1f42'
  ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = '#333366'; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = 'rgba(100,100,200,0.05)'
  ctx.beginPath(); ctx.ellipse(cx, cy-3, rw-6, rh-4, 0, 0, Math.PI*2); ctx.fill()
  ctx.font = '6px "Press Start 2P", monospace'
  ctx.fillStyle = '#444466'; ctx.textAlign = 'center'
  ctx.fillText('MEETING TABLE', cx, cy+3)
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const sw = Math.sin(time*0.002+x*10)*1.5
  px(ctx, x-6, y, 12, 10, '#664422'); px(ctx, x-4, y+2, 8, 6, '#553311')
  ctx.fillStyle = '#22aa44'
  ctx.fillRect(x-4+sw, y-10, 3, 10); ctx.fillRect(x+1+sw, y-12, 3, 12)
  ctx.fillRect(x-7+sw, y-6, 3, 6)
  ctx.fillStyle = '#33cc55'
  ctx.fillRect(x-2+sw, y-14, 4, 4); ctx.fillRect(x+2+sw, y-8, 4, 4)
}

function drawWC(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x-8, y-30, 16, 30, '#aabbcc')
  px(ctx, x-6, y-28, 12, 12, '#88ccff')
  px(ctx, x-10, y-6, 20, 6, '#8899aa')
  ctx.font = '5px "Press Start 2P", monospace'
  ctx.fillStyle = '#445566'; ctx.textAlign = 'center'
  ctx.fillText('WATER', x, y+10)
}

function drawSR(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  px(ctx, x-14, y-40, 28, 40, '#1a1a2e')
  px(ctx, x-12, y-38, 24, 36, '#0f0f22')
  for (let i = 0; i < 5; i++) {
    const on = Math.sin(time*0.005+i*1.5) > 0
    ctx.fillStyle = on ? '#00ff88' : '#003322'; ctx.fillRect(x-8, y-34+i*7, 4, 3)
    ctx.fillStyle = on ? '#ff4444' : '#330011'; ctx.fillRect(x+2, y-34+i*7, 4, 3)
  }
  ctx.font = '5px "Press Start 2P", monospace'
  ctx.fillStyle = '#334455'; ctx.textAlign = 'center'
  ctx.fillText('SERVERS', x, y+10)
}

function drawCM(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  px(ctx, x-10, y-20, 20, 20, '#2a2a3a')
  px(ctx, x-8, y-16, 16, 10, '#1a1a28')
  const st = Math.sin(time*0.006)*2
  ctx.fillStyle = 'rgba(200,200,255,0.15)'
  ctx.fillRect(x-2+st, y-26, 3, 6); ctx.fillRect(x+1-st, y-30, 2, 4)
  ctx.font = '5px "Press Start 2P", monospace'
  ctx.fillStyle = '#445566'; ctx.textAlign = 'center'
  ctx.fillText('COFFEE', x, y+10)
}

function drawParticles(ctx: CanvasRenderingContext2D, W: number, H: number, time: number, count: number) {
  for (let i = 0; i < count; i++) {
    const ppx = (Math.sin(time*0.001+i*7.3)*0.5+0.5)*W
    const ppy = (Math.cos(time*0.0008+i*4.1)*0.5+0.5)*H
    const a = 0.03+0.03*Math.sin(time*0.003+i)
    ctx.fillStyle = `rgba(120,120,240,${a})`
    ctx.fillRect(ppx, ppy, 2, 2)
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const g = ctx.createLinearGradient(0,0,0,60)
  g.addColorStop(0,'#16163a'); g.addColorStop(1,'transparent')
  ctx.fillStyle = g; ctx.fillRect(0,0,W,60)
  const g2 = ctx.createLinearGradient(0,0,40,0)
  g2.addColorStop(0,'#12122a'); g2.addColorStop(1,'transparent')
  ctx.fillStyle = g2; ctx.fillRect(0,0,40,H)
  px(ctx, W*0.3, 4, 80, 36, '#0a0a20')
  px(ctx, W*0.3+2, 6, 76, 32, '#0e1530')
  ctx.fillStyle = 'rgba(100,120,200,0.03)'
  ctx.beginPath()
  ctx.moveTo(W*0.3,40); ctx.lineTo(W*0.3+80,40)
  ctx.lineTo(W*0.3+140,H*0.5); ctx.lineTo(W*0.3-60,H*0.5); ctx.fill()
  px(ctx, W*0.65, 4, 80, 36, '#0a0a20')
  px(ctx, W*0.65+2, 6, 76, 32, '#0e1530')
  ctx.font = '10px "Press Start 2P", monospace'
  ctx.fillStyle = '#222244'; ctx.textAlign = 'center'
  ctx.fillText('⚡ OPENCLAW HQ ⚡', W/2, 28)
}

// ===== Anim Logic =====

function schedEvt(sc: Sched, ids: string[], pos: Record<string,{x:number;y:number}>, t: number) {
  const avail = ids.filter(id => sc.states[id]?.state === 'at_desk')
  if (avail.length < 2) return

  const r = Math.random()
  if (r < 0.28) {
    const ch = pick(avail, 2)
    for (let i = 0; i < ch.length; i++) {
      const a = sc.states[ch[i]]
      a.act = 'wc'; a.stayDur = rng(5000,8000); a.partner = ch[1-i]
      goWalk(a, wcSpots[i].x, wcSpots[i].y, t, false)
    }
  } else if (r < 0.48) {
    const ch = pick(avail, 1)
    const a = sc.states[ch[0]]
    a.act = 'coffee'; a.stayDur = rng(4000,6000); a.partner = null
    goWalk(a, coffeeSpot.x, coffeeSpot.y, t, false)
  } else if (r < 0.75) {
    const n = Math.min(avail.length, 2+Math.floor(Math.random()*3))
    const ch = pick(avail, n)
    for (let i = 0; i < ch.length; i++) {
      const a = sc.states[ch[i]]
      a.act = 'meeting'; a.stayDur = rng(8000,13000); a.partner = ch[(i+1)%ch.length]
      goWalk(a, mSeats[i%mSeats.length].x, mSeats[i%mSeats.length].y, t, false)
    }
  } else {
    const ch = pick(avail, 2)
    const hp = pos[ch[1]] || deskPositions[ch[1]]
    if (!hp) return
    const vx = hp.x + (hp.x > 0.5 ? -0.06 : 0.06)
    const a = sc.states[ch[0]]
    a.act = 'visit'; a.stayDur = rng(4000,7000); a.partner = ch[1]
    goWalk(a, vx, hp.y+0.02, t, false)
  }
}

function updateAnims(sc: Sched, pos: Record<string,{x:number;y:number}>, t: number) {
  for (const [id, a] of Object.entries(sc.states)) {
    if (a.state === 'walking') {
      const el = t - a.walkStart
      const pr = Math.min(1, el / a.walkDur)
      const e = ease(pr)
      a.x = a.fromX + (a.toX - a.fromX)*e
      a.y = a.fromY + (a.toY - a.fromY)*e
      if (pr >= 1) {
        a.x = a.toX; a.y = a.toY
        if (a.retHome) {
          const hp = pos[id] || deskPositions[id]
          a.state = 'at_desk'
          a.x = hp?.x ?? a.x; a.y = hp?.y ?? a.y
          a.act = 'none'; a.partner = null
        } else {
          a.state = 'at_location'; a.arrTime = t
        }
      }
    } else if (a.state === 'at_location') {
      if (t - a.arrTime > a.stayDur) {
        const hp = pos[id] || deskPositions[id]
        if (hp) goWalk(a, hp.x, hp.y, t, true)
        else { a.state = 'at_desk'; a.act = 'none' }
      }
    }
  }
}

function bubbleAlpha(since: number, hash: number, cyc: number): {a:number;i:number}|null {
  const ph = hash % 2000
  const ct = (since + ph) % cyc
  if (ct > cyc*0.6 || since < 600) return null
  const fi = Math.min(1, ct/300)
  const pk = cyc*0.5
  const fo = ct > pk ? Math.max(0, 1-(ct-pk)/400) : 1
  const a = fi * fo
  if (a < 0.02) return null
  return { a, i: Math.floor((since+hash)/cyc) }
}

function deskBubble(t: number, hash: number): {a:number;i:number}|null {
  const cyc = 14000
  const ct = (t + hash*137) % cyc
  if (ct < 10000 || ct > 13000) return null
  const lt = ct - 10000
  const fi = Math.min(1, lt/400)
  const fo = lt > 2500 ? Math.max(0, 1-(lt-2500)/500) : 1
  const a = fi*fo
  if (a < 0.02) return null
  return { a, i: Math.floor((t+hash)/cyc) }
}

// ===== Component =====

export default function OfficeView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const particleCountRef = useRef<number>(30)
  const { agents: liveAgents } = useLiveAgents()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const POSITIONS_KEY = 'openpad.office.agentPositions.v1'
  const schedRef = useRef<Sched | null>(null)

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
    try { localStorage.setItem(POSITIONS_KEY, JSON.stringify(agentPositions)) } catch {}
  }, [agentPositions])

  useEffect(() => {
    const readQ = () => {
      try {
        const q = localStorage.getItem('openpad:display:canvasQuality')
        if (q === 'low') particleCountRef.current = 10
        else if (q === 'high') particleCountRef.current = 60
        else particleCountRef.current = 30
      } catch { particleCountRef.current = 30 }
    }
    readQ()
    window.addEventListener('openpad:display-settings', readQ)
    return () => window.removeEventListener('openpad:display-settings', readQ)
  }, [])

  const mergedAgents = agents.map(a => {
    const live = liveAgents.find(la => la.id === a.id)
    return live ? { ...a, status: live.status, currentTask: live.currentTask } : a
  })

  const drawGlow = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number, agent: Agent, time: number) => {
    if (agent.status === 'offline') return
    const rgb = h2r(agent.color)
    const isA = agent.status === 'active'
    const spd = isA ? 0.008 : 0.0025
    const pulse = (Math.sin(time*spd+cx*0.01)+1)/2
    const cY = cy - 30
    const baseR = isA ? 42 : 32
    const r2 = baseR + pulse*(isA ? 12 : 6)
    const aI = (isA ? 0.35 : 0.14) + pulse*(isA ? 0.15 : 0.06)
    const gr = ctx.createRadialGradient(cx, cY, 0, cx, cY, r2)
    gr.addColorStop(0, 'rgba('+rgb+', '+aI+')')
    gr.addColorStop(0.55, 'rgba('+rgb+', '+(aI*0.45)+')')
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gr
    ctx.beginPath(); ctx.arc(cx, cY, r2, 0, Math.PI*2); ctx.fill()
  }, [])

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height

    // Init scheduler
    if (!schedRef.current) {
      const st: Record<string, AnimS> = {}
      for (const ag of mergedAgents) {
        const p = agentPositions[ag.id] || deskPositions[ag.id]
        if (p) st[ag.id] = mkAnim(p.x, p.y)
      }
      schedRef.current = { lastEvt: time+3000, nextDel: rng(EVENT_MIN, EVENT_MAX), states: st }
    }
    const sc = schedRef.current

    // Ensure all agents have state
    for (const ag of mergedAgents) {
      if (!sc.states[ag.id]) {
        const p = agentPositions[ag.id] || deskPositions[ag.id]
        if (p) sc.states[ag.id] = mkAnim(p.x, p.y)
      }
    }

    updateAnims(sc, agentPositions, time)

    // Schedule events
    if (time - sc.lastEvt > sc.nextDel) {
      schedEvt(sc, mergedAgents.map(a => a.id), agentPositions, time)
      sc.lastEvt = time
      sc.nextDel = rng(EVENT_MIN, EVENT_MAX)
    }

    ctx.clearRect(0, 0, W, H)
    drawFloor(ctx, W, H)
    drawParticles(ctx, W, H, time, 30)
    drawWalls(ctx, W, H)

    // Furniture
    drawMTable(ctx, W, H)
    plants.forEach(p => drawPlant(ctx, p.x*W, p.y*H, time))
    drawWC(ctx, watercooler.x*W, watercooler.y*H)
    drawSR(ctx, serverRack.x*W, serverRack.y*H, time)
    drawCM(ctx, W*0.12, H*0.85, time)

    // Desks (always at desk position)
    mergedAgents.forEach(ag => {
      const p = agentPositions[ag.id] || deskPositions[ag.id]
      if (!p) return
      const anim = sc.states[ag.id]
      const away = anim ? anim.state !== 'at_desk' : false
      drawDesk(ctx, p.x*W, p.y*H, ag, time, away)
    })

    // Agents at desk
    mergedAgents.forEach(ag => {
      const p = agentPositions[ag.id] || deskPositions[ag.id]
      if (!p) return
      const anim = sc.states[ag.id]
      if (anim && anim.state !== 'at_desk') return

      const dx = p.x*W, dy = p.y*H
      drawGlow(ctx, dx, dy, ag, time)
      drawAgent(ctx, dx, dy, ag, time)
      drawTyping(ctx, dx, dy, ag, time)

      const h = sHash(ag.id)
      const tb = deskBubble(time, h)
      if (tb) {
        drawThought(ctx, dx, dy-30, tTxt[tb.i % tTxt.length], tb.a)
      }
    })

    // Walking / standing agents
    mergedAgents.forEach(ag => {
      const anim = sc.states[ag.id]
      if (!anim || anim.state === 'at_desk') return
      const ppx = anim.x*W, ppy = anim.y*H

      if (anim.state === 'walking') {
        drawWalker(ctx, ppx, ppy, ag, time, anim.faceR)
      } else if (anim.state === 'at_location') {
        drawStander(ctx, ppx, ppy, ag, time)

        const h = sHash(ag.id)
        const since = time - anim.arrTime

        if (anim.act === 'coffee') {
          const b = bubbleAlpha(since, h, 5000)
          if (b) drawThought(ctx, ppx, ppy-22, tTxt[b.i % tTxt.length], b.a)
        } else if (anim.act === 'wc' || anim.act === 'visit') {
          const b = bubbleAlpha(since, h, 3500)
          if (b) drawSpeech(ctx, ppx, ppy-22, sTxt[b.i % sTxt.length], b.a)
        } else if (anim.act === 'meeting') {
          const b = bubbleAlpha(since, h, 4000)
          if (b) drawSpeech(ctx, ppx, ppy-22, mTxt[b.i % mTxt.length], b.a)
        }
      }
    })

    // Vignette
    const vig = ctx.createRadialGradient(W/2, H/2, W*0.25, W/2, H/2, W*0.7)
    vig.addColorStop(0, 'transparent')
    vig.addColorStop(1, 'rgba(0,0,0,0.5)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, W, H)

    animRef.current = requestAnimationFrame(draw)
  }, [agentPositions, drawGlow, mergedAgents])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
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
      canvas.width = rect.width
      canvas.height = rect.height
    }

    resize()
    window.addEventListener('resize', resize)
    animRef.current = requestAnimationFrame(draw)

    const mPos = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX-r.left, y: e.clientY-r.top, W: r.width, H: r.height }
    }
    const tPos = (e: TouchEvent) => {
      const r = canvas.getBoundingClientRect()
      const t2 = e.touches[0] || e.changedTouches[0]
      return { x: t2.clientX-r.left, y: t2.clientY-r.top, W: r.width, H: r.height }
    }

    const hitTest = (cx: number, cy: number, W: number, H: number): Agent | null => {
      // Check walking/standing agents first
      if (schedRef.current) {
        for (const ag of mergedAgents) {
          const an = schedRef.current.states[ag.id]
          if (!an || an.state === 'at_desk') continue
          if (Math.abs(cx - an.x*W) < 30 && Math.abs(cy - an.y*H + 20) < 30) return ag
        }
      }
      for (const ag of mergedAgents) {
        const p = agentPositions[ag.id] || deskPositions[ag.id]
        if (!p) continue
        if (Math.abs(cx - p.x*W) < 40 && Math.abs(cy - p.y*H + 30) < 40) return ag
      }
      return null
    }

    const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
    const dragRef: { id: string|null; sx: number; sy: number; sp: {x:number;y:number}|null; moved: boolean } =
      { id: null, sx: 0, sy: 0, sp: null, moved: false }
    const DRAG_T = 6

    let onMM: ((e: MouseEvent)=>void)|null = null
    let onMU: ((e: MouseEvent)=>void)|null = null
    let onTM: ((e: TouchEvent)=>void)|null = null
    let onTE: ((e: TouchEvent)=>void)|null = null

    const beginDrag = (aid: string, x: number, y: number, W: number, H: number) => {
      const pos = agentPositions[aid] || deskPositions[aid]
      if (!pos) return

      // Cancel animation if agent is away
      if (schedRef.current) {
        const an = schedRef.current.states[aid]
        if (an && an.state !== 'at_desk') {
          an.state = 'at_desk'; an.x = pos.x; an.y = pos.y
          an.act = 'none'; an.partner = null
        }
      }

      dragRef.id = aid; dragRef.sx = x; dragRef.sy = y
      dragRef.sp = { ...pos }; dragRef.moved = false
      setSelectedAgent(null)

      const upDrag = (nx: number, ny: number) => {
        if (!dragRef.id || !dragRef.sp) return
        const ddx = nx-dragRef.sx, ddy = ny-dragRef.sy
        if (!dragRef.moved && Math.hypot(ddx,ddy) > DRAG_T) dragRef.moved = true
        const nx2 = clamp01(dragRef.sp.x + ddx/W)
        const ny2 = clamp01(dragRef.sp.y + ddy/H)
        setAgentPositions((prev: Record<string, { x: number; y: number }>) => ({ ...prev, [dragRef.id as string]: { x: nx2, y: ny2 } }))
        if (schedRef.current) {
          const an = schedRef.current.states[dragRef.id as string]
          if (an && an.state === 'at_desk') { an.x = nx2; an.y = ny2 }
        }
      }

      const endDrag = () => {
        const wasMoved = dragRef.moved, rid = dragRef.id
        dragRef.id = null; dragRef.sp = null
        if (!wasMoved && rid) {
          setSelectedAgent(mergedAgents.find(a => a.id === rid) || null)
        }
        if (onMM) window.removeEventListener('mousemove', onMM)
        if (onMU) window.removeEventListener('mouseup', onMU)
        if (onTM) window.removeEventListener('touchmove', onTM)
        if (onTE) window.removeEventListener('touchend', onTE)
      }

      onMM = (e: MouseEvent) => { const p = mPos(e); upDrag(p.x, p.y) }
      onMU = () => endDrag()
      onTM = (e: TouchEvent) => { e.preventDefault(); const p = tPos(e); upDrag(p.x, p.y) }
      onTE = (e: TouchEvent) => { e.preventDefault(); endDrag() }

      window.addEventListener('mousemove', onMM)
      window.addEventListener('mouseup', onMU)
      window.addEventListener('touchmove', onTM, { passive: false })
      window.addEventListener('touchend', onTE, { passive: false })
    }

    const onMD = (e: MouseEvent) => {
      const p = mPos(e); const f = hitTest(p.x, p.y, p.W, p.H)
      if (!f) { setSelectedAgent(null); return }
      beginDrag(f.id, p.x, p.y, p.W, p.H)
    }
    const onTS = (e: TouchEvent) => {
      e.preventDefault()
      const p = tPos(e); const f = hitTest(p.x, p.y, p.W, p.H)
      if (!f) { setSelectedAgent(null); return }
      beginDrag(f.id, p.x, p.y, p.W, p.H)
    }

    canvas.addEventListener('mousedown', onMD)
    canvas.addEventListener('touchstart', onTS, { passive: false })

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousedown', onMD)
      canvas.removeEventListener('touchstart', onTS)
      if (onMM) window.removeEventListener('mousemove', onMM)
      if (onMU) window.removeEventListener('mouseup', onMU)
      if (onTM) window.removeEventListener('touchmove', onTM)
      if (onTE) window.removeEventListener('touchend', onTE)
      cancelAnimationFrame(animRef.current)
    }
  }, [agentPositions, draw, mergedAgents])

  const sLabel = (s: string) => s === 'active' ? '🟢 Active' : s === 'idle' ? '🟡 Idle' : '🔴 Offline'

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
                {sLabel(selectedAgent.status)} • {selectedAgent.model}
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
