'use client'
import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react'

// ── CARD ──────────────────────────────────────────────────
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', ...style }}>
      {children}
    </div>
  )
}

export function SmallCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', ...style }}>
      {children}
    </div>
  )
}

// ── CARD TITLE ────────────────────────────────────────────
export function CardTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--txt1)', marginBottom: 14 }}>{children}</div>
}

// ── PILL ──────────────────────────────────────────────────
export function Pill({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: color + '20', color, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

// ── BUTTON ────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', style, type = 'button', disabled }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'outline' | 'ghost'
  style?: CSSProperties; type?: 'button' | 'submit'; disabled?: boolean
}) {
  const base: CSSProperties = {
    padding: '10px 18px', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none',
    transition: 'opacity .15s', opacity: disabled ? 0.6 : 1,
    minHeight: 42, // touch-friendly
    ...style
  }
  const variants: Record<string, CSSProperties> = {
    primary: { background: 'var(--a1)', color: '#fff' },
    outline: { background: 'var(--bg3)', color: 'var(--txt1)', border: '1px solid var(--border2)' },
    ghost:   { background: 'transparent', color: 'var(--txt2)' },
  }
  return <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>
}

// ── INPUT ─────────────────────────────────────────────────
export function Input({ label, style: customStyle, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const style: CSSProperties = { width: '100%', padding: '11px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--txt1)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', ...customStyle }
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>{label}</label>}
      <input style={style} {...props} />
    </div>
  )
}

// ── SELECT ────────────────────────────────────────────────
export function Select({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: ReactNode }) {
  const style: CSSProperties = { width: '100%', padding: '11px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--txt1)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none' }
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>{label}</label>}
      <select style={style} {...props}>{children}</select>
    </div>
  )
}

// ── TEXTAREA ──────────────────────────────────────────────
export function Textarea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const style: CSSProperties = { width: '100%', padding: '11px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--txt1)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', minHeight: 80, resize: 'vertical' }
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>{label}</label>}
      <textarea style={style} {...props} />
    </div>
  )
}

// ── RANGE ─────────────────────────────────────────────────
export function Range({ label, value, onChange, min = 1, max = 10 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--txt2)', marginBottom: 6 }}>
        <span>{label}</span><span style={{ color: 'var(--a1)', fontWeight: 600 }}>{value}/{max}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(+e.target.value)} style={{ width: '100%' }} />
    </div>
  )
}

// ── PROGRESS BAR ──────────────────────────────────────────
export function ProgressBar({ value, color, height = 4 }: { value: number; color: string; height?: number }) {
  return (
    <div style={{ height, background: 'var(--bg4)', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: height / 2, transition: 'width .5s' }} />
    </div>
  )
}

// ── MODAL — fully responsive ───────────────────────────────
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    // Prevent body scroll when modal open
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="modal-overlay"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        ref={ref}
        className="modal-content"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 20, padding: '24px 24px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', animation: 'fadeUp .15s ease' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--txt1)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt3)', fontSize: 20, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, minHeight: 'auto' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── MODAL ACTIONS ─────────────────────────────────────────
export function ModalActions({ onCancel, onConfirm, confirmLabel = 'Enregistrer', loading }: { onCancel: () => void; onConfirm?: () => void; confirmLabel?: string; loading?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
      <Btn variant="outline" onClick={onCancel}>Annuler</Btn>
      <Btn type={onConfirm ? 'button' : 'submit'} onClick={onConfirm} disabled={loading}>
        {loading ? '…' : confirmLabel}
      </Btn>
    </div>
  )
}

// ── TOPBAR — responsive ────────────────────────────────────
export function Topbar({ title, subtitle, action }: { title: string; subtitle?: string; action?: { label: string; fn: () => void } }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 0', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--txt1)', letterSpacing: '-0.5px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--txt2)', fontSize: 12, marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action && (
        <button onClick={action.fn} style={{ padding: '9px 16px', borderRadius: 10, background: 'var(--a1)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
          ➕ {action.label}
        </button>
      )}
    </div>
  )
}

// ── HEATMAP ───────────────────────────────────────────────
export function Heatmap({ sessions }: { sessions: { date: string }[] }) {
  const weeks = 26 // 6 months on mobile
  const opacities = [0, 0.18, 0.45, 0.7, 1]
  const today = new Date()
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (weeks * 7 - 1 - i))
    const ds = d.toISOString().slice(0, 10)
    const count = sessions.filter(s => s.date === ds).length
    const v = Math.min(4, count)
    return { v, ds }
  })
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks}, 1fr)`, gap: 2 }}>
        {cells.map((c, i) => (
          <div key={i} title={c.ds} style={{
            aspectRatio: '1', borderRadius: 2,
            background: c.v === 0 ? 'rgba(255,255,255,0.05)' : 'var(--a1)',
            opacity: opacities[c.v],
          }} />
        ))}
      </div>
    </div>
  )
}

// ── MINI BAR CHART ────────────────────────────────────────
export function MiniBarChart({ data, color = 'var(--a1)', height = 80 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(...data.map(d => d.value)) || 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ width: '100%', background: color, borderRadius: '3px 3px 0 0', height: `${(d.value / max) * 100}%`, opacity: i === data.length - 1 ? 1 : 0.5 }} />
          <span style={{ fontSize: 9, color: 'var(--txt3)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── RADIAL SCORE ──────────────────────────────────────────
export function RadialScore({ score, size = 110, color = 'var(--a1)' }: { score: number; size?: number; color?: string }) {
  const r = 42; const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: size > 100 ? 24 : 18, color: 'var(--txt1)', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color: 'var(--txt3)' }}>/100</span>
      </div>
    </div>
  )
}
