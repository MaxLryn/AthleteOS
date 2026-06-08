'use client'
import { useState } from 'react'
import { Card, CardTitle, Topbar, Pill, Btn } from '@/components/ui'
import EventModal from './EventModal'
import type { Sport, CalendarEvent, Session } from '@/types'
import { EVENT_TYPE_CONFIG } from '@/types'

interface Props {
  sports: Sport[]
  events: CalendarEvent[]
  sessions: Session[]
  addEvent: (data: Partial<CalendarEvent>) => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error') => void
  [key: string]: unknown
}

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

function generateICS(events: CalendarEvent[], sessions: Session[], sports: Sport[], mode: 'all' | 'events' | 'sessions'): string {
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AthleteOS//FR',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:AthleteOS',
  ]
  function fmt(dateStr: string, timeStr?: string | null) {
    const d = dateStr.replace(/-/g, '')
    if (timeStr) return `${d}T${timeStr.replace(/:/g, '')}00`
    return d
  }
  function esc(t: string) { return t.replace(/[\\,;]/g, c => '\\' + c).replace(/\n/g, '\\n') }

  if (mode !== 'sessions') {
    events.forEach(ev => {
      const cfg = EVENT_TYPE_CONFIG[ev.type]
      lines.push('BEGIN:VEVENT',`UID:athleteos-ev-${ev.id}@app`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g,'').slice(0,15)}Z`,
        ev.event_time ? `DTSTART;TZID=Europe/Paris:${fmt(ev.event_date,ev.event_time)}` : `DTSTART;VALUE=DATE:${fmt(ev.event_date)}`,
        ev.event_time ? `DTEND;TZID=Europe/Paris:${fmt(ev.event_date,ev.event_time)}` : `DTEND;VALUE=DATE:${fmt(ev.event_date)}`,
        `SUMMARY:${esc(cfg.icon+' '+ev.title)}`,
        ev.location ? `LOCATION:${esc(ev.location)}` : '',
        'END:VEVENT')
    })
  }
  if (mode !== 'events') {
    sessions.forEach(s => {
      const sp = sports.find(x => x.id === s.sport_id)
      lines.push('BEGIN:VEVENT',`UID:athleteos-sess-${s.id}@app`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g,'').slice(0,15)}Z`,
        `DTSTART;VALUE=DATE:${fmt(s.date)}`,`DTEND;VALUE=DATE:${fmt(s.date)}`,
        `SUMMARY:${esc((sp?.icon||'💪')+' '+(sp?.label||'Séance')+(s.type?' — '+s.type:''))}`,
        'END:VEVENT')
    })
  }
  lines.push('END:VCALENDAR')
  return lines.filter(Boolean).join('\r\n')
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function CalendarPage({ sports, events, sessions, addEvent, showToast }: Props) {
  const now = new Date()
  const [cur, setCur]             = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [modal, setModal]         = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'calendar' | 'sync'>('calendar')
  const [exportMode, setExportMode] = useState<'all' | 'events' | 'sessions'>('all')

  const firstDay    = new Date(cur.y, cur.m, 1).getDay()
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate()
  const offset      = firstDay === 0 ? 6 : firstDay - 1
  const today       = new Date().toISOString().slice(0, 10)

  function getDateStr(day: number) {
    return `${cur.y}-${String(cur.m + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }
  function navMonth(dir: number) {
    setCur(c => {
      let m = c.m + dir, y = c.y
      if (m < 0) { m = 11; y-- } if (m > 11) { m = 0; y++ }
      return { y, m }
    })
  }

  const upcoming = events.filter(e => e.event_date >= today).sort((a,b) => a.event_date.localeCompare(b.event_date))

  function handleExport() {
    const content = generateICS(events, sessions as Session[], sports, exportMode)
    const names = { all: 'athleteos-complet', events: 'athleteos-evenements', sessions: 'athleteos-seances' }
    downloadICS(content, `${names[exportMode]}.ics`)
    showToast('Fichier .ics téléchargé ! 📅')
  }

  const tabBtn = (id: 'calendar' | 'sync', label: string, icon: string) => (
    <button onClick={() => setActiveTab(id)} style={{
      padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
      background: activeTab === id ? 'var(--a1)' : 'transparent',
      color: activeTab === id ? '#fff' : 'var(--txt2)',
      fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: activeTab === id ? 600 : 400,
      display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
    }}>
      {icon} {label}
    </button>
  )

  return (
    <div>
      <Topbar title="Calendrier Sportif" subtitle="Entraînements, matchs, compétitions & événements à suivre"
        action={{ label: 'Ajouter événement', fn: () => { setSelectedDate(null); setModal(true) } }} />
      <div style={{ padding: '0 28px 28px' }}>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 16, width: 'fit-content' }}>
          {tabBtn('calendar', 'Calendrier', '📅')}
          {tabBtn('sync', 'Sync & Export', '🔄')}
        </div>

        {activeTab === 'calendar' && (
          <>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {Object.entries(EVENT_TYPE_CONFIG).map(([id, cfg]) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: cfg.color+'15', border: `1px solid ${cfg.color}30`, fontSize: 12 }}>
                  <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                  <span style={{ color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
                </div>
              ))}
            </div>

            <Card style={{ marginBottom: 16 }}>
              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <button onClick={() => navMonth(-1)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--txt1)', cursor: 'pointer', fontSize: 14 }}>←</button>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, color: 'var(--txt1)' }}>{MONTHS[cur.m]} {cur.y}</span>
                <button onClick={() => navMonth(1)}  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--txt1)', cursor: 'pointer', fontSize: 14 }}>→</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
                {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--txt3)', fontWeight: 600, padding: '4px 0', letterSpacing: '.5px' }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                {Array.from({ length: offset }).map((_,i) => <div key={`e${i}`} style={{ minHeight: 88 }} />)}
                {Array.from({ length: daysInMonth }, (_,i) => i+1).map(day => {
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
                        return <div key={ev.id} style={{ fontSize: 9, padding: '2px 4px', borderRadius: 3, background: cfg.color+'25', color: cfg.color, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{cfg.icon} {ev.title}</div>
                      })}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Upcoming */}
            <Card>
              <CardTitle>Événements à venir</CardTitle>
              {upcoming.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--txt3)', fontSize: 13 }}>Aucun événement planifié</div>
              ) : upcoming.map(ev => {
                const cfg = EVENT_TYPE_CONFIG[ev.type]
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 8 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: cfg.color+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{cfg.icon}</div>
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
          </>
        )}

        {activeTab === 'sync' && (
          <>
            {/* Export ICS */}
            <Card style={{ marginBottom: 16 }}>
              <CardTitle>📤 Export .ics — Compatible tous calendriers</CardTitle>
              <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 16, lineHeight: 1.7 }}>
                Le format <strong style={{ color: 'var(--txt1)' }}>.ics</strong> est universel — compatible avec Google Calendar, Apple Calendar, Outlook et tous les calendriers modernes.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { id: 'all' as const, icon: '📦', label: 'Tout exporter', desc: `${events.length} événements + ${sessions.length} séances` },
                  { id: 'events' as const, icon: '📅', label: 'Événements', desc: `${events.length} événements planifiés` },
                  { id: 'sessions' as const, icon: '💪', label: 'Séances', desc: `${sessions.length} séances enregistrées` },
                ].map(opt => (
                  <div key={opt.id} onClick={() => setExportMode(opt.id)} style={{
                    padding: '14px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                    border: `1px solid ${exportMode === opt.id ? 'var(--a1)' : 'var(--border)'}`,
                    background: exportMode === opt.id ? 'rgba(79,142,247,0.08)' : 'var(--bg3)',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{opt.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', marginBottom: 3 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
              <Btn onClick={handleExport}>⬇️ Télécharger le fichier .ics</Btn>
            </Card>

            {/* Instructions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {[
                { name: 'Google Calendar', icon: '🗓️', color: '#4285f4', steps: ['Télécharge le fichier .ics ci-dessus','Ouvre Google Calendar sur ordinateur','Clique ⚙️ → Paramètres','Importer & Exporter → Importer','Sélectionne le fichier .ics'], url: 'https://calendar.google.com', urlLabel: 'Ouvrir Google Calendar' },
                { name: 'Apple Calendar', icon: '🍎', color: '#ff3b30', steps: ['Télécharge le fichier .ics ci-dessus','Double-clique sur le fichier','Apple Calendar s\'ouvre automatiquement','Clique "Importer" pour confirmer'], url: null, urlLabel: null },
                { name: 'Outlook', icon: '📧', color: '#0078d4', steps: ['Télécharge le fichier .ics ci-dessus','Ouvre Outlook','Fichier → Ouvrir et exporter','Importer/Exporter → Importer iCalendar','Sélectionne le fichier .ics'], url: 'https://outlook.live.com/calendar', urlLabel: 'Ouvrir Outlook' },
              ].map(app => (
                <Card key={app.name}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: app.color+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{app.icon}</div>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--txt1)' }}>{app.name}</span>
                  </div>
                  <ol style={{ paddingLeft: 18, fontSize: 12, color: 'var(--txt2)', lineHeight: 2 }}>
                    {app.steps.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                  {app.url && <a href={app.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: app.color, textDecoration: 'none' }}>→ {app.urlLabel}</a>}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <EventModal open={modal} onClose={() => setModal(false)} sports={sports} onSave={addEvent} defaultDate={selectedDate || undefined} />
    </div>
  )
}
