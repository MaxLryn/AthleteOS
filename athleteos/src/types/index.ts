export type Profile = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  is_public: boolean
  favorite_sport: string | null
  level: string | null
  main_goal: string | null
  instagram: string | null
  strava_profile: string | null
  website: string | null
  cover_color: string | null
  plan: string | null
  strava_access_token: string | null
  strava_refresh_token: string | null
  created_at: string
}

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
  custom_ratings: Record<string, number> | null
  created_at: string
  sport?: Sport
}

export type SportCriteria = {
  id: string
  user_id: string
  sport_id: string
  label: string
  icon: string
  position: number
  created_at: string
}

export type Exercise = {
  name: string
  sets?: number
  reps?: number
}

export type CalendarEvent = {
  id: string
  user_id: string
  sport_id: string | null
  type: 'training' | 'match' | 'tournament' | 'competition' | 'objective' | 'spectator'
  title: string
  event_date: string
  event_time: string | null
  location: string | null
  description: string | null
  spectator_sport: string | null
  broadcast: string | null
  created_at: string
  sport?: Sport
}

export type Goal = {
  id: string
  user_id: string
  sport_id: string | null
  title: string
  target: number
  current: number
  unit: string
  deadline: string | null
  created_at: string
  sport?: Sport
}

export const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  training:    { label: 'Entraînement',  icon: '💪', color: '#4f8ef7' },
  match:       { label: 'Match',         icon: '🏅', color: '#22d3a0' },
  tournament:  { label: 'Tournoi',       icon: '🏆', color: '#f59e0b' },
  competition: { label: 'Compétition',   icon: '🎯', color: '#a855f7' },
  objective:   { label: 'Objectif',      icon: '🎪', color: '#f43f5e' },
  spectator:   { label: 'À suivre',      icon: '📺', color: '#38bdf8' },
}
