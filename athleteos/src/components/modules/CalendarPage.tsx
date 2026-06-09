'use client'
import { useState, useRef } from 'react'
import { Card, CardTitle, Topbar, Pill, Btn, Modal, ModalActions, Input, Select } from '@/components/ui'
import EventModal from './EventModal'
import type { Sport, CalendarEvent, Session } from '@/types'
import { EVENT_TYPE_CONFIG } from '@/types'

interface Props {
  sports: Sport[]
  events: CalendarEvent[]
  sessions: Session[]
  addEvent: (data: Partial<CalendarEvent>) => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error') => void
  setEvents: (events: CalendarEvent[]) => void
  [key: string]: unknown
}

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

function generateICS(events: CalendarEvent[], sessions: Session[], sports: Sport[], mode: 'all' | 'events' | 'sessions'): string {
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AthleteOS//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:AthleteOS']
  function fmt(d: string, t?: string | null) { return t ? `${d.replace(/-/g,'')}T${t.replace(/:/g,'')}00` : d.replace(/-/g,'') }
  function esc(t: string) { return t.replace(/[\\,;]/g, c => '\\'+c).replace(/\n/g,'\\n') }
  if (mode !== 'sessions') events.forEach(ev => {
    const cfg = EVENT_TYPE_CONFIG[ev.type]
    lines.push('BEGIN:VEVENT',`UID:ev-${ev.id}@athleteos`,`DTSTAMP:${new Date().toISOString().replace(/[-:.]/g,'').slice(0,15)}Z`,
      ev.event_time?`DTSTART;TZID=Europe/Paris:${fmt(ev.event_date,ev.event_time)}`:`DTSTART;VALUE=DATE:${fmt(ev.event_date)}`,
      ev.event_time?`DTEND;TZID=Europe/Paris:${fmt(ev.event_date,ev.event_time)}`:`DTEND;VALUE=DATE:${fmt(ev.event_date)}`,
      `SUMMARY:${esc(cfg.icon+' '+ev.title)}`,ev.location?`LOCATION:${esc(ev.location)}`:'','END:VEVENT')
  })
  if (mode !== 'events') sessions.forEach(s => {
    const sp = sports.find(x=>x.id===s.sport_id)
    lines.push('BEGIN:VEVENT',`UID:sess-${s.id}@athleteos`,`DTSTAMP:${new Date().toISOString().replace(/[-:.]/g,'').slice(0,15)}Z`,
      `DTSTART;VALUE=DATE:${fmt(s.date)}`,`DTEND;VALUE=DATE:${fmt(s.date)}`,
      `SUMMARY:${esc((sp?.icon||'💪')+' '+(sp?.label||'Séance')+(s.type?' — '+s.type:''))}`,
      'END:VEVENT')
  })
  lines.push('END:VCALENDAR')
  return lines.filter(Boolean).join('\r\n')
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content],{type:'text/calendar;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click()
  URL.revokeObjectURL(url)
}

function parseICS(text: string): Partial<CalendarEvent>[] {
  const events: Partial<CalendarEvent>[] = []
  const blocks = text.split('BEGIN:VEVENT').slice(1)
  blocks.forEach(block => {
    const get = (key: string) => { const m = block.match(new RegExp(key+'[^:]*:([^\\r\\n]+)')); return m?.[1]?.trim()||'' }
    const summary = get('SUMMARY')
    const dtstart = get('DTSTART')
    let date = ''
    let time: string|null = null
    if (dtstart.includes('T')) {
      date = `${dtstart.slice(0,4)}-${dtstart.slice(4,6)}-${dtstart.slice(6,8)}`
      time = `${dtstart.slice(9,11)}:${dtstart.slice(11,13)}`
    } else {
      date = `${dtstart.slice(0,4)}-${dtstart.slice(4,6)}-${dtstart.slice(6,8)}`
    }
    if (summary && date) {
      events.push({ title: summary.replace(/^[^\s]+\s/,''), event_date: date, event_time: time, type: 'training' })
    }
  })
  return events
}

export default function CalendarPage({ sports, events, sessions, addEvent, showToast, setEvents }: Props) {
  const now = new Date()
  const [cur, setCur]               = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [modal, setModal]           = useState(false)
  const [selectedDate, setSelectedDate] = useState<string|null>(null)
  const [activeTab, setActiveTab]   = useState<'calendar'|'sync'>('calendar')
  const [exportMode, setExportMode] = useState<'all'|'events'|'sessions'>('all')
  const [editingEvent, setEditingEvent] = useState<CalendarEvent|null>(null)
  const [editTitle, setEditTitle]   = useState('')
  const [editDate, setEditDate]     = useState('')
  const [editTime, setEditTime]     = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editType, setEditType]     = useState('training')
  const [saving, setSaving]         = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const firstDay    = new Date(cur.y, cur.m, 1).getDay()
  const daysInMonth = new Date(cur.y, cur.m+1, 0).getDate()
  const offset      = firstDay===0 ? 6 : firstDay-1
  const today       = new Date().toISOString().slice(0,10)

  function getDateStr(day: number) {
    return `${cur.y}-${String(cur.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }
  function navMonth(dir: number) {
    setCur(c => { let m=c.m+dir,y=c.y; if(m<0){m=11;y--} if(m>11){m=0;y++} return{y,m} })
  }

  function openEdit(ev: CalendarEvent, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingEvent(ev)
    setEditTitle(ev.title)
    setEditDate(ev.event_date)
    setEditTime(ev.event_time||'')
    setEditLocation(ev.location||'')
    setEditType(ev.type)
  }

  async function saveEdit() {
    if (!editingEvent) return
    setSaving(true)
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('calendar_events').update({
      title: editTitle, event_date: editDate, event_time: editTime||null,
      location: editLocation||null, type: editType as any,
    }).eq('id', editingEvent.id)
    if (!error) {
      setEvents(events.map(e => e.id===editingEvent.id ? {...e, title:editTitle, event_date:editDate, event_time:editTime||null, location:editLocation||null, type:editType as any} : e))
      showToast('Événement modifié ✅')
    } else showToast(error.message,'error')
    setSaving(false)
    setEditingEvent(null)
  }

  async function deleteEvent(ev: CalendarEvent, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Supprimer "${ev.title}" ?`)) return
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('calendar_events').delete().eq('id', ev.id)
    if (!error) { setEvents(events.filter(x => x.id!==ev.id)); showToast('Événement supprimé') }
    else showToast(error.message,'error')
  }

  async function importICS(file: File) {
    const text = await file.text()
    const parsed = parseICS(text)
    if (parsed.length===0) { showToast('Aucun événement trouvé dans ce fichier','error'); return }
    let count = 0
    for (const ev of parsed) {
      await addEvent({ ...ev, type: 'training' })
      count++
    }
    showToast(`${count} événement${count>1?'s':''} importé${count>1?'s':''} ! 📅`)
  }

  function handleExport() {
    const content = generateICS(events, sessions, sports, exportMode)
    const names = { all:'athleteos-complet', events:'athleteos-evenements', sessions:'athleteos-seances' }
    downloadICS(content, `${names[exportMode]}.ics`)
    showToast('Fichier .ics téléchargé ! 📅')
  }

  const upcoming = events.filter(e=>e.event_date>=today).sort((a,b)=>a.event_date.localeCompare(b.event_date))

  const tabBtn = (id:'calendar'|'sync', label:string, icon:string) => (
    <button onClick={()=>setActiveTab(id)} style={{
      padding:'8px 18px', borderRadius:9, border:'none', cursor:'pointer',
      background: activeTab===id ? 'var(--a1)' : 'transparent',
      color: activeTab===id ? '#fff' : 'var(--txt2)',
      fontFamily:'DM Sans, sans-serif', fontSize:13, fontWeight: activeTab===id ? 600 : 400,
      display:'flex', alignItems:'center', gap:6, transition:'all .15s',
    }}>{icon} {label}</button>
  )

  return (
    <div>
      <Topbar title="Calendrier Sportif" subtitle="Entraînements, matchs, compétitions & événements à suivre"
        action={{ label:'Ajouter événement', fn:()=>{setSelectedDate(null);setModal(true)} }} />
      <div style={{ padding:'0 28px 28px' }}>

        <div style={{ display:'flex', gap:4, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:4, marginBottom:16, width:'fit-content' }}>
          {tabBtn('calendar','Calendrier','📅')}
          {tabBtn('sync','Sync & Export','🔄')}
        </div>

        {activeTab==='calendar' && (
          <>
            {/* Legend */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
              {Object.entries(EVENT_TYPE_CONFIG).map(([id,cfg]) => (
                <div key={id} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:cfg.color+'15', border:`1px solid ${cfg.color}30`, fontSize:12 }}>
                  <span style={{ fontSize:14 }}>{cfg.icon}</span>
                  <span style={{ color:cfg.color, fontWeight:500 }}>{cfg.label}</span>
                </div>
              ))}
            </div>

            <Card style={{ marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <button onClick={()=>navMonth(-1)} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--txt1)', cursor:'pointer', fontSize:14 }}>←</button>
                <span style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:17, color:'var(--txt1)' }}>{MONTHS[cur.m]} {cur.y}</span>
                <button onClick={()=>navMonth(1)}  style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--txt1)', cursor:'pointer', fontSize:14 }}>→</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:4 }}>
                {DAYS.map(d=><div key={d} style={{ textAlign:'center', fontSize:11, color:'var(--txt3)', fontWeight:600, padding:'4px 0', letterSpacing:'.5px' }}>{d}</div>)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
                {Array.from({length:offset}).map((_,i)=><div key={`e${i}`} style={{ minHeight:88 }} />)}
                {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
                  const ds = getDateStr(day)
                  const dayEvents = events.filter(e=>e.event_date===ds)
                  const isToday = ds===today
                  return (
                    <div key={day} onClick={()=>{setSelectedDate(ds);setModal(true)}} style={{
                      minHeight:88, background:isToday?'rgba(79,142,247,.1)':'var(--bg3)',
                      borderRadius:9, border:`1px solid ${isToday?'var(--a1)':'var(--border)'}`,
                      padding:'7px 5px', cursor:'pointer', transition:'all .15s',
                    }}>
                      <div style={{ fontSize:12, fontWeight:isToday?700:400, color:isToday?'var(--a1)':'var(--txt2)', marginBottom:4 }}>{day}</div>
                      {dayEvents.map(ev=>{
                        const cfg = EVENT_TYPE_CONFIG[ev.type]
                        // Show sport icon if available, else type icon
                        const sport = sports.find(s=>s.id===ev.sport_id)
                        const displayIcon = ev.type==='spectator' ? cfg.icon : (sport?.icon || cfg.icon)
                        return (
                          <div key={ev.id} style={{ fontSize:9, padding:'2px 4px', borderRadius:3, background:cfg.color+'25', color:cfg.color, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:500, display:'flex', alignItems:'center', gap:2 }}>
                            <span>{displayIcon}</span>
                            <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{ev.title}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Upcoming list with edit/delete */}
            <Card>
              <CardTitle>Événements à venir</CardTitle>
              {upcoming.length===0 ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'var(--txt3)', fontSize:13 }}>Aucun événement planifié</div>
              ) : upcoming.map(ev=>{
                const cfg = EVENT_TYPE_CONFIG[ev.type]
                const sport = sports.find(s=>s.id===ev.sport_id)
                const displayIcon = ev.type==='spectator' ? cfg.icon : (sport?.icon || cfg.icon)
                return (
                  <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', background:'var(--bg3)', borderRadius:12, border:'1px solid var(--border)', marginBottom:8 }}>
                    <div style={{ width:42, height:42, borderRadius:10, background:cfg.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{displayIcon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                        <span style={{ fontSize:14, fontWeight:600, color:'var(--txt1)' }}>{ev.title}</span>
                        <Pill color={cfg.color}>{cfg.label}</Pill>
                        {ev.broadcast && <Pill color="var(--a6)">📡 {ev.broadcast}</Pill>}
                      </div>
                      <div style={{ fontSize:11, color:'var(--txt2)' }}>
                        📅 {ev.event_date}{ev.event_time?` · ⏰ ${ev.event_time}`:''}{ev.location?` · 📍 ${ev.location}`:''}
                        {ev.spectator_sport?` · ${ev.spectator_sport}`:''}
                      </div>
                    </div>
                    {/* Edit & Delete buttons */}
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={e=>openEdit(ev,e)} title="Modifier" style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg4)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✏️</button>
                      <button onClick={e=>deleteEvent(ev,e)} title="Supprimer" style={{ width:32, height:32, borderRadius:8, border:'1px solid rgba(244,63,94,.25)', background:'rgba(244,63,94,.08)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>🗑️</button>
                    </div>
                  </div>
                )
              })}
            </Card>
          </>
        )}

        {activeTab==='sync' && (
          <>
            {/* Import */}
            <Card style={{ marginBottom:16 }}>
              <CardTitle>📥 Importer un calendrier (.ics)</CardTitle>
              <div style={{ fontSize:13, color:'var(--txt2)', marginBottom:14, lineHeight:1.7 }}>
                Importe un fichier <strong style={{ color:'var(--txt1)' }}>.ics</strong> depuis Google Calendar, Apple Calendar ou Outlook pour ajouter directement tes événements dans AthleteOS.
              </div>
              <input ref={fileRef} type="file" accept=".ics" style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if(f) importICS(f) }} />
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <Btn onClick={()=>fileRef.current?.click()}>📂 Choisir un fichier .ics</Btn>
                <span style={{ fontSize:12, color:'var(--txt3)' }}>Formats supportés : Google Calendar, Apple Calendar, Outlook</span>
              </div>
              <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(79,142,247,.08)', border:'1px solid rgba(79,142,247,.2)', borderRadius:10, fontSize:12, color:'var(--a1)' }}>
                💡 Pour exporter depuis Google Calendar : Paramètres → Importer & Exporter → Exporter
              </div>
            </Card>

            {/* Export */}
            <Card style={{ marginBottom:16 }}>
              <CardTitle>📤 Exporter vers un calendrier (.ics)</CardTitle>
              <div style={{ fontSize:13, color:'var(--txt2)', marginBottom:16, lineHeight:1.7 }}>
                Compatible avec Google Calendar, Apple Calendar, Outlook et tous les calendriers modernes.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
                {[
                  { id:'all' as const, icon:'📦', label:'Tout exporter', desc:`${events.length} événements + ${sessions.length} séances` },
                  { id:'events' as const, icon:'📅', label:'Événements', desc:`${events.length} événements planifiés` },
                  { id:'sessions' as const, icon:'💪', label:'Séances', desc:`${sessions.length} séances enregistrées` },
                ].map(opt=>(
                  <div key={opt.id} onClick={()=>setExportMode(opt.id)} style={{ padding:'14px 16px', borderRadius:12, cursor:'pointer', transition:'all .15s', border:`1px solid ${exportMode===opt.id?'var(--a1)':'var(--border)'}`, background:exportMode===opt.id?'rgba(79,142,247,0.08)':'var(--bg3)' }}>
                    <div style={{ fontSize:24, marginBottom:8 }}>{opt.icon}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--txt1)', marginBottom:3 }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:'var(--txt2)' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
              <Btn onClick={handleExport}>⬇️ Télécharger le fichier .ics</Btn>
            </Card>

            {/* How-to */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
              {[
                { name:'Google Calendar', icon:'🗓️', color:'#4285f4', steps:['Télécharge le fichier .ics','Ouvre Google Calendar sur ordinateur','Clique ⚙️ → Paramètres','Importer & Exporter → Importer','Sélectionne le fichier .ics'], url:'https://calendar.google.com', urlLabel:'Ouvrir Google Calendar' },
                { name:'Apple Calendar',  icon:'🍎', color:'#ff3b30', steps:['Télécharge le fichier .ics','Double-clique sur le fichier','Apple Calendar s\'ouvre automatiquement','Clique "Importer" pour confirmer'], url:null, urlLabel:null },
                { name:'Outlook',         icon:'📧', color:'#0078d4', steps:['Télécharge le fichier .ics','Ouvre Outlook','Fichier → Ouvrir et exporter','Importer/Exporter → Importer iCalendar','Sélectionne le fichier .ics'], url:'https://outlook.live.com/calendar', urlLabel:'Ouvrir Outlook' },
              ].map(app=>(
                <Card key={app.name}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:app.color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{app.icon}</div>
                    <span style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:14, color:'var(--txt1)' }}>{app.name}</span>
                  </div>
                  <ol style={{ paddingLeft:18, fontSize:12, color:'var(--txt2)', lineHeight:2 }}>
                    {app.steps.map((step,i)=><li key={i}>{step}</li>)}
                  </ol>
                  {app.url && <a href={app.url} target="_blank" rel="noreferrer" style={{ display:'inline-block', marginTop:12, fontSize:12, color:app.color, textDecoration:'none' }}>→ {app.urlLabel}</a>}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit event modal */}
      <Modal open={!!editingEvent} onClose={()=>setEditingEvent(null)} title="✏️ Modifier l'événement">
        <Select label="Type" value={editType} onChange={e=>setEditType(e.target.value)}>
          {Object.entries(EVENT_TYPE_CONFIG).map(([id,cfg])=><option key={id} value={id}>{cfg.icon} {cfg.label}</option>)}
        </Select>
        <Input label="Titre" value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Input label="Date" type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} />
          <Input label="Heure" type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} />
        </div>
        <Input label="Lieu (optionnel)" value={editLocation} onChange={e=>setEditLocation(e.target.value)} />
        <ModalActions onCancel={()=>setEditingEvent(null)} onConfirm={saveEdit} loading={saving} confirmLabel="Enregistrer" />
      </Modal>

      <EventModal open={modal} onClose={()=>setModal(false)} sports={sports} onSave={addEvent} defaultDate={selectedDate||undefined} />
    </div>
  )
}
