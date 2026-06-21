'use client'
import { Card, CardTitle, Topbar, Btn } from '@/components/ui'
import type { Profile } from '@/types'

interface Props { profile: Profile | null; showToast: (m: string, t?: 'success'|'error') => void; [key: string]: unknown }

export default function StravaPage({ profile }: Props) {
  const connected = !!(profile as any)?.strava_access_token

  function connectStrava() {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/api/strava/connect` : ''
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=activity:read_all`
  }

  return (
    <div>
      <Topbar title="Strava" subtitle="Synchronise tes activités Strava" />
      <div className="page-pad">
        <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🟠</div>
          <CardTitle>{connected ? 'Strava connecté ✅' : 'Connecte ton compte Strava'}</CardTitle>
          <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 20, lineHeight: 1.7 }}>
            {connected ? 'Tes activités Strava peuvent être importées comme séances.' : 'Importe automatiquement tes activités Strava dans AthleteOS.'}
          </div>
          {!connected && <Btn onClick={connectStrava}>🟠 Connecter Strava</Btn>}
        </Card>
      </div>
    </div>
  )
}
