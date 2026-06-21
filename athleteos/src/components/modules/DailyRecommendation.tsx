'use client'
import { useState, useEffect } from 'react'
import type { Sport, Session, Goal } from '@/types'

interface Props {
  sessions: Session[]
  sports: Sport[]
  goals: Goal[]
  onNav: (page: string) => void
}

export default function DailyRecommendation({ sessions, sports, goals, onNav }: Props) {
  const [recommendation, setRecommendation] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { generateRecommendation() }, [sessions.length])

  function generateRecommendation() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const lastSession = sessions[0]
    const daysSinceLastSession = lastSession ? Math.floor((Date.now() - new Date(lastSession.date).getTime()) / 86400000) : null

    let rec = ''
    if (sessions.length === 0) {
      rec = "Bienvenue ! Enregistre ta première séance pour commencer ton suivi de performance. 🚀"
    } else if (daysSinceLastSession !== null && daysSinceLastSession >= 5) {
      rec = `Ça fait ${daysSinceLastSession} jours sans séance — même 20 minutes de marche rapide feront du bien !`
    } else if (lastSession && (lastSession.fatigue || 0) >= 8) {
      rec = "Ta dernière séance affichait une fatigue élevée. Pense à prendre un jour de repos ou une séance de récupération active aujourd'hui."
    } else if (goals.filter(g => g.current < g.target).length > 0) {
      const g = goals.filter(g => g.current < g.target)[0]
      rec = `Tu progresses vers "${g.title}" — encore ${g.target - g.current} ${g.unit} pour l'atteindre. Continue !`
    } else {
      rec = "Belle régularité ! Continue sur cette lancée, ton corps te remerciera. 💪"
    }
    setRecommendation(rec)
    setLoading(false)
  }

  return (
    <div style={{ background: 'linear-gradient(135deg,rgba(79,142,247,.08),rgba(168,85,247,.05))', border: '1px solid rgba(79,142,247,.2)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>💡</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--a1)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Recommandation du jour</span>
        <button onClick={generateRecommendation} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--txt3)' }}>🔄</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
        <div style={{ fontSize: 13, color: 'var(--txt1)', lineHeight: 1.6 }}>
          {loading ? 'Analyse en cours…' : recommendation}
        </div>
      </div>
    </div>
  )
}
