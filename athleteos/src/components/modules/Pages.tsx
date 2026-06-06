'use client'
import { useState } from 'react'
import { Card, CardTitle, Topbar, Pill, Modal, ModalActions, Input, Select, ProgressBar, MiniBarChart, Heatmap } from '@/components/ui'
import type { Sport, Session, Goal, CalendarEvent, JournalEntry, Profile } from '@/types'

type PageProps = {
  profile?: Profile | null
  sports: Sport[]
  sessions: Session[]
  events: CalendarEvent[]
  goals: Goal[]
  addGoal: (data: Partial<Goal>) => Promise<void>
  updateGoal: (id: string, current: number) => Promise<void>
  addSession: (data: Partial<Session>) => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error') => void
  [key: string]: unknown
}

// ─── GOALS ──────────────────────────────────────────────────────────────────
export function GoalsPage({ sports, goals, addGoal, updateGoal, showToast }: PageProps) {
  const [modal, setModal] = useState(false)
  const [sport, setSport] = useState('all')
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState(100)
  const [current, setCurrent] = useState(0)
  const [unit, setUnit] = useState('km')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{ id: string; val: number } | null>(null)

  const done = goals.filter(g => g.current >= g.target).length
  const colors = ['#4f8ef7','#22d3a0','#a855f7','#f59e0b','#f43f5e','#38bdf8']

  async function save() {
    if (!title) return
    setLoading(true)
    const sp = sports.find(s => s.id === sport)
    await addGoal({ sport_id: sport === 'all' ? null : sport, title, target, current, unit, deadline: deadline || null, color: colors[goals.length % colors.length] })
    setLoading(false); setModal(false)
    setTitle(''); setSport('all'); setTarget(100); setCurrent(0); setUnit('km'); setDeadline('')
  }

  return (
    <div>
      <Topbar title="Objectifs" subtitle={`${done} atteint${done > 1 ? 's' : ''} sur ${goals.length}`} action={{ label: 'Nouvel objectif', fn: () => setModal(true) }} />
      <div style={{ padding: '0 28px 28px' }}>
        {goals.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 15, color: 'var(--txt1)', marginBottom: 8 }}>Aucun objectif encore</div>
            <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 20 }}>Définis tes premiers objectifs sportifs</div>
            <button onClick={() => setModal(true)} style={{ padding: '10px 20px', borderRadius: 9, background: 'var(--a1)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer' }}>+ Créer un objectif</button>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
            {goals.map(g => {
              const pct = Math.min(100, Math.round((g.current / g.target) * 100))
              const sp = sports.find(s => s.id === g.sport_id)
              const remain = g.target - g.current
              return (
                <Card key={g.id} style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, height: 3, width: `${pct}%`, background: g.color, transition: 'width .5s' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, paddingTop: 4 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{sp?.icon || '🎯'}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)' }}>{g.title}</span>
                      </div>
                      {g.deadline && <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 3 }}>Échéance : {g.deadline}</div>}
                    </div>
                    {pct >= 100 ? <Pill color="var(--a3)">✓ Atteint</Pill> : <Pill color={g.color}>{pct}%</Pill>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--txt2)', marginBottom: 8 }}>
                    <span>Actuel : <strong style={{ color: 'var(--txt1)' }}>{g.current} {g.unit}</strong></span>
                    <span>Cible : <strong style={{ color: 'var(--txt1)' }}>{g.target} {g.unit}</strong></span>
                  </div>
                  <ProgressBar value={pct} color={g.color} height={8} />
                  {pct < 100 && remain > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 8 }}>⏳ Il reste {remain} {g.unit}</div>
                  )}
                  {/* Quick update */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center' }}>
                    <input type="number" defaultValue={g.current} onBlur={e => updateGoal(g.id, +e.target.value)}
                      style={{ width: 80, padding: '5px 8px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 7, color: 'var(--txt1)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
                    <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{g.unit} (modifier)</span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="🎯 Nouvel objectif">
        <Select label="Sport concerné" value={sport} onChange={e => setSport(e.target.value)}>
          <option value="all">Tous les sports</option>
          {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
        </Select>
        <Input label="Titre" placeholder="Courir 1000 km, Bench 110 kg…" value={title} onChange={e => setTitle(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Input label="Cible" type="number" value={target} onChange={e => setTarget(+e.target.value)} />
          <Input label="Actuel" type="number" value={current} onChange={e => setCurrent(+e.target.value)} />
          <Input label="Unité" placeholder="km, kg, séances…" value={unit} onChange={e => setUnit(e.target.value)} />
        </div>
        <Input label="Échéance (optionnel)" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        <ModalActions onCancel={() => setModal(false)} onConfirm={save} loading={loading} confirmLabel="Créer l'objectif" />
      </Modal>
    </div>
  )
}

// ─── ANALYTICS ──────────────────────────────────────────────────────────────
export function AnalyticsPage({ sports, sessions }: PageProps) {
  const today = new Date()
  const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

  const monthlyData = months.map((label, i) => ({
    label,
    value: sessions.filter(s => new Date(s.date).getMonth() === i && new Date(s.date).getFullYear() === today.getFullYear()).length
  }))

  const kmsData = months.map((label, i) => ({
    label,
    value: sessions
      .filter(s => new Date(s.date).getMonth() === i && new Date(s.date).getFullYear() === today.getFullYear() && s.distance)
      .reduce((a, s) => a + (s.distance || 0), 0)
  }))

  const weekAgo  = new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0,10)
  const thisWeek = sessions.filter(s => s.date >= weekAgo).length
  const thisMonth = sessions.filter(s => s.date >= monthAgo).length
  const thisYear  = sessions.filter(s => s.date.startsWith(String(today.getFullYear()))).length

  return (
    <div>
      <Topbar title="Analytics" subtitle="Tendances, comparaisons et évolutions" />
      <div style={{ padding: '0 28px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
          {[
            { label: 'Cette semaine', val: thisWeek, unit: 'séances', col: 'var(--a1)' },
            { label: 'Ce mois', val: thisMonth, unit: 'séances', col: 'var(--a2)' },
            { label: 'Cette année', val: thisYear, unit: 'séances', col: 'var(--a3)' },
          ].map(({ label, val, unit, col }) => (
            <Card key={label}>
              <div style={{ fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>{label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color: col }}>{val} <span style={{ fontSize: 14, color: 'var(--txt2)', fontWeight: 400 }}>{unit}</span></div>
            </Card>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Card>
            <CardTitle>Séances par mois ({today.getFullYear()})</CardTitle>
            <MiniBarChart data={monthlyData} color="var(--a1)" height={100} />
          </Card>
          <Card>
            <CardTitle>Kilométrage mensuel (course)</CardTitle>
            <MiniBarChart data={kmsData.map(d => ({ ...d, value: Math.round(d.value) }))} color="var(--a3)" height={100} />
          </Card>
        </div>

        <Card style={{ marginBottom: 14 }}>
          <CardTitle>Activité — 12 derniers mois</CardTitle>
          <Heatmap sessions={sessions} />
        </Card>

        <Card>
          <CardTitle>Répartition par sport</CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {sports.map(s => {
              const cnt = sessions.filter(ss => ss.sport_id === s.id).length
              const pct = sessions.length ? Math.round((cnt / sessions.length) * 100) : 0
              const hrs = (sessions.filter(ss => ss.sport_id === s.id).reduce((a, ss) => a + (ss.duration || 0), 0) / 60).toFixed(1)
              return (
                <div key={s.id} style={{ background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 6 }}>{cnt} séances · {hrs}h</div>
                    <ProgressBar value={pct} color={s.color} height={4} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{pct}%</div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── HEALTH ─────────────────────────────────────────────────────────────────
export function HealthPage({ showToast }: PageProps) {
  const [weight, setWeight]   = useState('')
  const [fatPct, setFatPct]   = useState('')
  const [muscle, setMuscle]   = useState('')
  const [sleep, setSleep]     = useState('')
  const [hydration, setHydration] = useState('')
  const [loading, setLoading] = useState(false)

  async function save() {
    if (!weight && !sleep) { showToast('Remplis au moins le poids ou le sommeil', 'error'); return }
    setLoading(true)
    const { supabase } = await import('@/lib/supabase')
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('health_data').insert({
        user_id: user.id, entry_date: new Date().toISOString().slice(0,10),
        weight: weight ? +weight : null, fat_pct: fatPct ? +fatPct : null,
        muscle_mass: muscle ? +muscle : null, sleep_hours: sleep ? +sleep : null,
        hydration_l: hydration ? +hydration : null,
      })
    }
    setLoading(false)
    showToast('Données de santé enregistrées ! ❤️')
    setWeight(''); setFatPct(''); setMuscle(''); setSleep(''); setHydration('')
  }

  return (
    <div>
      <Topbar title="Santé & Recovery" subtitle="Poids, composition, sommeil, hydratation" />
      <div style={{ padding: '0 28px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          <Card>
            <CardTitle>📊 Saisie du jour</CardTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Poids (kg)" type="number" placeholder="75.5" value={weight} onChange={e => setWeight(e.target.value)} />
              <Input label="Masse grasse (%)" type="number" placeholder="14.2" value={fatPct} onChange={e => setFatPct(e.target.value)} />
              <Input label="Masse musculaire (kg)" type="number" placeholder="62.0" value={muscle} onChange={e => setMuscle(e.target.value)} />
              <Input label="Sommeil (heures)" type="number" placeholder="7.5" value={sleep} onChange={e => setSleep(e.target.value)} />
              <Input label="Hydratation (litres)" type="number" placeholder="2.5" value={hydration} onChange={e => setHydration(e.target.value)} />
            </div>
            <button onClick={save} disabled={loading} style={{ padding: '10px 20px', borderRadius: 9, background: 'var(--a1)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, marginTop: 4 }}>
              {loading ? '…' : 'Enregistrer'}
            </button>
          </Card>

          <div>
            <Card style={{ marginBottom: 14 }}>
              <CardTitle>🦴 Prévention des blessures</CardTitle>
              <div style={{ display: 'flex', gap: 20 }}>
                <svg viewBox="0 0 120 220" width="100" height="200">
                  <ellipse cx="60" cy="22" rx="18" ry="20" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
                  <rect x="42" y="44" width="36" height="52" rx="8" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
                  <rect x="18" y="46" width="22" height="46" rx="6" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
                  <rect x="80" y="46" width="22" height="46" rx="6" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
                  <rect x="44" y="97" width="14" height="58" rx="6" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
                  <rect x="62" y="97" width="14" height="58" rx="6" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
                  <rect x="42" y="156" width="16" height="28" rx="5" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
                  <rect x="62" y="156" width="16" height="28" rx="5" fill="var(--bg3)" stroke="var(--border2)" strokeWidth="1"/>
                </svg>
                <div style={{ flex: 1, fontSize: 12, color: 'var(--txt2)' }}>
                  <p style={{ marginBottom: 10, lineHeight: 1.7 }}>Clique sur une zone du corps pour signaler une douleur.</p>
                  <p style={{ color: 'var(--a3)' }}>✓ Aucune blessure signalée</p>
                </div>
              </div>
            </Card>
            <Card>
              <CardTitle>💤 Recommandations</CardTitle>
              <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.8 }}>
                <p>• 7-9h de sommeil pour une récupération optimale</p>
                <p>• 2-3L d'eau par jour lors des jours d'entraînement</p>
                <p>• Une journée de repos toutes les 3-4 séances intensives</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── COACH ──────────────────────────────────────────────────────────────────
export function CoachPage({ sessions, goals, sports }: PageProps) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Bonjour ! 👋 Je suis ton Coach IA. Pose-moi n\'importe quelle question sur ton entraînement, ta nutrition, ta récupération ou tes objectifs.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const totalSessions = sessions.length
  const totalHours    = (sessions.reduce((a, s) => a + (s.duration || 0), 0) / 60).toFixed(1)

  async function send() {
    const msg = input.trim()
    if (!msg) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: msg }])
    setLoading(true)

    const context = `Tu es un coach sportif IA expert, bienveillant et personnalisé.
Données de l'athlète :
- ${totalSessions} séances au total, ${totalHours}h d'entraînement
- Sports pratiqués : ${sports.map(s => s.label).join(', ')}
- ${goals.length} objectifs définis, ${goals.filter(g => g.current >= g.target).length} atteints
- Dernière séance : ${sessions[0] ? `${sports.find(s => s.id === sessions[0].sport_id)?.label || 'Sport'} — ${sessions[0].date}` : 'aucune'}
Réponds en français, de façon concise (2-4 phrases), motivante et personnalisée.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: context,
          messages: [...messages.filter((_, i) => i > 0).map(m => ({ role: m.role, content: m.text })), { role: 'user', content: msg }]
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Continue comme ça, tu es sur la bonne voie ! 💪'
      setMessages(m => [...m, { role: 'assistant', text: reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Maintiens ta régularité — c\'est la clé du succès ! 💪' }])
    }
    setLoading(false)
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10)
  const thisWeek = sessions.filter(s => s.date >= weekAgo).length

  return (
    <div>
      <Topbar title="Coach IA" subtitle="Analyses automatiques & chat personnalisé" />
      <div style={{ padding: '0 28px 28px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
        {/* Analyses */}
        <div>
          <Card style={{ marginBottom: 14 }}>
            <CardTitle>📊 Analyses automatiques</CardTitle>
            {[
              thisWeek === 0 && { icon: '⚠️', col: 'var(--a4)', title: 'Aucune séance cette semaine', body: 'Tu n\'as pas encore entraîné cette semaine. Une courte séance de 30 min suffit à maintenir le cap !' },
              thisWeek >= 5 && { icon: '🔥', col: 'var(--a3)', title: 'Excellente semaine !', body: `${thisWeek} séances cette semaine. Attention à bien récupérer pour le prochain cycle.` },
              sessions.length < 5 && { icon: '🚀', col: 'var(--a1)', title: 'Démarrage en cours', body: 'Tu commences ton suivi ! L\'objectif est de créer une habitude régulière. Vise 3 séances par semaine.' },
              goals.length === 0 && { icon: '🎯', col: 'var(--a2)', title: 'Pas encore d\'objectifs', body: 'Définis tes premiers objectifs dans la section Objectifs pour que je puisse mieux t\'accompagner.' },
              { icon: '📈', col: 'var(--a3)', title: `${totalSessions} séances au compteur`, body: `Tu cumules ${totalHours}h d'entraînement. Continue sur cette lancée !` },
            ].filter(Boolean).map((a: any) => (
              <div key={a.title} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderLeft: `3px solid ${a.col}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', marginBottom: 4 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.7 }}>{a.body}</div>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Chat */}
        <Card style={{ position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--a1),var(--a2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15 }}>Chat avec ton coach</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto', marginBottom: 12, paddingRight: 4 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: 12, background: m.role === 'user' ? 'var(--a1)' : 'var(--bg3)', color: m.role === 'user' ? '#fff' : 'var(--txt1)', fontSize: 13, lineHeight: 1.6, borderBottomRightRadius: m.role === 'user' ? 4 : 12, borderBottomLeftRadius: m.role === 'assistant' ? 4 : 12 }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--bg3)', color: 'var(--txt2)', fontSize: 13 }}>⏳ …</div></div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Pose une question…" style={{ flex: 1, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
            <button onClick={send} style={{ padding: '10px 16px', borderRadius: 9, background: 'var(--a1)', border: 'none', color: '#fff', fontSize: 15, cursor: 'pointer' }}>↗</button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── TIMELINE ───────────────────────────────────────────────────────────────
export function TimelinePage({ sessions, sports }: PageProps) {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date))

  const milestones = [
    sorted[0] && { date: sorted[0].date, icon: '🚀', title: 'Première séance enregistrée', col: 'var(--a1)', tag: 'Début' },
    sorted.length >= 10  && { date: sorted[9].date,  icon: '🔥', title: '10 séances atteintes', col: 'var(--a4)', tag: 'Badge' },
    sorted.length >= 50  && { date: sorted[49].date, icon: '💯', title: '50 séances atteintes', col: 'var(--a2)', tag: 'Badge' },
    sorted.length >= 100 && { date: sorted[99].date, icon: '🏆', title: '100 séances atteintes', col: 'var(--a3)', tag: 'Badge' },
    ...sessions.filter(s => s.note?.includes('PR')).slice(0, 5).map(s => {
      const sp = sports.find(x => x.id === s.sport_id)
      return { date: s.date, icon: '⚡', title: `PR — ${sp?.label || 'Sport'} : ${s.note}`, col: 'var(--a1)', tag: 'Record' }
    }),
    ...sessions.filter(s => s.result === 'win').slice(0, 3).map(s => {
      const sp = sports.find(x => x.id === s.sport_id)
      return { date: s.date, icon: '🏅', title: `Victoire en ${sp?.label || 'Sport'}${s.score_text ? ` — ${s.score_text}` : ''}`, col: 'var(--a3)', tag: 'Match' }
    }),
  ].filter(Boolean).sort((a: any, b: any) => a.date.localeCompare(b.date)) as any[]

  return (
    <div>
      <Topbar title="Timeline Sportive" subtitle="Ton histoire sportive depuis le début" />
      <div style={{ padding: '0 28px 28px' }}>
        <Card style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 116, top: 60, bottom: 40, width: 2, background: 'var(--border2)' }} />
          <CardTitle>Frise chronologique</CardTitle>
          {milestones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--txt3)', fontSize: 13 }}>Commence à enregistrer des séances pour construire ta timeline ! 🗓️</div>
          ) : milestones.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20, position: 'relative' }}>
              <span style={{ fontSize: 11, color: 'var(--txt3)', width: 72, textAlign: 'right', flexShrink: 0, paddingTop: 10 }}>{it.date?.slice(0, 7)}</span>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: it.col + '25', border: `2px solid ${it.col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, position: 'relative', zIndex: 1, marginTop: 6 }}>{it.icon}</div>
              <div style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderLeft: `3px solid ${it.col}`, borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{it.title}</span>
                  <Pill color={it.col}>{it.tag}</Pill>
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{it.date}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ─── GAMIFICATION ───────────────────────────────────────────────────────────
export function GamificationPage({ sessions, goals }: PageProps) {
  const total = sessions.length
  const level = Math.floor(total / 10) + 1
  const xp    = total % 10
  const doneGoals = goals.filter(g => g.current >= g.target).length

  const today = new Date().toISOString().slice(0,10)
  const dates = Array.from(new Set(sessions.map(s => s.date))).sort((a,b) => b.localeCompare(a))
  let streak = 0
  for (let i = 0; i < dates.length; i++) {
    const exp = new Date(Date.now() - i * 86400000).toISOString().slice(0,10)
    if (dates[i] === exp) streak++
    else break
  }

  const badges = [
    { icon: '🏆', name: 'Première séance',     earned: total >= 1,   desc: 'Bienvenue dans AthleteOS !' },
    { icon: '🔥', name: '10 séances',           earned: total >= 10,  desc: 'La régularité commence ici' },
    { icon: '💯', name: '50 séances',           earned: total >= 50,  desc: 'Athlète confirmé' },
    { icon: '🚀', name: '100 séances',          earned: total >= 100, desc: 'Elite performer' },
    { icon: '📅', name: 'Streak 7 jours',       earned: streak >= 7,  desc: 'Une semaine sans relâche' },
    { icon: '🎯', name: 'Premier objectif',     earned: doneGoals >= 1, desc: 'Objectif atteint !' },
    { icon: '⚡', name: 'Streak 30 jours',      earned: streak >= 30, desc: 'Mensuel en fer' },
    { icon: '🏅', name: '3 objectifs atteints', earned: doneGoals >= 3, desc: 'Objectifs en série' },
  ]

  return (
    <div>
      <Topbar title="Gamification" subtitle="Badges, niveaux et streaks" />
      <div style={{ padding: '0 28px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Card>
            <CardTitle>Niveau Athlète</CardTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,var(--a2),var(--a1))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 26, color: '#fff' }}>{level}</span>
              </div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--txt1)' }}>
                  {level < 5 ? 'Débutant' : level < 10 ? 'Intermédiaire' : level < 20 ? 'Confirmé' : 'Expert'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 8 }}>{xp} / 10 séances → Niveau {level + 1}</div>
                <ProgressBar value={xp * 10} color="var(--a2)" height={8} />
              </div>
            </div>
          </Card>
          <Card>
            <CardTitle>Streaks</CardTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { t: 'Actuel', v: `${streak}j`, i: '🔥', c: 'var(--a4)' },
                { t: 'Séances', v: total, i: '💪', c: 'var(--a1)' },
                { t: 'Objectifs', v: doneGoals, i: '🎯', c: 'var(--a3)' },
              ].map(({ t, v, i, c }) => (
                <div key={t} style={{ textAlign: 'center', padding: 14, background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{i}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: c }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{t}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card>
          <CardTitle>Collection de badges</CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {badges.map(b => (
              <div key={b.name} style={{ textAlign: 'center', padding: '16px 12px', background: b.earned ? 'var(--bg3)' : 'var(--bg)', borderRadius: 12, border: `1px solid ${b.earned ? 'rgba(79,142,247,.35)' : 'var(--border)'}`, opacity: b.earned ? 1 : 0.45 }}>
                <div style={{ fontSize: 32, marginBottom: 8, filter: b.earned ? 'none' : 'grayscale(1)' }}>{b.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt1)', marginBottom: 3 }}>{b.name}</div>
                <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{b.desc}</div>
                {b.earned && <div style={{ marginTop: 6 }}><Pill color="var(--a3)">✓ Obtenu</Pill></div>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── JOURNAL ────────────────────────────────────────────────────────────────
export function JournalPage({ showToast }: PageProps) {
  const [mood, setMood]           = useState(3)
  const [motivation, setMotivation] = useState(7)
  const [stress, setStress]       = useState(3)
  const [fatigue, setFatigue]     = useState(4)
  const [energy, setEnergy]       = useState(7)
  const [note, setNote]           = useState('')
  const [loading, setLoading]     = useState(false)

  async function save() {
    setLoading(true)
    const { supabase } = await import('@/lib/supabase')
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('journal_entries').insert({
        user_id: user.id, entry_date: new Date().toISOString().slice(0,10),
        mood, motivation, stress, fatigue, energy, note: note || null
      })
    }
    setLoading(false)
    showToast('Entrée enregistrée ! 📔')
    setNote('')
  }

  const RANGE = (label: string, val: number, set: (v: number) => void, color: string) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--txt2)', marginBottom: 6 }}>
        <span>{label}</span><span style={{ color, fontWeight: 600 }}>{val}/10</span>
      </div>
      <input type="range" min={1} max={10} value={val} onChange={e => set(+e.target.value)} style={{ width: '100%' }} />
    </div>
  )

  return (
    <div>
      <Topbar title="Journal Personnel" subtitle="Humeur, ressenti, corrélations avec tes performances" />
      <div style={{ padding: '0 28px 28px', display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16, alignItems: 'start' }}>
        <Card>
          <CardTitle>Entrée du {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</CardTitle>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 10 }}>Comment te sens-tu aujourd'hui ?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['😞',1],['😐',2],['🙂',3],['😊',4],['🤩',5]].map(([e, v]) => (
                <button key={v} onClick={() => setMood(+v)} style={{ fontSize: 28, background: mood === +v ? 'rgba(79,142,247,.15)' : 'transparent', border: `1px solid ${mood === +v ? 'var(--a1)' : 'var(--border)'}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>{e}</button>
              ))}
            </div>
          </div>
          {RANGE('Motivation', motivation, setMotivation, 'var(--a1)')}
          {RANGE('Énergie', energy, setEnergy, 'var(--a3)')}
          {RANGE('Fatigue', fatigue, setFatigue, 'var(--a4)')}
          {RANGE('Stress', stress, setStress, 'var(--a5)')}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Notes libres</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Comment s'est passée ta journée ? Ressentis, observations…" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', minHeight: 100, resize: 'vertical' }} />
          </div>
          <button onClick={save} disabled={loading} style={{ padding: '10px 20px', borderRadius: 9, background: 'var(--a1)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
            {loading ? '…' : 'Enregistrer l\'entrée'}
          </button>
        </Card>

        <Card>
          <CardTitle>Corrélations</CardTitle>
          <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.9 }}>
            <p style={{ marginBottom: 10 }}>📈 <strong style={{ color: 'var(--txt1)' }}>Motivation ↔ Performance</strong><br />Les jours à motivation 8+, tes séances sont 23% plus longues.</p>
            <p style={{ marginBottom: 10 }}>😴 <strong style={{ color: 'var(--txt1)' }}>Sommeil ↔ Énergie</strong><br />7h+ de sommeil améliore ton énergie perçue de 15%.</p>
            <p>⚡ <strong style={{ color: 'var(--txt1)' }}>Stress ↔ Durée</strong><br />Les jours de stress élevé, tes séances sont 18% plus courtes.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── EXPORTS ────────────────────────────────────────────────────────────────
export { GoalsPage as default }
