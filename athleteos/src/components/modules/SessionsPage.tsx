'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, Topbar, Pill, Btn, Modal } from '@/components/ui'
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
        .from('sessions').update(data).eq('id', editingSession.id)
        .select('*, sport:sports(*)').single()
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
    if (!error) { setSessions(sessions.filter(x => x.id !== s.id)); showToast('Séance supprimée') }
    else showToast(error.message, 'error')
  }

  function openEdit(s: Session, e: React.MouseEvent) { e.stopPropagation(); setEditingSession(s); setModal(true) }
  function openNew() { setEditingSession(null); setModal(true) }

  const currentSport = sports.find(s => s.id === criteriaSportId)
  const currentSportCriteria = criteria.filter(c => c.sport_id === criteriaSportId)

  return (
    <div>
      <Topbar title="Séances" subtitle={`${sessions.length} séance${sessions.length > 1 ? 's' : ''} enregistrée${sessions.length > 1 ? 's' : ''}`} action={{ label: 'Ajouter', fn: openNew }} />

      <div className="page-pad">
        {/* Filters — horizontal scroll on mobile */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
          {[{ id: 'all', label: 'Toutes', icon: '📋' }, ...sports].map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)} style={{
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'DM Sans, sans-serif',
              border: `1px solid ${filter === s.id ? 'var(--a1)' : 'var(--border2)'}`,
              background: filter === s.id ? 'rgba(79,142,247,.12)' : 'var(--bg3)',
              color: filter === s.id ? 'var(--a1)' : 'var(--txt2)',
              whiteSpace: 'nowrap',
            }}>
              <span>{s.icon || '📋'}</span>{s.label}
            </button>
          ))}
          <button onClick={() => setSportModal(true)} style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, flexShrink: 0, border: '1px dashed var(--border2)', background: 'transparent', color: 'var(--txt3)', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
            ➕ Sport
          </button>
        </div>

        {criteriaSportId && (
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => setCriteriaModal(true)} style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--txt2)', fontFamily: 'DM Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              🎛️ Critères {currentSport?.icon} {currentSport?.label}
              {currentSportCriteria.length > 0 && <Pill color="var(--a1)">{currentSportCriteria.length}</Pill>}
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💪</div>
            <div style={{ fontSize: 14, color: 'var(--txt1)', marginBottom: 6 }}>Aucune séance encore</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 16 }}>Enregistre ta première séance</div>
            <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 9, background: 'var(--a1)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer' }}>+ Ajouter une séance</button>
          </Card>
        ) : filtered.map(s => {
          const sp = sports.find(x => x.id === s.sport_id)
          const sCriteria = criteria.filter(c => c.sport_id === s.sport_id)
          return (
            <div key={s.id} onClick={e => openEdit(s, e)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: (sp?.color || 'var(--a1)') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {sp?.icon || '🏅'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{sp?.label || 'Sport'}{s.type ? ` — ${s.type}` : ''}</span>
                    {s.result === 'win'  && <Pill color="var(--a3)">✓</Pill>}
                    {s.result === 'loss' && <Pill color="var(--a5)">✗</Pill>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)' }}>
                    {s.date} · {s.duration} min
                    {s.distance ? ` · ${s.distance}km` : ''}
                    {s.score_text ? ` · ${s.score_text}` : ''}
                  </div>
                  {s.note && <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 3 }}>{s.note}</div>}
                  {sCriteria.length > 0 && s.custom_ratings && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                      {sCriteria.map(c => s.custom_ratings?.[c.id] != null && (
                        <span key={c.id} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--txt2)' }}>
                          {c.icon} {s.custom_ratings![c.id]}/10
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--a3)' }}>E{s.energy || '—'}</span>
                    <span style={{ fontSize: 10, color: 'var(--a4)' }}>F{s.fatigue || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={e => openEdit(s, e)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--bg4)', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                    <button onClick={e => deleteSession(s, e)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(244,63,94,.25)', background: 'rgba(244,63,94,.08)', cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <SessionModal open={modal} onClose={() => { setModal(false); setEditingSession(null) }} sports={sports} criteria={criteria} onSave={handleSave} editSession={editingSession} />

      <Modal open={criteriaModal} onClose={() => setCriteriaModal(false)} title={`🎛️ Critères ${currentSport?.icon || ''} ${currentSport?.label || ''}`}>
        <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 16, lineHeight: 1.7 }}>
          Ajoute des critères personnalisés pour <strong style={{ color: 'var(--txt1)' }}>{currentSport?.label}</strong>.
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 70 }}>
            <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Icône</label>
            <input value={newCriteriaIcon} onChange={e => setNewCriteriaIcon(e.target.value)} style={{ width: '100%', padding: '10px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 18, outline: 'none', textAlign: 'center' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Nom</label>
            <input value={newCriteriaLabel} onChange={e => setNewCriteriaLabel(e.target.value)} placeholder="Coup droit, Service…" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
          </div>
          <Btn onClick={addCriteria} disabled={savingCriteria || !newCriteriaLabel}>{savingCriteria ? '…' : '+ Ajouter'}</Btn>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Btn onClick={() => setCriteriaModal(false)}>Fermer</Btn>
        </div>
      </Modal>

      <Modal open={sportModal} onClose={() => setSportModal(false)} title="⭐ Ajouter un sport">
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Nom du sport</label>
          <input value={newSport.label} onChange={e => setNewSport(s => ({ ...s, label: e.target.value }))} placeholder="Natation, Yoga, Boxe…" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Icône</label>
            <input value={newSport.icon} onChange={e => setNewSport(s => ({ ...s, icon: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 18, outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Couleur</label>
            <input type="color" value={newSport.color} onChange={e => setNewSport(s => ({ ...s, color: e.target.value }))} style={{ width: '100%', height: 42, padding: '4px 8px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, cursor: 'pointer' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="outline" onClick={() => setSportModal(false)}>Annuler</Btn>
          <Btn onClick={async () => { if (newSport.label) { await addSport(newSport); setSportModal(false); setNewSport({ label: '', icon: '⭐', color: '#4f8ef7', is_default: false }) } }}>Ajouter</Btn>
        </div>
      </Modal>
    </div>
  )
}
