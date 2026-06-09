'use client'
import { useState } from 'react'
import { Card, CardTitle, Pill, Modal, Btn } from '@/components/ui'

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
      { name: 'Burpees', sets: '4 × 40 sec', rest: '20 sec', tips: 'Pompe complète obligatoire' },
      { name: 'Mountain Climbers', sets: '4 × 40 sec', rest: '20 sec', tips: 'Hanches basses, rythme rapide' },
      { name: 'Jump Squats', sets: '4 × 40 sec', rest: '20 sec', tips: 'Atterrissage amorti, genoux fléchis' },
      { name: 'Pompes explosives', sets: '4 × 40 sec', rest: '20 sec', tips: 'Mains décollent du sol en haut' },
      { name: 'High Knees', sets: '4 × 40 sec', rest: '20 sec', tips: 'Genoux à hauteur de hanches' },
    ],
  },
  {
    id: 'w3', name: 'Upper Body Poids du Corps', level: 'intermediate', duration: 40, category: 'bodyweight',
    muscles: ['Pectoraux','Dos','Épaules','Bras'], icon: '💪', color: '#4f8ef7',
    description: 'Séance haut du corps complète sans matériel. Parfait pour renforcer dos, pectoraux et bras.',
    exercises: [
      { name: 'Pompes larges', sets: '4 × 12 reps', rest: '60 sec', tips: 'Mains 2× largeur épaules, cible les pecs' },
      { name: 'Pompes serrées (triceps)', sets: '4 × 10 reps', rest: '60 sec', tips: 'Mains jointives, coudes contre le corps' },
      { name: 'Tractions (ou rowing élastique)', sets: '4 × 8 reps', rest: '90 sec', tips: 'Amplitude complète, squeeze en haut' },
      { name: 'Dips (chaise)', sets: '3 × 12 reps', rest: '60 sec', tips: 'Coudes vers l\'arrière, pas les côtés' },
      { name: 'Élévations latérales élastique', sets: '3 × 15 reps', rest: '45 sec', tips: 'Jusqu\'à l\'horizontale seulement' },
      { name: 'Planche + rotation', sets: '3 × 8/côté', rest: '45 sec', tips: 'Rotation complète du tronc' },
    ],
  },
  {
    id: 'w4', name: 'Jambes & Fessiers', level: 'intermediate', duration: 45, category: 'bodyweight',
    muscles: ['Quadriceps','Fessiers','Ischio-jambiers','Mollets'], icon: '🦵', color: '#a855f7',
    description: 'Séance dédiée au bas du corps. Fessiers, quadriceps et ischios travaillés en profondeur.',
    exercises: [
      { name: 'Squat sauté', sets: '4 × 15 reps', rest: '60 sec', tips: 'Descends bas, saut explosif' },
      { name: 'Fentes bulgares', sets: '3 × 12/jambe', rest: '60 sec', tips: 'Pied arrière sur chaise, 90° avant' },
      { name: 'Hip Thrust sans barre', sets: '4 × 20 reps', rest: '45 sec', tips: 'Épaules sur le canapé, squeeze fort en haut' },
      { name: 'Wall Sit', sets: '3 × 45 sec', rest: '60 sec', tips: 'Dos plat au mur, cuisses parallèles au sol' },
      { name: 'Good Mornings (sans barre)', sets: '3 × 15 reps', rest: '45 sec', tips: 'Charnière hanche, dos droit' },
      { name: 'Élévations mollets', sets: '4 × 25 reps', rest: '30 sec', tips: 'Amplitude complète, lent en descente' },
    ],
  },
  {
    id: 'w5', name: 'Core & Gainage Avancé', level: 'advanced', duration: 30, category: 'bodyweight',
    muscles: ['Abdos','Obliques','Lombaires'], icon: '⭕', color: '#f59e0b',
    description: 'Circuit de gainage intense pour des abdominaux solides et un tronc stable.',
    exercises: [
      { name: 'Planche sur mains', sets: '4 × 60 sec', rest: '30 sec', tips: 'Corps aligné, pas de montée des hanches' },
      { name: 'Dragon Flag (partiel)', sets: '4 × 6 reps', rest: '90 sec', tips: 'Corps droit, descente très lente' },
      { name: 'Gainage latéral étoile', sets: '3 × 30 sec/côté', rest: '30 sec', tips: 'Bras et jambe libres levés' },
      { name: 'Ab Wheel (ou planche dynamique)', sets: '3 × 10 reps', rest: '60 sec', tips: 'Ne laisse pas les hanches descendre' },
      { name: 'Torsions russes lestées', sets: '4 × 20 reps', rest: '30 sec', tips: 'Pieds décollés, rotation complète' },
      { name: 'Hollow Body Hold', sets: '4 × 30 sec', rest: '30 sec', tips: 'Lombaires plaquées au sol obligatoire' },
    ],
  },
  {
    id: 'w6', name: 'Push/Pull Barre & Haltères', level: 'intermediate', duration: 60, category: 'equipment',
    muscles: ['Pectoraux','Épaules','Dos','Bras'], icon: '🏋️', color: '#4f8ef7',
    description: 'Séance classique Push/Pull avec barre et haltères. Muscle et force pour le haut du corps.',
    exercises: [
      { name: 'Développé couché barre', sets: '4 × 6-8 reps', rest: '2 min', tips: 'Contrôle la descente (3 sec), pousse fort' },
      { name: 'Développé incliné haltères', sets: '3 × 10 reps', rest: '90 sec', tips: 'Étire les pecs en bas, contracte en haut' },
      { name: 'Rowing haltère 1 bras', sets: '4 × 10/côté', rest: '90 sec', tips: 'Tire le coude vers le plafond' },
      { name: 'Développé militaire haltères', sets: '3 × 10 reps', rest: '90 sec', tips: 'Assis, presse au-dessus de la tête' },
      { name: 'Curl biceps barre', sets: '3 × 12 reps', rest: '60 sec', tips: 'Coudes fixes, supination complète' },
      { name: 'Triceps poulie/elastique', sets: '3 × 15 reps', rest: '60 sec', tips: 'Extension complète, coudes fixes' },
    ],
  },
  {
    id: 'w7', name: 'Jambes Lourdes', level: 'advanced', duration: 60, category: 'equipment',
    muscles: ['Quadriceps','Fessiers','Ischio-jambiers'], icon: '🦵', color: '#a855f7',
    description: 'Séance de force pour les jambes avec barre. Squat et soulevé de terre en vedette.',
    exercises: [
      { name: 'Squat barre (échauffement)', sets: '2 × 10 reps léger', rest: '90 sec', tips: 'Mobilité avant tout' },
      { name: 'Squat barre (travail)', sets: '5 × 5 reps lourd', rest: '3 min', tips: 'Valsalva, descends sous le parallèle' },
      { name: 'Soulevé de terre roumain', sets: '4 × 8 reps', rest: '2 min', tips: 'Charnière hanche, barre contre les cuisses' },
      { name: 'Leg Press', sets: '3 × 15 reps', rest: '90 sec', tips: 'Pieds hauts = fessiers, bas = quadriceps' },
      { name: 'Hip Thrust barre', sets: '4 × 12 reps', rest: '90 sec', tips: 'Contracte fort les fessiers en haut' },
      { name: 'Leg Curl machine', sets: '3 × 15 reps', rest: '60 sec', tips: 'Amplitude complète, lent en descente' },
    ],
  },
  {
    id: 'w8', name: 'Full Body Élastiques', level: 'beginner', duration: 35, category: 'bodyweight',
    muscles: ['Full Body'], icon: '🎯', color: '#38bdf8',
    description: 'Séance complète avec élastiques uniquement. Idéale en voyage ou à domicile.',
    exercises: [
      { name: 'Squat élastique', sets: '3 × 15 reps', rest: '60 sec', tips: 'Élastique sous les pieds et sur les épaules' },
      { name: 'Rowing élastique', sets: '3 × 15 reps', rest: '60 sec', tips: 'Fixe l\'élastique à hauteur poitrine' },
      { name: 'Presse épaule élastique', sets: '3 × 12 reps', rest: '60 sec', tips: 'Élastique sous les pieds, pousse vers le haut' },
      { name: 'Curl biceps élastique', sets: '3 × 15 reps', rest: '45 sec', tips: 'Coudes fixes, amplitude complète' },
      { name: 'Kickback triceps élastique', sets: '3 × 15 reps', rest: '45 sec', tips: 'Penché en avant, extension complète' },
      { name: 'Abductions latérales élastique', sets: '3 × 20 reps', rest: '45 sec', tips: 'Élastique autour des cuisses, largeur hanches' },
    ],
  },
]

export default function WorkoutPlans({ category }: { category: 'bodyweight' | 'equipment' }) {
  const [selected, setSelected] = useState<WorkoutPlan | null>(null)
  const filtered = PLANS.filter(p => p.category === category)

  const LEVEL_COLORS: Record<string, string> = { beginner: '#22d3a0', intermediate: '#f59e0b', advanced: '#f43f5e' }
  const LEVEL_LABELS: Record<string, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' }

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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn onClick={() => setSelected(null)}>Fermer</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
