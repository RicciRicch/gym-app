import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'

// Canvas confetti, no dependencies. 'big' is the PR celebration: cannons from
// both bottom corners, a burst behind the headline, a second volley and a
// shower from the top. 'small' is a single pair of cannons.

const COLORS = ['#c8ff2e', '#ffffff', '#ffd23f', '#ff7a1a', '#3ee6ff', '#ff4fa3']
const GRAVITY = 900
const DRAG = 3

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  shape: 0 | 1 | 2 // rectangle, circle, streamer
  color: string
  rot: number
  vr: number
  flip: number
  vflip: number
  sway: number
  swayF: number
  phase: number
  age: number
  ttl: number
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)

function particle(x: number, y: number, angle: number, speed: number): Particle {
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: rand(6, 12),
    shape: Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? 1 : 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: rand(0, Math.PI * 2),
    vr: rand(-8, 8),
    flip: rand(0, Math.PI * 2),
    vflip: rand(4, 12),
    sway: rand(20, 70),
    swayF: rand(2, 5),
    phase: rand(0, Math.PI * 2),
    age: 0,
    ttl: rand(2.6, 4.4),
  }
}

type Emit = (out: Particle[], w: number, h: number) => void

/** Fires `count` particles from a point in a cone around `angle` (radians, 0 = right, negative = up). */
const cannon =
  (fx: number, fy: number, angle: number, spread: number, count: number, min: number, max: number): Emit =>
  (out, w, h) => {
    for (let i = 0; i < count; i++) out.push(particle(fx * w, fy * h, angle + rand(-spread, spread), rand(min, max)))
  }

const burst =
  (fx: number, fy: number, count: number): Emit =>
  (out, w, h) => {
    for (let i = 0; i < count; i++) out.push(particle(fx * w, fy * h, rand(0, Math.PI * 2), rand(250, 1100)))
  }

const shower =
  (count: number): Emit =>
  (out, w) => {
    for (let i = 0; i < count; i++) out.push(particle(rand(0, w), rand(-40, -10), Math.PI / 2 + rand(-0.4, 0.4), rand(60, 260)))
  }

const UP_RIGHT = -Math.PI / 3
const UP_LEFT = (-2 * Math.PI) / 3

function timeline(power: 'big' | 'small'): { at: number; emit: Emit }[] {
  if (power === 'small') {
    return [
      { at: 0.1, emit: cannon(0, 0.8, UP_RIGHT, 0.35, 45, 1100, 2000) },
      { at: 0.1, emit: cannon(1, 0.8, UP_LEFT, 0.35, 45, 1100, 2000) },
    ]
  }
  const steps = [
    { at: 0.05, emit: cannon(0, 0.82, UP_RIGHT, 0.4, 100, 1300, 2500) },
    { at: 0.05, emit: cannon(1, 0.82, UP_LEFT, 0.4, 100, 1300, 2500) },
    { at: 0.35, emit: burst(0.5, 0.3, 130) },
    { at: 0.9, emit: cannon(0, 0.6, UP_RIGHT, 0.5, 70, 1100, 2100) },
    { at: 0.9, emit: cannon(1, 0.6, UP_LEFT, 0.5, 70, 1100, 2100) },
    { at: 1.7, emit: burst(0.5, 0.3, 80) },
  ]
  for (let t = 0.5; t < 3.6; t += 0.12) steps.push({ at: t, emit: shower(7) })
  return steps.sort((a, b) => a.at - b.at)
}

export function Confetti({ power = 'big' }: { power?: 'big' | 'small' }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || prefersReducedMotion()) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const steps = timeline(power)
    let particles: Particle[] = []
    let next = 0
    let raf = 0
    const start = performance.now()
    let last = start

    const frame = (now: number) => {
      const t = (now - start) / 1000
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      while (next < steps.length && steps[next].at <= t) steps[next++].emit(particles, w, h)

      ctx.clearRect(0, 0, w, h)
      const slow = Math.exp(-DRAG * dt)
      for (const p of particles) {
        p.age += dt
        p.vx *= slow
        p.vy = p.vy * slow + GRAVITY * dt
        p.x += (p.vx + Math.sin(p.age * p.swayF + p.phase) * p.sway) * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        p.flip += p.vflip * dt

        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, (p.ttl - p.age) / 0.6))
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.scale(1, Math.cos(p.flip))
        ctx.fillStyle = p.color
        if (p.shape === 1) {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 2) {
          ctx.fillRect(-p.size * 0.2, -p.size * 1.2, p.size * 0.4, p.size * 2.4)
        } else {
          ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7)
        }
        ctx.restore()
      }
      particles = particles.filter((p) => p.age < p.ttl && p.y < h + 60)

      if (next < steps.length || particles.length > 0) raf = requestAnimationFrame(frame)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [power])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] size-full" />
}
