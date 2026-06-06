export type Sport = {
  id: string
  user_id: string
  label: string
  icon: string
  color: string
  is_default: boolean
  created_at: string
}

export type Session = {
  id: string
  user_id: string
  sport_id: string | null
  date: string
  duration: number | null
  type: string | null
  note: string | null
  energy: number | null
  fatigue: number | null
  distance: number | null
  pace: string | null
  heart_rate: number | null
  exercises: Exercise[] | null
  result: string | null
  score_text: string | null
  goals_scored: number | null
  assists: number | null
  minutes_played: number | null
  created_at: string
  sport?: Sport
}

export type Exercise = {
  name: string
  sets: number
  reps: number
  weight: number
}

export type CalendarEvent = {
  id: string
  user_id: string
  type: EventType
  sport_id: string | null
  title: string
  event_date: string
  event_time: string | null
  location: string | null
  spectator_sport: string | null
  broadcast: string | null
  description: string | null
  created_at: string
  sport?: Sport
}

export type EventType = 'training' | 'match' | 'tournament' | 'competition' | 'objective' | 'spectator'

export type Goal = {
  id: string
  user_id: string
  sport_id: string | null
  title: string
  target: number
  current: number
  unit: string | null
  deadline: string | null
  color: string
  created_at: string
  sport?: Sport
}

export type JournalEntry = {
  id: string
  user_id: string
  entry_date: string
  mood: number | null
  motivation: number | null
  stress: number | null
  fatigue: number | null
  energy: number | null
  note: string | null
  created_at: string
}

export type HealthData = {
  id: string
  user_id: string
  entry_date: string
  weight: number | null
  fat_pct: number | null
  muscle_mass: number | null
  sleep_hours: number | null
  hydration_l: number | null
  created_at: string
}

export type Injury = {
  id: string
  user_id: string
  zone: string
  level: number
  detail: string | null
  resolved: boolean
  created_at: string
}

export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  plan: 'free' | 'premium' | 'pro'
  created_at: string
}

export const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; icon: string }> = {
  training:    { label: 'Entraînement',          color: '#4f8ef7', icon: '💪' },
  match:       { label: 'Match',                 color: '#22d3a0', icon: '🏅' },
  tournament:  { label: 'Tournoi',               color: '#a855f7', icon: '🏆' },
  competition: { label: 'Compétition',           color: '#f59e0b', icon: '🎯' },
  objective:   { label: 'Objectif',              color: '#f43f5e', icon: '🎪' },
  spectator:   { label: 'Événement à suivre',    color: '#38bdf8', icon: '📺' },
}

export const SPECTATOR_SPORTS = [
  'Football','Rugby','Tennis','Basketball','Cyclisme',
  'Formule 1','Athlétisme','Natation','Handball','Volleyball',
  'MMA / UFC','Golf','Baseball','Hockey','Autre',
]
