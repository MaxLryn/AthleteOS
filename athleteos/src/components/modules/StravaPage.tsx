'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle, Topbar, Pill, Btn } from '@/components/ui'
import type { Profile, Session, Sport } from '@/types'

interface Props {
  profile: Profile | null
  sports: Sport[]
  sessions: Session[]
  setSessions: (s: Session[]) => void
  showToast: (msg: string, type?: 'success' | 'error') => void
  [key: string]: unknown
}

// Strava OAuth config — fill in your Strava App credentials
const STRAVA_CLIENT_ID     = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || ''
const STRAVA_REDIRECT_URI  = typeof window !== 'undefined'
  ? `${window.location.origin}/strava/callback`
  : ''

function metersToKm(m: number) { return (m / 1000).toFixed(2) }
function secondsToTime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${m}min${String(sec).padStart(2,'0')}`
}
function stravaTypeToSport(type: string): string {
  const map: Record<string,string> = {
    Run: 'course', Ride: 'course', Walk: 'course',
    WeightTraining: 'musculation', Workout: 'musculation',
    Tennis: 'tennis', Padel: 'padel',
    Soccer: 'football', Football: 'football',
    Swim: 'natation', Yoga: 'yoga',
  }
  return map[type] || 'course'
}

export default function StravaPage({ profile, sports, sessions, setSessions, showToast }: Props) {
  const [stravaActivities, setStravaActivities] = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<any>(null)

  const stravaProfile = profile as any

  useEffect(() => {
    // Check if already connected
    if (stravaProfile?.strava_access_token) {
      setConnected(true)
      setTokenInfo({ athlete_name: 'Strava connecté' })
    }

    // Handle OAuth callback
    const params = new URLSearchParams(window.location.search)
    const code = params.get('strava_code')
    if (code) {
      exchangeStravaCode(code)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [profile])

  async function connectStrava() {
    if (!STRAVA_CLIENT_ID) {
      showToast('Configure d\'abord ton Client ID Strava dans les variables d\'environnement', 'error')
      return
    }
    const scope = 'read,activity:read_all'
    const url = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/dashboard?strava_code=CODE')}&response_type=code&scope=${scope}`
    window.location.href = url.replace('CODE', '{code}')
  }

  async function exchangeStravaCode(code: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/strava/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.error) { showToast(data.error, 'error'); setLoading(false); return }
      setConnected(true)
      setTokenInfo(data.athlete)
      showToast('Strava connecté ! 🚀')
      await fetchActivities()
    } catch (e) {
      showToast('Erreur de connexion Strava', 'error')
    }
    setLoading(false)
  }

  async function fetchActivities() {
    setLoading(true)
    try {
      const res = await fetch('/api/strava/activities')
      const data = await res.json()
      if (data.error) { showToast(data.error, 'error'); setLoading(false); return }
      setStravaActivities(data.activities || [])
      showToast(`${data.activities?.length || 0} activités chargées depuis Strava`)
    } catch {
      showToast('Erreur lors du chargement des activités', 'error')
    }
    setLoading(false)
  }

  async function importActivity(activity: any) {
    setImporting(activity.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Find matching sport
    const sportLabel = stravaTypeToSport(activity.type)
    const sport = sports.find(s => s.id === sportLabel || s.label.toLowerCase().includes(sportLabel))

    // Save to strava_activities cache
    await supabase.from('strava_activities').upsert({
      user_id: user.id,
      strava_id: activity.id,
      name: activity.name,
      type: activity.type,
      sport_type: activity.sport_type,
      start_date: activity.start_date,
      distance: activity.distance,
      moving_time: activity.moving_time,
      elapsed_time: activity.elapsed_time,
      total_elevation: activity.total_elevation_gain,
      average_speed: activity.average_speed,
      max_speed: activity.max_speed,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      calories: activity.calories,
    })

    // Create session
    const dateStr = new Date(activity.start_date).toISOString().slice(0,10)
    const { data: newSession } = await supabase.from('sessions').insert({
      user_id: user.id,
      sport_id: sport?.id || null,
      date: dateStr,
      duration: Math.round((activity.moving_time || 0) / 60),
      type: activity.type,
      note: `Importé depuis Strava — ${activity.name}`,
      distance: activity.distance ? +(activity.distance / 1000).toFixed(2) : null,
      heart_rate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
    }).select('*, sport:sports(*)').single()

    if (newSession) {
      setSessions([newSession as Session, ...sessions])
      showToast(`"${activity.name}" importé ! ✅`)
    }
    setImporting(null)
  }

  async function importAll() {
    setLoading(true)
    let count = 0
    for (const act of stravaActivities) {
      await importActivity(act)
      count++
    }
    showToast(`${count} activités importées ! 🎉`)
    setLoading(false)
  }

  async function disconnectStrava() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      strava_id: null, strava_access_token: null, strava_refresh_token: null,
    }).eq('id', user.id)
    setConnected(false)
    setStravaActivities([])
    showToast('Strava déconnecté')
  }

  return (
    <div>
      <Topbar title="Strava" subtitle="Importe tes activités automatiquement" />
      <div style={{ padding: '0 28px 28px' }}>

        {/* Connection card */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Strava logo */}
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#FC4C02', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🏃</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--txt1)', marginBottom: 4 }}>
                Strava {connected && <span style={{ fontSize: 13, color: 'var(--a3)', fontWeight: 400 }}>● Connecté</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--txt2)' }}>
                {connected ? 'Synchronise tes activités Strava avec AthleteOS' : 'Connecte ton compte Strava pour importer tes activités'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {connected ? (
                <>
                  <Btn onClick={fetchActivities} disabled={loading} variant="outline">
                    {loading ? '⏳' : '🔄'} Actualiser
                  </Btn>
                  <Btn onClick={disconnectStrava} variant="outline" style={{ color: 'var(--a5)', borderColor: 'rgba(244,63,94,0.3)' }}>
                    Déconnecter
                  </Btn>
                </>
              ) : (
                <button onClick={connectStrava} style={{ padding: '10px 20px', borderRadius: 9, background: '#FC4C02', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🔗 Connecter Strava
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Setup instructions if not connected */}
        {!connected && (
          <Card style={{ marginBottom: 16, border: '1px solid rgba(252,76,2,0.2)' }}>
            <CardTitle>⚙️ Configuration requise</CardTitle>
            <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.9 }}>
              <p style={{ marginBottom: 8 }}>Pour connecter Strava, tu dois d'abord créer une application Strava :</p>
              <ol style={{ paddingLeft: 20, marginBottom: 12 }}>
                <li>Va sur <a href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer" style={{ color: 'var(--a1)' }}>strava.com/settings/api</a></li>
                <li>Crée une application (nom : AthleteOS, site : ton URL Vercel)</li>
                <li>Copie ton <strong style={{ color: 'var(--txt1)' }}>Client ID</strong> et <strong style={{ color: 'var(--txt1)' }}>Client Secret</strong></li>
                <li>Dans Vercel → Settings → Environment Variables, ajoute :<br />
                  <code style={{ background: 'var(--bg4)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>NEXT_PUBLIC_STRAVA_CLIENT_ID</code> et <code style={{ background: 'var(--bg4)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>STRAVA_CLIENT_SECRET</code>
                </li>
              </ol>
              <p style={{ color: 'var(--txt3)', fontSize: 12 }}>Sans ces clés, le bouton "Connecter Strava" ne fonctionnera pas.</p>
            </div>
          </Card>
        )}

        {/* Activities list */}
        {stravaActivities.length > 0 && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--txt1)' }}>
                {stravaActivities.length} activités disponibles
              </div>
              <Btn onClick={importAll} disabled={loading} style={{ background: '#FC4C02', border: 'none' }}>
                ⬇️ Tout importer
              </Btn>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stravaActivities.map(act => {
                const isImporting = importing === act.id
                const date = new Date(act.start_date).toLocaleDateString('fr-FR')
                return (
                  <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FC4C0220', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {act.type === 'Run' ? '🏃' : act.type === 'Ride' ? '🚴' : act.type === 'WeightTraining' ? '🏋️' : act.type === 'Swim' ? '🏊' : '⚡'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', marginBottom: 3 }}>{act.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt2)' }}>
                        {date} · {secondsToTime(act.moving_time)}
                        {act.distance > 0 ? ` · ${metersToKm(act.distance)} km` : ''}
                        {act.average_heartrate ? ` · ❤️ ${Math.round(act.average_heartrate)} bpm` : ''}
                        {act.total_elevation_gain > 0 ? ` · ↑ ${Math.round(act.total_elevation_gain)}m` : ''}
                      </div>
                    </div>
                    <Pill color="#FC4C02">{act.type}</Pill>
                    <Btn onClick={() => importActivity(act)} disabled={!!importing} variant="outline" style={{ fontSize: 12, padding: '6px 12px' }}>
                      {isImporting ? '⏳' : '⬇️ Importer'}
                    </Btn>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {connected && stravaActivities.length === 0 && !loading && (
          <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏃</div>
            <div style={{ fontSize: 15, color: 'var(--txt1)', marginBottom: 8 }}>Aucune activité chargée</div>
            <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 20 }}>Clique sur "Actualiser" pour charger tes activités Strava</div>
            <Btn onClick={fetchActivities}>🔄 Charger mes activités</Btn>
          </Card>
        )}
      </div>
    </div>
  )
}
