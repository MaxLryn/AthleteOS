'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle, Topbar, Input, Btn, Select } from '@/components/ui'
import type { Profile, Sport } from '@/types'

interface Props {
  profile: Profile | null
  sports: Sport[]
  showToast: (msg: string, type?: 'success' | 'error') => void
  onProfileUpdate: (p: Profile) => void
  [key: string]: unknown
}

const LEVELS = [
  { id: 'beginner', label: '🌱 Débutant' },
  { id: 'intermediate', label: '⚡ Intermédiaire' },
  { id: 'advanced', label: '🔥 Avancé' },
  { id: 'expert', label: '🏆 Expert' },
]

export default function ProfilePage({ profile, sports, showToast, onProfileUpdate }: Props) {
  const [fullName, setFullName]   = useState(profile?.full_name || '')
  const [username, setUsername]   = useState(profile?.username || '')
  const [bio, setBio]             = useState((profile as any)?.bio || '')
  const [location, setLocation]   = useState((profile as any)?.location || '')
  const [isPublic, setIsPublic]   = useState((profile as any)?.is_public !== false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [favoriteSport, setFavoriteSport] = useState((profile as any)?.favorite_sport || '')
  const [level, setLevel]         = useState((profile as any)?.level || 'intermediate')
  const [mainGoal, setMainGoal]   = useState((profile as any)?.main_goal || '')
  const [instagram, setInstagram] = useState((profile as any)?.instagram || '')
  const [stravaProfile, setStravaProfile] = useState((profile as any)?.strava_profile || '')
  const [website, setWebsite]     = useState((profile as any)?.website || '')

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [email, setEmail]         = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setEmail(user.email || '') })
  }, [])

  async function uploadAvatar(file: File) {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { showToast('Erreur upload: ' + uploadError.message, 'error'); setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(data.publicUrl + '?t=' + Date.now())
    setUploading(false)
    showToast('Photo mise à jour ! 📸')
  }

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('profiles').update({
      full_name: fullName, username, bio, location, is_public: isPublic, avatar_url: avatarUrl || null,
      favorite_sport: favoriteSport || null, level, main_goal: mainGoal || null,
      instagram: instagram || null, strava_profile: stravaProfile || null, website: website || null,
    }).eq('id', user.id).select().single()
    if (error) showToast(error.message, 'error')
    else { onProfileUpdate(data as Profile); showToast('Profil mis à jour ! ✅') }
    setSaving(false)
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) { showToast('Les mots de passe ne correspondent pas', 'error'); return }
    if (newPassword.length < 6) { showToast('6 caractères minimum', 'error'); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) showToast(error.message, 'error')
    else { showToast('Mot de passe mis à jour ! 🔒'); setNewPassword(''); setConfirmPassword('') }
  }

  const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AT'

  return (
    <div>
      <Topbar title="Réglages du profil" subtitle="Personnalise ton compte AthleteOS" />
      <div className="page-pad profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>

        <div>
          <Card style={{ marginBottom: 14 }}>
            <CardTitle>Photo de profil</CardTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border2)' }} />
                ) : (
                  <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg,var(--a1),var(--a2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif' }}>{initials}</div>
                )}
                <div onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--a1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, border: '2px solid var(--bg2)' }}>✏️</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', marginBottom: 4 }}>{fullName || 'Mon profil'}</div>
                <Btn onClick={() => fileRef.current?.click()} variant="outline" style={{ fontSize: 11 }} disabled={uploading}>
                  {uploading ? '⏳ Upload…' : '📷 Changer'}
                </Btn>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
            </div>

            <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Prénom & Nom" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Alex Romain" />
              <Input label="Nom d'utilisateur" value={username} onChange={e => setUsername(e.target.value)} placeholder="@alexromain" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Passionné de sport 💪" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', minHeight: 70, resize: 'vertical' }} />
            </div>
            <Input label="Localisation" value={location} onChange={e => setLocation(e.target.value)} placeholder="Paris, France" />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ minWidth: 0, paddingRight: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt1)' }}>Profil public</div>
                <div style={{ fontSize: 10, color: 'var(--txt2)' }}>Visible par les autres</div>
              </div>
              <div onClick={() => setIsPublic(p => !p)} style={{ width: 44, height: 24, borderRadius: 12, background: isPublic ? 'var(--a1)' : 'var(--bg4)', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: isPublic ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
              </div>
            </div>

            <Btn onClick={saveProfile} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? '⏳ Sauvegarde…' : '✅ Enregistrer le profil'}
            </Btn>
          </Card>

          <Card style={{ border: '1px solid rgba(244,63,94,0.2)' }}>
            <CardTitle>⚠️ Zone dangereuse</CardTitle>
            <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 12, lineHeight: 1.7 }}>
              Suppression irréversible de toutes tes données.
            </div>
            <button onClick={async () => {
              if (confirm('Es-tu sûr ? Cette action est irréversible.')) { await supabase.auth.signOut(); window.location.href = '/login' }
            }} style={{ padding: '9px 18px', borderRadius: 9, background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--a5)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Supprimer mon compte
            </button>
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 14 }}>
            <CardTitle>🏅 Profil sportif</CardTitle>
            <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select label="Sport favori" value={favoriteSport} onChange={e => setFavoriteSport(e.target.value)}>
                <option value="">— Aucun —</option>
                {sports.map(s => <option key={s.id} value={s.label}>{s.icon} {s.label}</option>)}
              </Select>
              <Select label="Niveau" value={level} onChange={e => setLevel(e.target.value)}>
                {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </Select>
            </div>
            <Input label="Objectif principal" value={mainGoal} onChange={e => setMainGoal(e.target.value)} placeholder="Ex: Courir un marathon…" />
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <CardTitle>🔗 Réseaux & liens</CardTitle>
            <Input label="Instagram" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@pseudo" />
            <Input label="Profil Strava" value={stravaProfile} onChange={e => setStravaProfile(e.target.value)} placeholder="https://strava.com/athletes/…" />
            <Input label="Site web" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://…" />
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <CardTitle>🔒 Sécurité</CardTitle>
            <Input label="Email" type="email" value={email} disabled style={{ opacity: 0.6 }} />
            <Input label="Nouveau mot de passe" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
            <Input label="Confirmer" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            <Btn onClick={changePassword} variant="outline" style={{ width: '100%', justifyContent: 'center' }} disabled={!newPassword}>
              Changer le mot de passe
            </Btn>
          </Card>

          <Card>
            <CardTitle>📊 Mes statistiques</CardTitle>
            <div className="two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                { label: 'Membre depuis', val: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—' },
                { label: 'Plan', val: profile?.plan === 'pro' ? '✦ Pro' : profile?.plan === 'premium' ? '★ Premium' : '○ Free' },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{val}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt2)', marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; }
          .two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
