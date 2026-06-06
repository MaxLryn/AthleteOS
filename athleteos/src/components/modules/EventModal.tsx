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
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate]     = useState(today)
  const [time, setTime]           = useState('18:00')
  const [location, setLocation]   = useState('')
  const [broadcast, setBroadcast] = useState('')
  const [description, setDesc]    = useState('')
  const [loading, setLoading]     = useState(false)
  const [multiDay, setMultiDay]   = useState(false)

  const isSpectator = type === 'spectator'

  // Generate all dates between startDate and endDate
  function getDatesInRange(start: string, end: string): string[] {
    const dates: string[] = []
    const cur = new Date(start)
    const last = new Date(end)
    if (cur > last) return [start]
    while (cur <= last) {
      dates.push(cur.toISOString().slice(0, 10))
      cur.setDate(cur.getDate() + 1)
    }
    return dates
  }

  async function handleSave() {
    setLoading(true)
    const finalTitle = title || (isSpectator ? `${specSport} — événement` : 'Entraînement')
    const dates = multiDay ? getDatesInRange(startDate, endDate) : [startDate]

    for (const date of dates) {
      await onSave({
        type,
        sport_id: isSpectator ? null : (sportId || null),
        title: dates.length > 1 ? `${finalTitle} (J${dates.indexOf(date) + 1}/${dates.length})` : finalTitle,
        event_date: date,
        event_time: time || null,
        location: location || null,
        spectator_sport: isSpectator ? specSport : null,
        broadcast: isSpectator ? (broadcast || null) : null,
        description: description || null,
      })
    }

    setLoading(false)
    onClose()
    setTitle(''); setLocation(''); setBroadcast(''); setDesc('')
    setMultiDay(false); setEndDate(today)
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
          <Input label="Chaîne / diffusion (optionnel)" placeholder="Canal+, France TV, DAZN, Amazon…" value={broadcast} onChange={e => setBroadcast(e.target.value)} />
        </>
      ) : (
        <>
          <Select label="Sport" value={sportId} onChange={e => setSportId(e.target.value)}>
            {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
          </Select>
          <Input label="Titre" placeholder="Course longue, Tournoi club, Match…" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea label="Description (optionnel)" placeholder="Détails supplémentaires…" value={description} onChange={e => setDesc(e.target.value)} />
        </>
      )}

      {/* Multi-day toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt1)' }}>Événement sur plusieurs jours</div>
          <div style={{ fontSize: 11, color: 'var(--txt2)' }}>Crée automatiquement un événement par jour</div>
        </div>
        <div onClick={() => setMultiDay(m => !m)} style={{ width: 44, height: 24, borderRadius: 12, background: multiDay ? 'var(--a1)' : 'var(--bg4)', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 2, left: multiDay ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
        </div>
      </div>

      {/* Dates */}
      {multiDay ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Date de début" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input label="Date de fin" type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input label="Heure" type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
      )}

      {multiDay && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Heure" type="time" value={time} onChange={e => setTime(e.target.value)} />
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 14 }}>
            <div style={{ padding: '10px 14px', background: 'rgba(79,142,247,.1)', borderRadius: 9, fontSize: 12, color: 'var(--a1)', fontWeight: 500 }}>
              {getDatesInRange(startDate, endDate).length} jour{getDatesInRange(startDate, endDate).length > 1 ? 's' : ''} sélectionné{getDatesInRange(startDate, endDate).length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      <Input label="Lieu (optionnel)" placeholder={isSpectator ? 'Stade, Aréna…' : 'Salle, Stade, Parc…'} value={location} onChange={e => setLocation(e.target.value)} />

      <ModalActions onCancel={onClose} onConfirm={handleSave} loading={loading}
        confirmLabel={multiDay ? `Créer ${getDatesInRange(startDate, endDate).length} événement${getDatesInRange(startDate, endDate).length > 1 ? 's' : ''}` : 'Ajouter'} />
    </Modal>
  )
}
