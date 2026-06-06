import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const CLIENT_ID     = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!

export async function POST(request: Request) {
  const { code } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Exchange code for token
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  const tokenData = await tokenRes.json()
  if (tokenData.errors) return NextResponse.json({ error: 'Code Strava invalide' }, { status: 400 })

  // Save tokens to profile
  await supabase.from('profiles').update({
    strava_id: String(tokenData.athlete.id),
    strava_access_token: tokenData.access_token,
    strava_refresh_token: tokenData.refresh_token,
    strava_token_expires_at: tokenData.expires_at,
  }).eq('id', user.id)

  return NextResponse.json({ athlete: tokenData.athlete, success: true })
}
