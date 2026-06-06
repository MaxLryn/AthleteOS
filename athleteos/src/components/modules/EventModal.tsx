'use client'
import { useState } from 'react'
import { Modal, ModalActions, Select, Input, Textarea } from '@/components/ui'
import type { Sport, CalendarEvent, EventType } from '@/types'
import { EVENT_TYPE_CONFIG, SPECTATOR_SPORTS } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  sports: Sport[]
  onSave: (data: Partial<CalendarEvent>) => Promise<void>
  defaultDate?: string
}

export default function EventModal({ open, onClose, sports, onSave, defaultDate }: Props) {
  const today = defaultDate || new Date().toISOString().slice(0, 10)
  const [type, setType]           = useState<EventType>('training')
  const [sportId, setSportId]     = useState(sports[0]?.id || '')
  const [specSport, setSpecSport] = useState('Football')
  const [title, setTitle]         = useState('')
  const [date, setDate]           = useState(today)
  const [time, setTime]           = useState('18:00')
  const [location, setLocation]   = useState('')
  const [broadcast, setBroadcast] = useState('')
  const [description, setDesc]    = useState('')
  const [loading, setLoading]     = useState(false)

  const isSpectator = type === 'spectator'

  async function handleSave() {
    setLoading(true)
    const finalTitle = title || (isSpectator ? `${specSport} — événement` : 'Entraînement')
    await onSave({
      type,
      sport_id: isSpectator ? null : (sportId || null),
      title: finalTitle,
      event_date: date,
      event_time: time || null,
      location: location || null,
      spectator_sport: isSpectator ? specSport : null,
      broadcast: isSpectator ? (broadcast || null) : null,
      description: description || null,
    })
    setLoading(false)
    onClose()
    setTitle(''); setLocation(''); setBroadcast(''); setDesc('')
  }

  return (
    <Modal open={open} onClose={onClose} title="📅 Ajouter un événement">
      <Select label="Type d'événement" value={type} onChange={e => setType(e.target.value as EventType)}>
        {Object.entries(EVENT_TYPE_CONFIG).map(([id, cfg]) => (
          <option key={id} value={id}>{cfg.icon} {cfg.label}</option>
        ))}
      </Select>

      {isSpectator ? (
        <>
          <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--a6)' }}>
            📺 Événement sportif à suivre (spectateur) — il apparaîtra dans ton calendrier avec un badge distinct.
          </div>
          <Select label="Sport de l'événement" value={specSport} onChange={e => setSpecSport(e.target.value)}>
            {SPECTATOR_SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="Titre (ex: PSG vs OM — Ligue 1)" placeholder="Nom du match ou de l'événement" value={title} onChange={e => setTitle(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input label="Heure" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <Input label="Lieu (optionnel)" placeholder="Stade, Aréna…" value={location} onChange={e => setLocation(e.target.value)} />
          <Input label="Chaîne / diffusion (optionnel)" placeholder="Canal+, France TV, DAZN, Amazon…" value={broadcast} onChange={e => setBroadcast(e.target.value)} />
        </>
      ) : (
        <>
          <Select label="Sport" value={sportId} onChange={e => setSportId(e.target.value)}>
            {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
          </Select>
          <Input label="Titre" placeholder="Course longue, Tournoi club, Match…" value={title} onChange={e => setTitle(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input label="Heure" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <Input label="Lieu (optionnel)" placeholder="Salle, Stade, Parc…" value={location} onChange={e => setLocation(e.target.value)} />
          <Textarea label="Description (optionnel)" placeholder="Détails supplémentaires…" value={description} onChange={e => setDesc(e.target.value)} />
        </>
      )}

      <ModalActions onCancel={onClose} onConfirm={handleSave} loading={loading} confirmLabel="Ajouter" />
    </Modal>
  )
}
