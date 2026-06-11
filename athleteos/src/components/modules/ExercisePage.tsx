'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle, Topbar, Pill, Btn, Modal, ModalActions, Input, Select } from '@/components/ui'
import WorkoutPlans from './WorkoutPlans'
import type { Session, Sport, CalendarEvent } from '@/types'

interface Exercise {
  id: string
  name: string
  muscle_group: string
  description: string
  tips: string
  difficulty: string
  equipment: string
  is_custom: boolean
  youtube_id?: string
  steps?: string[]
  sets_beginner?: string
  sets_intermediate?: string
  sets_advanced?: string
  duration_beginner?: string
  duration_intermediate?: string
  duration_advanced?: string
}

interface Props {
  sessions: Session[]
  sports: Sport[]
  addEvent: (data: Partial<CalendarEvent>) => Promise<void>
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
  { id: 'full_body', label: 'Full Body',     icon: '🏃' },
]

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#22d3a0', intermediate: '#f59e0b', advanced: '#f43f5e'
}
const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé'
}

const BODYWEIGHT_EXERCISES: Exercise[] = [
  { id:'bw-1',name:'Pompes',muscle_group:'chest',equipment:'bodyweight',difficulty:'beginner',is_custom:false,
    description:'Exercice fondamental pour les pectoraux, triceps et deltoïdes antérieurs. Réalisable partout, sans matériel.',
    tips:'Garde le corps aligné de la tête aux talons. Ne laisse pas les hanches s\'affaisser. Descends jusqu\'à ce que la poitrine frôle le sol.',
    steps:['Position planche : mains légèrement plus larges que les épaules, corps droit','Descends lentement en pliant les coudes (2-3 sec)','Poitrine à 2 cm du sol, coudes à 45° du corps','Pousse explosif vers le haut en expirant'],
    sets_beginner:'3 × 8-10 reps',sets_intermediate:'4 × 15-20 reps',sets_advanced:'5 × 25-30 reps',youtube_id:'IODxDxX7oi4' },
  { id:'bw-2',name:'Pompes surélevées',muscle_group:'chest',equipment:'bodyweight',difficulty:'intermediate',is_custom:false,
    description:'Variante des pompes pieds surélevés pour cibler davantage la partie haute des pectoraux et les épaules.',
    tips:'Place les pieds sur une chaise ou un banc. Même alignement que les pompes classiques. Le buste doit descendre verticalement.',
    steps:['Pieds sur une surface surélevée (30-60cm)','Mains au sol, largeur épaules','Descends la tête vers le sol','Pousse et reviens à la position initiale'],
    sets_beginner:'3 × 6-8 reps',sets_intermediate:'3 × 12-15 reps',sets_advanced:'4 × 20 reps',youtube_id:'ddaB8BSgRgM' },
  { id:'bw-3',name:'Tractions',muscle_group:'back',equipment:'bodyweight',difficulty:'intermediate',is_custom:false,
    description:'Roi des exercices pour le dos. Développe les grands dorsaux, biceps et muscles stabilisateurs.',
    tips:'Prise pronation (paumes vers l\'avant) pour les dorsaux, supination pour les biceps. Descente complète obligatoire.',
    steps:['Barre à hauteur de bras tendus, prise pronation largeur épaules','Engage les abdos et les épaules vers le bas','Tire la barre vers le menton en pensant "coudes vers les hanches"','Descente lente et contrôlée (3 sec)'],
    sets_beginner:'3 × 3-5 reps (assisté si besoin)',sets_intermediate:'4 × 8-10 reps',sets_advanced:'5 × 12-15 reps',youtube_id:'eGo4IYlbE5g' },
  { id:'bw-4',name:'Dips',muscle_group:'arms',equipment:'bodyweight',difficulty:'intermediate',is_custom:false,
    description:'Exercice au poids du corps pour les triceps et pectoraux inférieurs. Nécessite deux chaises ou une barre parallèle.',
    tips:'Corps droit = triceps. Penché en avant = pectoraux. Descends jusqu\'à 90° de flexion du coude minimum.',
    steps:['Appui sur deux chaises, corps suspendu, jambes tendues','Descends lentement jusqu\'aux coudes à 90°','Pause 1 sec en bas','Pousse fort vers le haut, bras tendus sans verrouiller'],
    sets_beginner:'3 × 5-8 reps',sets_intermediate:'3 × 12-15 reps',sets_advanced:'4 × 20 reps',youtube_id:'wjUmnZH528Y' },
  { id:'bw-5',name:'Squat',muscle_group:'legs',equipment:'bodyweight',difficulty:'beginner',is_custom:false,
    description:'Exercice de base pour les quadriceps, fessiers et ischio-jambiers. La fondation de tout programme.',
    tips:'Pieds largeur épaules, légèrement tournés vers l\'extérieur. Genoux dans l\'axe des pieds. Descends jusqu\'au parallèle minimum.',
    steps:['Debout, pieds largeur épaules, orteils légèrement ouverts','Bras tendus devant, descends en poussant les hanches en arrière','Cuisse parallèle au sol (ou plus bas)','Pousse dans le sol pour remonter, expire en haut'],
    sets_beginner:'3 × 15 reps',sets_intermediate:'4 × 20-25 reps',sets_advanced:'5 × 30 reps',youtube_id:'aclHkVaku9U' },
  { id:'bw-6',name:'Fentes',muscle_group:'legs',equipment:'bodyweight',difficulty:'beginner',is_custom:false,
    description:'Exercice unilatéral pour les quadriceps, fessiers et améliore l\'équilibre et la coordination.',
    tips:'Le genou arrière ne doit pas toucher le sol brusquement. Garde le tronc droit. Pas trop long pour ne pas perdre l\'équilibre.',
    steps:['Debout, pieds joints','Fais un grand pas en avant avec la jambe droite','Descends jusqu\'à ce que le genou arrière frôle le sol','Pousse sur le pied avant pour revenir, alterne les jambes'],
    sets_beginner:'3 × 10 reps/jambe',sets_intermediate:'3 × 15 reps/jambe',sets_advanced:'4 × 20 reps/jambe',youtube_id:'QOVaHwm-Q6U' },
  { id:'bw-7',name:'Planche',muscle_group:'core',equipment:'bodyweight',difficulty:'beginner',is_custom:false,
    description:'Exercice de gainage isométrique complet. Renforce toute la ceinture abdominale et les stabilisateurs.',
    tips:'Corps rigide comme une planche. Rentre le ventre. Respire normalement. Ne laisse pas les hanches monter ou descendre.',
    steps:['Allonge-toi face au sol, appui sur les avant-bras et les orteils','Soulève le bassin — corps parfaitement aligné','Contracte les abdos, fessiers et cuisses','Maintiens la position en respirant normalement'],
    duration_beginner:'3 × 20-30 sec',duration_intermediate:'3 × 45-60 sec',duration_advanced:'4 × 90 sec+',youtube_id:'pSHjTRCQxIw' },
  { id:'bw-8',name:'Mountain Climbers',muscle_group:'core',equipment:'bodyweight',difficulty:'intermediate',is_custom:false,
    description:'Exercice dynamique qui combine gainage et cardio. Excellent pour les abdos et la condition physique générale.',
    tips:'Garde les hanches basses et stables. Ne saute pas les hanches vers le haut à chaque mouvement.',
    steps:['Position de pompe haute, corps droit','Amène le genou droit vers la poitrine rapidement','Reviens et fais pareil avec le genou gauche','Alterne rapidement comme si tu escaladais'],
    duration_beginner:'3 × 20 sec',duration_intermediate:'3 × 40 sec',duration_advanced:'4 × 60 sec',youtube_id:'nmwgirgXLYM' },
  { id:'bw-9',name:'Burpee',muscle_group:'full_body',equipment:'bodyweight',difficulty:'intermediate',is_custom:false,
    description:'Exercice full body intense qui combine force et cardio. Brûle énormément de calories.',
    tips:'Qualité avant vitesse. Pompe complète obligatoire. Saut avec mains au-dessus de la tête.',
    steps:['Debout, pieds largeur épaules','Accroupis-toi et pose les mains au sol','Saute les pieds en arrière → position de pompe','Fais une pompe, saute les pieds vers les mains, saut vertical'],
    sets_beginner:'3 × 5 reps',sets_intermediate:'3 × 10 reps',sets_advanced:'4 × 15 reps',youtube_id:'dZgVxmf6jkA' },
  { id:'bw-10',name:'Gainage latéral',muscle_group:'core',equipment:'bodyweight',difficulty:'beginner',is_custom:false,
    description:'Renforcement des obliques et de la stabilité latérale du tronc. Essentiel pour prévenir les blessures.',
    tips:'Hanche décollée du sol toute la durée. Corps aligné de la tête aux pieds. Regard droit devant.',
    steps:['Allonge-toi sur le côté, appui sur l\'avant-bras et le bord du pied','Soulève la hanche du sol','Corps parfaitement aligné, contracte les obliques','Maintiens puis change de côté'],
    duration_beginner:'3 × 20 sec/côté',duration_intermediate:'3 × 40 sec/côté',duration_advanced:'4 × 60 sec/côté',youtube_id:'ZJsBbHDSaB0' },
  { id:'bw-11',name:'Élastique — Rowing',muscle_group:'back',equipment:'cable',difficulty:'beginner',is_custom:false,
    description:'Simulation du rowing avec élastique. Cible les dorsaux, trapèzes et rhomboïdes. Idéal pour le travail postural.',
    tips:'Fixe l\'élastique à une porte ou barre. Tire les coudes vers l\'arrière en serrant les omoplates.',
    steps:['Fixe l\'élastique à hauteur de taille, saisis les deux extrémités','Bras tendus, dos droit, légère flexion des genoux','Tire les poignets vers le ventre en sortant les coudes','Resserre les omoplates en fin de mouvement, reviens lentement'],
    sets_beginner:'3 × 12 reps',sets_intermediate:'4 × 15 reps',sets_advanced:'4 × 20 reps',youtube_id:'GZbfZ033f74' },
  { id:'bw-12',name:'Élastique — Curl biceps',muscle_group:'arms',equipment:'cable',difficulty:'beginner',is_custom:false,
    description:'Curl biceps avec élastique. Tension constante tout au long du mouvement, excellent pour l\'isolation.',
    tips:'Pieds sur l\'élastique, saisis les extrémités. Coudes fixes le long du corps durant tout le mouvement.',
    steps:['Debout sur l\'élastique, pieds largeur épaules','Saisis les extrémités, paumes vers le haut','Fléchis les coudes en remontant les poignets vers les épaules','Descends lentement en 3 secondes'],
    sets_beginner:'3 × 12 reps',sets_intermediate:'3 × 15 reps',sets_advanced:'4 × 20 reps',youtube_id:'av7-8igSXTs' },
  { id:'bw-13',name:'Élastique — Squats',muscle_group:'legs',equipment:'cable',difficulty:'beginner',is_custom:false,
    description:'Squat avec résistance élastique. Ajoute de la difficulté sans matériel lourd. Idéal à domicile.',
    tips:'Place l\'élastique sous les pieds et sur les épaules. Même technique que le squat classique.',
    steps:['Passe l\'élastique sous les pieds, les extrémités sur les épaules','Pieds largeur épaules, orteils légèrement ouverts','Descends en squat complet, dos droit','Remonte en poussant dans le sol'],
    sets_beginner:'3 × 12 reps',sets_intermediate:'4 × 15 reps',sets_advanced:'4 × 20 reps',youtube_id:'YaXPRqUwItQ' },
  { id:'bw-14',name:'Pistol Squat',muscle_group:'legs',equipment:'bodyweight',difficulty:'advanced',is_custom:false,
    description:'Squat sur une jambe. Nécessite force, équilibre et mobilité. L\'exercice ultime du poids du corps pour les jambes.',
    tips:'Commence assisté (tenu à une barre). La jambe libre tendue devant. Descends jusqu\'au talon au sol.',
    steps:['Debout sur une jambe, l\'autre tendue devant à l\'horizontale','Bras tendus devant pour l\'équilibre','Descends en pliant le genou porteur, aussi bas que possible','Remonte en poussant fort sur le talon'],
    sets_beginner:'3 × 3 reps/jambe (assisté)',sets_intermediate:'3 × 6 reps/jambe',sets_advanced:'4 × 10 reps/jambe',youtube_id:'vq5-vdgJc0I' },
  { id:'bw-15',name:'Superman',muscle_group:'back',equipment:'bodyweight',difficulty:'beginner',is_custom:false,
    description:'Exercice au sol pour renforcer les érecteurs du rachis et les fessiers. Essentiel pour la santé du bas du dos.',
    tips:'Mouvement lent et contrôlé. Ne force pas avec le cou. Contracte les fessiers en haut.',
    steps:['Allonge-toi à plat ventre, bras tendus devant','Soulève simultanément bras, tête et jambes du sol','Maintiens 2 sec en contractant le dos et les fessiers','Redescends lentement'],
    sets_beginner:'3 × 10 reps',sets_intermediate:'3 × 15 reps',sets_advanced:'4 × 20 reps',youtube_id:'z6PJMT2y8GQ' },
]

const EQUIPMENT_EXERCISES: Exercise[] = [
  { id:'eq-1',name:'Développé couché',muscle_group:'chest',equipment:'barbell',difficulty:'intermediate',is_custom:false,
    description:'Exercice roi pour les pectoraux avec une barre. Développe masse et force.',
    tips:'Garde les pieds au sol, arc naturel dans le dos. Descends la barre jusqu\'à la poitrine. Pousse en expirant.',
    steps:['Allongé sur le banc, barre au-dessus de la poitrine','Décartèle légèrement (larg. épaules + 20cm)','Descends la barre vers le bas de la poitrine (3 sec)','Pousse explosif, barre au-dessus des clavicules'],
    sets_beginner:'3 × 8 reps',sets_intermediate:'4 × 6-8 reps',sets_advanced:'5 × 3-5 reps',youtube_id:'vcBig73ojpE' },
  { id:'eq-2',name:'Squat barre',muscle_group:'legs',equipment:'barbell',difficulty:'intermediate',is_custom:false,
    description:'L\'exercice le plus complet pour le bas du corps. Sollicite quadriceps, fessiers, ischio-jambiers et dos.',
    tips:'Barre sur les trapèzes, pas sur le cou. Descend dos droit, regard légèrement vers le haut.',
    steps:['Barre sur les trapèzes, pieds largeur épaules','Inspires, bloque le souffle (Valsalva), descends','Cuisse parallèle ou sous le parallèle','Pousse dans le sol, expire en haut'],
    sets_beginner:'3 × 10 reps',sets_intermediate:'4 × 6-8 reps',sets_advanced:'5 × 3-5 reps',youtube_id:'ultWZbUMPL8' },
  { id:'eq-3',name:'Soulevé de terre',muscle_group:'back',equipment:'barbell',difficulty:'advanced',is_custom:false,
    description:'L\'exercice roi de la force. Sollicite tout le corps, prioritairement le dos, fessiers et jambes.',
    tips:'Dos plat impératif. Barre contre les tibias. Pousse le sol vers le bas plutôt que de tirer la barre vers le haut.',
    steps:['Pieds sous la barre, largeur hanches. Saisis la barre juste à l\'extérieur des jambes','Hanches basses, dos plat, regard droit devant','Pousse dans le sol, barre contre les jambes','Hanche et épaule montent simultanément, verrouille en haut'],
    sets_beginner:'3 × 5 reps',sets_intermediate:'4 × 4-5 reps',sets_advanced:'5 × 1-3 reps',youtube_id:'op9kVnSso6Q' },
  { id:'eq-4',name:'Développé militaire',muscle_group:'shoulders',equipment:'barbell',difficulty:'intermediate',is_custom:false,
    description:'Exercice fondamental pour les épaules. Sollicite les deltoïdes et triceps.',
    tips:'Pas d\'hyperextension lombaire. Rentre le menton pour ne pas toucher le visage.',
    steps:['Barre en rack à hauteur d\'épaule, prise légèrement + large','Sors la barre, position debout, gainage actif','Pousse la barre vers le haut en rentrant le menton','Barre au-dessus de la tête, bras tendus'],
    sets_beginner:'3 × 8 reps',sets_intermediate:'4 × 6-8 reps',sets_advanced:'5 × 3-5 reps',youtube_id:'mMIbthfWjrA' },
  { id:'eq-5',name:'Rowing haltères',muscle_group:'back',equipment:'dumbbell',difficulty:'beginner',is_custom:false,
    description:'Exercice unilatéral pour le dos. Excellent pour corriger les déséquilibres gauche/droite.',
    tips:'Genou et main du même côté sur le banc. Tire le coude vers le haut et l\'arrière.',
    steps:['Genou et main droits sur le banc, haltère dans la main gauche','Dos plat, haltère bras tendu','Tire le coude gauche vers le plafond','Haltère à hauteur de hanche, descente lente'],
    sets_beginner:'3 × 10 reps/côté',sets_intermediate:'4 × 12 reps/côté',sets_advanced:'4 × 15 reps/côté',youtube_id:'pYcpY20QaE8' },
  { id:'eq-6',name:'Curl biceps haltères',muscle_group:'arms',equipment:'dumbbell',difficulty:'beginner',is_custom:false,
    description:'Isolation des biceps avec haltères. Permet un travail de supination complet.',
    tips:'Coudes fixes le long du corps. Supine (tourne) le poignet en remontant.',
    steps:['Debout, haltères dans chaque main, paumes vers l\'avant','Coudes collés aux flancs, bras tendus','Fléchis les coudes, amène les haltères vers les épaules','Descends lentement en 3 secondes'],
    sets_beginner:'3 × 10 reps',sets_intermediate:'3 × 12 reps',sets_advanced:'4 × 15 reps',youtube_id:'ykJmrZ5v0Oo' },
  { id:'eq-7',name:'Hip Thrust',muscle_group:'legs',equipment:'barbell',difficulty:'intermediate',is_custom:false,
    description:'Exercice roi pour les fessiers. Isolation et hypertrophie maximale des glutéaux.',
    tips:'Épaules sur le banc. Barre sur les hanches avec coussin. Contracte fort les fessiers en haut.',
    steps:['Épaules sur le banc, barre sur les hanches','Pieds à plat, largeur hanches','Pousse les hanches vers le haut explosif','Corps parallèle au sol, fessiers contractés 1 sec'],
    sets_beginner:'3 × 12 reps',sets_intermediate:'4 × 10-12 reps',sets_advanced:'5 × 8-10 reps',youtube_id:'SEdqd9MIsAA' },
  { id:'eq-8',name:'Élévations latérales',muscle_group:'shoulders',equipment:'dumbbell',difficulty:'beginner',is_custom:false,
    description:'Isolation des deltoïdes latéraux pour des épaules larges et équilibrées.',
    tips:'Légère flexion des coudes. Monte jusqu\'à l\'horizontale seulement.',
    steps:['Debout, haltères le long du corps, paumes vers l\'intérieur','Légère flexion des coudes','Lève les bras sur les côtés jusqu\'à l\'horizontale','Descends lentement en 3 secondes'],
    sets_beginner:'3 × 12 reps',sets_intermediate:'4 × 15 reps',sets_advanced:'4 × 20 reps',youtube_id:'FeJbFMiDsG4' },
]

const EQUIPMENT_ICONS: Record<string, string> = { barbell:'🏋️',dumbbell:'💪',machine:'⚙️',bodyweight:'🤸',cable:'🎯',other:'🔧' }
const EQUIPMENT_LABELS: Record<string, string> = { barbell:'Barre',dumbbell:'Haltères',machine:'Machine',bodyweight:'Poids du corps',cable:'Élastique / Poulie',other:'Autre' }

function ExerciseCard({ ex, onClick }: { ex: Exercise; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '16px', cursor: 'pointer', transition: 'all .15s',
      borderTop: `3px solid ${DIFFICULTY_COLORS[ex.difficulty] || 'var(--a1)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 26 }}>{EQUIPMENT_ICONS[ex.equipment] || '💪'}</div>
        <Pill color={DIFFICULTY_COLORS[ex.difficulty]}>{DIFFICULTY_LABELS[ex.difficulty]}</Pill>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)', marginBottom: 4 }}>{ex.name}</div>
      <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{MUSCLE_GROUPS.find(g => g.id === ex.muscle_group)?.icon}</span>
        <span>{MUSCLE_GROUPS.find(g => g.id === ex.muscle_group)?.label}</span>
        <span style={{ color: 'var(--txt3)' }}>·</span>
        <span style={{ color: 'var(--txt3)' }}>{EQUIPMENT_LABELS[ex.equipment]}</span>
      </div>
      {ex.description && <div style={{ fontSize: 12, color: 'var(--txt3)', lineHeight: 1.5 }}>{ex.description.slice(0, 70)}…</div>}
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--a1)', fontWeight: 500 }}>Voir le détail →</div>
    </div>
  )
}

function ExerciseDetail({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  return (
    <Modal open={!!ex} onClose={onClose} title={ex.name}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Pill color={DIFFICULTY_COLORS[ex.difficulty]}>{DIFFICULTY_LABELS[ex.difficulty]}</Pill>
        <Pill color="var(--a1)">{EQUIPMENT_ICONS[ex.equipment]} {EQUIPMENT_LABELS[ex.equipment]}</Pill>
        <Pill color="var(--a2)">{MUSCLE_GROUPS.find(g => g.id === ex.muscle_group)?.icon} {MUSCLE_GROUPS.find(g => g.id === ex.muscle_group)?.label}</Pill>
      </div>
      {ex.youtube_id && (
        <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
          <iframe width="100%" height="240" src={`https://www.youtube.com/embed/${ex.youtube_id}?rel=0&modestbranding=1`} title={ex.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ display: 'block' }} />
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8, fontWeight: 600 }}>Description</div>
        <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7 }}>{ex.description}</div>
      </div>
      {ex.steps && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, fontWeight: 600 }}>Étapes du mouvement</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ex.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--a1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: 'var(--txt1)', lineHeight: 1.6, paddingTop: 2 }}>{step}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {ex.tips && (
        <div style={{ background: 'rgba(79,142,247,.08)', border: '1px solid rgba(79,142,247,.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--a1)', fontWeight: 600, marginBottom: 6 }}>💡 Conseils techniques</div>
          <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.7 }}>{ex.tips}</div>
        </div>
      )}
      <div>
        <div style={{ fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, fontWeight: 600 }}>Volume recommandé par niveau</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[
            { level: 'Débutant', val: ex.sets_beginner || ex.duration_beginner, col: '#22d3a0' },
            { level: 'Intermédiaire', val: ex.sets_intermediate || ex.duration_intermediate, col: '#f59e0b' },
            { level: 'Avancé', val: ex.sets_advanced || ex.duration_advanced, col: '#f43f5e' },
          ].map(({ level, val, col }) => (
            <div key={level} style={{ background: col + '12', border: `1px solid ${col}30`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: col, fontWeight: 600, marginBottom: 4 }}>{level}</div>
              <div style={{ fontSize: 13, color: 'var(--txt1)', fontWeight: 500 }}>{val || '—'}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <Btn onClick={onClose}>Fermer</Btn>
      </div>
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
    const context = `Coach muscu expert. L'athlète a ${sessions.length} séances.
Tab actuel: ${tab === 'bodyweight' ? 'Poids du corps & Élastiques' : 'Avec matériel'}.
Exercices disponibles dans cet onglet: ${baseList.map(e => e.name).join(', ')}.
Donne exactement 3 recommandations d'exercices parmi ceux disponibles, avec une phrase d'explication. Format: "**Nom** — raison". En français, concis.`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400, messages: [{ role: 'user', content: context }] })
      })
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
    await supabase.from('exercises').insert({
      user_id: user.id, name: newName, muscle_group: newGroup,
      description: newDesc, tips: newTips, difficulty: newDiff,
      equipment: newEquip, is_custom: true,
    })
    showToast('Exercice ajouté ! 💪')
    setAddModal(false)
    setNewName(''); setNewDesc(''); setNewTips('')
    setSaving(false)
  }

  return (
    <div>
      <Topbar title="Bibliothèque d'exercices" subtitle={view === 'exercises' ? `${baseList.length} exercices · Clique pour voir la vidéo et les détails` : 'Programmes complets prêts à l\'emploi'} action={view === 'exercises' ? { label: 'Ajouter un exercice', fn: () => setAddModal(true) } : undefined} />
      <div style={{ padding: '0 28px 28px' }}>

        {/* View switcher: Exercises vs Workouts */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 12, width: 'fit-content' }}>
          {[
            { id: 'exercises' as const, icon: '📋', label: 'Exercices individuels' },
            { id: 'workouts' as const, icon: '📅', label: 'Programmes complets' },
          ].map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: view === v.id ? 'var(--a2)' : 'transparent',
              color: view === v.id ? '#fff' : 'var(--txt2)',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: view === v.id ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
            }}>{v.icon} {v.label}</button>
          ))}
        </div>

        {/* Equipment tab selector */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 16, width: 'fit-content' }}>
          {[
            { id: 'bodyweight' as const, icon: '🤸', label: 'Poids du corps & Élastiques' },
            { id: 'equipment'  as const, icon: '🏋️', label: 'Avec matériel' },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setFilter('all') }} style={{
              padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'var(--a1)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--txt2)',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {view === 'exercises' && (
          <>
            {/* AI Recommendations */}
            <div style={{ background: 'linear-gradient(135deg,var(--bg2),var(--bg3))', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--a1),var(--a2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>Recommandé pour toi</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)' }}>Basé sur tes {sessions.length} séances précédentes</div>
                </div>
                <Btn onClick={getAiRecommendations} disabled={aiLoading} variant="outline" style={{ marginLeft: 'auto', fontSize: 11 }}>{aiLoading ? '⏳' : '🔄'}</Btn>
              </div>
              {aiLoading ? (
                <div style={{ fontSize: 13, color: 'var(--txt2)', fontStyle: 'italic' }}>Analyse de tes séances…</div>
              ) : aiRec ? (
                <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{aiRec}</div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--txt3)' }}>Ajoute des séances pour des recommandations personnalisées.</div>
              )}
            </div>

            {/* Search + muscle filters */}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher…"
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', marginBottom: 12 }} />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {MUSCLE_GROUPS.map(g => (
                <button key={g.id} onClick={() => setFilter(g.id)} style={{
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                  border: `1px solid ${filter === g.id ? 'var(--a1)' : 'var(--border2)'}`,
                  background: filter === g.id ? 'rgba(79,142,247,.12)' : 'var(--bg3)',
                  color: filter === g.id ? 'var(--a1)' : 'var(--txt2)',
                  fontFamily: 'DM Sans, sans-serif',
                }}>{g.icon} {g.label}</button>
              ))}
            </div>

            {/* Exercise grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {filtered.map(ex => <ExerciseCard key={ex.id} ex={ex} onClick={() => setSelected(ex)} />)}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txt3)', fontSize: 13 }}>Aucun exercice trouvé pour cette recherche</div>
            )}
          </>
        )}

        {view === 'workouts' && (
          <WorkoutPlans category={tab} sports={sports} addEvent={addEvent} showToast={showToast} />
        )}
      </div>

      {selected && <ExerciseDetail ex={selected} onClose={() => setSelected(null)} />}

      {/* Add custom exercise modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="➕ Ajouter un exercice">
        <Input label="Nom" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Curl marteau" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Groupe musculaire" value={newGroup} onChange={e => setNewGroup(e.target.value)}>
            {MUSCLE_GROUPS.filter(g => g.id !== 'all').map(g => <option key={g.id} value={g.id}>{g.icon} {g.label}</option>)}
          </Select>
          <Select label="Équipement" value={newEquip} onChange={e => setNewEquip(e.target.value)}>
            <option value="bodyweight">🤸 Poids du corps</option>
            <option value="cable">🎯 Élastique</option>
            <option value="barbell">🏋️ Barre</option>
            <option value="dumbbell">💪 Haltères</option>
            <option value="machine">⚙️ Machine</option>
          </Select>
        </div>
        <Select label="Difficulté" value={newDiff} onChange={e => setNewDiff(e.target.value)}>
          <option value="beginner">🟢 Débutant</option>
          <option value="intermediate">🟡 Intermédiaire</option>
          <option value="advanced">🔴 Avancé</option>
        </Select>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Description</label>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', minHeight: 70, resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Conseils techniques</label>
          <textarea value={newTips} onChange={e => setNewTips(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--txt1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', minHeight: 70, resize: 'vertical' }} />
        </div>
        <ModalActions onCancel={() => setAddModal(false)} onConfirm={addCustomExercise} loading={saving} confirmLabel="Ajouter" />
      </Modal>
    </div>
  )
}
