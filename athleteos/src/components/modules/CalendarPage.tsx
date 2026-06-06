'use client'
import { useState } from 'react'
import { Card, CardTitle, Topbar, Pill } from '@/components/ui'
import EventModal from './EventModal'
import type { Sport, CalendarEvent } from '@/types'
import { EVENT_TYPE_CONFIG } from '@/types'

interface Props {
  sports: Sport[]
  events: CalendarEvent[]
  addEvent: (data: Partial<CalendarEvent>) => Promise<void>
  [key: string]: unknown
}

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

export default function CalendarPage({ sports, events, addEvent }: Props) {
  const now = new Date()
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [modal, setModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const firstDay = new Date(cur.y, cur.m, 1).getDay()
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const today = new Date().toISOString().slice(0, 10)

  function getDateStr(day: number) {
    return `${cur.y}-${String(cur.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function navMonth(dir: number) {
    setCur(c => {
      let m = c.m + dir, y = c.y
      if (m < 0) { m = 11; y-- }
      if (m > 11) { m = 0; y++ }
      return { y, m }
    })
  }

  const upcoming = events
    .filter(e => e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  return (
    <div>
      <Topbar title="Calendrier Sportif" subtitle="Entraînements, matchs, compétitions & événements à suivre" action={{ label: 'Ajouter événement', fn: () => { setSelectedDate(null); setModal(true) } }} />

      <div style={{ padding: '0 28px 28px' }}>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {Object.entries(EVENT_TYPE_CONFIG).map(([id, cfg]) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: cfg.color + '15', border: `1px solid ${cfg.color}30`, fontSize: 12 }}>
              <span style={{ fontSize: 14 }}>{cfg.icon}</span>
              <span style={{ color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
            </div>
          ))}
        </div>

        <Card style={{ marginBottom: 16 }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={() => navMonth(-1)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--txt1)', cursor: 'pointer', fontSize: 14 }}>←</button>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, color: 'var(--txt1)' }}>{MONTHS[cur.m]} {cur.y}</span>
            <button onClick={() => navMonth(1)}  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--txt1)', cursor: 'pointer', fontSize: 14 }}>→</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--txt3)', fontWeight: 600, padding: '4px 0', letterSpacing: '.5px' }}>{d}</div>)}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} style={{ minHeight: 88 }} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const ds = getDateStr(day)
              const dayEvents = events.filter(e => e.event_date === ds)
              const isToday = ds === today
              return (
                <div key={day} onClick={() => { setSelectedDate(ds); setModal(true) }} style={{
                  minHeight: 88, background: isToday ? 'rgba(79,142,247,.1)' : 'var(--bg3)',
                  borderRadius: 9, border: `1px solid ${isToday ? 'var(--a1)' : 'var(--border)'}`,
                  padding: '7px 5px', cursor: 'pointer', transition: 'all .15s',
                }}>
                  <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--a1)' : 'var(--txt2)', marginBottom: 4 }}>{day}</div>
                  {dayEvents.map(ev => {
                    const cfg = EVENT_TYPE_CONFIG[ev.type]
                    return (
                      <div key={ev.id} style={{ fontSize: 9, padding: '2px 4px', borderRadius: 3, background: cfg.color + '25', color: cfg.color, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                        {cfg.icon} {ev.title}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Upcoming events list */}
        <Card>
          <CardTitle>Événements à venir</CardTitle>
          {upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--txt3)', fontSize: 13 }}>Aucun événement planifié</div>
          ) : upcoming.map(ev => {
            const cfg = EVENT_TYPE_CONFIG[ev.type]
            return (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 8 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{cfg.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)' }}>{ev.title}</span>
                    <Pill color={cfg.color}>{cfg.label}</Pill>
                    {ev.broadcast && <Pill color="var(--a6)">📡 {ev.broadcast}</Pill>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)' }}>
                    📅 {ev.event_date}{ev.event_time ? ` · ⏰ ${ev.event_time}` : ''}{ev.location ? ` · 📍 ${ev.location}` : ''}
                    {ev.spectator_sport ? ` · ${ev.spectator_sport}` : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </Card>
      </div>

      <EventModal open={modal} onClose={() => setModal(false)} sports={sports} onSave={addEvent} defaultDate={selectedDate || undefined} />
    </div>
  )
}
