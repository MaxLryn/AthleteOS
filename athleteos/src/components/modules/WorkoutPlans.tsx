'use client'
import { useState } from 'react'
import { Pill, Modal, Btn, Input } from '@/components/ui'
import type { CalendarEvent, Sport } from '@/types'

interface WorkoutPlan {
  id: string; name: string; level: 'beginner' | 'intermediate' | 'advanced'; duration: number
  category: 'bodyweight' | 'equipment'; muscles: string[]; description: string
  exercises: { name: string; sets: string; rest: string; tips: string }[]; icon: string; color: string
}

const PLANS: WorkoutPlan[] = [
  { id: 'w1', name: 'Full Body Débutant', level: 'beginner', duration: 30, category: 'bodyweight', muscles: ['Pectoraux','Dos','Jambes','Abdos'], icon: '🌱', color: '#22d3a0', description: 'Séance complète idéale pour débuter.', exercises: [
    { name: 'Échauffement', sets: '5 min', rest: '—', tips: 'Genoux hauts' },
    { name: 'Squat', sets: '3 × 12', rest: '60 sec', tips: 'Dos droit' },
    { name: 'Pompes', sets: '3 × 8', rest: '60 sec', tips: 'Corps aligné' },
    { name: 'Fentes', sets: '3 × 10/jambe', rest: '60 sec', tips: 'Tronc droit' },
    { name: 'Superman', sets: '3 × 12', rest: '45 sec', tips: 'Lent' },
    { name: 'Planche', sets: '3 × 20 sec', rest: '45 sec', tips: 'Rigide' },
  ]},
  { id: 'w2', name: 'HIIT Cardio', level: 'intermediate', duration: 25, category: 'bodyweight', muscles: ['Full Body','Cardio'], icon: '🔥', color: '#f43f5e', description: 'Circuit intense brûle-graisses.', exercises: [
    { name: 'Burpees', sets: '4 × 40 sec', rest: '20 sec', tips: 'Pompe complète' },
    { name: 'Mountain Climbers', sets: '4 × 40 sec', rest: '20 sec', tips: 'Rapide' },
    { name: 'Jump Squats', sets: '4 × 40 sec', rest: '20 sec', tips: 'Amorti' },
    { name: 'Pompes explosives', sets: '4 × 40 sec', rest: '20 sec', tips: 'Mains décollent' },
    { name: 'High Knees', sets: '4 × 40 sec', rest: '20 sec', tips: 'Genoux hauts' },
  ]},
  { id: 'w3', name: 'Pecs & Bras', level: 'intermediate', duration: 45, category: 'bodyweight', muscles: ['Pectoraux','Triceps','Biceps'], icon: '💪', color: '#4f8ef7', description: 'Haut du corps avec élastiques.', exercises: [
    { name: 'Pompes larges', sets: '4 × 10', rest: '60 sec', tips: 'Mains larges' },
    { name: 'Pompes serrées', sets: '3 × 10', rest: '60 sec', tips: 'Triceps' },
    { name: 'Dips chaise', sets: '4 × 12', rest: '60 sec', tips: 'Coudes arrière' },
    { name: 'Curl élastique', sets: '4 × 15', rest: '45 sec', tips: 'Coudes fixes' },
    { name: 'Triceps élastique', sets: '4 × 15', rest: '45 sec', tips: 'Extension complète' },
  ]},
  { id: 'w4', name: 'Jambes & Fessiers', level: 'intermediate', duration: 45, category: 'bodyweight', muscles: ['Quadriceps','Fessiers'], icon: '🦵', color: '#a855f7', description: 'Bas du corps en profondeur.', exercises: [
    { name: 'Squat sauté', sets: '4 × 15', rest: '60 sec', tips: 'Explosif' },
    { name: 'Fentes bulgares', sets: '3 × 12/jambe', rest: '60 sec', tips: '90° avant' },
    { name: 'Hip Thrust', sets: '4 × 20', rest: '45 sec', tips: 'Squeeze en haut' },
    { name: 'Wall Sit', sets: '3 × 45 sec', rest: '60 sec', tips: 'Dos plat' },
    { name: 'Mollets', sets: '4 × 25', rest: '30 sec', tips: 'Amplitude complète' },
  ]},
  { id: 'w5', name: 'Abdos & Gainage', level: 'advanced', duration: 35, category: 'bodyweight', muscles: ['Abdos','Obliques'], icon: '⭕', color: '#f59e0b', description: 'Gainage intense, tous les angles.', exercises: [
    { name: 'Planche', sets: '4 × 60 sec', rest: '30 sec', tips: 'Pas de creux' },
    { name: 'Crunchs', sets: '4 × 20', rest: '30 sec', tips: 'Pas de nuque' },
    { name: 'Gainage latéral', sets: '3 × 30 sec/côté', rest: '30 sec', tips: 'Hanche décollée' },
    { name: 'Relevés jambes', sets: '4 × 15', rest: '45 sec', tips: 'Lombaires au sol' },
    { name: 'Mountain Climbers', sets: '4 × 30 sec', rest: '30 sec', tips: 'Soutenu' },
  ]},
  { id: 'w6', name: 'Full Body Élastiques', level: 'beginner', duration: 35, category: 'bodyweight', muscles: ['Full Body'], icon: '🎯', color: '#38bdf8', description: 'Complète, idéale en voyage.', exercises: [
    { name: 'Squat élastique', sets: '3 × 15', rest: '60 sec', tips: 'Pieds et épaules' },
    { name: 'Rowing élastique', sets: '3 × 15', rest: '60 sec', tips: 'Hauteur poitrine' },
    { name: 'Presse épaule', sets: '3 × 12', rest: '60 sec', tips: 'Pieds dessus' },
    { name: 'Curl biceps', sets: '3 × 15', rest: '45 sec', tips: 'Coudes fixes' },
    { name: 'Kickback triceps', sets: '3 × 15', rest: '45 sec', tips: 'Penché avant' },
  ]},
  { id: 'w7', name: 'Dos & Posture', level: 'intermediate', duration: 40, category: 'bodyweight', muscles: ['Dos','Trapèzes'], icon: '🔙', color: '#22d3a0', description: 'Corrige la posture.', exercises: [
    { name: 'Rowing élastique', sets: '4 × 15', rest: '60 sec', tips: 'Serre omoplates' },
    { name: 'Superman', sets: '4 × 15', rest: '45 sec', tips: 'Contraction 2 sec' },
    { name: 'Tractions', sets: '4 × 6-8', rest: '90 sec', tips: 'Amplitude complète' },
    { name: 'Face Pull élastique', sets: '4 × 15', rest: '45 sec', tips: 'Coudes hauts' },
    { name: 'Bird Dog', sets: '3 × 10/côté', rest: '45 sec', tips: 'Lent' },
  ]},
  { id: 'w8', name: 'Récupération Active', level: 'beginner', duration: 30, category: 'bodyweight', muscles: ['Full Body','Cardio léger'], icon: '🌊', color: '#38bdf8', description: 'Jour de repos actif.', exercises: [
    { name: 'Marche active', sets: '10 min', rest: '—', tips: 'Rythme modéré' },
    { name: 'Cercles bras', sets: '2 × 30 sec', rest: '15 sec', tips: 'Amplitude max' },
    { name: 'Squats lents', sets: '2 × 12', rest: '30 sec', tips: 'Tempo lent' },
    { name: 'Gainage léger', sets: '2 × 20 sec', rest: '30 sec', tips: 'Sans forcer' },
    { name: 'Étirements', sets: '10 min', rest: '—', tips: 'Respiration lente' },
  ]},
  { id: 'w9', name: 'EMOM 20', level: 'advanced', duration: 25, category: 'bodyweight', muscles: ['Full Body','Cardio'], icon: '⏱️', color: '#f43f5e', description: 'Une minute, un exercice.', exercises: [
    { name: 'Burpees', sets: '10 reps', rest: 'reste de la min', tips: 'Qualité' },
    { name: 'Squat sauté', sets: '15 reps', rest: 'reste de la min', tips: 'Souple' },
    { name: 'Pompes', sets: '12 reps', rest: 'reste de la min', tips: 'Complet' },
    { name: 'Mountain Climbers', sets: '30 sec', rest: 'reste de la min', tips: 'Rapide' },
    { name: 'Répéter 4 fois', sets: '4 tours', rest: '—', tips: 'Même rythme' },
  ]},
  { id: 'w10', name: 'Push/Pull Barre', level: 'intermediate', duration: 60, category: 'equipment', muscles: ['Pectoraux','Dos','Bras'], icon: '🏋️', color: '#4f8ef7', description: 'Classique avec barre/haltères.', exercises: [
    { name: 'Développé couché', sets: '4 × 6-8', rest: '2 min', tips: 'Contrôle descente' },
    { name: 'Développé incliné', sets: '3 × 10', rest: '90 sec', tips: 'Étire pecs' },
    { name: 'Rowing haltère', sets: '4 × 10/côté', rest: '90 sec', tips: 'Coude haut' },
    { name: 'Développé militaire', sets: '3 × 10', rest: '90 sec', tips: 'Assis' },
    { name: 'Curl biceps barre', sets: '3 × 12', rest: '60 sec', tips: 'Coudes fixes' },
  ]},
  { id: 'w11', name: 'Jambes Lourdes', level: 'advanced', duration: 60, category: 'equipment', muscles: ['Quadriceps','Fessiers'], icon: '🦵', color: '#a855f7', description: 'Force avec barre.', exercises: [
    { name: 'Squat barre', sets: '5 × 5 lourd', rest: '3 min', tips: 'Valsalva' },
    { name: 'Soulevé roumain', sets: '4 × 8', rest: '2 min', tips: 'Dos plat' },
    { name: 'Leg Press', sets: '3 × 15', rest: '90 sec', tips: 'Pieds hauts' },
    { name: 'Hip Thrust barre', sets: '4 × 12', rest: '90 sec', tips: 'Squeeze' },
    { name: 'Leg Curl', sets: '3 × 15', rest: '60 sec', tips: 'Lent' },
  ]},
]

const LEVEL_COLORS: Record<string, string> = { beginner: '#22d3a0', intermediate: '#f59e0b', advanced: '#f43f5e' }
const LEVEL_LABELS: Record<string, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' }

interface Props { category: 'bodyweight' | 'equipment'; sports: Sport[]; addEvent: (data: Partial<CalendarEvent>) => Promise<void>; showToast: (msg: string, type?: 'success' | 'error') => void }

export default function WorkoutPlans({ category, sports, addEvent, showToast }: Props) {
  const [selected, setSelected] = useState<WorkoutPlan | null>(null)
  const [calModal, setCalModal] = useState(false)
  const [calDate, setCalDate]   = useState(new Date().toISOString().slice(0,10))
  const [calTime, setCalTime]   = useState('18:00')
  const [calLocation, setCalLocation] = useState('')
  const [saving, setSaving]     = useState(false)

  const filtered = PLANS.filter(p => p.category === category)

  async function handleAddToCalendar() {
    if (!selected) return
    setSaving(true)
    const exerciseList = selected.exercises.map(e => `• ${e.name} — ${e.sets}`).join('\n')
    await addEvent({
      type: 'training', sport_id: null, title: `${selected.icon} ${selected.name}`,
      event_date: calDate, event_time: calTime || null, location: calLocation || null,
      description: `Programme AthleteOS (${selected.duration} min)\n\n${exerciseList}`,
    })
    setSaving(false); setCalModal(false)
    showToast(`"${selected.name}" ajouté au calendrier ! 📅`)
  }

  return (
    <div>
      <div className="workout-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {filtered.map(plan => (
          <div key={plan.id} onClick={() => setSelected(plan)} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
            padding: '16px', cursor: 'pointer', borderTop: `3px solid ${plan.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 26 }}>{plan.icon}</span>
              <Pill color={LEVEL_COLORS[plan.level]}>{LEVEL_LABELS[plan.level]}</Pill>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)', marginBottom: 4 }}>{plan.name}</div>
            <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 8 }}>⏱️ {plan.duration} min · {plan.exercises.length} ex.</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {plan.muscles.slice(0, 2).map(m => (
                <span key={m} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: plan.color+'15', color: plan.color, fontWeight: 500 }}>{m}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected.icon} ${selected.name}`}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <Pill color={LEVEL_COLORS[selected.level]}>{LEVEL_LABELS[selected.level]}</Pill>
            <Pill color={selected.color}>⏱️ {selected.duration} min</Pill>
          </div>
          <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 16, lineHeight: 1.7 }}>{selected.description}</div>
          {selected.exercises.map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: selected.color+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: selected.color, flexShrink: 0 }}>{i+1}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', marginBottom: 3 }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: 'var(--txt2)' }}>📊 {ex.sets} {ex.rest !== '—' && `· ⏸️ ${ex.rest}`}</div>
                {ex.tips && <div style={{ fontSize: 11, color: 'var(--txt3)', fontStyle: 'italic', marginTop: 2 }}>💡 {ex.tips}</div>}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <Btn onClick={() => { setCalDate(new Date().toISOString().slice(0,10)); setCalLocation(''); setCalModal(true) }} variant="outline">📅 Ajouter au calendrier</Btn>
            <Btn onClick={() => setSelected(null)}>Fermer</Btn>
          </div>
        </Modal>
      )}

      {selected && (
        <Modal open={calModal} onClose={() => setCalModal(false)} title={`📅 Planifier "${selected.name}"`}>
          <div style={{ background: selected.color+'10', border: `1px solid ${selected.color}30`, borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 26 }}>{selected.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: 'var(--txt2)' }}>⏱️ {selected.duration} min</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Date" type="date" value={calDate} onChange={e => setCalDate(e.target.value)} />
            <Input label="Heure" type="time" value={calTime} onChange={e => setCalTime(e.target.value)} />
          </div>
          <Input label="Lieu (optionnel)" placeholder="Salon, salle…" value={calLocation} onChange={e => setCalLocation(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn onClick={() => setCalModal(false)} variant="outline">Annuler</Btn>
            <Btn onClick={handleAddToCalendar} disabled={saving}>{saving ? '…' : '✅ Ajouter'}</Btn>
          </div>
        </Modal>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .workout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
