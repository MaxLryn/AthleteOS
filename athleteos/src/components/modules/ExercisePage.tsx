'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle, Topbar, Pill, Btn, Modal, ModalActions, Input, Select } from '@/components/ui'
import type { Session, Sport } from '@/types'

interface Exercise {
  id: string; name: string; muscle_group: string; description: string; tips: string
  difficulty: string; equipment: string; is_custom: boolean; youtube_id?: string
  steps?: string[]; sets_beginner?: string; sets_intermediate?: string; sets_advanced?: string
  duration_beginner?: string; duration_intermediate?: string; duration_advanced?: string
}

interface Workout {
  id: string; name: string; level: string; duration: string; target: string
  description: string; icon: string; color: string; equipment: string
  exercises: { name: string; sets: string; rest: string; tip: string; icon: string }[]
}

interface Props { sessions: Session[]; sports: Sport[]; showToast: (msg: string, type?: 'success' | 'error') => void; [key: string]: unknown }

const MUSCLE_GROUPS = [
  { id: 'all', label: 'Tous', icon: '💪' }, { id: 'chest', label: 'Pectoraux', icon: '🫁' },
  { id: 'back', label: 'Dos', icon: '🔙' }, { id: 'shoulders', label: 'Épaules', icon: '🦾' },
  { id: 'arms', label: 'Bras', icon: '💪' }, { id: 'legs', label: 'Jambes', icon: '🦵' },
  { id: 'core', label: 'Abdos/Gainage', icon: '⭕' }, { id: 'full_body', label: 'Full Body', icon: '🏃' },
]
const DC: Record<string,string> = { beginner:'#22d3a0', intermediate:'#f59e0b', advanced:'#f43f5e' }
const DL: Record<string,string> = { beginner:'Débutant', intermediate:'Intermédiaire', advanced:'Avancé' }
const EI: Record<string,string> = { barbell:'🏋️', dumbbell:'💪', machine:'⚙️', bodyweight:'🤸', cable:'🎯', other:'🔧' }
const EL: Record<string,string> = { barbell:'Barre', dumbbell:'Haltères', machine:'Machine', bodyweight:'Poids du corps', cable:'Élastique', other:'Autre' }

const BW_EXERCISES: Exercise[] = [
  { id:'bw-1', name:'Pompes', muscle_group:'chest', equipment:'bodyweight', difficulty:'beginner', is_custom:false,
    description:'Exercice fondamental pour les pectoraux, triceps et deltoïdes. Réalisable partout, sans matériel.',
    tips:'Corps aligné de la tête aux talons. Descends jusqu\'à ce que la poitrine frôle le sol.',
    steps:['Position planche : mains légèrement + larges que les épaules','Descends lentement en pliant les coudes (2-3 sec)','Poitrine à 2 cm du sol, coudes à 45° du corps','Pousse explosif vers le haut en expirant'],
    sets_beginner:'3 × 8-10 reps', sets_intermediate:'4 × 15-20 reps', sets_advanced:'5 × 25-30 reps', youtube_id:'IODxDxX7oi4' },
  { id:'bw-2', name:'Pompes surélevées', muscle_group:'chest', equipment:'bodyweight', difficulty:'intermediate', is_custom:false,
    description:'Pieds surélevés pour cibler la partie haute des pectoraux et les épaules.',
    tips:'Place les pieds sur une chaise. Le buste doit descendre verticalement.',
    steps:['Pieds sur une surface surélevée (30-60cm)','Mains au sol, largeur épaules','Descends la tête vers le sol','Pousse et reviens à la position initiale'],
    sets_beginner:'3 × 6-8 reps', sets_intermediate:'3 × 12-15 reps', sets_advanced:'4 × 20 reps', youtube_id:'ddaB8BSgRgM' },
  { id:'bw-3', name:'Tractions', muscle_group:'back', equipment:'bodyweight', difficulty:'intermediate', is_custom:false,
    description:'Roi des exercices pour le dos. Développe les grands dorsaux et biceps.',
    tips:'Prise pronation pour les dorsaux. Descente complète obligatoire.',
    steps:['Barre à hauteur bras tendus, prise pronation largeur épaules','Engage abdos et épaules vers le bas','Tire en pensant "coudes vers les hanches"','Descente lente et contrôlée (3 sec)'],
    sets_beginner:'3 × 3-5 reps (assisté)', sets_intermediate:'4 × 8-10 reps', sets_advanced:'5 × 12-15 reps', youtube_id:'eGo4IYlbE5g' },
  { id:'bw-4', name:'Dips', muscle_group:'arms', equipment:'bodyweight', difficulty:'intermediate', is_custom:false,
    description:'Poids du corps pour les triceps et pectoraux inférieurs. Deux chaises suffisent.',
    tips:'Corps droit = triceps. Penché avant = pectoraux. Descends jusqu\'à 90°.',
    steps:['Appui sur deux chaises, corps suspendu','Descends lentement jusqu\'aux coudes à 90°','Pause 1 sec en bas','Pousse fort vers le haut'],
    sets_beginner:'3 × 5-8 reps', sets_intermediate:'3 × 12-15 reps', sets_advanced:'4 × 20 reps', youtube_id:'wjUmnZH528Y' },
  { id:'bw-5', name:'Squat', muscle_group:'legs', equipment:'bodyweight', difficulty:'beginner', is_custom:false,
    description:'Exercice de base pour quadriceps, fessiers et ischio-jambiers.',
    tips:'Pieds largeur épaules, genoux dans l\'axe des pieds. Descends jusqu\'au parallèle.',
    steps:['Debout, pieds largeur épaules, orteils légèrement ouverts','Bras tendus devant, pousse les hanches en arrière','Cuisse parallèle au sol minimum','Pousse dans le sol pour remonter'],
    sets_beginner:'3 × 15 reps', sets_intermediate:'4 × 20-25 reps', sets_advanced:'5 × 30 reps', youtube_id:'aclHkVaku9U' },
  { id:'bw-6', name:'Fentes', muscle_group:'legs', equipment:'bodyweight', difficulty:'beginner', is_custom:false,
    description:'Exercice unilatéral pour les quadriceps et fessiers. Améliore l\'équilibre.',
    tips:'Genou arrière ne touche pas brusquement le sol. Tronc droit.',
    steps:['Debout, pieds joints','Grand pas en avant avec la jambe droite','Descends jusqu\'à ce que le genou arrière frôle le sol','Pousse sur le pied avant pour revenir, alterne'],
    sets_beginner:'3 × 10 reps/jambe', sets_intermediate:'3 × 15 reps/jambe', sets_advanced:'4 × 20 reps/jambe', youtube_id:'QOVaHwm-Q6U' },
  { id:'bw-7', name:'Planche', muscle_group:'core', equipment:'bodyweight', difficulty:'beginner', is_custom:false,
    description:'Gainage isométrique complet. Renforce toute la ceinture abdominale.',
    tips:'Corps rigide. Rentre le ventre. Respire normalement.',
    steps:['Appui avant-bras et orteils','Soulève le bassin — corps aligné','Contracte abdos, fessiers et cuisses','Maintiens en respirant normalement'],
    duration_beginner:'3 × 20-30 sec', duration_intermediate:'3 × 45-60 sec', duration_advanced:'4 × 90 sec+', youtube_id:'pSHjTRCQxIw' },
  { id:'bw-8', name:'Mountain Climbers', muscle_group:'core', equipment:'bodyweight', difficulty:'intermediate', is_custom:false,
    description:'Gainage dynamique + cardio. Excellent pour les abdos et la condition générale.',
    tips:'Hanches basses et stables. Ne saute pas les hanches vers le haut.',
    steps:['Position pompe haute, corps droit','Amène genou droit vers la poitrine rapidement','Reviens et fais pareil genou gauche','Alterne rapidement comme si tu escaladais'],
    duration_beginner:'3 × 20 sec', duration_intermediate:'3 × 40 sec', duration_advanced:'4 × 60 sec', youtube_id:'nmwgirgXLYM' },
  { id:'bw-9', name:'Burpee', muscle_group:'full_body', equipment:'bodyweight', difficulty:'intermediate', is_custom:false,
    description:'Full body intense : force + cardio. Brûle énormément de calories.',
    tips:'Qualité avant vitesse. Pompe complète. Saut avec mains au-dessus de la tête.',
    steps:['Debout, pieds largeur épaules','Accroupis-toi, pose les mains au sol','Saute pieds en arrière → pompe','Saute les pieds vers les mains, saut vertical'],
    sets_beginner:'3 × 5 reps', sets_intermediate:'3 × 10 reps', sets_advanced:'4 × 15 reps', youtube_id:'dZgVxmf6jkA' },
  { id:'bw-10', name:'Gainage latéral', muscle_group:'core', equipment:'bodyweight', difficulty:'beginner', is_custom:false,
    description:'Renforce les obliques et la stabilité latérale. Essentiel contre les blessures.',
    tips:'Hanche décollée du sol toute la durée. Corps parfaitement aligné.',
    steps:['Sur le côté, appui avant-bras et bord du pied','Soulève la hanche du sol','Corps aligné, contracte les obliques','Maintiens puis change de côté'],
    duration_beginner:'3 × 20 sec/côté', duration_intermediate:'3 × 40 sec/côté', duration_advanced:'4 × 60 sec/côté', youtube_id:'ZJsBbHDSaB0' },
  { id:'bw-11', name:'Élastique — Rowing', muscle_group:'back', equipment:'cable', difficulty:'beginner', is_custom:false,
    description:'Simulation du rowing avec élastique. Cible les dorsaux et trapèzes.',
    tips:'Fixe l\'élastique à une porte. Tire les coudes vers l\'arrière en serrant les omoplates.',
    steps:['Fixe l\'élastique à hauteur de taille','Bras tendus, dos droit, légère flexion genoux','Tire les poignets vers le ventre, coudes serrés','Resserre les omoplates en fin de mouvement'],
    sets_beginner:'3 × 12 reps', sets_intermediate:'4 × 15 reps', sets_advanced:'4 × 20 reps', youtube_id:'GZbfZ033f74' },
  { id:'bw-12', name:'Élastique — Curl biceps', muscle_group:'arms', equipment:'cable', difficulty:'beginner', is_custom:false,
    description:'Curl biceps avec élastique. Tension constante, excellent pour l\'isolation.',
    tips:'Pieds sur l\'élastique. Coudes fixes le long du corps.',
    steps:['Debout sur l\'élastique, pieds largeur épaules','Saisis les extrémités, paumes vers le haut','Fléchis les coudes vers les épaules','Descends lentement en 3 secondes'],
    sets_beginner:'3 × 12 reps', sets_intermediate:'3 × 15 reps', sets_advanced:'4 × 20 reps', youtube_id:'av7-8igSXTs' },
  { id:'bw-13', name:'Superman', muscle_group:'back', equipment:'bodyweight', difficulty:'beginner', is_custom:false,
    description:'Renforce les érecteurs du rachis et les fessiers. Essentiel pour le bas du dos.',
    tips:'Mouvement lent. Ne force pas avec le cou. Contracte les fessiers en haut.',
    steps:['Allonge-toi à plat ventre, bras tendus devant','Soulève simultanément bras, tête et jambes','Maintiens 2 sec en contractant dos et fessiers','Redescends lentement'],
    sets_beginner:'3 × 10 reps', sets_intermediate:'3 × 15 reps', sets_advanced:'4 × 20 reps', youtube_id:'z6PJMT2y8GQ' },
  { id:'bw-14', name:'Pistol Squat', muscle_group:'legs', equipment:'bodyweight', difficulty:'advanced', is_custom:false,
    description:'Squat sur une jambe. Force, équilibre et mobilité. L\'exercice ultime.',
    tips:'Commence assisté (tenu à une barre). Jambe libre tendue devant.',
    steps:['Debout sur une jambe, l\'autre tendue devant','Bras tendus devant pour l\'équilibre','Descends en pliant le genou porteur au max','Remonte en poussant fort sur le talon'],
    sets_beginner:'3 × 3 reps/jambe (assisté)', sets_intermediate:'3 × 6 reps/jambe', sets_advanced:'4 × 10 reps/jambe', youtube_id:'vq5-vdgJc0I' },
]

const EQ_EXERCISES: Exercise[] = [
  { id:'eq-1', name:'Développé couché', muscle_group:'chest', equipment:'barbell', difficulty:'intermediate', is_custom:false,
    description:'Exercice roi pour les pectoraux avec barre. Masse et force.',
    tips:'Pieds au sol, arc naturel dans le dos. Barre jusqu\'à la poitrine.',
    steps:['Allongé sur le banc, barre au-dessus de la poitrine','Prise larg. épaules + 20cm','Descends vers le bas de la poitrine (3 sec)','Pousse explosif, barre au-dessus des clavicules'],
    sets_beginner:'3 × 8 reps', sets_intermediate:'4 × 6-8 reps', sets_advanced:'5 × 3-5 reps', youtube_id:'vcBig73ojpE' },
  { id:'eq-2', name:'Squat barre', muscle_group:'legs', equipment:'barbell', difficulty:'intermediate', is_custom:false,
    description:'Le plus complet pour le bas du corps. Quadriceps, fessiers, ischio-jambiers.',
    tips:'Barre sur les trapèzes. Descent dos droit, regard légèrement vers le haut.',
    steps:['Barre sur trapèzes, pieds largeur épaules','Inspire, bloque le souffle, descends','Cuisse parallèle ou sous le parallèle','Pousse dans le sol, expire en haut'],
    sets_beginner:'3 × 10 reps', sets_intermediate:'4 × 6-8 reps', sets_advanced:'5 × 3-5 reps', youtube_id:'ultWZbUMPL8' },
  { id:'eq-3', name:'Soulevé de terre', muscle_group:'back', equipment:'barbell', difficulty:'advanced', is_custom:false,
    description:'L\'exercice roi de la force. Tout le corps, prioritairement dos, fessiers et jambes.',
    tips:'Dos plat impératif. Barre contre les tibias.',
    steps:['Pieds sous la barre, largeur hanches','Hanches basses, dos plat, regard droit','Pousse dans le sol, barre contre les jambes','Hanches et épaules montent ensemble'],
    sets_beginner:'3 × 5 reps', sets_intermediate:'4 × 4-5 reps', sets_advanced:'5 × 1-3 reps', youtube_id:'op9kVnSso6Q' },
  { id:'eq-4', name:'Développé militaire', muscle_group:'shoulders', equipment:'barbell', difficulty:'intermediate', is_custom:false,
    description:'Exercice fondamental pour les épaules. Deltoïdes et triceps.',
    tips:'Pas d\'hyperextension lombaire. Rentre le menton.',
    steps:['Barre en rack à hauteur d\'épaule','Sors la barre, debout, gainage actif','Pousse la barre vers le haut','Bras tendus au-dessus de la tête'],
    sets_beginner:'3 × 8 reps', sets_intermediate:'4 × 6-8 reps', sets_advanced:'5 × 3-5 reps', youtube_id:'mMIbthfWjrA' },
  { id:'eq-5', name:'Rowing haltères', muscle_group:'back', equipment:'dumbbell', difficulty:'beginner', is_custom:false,
    description:'Exercice unilatéral pour le dos. Corrige les déséquilibres gauche/droite.',
    tips:'Genou et main sur le banc. Tire le coude vers le haut et l\'arrière.',
    steps:['Genou et main droits sur banc, haltère main gauche','Dos plat, haltère bras tendu','Tire le coude gauche vers le plafond','Haltère à hauteur de hanche, descente lente'],
    sets_beginner:'3 × 10 reps/côté', sets_intermediate:'4 × 12 reps/côté', sets_advanced:'4 × 15 reps/côté', youtube_id:'pYcpY20QaE8' },
  { id:'eq-6', name:'Hip Thrust', muscle_group:'legs', equipment:'barbell', difficulty:'intermediate', is_custom:false,
    description:'Exercice roi pour les fessiers. Isolation et hypertrophie maximale des glutéaux.',
    tips:'Épaules sur le banc. Barre sur les hanches avec coussin.',
    steps:['Épaules sur le banc, barre sur les hanches','Pieds à plat, largeur hanches','Pousse les hanches vers le haut explosif','Corps parallèle au sol, fessiers contractés 1 sec'],
    sets_beginner:'3 × 12 reps', sets_intermediate:'4 × 10-12 reps', sets_advanced:'5 × 8-10 reps', youtube_id:'SEdqd9MIsAA' },
  { id:'eq-7', name:'Curl biceps haltères', muscle_group:'arms', equipment:'dumbbell', difficulty:'beginner', is_custom:false,
    description:'Isolation des biceps. Permet un travail de supination complet.',
    tips:'Coudes fixes. Supine le poignet en remontant.',
    steps:['Debout, haltères chaque main, paumes vers l\'avant','Coudes collés aux flancs','Fléchis les coudes vers les épaules','Descends lentement en 3 secondes'],
    sets_beginner:'3 × 10 reps', sets_intermediate:'3 × 12 reps', sets_advanced:'4 × 15 reps', youtube_id:'ykJmrZ5v0Oo' },
  { id:'eq-8', name:'Élévations latérales', muscle_group:'shoulders', equipment:'dumbbell', difficulty:'beginner', is_custom:false,
    description:'Isolation des deltoïdes latéraux pour des épaules larges et équilibrées.',
    tips:'Légère flexion des coudes. Monte jusqu\'à l\'horizontale seulement.',
    steps:['Debout, haltères le long du corps','Légère flexion des coudes','Lève les bras sur les côtés jusqu\'à l\'horizontale','Descends lentement en 3 secondes'],
    sets_beginner:'3 × 12 reps', sets_intermediate:'4 × 15 reps', sets_advanced:'4 × 20 reps', youtube_id:'FeJbFMiDsG4' },
]

const WORKOUTS: Workout[] = [
  {
    id:'w-1', name:'Full Body Débutant', level:'beginner', duration:'30 min', target:'full_body',
    description:'Séance complète idéale pour débuter. Travaille tous les groupes musculaires avec des exercices poids du corps simples.',
    icon:'🌟', color:'#22d3a0', equipment:'bodyweight',
    exercises:[
      { name:'Squat', sets:'3 × 15 reps', rest:'60 sec', tip:'Dos droit, descends jusqu\'au parallèle', icon:'🦵' },
      { name:'Pompes', sets:'3 × 8-10 reps', rest:'60 sec', tip:'Coudes à 45°, corps aligné', icon:'💪' },
      { name:'Planche', sets:'3 × 20 sec', rest:'45 sec', tip:'Rentre le ventre, respire normalement', icon:'⭕' },
      { name:'Fentes', sets:'3 × 10/jambe', rest:'60 sec', tip:'Genou arrière proche du sol', icon:'🦵' },
      { name:'Superman', sets:'3 × 10 reps', rest:'45 sec', tip:'Mouvement lent et contrôlé', icon:'🔙' },
    ]
  },
  {
    id:'w-2', name:'HIIT Poids du Corps', level:'intermediate', duration:'25 min', target:'full_body',
    description:'Circuit haute intensité pour brûler les calories et améliorer le cardio. 40 sec effort / 20 sec repos.',
    icon:'🔥', color:'#f43f5e', equipment:'bodyweight',
    exercises:[
      { name:'Burpees', sets:'40 sec', rest:'20 sec', tip:'Saut le plus haut possible', icon:'🏃' },
      { name:'Mountain Climbers', sets:'40 sec', rest:'20 sec', tip:'Hanches basses et stables', icon:'⭕' },
      { name:'Squat Jump', sets:'40 sec', rest:'20 sec', tip:'Descends bas, saute haut', icon:'🦵' },
      { name:'Pompes explosives', sets:'40 sec', rest:'20 sec', tip:'Mains décollent du sol', icon:'💪' },
      { name:'Gainage latéral', sets:'20 sec/côté', rest:'20 sec', tip:'Corps aligné', icon:'⭕' },
      { name:'Burpees', sets:'40 sec', rest:'60 sec', tip:'Dernier round, tout donner !', icon:'🏃' },
    ]
  },
  {
    id:'w-3', name:'Upper Body Poids du Corps', level:'intermediate', duration:'40 min', target:'chest',
    description:'Séance haut du corps complète sans matériel. Pectoraux, dos, épaules et bras.',
    icon:'💪', color:'#4f8ef7', equipment:'bodyweight',
    exercises:[
      { name:'Pompes larges', sets:'4 × 12 reps', rest:'60 sec', tip:'Mains très écartées pour cibler les pecs', icon:'🫁' },
      { name:'Tractions', sets:'4 × max reps', rest:'90 sec', tip:'Descente complète obligatoire', icon:'🔙' },
      { name:'Dips', sets:'3 × 10-12 reps', rest:'75 sec', tip:'Descends jusqu\'à 90°', icon:'💪' },
      { name:'Pompes serrées', sets:'3 × 10 reps', rest:'60 sec', tip:'Coudes près du corps pour triceps', icon:'💪' },
      { name:'Élastique Rowing', sets:'3 × 15 reps', rest:'60 sec', tip:'Serre les omoplates', icon:'🔙' },
    ]
  },
  {
    id:'w-4', name:'Legs & Glutes', level:'intermediate', duration:'45 min', target:'legs',
    description:'Séance jambes et fessiers intense. Idéale 2x par semaine pour des résultats visibles.',
    icon:'🦵', color:'#a855f7', equipment:'bodyweight',
    exercises:[
      { name:'Squat', sets:'4 × 20 reps', rest:'60 sec', tip:'Descends plus bas que le parallèle', icon:'🦵' },
      { name:'Fentes marchées', sets:'3 × 15/jambe', rest:'60 sec', tip:'Grand pas, tronc droit', icon:'🦵' },
      { name:'Squat sumo', sets:'3 × 15 reps', rest:'60 sec', tip:'Pieds très écartés, fessiers en arrière', icon:'🦵' },
      { name:'Glute Bridge', sets:'4 × 20 reps', rest:'45 sec', tip:'Contracte fort les fessiers en haut', icon:'🦵' },
      { name:'Pistol Squat assisté', sets:'3 × 6/jambe', rest:'90 sec', tip:'Tiens-toi à un mur si besoin', icon:'🦵' },
      { name:'Gainage latéral', sets:'3 × 30 sec/côté', rest:'30 sec', tip:'Stabilise le bassin', icon:'⭕' },
    ]
  },
  {
    id:'w-5', name:'Core & Abdos', level:'beginner', duration:'20 min', target:'core',
    description:'Gainage et renforcement abdominal complet. À faire 3x par semaine pour des abdos solides.',
    icon:'⭕', color:'#38bdf8', equipment:'bodyweight',
    exercises:[
      { name:'Planche', sets:'3 × 30-45 sec', rest:'30 sec', tip:'Rentre le ventre fort', icon:'⭕' },
      { name:'Gainage latéral', sets:'3 × 20 sec/côté', rest:'20 sec', tip:'Hanche décollée', icon:'⭕' },
      { name:'Mountain Climbers', sets:'3 × 30 sec', rest:'30 sec', tip:'Rythme régulier', icon:'⭕' },
      { name:'Superman', sets:'3 × 12 reps', rest:'30 sec', tip:'Maintiens 2 sec en haut', icon:'🔙' },
      { name:'Crunch', sets:'3 × 15 reps', rest:'30 sec', tip:'Ne tire pas sur la nuque', icon:'⭕' },
    ]
  },
  {
    id:'w-6', name:'Push / Pull avec élastiques', level:'intermediate', duration:'45 min', target:'back',
    description:'Programme push/pull complet avec élastiques. Idéal à domicile pour un entraînement musclé.',
    icon:'🎯', color:'#f59e0b', equipment:'cable',
    exercises:[
      { name:'Élastique — Rowing', sets:'4 × 15 reps', rest:'60 sec', tip:'Serrer les omoplates', icon:'🔙' },
      { name:'Pompes', sets:'4 × 12 reps', rest:'60 sec', tip:'Corps parfaitement aligné', icon:'💪' },
      { name:'Élastique — Curl biceps', sets:'3 × 15 reps', rest:'45 sec', tip:'Coudes fixes', icon:'💪' },
      { name:'Dips', sets:'3 × 10 reps', rest:'60 sec', tip:'Descente complète', icon:'💪' },
      { name:'Élastique — Squats', sets:'3 × 15 reps', rest:'60 sec', tip:'Élastique sous pieds, sur épaules', icon:'🦵' },
    ]
  },
  {
    id:'w-7', name:'Force Fondamentaux (matériel)', level:'intermediate', duration:'55 min', target:'full_body',
    description:'Programme de force basé sur les 3 mouvements fondamentaux. Pour ceux qui ont accès à une salle.',
    icon:'🏋️', color:'#4f8ef7', equipment:'barbell',
    exercises:[
      { name:'Squat barre', sets:'5 × 5 reps', rest:'3 min', tip:'Profond et dos droit', icon:'🦵' },
      { name:'Développé couché', sets:'5 × 5 reps', rest:'2-3 min', tip:'Barre jusqu\'à la poitrine', icon:'🫁' },
      { name:'Rowing haltères', sets:'4 × 8/côté', rest:'90 sec', tip:'Tire le coude vers le plafond', icon:'🔙' },
      { name:'Développé militaire', sets:'4 × 6 reps', rest:'2 min', tip:'Gainage actif', icon:'🦾' },
    ]
  },
  {
    id:'w-8', name:'Récupération Active', level:'beginner', duration:'20 min', target:'full_body',
    description:'Séance douce pour les jours de fatigue ou de récupération. Mobilité et étirements dynamiques.',
    icon:'😌', color:'#22d3a0', equipment:'bodyweight',
    exercises:[
      { name:'Chat-vache (yoga)', sets:'2 × 10 reps', rest:'0', tip:'Respire profondément, mouvement fluide', icon:'🐱' },
      { name:'Fentes basses avec rotation', sets:'2 × 8/jambe', rest:'30 sec', tip:'Rotation lente et contrôlée', icon:'🦵' },
      { name:'Superman lent', sets:'2 × 8 reps', rest:'30 sec', tip:'3 sec en haut, 3 sec descente', icon:'🔙' },
      { name:'Planche sur genoux', sets:'3 × 20 sec', rest:'20 sec', tip:'Idéal pour renforcer en douceur', icon:'⭕' },
      { name:'Squat profond maintenu', sets:'3 × 30 sec', rest:'20 sec', tip:'Descends le plus bas possible', icon:'🦵' },
    ]
  },
]

function ExerciseCard({ ex, onClick }: { ex: Exercise; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'16px', cursor:'pointer', transition:'all .15s', borderTop:`3px solid ${DC[ex.difficulty]||'var(--a1)'}` }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontSize:26 }}>{EI[ex.equipment]||'💪'}</div>
        <Pill color={DC[ex.difficulty]}>{DL[ex.difficulty]}</Pill>
      </div>
      <div style={{ fontSize:14, fontWeight:600, color:'var(--txt1)', marginBottom:4 }}>{ex.name}</div>
      <div style={{ fontSize:11, color:'var(--txt2)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
        <span>{MUSCLE_GROUPS.find(g=>g.id===ex.muscle_group)?.icon}</span>
        <span>{MUSCLE_GROUPS.find(g=>g.id===ex.muscle_group)?.label}</span>
        <span style={{ color:'var(--txt3)' }}>·</span>
        <span style={{ color:'var(--txt3)' }}>{EL[ex.equipment]}</span>
      </div>
      <div style={{ fontSize:12, color:'var(--txt3)', lineHeight:1.5 }}>{ex.description.slice(0,70)}…</div>
      <div style={{ marginTop:10, fontSize:11, color:'var(--a1)', fontWeight:500 }}>Voir le détail + vidéo →</div>
    </div>
  )
}

function ExerciseDetail({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  return (
    <Modal open={!!ex} onClose={onClose} title={ex.name}>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <Pill color={DC[ex.difficulty]}>{DL[ex.difficulty]}</Pill>
        <Pill color="var(--a1)">{EI[ex.equipment]} {EL[ex.equipment]}</Pill>
        <Pill color="var(--a2)">{MUSCLE_GROUPS.find(g=>g.id===ex.muscle_group)?.icon} {MUSCLE_GROUPS.find(g=>g.id===ex.muscle_group)?.label}</Pill>
      </div>
      {ex.youtube_id && (
        <div style={{ marginBottom:16, borderRadius:12, overflow:'hidden', background:'#000' }}>
          <iframe width="100%" height="230" src={`https://www.youtube.com/embed/${ex.youtube_id}?rel=0&modestbranding=1`} title={ex.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ display:'block' }} />
        </div>
      )}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:8, fontWeight:600 }}>Description</div>
        <div style={{ fontSize:13, color:'var(--txt2)', lineHeight:1.7 }}>{ex.description}</div>
      </div>
      {ex.steps && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:10, fontWeight:600 }}>Étapes du mouvement</div>
          {ex.steps.map((step,i) => (
            <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:8 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--a1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>{i+1}</div>
              <div style={{ fontSize:13, color:'var(--txt1)', lineHeight:1.6, paddingTop:2 }}>{step}</div>
            </div>
          ))}
        </div>
      )}
      {ex.tips && (
        <div style={{ background:'rgba(79,142,247,.08)', border:'1px solid rgba(79,142,247,.2)', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
          <div style={{ fontSize:12, color:'var(--a1)', fontWeight:600, marginBottom:6 }}>💡 Conseils techniques</div>
          <div style={{ fontSize:13, color:'var(--txt2)', lineHeight:1.7 }}>{ex.tips}</div>
        </div>
      )}
      <div>
        <div style={{ fontSize:11, color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:10, fontWeight:600 }}>Volume recommandé par niveau</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[['Débutant', ex.sets_beginner||ex.duration_beginner, '#22d3a0'],['Intermédiaire', ex.sets_intermediate||ex.duration_intermediate, '#f59e0b'],['Avancé', ex.sets_advanced||ex.duration_advanced, '#f43f5e']].map(([level,val,col]) => (
            <div key={level} style={{ background:col+'12', border:`1px solid ${col}30`, borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
              <div style={{ fontSize:11, color:col, fontWeight:600, marginBottom:4 }}>{level}</div>
              <div style={{ fontSize:13, color:'var(--txt1)', fontWeight:500 }}>{val||'—'}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}><Btn onClick={onClose}>Fermer</Btn></div>
    </Modal>
  )
}

function WorkoutCard({ w, onClick }: { w: Workout; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ background:'var(--bg2)', border:`1px solid ${w.color}30`, borderRadius:14, padding:'18px', cursor:'pointer', transition:'all .15s', borderTop:`3px solid ${w.color}` }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:30 }}>{w.icon}</div>
        <Pill color={DC[w.level]}>{DL[w.level]}</Pill>
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--txt1)', marginBottom:4, fontFamily:'Syne, sans-serif' }}>{w.name}</div>
      <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, color:'var(--txt2)', background:'var(--bg3)', padding:'2px 8px', borderRadius:20 }}>⏱️ {w.duration}</span>
        <span style={{ fontSize:11, color:'var(--txt2)', background:'var(--bg3)', padding:'2px 8px', borderRadius:20 }}>{EI[w.equipment]} {EL[w.equipment]}</span>
        <span style={{ fontSize:11, color:'var(--txt2)', background:'var(--bg3)', padding:'2px 8px', borderRadius:20 }}>{w.exercises.length} exercices</span>
      </div>
      <div style={{ fontSize:12, color:'var(--txt3)', lineHeight:1.5 }}>{w.description.slice(0,90)}…</div>
      <div style={{ marginTop:10, fontSize:11, color:w.color, fontWeight:500 }}>Voir la séance complète →</div>
    </div>
  )
}

function WorkoutDetail({ w, onClose }: { w: Workout; onClose: () => void }) {
  return (
    <Modal open={!!w} onClose={onClose} title={`${w.icon} ${w.name}`}>
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <Pill color={DC[w.level]}>{DL[w.level]}</Pill>
        <Pill color={w.color}>⏱️ {w.duration}</Pill>
        <Pill color="var(--a6)">{EI[w.equipment]} {EL[w.equipment]}</Pill>
      </div>
      <div style={{ fontSize:13, color:'var(--txt2)', lineHeight:1.7, marginBottom:16 }}>{w.description}</div>
      <div style={{ fontSize:11, color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:12, fontWeight:600 }}>Programme de la séance</div>
      {w.exercises.map((ex,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', background:'var(--bg3)', borderRadius:10, border:'1px solid var(--border)', marginBottom:8 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:w.color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{ex.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--txt1)', marginBottom:2 }}>{ex.name}</div>
            <div style={{ fontSize:11, color:'var(--txt2)' }}>{ex.sets}{ex.rest !== '0' ? ` · Repos: ${ex.rest}` : ''}</div>
            <div style={{ fontSize:11, color:'var(--txt3)', fontStyle:'italic', marginTop:2 }}>💡 {ex.tip}</div>
          </div>
          <div style={{ textAlign:'center', flexShrink:0 }}>
            <div style={{ fontSize:11, color:'var(--txt3)' }}>Exercice</div>
            <div style={{ fontSize:16, fontWeight:700, color:w.color }}>{i+1}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop:16, padding:'12px 14px', background:w.color+'10', border:`1px solid ${w.color}25`, borderRadius:10, fontSize:12, color:'var(--txt2)', lineHeight:1.7 }}>
        ⚡ <strong style={{ color:'var(--txt1)' }}>Conseil pour cette séance :</strong> Échauffe-toi 5 min avant de commencer. Hydrate-toi régulièrement. N'hésite pas à réduire le volume si c'est ta première fois.
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}><Btn onClick={onClose}>Fermer</Btn></div>
    </Modal>
  )
}

export default function ExercisePage({ sessions, sports, showToast }: Props) {
  const [tab, setTab]             = useState<'bodyweight'|'equipment'|'workouts'>('bodyweight')
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<Exercise|null>(null)
  const [selWorkout, setSelWorkout] = useState<Workout|null>(null)
  const [addModal, setAddModal]   = useState(false)
  const [aiRec, setAiRec]         = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [newName, setNewName]     = useState('')
  const [newGroup, setNewGroup]   = useState('chest')
  const [newDesc, setNewDesc]     = useState('')
  const [newTips, setNewTips]     = useState('')
  const [newDiff, setNewDiff]     = useState('intermediate')
  const [newEquip, setNewEquip]   = useState('bodyweight')
  const [saving, setSaving]       = useState(false)

  const baseList = tab === 'bodyweight' ? BW_EXERCISES : tab === 'equipment' ? EQ_EXERCISES : []
  const filtered = baseList.filter(e => (filter==='all'||e.muscle_group===filter) && (!search||e.name.toLowerCase().includes(search.toLowerCase())))

  const filteredWorkouts = WORKOUTS.filter(w => {
    const matchEquip = tab === 'bodyweight' ? (w.equipment === 'bodyweight' || w.equipment === 'cable') : w.equipment === 'barbell' || w.equipment === 'dumbbell'
    const matchSearch = !search || w.name.toLowerCase().includes(search.toLowerCase())
    return matchEquip && matchSearch
  })

  useEffect(() => { if (tab !== 'workouts') getAiRec() }, [tab, sessions.length])

  async function getAiRec() {
    if (sessions.length === 0) return
    setAiLoading(true)
    const list = tab === 'bodyweight' ? BW_EXERCISES : EQ_EXERCISES
    const ctx = `Coach muscu expert. L'athlète a ${sessions.length} séances.
Onglet: ${tab === 'bodyweight' ? 'Poids du corps & Élastiques' : 'Avec matériel'}.
Exercices disponibles: ${list.map(e=>e.name).join(', ')}.
Donne 3 recommandations parmi ces exercices. Format: "**Nom** — raison courte". Français, concis.`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:300, messages:[{role:'user',content:ctx}] }) })
      const data = await res.json()
      setAiRec(data.content?.[0]?.text||'')
    } catch { setAiRec('') }
    setAiLoading(false)
  }

  async function addCustomExercise() {
    if (!newName) return; setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('exercises').insert({ user_id:user.id, name:newName, muscle_group:newGroup, description:newDesc, tips:newTips, difficulty:newDiff, equipment:newEquip, is_custom:true })
    showToast('Exercice ajouté ! 💪'); setAddModal(false); setNewName(''); setNewDesc(''); setNewTips(''); setSaving(false)
  }

  return (
    <div>
      <Topbar title="Exercices & Séances" subtitle="Bibliothèque complète + programmes prêts à l'emploi" action={{ label:'Ajouter un exercice', fn:()=>setAddModal(true) }} />
      <div style={{ padding:'0 28px 28px' }}>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:4, marginBottom:16, width:'fit-content' }}>
          {[
            { id:'bodyweight' as const, icon:'🤸', label:'Poids du corps & Élastiques' },
            { id:'equipment'  as const, icon:'🏋️', label:'Avec matériel' },
            { id:'workouts'   as const, icon:'📋', label:'Séances complètes' },
          ].map(t => (
            <button key={t.id} onClick={()=>{setTab(t.id);setFilter('all');setSearch('')}} style={{ padding:'9px 16px', borderRadius:9, border:'none', cursor:'pointer', background:tab===t.id?'var(--a1)':'transparent', color:tab===t.id?'#fff':'var(--txt2)', fontFamily:'DM Sans, sans-serif', fontSize:13, fontWeight:tab===t.id?600:400, display:'flex', alignItems:'center', gap:6, transition:'all .15s' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* AI rec (not for workouts tab) */}
        {tab !== 'workouts' && (
          <div style={{ background:'linear-gradient(135deg,var(--bg2),var(--bg3))', border:'1px solid rgba(168,85,247,0.2)', borderRadius:14, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,var(--a1),var(--a2))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>🤖</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:13, marginBottom:4 }}>Recommandé pour toi</div>
              {aiLoading ? <div style={{ fontSize:12, color:'var(--txt2)', fontStyle:'italic' }}>Analyse…</div>
                : aiRec ? <div style={{ fontSize:12, color:'var(--txt2)', lineHeight:1.8, whiteSpace:'pre-line' }}>{aiRec}</div>
                : <div style={{ fontSize:12, color:'var(--txt3)' }}>Ajoute des séances pour des recommandations.</div>}
            </div>
            <Btn onClick={getAiRec} disabled={aiLoading} variant="outline" style={{ fontSize:11, flexShrink:0 }}>{aiLoading?'⏳':'🔄'}</Btn>
          </div>
        )}

        {/* Search */}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher…"
          style={{ width:'100%', padding:'10px 14px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:9, color:'var(--txt1)', fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none', marginBottom:12 }} />

        {/* Muscle filters (not for workouts) */}
        {tab !== 'workouts' && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            {MUSCLE_GROUPS.map(g => (
              <button key={g.id} onClick={()=>setFilter(g.id)} style={{ padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12, border:`1px solid ${filter===g.id?'var(--a1)':'var(--border2)'}`, background:filter===g.id?'rgba(79,142,247,.12)':'var(--bg3)', color:filter===g.id?'var(--a1)':'var(--txt2)', fontFamily:'DM Sans, sans-serif' }}>
                {g.icon} {g.label}
              </button>
            ))}
          </div>
        )}

        {/* Exercise grid */}
        {tab !== 'workouts' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {filtered.map(ex => <ExerciseCard key={ex.id} ex={ex} onClick={()=>setSelected(ex)} />)}
          </div>
        )}

        {/* Workouts grid */}
        {tab === 'workouts' && (
          <div>
            <div style={{ fontSize:13, color:'var(--txt2)', marginBottom:16, lineHeight:1.7 }}>
              Des séances complètes prêtes à l'emploi — clique pour voir le programme détaillé avec les exercices, séries et conseils.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
              {filteredWorkouts.map(w => <WorkoutCard key={w.id} w={w} onClick={()=>setSelWorkout(w)} />)}
            </div>
          </div>
        )}

        {filtered.length === 0 && tab !== 'workouts' && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--txt3)', fontSize:13 }}>Aucun exercice trouvé</div>
        )}
      </div>

      {selected && <ExerciseDetail ex={selected} onClose={()=>setSelected(null)} />}
      {selWorkout && <WorkoutDetail w={selWorkout} onClose={()=>setSelWorkout(null)} />}

      <Modal open={addModal} onClose={()=>setAddModal(false)} title="➕ Ajouter un exercice personnalisé">
        <Input label="Nom" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Ex: Curl marteau" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Select label="Groupe musculaire" value={newGroup} onChange={e=>setNewGroup(e.target.value)}>
            {MUSCLE_GROUPS.filter(g=>g.id!=='all').map(g=><option key={g.id} value={g.id}>{g.icon} {g.label}</option>)}
          </Select>
          <Select label="Équipement" value={newEquip} onChange={e=>setNewEquip(e.target.value)}>
            <option value="bodyweight">🤸 Poids du corps</option>
            <option value="cable">🎯 Élastique</option>
            <option value="barbell">🏋️ Barre</option>
            <option value="dumbbell">💪 Haltères</option>
            <option value="machine">⚙️ Machine</option>
          </Select>
        </div>
        <Select label="Difficulté" value={newDiff} onChange={e=>setNewDiff(e.target.value)}>
          <option value="beginner">🟢 Débutant</option>
          <option value="intermediate">🟡 Intermédiaire</option>
          <option value="advanced">🔴 Avancé</option>
        </Select>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:'var(--txt2)', display:'block', marginBottom:6 }}>Description</label>
          <textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)} style={{ width:'100%', padding:'10px 14px', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:9, color:'var(--txt1)', fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none', minHeight:70, resize:'vertical' }} />
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:'var(--txt2)', display:'block', marginBottom:6 }}>Conseils techniques</label>
          <textarea value={newTips} onChange={e=>setNewTips(e.target.value)} style={{ width:'100%', padding:'10px 14px', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:9, color:'var(--txt1)', fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none', minHeight:70, resize:'vertical' }} />
        </div>
        <ModalActions onCancel={()=>setAddModal(false)} onConfirm={addCustomExercise} loading={saving} confirmLabel="Ajouter" />
      </Modal>
    </div>
  )
}

// This export allows importing WORKOUT_PLANS from this file
export const WORKOUT_PLANS_DATA = true
