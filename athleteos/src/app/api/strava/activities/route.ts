import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const CLIENT_ID     = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!

async function refreshToken(refreshToken: string) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      refresh_token: refreshToken, grant_type: 'refresh_token',
    }),
  })
  return res.json()
}

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('strava_access_token,strava_refresh_token,strava_token_expires_at').eq('id', user.id).single()
  if (!profile?.strava_access_token) return NextResponse.json({ error: 'Strava non connecté' }, { status: 400 })

  let accessToken = profile.strava_access_token

  // Refresh token if expired
  const now = Math.floor(Date.now() / 1000)
  if (profile.strava_token_expires_at && profile.strava_token_expires_at < now) {
    const refreshed = await refreshToken(profile.strava_refresh_token!)
    if (refreshed.access_token) {
      accessToken = refreshed.access_token
      await supabase.from('profiles').update({
        strava_access_token: refreshed.access_token,
        strava_refresh_token: refreshed.refresh_token,
        strava_token_expires_at: refreshed.expires_at,
      }).eq('id', user.id)
    }
  }

  // Fetch last 50 activities
  const res = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=50', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const activities = await res.json()
  if (!Array.isArray(activities)) return NextResponse.json({ error: 'Erreur Strava API' }, { status: 400 })

  return NextResponse.json({ activities })
}
