'use client'
import { useState, useEffect } from 'react'
import { Card, CardTitle, Pill, Topbar, Heatmap, MiniBarChart, RadialScore, ProgressBar } from '@/components/ui'
import SessionModal from './SessionModal'
import DailyRecommendation from './DailyRecommendation'
import { supabase } from '@/lib/supabase'
import type { Sport, Session, CalendarEvent, Goal, Profile, SportCriteria } from '@/types'
import { EVENT_TYPE_CONFIG } from '@/types'

interface Props {
  profile: Profile | null
  sports: Sport[]
  sessions: Session[]
  events: CalendarEvent[]
  goals: Goal[]
  onNav: (page: string) => void
  addSession: (data: Partial<Session>) => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error') => void
  [key: string]: unknown
}

export default function DashboardHome({ profile, sports, sessions, events, goals, onNav, addSession, showToast }: Props) {
  const [sessionModal, setSessionModal] = useState(false)
  const [criteria, setCriteria] = useState<SportCriteria[]>([])

  useEffect(() => {
    supabase.from('sport_criteria').select('*').order('position').then(({ data }) => {
      if (data) setCriteria(data as SportCriteria[])
    })
  }, [])

  const totalSessions = sessions.length
  const totalHours    = (sessions.reduce((a, s) => a + (s.duration || 0), 0) / 60).toFixed(1)
  const today         = new Date().toISOString().slice(0, 10)
  const weekAgo       = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const thisWeek      = sessions.filter(s => s.date >= weekAgo).length
  const doneGoals     = goals.filter(g => g.current >= g.target).length

  let streak = 0
  const sortedDates = Array.from(new Set(sessions.map(s => s.date))).sort((a, b) => b.localeCompare(a))
  for (let i = 0; i < sortedDates.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    if (sortedDates[i] === expected) streak++
    else break
  }

  const regularityScore = Math.min(100, thisWeek * 20)
  const goalScore       = goals.length ? Math.round((doneGoals / goals.length) * 100) : 50
  const athleteScore    = Math.round((regularityScore * 0.4) + (goalScore * 0.4) + 20)

  const upcoming = events
    .filter(e => e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 3)

  const weekData = ['L','M','M','J','V','S','D'].map((l, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().slice(0, 10)
    return { label: l, value: sessions.filter(s => s.date === ds).length }
  })

  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        action={{ label: 'Nouvelle séance', fn: () => setSessionModal(true) }}
      />

      <div style={{ padding: '0 28px 28px' }}>

        {/* Recommandation du jour */}
        <div style={{ marginBottom: 16 }}>
          <DailyRecommendation sessions={sessions} sports={sports} goals={goals} onNav={onNav} />
        </div>

        {/* Score + KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, marginBottom: 16 }}>
          <Card style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(rgba(79,142,247,.1),transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--txt3)', fontWeight: 600, marginBottom: 14 }}>Score Athlète Global</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <RadialScore score={athleteScore} size={104} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--txt1)', letterSpacing: '-1px', lineHeight: 1 }}>{athleteScore}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, color: 'var(--a3)', background: 'rgba(34,211,160,.12)', padding: '3px 8px', borderRadius: 20, margin: '6px 0 10px' }}>▲ En progression</div>
                {[['Régularité', regularityScore, 'var(--a1)'], ['Objectifs', goalScore, 'var(--a3)']] .map(([l, v, c]) => (
                  <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, fontSize: 11 }}>
                    <span style={{ width: 62, color: 'var(--txt2)', textAlign: 'right' }}>{l}</span>
                    <div style={{ flex: 1 }}><ProgressBar value={v as number} color={c as string} /></div>
                    <span style={{ color: 'var(--txt2)', width: 22 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { icon: '🔥', val: totalSessions, label: 'Séances totales',    delta: `${thisWeek} cette semaine`, col: 'var(--a1)' },
              { icon: '⏱️', val: `${totalHours}h`, label: "Heures d'entraîn.", delta: 'Depuis le début',      col: 'var(--a3)' },
              { icon: '🏆', val: `${doneGoals}/${goals.length}`, label: 'Objectifs atteints', delta: `${goals.length ? Math.round((doneGoals/goals.length)*100) : 0}%`, col: 'var(--a2)' },
              { icon: '⚡', val: `🔥 ${streak}`, label: 'Streak actuel', delta: `${streak} jours consécutifs`, col: 'var(--a4)' },
            ].map(({ icon, val, label, delta, col }) => (
              <Card key={label}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: col + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 12 }}>{icon}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--txt1)', marginBottom: 2 }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{label}</div>
                <div style={{ fontSize: 11, color: col, marginTop: 4 }}>{delta}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* Heatmap + Sport breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16, marginBottom: 16 }}>
          <Card>
            <CardTitle>Activité — 12 derniers mois</CardTitle>
            <Heatmap sessions={sessions} />
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Volume hebdomadaire</div>
              <MiniBarChart data={weekData} height={60} />
            </div>
          </Card>

          <Card>
            <CardTitle>Par sport</CardTitle>
            {sports.map(s => {
              const cnt = sessions.filter(ss => ss.sport_id === s.id).length
              const pct = totalSessions ? Math.round((cnt / totalSessions) * 100) : 0
              return (
                <div key={s.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 13px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt1)' }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{cnt} séance{cnt !== 1 ? 's' : ''}</div>
                      <div style={{ marginTop: 5 }}><ProgressBar value={pct} color={s.color} height={3} /></div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 500 }}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </Card>
        </div>

        {/* AI Coach teaser */}
        <Card style={{ background: 'linear-gradient(135deg,var(--bg2),var(--bg3))', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--a1),var(--a2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15 }}>Coach IA</div>
              <div style={{ fontSize: 11, color: 'var(--txt3)' }}>Recommandations personnalisées</div>
            </div>
            <button onClick={() => onNav('coach')} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--a1)', fontSize: 12, cursor: 'pointer' }}>Voir tout →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { icon: '📊', col: 'var(--a1)', title: 'Analyse de tes séances', body: `Tu as effectué ${totalSessions} séances au total. Continue sur cette lancée !` },
              { icon: '🎯', col: 'var(--a3)', title: 'Objectifs', body: `${doneGoals} objectif${doneGoals > 1 ? 's' : ''} atteint${doneGoals > 1 ? 's' : ''} sur ${goals.length}.` },
              { icon: '🔥', col: 'var(--a4)', title: 'Streak', body: streak > 0 ? `${streak} jour${streak > 1 ? 's' : ''} consécutif${streak > 1 ? 's' : ''}. Maintiens le cap !` : "Commence une nouvelle série dès aujourd'hui !" },
            ].map(({ icon, col, title, body }) => (
              <div key={title} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: col + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt1)', marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)', lineHeight: 1.5 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent sessions + upcoming */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <CardTitle>Séances récentes</CardTitle>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--txt3)', fontSize: 13 }}>
                Aucune séance — commence dès maintenant ! 💪<br />
                <button onClick={() => setSessionModal(true)} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, background: 'var(--a1)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer' }}>+ Ajouter ma première séance</button>
              </div>
            ) : sessions.slice(0, 5).map(s => {
              const sp = sports.find(x => x.id === s.sport_id)
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{sp?.icon || '🏅'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt1)' }}>{sp?.label || 'Sport'}{s.type ? ` — ${s.type}` : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{s.date} · {s.duration} min{s.note ? ` · ${s.note}` : ''}</div>
                  </div>
                  {s.note?.includes('PR') && <Pill color="var(--a3)">🏅 PR</Pill>}
                  {s.result === 'win'  && <Pill color="var(--a3)">✓ V</Pill>}
                  {s.result === 'loss' && <Pill color="var(--a5)">✗ D</Pill>}
                </div>
              )
            })}
          </Card>

          <div>
            <Card style={{ marginBottom: 12 }}>
              <CardTitle>Prochains événements</CardTitle>
              {upcoming.length === 0 ? (
                <div style={{ color: 'var(--txt3)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Aucun événement planifié</div>
              ) : upcoming.map(ev => {
                const cfg = EVENT_TYPE_CONFIG[ev.type]
                const sport = sports.find(s => s.id === ev.sport_id)
                const displayIcon = sport?.icon || cfg.icon
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{displayIcon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt1)' }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{ev.event_date}{ev.event_time ? ` · ${ev.event_time}` : ''}</div>
                    </div>
                    <Pill color={cfg.color}>{cfg.label}</Pill>
                  </div>
                )
              })}
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>🔥</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--a4)' }}>{streak}</div>
                <div style={{ fontSize: 11, color: 'var(--txt2)' }}>Jours streak</div>
              </Card>
              <Card style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--a2)', marginBottom: 4 }}>
                  Niv. {Math.floor(totalSessions / 10) + 1}
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt2)' }}>Athlète</div>
                <div style={{ marginTop: 8 }}>
                  <ProgressBar value={(totalSessions % 10) * 10} color="var(--a2)" height={4} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 3 }}>{totalSessions % 10} / 10 séances</div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <SessionModal open={sessionModal} onClose={() => setSessionModal(false)} sports={sports} criteria={criteria} onSave={addSession} />
    </div>
  )
}
