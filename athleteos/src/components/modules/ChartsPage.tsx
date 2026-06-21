'use client'
import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardTitle, Topbar } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import type { Session, Sport, Goal, SportCriteria } from '@/types'

interface Props { sessions: Session[]; sports: Sport[]; goals: Goal[]; [key: string]: unknown }

const TooltipStyle = { background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 12, color: 'var(--txt1)' }

function filterByPeriod(sessions: Session[], period: string) {
  if (period === 'Tout') return sessions
  const days: Record<string, number> = { '7j': 7, '30j': 30, '90j': 90, '1an': 365 }
  const cutoff = new Date(Date.now() - (days[period] || 30) * 86400000).toISOString().slice(0, 10)
  return sessions.filter(s => s.date >= cutoff)
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
        setActiveCriteria(new Set(['Énergie', 'Fatigue', ...(data as SportCriteria[]).map(c => c.label)]))
      }
    })
  }, [])

  const filtered = useMemo(() => {
    let s = filterByPeriod(sessions, period)
    if (sportFilter !== 'all') s = s.filter(x => x.sport_id === sportFilter)
    return s
  }, [sessions, period, sportFilter])

  const weeklyData = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(s => {
      const d = new Date(s.date)
      const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map).map(([date, value]) => ({ date, value })).slice(-12)
  }, [filtered])

  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
      const label = d.toLocaleDateString('fr-FR', { month: 'short' })
      const monthKey = d.toISOString().slice(0, 7)
      const monthSessions = sessions.filter(s => s.date.startsWith(monthKey) && (sportFilter === 'all' || s.sport_id === sportFilter))
      return { label, Séances: monthSessions.length, Heures: Math.round(monthSessions.reduce((a, s) => a + (s.duration || 0), 0) / 60) }
    })
  }, [sessions, sportFilter])

  const energyData = useMemo(() => {
    return filtered.slice(0, 20).reverse().map(s => ({
      date: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      Énergie: s.energy, Fatigue: s.fatigue,
    }))
  }, [filtered])

  const sportData = useMemo(() => {
    return sports.map(s => ({
      label: s.label,
      Séances: sessions.filter(x => x.sport_id === s.id).length,
      Heures: Math.round(sessions.filter(x => x.sport_id === s.id).reduce((a, x) => a + (x.duration || 0), 0) / 60),
    })).filter(d => d.Séances > 0)
  }, [sessions, sports])

  const runData = useMemo(() => {
    return sessions
      .filter(s => s.distance && s.distance > 0)
      .filter(s => sportFilter === 'all' || s.sport_id === sportFilter)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-20)
      .map(s => ({ date: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), Distance: s.distance || 0, FC: s.heart_rate || 0 }))
  }, [sessions, sportFilter])

  const sportCriteria = sportFilter !== 'all' ? criteria.filter(c => c.sport_id === sportFilter) : []
  const CRITERIA_COLORS = ['#4f8ef7','#a855f7','#22d3a0','#f59e0b','#f43f5e','#38bdf8','#ec4899','#84cc16']

  const criteriaData = useMemo(() => {
    if (sportFilter === 'all') return []
    const sportSessions = sessions.filter(s => s.sport_id === sportFilter).sort((a, b) => a.date.localeCompare(b.date)).slice(-20)
    return sportSessions.map(s => {
      const point: Record<string, any> = { date: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }
      point['Énergie'] = s.energy ?? null
      point['Fatigue'] = s.fatigue ?? null
      sportCriteria.forEach(c => { point[c.label] = s.custom_ratings?.[c.id] ?? null })
      return point
    })
  }, [sessions, sportFilter, sportCriteria])

  function toggleCriterion(label: string) {
    setActiveCriteria(prev => { const next = new Set(prev); next.has(label) ? next.delete(label) : next.add(label); return next })
  }

  return (
    <div>
      <Topbar title="Graphiques" subtitle="Visualise ta progression" />
      <div className="page-pad">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8, paddingBottom: 4 }}>
          {['7j','30j','90j','1an','Tout'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, flexShrink: 0, border: `1px solid ${period === p ? 'var(--a1)' : 'var(--border2)'}`, background: period === p ? 'rgba(79,142,247,.12)' : 'var(--bg3)', color: period === p ? 'var(--a1)' : 'var(--txt2)', whiteSpace: 'nowrap' }}>{p}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
          <button onClick={() => setSportFilter('all')} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, flexShrink: 0, border: `1px solid ${sportFilter === 'all' ? 'var(--a1)' : 'var(--border2)'}`, background: sportFilter === 'all' ? 'rgba(79,142,247,.12)' : 'var(--bg3)', color: sportFilter === 'all' ? 'var(--a1)' : 'var(--txt2)', whiteSpace: 'nowrap' }}>Tous</button>
          {sports.map(s => (
            <button key={s.id} onClick={() => setSportFilter(s.id)} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, flexShrink: 0, border: `1px solid ${sportFilter === s.id ? 'var(--a1)' : 'var(--border2)'}`, background: sportFilter === s.id ? 'rgba(79,142,247,.12)' : 'var(--bg3)', color: sportFilter === s.id ? 'var(--a1)' : 'var(--txt2)', whiteSpace: 'nowrap' }}>{s.icon} {s.label}</button>
          ))}
        </div>

        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Card>
            <CardTitle>Volume hebdomadaire</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Bar dataKey="value" fill="#4f8ef7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardTitle>Séances par mois</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Séances" fill="#4f8ef7" radius={[4,4,0,0]} />
                <Bar dataKey="Heures" fill="#a855f7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardTitle>Énergie & Fatigue</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,10]} tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Énergie" stroke="#22d3a0" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Fatigue" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardTitle>Répartition par sport</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sportData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={70} tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Bar dataKey="Séances" fill="#4f8ef7" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Course chart — only shown for running sports */}
        {runData.length > 0 && (() => {
          const selectedSportLabel = sports.find(s => s.id === sportFilter)?.label?.toLowerCase() || ''
          const isRunSport = sportFilter === 'all' || selectedSportLabel.includes('course') || selectedSportLabel.includes('run') || selectedSportLabel.includes('trail') || selectedSportLabel.includes('marche')
          if (!isRunSport) return null
          return (
            <div style={{ marginTop: 14 }}>
              <Card>
                <CardTitle>🏃 Course — Distance & FC</CardTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={runData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line yAxisId="left" type="monotone" dataKey="Distance" stroke="#22d3a0" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="FC" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )
        })()}

        {/* Custom criteria progression */}
        {sportFilter !== 'all' && (
          <div style={{ marginTop: 14 }}>
            <Card>
              <CardTitle>🎛️ Progression — {sports.find(s => s.id === sportFilter)?.icon} {sports.find(s => s.id === sportFilter)?.label}</CardTitle>
              {criteriaData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--txt3)', fontSize: 12 }}>Aucune séance pour ce sport</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {[{ key: 'Énergie', color: '#22d3a0' }, { key: 'Fatigue', color: '#f43f5e' }, ...sportCriteria.map((c, i) => ({ key: c.label, color: CRITERIA_COLORS[i % CRITERIA_COLORS.length] }))].map(({ key, color }) => {
                      const isActive = activeCriteria.has(key)
                      return (
                        <button key={key} onClick={() => toggleCriterion(key)} style={{ padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, border: `1px solid ${isActive ? color : 'var(--border2)'}`, background: isActive ? color + '20' : 'var(--bg3)', color: isActive ? color : 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? color : 'var(--txt3)' }} />{key}
                        </button>
                      )
                    })}
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={criteriaData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0,10]} tick={{ fontSize: 9, fill: '#3d4a5c' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TooltipStyle} />
                      {activeCriteria.has('Énergie') && <Line type="monotone" dataKey="Énergie" stroke="#22d3a0" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
                      {activeCriteria.has('Fatigue') && <Line type="monotone" dataKey="Fatigue" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" connectNulls />}
                      {sportCriteria.map((c, i) => activeCriteria.has(c.label) && <Line key={c.id} type="monotone" dataKey={c.label} stroke={CRITERIA_COLORS[i % CRITERIA_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />)}
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
      <style jsx>{`@media (max-width: 768px) { .charts-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
