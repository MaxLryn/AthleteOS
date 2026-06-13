'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, Topbar, Pill, Btn, Modal, ModalActions } from '@/components/ui'
import SessionModal from './SessionModal'
import type { Sport, Session, SportCriteria } from '@/types'

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
  const [criteriaModal, setCriteriaModal] = useState(false)
  const [filter, setFilter]     = useState('all')
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [newSport, setNewSport] = useState({ label: '', icon: '⭐', color: '#4f8ef7', is_default: false })
  const [criteria, setCriteria] = useState<SportCriteria[]>([])
  const [newCriteriaLabel, setNewCriteriaLabel] = useState('')
  const [newCriteriaIcon, setNewCriteriaIcon] = useState('⭐')
  const [savingCriteria, setSavingCriteria] = useState(false)

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.sport_id === filter)
  const criteriaSportId = filter !== 'all' ? filter : sports[0]?.id

  useEffect(() => { loadCriteria() }, [])

  async function loadCriteria() {
    const { data } = await supabase.from('sport_criteria').select('*').order('position')
    if (data) setCriteria(data as SportCriteria[])
  }

  async function addCriteria() {
    if (!newCriteriaLabel || !criteriaSportId) return
    setSavingCriteria(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const existingForSport = criteria.filter(c => c.sport_id === criteriaSportId)
    const { data, error } = await supabase.from('sport_criteria').insert({
      user_id: user.id, sport_id: criteriaSportId, label: newCriteriaLabel,
      icon: newCriteriaIcon, position: existingForSport.length,
    }).select().single()
    if (!error && data) {
      setCriteria(prev => [...prev, data as SportCriteria])
      setNewCriteriaLabel(''); setNewCriteriaIcon('⭐')
      showToast('Critère ajouté ! ✅')
    } else if (error) showToast(error.message, 'error')
    setSavingCriteria(false)
  }

  async function deleteCriteria(id: string) {
    if (!confirm('Supprimer ce critère ?')) return
    const { error } = await supabase.from('sport_criteria').delete().eq('id', id)
    if (!error) { setCriteria(prev => prev.filter(c => c.id !== id)); showToast('Critère supprimé') }
    else showToast(error.message, 'error')
  }

  async function handleSave(data: Partial<Session>) {
    if (editingSession) {
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

  const currentSport = sports.find(s => s.id === criteriaSportId)
  const currentSportCriteria = criteria.filter(c => c.sport_id === criteriaSportId)

  return (
    <div>
      <Topbar title="Séances" subtitle={`${sessions.length} séance${sessions.length > 1 ? 's' : ''} enregistrée${sessions.length > 1 ? 's' : ''}`} action={{ label: 'Ajouter une séance', fn: openNew }} />

      <div style={{ padding: '0 28px 28px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
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

        {/* Criteria management button */}
        {criteriaSportId && (
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => setCriteriaModal(true)} style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--txt2)', fontFamily: 'DM Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              🎛️ Critères {currentSport?.icon} {currentSport?.label}
              {currentSportCriteria.length > 0 && <Pill color="var(--a1)">{currentSportCriteria.length}</Pill>}
            </button>
          </div>
        )}

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
          const sCriteria = criteria.filter(c => c.sport_id === s.sport_id)
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
                {sCriteria.length > 0 && s.custom_ratings && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {sCriteria.map(c => s.custom_ratings?.[c.id] != null && (
                      <span key={c.id} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--txt2)' }}>
                        {c.icon} {c.label}: {s.custom_ratings![c.id]}/10
                      </span>
                    ))}
                  </div>
                )}
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

      <SessionModal open={modal} onClose={() => { setModal(false); setEditingSession(null) }} sports={sports} criteria={criteria} onSave={handleSave} editSession={editingSession} />

      {/* Criteria management modal */}
      <Modal open={criteriaModal} onClose={() => setCriteriaModal(false)} title={`🎛️ Critères ${currentSport?.icon || ''} ${currentSport?.label || ''}`}>
        <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 16, lineHeight: 1.7 }}>
          Ajoute des critères personnalisés (en plus de l'énergie et la fatigue) pour le sport <strong style={{ color: 'var(--txt1)' }}>{currentSport?.label}</strong>. Exemple : coup droit, revers, service…
        </div>

        {currentSportCriteria.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {currentSportCriteria.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--txt1)' }}>{c.icon} {c.label}</span>
                <button onClick={() => deleteCriteria(c.id)} style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', fontSize: 13 }}>🗑️</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ width: 70 }}>
            <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Icône</label>
            <input value={newCriteriaIcon} onChange={e => setNewCriteriaIcon(e.target.value)} style={{ width: '100%', padding: '10px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 18, outline: 'none', textAlign: 'center' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Nom du critère</label>
            <input value={newCriteriaLabel} onChange={e => setNewCriteriaLabel(e.target.value)} placeholder="Ex: Coup droit, Service, Endurance…" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
          </div>
          <Btn onClick={addCriteria} disabled={savingCriteria || !newCriteriaLabel}>{savingCriteria ? '…' : '+ Ajouter'}</Btn>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Btn onClick={() => setCriteriaModal(false)}>Fermer</Btn>
        </div>
      </Modal>

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
