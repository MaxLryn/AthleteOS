'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle, Topbar, Pill, Btn, Modal, ModalActions, Input, Select, Textarea, ProgressBar, MiniBarChart } from '@/components/ui'
import type { Sport, Session, Goal, Profile } from '@/types'

// ════════════════════════════════════════════════════════════
// GOALS PAGE
// ════════════════════════════════════════════════════════════
interface GoalsProps { sports: Sport[]; goals: Goal[]; addGoal: (d: Partial<Goal>) => Promise<void>; updateGoal: (id: string, current: number) => Promise<void>; showToast: (m: string, t?: 'success'|'error') => void; [key: string]: unknown }

export function GoalsPage({ sports, goals, addGoal, updateGoal, showToast }: GoalsProps) {
  const [modal, setModal] = useState(false)
  const [sportId, setSportId] = useState('')
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState(10)
  const [unit, setUnit] = useState('séances')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title) return
    setSaving(true)
    await addGoal({ sport_id: sportId || null, title, target, current: 0, unit, deadline: deadline || null })
    setSaving(false); setModal(false); setTitle(''); setTarget(10); setDeadline('')
  }

  return (
    <div>
      <Topbar title="Objectifs" subtitle={`${goals.length} objectif${goals.length>1?'s':''} en cours`} action={{ label: 'Nouvel objectif', fn: () => setModal(true) }} />
      <div className="page-pad">
        {goals.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎯</div>
            <div style={{ fontSize: 14, color: 'var(--txt1)', marginBottom: 6 }}>Aucun objectif</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 16 }}>Fixe-toi un but pour rester motivé</div>
            <Btn onClick={() => setModal(true)}>+ Créer un objectif</Btn>
          </Card>
        ) : (
          <div className="goals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {goals.map(g => {
              const sp = sports.find(s => s.id === g.sport_id)
              const pct = Math.min(100, Math.round((g.current / g.target) * 100))
              const done = g.current >= g.target
              return (
                <Card key={g.id} style={{ border: done ? '1px solid rgba(34,211,160,.3)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>{sp?.icon || '🎯'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</div>
                      {g.deadline && <div style={{ fontSize: 10, color: 'var(--txt3)' }}>📅 {g.deadline}</div>}
                    </div>
                    {done && <Pill color="var(--a3)">✓</Pill>}
                  </div>
                  <ProgressBar value={pct} color={done ? 'var(--a3)' : 'var(--a1)'} height={6} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--txt2)' }}>
                    <span>{g.current} / {g.target} {g.unit}</span>
                    <span>{pct}%</span>
                  </div>
                  {!done && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button onClick={() => updateGoal(g.id, Math.max(0, g.current - 1))} style={{ flex: 1, padding: '6px', borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--txt2)', cursor: 'pointer', fontSize: 13 }}>−</button>
                      <button onClick={() => updateGoal(g.id, g.current + 1)} style={{ flex: 1, padding: '6px', borderRadius: 7, border: '1px solid var(--a1)', background: 'rgba(79,142,247,.1)', color: 'var(--a1)', cursor: 'pointer', fontSize: 13 }}>+</button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="🎯 Nouvel objectif">
        <Select label="Sport (optionnel)" value={sportId} onChange={e => setSportId(e.target.value)}>
          <option value="">— Tous sports —</option>
          {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
        </Select>
        <Input label="Titre" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Courir 50km ce mois" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Cible" type="number" value={target} onChange={e => setTarget(+e.target.value)} />
          <Input label="Unité" value={unit} onChange={e => setUnit(e.target.value)} placeholder="séances, km…" />
        </div>
        <Input label="Échéance (optionnel)" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        <ModalActions onCancel={() => setModal(false)} onConfirm={handleSave} loading={saving} confirmLabel="Créer" />
      </Modal>

      <style jsx>{`@media (max-width: 600px) { .goals-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// ANALYTICS PAGE
// ════════════════════════════════════════════════════════════
interface AnalyticsProps { sessions: Session[]; sports: Sport[]; [key: string]: unknown }

export function AnalyticsPage({ sessions, sports }: AnalyticsProps) {
  const monthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    const label = d.toLocaleDateString('fr-FR', { month: 'short' })
    const monthKey = d.toISOString().slice(0, 7)
    const count = sessions.filter(s => s.date.startsWith(monthKey)).length
    return { label, value: count }
  })

  const avgDuration = sessions.length ? Math.round(sessions.reduce((a, s) => a + (s.duration || 0), 0) / sessions.length) : 0
  const totalDuration = sessions.reduce((a, s) => a + (s.duration || 0), 0)
  const avgEnergy = sessions.length ? (sessions.reduce((a, s) => a + (s.energy || 0), 0) / sessions.length).toFixed(1) : '—'
  const avgFatigue = sessions.length ? (sessions.reduce((a, s) => a + (s.fatigue || 0), 0) / sessions.length).toFixed(1) : '—'

  return (
    <div>
      <Topbar title="Analytics" subtitle="Statistiques détaillées de tes entraînements" />
      <div className="page-pad">
        <div className="kpi-grid-a" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Durée moyenne', val: `${avgDuration} min`, col: 'var(--a1)' },
            { label: 'Temps total', val: `${Math.round(totalDuration/60)}h`, col: 'var(--a3)' },
            { label: 'Énergie moy.', val: avgEnergy, col: 'var(--a4)' },
            { label: 'Fatigue moy.', val: avgFatigue, col: 'var(--a5)' },
          ].map(({ label, val, col }) => (
            <Card key={label} style={{ textAlign: 'center', padding: '14px 10px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: col }}>{val}</div>
              <div style={{ fontSize: 10, color: 'var(--txt2)', marginTop: 4 }}>{label}</div>
            </Card>
          ))}
        </div>

        <Card style={{ marginBottom: 14 }}>
          <CardTitle>Séances par mois (6 derniers mois)</CardTitle>
          <MiniBarChart data={monthData} height={100} />
        </Card>

        <Card>
          <CardTitle>Répartition par sport</CardTitle>
          {sports.map(s => {
            const cnt = sessions.filter(x => x.sport_id === s.id).length
            const pct = sessions.length ? Math.round((cnt / sessions.length) * 100) : 0
            return (
              <div key={s.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--txt1)' }}>{s.icon} {s.label}</span>
                  <span style={{ color: 'var(--txt2)' }}>{cnt} ({pct}%)</span>
                </div>
                <ProgressBar value={pct} color={s.color} />
              </div>
            )
          })}
        </Card>
      </div>
      <style jsx>{`
        @media (max-width: 768px) { .kpi-grid-a { grid-template-columns: repeat(2,1fr) !important; } }
      `}</style>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// HEALTH PAGE
// ════════════════════════════════════════════════════════════
interface HealthProps { sessions: Session[]; showToast: (m: string, t?: 'success'|'error') => void; [key: string]: unknown }

export function HealthPage({ sessions }: HealthProps) {
  const recentSessions = sessions.slice(0, 10)
  const avgEnergy = recentSessions.length ? (recentSessions.reduce((a, s) => a + (s.energy || 0), 0) / recentSessions.length).toFixed(1) : '—'
  const avgFatigue = recentSessions.length ? (recentSessions.reduce((a, s) => a + (s.fatigue || 0), 0) / recentSessions.length).toFixed(1) : '—'
  const highFatigueDays = recentSessions.filter(s => (s.fatigue || 0) >= 8).length

  return (
    <div>
      <Topbar title="Santé & Recovery" subtitle="Surveille ta forme et évite le surentraînement" />
      <div className="page-pad">
        <div className="health-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>⚡</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--a3)' }}>{avgEnergy}</div>
            <div style={{ fontSize: 11, color: 'var(--txt2)' }}>Énergie moyenne</div>
          </Card>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>😓</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--a5)' }}>{avgFatigue}</div>
            <div style={{ fontSize: 11, color: 'var(--txt2)' }}>Fatigue moyenne</div>
          </Card>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>⚠️</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: highFatigueDays > 2 ? 'var(--a5)' : 'var(--a3)' }}>{highFatigueDays}</div>
            <div style={{ fontSize: 11, color: 'var(--txt2)' }}>Jours fatigue élevée</div>
          </Card>
        </div>

        {highFatigueDays > 2 && (
          <Card style={{ marginBottom: 14, border: '1px solid rgba(244,63,94,.2)', background: 'rgba(244,63,94,.05)' }}>
            <div style={{ fontSize: 13, color: 'var(--a5)', fontWeight: 600, marginBottom: 4 }}>⚠️ Signal de surentraînement</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.6 }}>Ta fatigue est élevée sur plusieurs séances récentes. Pense à intégrer un jour de repos complet.</div>
          </Card>
        )}

        <Card>
          <CardTitle>Historique récent</CardTitle>
          {recentSessions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--txt3)', fontSize: 12, padding: '16px 0' }}>Aucune donnée disponible</div>
          ) : recentSessions.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{s.date}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--a3)' }}>⚡{s.energy || '—'}</span>
                <span style={{ fontSize: 11, color: 'var(--a5)' }}>😓{s.fatigue || '—'}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>
      <style jsx>{`@media (max-width: 600px) { .health-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// COACH PAGE
// ════════════════════════════════════════════════════════════
interface CoachProps { sessions: Session[]; sports: Sport[]; goals: Goal[]; [key: string]: unknown }

export function CoachPage({ sessions, sports, goals }: CoachProps) {
  const [messages, setMessages] = useState<{ role: 'user'|'assistant'; content: string }[]>([
    { role: 'assistant', content: "Salut ! Je suis ton coach IA 🤖. Pose-moi des questions sur ton entraînement, tes objectifs ou demande-moi des conseils personnalisés !" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage() {
    if (!input.trim()) return
    const userMsg = input
    setMessages(m => [...m, { role: 'user', content: userMsg }])
    setInput('')
    setLoading(true)
    const context = `Tu es un coach sportif expert et bienveillant. Contexte athlète: ${sessions.length} séances enregistrées, ${goals.length} objectifs. Sports pratiqués: ${sports.map(s=>s.label).join(', ')}. Réponds en français, de façon concise et actionnable à: "${userMsg}"`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, messages: [{ role: 'user', content: context }] }) })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.content?.[0]?.text || "Désolé, je n'ai pas pu répondre." }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Erreur de connexion, réessaie plus tard." }])
    }
    setLoading(false)
  }

  return (
    <div>
      <Topbar title="Coach IA" subtitle="Discute avec ton coach personnel" />
      <div className="page-pad">
        <Card style={{ height: 'min(60vh, 500px)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.6, background: m.role === 'user' ? 'var(--a1)' : 'var(--bg3)', color: m.role === 'user' ? '#fff' : 'var(--txt1)', whiteSpace: 'pre-line' }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic' }}>Le coach réfléchit…</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border)' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Pose ta question…" style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--txt1)', fontSize: 13, outline: 'none', minWidth: 0 }} />
            <Btn onClick={sendMessage} disabled={loading || !input.trim()}>Envoyer</Btn>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TIMELINE PAGE
// ════════════════════════════════════════════════════════════
interface TimelineProps { sessions: Session[]; sports: Sport[]; [key: string]: unknown }

export function TimelinePage({ sessions, sports }: TimelineProps) {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  const grouped: Record<string, Session[]> = {}
  sorted.forEach(s => {
    const monthKey = s.date.slice(0, 7)
    if (!grouped[monthKey]) grouped[monthKey] = []
    grouped[monthKey].push(s)
  })

  return (
    <div>
      <Topbar title="Timeline" subtitle="Ton parcours sportif, chronologiquement" />
      <div className="page-pad">
        {Object.keys(grouped).length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗓️</div>
            <div style={{ fontSize: 14, color: 'var(--txt2)' }}>Aucune séance enregistrée</div>
          </Card>
        ) : Object.entries(grouped).map(([month, items]) => (
          <div key={month} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--txt2)', marginBottom: 10, textTransform: 'capitalize' }}>
              {new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </div>
            <div style={{ position: 'relative', paddingLeft: 20 }}>
              <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, background: 'var(--border)' }} />
              {items.map(s => {
                const sp = sports.find(x => x.id === s.sport_id)
                return (
                  <div key={s.id} style={{ position: 'relative', marginBottom: 12 }}>
                    <div style={{ position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: '50%', background: sp?.color || 'var(--a1)', border: '2px solid var(--bg1)' }} />
                    <Card style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16 }}>{sp?.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt1)' }}>{sp?.label}{s.type ? ` — ${s.type}` : ''}</span>
                        <span style={{ fontSize: 11, color: 'var(--txt3)', marginLeft: 'auto' }}>{s.date}</span>
                      </div>
                      {s.note && <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 4 }}>{s.note}</div>}
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// GAMIFICATION PAGE
// ════════════════════════════════════════════════════════════
interface GamificationProps { sessions: Session[]; goals: Goal[]; [key: string]: unknown }

export function GamificationPage({ sessions, goals }: GamificationProps) {
  const totalSessions = sessions.length
  const level = Math.floor(totalSessions / 10) + 1
  const doneGoals = goals.filter(g => g.current >= g.target).length

  const badges = [
    { id: 'first', icon: '🎬', label: 'Première séance', unlocked: totalSessions >= 1 },
    { id: 'five', icon: '5️⃣', label: '5 séances', unlocked: totalSessions >= 5 },
    { id: 'ten', icon: '🔟', label: '10 séances', unlocked: totalSessions >= 10 },
    { id: 'fifty', icon: '💯', label: '50 séances', unlocked: totalSessions >= 50 },
    { id: 'goal1', icon: '🎯', label: '1 objectif atteint', unlocked: doneGoals >= 1 },
    { id: 'goal5', icon: '🏆', label: '5 objectifs atteints', unlocked: doneGoals >= 5 },
    { id: 'streak', icon: '🔥', label: 'Streak 7 jours', unlocked: false },
    { id: 'level5', icon: '⭐', label: 'Niveau 5', unlocked: level >= 5 },
  ]

  return (
    <div>
      <Topbar title="Récompenses" subtitle="Tes badges et progression" />
      <div className="page-pad">
        <Card style={{ marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--a2)' }}>Niveau {level}</div>
          <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 12 }}>{totalSessions % 10}/10 séances vers le niveau {level + 1}</div>
          <ProgressBar value={(totalSessions % 10) * 10} color="var(--a2)" height={6} />
        </Card>

        <Card>
          <CardTitle>Badges débloqués</CardTitle>
          <div className="badge-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {badges.map(b => (
              <div key={b.id} style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 12, background: b.unlocked ? 'rgba(168,85,247,.08)' : 'var(--bg3)', border: `1px solid ${b.unlocked ? 'rgba(168,85,247,.3)' : 'var(--border)'}`, opacity: b.unlocked ? 1 : 0.4 }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{b.icon}</div>
                <div style={{ fontSize: 10, color: 'var(--txt2)', lineHeight: 1.3 }}>{b.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <style jsx>{`
        @media (max-width: 600px) { .badge-grid { grid-template-columns: repeat(3,1fr) !important; } }
        @media (max-width: 420px) { .badge-grid { grid-template-columns: repeat(2,1fr) !important; } }
      `}</style>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// JOURNAL PAGE
// ════════════════════════════════════════════════════════════
interface JournalProps { showToast: (m: string, t?: 'success'|'error') => void; [key: string]: unknown }

interface JournalEntry { id: string; content: string; mood: string; created_at: string }

export function JournalPage({ showToast }: JournalProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [modal, setModal] = useState(false)
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('😊')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const MOODS = ['😊', '😐', '😞', '💪', '😴', '🔥']

  useEffect(() => { loadEntries() }, [])

  async function loadEntries() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setEntries(data as JournalEntry[])
    setLoading(false)
  }

  async function saveEntry() {
    if (!content.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('journal_entries').insert({ user_id: user.id, content, mood }).select().single()
    if (!error && data) { setEntries(e => [data as JournalEntry, ...e]); showToast('Entrée ajoutée ! 📔') }
    else if (error) showToast(error.message, 'error')
    setSaving(false); setModal(false); setContent(''); setMood('😊')
  }

  async function deleteEntry(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return
    const { error } = await supabase.from('journal_entries').delete().eq('id', id)
    if (!error) { setEntries(e => e.filter(x => x.id !== id)); showToast('Entrée supprimée') }
  }

  return (
    <div>
      <Topbar title="Journal" subtitle="Tes pensées et ressentis au fil du temps" action={{ label: 'Nouvelle entrée', fn: () => setModal(true) }} />
      <div className="page-pad">
        {loading ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--txt3)' }}>Chargement…</div>
        : entries.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📔</div>
            <div style={{ fontSize: 14, color: 'var(--txt1)', marginBottom: 6 }}>Aucune entrée</div>
            <Btn onClick={() => setModal(true)}>+ Écrire ma première entrée</Btn>
          </Card>
        ) : entries.map(e => (
          <Card key={e.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{e.mood}</span>
                <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{new Date(e.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', fontSize: 12 }}>🗑️</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt1)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{e.content}</div>
          </Card>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="📔 Nouvelle entrée">
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 8 }}>Humeur du jour</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(m)} style={{ width: 42, height: 42, borderRadius: 10, fontSize: 20, cursor: 'pointer', border: `2px solid ${mood === m ? 'var(--a1)' : 'var(--border2)'}`, background: mood === m ? 'rgba(79,142,247,.1)' : 'var(--bg3)' }}>{m}</button>
            ))}
          </div>
        </div>
        <Textarea label="Comment s'est passée ta journée ?" value={content} onChange={e => setContent(e.target.value)} placeholder="Raconte ta journée, tes ressentis…" />
        <ModalActions onCancel={() => setModal(false)} onConfirm={saveEntry} loading={saving} confirmLabel="Enregistrer" />
      </Modal>
    </div>
  )
}
