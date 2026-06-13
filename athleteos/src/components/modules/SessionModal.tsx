'use client'
import { useState, useEffect } from 'react'
import { Modal, ModalActions, Select, Input, Textarea, Range } from '@/components/ui'
import type { Sport, Session } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  sports: Sport[]
  onSave: (data: Partial<Session>) => Promise<void>
  editSession?: Session | null
}

export default function SessionModal({ open, onClose, sports, onSave, editSession }: Props) {
  const isEdit = !!editSession

  const [sportId, setSportId] = useState(sports[0]?.id || '')
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [duration, setDuration] = useState(60)
  const [type, setType]       = useState('')
  const [note, setNote]       = useState('')
  const [energy, setEnergy]   = useState(7)
  const [fatigue, setFatigue] = useState(4)
  const [distance, setDistance] = useState('')
  const [pace, setPace]       = useState('')
  const [heartRate, setHR]    = useState('')
  const [result, setResult]   = useState('')
  const [scoreText, setScore] = useState('')
  const [goals, setGoals]     = useState('')
  const [assists, setAssists] = useState('')
  const [loading, setLoading] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (editSession) {
      setSportId(editSession.sport_id || sports[0]?.id || '')
      setDate(editSession.date)
      setDuration(editSession.duration || 60)
      setType(editSession.type || '')
      setNote(editSession.note || '')
      setEnergy(editSession.energy || 7)
      setFatigue(editSession.fatigue || 4)
      setDistance(editSession.distance ? String(editSession.distance) : '')
      setPace(editSession.pace || '')
      setHR(editSession.heart_rate ? String(editSession.heart_rate) : '')
      setResult(editSession.result || '')
      setScore(editSession.score_text || '')
      setGoals(editSession.goals_scored != null ? String(editSession.goals_scored) : '')
      setAssists(editSession.assists != null ? String(editSession.assists) : '')
    } else if (open) {
      // reset for new session
      setSportId(sports[0]?.id || '')
      setDate(new Date().toISOString().slice(0, 10))
      setDuration(60); setType(''); setNote(''); setEnergy(7); setFatigue(4)
      setDistance(''); setPace(''); setHR(''); setResult(''); setScore(''); setGoals(''); setAssists('')
    }
  }, [editSession, open, sports])

  const sport = sports.find(s => s.id === sportId)
  const isRunning = sport?.label.toLowerCase().includes('course')
  const isRacket  = sport?.label.toLowerCase().includes('tennis') || sport?.label.toLowerCase().includes('padel')
  const isFootball = sport?.label.toLowerCase().includes('football')

  async function handleSave() {
    setLoading(true)
    await onSave({
      sport_id: sportId || null,
      date,
      duration,
      type,
      note,
      energy,
      fatigue,
      distance: distance ? +distance : null,
      pace: pace || null,
      heart_rate: heartRate ? +heartRate : null,
      result: result || null,
      score_text: scoreText || null,
      goals_scored: goals ? +goals : null,
      assists: assists ? +assists : null,
    })
    setLoading(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? '✏️ Modifier la séance' : '➕ Nouvelle séance'}>
      <Select label="Sport" value={sportId} onChange={e => setSportId(e.target.value)}>
        {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
      </Select>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input label="Durée (min)" type="number" value={duration} onChange={e => setDuration(+e.target.value)} />
      </div>

      <Input label="Type de séance" placeholder="Push, Tempo, Match, Récup…" value={type} onChange={e => setType(e.target.value)} />

      {isRunning && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Input label="Distance (km)" type="number" placeholder="10.5" value={distance} onChange={e => setDistance(e.target.value)} />
          <Input label="Allure (min/km)" placeholder="5:04" value={pace} onChange={e => setPace(e.target.value)} />
          <Input label="FC moyenne (bpm)" type="number" placeholder="162" value={heartRate} onChange={e => setHR(e.target.value)} />
        </div>
      )}

      {isRacket && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Résultat" value={result} onChange={e => setResult(e.target.value)}>
            <option value="">—</option>
            <option value="win">Victoire</option>
            <option value="loss">Défaite</option>
          </Select>
          <Input label="Score (ex: 6-4 6-2)" placeholder="6-4 6-2" value={scoreText} onChange={e => setScore(e.target.value)} />
        </div>
      )}

      {isFootball && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Buts marqués" type="number" value={goals} onChange={e => setGoals(e.target.value)} />
          <Input label="Passes décisives" type="number" value={assists} onChange={e => setAssists(e.target.value)} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 14 }}>
        <Range label="Énergie" value={energy} onChange={setEnergy} />
        <Range label="Fatigue" value={fatigue} onChange={setFatigue} />
      </div>

      <Textarea label="Notes / observations" placeholder="PR, ressenti, exercices…" value={note} onChange={e => setNote(e.target.value)} />

      <ModalActions onCancel={onClose} onConfirm={handleSave} loading={loading} confirmLabel={isEdit ? 'Enregistrer les modifications' : 'Enregistrer la séance'} />
    </Modal>
  )
}
