'use client'
import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend,
} from 'recharts'
import { Card, CardTitle, Topbar } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import type { Session, Sport, Goal, SportCriteria } from '@/types'

interface Props {
  sessions: Session[]
  sports: Sport[]
  goals: Goal[]
  [key: string]: unknown
}

const PERIODS = ['7j', '30j', '90j', '1an', 'Tout']

function filterByPeriod(sessions: Session[], period: string) {
  const now = Date.now()
  const days: Record<string, number> = { '7j': 7, '30j': 30, '90j': 90, '1an': 365 }
  if (period === 'Tout') return sessions
  const cutoff = new Date(now - days[period] * 86400000).toISOString().slice(0, 10)
  return sessions.filter(s => s.date >= cutoff)
}

const TooltipStyle = {
  backgroundColor: '#1e2335',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#eef0f8',
  fontSize: 12,
}

export default function ChartsPage({ sessions, sports, goals }: Props) {
  const [period, setPeriod] = useState('30j')
  const [sportFilter, setSportFilter] = useState('all')
  const [criteria, setCriteria] = useState<SportCriteria[]>([])
  const [activeCriteria, setActiveCriteria] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.from('sport_criteria').select('*').order('position').then(({ data }) => {
      if (data) {
        setCriteria(data as SportCriteria[])
        // All active by default
        setActiveCriteria(new Set(['Énergie', 'Fatigue', ...(data as SportCriteria[]).map(c => c.label)]))
      }
    })
  }, [])

  const filtered = useMemo(() => {
    let s = filterByPeriod(sessions, period)
    if (sportFilter !== 'all') s = s.filter(x => x.sport_id === sportFilter)
    return s
  }, [sessions, period, sportFilter])

  // ── Custom criteria progression (only when a specific sport is selected) ──
  const sportCriteria = sportFilter !== 'all' ? criteria.filter(c => c.sport_id === sportFilter) : []

  const criteriaData = useMemo(() => {
    if (sportFilter === 'all') return []
    const sportSessions = sessions
      .filter(s => s.sport_id === sportFilter)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-20)
    return sportSessions.map(s => {
      const point: Record<string, any> = { date: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }
      point['Énergie'] = s.energy ?? null
      point['Fatigue'] = s.fatigue ?? null
      sportCriteria.forEach(c => {
        point[c.label] = s.custom_ratings?.[c.id] ?? null
      })
      return point
    })
  }, [sessions, sportFilter, sportCriteria])

  const CRITERIA_COLORS = ['#4f8ef7','#a855f7','#22d3a0','#f59e0b','#f43f5e','#38bdf8','#ec4899','#84cc16']

  // Reset active criteria when sport changes — activate all by default
  useEffect(() => {
    const all = new Set(['Énergie', 'Fatigue', ...sportCriteria.map(c => c.label)])
    setActiveCriteria(all)
  }, [sportFilter, criteria])

  function toggleCriterion(label: string) {
    setActiveCriteria(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  // ── Volume par semaine ──────────────────────────────────
  const weeklyVolume = useMemo(() => {
    const map: Record<string, { sessions: number; minutes: number; km: number }> = {}
    filtered.forEach(s => {
      const d = new Date(s.date)
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      const key = monday.toISOString().slice(0, 10)
      if (!map[key]) map[key] = { sessions: 0, minutes: 0, km: 0 }
      map[key].sessions++
      map[key].minutes += s.duration || 0
      map[key].km += s.distance || 0
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        Séances: v.sessions,
        Minutes: v.minutes,
        'km': +v.km.toFixed(1),
      }))
  }, [filtered])

  // ── Énergie & fatigue dans le temps ────────────────────
  const wellnessData = useMemo(() => {
    return [...filtered]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter(s => s.energy || s.fatigue)
      .slice(-30)
      .map(s => ({
        date: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        Énergie: s.energy || 0,
        Fatigue: s.fatigue || 0,
      }))
  }, [filtered])

  // ── Course : évolution allure / distance ────────────────
  const runData = useMemo(() => {
    return sessions
      .filter(s => s.distance && s.distance > 0)
      .filter(s => sportFilter === 'all' || s.sport_id === sportFilter)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-20)
      .map(s => ({
        date: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        Distance: s.distance || 0,
        FC: s.heart_rate || 0,
      }))
  }, [sessions, sportFilter])

  // ── Répartition des séances par sport (bar) ────────────
  const sportData = useMemo(() => {
    return sports.map(sp => ({
      sport: sp.label,
      color: sp.color,
      Séances: sessions.filter(s => s.sport_id === sp.id).length,
      Heures: +( sessions.filter(s => s.sport_id === sp.id).reduce((a, s) => a + (s.duration || 0), 0) / 60).toFixed(1),
    })).filter(d => d.Séances > 0)
  }, [sessions, sports])

  // ── Objectifs radar ─────────────────────────────────────
  const radarData = useMemo(() => {
    return goals.slice(0, 6).map(g => ({
      subject: g.title.length > 15 ? g.title.slice(0, 15) + '…' : g.title,
      Progression: Math.min(100, Math.round((g.current / g.target) * 100)),
    }))
  }, [goals])

  // ── Séances par mois (année courante) ──────────────────
  const monthlyData = useMemo(() => {
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
    const year = new Date().getFullYear()
    return months.map((m, i) => ({
      mois: m,
      Séances: sessions.filter(s => {
        const d = new Date(s.date)
        return d.getFullYear() === year && d.getMonth() === i
      }).length,
      Heures: +(sessions.filter(s => {
        const d = new Date(s.date)
        return d.getFullYear() === year && d.getMonth() === i
      }).reduce((a, s) => a + (s.duration || 0), 0) / 60).toFixed(1),
    }))
  }, [sessions])

  const tabStyle = (active: boolean) => ({
    padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
    background: active ? 'var(--bg4)' : 'transparent',
    color: active ? 'var(--txt1)' : 'var(--txt2)',
    border: 'none', fontFamily: 'DM Sans, sans-serif',
    transition: 'all .15s',
  })

  return (
    <div>
      <Topbar title="Graphiques" subtitle="Visualise ta progression en détail" />
      <div style={{ padding: '0 28px 28px' }}>

        {/* Period + sport filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={tabStyle(period === p)}>{p}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
            <button onClick={() => setSportFilter('all')} style={tabStyle(sportFilter === 'all')}>Tous</button>
            {sports.map(s => (
              <button key={s.id} onClick={() => setSportFilter(s.id)} style={tabStyle(sportFilter === s.id)}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 1 — Volume hebdomadaire + Séances par mois */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Card>
            <CardTitle>📈 Volume hebdomadaire</CardTitle>
            {weeklyVolume.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--txt3)', fontSize: 13 }}>Pas encore assez de données</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyVolume}>
                  <defs>
                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Area type="monotone" dataKey="Séances" stroke="#4f8ef7" strokeWidth={2} fill="url(#colorSessions)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <CardTitle>📅 Séances par mois ({new Date().getFullYear()})</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Bar dataKey="Séances" fill="#4f8ef7" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Bar dataKey="Heures" fill="#a855f7" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#7d899e' }} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Row 2 — Énergie & Fatigue + Répartition par sport */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Card>
            <CardTitle>💪 Énergie & Fatigue</CardTitle>
            {wellnessData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--txt3)', fontSize: 13 }}>Renseigne ton énergie et ta fatigue lors des séances</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={wellnessData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#7d899e' }} />
                  <Line type="monotone" dataKey="Énergie" stroke="#22d3a0" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Fatigue" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <CardTitle>🏅 Répartition par sport</CardTitle>
            {sportData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--txt3)', fontSize: 13 }}>Aucune séance encore</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sportData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="sport" tick={{ fontSize: 11, fill: '#7d899e' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Bar dataKey="Séances" fill="#4f8ef7" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Heures" fill="#22d3a0" radius={[0, 4, 4, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#7d899e' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Row 3 — Course distance + Objectifs radar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Course chart: only show if 'all' selected AND run data exists, OR if selected sport has distance data */}
          {runData.length > 0 && (sportFilter === 'all' || runData.length > 0) && (() => {
            const selectedSportLabel = sports.find(s => s.id === sportFilter)?.label?.toLowerCase() || ''
            const isRunSport = sportFilter === 'all' || selectedSportLabel.includes('course') || selectedSportLabel.includes('run') || selectedSportLabel.includes('trail') || selectedSportLabel.includes('marche')
            if (!isRunSport) return null
            return (
          <Card>
            <CardTitle>🏃 Course — Distance & FC</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={runData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#7d899e' }} />
                <Line yAxisId="left" type="monotone" dataKey="Distance" stroke="#22d3a0" strokeWidth={2} dot={{ r: 3, fill: '#22d3a0' }} />
                <Line yAxisId="right" type="monotone" dataKey="FC" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
            )
          })()}

          <Card>
            <CardTitle>🎯 Progression des objectifs</CardTitle>
            {radarData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--txt3)', fontSize: 13 }}>Crée des objectifs pour voir ce graphique</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#7d899e' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} />
                  <Radar name="Progression" dataKey="Progression" stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip contentStyle={TooltipStyle} formatter={(v) => [`${v}%`, 'Progression']} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Custom criteria progression — only when a specific sport is selected */}
        {sportFilter !== 'all' && (
          <div style={{ marginTop: 16 }}>
            <Card>
              <CardTitle>
                🎛️ Progression — {sports.find(s => s.id === sportFilter)?.icon} {sports.find(s => s.id === sportFilter)?.label}
              </CardTitle>
              {criteriaData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--txt3)', fontSize: 13 }}>
                  Aucune séance enregistrée pour ce sport
                </div>
              ) : (
                <>
                  {/* Toggle buttons */}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                    {[
                      { label:'Énergie', color:'#22d3a0' },
                      { label:'Fatigue', color:'#f43f5e' },
                      ...sportCriteria.map((c,i) => ({ label:c.label, color:CRITERIA_COLORS[i % CRITERIA_COLORS.length] }))
                    ].map(({ label, color }) => {
                      const isActive = activeCriteria.has(label)
                      return (
                        <button key={label} onClick={() => toggleCriterion(label)} style={{
                          padding:'5px 12px', borderRadius:20, cursor:'pointer', fontSize:12,
                          border:`1px solid ${color}`,
                          background: isActive ? color+'25' : 'var(--bg3)',
                          color: isActive ? color : 'var(--txt3)',
                          fontFamily:'DM Sans, sans-serif', fontWeight: isActive ? 600 : 400,
                          transition:'all .15s', display:'flex', alignItems:'center', gap:5,
                        }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background: isActive ? color : 'var(--border2)', display:'inline-block' }} />
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={criteriaData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TooltipStyle} />
                      {activeCriteria.has('Énergie') && <Line type="monotone" dataKey="Énergie" stroke="#22d3a0" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
                      {activeCriteria.has('Fatigue') && <Line type="monotone" dataKey="Fatigue" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" connectNulls />}
                      {sportCriteria.map((c, i) => activeCriteria.has(c.label) && (
                        <Line key={c.id} type="monotone" dataKey={c.label} stroke={CRITERIA_COLORS[i % CRITERIA_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  {sportCriteria.length === 0 && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(79,142,247,.08)', border: '1px solid rgba(79,142,247,.2)', borderRadius: 10, fontSize: 12, color: 'var(--a1)' }}>
                      💡 Va dans <strong>Séances</strong> → sélectionne ce sport → <strong>🎛️ Critères</strong> pour ajouter des critères personnalisés (ex: coup droit, service…) et suivre leur progression ici.
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
