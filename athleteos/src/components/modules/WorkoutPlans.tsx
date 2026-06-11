'use client'
import { useState } from 'react'
import { Pill, Modal, Btn, Input, Select } from '@/components/ui'
import type { CalendarEvent, Sport } from '@/types'
import { EVENT_TYPE_CONFIG } from '@/types'

interface WorkoutPlan {
  id: string
  name: string
  level: 'beginner' | 'intermediate' | 'advanced'
  duration: number
  category: 'bodyweight' | 'equipment'
  muscles: string[]
  description: string
  exercises: { name: string; sets: string; rest: string; tips: string }[]
  icon: string
  color: string
}

const PLANS: WorkoutPlan[] = [
  {
    id: 'w1', name: 'Full Body Débutant', level: 'beginner', duration: 30, category: 'bodyweight',
    muscles: ['Pectoraux','Dos','Jambes','Abdos'], icon: '🌱', color: '#22d3a0',
    description: 'Séance complète idéale pour débuter. Tous les grands groupes musculaires en 30 minutes, sans matériel.',
    exercises: [
      { name: 'Échauffement — Marche sur place', sets: '5 min', rest: '—', tips: 'Genoux hauts, bras actifs' },
      { name: 'Squat', sets: '3 × 12 reps', rest: '60 sec', tips: 'Descends lentement, dos droit' },
      { name: 'Pompes (genoux si besoin)', sets: '3 × 8 reps', rest: '60 sec', tips: 'Corps aligné, coudes à 45°' },
      { name: 'Fentes alternées', sets: '3 × 10/jambe', rest: '60 sec', tips: 'Tronc droit, genou arrière près du sol' },
      { name: 'Superman', sets: '3 × 12 reps', rest: '45 sec', tips: 'Mouvement lent, contraction en haut' },
      { name: 'Planche', sets: '3 × 20 sec', rest: '45 sec', tips: 'Corps rigide, respire normalement' },
      { name: 'Étirements', sets: '5 min', rest: '—', tips: 'Maintiens 30 sec par position' },
    ],
  },
  {
    id: 'w2', name: 'HIIT Cardio Brûle-Graisses', level: 'intermediate', duration: 25, category: 'bodyweight',
    muscles: ['Full Body','Cardio'], icon: '🔥', color: '#f43f5e',
    description: 'Circuit intense en intervalles pour brûler un maximum de calories. 40 sec effort / 20 sec repos.',
    exercises: [
      { name: 'Échauffement dynamique', sets: '5 min', rest: '—', tips: 'Mobilité articulaire complète' },
      { name: 'Burpees', sets: '4 × 40 sec', rest: '20 sec', tips: 'Pompe complète obligatoire' },
      { name: 'Mountain Climbers', sets: '4 × 40 sec', rest: '20 sec', tips: 'Hanches basses, rythme rapide' },
      { name: 'Jump Squats', sets: '4 × 40 sec', rest: '20 sec', tips: 'Atterrissage amorti, genoux fléchis' },
      { name: 'Pompes explosives', sets: '4 × 40 sec', rest: '20 sec', tips: 'Mains décollent du sol en haut' },
      { name: 'High Knees', sets: '4 × 40 sec', rest: '20 sec', tips: 'Genoux à hauteur de hanches' },
      { name: 'Retour au calme', sets: '5 min', rest: '—', tips: 'Étirements complets' },
    ],
  },
  {
    id: 'w3', name: 'Spécial Pectoraux & Bras', level: 'intermediate', duration: 45, category: 'bodyweight',
    muscles: ['Pectoraux','Triceps','Biceps','Épaules'], icon: '💪', color: '#4f8ef7',
    description: 'Séance ciblée pour le haut du corps. Pompes sous toutes leurs formes + élastiques pour les bras.',
    exercises: [
      { name: 'Échauffement épaules', sets: '5 min', rest: '—', tips: 'Cercles de bras, rotations' },
      { name: 'Pompes classiques', sets: '4 × 12 reps', rest: '60 sec', tips: 'Mains largeur épaules' },
      { name: 'Pompes larges (pecs)', sets: '4 × 10 reps', rest: '60 sec', tips: 'Mains 2× largeur épaules' },
      { name: 'Pompes serrées (triceps)', sets: '3 × 10 reps', rest: '60 sec', tips: 'Mains jointives, coudes au corps' },
      { name: 'Dips sur chaise', sets: '4 × 12 reps', rest: '60 sec', tips: 'Coudes vers l\'arrière' },
      { name: 'Élastique — Curl biceps', sets: '4 × 15 reps', rest: '45 sec', tips: 'Coudes fixes, supination' },
      { name: 'Élastique — Extension triceps', sets: '4 × 15 reps', rest: '45 sec', tips: 'Extension complète' },
      { name: 'Étirements pecs/bras', sets: '5 min', rest: '—', tips: 'Maintiens 30 sec chaque étirement' },
    ],
  },
  {
    id: 'w4', name: 'Jambes & Fessiers', level: 'intermediate', duration: 45, category: 'bodyweight',
    muscles: ['Quadriceps','Fessiers','Ischio-jambiers','Mollets'], icon: '🦵', color: '#a855f7',
    description: 'Séance dédiée au bas du corps. Fessiers, quadriceps et ischios travaillés en profondeur avec élastique.',
    exercises: [
      { name: 'Échauffement — Squats légers', sets: '5 min', rest: '—', tips: 'Mobilité hanches et chevilles' },
      { name: 'Squat sauté', sets: '4 × 15 reps', rest: '60 sec', tips: 'Descends bas, saut explosif' },
      { name: 'Fentes bulgares', sets: '3 × 12/jambe', rest: '60 sec', tips: 'Pied arrière sur chaise, 90° avant' },
      { name: 'Hip Thrust + élastique', sets: '4 × 20 reps', rest: '45 sec', tips: 'Squeeze fort en haut' },
      { name: 'Wall Sit', sets: '3 × 45 sec', rest: '60 sec', tips: 'Dos plat au mur, 90°' },
      { name: 'Élastique — Squats', sets: '3 × 15 reps', rest: '60 sec', tips: 'Élastique sous pieds et épaules' },
      { name: 'Élévations mollets', sets: '4 × 25 reps', rest: '30 sec', tips: 'Amplitude complète, lent' },
      { name: 'Étirements jambes', sets: '5 min', rest: '—', tips: 'Quadriceps, ischios, mollets' },
    ],
  },
  {
    id: 'w5', name: 'Spécial Abdos & Gainage', level: 'advanced', duration: 35, category: 'bodyweight',
    muscles: ['Abdos','Obliques','Lombaires'], icon: '⭕', color: '#f59e0b',
    description: 'Circuit de gainage intense pour des abdominaux solides et un tronc stable. Tous les angles travaillés.',
    exercises: [
      { name: 'Échauffement — Cat-cow', sets: '5 min', rest: '—', tips: 'Mobilise la colonne vertébrale' },
      { name: 'Planche sur mains', sets: '4 × 60 sec', rest: '30 sec', tips: 'Corps aligné, pas de creux lombaire' },
      { name: 'Crunchs', sets: '4 × 20 reps', rest: '30 sec', tips: 'Ne tire pas sur la nuque' },
      { name: 'Gainage latéral', sets: '3 × 30 sec/côté', rest: '30 sec', tips: 'Hanche décollée toute la durée' },
      { name: 'Relevés de jambes', sets: '4 × 15 reps', rest: '45 sec', tips: 'Lombaires plaquées au sol' },
      { name: 'Mountain Climbers', sets: '4 × 30 sec', rest: '30 sec', tips: 'Rythme soutenu, hanches stables' },
      { name: 'Torsions russes', sets: '4 × 20 reps', rest: '30 sec', tips: 'Pieds décollés, rotation complète' },
      { name: 'Hollow Body Hold', sets: '4 × 30 sec', rest: '30 sec', tips: 'Lombaires plaquées au sol' },
    ],
  },
  {
    id: 'w6', name: 'Full Body Élastiques', level: 'beginner', duration: 35, category: 'bodyweight',
    muscles: ['Full Body'], icon: '🎯', color: '#38bdf8',
    description: 'Séance complète avec élastiques uniquement. Idéale en voyage ou à domicile, faible impact articulaire.',
    exercises: [
      { name: 'Échauffement complet', sets: '5 min', rest: '—', tips: 'Mobilité globale' },
      { name: 'Squat élastique', sets: '3 × 15 reps', rest: '60 sec', tips: 'Élastique sous pieds et épaules' },
      { name: 'Rowing élastique', sets: '3 × 15 reps', rest: '60 sec', tips: 'Fixe à hauteur poitrine' },
      { name: 'Presse épaule élastique', sets: '3 × 12 reps', rest: '60 sec', tips: 'Élastique sous pieds' },
      { name: 'Curl biceps élastique', sets: '3 × 15 reps', rest: '45 sec', tips: 'Coudes fixes' },
      { name: 'Kickback triceps élastique', sets: '3 × 15 reps', rest: '45 sec', tips: 'Penché en avant' },
      { name: 'Abductions latérales élastique', sets: '3 × 20 reps', rest: '45 sec', tips: 'Élastique aux cuisses' },
      { name: 'Étirements complets', sets: '5 min', rest: '—', tips: 'Tout le corps' },
    ],
  },
  {
    id: 'w7', name: 'Dos & Posture', level: 'intermediate', duration: 40, category: 'bodyweight',
    muscles: ['Dos','Trapèzes','Lombaires','Épaules'], icon: '🔙', color: '#22d3a0',
    description: 'Renforce le dos et corrige la posture. Idéal pour contrer les effets du télétravail et de la sédentarité.',
    exercises: [
      { name: 'Échauffement — Rotations dos', sets: '5 min', rest: '—', tips: 'Mobilité thoracique' },
      { name: 'Élastique — Rowing', sets: '4 × 15 reps', rest: '60 sec', tips: 'Serre les omoplates' },
      { name: 'Superman', sets: '4 × 15 reps', rest: '45 sec', tips: 'Contraction 2 sec en haut' },
      { name: 'Tractions (ou élastique assisté)', sets: '4 × 6-8 reps', rest: '90 sec', tips: 'Amplitude complète' },
      { name: 'Élastique — Face Pull', sets: '4 × 15 reps', rest: '45 sec', tips: 'Tire vers le visage, coudes hauts' },
      { name: 'Bird Dog', sets: '3 × 10/côté', rest: '45 sec', tips: 'Stabilité, mouvement lent' },
      { name: 'Pont fessier', sets: '4 × 15 reps', rest: '45 sec', tips: 'Squeeze fessiers en haut' },
      { name: 'Étirements dos & épaules', sets: '5 min', rest: '—', tips: 'Chat-vache, torsion couchée' },
    ],
  },
  {
    id: 'w8', name: 'Cardio Doux — Récupération', level: 'beginner', duration: 30, category: 'bodyweight',
    muscles: ['Full Body','Cardio léger'], icon: '🌊', color: '#38bdf8',
    description: 'Séance douce pour les jours de récupération active. Faible intensité, mobilité et étirements.',
    exercises: [
      { name: 'Marche active', sets: '10 min', rest: '—', tips: 'Rythme modéré, respiration profonde' },
      { name: 'Cercles de bras & épaules', sets: '2 × 30 sec', rest: '15 sec', tips: 'Amplitude maximale' },
      { name: 'Squats lents au poids du corps', sets: '2 × 12 reps', rest: '30 sec', tips: 'Tempo lent, focus respiration' },
      { name: 'Fentes marchées légères', sets: '2 × 8/jambe', rest: '30 sec', tips: 'Pas de charge, juste mobilité' },
      { name: 'Gainage léger', sets: '2 × 20 sec', rest: '30 sec', tips: 'Sans forcer' },
      { name: 'Étirements complets', sets: '10 min', rest: '—', tips: 'Yoga doux, respiration lente' },
    ],
  },
  {
    id: 'w9', name: 'EMOM 20 — Intensif', level: 'advanced', duration: 25, category: 'bodyweight',
    muscles: ['Full Body','Cardio'], icon: '⏱️', color: '#f43f5e',
    description: 'Format EMOM (Every Minute On the Minute) : un exercice différent chaque minute pendant 20 minutes. Intense !',
    exercises: [
      { name: 'Échauffement', sets: '5 min', rest: '—', tips: 'Mobilité + activation cardiaque' },
      { name: 'Min 1 : Burpees', sets: '10 reps puis repos', rest: 'reste de la minute', tips: 'Qualité avant vitesse' },
      { name: 'Min 2 : Squat sauté', sets: '15 reps puis repos', rest: 'reste de la minute', tips: 'Atterrissage souple' },
      { name: 'Min 3 : Pompes', sets: '12 reps puis repos', rest: 'reste de la minute', tips: 'Amplitude complète' },
      { name: 'Min 4 : Mountain Climbers', sets: '30 sec puis repos', rest: 'reste de la minute', tips: 'Rythme rapide' },
      { name: 'Répéter le cycle 4 fois', sets: '4 tours', rest: '—', tips: 'Garde le même rythme' },
      { name: 'Retour au calme', sets: '5 min', rest: '—', tips: 'Étirements complets' },
    ],
  },
  {
    id: 'w10', name: 'Push/Pull Barre & Haltères', level: 'intermediate', duration: 60, category: 'equipment',
    muscles: ['Pectoraux','Épaules','Dos','Bras'], icon: '🏋️', color: '#4f8ef7',
    description: 'Séance classique Push/Pull avec barre et haltères. Muscle et force pour le haut du corps.',
    exercises: [
      { name: 'Échauffement épaules + poignets', sets: '5 min', rest: '—', tips: 'Mobilité articulaire' },
      { name: 'Développé couché barre', sets: '4 × 6-8 reps', rest: '2 min', tips: 'Contrôle la descente (3 sec)' },
      { name: 'Développé incliné haltères', sets: '3 × 10 reps', rest: '90 sec', tips: 'Étire les pecs en bas' },
      { name: 'Rowing haltère 1 bras', sets: '4 × 10/côté', rest: '90 sec', tips: 'Tire le coude vers le plafond' },
      { name: 'Développé militaire haltères', sets: '3 × 10 reps', rest: '90 sec', tips: 'Assis, presse au-dessus de la tête' },
      { name: 'Curl biceps barre', sets: '3 × 12 reps', rest: '60 sec', tips: 'Coudes fixes, supination complète' },
      { name: 'Triceps poulie/élastique', sets: '3 × 15 reps', rest: '60 sec', tips: 'Extension complète' },
      { name: 'Étirements haut du corps', sets: '5 min', rest: '—', tips: 'Pecs, dos, épaules' },
    ],
  },
  {
    id: 'w11', name: 'Jambes Lourdes', level: 'advanced', duration: 60, category: 'equipment',
    muscles: ['Quadriceps','Fessiers','Ischio-jambiers'], icon: '🦵', color: '#a855f7',
    description: 'Séance de force pour les jambes avec barre. Squat et soulevé de terre en vedette.',
    exercises: [
      { name: 'Échauffement — Mobilité hanches', sets: '8 min', rest: '—', tips: 'Air squats, fentes dynamiques' },
      { name: 'Squat barre (échauffement)', sets: '2 × 10 reps léger', rest: '90 sec', tips: 'Mobilité avant tout' },
      { name: 'Squat barre (travail)', sets: '5 × 5 reps lourd', rest: '3 min', tips: 'Valsalva, sous le parallèle' },
      { name: 'Soulevé de terre roumain', sets: '4 × 8 reps', rest: '2 min', tips: 'Charnière hanche, dos plat' },
      { name: 'Leg Press', sets: '3 × 15 reps', rest: '90 sec', tips: 'Pieds hauts = fessiers' },
      { name: 'Hip Thrust barre', sets: '4 × 12 reps', rest: '90 sec', tips: 'Contracte fort en haut' },
      { name: 'Leg Curl machine', sets: '3 × 15 reps', rest: '60 sec', tips: 'Amplitude complète, lent' },
      { name: 'Étirements jambes', sets: '8 min', rest: '—', tips: 'Quadriceps, ischios, fessiers' },
    ],
  },
]

const LEVEL_COLORS: Record<string, string> = { beginner: '#22d3a0', intermediate: '#f59e0b', advanced: '#f43f5e' }
const LEVEL_LABELS: Record<string, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' }

interface Props {
  category: 'bodyweight' | 'equipment'
  sports: Sport[]
  addEvent: (data: Partial<CalendarEvent>) => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error') => void
}

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
      type: 'training',
      sport_id: null,
      title: `${selected.icon} ${selected.name}`,
      event_date: calDate,
      event_time: calTime || null,
      location: calLocation || null,
      description: `Programme AthleteOS (${selected.duration} min)\n\n${exerciseList}`,
    })
    setSaving(false)
    setCalModal(false)
    showToast(`"${selected.name}" ajouté au calendrier ! 📅`)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {filtered.map(plan => (
          <div key={plan.id} onClick={() => setSelected(plan)} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
            padding: '16px', cursor: 'pointer', transition: 'all .15s',
            borderTop: `3px solid ${plan.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>{plan.icon}</span>
              <Pill color={LEVEL_COLORS[plan.level]}>{LEVEL_LABELS[plan.level]}</Pill>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)', marginBottom: 4 }}>{plan.name}</div>
            <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 8 }}>
              ⏱️ {plan.duration} min · {plan.exercises.length} exercices
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {plan.muscles.slice(0, 3).map(m => (
                <span key={m} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: plan.color+'15', color: plan.color, fontWeight: 500 }}>{m}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--a1)', marginTop: 10, fontWeight: 500 }}>Voir la séance →</div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected.icon} ${selected.name}`}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <Pill color={LEVEL_COLORS[selected.level]}>{LEVEL_LABELS[selected.level]}</Pill>
            <Pill color={selected.color}>⏱️ {selected.duration} min</Pill>
            <Pill color="var(--a6)">{selected.exercises.length} exercices</Pill>
          </div>
          <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 16, lineHeight: 1.7 }}>{selected.description}</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--txt1)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.8px' }}>Programme</div>
          {selected.exercises.map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: selected.color+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: selected.color, flexShrink: 0 }}>{i+1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', marginBottom: 3 }}>{ex.name}</div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--txt2)', marginBottom: 3 }}>
                  <span>📊 {ex.sets}</span>
                  {ex.rest !== '—' && <span>⏸️ Repos: {ex.rest}</span>}
                </div>
                {ex.tips && <div style={{ fontSize: 11, color: 'var(--txt3)', fontStyle: 'italic' }}>💡 {ex.tips}</div>}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 16 }}>
            <Btn onClick={() => { setCalDate(new Date().toISOString().slice(0,10)); setCalLocation(''); setCalModal(true) }} variant="outline">
              📅 Ajouter au calendrier
            </Btn>
            <Btn onClick={() => setSelected(null)}>Fermer</Btn>
          </div>
        </Modal>
      )}

      {/* Add to calendar modal */}
      {selected && (
        <Modal open={calModal} onClose={() => setCalModal(false)} title={`📅 Planifier "${selected.name}"`}>
          <div style={{ background: selected.color+'10', border: `1px solid ${selected.color}30`, borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>{selected.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: 'var(--txt2)' }}>⏱️ {selected.duration} min · {selected.exercises.length} exercices</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Date" type="date" value={calDate} onChange={e => setCalDate(e.target.value)} />
            <Input label="Heure" type="time" value={calTime} onChange={e => setCalTime(e.target.value)} />
          </div>
          <Input label="Lieu (optionnel)" placeholder="Salon, jardin, salle de sport…" value={calLocation} onChange={e => setCalLocation(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn onClick={() => setCalModal(false)} variant="outline">Annuler</Btn>
            <Btn onClick={handleAddToCalendar} disabled={saving}>{saving ? '…' : '✅ Ajouter au calendrier'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
