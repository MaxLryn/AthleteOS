'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, Sport, Session, CalendarEvent, Goal } from '@/types'

import DashboardHome    from '@/components/modules/DashboardHome'
import SessionsPage     from '@/components/modules/SessionsPage'
import CalendarPage     from '@/components/modules/CalendarPage'
import { GoalsPage, AnalyticsPage, HealthPage, CoachPage, TimelinePage, GamificationPage, JournalPage } from '@/components/modules/Pages'
import ProfilePage      from '@/components/modules/ProfilePage'
import StravaPage       from '@/components/modules/StravaPage'
import ExercisePage     from '@/components/modules/ExercisePage'
import ChartsPage       from '@/components/modules/ChartsPage'

const NAV = [
  { id: 'dashboard',    icon: '⚡', label: 'Dashboard' },
  { id: 'sessions',     icon: '📝', label: 'Séances' },
  { id: 'calendar',     icon: '📅', label: 'Calendrier' },
  { id: 'goals',        icon: '🎯', label: 'Objectifs' },
  { id: 'charts',       icon: '📈', label: 'Graphiques' },
  { id: 'analytics',    icon: '📊', label: 'Analytics' },
  { id: 'exercises',    icon: '🏋️', label: 'Exercices' },
  { id: 'health',       icon: '❤️', label: 'Santé & Recovery' },
  { id: 'coach',        icon: '🤖', label: 'Coach IA' },
  { id: 'timeline',     icon: '🗓️', label: 'Timeline' },
  { id: 'gamification', icon: '🏆', label: 'Gamification' },
  { id: 'journal',      icon: '📔', label: 'Journal' },
]

const NAV_INTEGRATIONS = [
  { id: 'strava',       icon: '🟠', label: 'Strava' },
]

export default function DashboardLayout() {
  const [page, setPage]           = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [darkMode, setDarkMode]   = useState(true)
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [sports, setSports]       = useState<Sport[]>([])
  const [sessions, setSessions]   = useState<Session[]>([])
  const [events, setEvents]       = useState<CalendarEvent[]>([])
  const [goals, setGoals]         = useState<Goal[]>([])
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => { document.body.classList.toggle('light', !darkMode) }, [darkMode])

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const params = new URLSearchParams(window.location.search)
      const stravaCode = params.get('strava_code')
      if (stravaCode) { setPage('strava'); window.history.replaceState({}, '', '/dashboard') }
      const pageParam = params.get('page')
      if (pageParam) { setPage(pageParam); window.history.replaceState({}, '', '/dashboard') }

      const [profileRes, sportsRes, sessionsRes, eventsRes, goalsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('sports').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('sessions').select('*, sport:sports(*)').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('calendar_events').select('*, sport:sports(*)').eq('user_id', user.id).order('event_date'),
        supabase.from('goals').select('*, sport:sports(*)').eq('user_id', user.id).order('created_at'),
      ])

      if (profileRes.data)  setProfile(profileRes.data)
      if (sportsRes.data)   setSports(sportsRes.data)
      if (sessionsRes.data) setSessions(sessionsRes.data as Session[])
      if (eventsRes.data)   setEvents(eventsRes.data as CalendarEvent[])
      if (goalsRes.data)    setGoals(goalsRes.data as Goal[])
      setLoading(false)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function addSport(data: Omit<Sport, 'id' | 'user_id' | 'created_at'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: s, error } = await supabase.from('sports').insert({ ...data, user_id: user.id }).select().single()
    if (!error && s) { setSports(prev => [...prev, s]); showToast('Sport ajouté ! ' + data.icon) }
  }

  async function addSession(data: Partial<Session>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: s, error } = await supabase.from('sessions').insert({ ...data, user_id: user.id }).select('*, sport:sports(*)').single()
    if (!error && s) { setSessions(prev => [s as Session, ...prev]); showToast('Séance enregistrée ! 💪') }
    else if (error) showToast(error.message, 'error')
  }

  async function addEvent(data: Partial<CalendarEvent>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: e, error } = await supabase.from('calendar_events').insert({ ...data, user_id: user.id }).select('*, sport:sports(*)').single()
    if (!error && e) {
      setEvents(prev => [...prev, e as CalendarEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
      showToast(data.type === 'spectator' ? 'Événement à suivre ajouté ! 📺' : 'Événement ajouté ! 📅')
    } else if (error) showToast(error.message, 'error')
  }

  async function addGoal(data: Partial<Goal>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: g, error } = await supabase.from('goals').insert({ ...data, user_id: user.id }).select('*, sport:sports(*)').single()
    if (!error && g) { setGoals(prev => [...prev, g as Goal]); showToast('Objectif créé ! 🎯') }
    else if (error) showToast(error.message, 'error')
  }

  async function updateGoal(id: string, current: number) {
    const { error } = await supabase.from('goals').update({ current }).eq('id', id)
    if (!error) setGoals(prev => prev.map(g => g.id === id ? { ...g, current } : g))
  }

  const ctx = {
    profile, sports, sessions, events, goals, showToast,
    addSport, addSession, addEvent, addGoal, updateGoal,
    setSports, setSessions, setEvents, setGoals,
    onProfileUpdate: (p: Profile) => setProfile(p),
    onNav: setPage,
  }

  const initials    = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AT'
  const displayName = profile?.full_name || profile?.username || 'Athlète'

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg1)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#4f8ef7,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 16px' }}>⚡</div>
        <div style={{ color: 'var(--txt2)', fontSize: 14 }}>Chargement…</div>
      </div>
    </div>
  )

  const pages: Record<string, React.ReactNode> = {
    dashboard:    <DashboardHome    {...ctx} />,
    sessions:     <SessionsPage     {...ctx} />,
    calendar:     <CalendarPage     {...ctx} setEvents={setEvents} />,
    goals:        <GoalsPage        {...ctx} />,
    charts:       <ChartsPage       {...ctx} />,
    analytics:    <AnalyticsPage    {...ctx} />,
    exercises:    <ExercisePage     {...ctx} />,
    health:       <HealthPage       {...ctx} />,
    coach:        <CoachPage        {...ctx} />,
    timeline:     <TimelinePage     {...ctx} />,
    gamification: <GamificationPage {...ctx} />,
    journal:      <JournalPage      {...ctx} />,
    strava:       <StravaPage       {...ctx} />,
    profile:      <ProfilePage      {...ctx} />,
  }

  const NavItem = ({ n }: { n: typeof NAV[0] }) => (
    <div onClick={() => setPage(n.id)} style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px',
      borderRadius: 9, cursor: 'pointer', marginBottom: 2, whiteSpace: 'nowrap',
      background: page === n.id ? 'var(--bg4)' : 'transparent',
      color: page === n.id ? 'var(--a1)' : 'var(--txt2)',
      transition: 'all .15s',
    }}>
      <span style={{ fontSize: 17, width: 20, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
      {!collapsed && <span style={{ fontSize: 13, fontWeight: page === n.id ? 500 : 400 }}>{n.label}</span>}
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg1)' }}>
      <aside style={{
        width: collapsed ? 64 : 230, flexShrink: 0,
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', transition: 'width .25s ease',
        overflow: 'hidden', zIndex: 10,
      }}>
        <div onClick={() => setCollapsed(c => !c)} style={{ padding: '20px 16px 22px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,var(--a1),var(--a2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⚡</div>
          {!collapsed && <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--txt1)', whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>Athlete<span style={{ color: 'var(--a1)' }}>OS</span></span>}
        </div>

        <div style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
          {!collapsed && <div style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--txt3)', fontWeight: 600, padding: '0 10px', marginBottom: 6 }}>Principal</div>}
          {NAV.map(n => <NavItem key={n.id} n={n} />)}

          <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />
          {!collapsed && <div style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--txt3)', fontWeight: 600, padding: '0 10px', marginBottom: 6 }}>Intégrations</div>}
          {NAV_INTEGRATIONS.map(n => <NavItem key={n.id} n={n} />)}

          <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />
          {!collapsed && <div style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--txt3)', fontWeight: 600, padding: '0 10px', marginBottom: 6 }}>Sports</div>}
          {sports.map(s => (
            <div key={s.id} onClick={() => setPage('sessions')} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 10px', borderRadius: 9, cursor: 'pointer', color: 'var(--txt2)', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{s.icon}</span>
              {!collapsed && <span style={{ fontSize: 12 }}>{s.label}</span>}
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div onClick={() => setDarkMode(d => !d)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 9, cursor: 'pointer', color: 'var(--txt2)', fontSize: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 17, width: 20, textAlign: 'center', flexShrink: 0 }}>{darkMode ? '☀️' : '🌙'}</span>
            {!collapsed && <span>{darkMode ? 'Mode clair' : 'Mode sombre'}</span>}
          </div>
          <div onClick={() => setPage('profile')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 10, background: page === 'profile' ? 'var(--bg4)' : 'var(--bg3)', cursor: 'pointer', border: `1px solid ${page === 'profile' ? 'var(--a1)' : 'transparent'}`, transition: 'all .15s' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--a1),var(--a2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
            )}
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                <div style={{ fontSize: 11, color: 'var(--txt3)' }}>⚙️ Réglages du profil</div>
              </div>
            )}
            {!collapsed && <div onClick={e => { e.stopPropagation(); signOut() }} title="Déconnexion" style={{ cursor: 'pointer', color: 'var(--txt3)', fontSize: 14, padding: 4 }}>⎋</div>}
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg1)' }}>
        <div className="fade-up" key={page}>{pages[page] || pages['dashboard']}</div>
      </main>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: toast.type === 'success' ? 'var(--a3)' : 'var(--a5)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'success' ? '✓' : '!'} {toast.msg}
        </div>
      )}
    </div>
  )
}
