'use client'
import { useState, useRef, useEffect } from 'react'
import { Card, Pill, Btn, Modal, ModalActions, Input, Select } from '@/components/ui'
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
const DAYS_SHORT = ['L','M','M','J','V','S','D']
const DAYS_FULL  = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

function generateICS(events: CalendarEvent[], sessions: Session[], sports: Sport[], mode: 'all'|'events'|'sessions') {
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AthleteOS//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH']
  const fmt = (d:string,t?:string|null) => t ? `${d.replace(/-/g,'')}T${t.replace(/:/g,'')}00` : d.replace(/-/g,'')
  const esc = (t:string) => t.replace(/[\\,;]/g,c=>'\\'+c).replace(/\n/g,'\\n')
  if (mode!=='sessions') events.forEach(ev => {
    const cfg=EVENT_TYPE_CONFIG[ev.type]
    lines.push('BEGIN:VEVENT',`UID:ev-${ev.id}@athleteos`,`DTSTAMP:${new Date().toISOString().replace(/[-:.]/g,'').slice(0,15)}Z`,
      ev.event_time?`DTSTART;TZID=Europe/Paris:${fmt(ev.event_date,ev.event_time)}`:`DTSTART;VALUE=DATE:${fmt(ev.event_date)}`,
      ev.event_time?`DTEND;TZID=Europe/Paris:${fmt(ev.event_date,ev.event_time)}`:`DTEND;VALUE=DATE:${fmt(ev.event_date)}`,
      `SUMMARY:${esc(cfg.icon+' '+ev.title)}`,ev.location?`LOCATION:${esc(ev.location)}`:'','END:VEVENT')
  })
  if (mode!=='events') sessions.forEach(s => {
    const sp=sports.find(x=>x.id===s.sport_id)
    lines.push('BEGIN:VEVENT',`UID:sess-${s.id}@athleteos`,`DTSTAMP:${new Date().toISOString().replace(/[-:.]/g,'').slice(0,15)}Z`,
      `DTSTART;VALUE=DATE:${fmt(s.date)}`,`DTEND;VALUE=DATE:${fmt(s.date)}`,
      `SUMMARY:${esc((sp?.icon||'💪')+' '+(sp?.label||'Séance')+(s.type?' — '+s.type:''))}`,
      'END:VEVENT')
  })
  lines.push('END:VCALENDAR')
  return lines.filter(Boolean).join('\r\n')
}

interface ParsedICSEvent { title:string; date:string; time:string|null; type:string; location:string; selected:boolean }

function parseICS(text:string): ParsedICSEvent[] {
  const events: ParsedICSEvent[] = []
  const blocks = text.split('BEGIN:VEVENT').slice(1)
  blocks.forEach(block => {
    const get = (key:string) => { const m=block.match(new RegExp(key+'[^:]*:([^\\r\\n]+)')); return m?.[1]?.trim()||'' }
    const summary = get('SUMMARY'); const dtstart = get('DTSTART'); const location = get('LOCATION')
    if (!summary||!dtstart) return
    let date='',time:string|null=null
    if (dtstart.includes('T')) { date=`${dtstart.slice(0,4)}-${dtstart.slice(4,6)}-${dtstart.slice(6,8)}`; time=`${dtstart.slice(9,11)}:${dtstart.slice(11,13)}` }
    else { const d=dtstart.replace(/[^0-9]/g,'').slice(0,8); date=`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` }
    if (date) events.push({ title: summary.replace(/\\,/g,','), date, time, type:'training', location, selected:true })
  })
  return events
}

const EVENT_TYPE_OPTIONS = [
  {v:'training',l:'💪 Entraînement'},{v:'match',l:'🏅 Match'},{v:'tournament',l:'🏆 Tournoi'},
  {v:'competition',l:'🎯 Compétition'},{v:'objective',l:'🎪 Objectif'},{v:'spectator',l:'📺 À suivre'},
]

// ── MOBILE CALENDAR (iPhone-style) ──────────────────────────
function MobileCalendar({ sports, events, sessions, addEvent, showToast, setEvents }: Props) {
  const now = new Date()
  const [cur, setCur]           = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [selectedDate, setSelectedDate] = useState(now.toISOString().slice(0,10))
  const [newEventModal, setNewEventModal] = useState(false)
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent|null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent|null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate]   = useState('')
  const [editTime, setEditTime]   = useState('')
  const [editType, setEditType]   = useState('training')
  const [editLocation, setEditLocation] = useState('')
  const [saving, setSaving]       = useState(false)
  const [importPreview, setImportPreview] = useState<ParsedICSEvent[]|null>(null)
  const [importing, setImporting] = useState(false)
  const [showSync, setShowSync]   = useState(false)
  const [exportMode, setExportMode] = useState<'all'|'events'|'sessions'>('all')
  const fileRef = useRef<HTMLInputElement>(null)
  const today   = now.toISOString().slice(0,10)

  const firstDay    = new Date(cur.y, cur.m, 1).getDay()
  const daysInMonth = new Date(cur.y, cur.m+1, 0).getDate()
  const offset      = firstDay===0 ? 6 : firstDay-1

  function getDateStr(day:number) {
    return `${cur.y}-${String(cur.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  // Events for selected date
  const dayEvents = events.filter(e => e.event_date === selectedDate)
    .sort((a,b) => (a.event_time||'00:00').localeCompare(b.event_time||'00:00'))

  // Upcoming (next 30 days starting from today)
  const upcoming = events
    .filter(e => e.event_date >= today)
    .sort((a,b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 10)

  // Has events/sessions per day (for dots)
  function getDotsForDay(day: number) {
    const ds = getDateStr(day)
    const dayEvts = events.filter(e => e.event_date === ds)
    const daySess = sessions.filter(s => s.date === ds)
    const dots: {color:string;key:string}[] = []
    if (daySess.length > 0) {
      const sp = sports.find(s => s.id === daySess[0].sport_id)
      dots.push({ color: sp?.color || 'var(--a1)', key: 'sess' })
    }
    dayEvts.slice(0,2).forEach(ev => {
      const cfg = EVENT_TYPE_CONFIG[ev.type]
      dots.push({ color: cfg.color, key: ev.id })
    })
    return dots.slice(0,3)
  }

  function openEdit(ev: CalendarEvent) {
    setViewingEvent(null)
    setEditingEvent(ev); setEditTitle(ev.title); setEditDate(ev.event_date)
    setEditTime(ev.event_time||''); setEditType(ev.type); setEditLocation(ev.location||'')
  }

  async function saveEdit() {
    if (!editingEvent) return
    setSaving(true)
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('calendar_events').update({
      title:editTitle, event_date:editDate, event_time:editTime||null,
      location:editLocation||null, type:editType as any,
    }).eq('id', editingEvent.id)
    if (!error) {
      setEvents(events.map(e => e.id===editingEvent.id ? {...e,title:editTitle,event_date:editDate,event_time:editTime||null,location:editLocation||null,type:editType as any} : e))
      showToast('Événement modifié ✅')
    } else showToast(error.message,'error')
    setSaving(false); setEditingEvent(null)
  }

  async function deleteEvent(ev: CalendarEvent) {
    if (!confirm(`Supprimer "${ev.title}" ?`)) return
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('calendar_events').delete().eq('id', ev.id)
    if (!error) { setEvents(events.filter(x => x.id!==ev.id)); showToast('Supprimé'); setViewingEvent(null) }
    else showToast(error.message,'error')
  }

  async function handleFileSelect(file: File) {
    const text = await file.text()
    const parsed = parseICS(text)
    if (parsed.length===0) { showToast('Aucun événement trouvé','error'); return }
    setImportPreview(parsed)
  }

  async function confirmImport() {
    if (!importPreview) return
    setImporting(true)
    const toImport = importPreview.filter(e=>e.selected)
    for (const ev of toImport) await addEvent({type:ev.type as any,title:ev.title,event_date:ev.date,event_time:ev.time,location:ev.location||null})
    setImporting(false); setImportPreview(null)
    showToast(`${toImport.length} événement${toImport.length>1?'s':''} importé${toImport.length>1?'s':''} ! 📅`)
  }

  function handleExport() {
    const content = generateICS(events, sessions, sports, exportMode)
    const names = {all:'athleteos-complet',events:'athleteos-evenements',sessions:'athleteos-seances'}
    const blob = new Blob([content],{type:'text/calendar;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`${names[exportMode]}.ics`; a.click()
    URL.revokeObjectURL(url)
    showToast('Fichier .ics téléchargé ! 📅')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div style={{ padding:'14px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:22, color:'var(--txt1)' }}>Calendrier</div>
          <div style={{ fontSize:11, color:'var(--txt3)' }}>{MONTHS[cur.m]} {cur.y}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setShowSync(s=>!s)} style={{ width:36, height:36, borderRadius:10, border:'1px solid var(--border2)', background:'var(--bg3)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>🔄</button>
          <button onClick={()=>{setSelectedDate(today);setNewEventModal(true)}} style={{ width:36, height:36, borderRadius:10, border:'none', background:'var(--a1)', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>+</button>
        </div>
      </div>

      {/* Sync panel */}
      {showSync && (
        <div style={{ margin:'10px 16px 0', padding:'14px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14 }}>
          <div style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:13, marginBottom:12 }}>Sync & Export</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <input ref={fileRef} type="file" accept=".ics" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFileSelect(f)}} />
            <button onClick={()=>fileRef.current?.click()} style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--txt1)', cursor:'pointer', fontSize:12, fontFamily:'DM Sans,sans-serif' }}>📥 Importer .ics</button>
            <button onClick={handleExport} style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--txt1)', cursor:'pointer', fontSize:12, fontFamily:'DM Sans,sans-serif' }}>📤 Exporter .ics</button>
          </div>
        </div>
      )}

      {/* Month navigation */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px 6px' }}>
        <button onClick={()=>setCur(c=>{let m=c.m-1,y=c.y;if(m<0){m=11;y--}return{y,m}})} style={{ width:32,height:32,borderRadius:8,border:'none',background:'transparent',color:'var(--txt2)',cursor:'pointer',fontSize:18 }}>‹</button>
        <button onClick={()=>{const n=new Date();setCur({y:n.getFullYear(),m:n.getMonth()});setSelectedDate(n.toISOString().slice(0,10))}} style={{ padding:'4px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'transparent',color:'var(--a1)',cursor:'pointer',fontSize:12,fontFamily:'DM Sans,sans-serif' }}>Aujourd'hui</button>
        <button onClick={()=>setCur(c=>{let m=c.m+1,y=c.y;if(m>11){m=0;y++}return{y,m}})} style={{ width:32,height:32,borderRadius:8,border:'none',background:'transparent',color:'var(--txt2)',cursor:'pointer',fontSize:18 }}>›</button>
      </div>

      {/* Day labels */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 10px', marginBottom:4 }}>
        {DAYS_SHORT.map((d,i) => (
          <div key={d+i} style={{ textAlign:'center', fontSize:11, color: i>=5 ? 'var(--a5)' : 'var(--txt3)', fontWeight:600, padding:'2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid — compact iPhone style */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 10px', gap:'2px 0' }}>
        {Array.from({length:offset}).map((_,i) => <div key={`e${i}`} style={{ height:54 }} />)}
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(day => {
          const ds = getDateStr(day)
          const isToday    = ds === today
          const isSelected = ds === selectedDate
          const dots       = getDotsForDay(day)
          const isWeekend  = (() => { const dow = new Date(cur.y,cur.m,day).getDay(); return dow===0||dow===6 })()
          return (
            <div key={day} onClick={()=>setSelectedDate(ds)} style={{ height:54, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, cursor:'pointer' }}>
              <div style={{
                width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:isSelected||isToday?700:400,
                background: isSelected ? 'var(--a1)' : 'transparent',
                color: isSelected ? '#fff' : isToday ? 'var(--a1)' : isWeekend ? 'var(--a5)' : 'var(--txt1)',
                border: isToday && !isSelected ? '1.5px solid var(--a1)' : 'none',
              }}>
                {day}
              </div>
              <div style={{ display:'flex', gap:2, height:6, alignItems:'center' }}>
                {dots.map(d => <div key={d.key} style={{ width:5,height:5,borderRadius:'50%',background:isSelected?'rgba(255,255,255,.7)':d.color }} />)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Divider */}
      <div style={{ height:1, background:'var(--border)', margin:'10px 0 0' }} />

      {/* Day detail list — scrollable */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 16px 16px' }}>
        <div style={{ padding:'12px 0 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--txt1)' }}>
            {new Date(selectedDate+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
          </div>
          <button onClick={()=>setNewEventModal(true)} style={{ fontSize:11, color:'var(--a1)', background:'none', border:'none', cursor:'pointer', padding:'4px 8px' }}>+ Ajouter</button>
        </div>

        {dayEvents.length === 0 ? (
          <div style={{ textAlign:'center', padding:'20px 0', color:'var(--txt3)', fontSize:13 }}>
            Aucun événement ce jour{'\n'}
            <button onClick={()=>setNewEventModal(true)} style={{ marginTop:8, padding:'8px 16px', borderRadius:8, border:'1px dashed var(--border2)', background:'transparent', color:'var(--txt2)', cursor:'pointer', fontSize:12 }}>Ajouter un événement</button>
          </div>
        ) : dayEvents.map(ev => {
          const cfg = EVENT_TYPE_CONFIG[ev.type]
          const sport = sports.find(s=>s.id===ev.sport_id)
          const icon = ev.type==='spectator'?cfg.icon:(sport?.icon||cfg.icon)
          return (
            <div key={ev.id} onClick={()=>setViewingEvent(ev)} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--bg2)', borderRadius:12, border:'1px solid var(--border)', marginBottom:8, cursor:'pointer' }}>
              <div style={{ width:36,height:36,borderRadius:10,background:cfg.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>{icon}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:13,fontWeight:600,color:'var(--txt1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{ev.title}</div>
                <div style={{ fontSize:11,color:'var(--txt2)' }}>{ev.event_time||'Toute la journée'}{ev.location?` · 📍 ${ev.location}`:''}</div>
              </div>
              <div style={{ width:10,height:10,borderRadius:'50%',background:cfg.color,flexShrink:0 }} />
            </div>
          )
        })}

        {/* Upcoming section */}
        {dayEvents.length === 0 && upcoming.length > 0 && (
          <>
            <div style={{ fontSize:12,fontWeight:600,color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'.8px',marginTop:16,marginBottom:10 }}>À venir</div>
            {upcoming.map(ev => {
              const cfg = EVENT_TYPE_CONFIG[ev.type]
              const sport = sports.find(s=>s.id===ev.sport_id)
              const icon = ev.type==='spectator'?cfg.icon:(sport?.icon||cfg.icon)
              return (
                <div key={ev.id} onClick={()=>setViewingEvent(ev)} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'var(--bg2)',borderRadius:12,border:'1px solid var(--border)',marginBottom:8,cursor:'pointer' }}>
                  <div style={{ width:32,height:32,borderRadius:8,background:cfg.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>{icon}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:'var(--txt1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{ev.title}</div>
                    <div style={{ fontSize:10,color:'var(--txt2)' }}>{new Date(ev.event_date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}{ev.event_time?` · ${ev.event_time}`:''}</div>
                  </div>
                  <Pill color={cfg.color}>{cfg.label}</Pill>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Event detail modal */}
      {viewingEvent && (() => {
        const cfg = EVENT_TYPE_CONFIG[viewingEvent.type]
        const sport = sports.find(s=>s.id===viewingEvent.sport_id)
        const icon = viewingEvent.type==='spectator'?cfg.icon:(sport?.icon||cfg.icon)
        return (
          <Modal open={!!viewingEvent} onClose={()=>setViewingEvent(null)} title="📋 Événement">
            <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:18 }}>
              <div style={{ width:48,height:48,borderRadius:14,background:cfg.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>{icon}</div>
              <div>
                <div style={{ fontSize:16,fontWeight:700,color:'var(--txt1)',fontFamily:'Syne,sans-serif',marginBottom:4 }}>{viewingEvent.title}</div>
                <Pill color={cfg.color}>{cfg.label}</Pill>
              </div>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:20 }}>
              <div style={{ fontSize:13,color:'var(--txt2)',display:'flex',gap:10 }}><span>📅</span>{viewingEvent.event_date}</div>
              {viewingEvent.event_time && <div style={{ fontSize:13,color:'var(--txt2)',display:'flex',gap:10 }}><span>⏰</span>{viewingEvent.event_time}</div>}
              {viewingEvent.location && <div style={{ fontSize:13,color:'var(--txt2)',display:'flex',gap:10 }}><span>📍</span>{viewingEvent.location}</div>}
              {viewingEvent.description && <div style={{ fontSize:13,color:'var(--txt2)',background:'var(--bg3)',borderRadius:10,padding:'10px 12px',lineHeight:1.7 }}>{viewingEvent.description}</div>}
            </div>
            <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
              <Btn onClick={()=>openEdit(viewingEvent)} variant="outline">✏️ Modifier</Btn>
              <Btn onClick={()=>deleteEvent(viewingEvent)} variant="outline" style={{ color:'var(--a5)',borderColor:'rgba(244,63,94,.3)' }}>🗑️</Btn>
              <Btn onClick={()=>setViewingEvent(null)}>Fermer</Btn>
            </div>
          </Modal>
        )
      })()}

      {/* Edit modal */}
      <Modal open={!!editingEvent} onClose={()=>setEditingEvent(null)} title="✏️ Modifier">
        <Select label="Type" value={editType} onChange={e=>setEditType(e.target.value)}>
          {EVENT_TYPE_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </Select>
        <Input label="Titre" value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <Input label="Date" type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} />
          <Input label="Heure" type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} />
        </div>
        <Input label="Lieu" value={editLocation} onChange={e=>setEditLocation(e.target.value)} />
        <ModalActions onCancel={()=>setEditingEvent(null)} onConfirm={saveEdit} loading={saving} confirmLabel="Enregistrer" />
      </Modal>

      {/* ICS import preview */}
      <Modal open={!!importPreview} onClose={()=>setImportPreview(null)} title="📥 Aperçu importation">
        <div style={{ fontSize:13,color:'var(--txt2)',marginBottom:12 }}>{importPreview?.length} événement{(importPreview?.length||0)>1?'s':''} trouvé{(importPreview?.length||0)>1?'s':''}.</div>
        <div style={{ maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:8 }}>
          {importPreview?.map((ev,i) => (
            <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:ev.selected?'rgba(79,142,247,.08)':'var(--bg3)',borderRadius:10,border:`1px solid ${ev.selected?'var(--a1)':'var(--border)'}`}}>
              <div onClick={()=>setImportPreview(p=>p?.map((x,j)=>j===i?{...x,selected:!x.selected}:x)||null)} style={{ width:20,height:20,borderRadius:5,border:`2px solid ${ev.selected?'var(--a1)':'var(--border2)'}`,background:ev.selected?'var(--a1)':'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                {ev.selected&&<span style={{ color:'#fff',fontSize:12 }}>✓</span>}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:12,fontWeight:500,color:'var(--txt1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{ev.title}</div>
                <div style={{ fontSize:10,color:'var(--txt2)' }}>{ev.date}{ev.time?` · ${ev.time}`:''}</div>
              </div>
              <select value={ev.type} onChange={e=>setImportPreview(p=>p?.map((x,j)=>j===i?{...x,type:e.target.value}:x)||null)} style={{ padding:'4px 6px',borderRadius:7,border:'1px solid var(--border2)',background:'var(--bg4)',color:'var(--txt1)',fontSize:10,flexShrink:0 }}>
                {EVENT_TYPE_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:14 }}>
          <Btn onClick={()=>setImportPreview(null)} variant="outline">Annuler</Btn>
          <Btn onClick={confirmImport} disabled={importing||!importPreview?.some(e=>e.selected)}>
            {importing?'…':`Importer (${importPreview?.filter(e=>e.selected).length||0})`}
          </Btn>
        </div>
      </Modal>

      <EventModal open={newEventModal} onClose={()=>setNewEventModal(false)} sports={sports} onSave={addEvent} defaultDate={selectedDate} />
    </div>
  )
}

// ── DESKTOP CALENDAR ──────────────────────────────────────
function DesktopCalendar({ sports, events, sessions, addEvent, showToast, setEvents }: Props) {
  const now = new Date()
  const [cur, setCur]           = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [modal, setModal]       = useState(false)
  const [selectedDate, setSelectedDate] = useState<string|null>(null)
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent|null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent|null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate]   = useState('')
  const [editTime, setEditTime]   = useState('')
  const [editType, setEditType]   = useState('training')
  const [editLocation, setEditLocation] = useState('')
  const [saving, setSaving]       = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [importPreview, setImportPreview] = useState<ParsedICSEvent[]|null>(null)
  const [importing, setImporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'calendar'|'sync'>('calendar')
  const [exportMode, setExportMode] = useState<'all'|'events'|'sessions'>('all')
  const fileRef = useRef<HTMLInputElement>(null)
  const today   = now.toISOString().slice(0,10)

  const firstDay    = new Date(cur.y, cur.m, 1).getDay()
  const daysInMonth = new Date(cur.y, cur.m+1, 0).getDate()
  const offset      = firstDay===0 ? 6 : firstDay-1
  const upcoming    = events.filter(e=>e.event_date>=today).sort((a,b)=>a.event_date.localeCompare(b.event_date))

  function getDateStr(day:number) { return `${cur.y}-${String(cur.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` }
  function navMonth(dir:number) { setCur(c=>{let m=c.m+dir,y=c.y;if(m<0){m=11;y--}if(m>11){m=0;y++}return{y,m}}) }

  function toggleSelect(id:string) { setSelectedIds(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n}) }

  async function deleteSelected() {
    if (!confirm(`Supprimer ${selectedIds.size} événement${selectedIds.size>1?'s':''} ?`)) return
    const { supabase } = await import('@/lib/supabase')
    const ids = Array.from(selectedIds)
    const { error } = await supabase.from('calendar_events').delete().in('id',ids)
    if (!error) { setEvents(events.filter(e=>!selectedIds.has(e.id))); showToast(`${ids.length} supprimé${ids.length>1?'s':''}`); setSelectedIds(new Set()); setSelectMode(false) }
    else showToast(error.message,'error')
  }

  async function bulkChangeType(type:string) {
    const { supabase } = await import('@/lib/supabase')
    const ids = Array.from(selectedIds)
    const { error } = await supabase.from('calendar_events').update({type:type as any}).in('id',ids)
    if (!error) { setEvents(events.map(e=>selectedIds.has(e.id)?{...e,type:type as any}:e)); showToast('Type modifié'); setSelectedIds(new Set()); setSelectMode(false) }
    else showToast(error.message,'error')
  }

  function openEdit(ev: CalendarEvent, e?: React.MouseEvent) {
    e?.stopPropagation(); setViewingEvent(null)
    setEditingEvent(ev); setEditTitle(ev.title); setEditDate(ev.event_date)
    setEditTime(ev.event_time||''); setEditType(ev.type); setEditLocation(ev.location||'')
  }

  async function saveEdit() {
    if (!editingEvent) return
    setSaving(true)
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('calendar_events').update({ title:editTitle,event_date:editDate,event_time:editTime||null,location:editLocation||null,type:editType as any }).eq('id',editingEvent.id)
    if (!error) { setEvents(events.map(e=>e.id===editingEvent.id?{...e,title:editTitle,event_date:editDate,event_time:editTime||null,location:editLocation||null,type:editType as any}:e)); showToast('Modifié ✅') }
    else showToast(error.message,'error')
    setSaving(false); setEditingEvent(null)
  }

  async function deleteSingle(ev: CalendarEvent, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!confirm(`Supprimer "${ev.title}" ?`)) return
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('calendar_events').delete().eq('id',ev.id)
    if (!error) { setEvents(events.filter(x=>x.id!==ev.id)); showToast('Supprimé'); setViewingEvent(null) }
    else showToast(error.message,'error')
  }

  async function handleFileSelect(file: File) {
    const text = await file.text()
    const parsed = parseICS(text)
    if (parsed.length===0) { showToast('Aucun événement trouvé','error'); return }
    setImportPreview(parsed)
  }

  async function confirmImport() {
    if (!importPreview) return
    setImporting(true)
    const toImport = importPreview.filter(e=>e.selected)
    for (const ev of toImport) await addEvent({type:ev.type as any,title:ev.title,event_date:ev.date,event_time:ev.time,location:ev.location||null})
    setImporting(false); setImportPreview(null)
    showToast(`${toImport.length} événement${toImport.length>1?'s':''} importé${toImport.length>1?'s':''}! 📅`)
  }

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 28px 0',marginBottom:16,flexWrap:'wrap',gap:10 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'var(--txt1)',margin:0 }}>Calendrier Sportif</h1>
          <p style={{ color:'var(--txt2)',fontSize:12,marginTop:2 }}>Entraînements, matchs & événements</p>
        </div>
        <button onClick={()=>{setSelectedDate(null);setModal(true)}} style={{ padding:'9px 16px',borderRadius:10,background:'var(--a1)',border:'none',color:'#fff',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>➕ Ajouter événement</button>
      </div>
      <div style={{ padding:'0 28px 28px' }}>

        <div style={{ display:'flex',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:4,marginBottom:16,width:'fit-content' }}>
          {[{id:'calendar' as const,icon:'📅',label:'Calendrier'},{id:'sync' as const,icon:'🔄',label:'Sync & Export'}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:'8px 18px',borderRadius:9,border:'none',cursor:'pointer',background:activeTab===t.id?'var(--a1)':'transparent',color:activeTab===t.id?'#fff':'var(--txt2)',fontSize:13,fontWeight:activeTab===t.id?600:400,display:'flex',alignItems:'center',gap:6 }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {activeTab==='calendar' && (
          <>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:16 }}>
              {Object.entries(EVENT_TYPE_CONFIG).map(([id,cfg])=>(
                <div key={id} style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:20,background:cfg.color+'15',border:`1px solid ${cfg.color}30`,fontSize:12 }}>
                  <span style={{ fontSize:14 }}>{cfg.icon}</span><span style={{ color:cfg.color,fontWeight:500 }}>{cfg.label}</span>
                </div>
              ))}
            </div>

            <Card style={{ marginBottom:16 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
                <button onClick={()=>navMonth(-1)} style={{ padding:'7px 14px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg3)',color:'var(--txt1)',cursor:'pointer',fontSize:14 }}>←</button>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:17,color:'var(--txt1)' }}>{MONTHS[cur.m]} {cur.y}</span>
                <button onClick={()=>navMonth(1)} style={{ padding:'7px 14px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg3)',color:'var(--txt1)',cursor:'pointer',fontSize:14 }}>→</button>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:4 }}>
                {DAYS_FULL.map((d,i)=><div key={d+i} style={{ textAlign:'center',fontSize:11,color:'var(--txt3)',fontWeight:600,padding:'4px 0' }}>{d}</div>)}
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3 }}>
                {Array.from({length:offset}).map((_,i)=><div key={`e${i}`} style={{ minHeight:80 }} />)}
                {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
                  const ds=getDateStr(day)
                  const dayEvts=events.filter(e=>e.event_date===ds)
                  const isToday=ds===today
                  return(
                    <div key={day} onClick={()=>{setSelectedDate(ds);setModal(true)}} style={{ minHeight:80,background:isToday?'rgba(79,142,247,.1)':'var(--bg3)',borderRadius:9,border:`1px solid ${isToday?'var(--a1)':'var(--border)'}`,padding:'6px 4px',cursor:'pointer' }}>
                      <div style={{ fontSize:12,fontWeight:isToday?700:400,color:isToday?'var(--a1)':'var(--txt2)',marginBottom:3 }}>{day}</div>
                      {dayEvts.map(ev=>{
                        const cfg=EVENT_TYPE_CONFIG[ev.type]
                        const sport=sports.find(s=>s.id===ev.sport_id)
                        const icon=ev.type==='spectator'?cfg.icon:(sport?.icon||cfg.icon)
                        return(
                          <div key={ev.id} onClick={e=>{e.stopPropagation();setViewingEvent(ev)}} style={{ fontSize:9,padding:'2px 4px',borderRadius:3,background:cfg.color+'25',color:cfg.color,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontWeight:500,display:'flex',alignItems:'center',gap:2,cursor:'pointer' }}>
                            <span>{icon}</span><span style={{ overflow:'hidden',textOverflow:'ellipsis' }}>{ev.title}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Upcoming list with multi-select */}
            <Card>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8 }}>
                <div style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,color:'var(--txt1)' }}>Événements à venir ({upcoming.length})</div>
                <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
                  {!selectMode ? (
                    <Btn onClick={()=>setSelectMode(true)} variant="outline" style={{ fontSize:11 }}>☑️ Sélectionner</Btn>
                  ) : (
                    <>
                      <span style={{ fontSize:12,color:'var(--txt2)' }}>{selectedIds.size} sél.</span>
                      <Btn onClick={()=>setSelectedIds(new Set(upcoming.map(e=>e.id)))} variant="outline" style={{ fontSize:11 }}>Tout</Btn>
                      {selectedIds.size>0 && (
                        <>
                          <select onChange={e=>{if(e.target.value)bulkChangeType(e.target.value)}} defaultValue="" style={{ padding:'7px 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg3)',color:'var(--txt1)',fontSize:12 }}>
                            <option value="" disabled>Changer type…</option>
                            {EVENT_TYPE_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                          <button onClick={deleteSelected} style={{ padding:'7px 12px',borderRadius:8,border:'1px solid rgba(244,63,94,.3)',background:'rgba(244,63,94,.1)',color:'var(--a5)',fontSize:12,cursor:'pointer' }}>🗑️ ({selectedIds.size})</button>
                        </>
                      )}
                      <Btn onClick={()=>{setSelectMode(false);setSelectedIds(new Set())}} variant="ghost" style={{ fontSize:11 }}>Annuler</Btn>
                    </>
                  )}
                </div>
              </div>
              {upcoming.length===0 ? <div style={{ textAlign:'center',padding:'20px 0',color:'var(--txt3)',fontSize:13 }}>Aucun événement planifié</div>
              : upcoming.map(ev=>{
                const cfg=EVENT_TYPE_CONFIG[ev.type]
                const sport=sports.find(s=>s.id===ev.sport_id)
                const icon=ev.type==='spectator'?cfg.icon:(sport?.icon||cfg.icon)
                const isSelected=selectedIds.has(ev.id)
                return(
                  <div key={ev.id} onClick={()=>selectMode?toggleSelect(ev.id):setViewingEvent(ev)} style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 14px',background:isSelected?'rgba(79,142,247,.1)':'var(--bg3)',borderRadius:12,border:`1px solid ${isSelected?'var(--a1)':'var(--border)'}`,marginBottom:8,cursor:'pointer',transition:'all .15s' }}>
                    {selectMode && <div onClick={e=>{e.stopPropagation();toggleSelect(ev.id)}} style={{ width:20,height:20,borderRadius:5,border:`2px solid ${isSelected?'var(--a1)':'var(--border2)'}`,background:isSelected?'var(--a1)':'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>{isSelected&&<span style={{ color:'#fff',fontSize:12,fontWeight:700 }}>✓</span>}</div>}
                    <div style={{ width:40,height:40,borderRadius:10,background:cfg.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>{icon}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:3 }}>
                        <span style={{ fontSize:13,fontWeight:600,color:'var(--txt1)' }}>{ev.title}</span>
                        <Pill color={cfg.color}>{cfg.label}</Pill>
                      </div>
                      <div style={{ fontSize:11,color:'var(--txt2)' }}>📅 {ev.event_date}{ev.event_time?` · ⏰ ${ev.event_time}`:''}{ev.location?` · 📍 ${ev.location}`:''}</div>
                    </div>
                    {!selectMode&&(
                      <div style={{ display:'flex',gap:6,flexShrink:0 }}>
                        <button onClick={e=>openEdit(ev,e)} style={{ width:30,height:30,borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg4)',cursor:'pointer',fontSize:13 }}>✏️</button>
                        <button onClick={e=>deleteSingle(ev,e)} style={{ width:30,height:30,borderRadius:8,border:'1px solid rgba(244,63,94,.25)',background:'rgba(244,63,94,.08)',cursor:'pointer',fontSize:13 }}>🗑️</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </Card>
          </>
        )}

        {activeTab==='sync' && (
          <>
            <Card style={{ marginBottom:16 }}>
              <div style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,color:'var(--txt1)',marginBottom:14 }}>📥 Importer (.ics)</div>
              <input ref={fileRef} type="file" accept=".ics" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFileSelect(f)}} />
              <Btn onClick={()=>fileRef.current?.click()}>📂 Choisir un fichier .ics</Btn>
              <div style={{ marginTop:12,padding:'10px 14px',background:'rgba(79,142,247,.08)',border:'1px solid rgba(79,142,247,.2)',borderRadius:10,fontSize:12,color:'var(--a1)' }}>💡 Prévisualisation avant importation — tu pourras choisir le type pour chaque événement</div>
            </Card>
            <Card>
              <div style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,color:'var(--txt1)',marginBottom:14 }}>📤 Exporter (.ics)</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16 }}>
                {[{id:'all' as const,icon:'📦',label:'Tout',desc:`${events.length} ev + ${sessions.length} séances`},{id:'events' as const,icon:'📅',label:'Événements',desc:`${events.length} événements`},{id:'sessions' as const,icon:'💪',label:'Séances',desc:`${sessions.length} séances`}].map(opt=>(
                  <div key={opt.id} onClick={()=>setExportMode(opt.id)} style={{ padding:'12px',borderRadius:12,cursor:'pointer',border:`1px solid ${exportMode===opt.id?'var(--a1)':'var(--border)'}`,background:exportMode===opt.id?'rgba(79,142,247,.08)':'var(--bg3)',textAlign:'center' }}>
                    <div style={{ fontSize:20,marginBottom:6 }}>{opt.icon}</div>
                    <div style={{ fontSize:12,fontWeight:600,color:'var(--txt1)' }}>{opt.label}</div>
                    <div style={{ fontSize:10,color:'var(--txt2)' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
              <Btn onClick={()=>{const c=generateICS(events,sessions,sports,exportMode);const b=new Blob([c],{type:'text/calendar;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`athleteos-${exportMode}.ics`;a.click();URL.revokeObjectURL(u);showToast('Téléchargé ! 📅')}}>⬇️ Télécharger</Btn>
            </Card>
          </>
        )}
      </div>

      {/* Shared modals */}
      {viewingEvent && (() => {
        const cfg=EVENT_TYPE_CONFIG[viewingEvent.type]
        const sport=sports.find(s=>s.id===viewingEvent.sport_id)
        const icon=viewingEvent.type==='spectator'?cfg.icon:(sport?.icon||cfg.icon)
        return (
          <Modal open={!!viewingEvent} onClose={()=>setViewingEvent(null)} title="📋 Événement">
            <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:18 }}>
              <div style={{ width:48,height:48,borderRadius:14,background:cfg.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>{icon}</div>
              <div><div style={{ fontSize:16,fontWeight:700,color:'var(--txt1)',fontFamily:'Syne,sans-serif',marginBottom:4 }}>{viewingEvent.title}</div><Pill color={cfg.color}>{cfg.label}</Pill></div>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:20 }}>
              <div style={{ fontSize:13,color:'var(--txt2)',display:'flex',gap:10 }}><span>📅</span>{viewingEvent.event_date}</div>
              {viewingEvent.event_time&&<div style={{ fontSize:13,color:'var(--txt2)',display:'flex',gap:10 }}><span>⏰</span>{viewingEvent.event_time}</div>}
              {viewingEvent.location&&<div style={{ fontSize:13,color:'var(--txt2)',display:'flex',gap:10 }}><span>📍</span>{viewingEvent.location}</div>}
            </div>
            <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
              <Btn onClick={()=>openEdit(viewingEvent)} variant="outline">✏️ Modifier</Btn>
              <Btn onClick={()=>deleteSingle(viewingEvent)} variant="outline" style={{ color:'var(--a5)',borderColor:'rgba(244,63,94,.3)' }}>🗑️</Btn>
              <Btn onClick={()=>setViewingEvent(null)}>Fermer</Btn>
            </div>
          </Modal>
        )
      })()}

      <Modal open={!!editingEvent} onClose={()=>setEditingEvent(null)} title="✏️ Modifier l'événement">
        <Select label="Type" value={editType} onChange={e=>setEditType(e.target.value)}>
          {EVENT_TYPE_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </Select>
        <Input label="Titre" value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <Input label="Date" type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} />
          <Input label="Heure" type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} />
        </div>
        <Input label="Lieu" value={editLocation} onChange={e=>setEditLocation(e.target.value)} />
        <ModalActions onCancel={()=>setEditingEvent(null)} onConfirm={saveEdit} loading={saving} confirmLabel="Enregistrer" />
      </Modal>

      <Modal open={!!importPreview} onClose={()=>setImportPreview(null)} title="📥 Aperçu importation">
        <div style={{ fontSize:13,color:'var(--txt2)',marginBottom:12 }}>{importPreview?.length} événement{(importPreview?.length||0)>1?'s':''} trouvé{(importPreview?.length||0)>1?'s':''}.</div>
        <div style={{ maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:8 }}>
          {importPreview?.map((ev,i)=>(
            <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:ev.selected?'rgba(79,142,247,.08)':'var(--bg3)',borderRadius:10,border:`1px solid ${ev.selected?'var(--a1)':'var(--border)'}` }}>
              <div onClick={()=>setImportPreview(p=>p?.map((x,j)=>j===i?{...x,selected:!x.selected}:x)||null)} style={{ width:20,height:20,borderRadius:5,border:`2px solid ${ev.selected?'var(--a1)':'var(--border2)'}`,background:ev.selected?'var(--a1)':'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>{ev.selected&&<span style={{ color:'#fff',fontSize:12 }}>✓</span>}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:12,fontWeight:500,color:'var(--txt1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{ev.title}</div>
                <div style={{ fontSize:10,color:'var(--txt2)' }}>{ev.date}{ev.time?` · ${ev.time}`:''}</div>
              </div>
              <select value={ev.type} onChange={e=>setImportPreview(p=>p?.map((x,j)=>j===i?{...x,type:e.target.value}:x)||null)} style={{ padding:'4px 6px',borderRadius:7,border:'1px solid var(--border2)',background:'var(--bg4)',color:'var(--txt1)',fontSize:10 }}>
                {EVENT_TYPE_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:14 }}>
          <Btn onClick={()=>setImportPreview(null)} variant="outline">Annuler</Btn>
          <Btn onClick={confirmImport} disabled={importing||!importPreview?.some(e=>e.selected)}>{importing?'…':`Importer (${importPreview?.filter(e=>e.selected).length||0})`}</Btn>
        </div>
      </Modal>

      <EventModal open={modal} onClose={()=>setModal(false)} sports={sports} onSave={addEvent} defaultDate={selectedDate||undefined} />
    </div>
  )
}

// ── MAIN EXPORT — switches based on screen ─────────────────
export default function CalendarPage(props: Props) {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileCalendar {...props} />
  return <DesktopCalendar {...props} />
}
