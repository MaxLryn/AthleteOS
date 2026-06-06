'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle, Topbar, Pill, Btn, Modal, ModalActions, Input, Select } from '@/components/ui'
import type { Session, Sport } from '@/types'

interface Exercise {
  id: string
  name: string
  muscle_group: string
  description: string
  tips: string
  difficulty: string
  equipment: string
  is_custom: boolean
}

interface Props {
  sessions: Session[]
  sports: Sport[]
  showToast: (msg: string, type?: 'success' | 'error') => void
  [key: string]: unknown
}

const MUSCLE_GROUPS = [
  { id: 'all',       label: 'Tous',          icon: '💪' },
  { id: 'chest',     label: 'Pectoraux',     icon: '🫁' },
  { id: 'back',      label: 'Dos',           icon: '🔙' },
  { id: 'shoulders', label: 'Épaules',       icon: '🦾' },
  { id: 'arms',      label: 'Bras',          icon: '💪' },
  { id: 'legs',      label: 'Jambes',        icon: '🦵' },
  { id: 'core',      label: 'Abdos/Gainage', icon: '⭕' },
  { id: 'cardio',    label: 'Cardio',        icon: '🏃' },
]

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#22d3a0', intermediate: '#f59e0b', advanced: '#f43f5e'
}
const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé'
}
const EQUIPMENT_ICONS: Record<string, string> = {
  barbell: '🏋️', dumbbell: '💪', machine: '⚙️', bodyweight: '🤸', cable: '🔗', other: '🔧'
}

export default function ExercisePage({ sessions, sports, showToast }: Props) {
  const [exercises, setExercises]   = useState<Exercise[]>([])
  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<Exercise | null>(null)
  const [addModal, setAddModal]     = useState(false)
  const [aiRec, setAiRec]           = useState<string>('')
  const [aiLoading, setAiLoading]   = useState(false)
  const [loading, setLoading]       = useState(true)

  // New exercise form
  const [newName, setNewName]     = useState('')
  const [newGroup, setNewGroup]   = useState('chest')
  const [newDesc, setNewDesc]     = useState('')
  const [newTips, setNewTips]     = useState('')
  const [newDiff, setNewDiff]     = useState('intermediate')
  const [newEquip, setNewEquip]   = useState('barbell')
  const [saving, setSaving]       = useState(false)

  useEffect(() => { loadExercises() }, [])
  useEffect(() => { if (exercises.length > 0 && sessions.length > 0) getAiRecommendations() }, [exercises, sessions])

  async function loadExercises() {
    const { data } = await supabase.from('exercises').select('*').order('name')
    if (data) setExercises(data as Exercise[])
    setLoading(false)
  }

  async function getAiRecommendations() {
    setAiLoading(true)
    // Build context from recent sessions
    const recent = sessions.slice(0, 10)
    const musclesWorked = recent.flatMap(s => {
      if (!s.exercises) return []
      return (s.exercises as any[]).map((e: any) => e.name)
    })
    const lastExerciseNames = [...new Set(musclesWorked)].slice(0, 8).join(', ')
    const muscleCounts: Record<string, number> = {}
    recent.forEach(s => {
      if (s.exercises) {
        (s.exercises as any[]).forEach((e: any) => {
          const ex = exercises.find(x => x.name === e.name)
          if (ex) muscleCounts[ex.muscle_group] = (muscleCounts[ex.muscle_group] || 0) + 1
        })
      }
    })
    const leastWorked = Object.entries(muscleCounts).sort((a,b) => a[1]-b[1]).map(([k]) => k)
    const context = `Tu es un coach musculation expert. 
L'athlète a fait ${sessions.length} séances au total.
Derniers exercices effectués : ${lastExerciseNames || 'aucun encore'}.
Groupes musculaires les moins travaillés : ${leastWorked.slice(0,3).join(', ') || 'inconnu'}.
Exercices disponibles : ${exercises.slice(0,20).map(e=>e.name).join(', ')}.
Donne 3 recommandations d'exercices précises avec une phrase d'explication chacune. Sois concis et motivant. Réponds en français.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{ role: 'user', content: context }]
        })
      })
      const data = await res.json()
      setAiRec(data.content?.[0]?.text || '')
    } catch {
      setAiRec('Varie tes exercices et assure-toi de travailler tous les groupes musculaires régulièrement.')
    }
    setAiLoading(false)
  }

  async function addCustomExercise() {
    if (!newName) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('exercises').insert({
      user_id: user.id, name: newName, muscle_group: newGroup,
      description: newDesc, tips: newTips, difficulty: newDiff,
      equipment: newEquip, is_custom: true,
    }).select().single()
    if (!error && data) {
      setExercises(prev => [...prev, data as Exercise].sort((a,b) => a.name.localeCompare(b.name)))
      showToast('Exercice ajouté ! 💪')
      setAddModal(false)
      setNewName(''); setNewDesc(''); setNewTips('')
    } else showToast(error?.message || 'Erreur', 'error')
    setSaving(false)
  }

  const filtered = exercises.filter(e => {
    const matchGroup = filter === 'all' || e.muscle_group === filter
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
    return matchGroup && matchSearch
  })

  return (
    <div>
      <Topbar title="Bibliothèque d'exercices" subtitle={`${exercises.length} exercices disponibles`} action={{ label: 'Ajouter un exercice', fn: () => setAddModal(true) }} />
      <div style={{ padding: '0 28px 28px' }}>

        {/* AI Recommendations */}
        <Card style={{ background: 'linear-gradient(135deg,var(--bg2),var(--bg3))', marginBottom: 16, border: '1px solid rgba(168,85,247,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--a1),var(--a2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15 }}>Recommandations personnalisées</div>
              <div style={{ fontSize: 11, color: 'var(--txt3)' }}>Basées sur tes {sessions.length} séances précédentes</div>
            </div>
            <Btn onClick={getAiRecommendations} disabled={aiLoading} variant="outline" style={{ marginLeft: 'auto', fontSize: 12 }}>
              {aiLoading ? '⏳' : '🔄'} Actualiser
            </Btn>
          </div>
          {aiLoading ? (
            <div style={{ fontSize: 13, color: 'var(--txt2)', fontStyle: 'italic' }}>⏳ Analyse de tes séances en cours…</div>
          ) : aiRec ? (
            <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{aiRec}</div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--txt3)' }}>Ajoute des séances pour obtenir des recommandations personnalisées.</div>
          )}
        </Card>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher un exercice…"
            style={{ flex: 1, minWidth: 200, padding: '9px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {MUSCLE_GROUPS.map(g => (
            <button key={g.id} onClick={() => setFilter(g.id)} style={{
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
              border: `1px solid ${filter === g.id ? 'var(--a1)' : 'var(--border2)'}`,
              background: filter === g.id ? 'rgba(79,142,247,.12)' : 'var(--bg3)',
              color: filter === g.id ? 'var(--a1)' : 'var(--txt2)',
              fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {g.icon} {g.label}
            </button>
          ))}
        </div>

        {/* Exercise grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txt3)' }}>Chargement…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {filtered.map(ex => (
              <div key={ex.id} onClick={() => setSelected(ex)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', cursor: 'pointer', transition: 'all .15s', borderTop: `3px solid ${DIFFICULTY_COLORS[ex.difficulty] || 'var(--a1)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 24 }}>{EQUIPMENT_ICONS[ex.equipment] || '💪'}</div>
                  <Pill color={DIFFICULTY_COLORS[ex.difficulty] || 'var(--a1)'}>{DIFFICULTY_LABELS[ex.difficulty]}</Pill>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)', marginBottom: 4 }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 8 }}>
                  {MUSCLE_GROUPS.find(g => g.id === ex.muscle_group)?.icon} {MUSCLE_GROUPS.find(g => g.id === ex.muscle_group)?.label}
                  {ex.is_custom && <span style={{ marginLeft: 6, color: 'var(--a2)' }}>• Personnalisé</span>}
                </div>
                {ex.description && <div style={{ fontSize: 12, color: 'var(--txt3)', lineHeight: 1.5 }}>{ex.description.slice(0, 80)}…</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exercise detail modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.name}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <Pill color={DIFFICULTY_COLORS[selected.difficulty]}>{DIFFICULTY_LABELS[selected.difficulty]}</Pill>
            <Pill color="var(--a1)">{EQUIPMENT_ICONS[selected.equipment]} {selected.equipment}</Pill>
            <Pill color="var(--a2)">{MUSCLE_GROUPS.find(g => g.id === selected.muscle_group)?.label}</Pill>
          </div>
          {selected.description && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7 }}>{selected.description}</div>
            </div>
          )}
          {selected.tips && (
            <div style={{ background: 'rgba(79,142,247,.08)', border: '1px solid rgba(79,142,247,.2)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, color: 'var(--a1)', fontWeight: 600, marginBottom: 6 }}>💡 Conseils techniques</div>
              <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7 }}>{selected.tips}</div>
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Btn onClick={() => setSelected(null)}>Fermer</Btn>
          </div>
        </Modal>
      )}

      {/* Add exercise modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="➕ Ajouter un exercice">
        <Input label="Nom de l'exercice" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Curl marteau haltères" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Groupe musculaire" value={newGroup} onChange={e => setNewGroup(e.target.value)}>
            {MUSCLE_GROUPS.filter(g => g.id !== 'all').map(g => <option key={g.id} value={g.id}>{g.icon} {g.label}</option>)}
          </Select>
          <Select label="Difficulté" value={newDiff} onChange={e => setNewDiff(e.target.value)}>
            <option value="beginner">Débutant</option>
            <option value="intermediate">Intermédiaire</option>
            <option value="advanced">Avancé</option>
          </Select>
        </div>
        <Select label="Équipement" value={newEquip} onChange={e => setNewEquip(e.target.value)}>
          <option value="barbell">🏋️ Barre</option>
          <option value="dumbbell">💪 Haltères</option>
          <option value="machine">⚙️ Machine</option>
          <option value="bodyweight">🤸 Poids du corps</option>
          <option value="cable">🔗 Poulie</option>
          <option value="other">🔧 Autre</option>
        </Select>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Description (optionnel)</label>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Décris l'exercice…" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', minHeight: 70, resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Conseils techniques (optionnel)</label>
          <textarea value={newTips} onChange={e => setNewTips(e.target.value)} placeholder="Conseils de forme, erreurs à éviter…" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', minHeight: 70, resize: 'vertical' }} />
        </div>
        <ModalActions onCancel={() => setAddModal(false)} onConfirm={addCustomExercise} loading={saving} confirmLabel="Ajouter l'exercice" />
      </Modal>
    </div>
  )
}
