'use client'
import { useState } from 'react'
import { Card, CardTitle, Topbar, Btn, Pill } from '@/components/ui'
import type { CalendarEvent, Session, Sport } from '@/types'
import { EVENT_TYPE_CONFIG } from '@/types'

interface Props {
  events: CalendarEvent[]
  sessions: Session[]
  sports: Sport[]
  showToast: (msg: string, type?: 'success' | 'error') => void
  [key: string]: unknown
}

// ── Generate .ics content ─────────────────────────────────
function generateICS(events: CalendarEvent[], sessions: Session[], sports: Sport[], mode: 'events' | 'sessions' | 'all'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AthleteOS//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:AthleteOS',
    'X-WR-TIMEZONE:Europe/Paris',
    'X-WR-CALDESC:Mon calendrier sportif AthleteOS',
  ]

  function formatDate(dateStr: string, timeStr?: string | null): string {
    const d = dateStr.replace(/-/g, '')
    if (timeStr) {
      const t = timeStr.replace(/:/g, '') + '00'
      return `${d}T${t}`
    }
    return d
  }

  function escapeText(text: string): string {
    return text.replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
  }

  // Add calendar events
  if (mode === 'events' || mode === 'all') {
    events.forEach(ev => {
      const cfg = EVENT_TYPE_CONFIG[ev.type]
      const dtStart = formatDate(ev.event_date, ev.event_time)
      const dtEnd = formatDate(ev.event_date, ev.event_time)
      const hasTime = !!ev.event_time

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:athleteos-event-${ev.id}@athleteos.app`)
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`)
      if (hasTime) {
        lines.push(`DTSTART;TZID=Europe/Paris:${dtStart}`)
        lines.push(`DTEND;TZID=Europe/Paris:${dtStart}`)
      } else {
        lines.push(`DTSTART;VALUE=DATE:${dtStart}`)
        lines.push(`DTEND;VALUE=DATE:${dtStart}`)
      }
      lines.push(`SUMMARY:${escapeText(cfg.icon + ' ' + ev.title)}`)
      if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`)
      const desc = [
        `Type: ${cfg.label}`,
        ev.spectator_sport ? `Sport: ${ev.spectator_sport}` : '',
        ev.broadcast ? `Diffusion: ${ev.broadcast}` : '',
        ev.description || '',
      ].filter(Boolean).join('\\n')
      if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`)
      lines.push(`CATEGORIES:${cfg.label.toUpperCase()}`)
      lines.push('END:VEVENT')
    })
  }

  // Add sessions as events
  if (mode === 'sessions' || mode === 'all') {
    sessions.forEach(s => {
      const sport = sports.find(sp => sp.id === s.sport_id)
      const dtStart = formatDate(s.date)
      lines.push('BEGIN:VEVENT')
      lines.push(`UID:athleteos-session-${s.id}@athleteos.app`)
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`)
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`)
      lines.push(`DTEND;VALUE=DATE:${dtStart}`)
      lines.push(`SUMMARY:${escapeText((sport?.icon || '💪') + ' ' + (sport?.label || 'Séance') + (s.type ? ' — ' + s.type : ''))}`)
      const desc = [
        s.duration ? `Durée: ${s.duration} min` : '',
        s.distance ? `Distance: ${s.distance} km` : '',
        s.energy ? `Énergie: ${s.energy}/10` : '',
        s.note || '',
      ].filter(Boolean).join('\\n')
      if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`)
      lines.push('END:VEVENT')
    })
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function CalendarSyncPage({ events, sessions, sports, showToast }: Props) {
  const [exportMode, setExportMode] = useState<'events' | 'sessions' | 'all'>('all')
  const [googleUrl, setGoogleUrl] = useState('')

  function handleExport() {
    const content = generateICS(events, sessions, sports, exportMode)
    const names = { events: 'athleteos-evenements', sessions: 'athleteos-seances', all: 'athleteos-complet' }
    downloadICS(content, `${names[exportMode]}.ics`)
    showToast('Fichier .ics téléchargé ! 📅')
  }

  function copyWebcalUrl() {
    // In a real app this would be a public URL to a dynamic .ics endpoint
    const url = `webcal://athlete-os-ruby.vercel.app/api/calendar/export`
    navigator.clipboard.writeText(url).then(() => showToast('URL copiée ! Colle-la dans ton application calendrier'))
  }

  const googleCalendarUrl = `https://calendar.google.com/calendar/r/settings/export`

  return (
    <div>
      <Topbar title="Sync Calendrier" subtitle="Exporte et synchronise avec Google Calendar, Apple et Outlook" />
      <div style={{ padding: '0 28px 28px' }}>

        {/* Export ICS */}
        <Card style={{ marginBottom: 16 }}>
          <CardTitle>📤 Export .ics — Compatible tous calendriers</CardTitle>
          <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 16, lineHeight: 1.7 }}>
            Le format <strong style={{ color: 'var(--txt1)' }}>.ics</strong> est universel — compatible avec Google Calendar, Apple Calendar, Outlook, Thunderbird et tous les calendriers modernes.
          </div>

          {/* Mode selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { id: 'all' as const, icon: '📦', label: 'Tout exporter', desc: `${events.length} événements + ${sessions.length} séances` },
              { id: 'events' as const, icon: '📅', label: 'Événements uniquement', desc: `${events.length} événements planifiés` },
              { id: 'sessions' as const, icon: '💪', label: 'Séances uniquement', desc: `${sessions.length} séances enregistrées` },
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

          <Btn onClick={handleExport} style={{ marginRight: 10 }}>
            ⬇️ Télécharger le fichier .ics
          </Btn>
          <span style={{ fontSize: 12, color: 'var(--txt3)' }}>puis importe-le dans ton application calendrier</span>
        </Card>

        {/* Instructions par app */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
          {[
            {
              name: 'Google Calendar',
              icon: '🗓️',
              color: '#4285f4',
              steps: [
                'Télécharge le fichier .ics ci-dessus',
                'Ouvre Google Calendar sur ordinateur',
                'Clique ⚙️ → Paramètres',
                'Importer & Exporter → Importer',
                'Sélectionne le fichier .ics',
              ],
              url: 'https://calendar.google.com',
              urlLabel: 'Ouvrir Google Calendar',
            },
            {
              name: 'Apple Calendar',
              icon: '🍎',
              color: '#ff3b30',
              steps: [
                'Télécharge le fichier .ics ci-dessus',
                'Double-clique sur le fichier',
                'Apple Calendar s\'ouvre automatiquement',
                'Clique "Importer" pour confirmer',
              ],
              url: null,
              urlLabel: null,
            },
            {
              name: 'Outlook',
              icon: '📧',
              color: '#0078d4',
              steps: [
                'Télécharge le fichier .ics ci-dessus',
                'Ouvre Outlook',
                'Fichier → Ouvrir et exporter',
                'Importer/Exporter → Importer iCalendar',
                'Sélectionne le fichier .ics',
              ],
              url: 'https://outlook.live.com/calendar',
              urlLabel: 'Ouvrir Outlook',
            },
          ].map(app => (
            <Card key={app.name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: app.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{app.icon}</div>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--txt1)' }}>{app.name}</span>
              </div>
              <ol style={{ paddingLeft: 18, fontSize: 12, color: 'var(--txt2)', lineHeight: 2 }}>
                {app.steps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
              {app.url && (
                <a href={app.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: app.color, textDecoration: 'none' }}>
                  → {app.urlLabel}
                </a>
              )}
            </Card>
          ))}
        </div>

        {/* Webcal subscription */}
        <Card>
          <CardTitle>🔄 Abonnement automatique (sync en temps réel)</CardTitle>
          <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 16, lineHeight: 1.7 }}>
            Avec un abonnement <strong style={{ color: 'var(--txt1)' }}>Webcal</strong>, ton calendrier se met à jour automatiquement dans Google Calendar / Apple Calendar à chaque fois que tu ajoutes un événement dans AthleteOS.
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Btn onClick={copyWebcalUrl} variant="outline">
              🔗 Copier l'URL Webcal
            </Btn>
            <a href={`https://calendar.google.com/calendar/r/settings/addbyurl`} target="_blank" rel="noreferrer">
              <Btn variant="outline" style={{ color: '#4285f4' }}>
                📅 Abonner dans Google Calendar
              </Btn>
            </a>
            <span style={{ fontSize: 11, color: 'var(--txt3)' }}>Colle l'URL Webcal dans le champ d'abonnement</span>
          </div>

          <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: 12, color: 'var(--a4)' }}>
            ⚠️ La sync automatique nécessite que l'URL de ton calendrier soit publique. Active-la dans les réglages de ton profil → "Profil public".
          </div>
        </Card>
      </div>
    </div>
  )
}
