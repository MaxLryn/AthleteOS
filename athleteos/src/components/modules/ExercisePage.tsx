'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, Topbar, Pill, Btn, Modal, ModalActions, Input, Select } from '@/components/ui'
import WorkoutPlans from './WorkoutPlans'
import type { Session, Sport, CalendarEvent } from '@/types'

interface Exercise {
  id: string; name: string; muscle_group: string; description: string; tips: string
  difficulty: string; equipment: string; is_custom: boolean; youtube_id?: string; steps?: string[]
  sets_beginner?: string; sets_intermediate?: string; sets_advanced?: string
  duration_beginner?: string; duration_intermediate?: string; duration_advanced?: string
}

interface Props {
  sessions: Session[]; sports: Sport[]
  addEvent: (data: Partial<CalendarEvent>) => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error') => void
  [key: string]: unknown
}

const MUSCLE_GROUPS = [
  { id: 'all', label: 'Tous', icon: '💪' }, { id: 'chest', label: 'Pectoraux', icon: '🫁' },
  { id: 'back', label: 'Dos', icon: '🔙' }, { id: 'shoulders', label: 'Épaules', icon: '🦾' },
  { id: 'arms', label: 'Bras', icon: '💪' }, { id: 'legs', label: 'Jambes', icon: '🦵' },
  { id: 'core', label: 'Abdos', icon: '⭕' }, { id: 'full_body', label: 'Full Body', icon: '🏃' },
]

const DIFFICULTY_COLORS: Record<string, string> = { beginner: '#22d3a0', intermediate: '#f59e0b', advanced: '#f43f5e' }
const DIFFICULTY_LABELS: Record<string, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' }

const BODYWEIGHT_EXERCISES: Exercise[] = [
  { id:'bw-1',name:'Pompes',muscle_group:'chest',equipment:'bodyweight',difficulty:'beginner',is_custom:false, description:'Exercice fondamental pour pectoraux, triceps et épaules.', tips:'Corps aligné, descends jusqu\'à frôler le sol.', steps:['Position planche, mains largeur épaules','Descends lentement','Poitrine près du sol','Pousse en expirant'], sets_beginner:'3 × 8-10', sets_intermediate:'4 × 15-20', sets_advanced:'5 × 25-30', youtube_id:'IODxDxX7oi4' },
  { id:'bw-2',name:'Tractions',muscle_group:'back',equipment:'bodyweight',difficulty:'intermediate',is_custom:false, description:'Roi des exercices pour le dos.', tips:'Prise pronation pour les dorsaux.', steps:['Barre bras tendus','Engage les épaules','Tire vers le menton','Descente lente'], sets_beginner:'3 × 3-5', sets_intermediate:'4 × 8-10', sets_advanced:'5 × 12-15', youtube_id:'eGo4IYlbE5g' },
  { id:'bw-3',name:'Squat',muscle_group:'legs',equipment:'bodyweight',difficulty:'beginner',is_custom:false, description:'Base pour quadriceps, fessiers, ischios.', tips:'Genoux dans l\'axe des pieds.', steps:['Pieds largeur épaules','Pousse les hanches en arrière','Parallèle au sol minimum','Pousse pour remonter'], sets_beginner:'3 × 15', sets_intermediate:'4 × 20-25', sets_advanced:'5 × 30', youtube_id:'aclHkVaku9U' },
  { id:'bw-4',name:'Planche',muscle_group:'core',equipment:'bodyweight',difficulty:'beginner',is_custom:false, description:'Gainage isométrique complet.', tips:'Corps rigide, respire normalement.', steps:['Appui avant-bras et orteils','Bassin soulevé, aligné','Contracte abdos et fessiers','Maintiens'], duration_beginner:'3 × 20-30 sec', duration_intermediate:'3 × 45-60 sec', duration_advanced:'4 × 90 sec+', youtube_id:'pSHjTRCQxIw' },
  { id:'bw-5',name:'Burpee',muscle_group:'full_body',equipment:'bodyweight',difficulty:'intermediate',is_custom:false, description:'Full body intense, cardio.', tips:'Qualité avant vitesse.', steps:['Debout, pieds largeur épaules','Mains au sol','Pieds en arrière','Pompe, saut'], sets_beginner:'3 × 5', sets_intermediate:'3 × 10', sets_advanced:'4 × 15', youtube_id:'dZgVxmf6jkA' },
  { id:'bw-6',name:'Élastique — Rowing',muscle_group:'back',equipment:'cable',difficulty:'beginner',is_custom:false, description:'Simulation rowing, cible le dos.', tips:'Serre les omoplates.', steps:['Élastique hauteur taille','Bras tendus','Tire vers le ventre','Resserre omoplates'], sets_beginner:'3 × 12', sets_intermediate:'4 × 15', sets_advanced:'4 × 20', youtube_id:'GZbfZ033f74' },
  { id:'bw-7',name:'Élastique — Squats',muscle_group:'legs',equipment:'cable',difficulty:'beginner',is_custom:false, description:'Squat avec résistance.', tips:'Sous pieds et épaules.', steps:['Élastique sous pieds','Pieds largeur épaules','Squat complet','Remonte'], sets_beginner:'3 × 12', sets_intermediate:'4 × 15', sets_advanced:'4 × 20', youtube_id:'YaXPRqUwItQ' },
  { id:'bw-8',name:'Mountain Climbers',muscle_group:'core',equipment:'bodyweight',difficulty:'intermediate',is_custom:false, description:'Gainage dynamique + cardio.', tips:'Hanches basses et stables.', steps:['Position pompe haute','Genou vers la poitrine','Alterne rapidement','Hanches stables'], duration_beginner:'3 × 20 sec', duration_intermediate:'3 × 40 sec', duration_advanced:'4 × 60 sec', youtube_id:'nmwgirgXLYM' },
]

const EQUIPMENT_EXERCISES: Exercise[] = [
  { id:'eq-1',name:'Développé couché',muscle_group:'chest',equipment:'barbell',difficulty:'intermediate',is_custom:false, description:'Roi pour les pectoraux.', tips:'Pieds au sol, descends à la poitrine.', steps:['Barre au-dessus de la poitrine','Décartèle légèrement','Descends (3 sec)','Pousse explosif'], sets_beginner:'3 × 8', sets_intermediate:'4 × 6-8', sets_advanced:'5 × 3-5', youtube_id:'vcBig73ojpE' },
  { id:'eq-2',name:'Squat barre',muscle_group:'legs',equipment:'barbell',difficulty:'intermediate',is_custom:false, description:'Le plus complet pour les jambes.', tips:'Barre sur les trapèzes.', steps:['Pieds largeur épaules','Inspire, bloque le souffle','Cuisse parallèle','Pousse dans le sol'], sets_beginner:'3 × 10', sets_intermediate:'4 × 6-8', sets_advanced:'5 × 3-5', youtube_id:'ultWZbUMPL8' },
  { id:'eq-3',name:'Soulevé de terre',muscle_group:'back',equipment:'barbell',difficulty:'advanced',is_custom:false, description:'L\'exercice roi de la force.', tips:'Dos plat impératif.', steps:['Pieds sous la barre','Hanches basses, dos plat','Pousse dans le sol','Verrouille en haut'], sets_beginner:'3 × 5', sets_intermediate:'4 × 4-5', sets_advanced:'5 × 1-3', youtube_id:'op9kVnSso6Q' },
  { id:'eq-4',name:'Rowing haltères',muscle_group:'back',equipment:'dumbbell',difficulty:'beginner',is_custom:false, description:'Unilatéral, corrige déséquilibres.', tips:'Tire le coude vers le haut.', steps:['Genou et main sur le banc','Dos plat','Tire le coude','Descente lente'], sets_beginner:'3 × 10/côté', sets_intermediate:'4 × 12/côté', sets_advanced:'4 × 15/côté', youtube_id:'pYcpY20QaE8' },
  { id:'eq-5',name:'Hip Thrust',muscle_group:'legs',equipment:'barbell',difficulty:'intermediate',is_custom:false, description:'Roi pour les fessiers.', tips:'Contracte fort en haut.', steps:['Épaules sur le banc','Barre sur les hanches','Pousse explosif','Contracte 1 sec'], sets_beginner:'3 × 12', sets_intermediate:'4 × 10-12', sets_advanced:'5 × 8-10', youtube_id:'SEdqd9MIsAA' },
]

const EQUIPMENT_ICONS: Record<string, string> = { barbell:'🏋️',dumbbell:'💪',machine:'⚙️',bodyweight:'🤸',cable:'🎯',other:'🔧' }
const EQUIPMENT_LABELS: Record<string, string> = { barbell:'Barre',dumbbell:'Haltères',machine:'Machine',bodyweight:'Poids du corps',cable:'Élastique',other:'Autre' }

function ExerciseCard({ ex, onClick }: { ex: Exercise; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', cursor: 'pointer', borderTop: `3px solid ${DIFFICULTY_COLORS[ex.difficulty]}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 22 }}>{EQUIPMENT_ICONS[ex.equipment]}</div>
        <Pill color={DIFFICULTY_COLORS[ex.difficulty]}>{DIFFICULTY_LABELS[ex.difficulty]}</Pill>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', marginBottom: 4 }}>{ex.name}</div>
      <div style={{ fontSize: 10, color: 'var(--txt2)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{MUSCLE_GROUPS.find(g => g.id === ex.muscle_group)?.icon}</span>
        <span>{MUSCLE_GROUPS.find(g => g.id === ex.muscle_group)?.label}</span>
      </div>
    </div>
  )
}

function ExerciseDetail({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  return (
    <Modal open={!!ex} onClose={onClose} title={ex.name}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Pill color={DIFFICULTY_COLORS[ex.difficulty]}>{DIFFICULTY_LABELS[ex.difficulty]}</Pill>
        <Pill color="var(--a1)">{EQUIPMENT_ICONS[ex.equipment]} {EQUIPMENT_LABELS[ex.equipment]}</Pill>
      </div>
      {ex.youtube_id && (
        <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
          <iframe width="100%" height="200" src={`https://www.youtube.com/embed/${ex.youtube_id}?rel=0&modestbranding=1`} title={ex.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ display: 'block' }} />
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7, marginBottom: 14 }}>{ex.description}</div>
      {ex.steps && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {ex.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--a1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontSize: 12, color: 'var(--txt1)', lineHeight: 1.6, paddingTop: 2 }}>{step}</div>
            </div>
          ))}
        </div>
      )}
      {ex.tips && (
        <div style={{ background: 'rgba(79,142,247,.08)', border: '1px solid rgba(79,142,247,.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--a1)', fontWeight: 600, marginBottom: 6 }}>💡 Conseils</div>
          <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.7 }}>{ex.tips}</div>
        </div>
      )}
      <div className="vol-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {[
          { level: 'Débutant', val: ex.sets_beginner || ex.duration_beginner, col: '#22d3a0' },
          { level: 'Intermédiaire', val: ex.sets_intermediate || ex.duration_intermediate, col: '#f59e0b' },
          { level: 'Avancé', val: ex.sets_advanced || ex.duration_advanced, col: '#f43f5e' },
        ].map(({ level, val, col }) => (
          <div key={level} style={{ background: col + '12', border: `1px solid ${col}30`, borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: col, fontWeight: 600, marginBottom: 3 }}>{level}</div>
            <div style={{ fontSize: 11, color: 'var(--txt1)' }}>{val || '—'}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}><Btn onClick={onClose}>Fermer</Btn></div>
      <style jsx>{`@media (max-width: 480px) { .vol-grid { grid-template-columns: 1fr !important; } }`}</style>
    </Modal>
  )
}

export default function ExercisePage({ sessions, sports, addEvent, showToast }: Props) {
  const [tab, setTab]           = useState<'bodyweight' | 'equipment'>('bodyweight')
  const [view, setView]         = useState<'exercises' | 'workouts'>('exercises')
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [addModal, setAddModal] = useState(false)
  const [aiRec, setAiRec]       = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [newName, setNewName]   = useState('')
  const [newGroup, setNewGroup] = useState('chest')
  const [newDesc, setNewDesc]   = useState('')
  const [newTips, setNewTips]   = useState('')
  const [newDiff, setNewDiff]   = useState('intermediate')
  const [newEquip, setNewEquip] = useState('bodyweight')
  const [saving, setSaving]     = useState(false)

  const baseList = tab === 'bodyweight' ? BODYWEIGHT_EXERCISES : EQUIPMENT_EXERCISES
  const filtered = baseList.filter(e => {
    const matchGroup = filter === 'all' || e.muscle_group === filter
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
    return matchGroup && matchSearch
  })

  useEffect(() => { getAiRecommendations() }, [tab, sessions])

  async function getAiRecommendations() {
    if (sessions.length === 0) return
    setAiLoading(true)
    const context = `Coach muscu expert. ${sessions.length} séances. Onglet: ${tab === 'bodyweight' ? 'Poids du corps' : 'Avec matériel'}. Exercices: ${baseList.map(e => e.name).join(', ')}. Donne 3 recommandations courtes en français. Format: "**Nom** — raison".`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400, messages: [{ role: 'user', content: context }] }) })
      const data = await res.json()
      setAiRec(data.content?.[0]?.text || '')
    } catch { setAiRec('') }
    setAiLoading(false)
  }

  async function addCustomExercise() {
    if (!newName) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('exercises').insert({ user_id: user.id, name: newName, muscle_group: newGroup, description: newDesc, tips: newTips, difficulty: newDiff, equipment: newEquip, is_custom: true })
    showToast('Exercice ajouté ! 💪')
    setAddModal(false); setNewName(''); setNewDesc(''); setNewTips(''); setSaving(false)
  }

  return (
    <div>
      <Topbar title="Exercices" subtitle={view === 'exercises' ? `${baseList.length} exercices` : 'Programmes prêts'} action={view === 'exercises' ? { label: 'Ajouter', fn: () => setAddModal(true) } : undefined} />
      <div className="page-pad">

        <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 12, overflowX: 'auto' }}>
          {[{ id: 'exercises' as const, icon: '📋', label: 'Exercices' }, { id: 'workouts' as const, icon: '📅', label: 'Programmes' }].map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{ padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: view === v.id ? 'var(--a2)' : 'transparent', color: view === v.id ? '#fff' : 'var(--txt2)', fontSize: 12, fontWeight: view === v.id ? 600 : 400, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>{v.icon} {v.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 14, overflowX: 'auto' }}>
          {[{ id: 'bodyweight' as const, icon: '🤸', label: 'Poids du corps' }, { id: 'equipment' as const, icon: '🏋️', label: 'Avec matériel' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setFilter('all') }} style={{ padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: tab === t.id ? 'var(--a1)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--txt2)', fontSize: 12, fontWeight: tab === t.id ? 600 : 400, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {view === 'exercises' && (
          <>
            <div style={{ background: 'linear-gradient(135deg,var(--bg2),var(--bg3))', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--a1),var(--a2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, flex: 1, minWidth: 0 }}>Recommandé pour toi</div>
                <Btn onClick={getAiRecommendations} disabled={aiLoading} variant="outline" style={{ fontSize: 10, padding: '6px 10px' }}>{aiLoading ? '⏳' : '🔄'}</Btn>
              </div>
              {aiLoading ? <div style={{ fontSize: 12, color: 'var(--txt2)', fontStyle: 'italic' }}>Analyse…</div>
                : aiRec ? <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{aiRec}</div>
                : <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Ajoute des séances pour des recommandations.</div>}
            </div>

            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher…" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, outline: 'none', marginBottom: 10 }} />

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
              {MUSCLE_GROUPS.map(g => (
                <button key={g.id} onClick={() => setFilter(g.id)} style={{ padding: '6px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 11, flexShrink: 0, border: `1px solid ${filter === g.id ? 'var(--a1)' : 'var(--border2)'}`, background: filter === g.id ? 'rgba(79,142,247,.12)' : 'var(--bg3)', color: filter === g.id ? 'var(--a1)' : 'var(--txt2)', whiteSpace: 'nowrap' }}>{g.icon} {g.label}</button>
              ))}
            </div>

            <div className="ex-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {filtered.map(ex => <ExerciseCard key={ex.id} ex={ex} onClick={() => setSelected(ex)} />)}
            </div>
            {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--txt3)', fontSize: 13 }}>Aucun résultat</div>}
          </>
        )}

        {view === 'workouts' && <WorkoutPlans category={tab} sports={sports} addEvent={addEvent} showToast={showToast} />}
      </div>

      {selected && <ExerciseDetail ex={selected} onClose={() => setSelected(null)} />}

      <Modal open={addModal} onClose={() => setAddModal(false)} title="➕ Ajouter un exercice">
        <Input label="Nom" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Curl marteau" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Groupe" value={newGroup} onChange={e => setNewGroup(e.target.value)}>
            {MUSCLE_GROUPS.filter(g => g.id !== 'all').map(g => <option key={g.id} value={g.id}>{g.icon} {g.label}</option>)}
          </Select>
          <Select label="Équipement" value={newEquip} onChange={e => setNewEquip(e.target.value)}>
            <option value="bodyweight">🤸 Poids du corps</option><option value="cable">🎯 Élastique</option>
            <option value="barbell">🏋️ Barre</option><option value="dumbbell">💪 Haltères</option><option value="machine">⚙️ Machine</option>
          </Select>
        </div>
        <Select label="Difficulté" value={newDiff} onChange={e => setNewDiff(e.target.value)}>
          <option value="beginner">🟢 Débutant</option><option value="intermediate">🟡 Intermédiaire</option><option value="advanced">🔴 Avancé</option>
        </Select>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Description</label>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, outline: 'none', minHeight: 60, resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Conseils</label>
          <textarea value={newTips} onChange={e => setNewTips(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, outline: 'none', minHeight: 60, resize: 'vertical' }} />
        </div>
        <ModalActions onCancel={() => setAddModal(false)} onConfirm={addCustomExercise} loading={saving} confirmLabel="Ajouter" />
      </Modal>

      <style jsx>{`
        @media (max-width: 768px) { .ex-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 420px) { .ex-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
