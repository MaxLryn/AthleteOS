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
import ForumPage        from '@/components/modules/ForumPage'

// ── Navigation config ──────────────────────────────────────
const NAV_PRIMARY = [
  { id: 'dashboard',    icon: '⚡', label: 'Dashboard' },
  { id: 'sessions',     icon: '📝', label: 'Séances' },
  { id: 'calendar',     icon: '📅', label: 'Calendrier' },
  { id: 'goals',        icon: '🎯', label: 'Objectifs' },
  { id: 'forum',        icon: '💬', label: 'Forum' },
]

const NAV_MORE = [
  { id: 'charts',       icon: '📈', label: 'Graphiques' },
  { id: 'analytics',    icon: '📊', label: 'Analytics' },
  { id: 'exercises',    icon: '🏋️', label: 'Exercices' },
  { id: 'health',       icon: '❤️', label: 'Santé' },
  { id: 'coach',        icon: '🤖', label: 'Coach IA' },
  { id: 'timeline',     icon: '🗓️', label: 'Timeline' },
  { id: 'gamification', icon: '🏆', label: 'Gains' },
  { id: 'journal',      icon: '📔', label: 'Journal' },
  { id: 'strava',       icon: '🟠', label: 'Strava' },
]

const NAV_ALL = [...NAV_PRIMARY, ...NAV_MORE]

// ── Hook: detect mobile ────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export default function DashboardLayout() {
  const [page, setPage]           = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [darkMode, setDarkMode]   = useState(true)
  const [showMore, setShowMore]   = useState(false)
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [sports, setSports]       = useState<Sport[]>([])
  const [sessions, setSessions]   = useState<Session[]>([])
  const [events, setEvents]       = useState<CalendarEvent[]>([])
  const [goals, setGoals]         = useState<Goal[]>([])
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const isMobile = useIsMobile()

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
      if (params.get('strava_code')) { setPage('strava'); window.history.replaceState({}, '', '/dashboard') }
      if (params.get('page')) { setPage(params.get('page')!); window.history.replaceState({}, '', '/dashboard') }

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

  async function signOut() { await supabase.auth.signOut(); window.location.href = '/login' }

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
      showToast('Événement ajouté ! 📅')
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
    onNav: (p: string) => { setPage(p); setShowMore(false) },
  }

  const initials    = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AT'
  const displayName = profile?.full_name || profile?.username || 'Athlète'

  function navTo(id: string) { setPage(id); setShowMore(false) }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg1)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#4f8ef7,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px' }}>⚡</div>
        <div style={{ color: 'var(--txt2)', fontSize: 14 }}>Chargement…</div>
      </div>
    </div>
  )

  const pages: Record<string, React.ReactNode> = {
    dashboard:    <DashboardHome    {...ctx} />,
    sessions:     <SessionsPage     {...ctx} setSessions={setSessions} />,
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
    forum:        <ForumPage        {...ctx} />,
  }

  // ── MOBILE LAYOUT ──────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg1)', overflow: 'hidden' }}>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
          <div className="fade-up" key={page}>
            {pages[page] || pages['dashboard']}
          </div>
        </main>

        {/* "Plus" drawer */}
        {showMore && (
          <div onClick={() => setShowMore(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 90, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg2)', borderRadius: '20px 20px 0 0', padding: '20px 20px calc(80px + env(safe-area-inset-bottom))', border: '1px solid var(--border)' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--bg4)', margin: '0 auto 20px' }} />
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--txt1)', marginBottom: 16 }}>Toutes les pages</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {NAV_MORE.map(n => (
                  <button key={n.id} onClick={() => navTo(n.id)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '12px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: page === n.id ? 'rgba(79,142,247,.12)' : 'var(--bg3)',
                  }}>
                    <span style={{ fontSize: 22 }}>{n.icon}</span>
                    <span style={{ fontSize: 10, color: page === n.id ? 'var(--a1)' : 'var(--txt2)', textAlign: 'center', lineHeight: 1.3 }}>{n.label}</span>
                  </button>
                ))}
                {/* Profile */}
                <button onClick={() => navTo('profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', borderRadius: 12, border: 'none', cursor: 'pointer', background: page === 'profile' ? 'rgba(79,142,247,.12)' : 'var(--bg3)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,var(--a1),var(--a2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{initials}</div>
                  <span style={{ fontSize: 10, color: page === 'profile' ? 'var(--a1)' : 'var(--txt2)' }}>Profil</span>
                </button>
              </div>
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <button onClick={() => setDarkMode(d => !d)} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--txt2)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                  {darkMode ? '☀️ Mode clair' : '🌙 Mode sombre'}
                </button>
                <button onClick={signOut} style={{ width: '100%', marginTop: 8, padding: '12px', borderRadius: 10, border: '1px solid rgba(244,63,94,.2)', background: 'rgba(244,63,94,.06)', color: 'var(--a5)', cursor: 'pointer', fontSize: 13 }}>
                  ⎋ Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom navigation bar */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'var(--bg2)', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          paddingBottom: 'env(safe-area-inset-bottom)',
          height: 'calc(64px + env(safe-area-inset-bottom))',
        }}>
          {NAV_PRIMARY.map(n => (
            <button key={n.id} onClick={() => navTo(n.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '8px 0', border: 'none', background: 'transparent', cursor: 'pointer',
            }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{n.icon}</span>
              <span style={{ fontSize: 9, fontWeight: page === n.id ? 600 : 400, color: page === n.id ? 'var(--a1)' : 'var(--txt3)', letterSpacing: '0.2px' }}>{n.label}</span>
              {page === n.id && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--a1)', marginTop: -2 }} />}
            </button>
          ))}
          {/* More button */}
          <button onClick={() => setShowMore(m => !m)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '8px 0', border: 'none', background: 'transparent', cursor: 'pointer',
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>☰</span>
            <span style={{ fontSize: 9, fontWeight: 400, color: showMore ? 'var(--a1)' : 'var(--txt3)' }}>Plus</span>
            {showMore && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--a1)', marginTop: -2 }} />}
          </button>
        </nav>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom))', left: 16, right: 16, zIndex: 2000, background: toast.type === 'success' ? 'var(--a3)' : 'var(--a5)', color: '#fff', padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 500, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,.4)' }}>
            {toast.type === 'success' ? '✓' : '!'} {toast.msg}
          </div>
        )}
      </div>
    )
  }

  // ── DESKTOP LAYOUT ────────────────────────────────────
  const NavItem = ({ n }: { n: typeof NAV_ALL[0] }) => (
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
      {/* Sidebar */}
      <aside style={{ width: collapsed ? 64 : 230, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', transition: 'width .25s ease', overflow: 'hidden', zIndex: 10 }}>
        <div onClick={() => setCollapsed(c => !c)} style={{ padding: '20px 16px 22px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
            <img src="/logo.png" alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
          </div>
          {!collapsed && <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--txt1)', whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>Athlete<span style={{ color: 'var(--a1)' }}>OS</span></span>}
        </div>

        <div style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
          {!collapsed && <div style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--txt3)', fontWeight: 600, padding: '0 10px', marginBottom: 6 }}>Principal</div>}
          {NAV_PRIMARY.map(n => <NavItem key={n.id} n={n} />)}
          <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />
          {!collapsed && <div style={{ fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--txt3)', fontWeight: 600, padding: '0 10px', marginBottom: 6 }}>Outils</div>}
          {NAV_MORE.map(n => <NavItem key={n.id} n={n} />)}
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
                <div style={{ fontSize: 11, color: 'var(--txt3)' }}>⚙️ Réglages</div>
              </div>
            )}
            {!collapsed && <div onClick={e => { e.stopPropagation(); signOut() }} title="Déconnexion" style={{ cursor: 'pointer', color: 'var(--txt3)', fontSize: 14, padding: 4 }}>⎋</div>}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg1)' }}>
        <div className="fade-up" key={page}>{pages[page] || pages['dashboard']}</div>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: toast.type === 'success' ? 'var(--a3)' : 'var(--a5)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'success' ? '✓' : '!'} {toast.msg}
        </div>
      )}
    </div>
  )
}
