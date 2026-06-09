'use client'
import { useState, useEffect } from 'react'
import type { Session, Sport, Goal } from '@/types'

interface Props {
  sessions: Session[]
  sports: Sport[]
  goals: Goal[]
  onNav: (page: string) => void
}

export default function DailyRecommendation({ sessions, sports, goals, onNav }: Props) {
  const [rec, setRec]       = useState('')
  const [loading, setLoading] = useState(true)
  const [icon, setIcon]     = useState('💡')
  const [color, setColor]   = useState('var(--a1)')

  useEffect(() => { generateRec() }, [sessions.length])

  async function generateRec() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const thisWeek = sessions.filter(s => s.date >= weekAgo)
    const lastSession = sessions[0]
    const lastDate = lastSession?.date || null
    const daysSinceLast = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : 99
    const sportCounts: Record<string, number> = {}
    sessions.slice(0, 20).forEach(s => { if (s.sport_id) sportCounts[s.sport_id] = (sportCounts[s.sport_id] || 0) + 1 })
    const leastUsed = sports.filter(s => !sportCounts[s.id]).map(s => s.label)
    const mostUsed  = sports.sort((a, b) => (sportCounts[b.id] || 0) - (sportCounts[a.id] || 0))[0]

    const context = `Tu es un coach sportif bienveillant et motivant.
Données de l'athlète aujourd'hui (${today}) :
- Séances cette semaine : ${thisWeek.length}
- Dernière séance : ${lastDate || 'jamais'} (il y a ${daysSinceLast} jours)
- Sport le plus pratiqué : ${mostUsed?.label || 'aucun'}
- Sports jamais ou peu pratiqués : ${leastUsed.join(', ') || 'aucun'}
- Objectifs actifs : ${goals.length}
- Séances totales : ${sessions.length}

Génère UNE seule recommandation/suggestion du jour en 1-2 phrases maximum. 
Sois très concret et spécifique (ex: "Fais 20 min de course légère ce soir" pas "Tu devrais faire du sport").
Varie les suggestions : récupération, nouveau sport, séance courte, rappel d'objectif, nutrition, sommeil, etc.
Commence directement par la suggestion, sans "Bonjour" ni introduction.
Réponds en français uniquement.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 150, messages: [{ role: 'user', content: context }] })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      setRec(text)
      // Pick icon/color based on content
      if (text.includes('repos') || text.includes('récup')) { setIcon('😴'); setColor('var(--a2)') }
      else if (text.includes('course') || text.includes('cardio')) { setIcon('🏃'); setColor('var(--a3)') }
      else if (text.includes('muscu') || text.includes('force')) { setIcon('🏋️'); setColor('var(--a1)') }
      else if (text.includes('tennis') || text.includes('padel')) { setIcon('🎾'); setColor('var(--a2)') }
      else if (text.includes('sommeil') || text.includes('nuit')) { setIcon('💤'); setColor('var(--a6)') }
      else if (text.includes('hydrat') || text.includes('eau')) { setIcon('💧'); setColor('var(--a6)') }
      else { setIcon('⚡'); setColor('var(--a1)') }
    } catch {
      setRec(daysSinceLast > 2 ? `Ça fait ${daysSinceLast} jours sans séance — même 20 minutes de marche rapide feront du bien !` : 'Continue comme ça, ta régularité est excellente ! 🔥')
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg4)', flexShrink: 0 }} />
      <div style={{ height: 14, background: 'var(--bg4)', borderRadius: 7, flex: 1 }} />
    </div>
  )

  return (
    <div style={{ background: `linear-gradient(135deg, ${color}15, var(--bg2))`, border: `1px solid ${color}30`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: color, fontWeight: 600, marginBottom: 4 }}>💡 Recommandation du jour</div>
        <div style={{ fontSize: 13, color: 'var(--txt1)', lineHeight: 1.6 }}>{rec}</div>
      </div>
      <button onClick={generateRec} title="Nouvelle suggestion" style={{ background: 'none', border: 'none', color: 'var(--txt3)', fontSize: 16, cursor: 'pointer', padding: 4, borderRadius: 6, flexShrink: 0 }}>🔄</button>
    </div>
  )
}
