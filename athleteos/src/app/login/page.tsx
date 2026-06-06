'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: `${location.origin}/auth/callback` },
      })
      if (error) setMessage({ type: 'error', text: error.message })
      else setMessage({ type: 'success', text: 'Vérifie ton email pour confirmer ton compte !' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ type: 'error', text: 'Email ou mot de passe incorrect.' })
      else window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg1)', padding: 20,
    }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,142,247,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#4f8ef7,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px' }}>⚡</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--txt1)', letterSpacing: '-0.5px' }}>
            Athlete<span style={{ color: 'var(--a1)' }}>OS</span>
          </h1>
          <p style={{ color: 'var(--txt2)', fontSize: 14, marginTop: 6 }}>Ton cockpit de performance sportive</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 20, padding: '32px 36px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setMessage(null) }} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: mode === m ? 'var(--bg4)' : 'transparent',
                color: mode === m ? 'var(--txt1)' : 'var(--txt2)',
                fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: mode === m ? 500 : 400,
                transition: 'all .15s',
              }}>
                {m === 'login' ? 'Connexion' : 'Créer un compte'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Prénom & Nom</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Alex Romain" required
                  style={{ width: '100%', padding: '11px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--txt1)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="alex@email.com" required
                style={{ width: '100%', padding: '11px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--txt1)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                style={{ width: '100%', padding: '11px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--txt1)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
            </div>

            {message && (
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13, background: message.type === 'error' ? 'rgba(244,63,94,0.12)' : 'rgba(34,211,160,0.12)', color: message.type === 'error' ? 'var(--a5)' : 'var(--a3)', border: `1px solid ${message.type === 'error' ? 'rgba(244,63,94,0.25)' : 'rgba(34,211,160,0.25)'}` }}>
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,var(--a1),var(--a2))', color: '#fff',
              fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              transition: 'opacity .15s',
            }}>
              {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--txt3)', marginTop: 20 }}>
          Tes données sont chiffrées et sécurisées 🔒
        </p>
      </div>
    </div>
  )
}
