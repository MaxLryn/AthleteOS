'use client'
import { useState } from 'react'
import { Card, Topbar, Pill } from '@/components/ui'
import SessionModal from './SessionModal'
import type { Sport, Session } from '@/types'

interface Props {
  sports: Sport[]
  sessions: Session[]
  addSession: (data: Partial<Session>) => Promise<void>
  addSport: (data: Omit<Sport, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  setSessions: (s: Session[]) => void
  showToast: (msg: string, type?: 'success' | 'error') => void
  [key: string]: unknown
}

export default function SessionsPage({ sports, sessions, addSession, addSport, setSessions, showToast }: Props) {
  const [modal, setModal]       = useState(false)
  const [sportModal, setSportModal] = useState(false)
  const [filter, setFilter]     = useState('all')
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [newSport, setNewSport] = useState({ label: '', icon: '⭐', color: '#4f8ef7', is_default: false })

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.sport_id === filter)

  async function handleSave(data: Partial<Session>) {
    if (editingSession) {
      const { supabase } = await import('@/lib/supabase')
      const { data: updated, error } = await supabase
        .from('sessions')
        .update(data)
        .eq('id', editingSession.id)
        .select('*, sport:sports(*)')
        .single()
      if (!error && updated) {
        setSessions(sessions.map(s => s.id === editingSession.id ? (updated as Session) : s))
        showToast('Séance modifiée ✅')
      } else if (error) showToast(error.message, 'error')
      setEditingSession(null)
    } else {
      await addSession(data)
    }
  }

  async function deleteSession(s: Session, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Supprimer cette séance ?')) return
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('sessions').delete().eq('id', s.id)
    if (!error) {
      setSessions(sessions.filter(x => x.id !== s.id))
      showToast('Séance supprimée')
    } else showToast(error.message, 'error')
  }

  function openEdit(s: Session, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingSession(s)
    setModal(true)
  }

  function openNew() {
    setEditingSession(null)
    setModal(true)
  }

  return (
    <div>
      <Topbar title="Séances" subtitle={`${sessions.length} séance${sessions.length > 1 ? 's' : ''} enregistrée${sessions.length > 1 ? 's' : ''}`} action={{ label: 'Ajouter une séance', fn: openNew }} />

      <div style={{ padding: '0 28px 28px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {[{ id: 'all', label: 'Toutes', icon: '📋' }, ...sports].map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)} style={{
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'DM Sans, sans-serif',
              border: `1px solid ${filter === s.id ? 'var(--a1)' : 'var(--border2)'}`,
              background: filter === s.id ? 'rgba(79,142,247,.12)' : 'var(--bg3)',
              color: filter === s.id ? 'var(--a1)' : 'var(--txt2)',
            }}>
              <span>{s.icon || '📋'}</span>{s.label}
            </button>
          ))}
          <button onClick={() => setSportModal(true)} style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, border: '1px dashed var(--border2)', background: 'transparent', color: 'var(--txt3)', fontFamily: 'DM Sans, sans-serif' }}>
            ➕ Nouveau sport
          </button>
        </div>

        {/* Session list */}
        {filtered.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💪</div>
            <div style={{ fontSize: 15, color: 'var(--txt1)', marginBottom: 8 }}>Aucune séance encore</div>
            <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 20 }}>Enregistre ta première séance pour commencer ton suivi</div>
            <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 9, background: 'var(--a1)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer' }}>+ Ajouter une séance</button>
          </Card>
        ) : filtered.map(s => {
          const sp = sports.find(x => x.id === s.sport_id)
          return (
            <div key={s.id} onClick={e => openEdit(s, e)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all .15s' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: (sp?.color || 'var(--a1)') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {sp?.icon || '🏅'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)' }}>{sp?.label || 'Sport'}{s.type ? ` — ${s.type}` : ''}</span>
                  {s.note?.includes('PR') && <Pill color="var(--a3)">🏅 PR</Pill>}
                  {s.result === 'win'  && <Pill color="var(--a3)">✓ Victoire</Pill>}
                  {s.result === 'loss' && <Pill color="var(--a5)">✗ Défaite</Pill>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt2)' }}>
                  {s.date} · {s.duration} min
                  {s.distance ? ` · ${s.distance} km` : ''}
                  {s.pace ? ` · ${s.pace}/km` : ''}
                  {s.heart_rate ? ` · ❤️ ${s.heart_rate} bpm` : ''}
                  {s.score_text ? ` · ${s.score_text}` : ''}
                  {s.goals_scored != null ? ` · ⚽ ${s.goals_scored} but(s)` : ''}
                </div>
                {s.note && <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>{s.note}</div>}
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>Énergie</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--a3)' }}>{s.energy || '—'}/10</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>Fatigue</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: (s.fatigue || 0) > 7 ? 'var(--a5)' : 'var(--a4)' }}>{s.fatigue || '—'}/10</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={e => openEdit(s, e)} title="Modifier" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg4)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                  <button onClick={e => deleteSession(s, e)} title="Supprimer" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(244,63,94,.25)', background: 'rgba(244,63,94,.08)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <SessionModal open={modal} onClose={() => { setModal(false); setEditingSession(null) }} sports={sports} onSave={handleSave} editSession={editingSession} />

      {/* Sport modal */}
      {sportModal && (
        <div onClick={() => setSportModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 420 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--txt1)', marginBottom: 20 }}>⭐ Ajouter un sport</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Nom du sport</label>
              <input value={newSport.label} onChange={e => setNewSport(s => ({ ...s, label: e.target.value }))} placeholder="Natation, Yoga, Boxe…" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Icône (emoji)</label>
                <input value={newSport.icon} onChange={e => setNewSport(s => ({ ...s, icon: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 18, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Couleur</label>
                <input type="color" value={newSport.color} onChange={e => setNewSport(s => ({ ...s, color: e.target.value }))} style={{ width: '100%', height: 42, padding: '4px 8px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, cursor: 'pointer' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setSportModal(false)} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--txt2)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Annuler</button>
              <button onClick={async () => { if (newSport.label) { await addSport(newSport); setSportModal(false); setNewSport({ label: '', icon: '⭐', color: '#4f8ef7', is_default: false }) } }} style={{ padding: '9px 18px', borderRadius: 9, background: 'var(--a1)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
