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

function generateICS(events: CalendarEvent[], sessions: Session[], sports: Sport[], mode: 'all'|'events'|'sessions') {
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AthleteOS//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:AthleteOS']
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

function downloadICS(content:string,filename:string){
  const blob=new Blob([content],{type:'text/calendar;charset=utf-8'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a');a.href=url;a.download=filename;a.click()
  URL.revokeObjectURL(url)
}

interface ParsedICSEvent {
  title: string
  date: string
  time: string|null
  type: string
  location: string
  selected: boolean
}

function parseICS(text:string): ParsedICSEvent[] {
  const events: ParsedICSEvent[] = []
  const blocks = text.split('BEGIN:VEVENT').slice(1)
  blocks.forEach(block => {
    const get = (key:string) => { const m=block.match(new RegExp(key+'[^:]*:([^\\r\\n]+)')); return m?.[1]?.trim()||'' }
    const summary = get('SUMMARY')
    const dtstart = get('DTSTART')
    const location = get('LOCATION')
    if (!summary||!dtstart) return
    let date='',time:string|null=null
    if (dtstart.includes('T')) {
      date=`${dtstart.slice(0,4)}-${dtstart.slice(4,6)}-${dtstart.slice(6,8)}`
      time=`${dtstart.slice(9,11)}:${dtstart.slice(11,13)}`
    } else {
      const d=dtstart.replace(/[^0-9]/g,'').slice(0,8)
      date=`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`
    }
    if (date) events.push({ title: summary.replace(/\\,/g,','), date, time, type:'training', location, selected:true })
  })
  return events
}

const EVENT_TYPE_OPTIONS = [
  {v:'training',l:'💪 Entraînement'},{v:'match',l:'🏅 Match'},{v:'tournament',l:'🏆 Tournoi'},
  {v:'competition',l:'🎯 Compétition'},{v:'objective',l:'🎪 Objectif'},{v:'spectator',l:'📺 Événement à suivre'},
]

export default function CalendarPage({ sports, events, sessions, addEvent, showToast, setEvents }:Props) {
  const now = new Date()
  const [cur,setCur]             = useState({y:now.getFullYear(),m:now.getMonth()})
  const [modal,setModal]         = useState(false)
  const [selectedDate,setSelectedDate] = useState<string|null>(null)
  const [activeTab,setActiveTab] = useState<'calendar'|'sync'>('calendar')
  const [exportMode,setExportMode] = useState<'all'|'events'|'sessions'>('all')
  // Multi-select
  const [selectedIds,setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode,setSelectMode] = useState(false)
  // Edit modal
  const [editingEvent,setEditingEvent] = useState<CalendarEvent|null>(null)
  const [editTitle,setEditTitle]   = useState('')
  const [editDate,setEditDate]     = useState('')
  const [editTime,setEditTime]     = useState('')
  const [editLocation,setEditLocation] = useState('')
  const [editType,setEditType]     = useState('training')
  const [saving,setSaving]         = useState(false)
  // ICS import preview
  const [importPreview,setImportPreview] = useState<ParsedICSEvent[]|null>(null)
  const [importing,setImporting]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const firstDay    = new Date(cur.y,cur.m,1).getDay()
  const daysInMonth = new Date(cur.y,cur.m+1,0).getDate()
  const offset      = firstDay===0?6:firstDay-1
  const today       = new Date().toISOString().slice(0,10)
  const upcoming    = events.filter(e=>e.event_date>=today).sort((a,b)=>a.event_date.localeCompare(b.event_date))

  function getDateStr(day:number){
    return `${cur.y}-${String(cur.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }
  function navMonth(dir:number){
    setCur(c=>{let m=c.m+dir,y=c.y;if(m<0){m=11;y--}if(m>11){m=0;y++}return{y,m}})
  }

  // ── Multi-select ─────────────────────────────────────
  function toggleSelect(id:string){
    setSelectedIds(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})
  }
  function selectAll(){
    setSelectedIds(new Set(upcoming.map(e=>e.id)))
  }
  function clearSelection(){
    setSelectedIds(new Set());setSelectMode(false)
  }

  async function deleteSelected(){
    if (!confirm(`Supprimer ${selectedIds.size} événement${selectedIds.size>1?'s':''} ?`)) return
    const {supabase} = await import('@/lib/supabase')
    const ids = Array.from(selectedIds)
    const {error} = await supabase.from('calendar_events').delete().in('id',ids)
    if (!error){
      setEvents(events.filter(e=>!selectedIds.has(e.id)))
      showToast(`${ids.length} événement${ids.length>1?'s':''} supprimé${ids.length>1?'s':''}`)
      clearSelection()
    } else showToast(error.message,'error')
  }

  async function bulkChangeType(type:string){
    const {supabase} = await import('@/lib/supabase')
    const ids = Array.from(selectedIds)
    const {error} = await supabase.from('calendar_events').update({type:type as any}).in('id',ids)
    if (!error){
      setEvents(events.map(e=>selectedIds.has(e.id)?{...e,type:type as any}:e))
      showToast(`Type modifié pour ${ids.length} événement${ids.length>1?'s':''}`)
      clearSelection()
    } else showToast(error.message,'error')
  }

  // ── Edit single event ────────────────────────────────
  function openEdit(ev:CalendarEvent,e:React.MouseEvent){
    e.stopPropagation()
    setEditingEvent(ev);setEditTitle(ev.title);setEditDate(ev.event_date)
    setEditTime(ev.event_time||'');setEditLocation(ev.location||'');setEditType(ev.type)
  }

  async function saveEdit(){
    if(!editingEvent)return
    setSaving(true)
    const {supabase} = await import('@/lib/supabase')
    const {error} = await supabase.from('calendar_events').update({
      title:editTitle,event_date:editDate,event_time:editTime||null,
      location:editLocation||null,type:editType as any,
    }).eq('id',editingEvent.id)
    if(!error){
      setEvents(events.map(e=>e.id===editingEvent.id?{...e,title:editTitle,event_date:editDate,event_time:editTime||null,location:editLocation||null,type:editType as any}:e))
      showToast('Événement modifié ✅')
    } else showToast(error.message,'error')
    setSaving(false);setEditingEvent(null)
  }

  async function deleteSingle(ev:CalendarEvent,e:React.MouseEvent){
    e.stopPropagation()
    if(!confirm(`Supprimer "${ev.title}" ?`))return
    const {supabase} = await import('@/lib/supabase')
    const {error} = await supabase.from('calendar_events').delete().eq('id',ev.id)
    if(!error){setEvents(events.filter(x=>x.id!==ev.id));showToast('Événement supprimé')}
    else showToast(error.message,'error')
  }

  // ── ICS Import with preview ──────────────────────────
  async function handleFileSelect(file:File){
    const text = await file.text()
    const parsed = parseICS(text)
    if(parsed.length===0){showToast('Aucun événement trouvé dans ce fichier','error');return}
    setImportPreview(parsed)
  }

  async function confirmImport(){
    if(!importPreview)return
    setImporting(true)
    const toImport = importPreview.filter(e=>e.selected)
    let count=0
    for(const ev of toImport){
      await addEvent({type:ev.type as any,title:ev.title,event_date:ev.date,event_time:ev.time,location:ev.location||null})
      count++
    }
    setImporting(false);setImportPreview(null)
    showToast(`${count} événement${count>1?'s':''} importé${count>1?'s':''}! 📅`)
  }

  function handleExport(){
    const content=generateICS(events,sessions,sports,exportMode)
    const names={all:'athleteos-complet',events:'athleteos-evenements',sessions:'athleteos-seances'}
    downloadICS(content,`${names[exportMode]}.ics`)
    showToast('Fichier .ics téléchargé ! 📅')
  }

  const tabBtn=(id:'calendar'|'sync',label:string,icon:string)=>(
    <button onClick={()=>setActiveTab(id)} style={{
      padding:'8px 18px',borderRadius:9,border:'none',cursor:'pointer',
      background:activeTab===id?'var(--a1)':'transparent',
      color:activeTab===id?'#fff':'var(--txt2)',
      fontFamily:'DM Sans, sans-serif',fontSize:13,fontWeight:activeTab===id?600:400,
      display:'flex',alignItems:'center',gap:6,transition:'all .15s',
    }}>{icon} {label}</button>
  )

  return (
    <div>
      <Topbar title="Calendrier Sportif" subtitle="Entraînements, matchs, compétitions & événements à suivre"
        action={{label:'Ajouter événement',fn:()=>{setSelectedDate(null);setModal(true)}}} />
      <div style={{padding:'0 28px 28px'}}>

        <div style={{display:'flex',gap:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:4,marginBottom:16,width:'fit-content'}}>
          {tabBtn('calendar','Calendrier','📅')}
          {tabBtn('sync','Sync & Export','🔄')}
        </div>

        {activeTab==='calendar' && (
          <>
            {/* Legend */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
              {Object.entries(EVENT_TYPE_CONFIG).map(([id,cfg])=>(
                <div key={id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:20,background:cfg.color+'15',border:`1px solid ${cfg.color}30`,fontSize:12}}>
                  <span style={{fontSize:14}}>{cfg.icon}</span>
                  <span style={{color:cfg.color,fontWeight:500}}>{cfg.label}</span>
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <Card style={{marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                <button onClick={()=>navMonth(-1)} style={{padding:'7px 14px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg3)',color:'var(--txt1)',cursor:'pointer',fontSize:14}}>←</button>
                <span style={{fontFamily:'Syne, sans-serif',fontWeight:700,fontSize:17,color:'var(--txt1)'}}>{MONTHS[cur.m]} {cur.y}</span>
                <button onClick={()=>navMonth(1)} style={{padding:'7px 14px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg3)',color:'var(--txt1)',cursor:'pointer',fontSize:14}}>→</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:4}}>
                {DAYS.map(d=><div key={d} style={{textAlign:'center',fontSize:11,color:'var(--txt3)',fontWeight:600,padding:'4px 0',letterSpacing:'.5px'}}>{d}</div>)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                {Array.from({length:offset}).map((_,i)=><div key={`e${i}`} style={{minHeight:88}}/>)}
                {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
                  const ds=getDateStr(day)
                  const dayEvents=events.filter(e=>e.event_date===ds)
                  const isToday=ds===today
                  return(
                    <div key={day} onClick={()=>{setSelectedDate(ds);setModal(true)}} style={{
                      minHeight:88,background:isToday?'rgba(79,142,247,.1)':'var(--bg3)',
                      borderRadius:9,border:`1px solid ${isToday?'var(--a1)':'var(--border)'}`,
                      padding:'7px 5px',cursor:'pointer',transition:'all .15s',
                    }}>
                      <div style={{fontSize:12,fontWeight:isToday?700:400,color:isToday?'var(--a1)':'var(--txt2)',marginBottom:4}}>{day}</div>
                      {dayEvents.map(ev=>{
                        const cfg=EVENT_TYPE_CONFIG[ev.type]
                        const sport=sports.find(s=>s.id===ev.sport_id)
                        const displayIcon=ev.type==='spectator'?cfg.icon:(sport?.icon||cfg.icon)
                        return(
                          <div key={ev.id} style={{fontSize:9,padding:'2px 4px',borderRadius:3,background:cfg.color+'25',color:cfg.color,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontWeight:500,display:'flex',alignItems:'center',gap:2}}>
                            <span>{displayIcon}</span><span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{ev.title}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Upcoming with multi-select */}
            <Card>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
                <div style={{fontFamily:'Syne, sans-serif',fontWeight:700,fontSize:15,color:'var(--txt1)'}}>Événements à venir ({upcoming.length})</div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {!selectMode ? (
                    <Btn onClick={()=>setSelectMode(true)} variant="outline" style={{fontSize:12}}>☑️ Sélectionner</Btn>
                  ) : (
                    <>
                      <span style={{fontSize:12,color:'var(--txt2)'}}>{selectedIds.size} sélectionné{selectedIds.size>1?'s':''}</span>
                      <Btn onClick={selectAll} variant="outline" style={{fontSize:11}}>Tout sélectionner</Btn>
                      {selectedIds.size>0 && (
                        <>
                          <select onChange={e=>{if(e.target.value)bulkChangeType(e.target.value)}} defaultValue="" style={{padding:'7px 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg3)',color:'var(--txt1)',fontSize:12,fontFamily:'DM Sans,sans-serif',cursor:'pointer'}}>
                            <option value="" disabled>Changer le type…</option>
                            {EVENT_TYPE_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                          <button onClick={deleteSelected} style={{padding:'7px 12px',borderRadius:8,border:'1px solid rgba(244,63,94,.3)',background:'rgba(244,63,94,.1)',color:'var(--a5)',fontSize:12,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
                            🗑️ Supprimer ({selectedIds.size})
                          </button>
                        </>
                      )}
                      <Btn onClick={clearSelection} variant="ghost" style={{fontSize:11}}>Annuler</Btn>
                    </>
                  )}
                </div>
              </div>

              {upcoming.length===0 ? (
                <div style={{textAlign:'center',padding:'20px 0',color:'var(--txt3)',fontSize:13}}>Aucun événement planifié</div>
              ) : upcoming.map(ev=>{
                const cfg=EVENT_TYPE_CONFIG[ev.type]
                const sport=sports.find(s=>s.id===ev.sport_id)
                const displayIcon=ev.type==='spectator'?cfg.icon:(sport?.icon||cfg.icon)
                const isSelected=selectedIds.has(ev.id)
                return(
                  <div key={ev.id} onClick={()=>selectMode&&toggleSelect(ev.id)} style={{
                    display:'flex',alignItems:'center',gap:14,padding:'12px 14px',
                    background:isSelected?'rgba(79,142,247,.1)':'var(--bg3)',
                    borderRadius:12,border:`1px solid ${isSelected?'var(--a1)':'var(--border)'}`,
                    marginBottom:8,cursor:selectMode?'pointer':'default',transition:'all .15s',
                  }}>
                    {selectMode && (
                      <div onClick={e=>{e.stopPropagation();toggleSelect(ev.id)}} style={{
                        width:20,height:20,borderRadius:5,border:`2px solid ${isSelected?'var(--a1)':'var(--border2)'}`,
                        background:isSelected?'var(--a1)':'transparent',flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .15s',
                      }}>{isSelected&&<span style={{color:'#fff',fontSize:12,fontWeight:700}}>✓</span>}</div>
                    )}
                    <div style={{width:42,height:42,borderRadius:10,background:cfg.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{displayIcon}</div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:3}}>
                        <span style={{fontSize:14,fontWeight:600,color:'var(--txt1)'}}>{ev.title}</span>
                        <Pill color={cfg.color}>{cfg.label}</Pill>
                        {ev.broadcast&&<Pill color="var(--a6)">📡 {ev.broadcast}</Pill>}
                      </div>
                      <div style={{fontSize:11,color:'var(--txt2)'}}>
                        📅 {ev.event_date}{ev.event_time?` · ⏰ ${ev.event_time}`:''}{ev.location?` · 📍 ${ev.location}`:''}
                      </div>
                    </div>
                    {!selectMode&&(
                      <div style={{display:'flex',gap:6,flexShrink:0}}>
                        <button onClick={e=>openEdit(ev,e)} title="Modifier" style={{width:32,height:32,borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg4)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>✏️</button>
                        <button onClick={e=>deleteSingle(ev,e)} title="Supprimer" style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(244,63,94,.25)',background:'rgba(244,63,94,.08)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>🗑️</button>
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
            {/* Import */}
            <Card style={{marginBottom:16}}>
              <CardTitle>📥 Importer un calendrier (.ics)</CardTitle>
              <div style={{fontSize:13,color:'var(--txt2)',marginBottom:14,lineHeight:1.7}}>
                Importe depuis Google Calendar, Apple Calendar ou Outlook. Tu pourras <strong style={{color:'var(--txt1)'}}>choisir le type de chaque événement</strong> avant de confirmer.
              </div>
              <input ref={fileRef} type="file" accept=".ics" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFileSelect(f)}} />
              <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                <Btn onClick={()=>fileRef.current?.click()}>📂 Choisir un fichier .ics</Btn>
                <span style={{fontSize:12,color:'var(--txt3)'}}>Tu pourras prévisualiser avant d'importer</span>
              </div>
              <div style={{marginTop:14,padding:'10px 14px',background:'rgba(79,142,247,.08)',border:'1px solid rgba(79,142,247,.2)',borderRadius:10,fontSize:12,color:'var(--a1)'}}>
                💡 Pour exporter depuis Google Calendar : Paramètres → Importer & Exporter → Exporter
              </div>
            </Card>

            {/* Export */}
            <Card style={{marginBottom:16}}>
              <CardTitle>📤 Exporter vers un calendrier (.ics)</CardTitle>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
                {[
                  {id:'all' as const,icon:'📦',label:'Tout exporter',desc:`${events.length} événements + ${sessions.length} séances`},
                  {id:'events' as const,icon:'📅',label:'Événements',desc:`${events.length} événements planifiés`},
                  {id:'sessions' as const,icon:'💪',label:'Séances',desc:`${sessions.length} séances enregistrées`},
                ].map(opt=>(
                  <div key={opt.id} onClick={()=>setExportMode(opt.id)} style={{padding:'14px 16px',borderRadius:12,cursor:'pointer',transition:'all .15s',border:`1px solid ${exportMode===opt.id?'var(--a1)':'var(--border)'}`,background:exportMode===opt.id?'rgba(79,142,247,0.08)':'var(--bg3)'}}>
                    <div style={{fontSize:24,marginBottom:8}}>{opt.icon}</div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--txt1)',marginBottom:3}}>{opt.label}</div>
                    <div style={{fontSize:11,color:'var(--txt2)'}}>{opt.desc}</div>
                  </div>
                ))}
              </div>
              <Btn onClick={handleExport}>⬇️ Télécharger le fichier .ics</Btn>
            </Card>

            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
              {[
                {name:'Google Calendar',icon:'🗓️',color:'#4285f4',steps:['Télécharge le fichier .ics','Ouvre Google Calendar','⚙️ → Paramètres','Importer & Exporter → Importer','Sélectionne le fichier .ics'],url:'https://calendar.google.com',urlLabel:'Ouvrir Google Calendar'},
                {name:'Apple Calendar',icon:'🍎',color:'#ff3b30',steps:['Télécharge le fichier .ics','Double-clique sur le fichier','Apple Calendar s\'ouvre automatiquement','Clique "Importer"'],url:null,urlLabel:null},
                {name:'Outlook',icon:'📧',color:'#0078d4',steps:['Télécharge le fichier .ics','Ouvre Outlook','Fichier → Ouvrir et exporter','Importer/Exporter → Importer iCalendar','Sélectionne le fichier .ics'],url:'https://outlook.live.com/calendar',urlLabel:'Ouvrir Outlook'},
              ].map(app=>(
                <Card key={app.name}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                    <div style={{width:38,height:38,borderRadius:10,background:app.color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{app.icon}</div>
                    <span style={{fontFamily:'Syne, sans-serif',fontWeight:700,fontSize:14,color:'var(--txt1)'}}>{app.name}</span>
                  </div>
                  <ol style={{paddingLeft:18,fontSize:12,color:'var(--txt2)',lineHeight:2}}>
                    {app.steps.map((step,i)=><li key={i}>{step}</li>)}
                  </ol>
                  {app.url&&<a href={app.url} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:12,fontSize:12,color:app.color,textDecoration:'none'}}>→ {app.urlLabel}</a>}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={!!editingEvent} onClose={()=>setEditingEvent(null)} title="✏️ Modifier l'événement">
        <Select label="Type" value={editType} onChange={e=>setEditType(e.target.value)}>
          {EVENT_TYPE_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </Select>
        <Input label="Titre" value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Input label="Date" type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} />
          <Input label="Heure" type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} />
        </div>
        <Input label="Lieu (optionnel)" value={editLocation} onChange={e=>setEditLocation(e.target.value)} />
        <ModalActions onCancel={()=>setEditingEvent(null)} onConfirm={saveEdit} loading={saving} confirmLabel="Enregistrer" />
      </Modal>

      {/* ICS Import preview modal */}
      <Modal open={!!importPreview} onClose={()=>setImportPreview(null)} title="📥 Aperçu de l'importation">
        <div style={{fontSize:13,color:'var(--txt2)',marginBottom:14}}>
          {importPreview?.length} événement{(importPreview?.length||0)>1?'s':''} trouvé{(importPreview?.length||0)>1?'s':''}. Choisis le type pour chacun et sélectionne ceux à importer.
        </div>
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          <button onClick={()=>setImportPreview(p=>p?.map(e=>({...e,selected:true}))||null)} style={{padding:'5px 12px',borderRadius:7,border:'1px solid var(--border2)',background:'var(--bg3)',color:'var(--txt1)',fontSize:11,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Tout sélectionner</button>
          <button onClick={()=>setImportPreview(p=>p?.map(e=>({...e,selected:false}))||null)} style={{padding:'5px 12px',borderRadius:7,border:'1px solid var(--border2)',background:'var(--bg3)',color:'var(--txt2)',fontSize:11,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Tout désélectionner</button>
        </div>
        <div style={{maxHeight:360,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
          {importPreview?.map((ev,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',background:ev.selected?'rgba(79,142,247,.08)':'var(--bg3)',borderRadius:10,border:`1px solid ${ev.selected?'var(--a1)':'var(--border)'}`,transition:'all .15s'}}>
              <div onClick={()=>setImportPreview(p=>p?.map((e,j)=>j===i?{...e,selected:!e.selected}:e)||null)} style={{width:20,height:20,borderRadius:5,border:`2px solid ${ev.selected?'var(--a1)':'var(--border2)'}`,background:ev.selected?'var(--a1)':'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                {ev.selected&&<span style={{color:'#fff',fontSize:12,fontWeight:700}}>✓</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'var(--txt1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ev.title}</div>
                <div style={{fontSize:11,color:'var(--txt2)'}}>{ev.date}{ev.time?` · ${ev.time}`:''}</div>
              </div>
              <select value={ev.type} onChange={e=>setImportPreview(p=>p?.map((x,j)=>j===i?{...x,type:e.target.value}:x)||null)}
                style={{padding:'5px 8px',borderRadius:7,border:'1px solid var(--border2)',background:'var(--bg4)',color:'var(--txt1)',fontSize:11,fontFamily:'DM Sans,sans-serif',cursor:'pointer',flexShrink:0}}>
                {EVENT_TYPE_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16}}>
          <Btn onClick={()=>setImportPreview(null)} variant="outline">Annuler</Btn>
          <Btn onClick={confirmImport} disabled={importing||!importPreview?.some(e=>e.selected)}>
            {importing?'Import en cours…':`Importer ${importPreview?.filter(e=>e.selected).length||0} événement${(importPreview?.filter(e=>e.selected).length||0)>1?'s':''}`}
          </Btn>
        </div>
      </Modal>

      <EventModal open={modal} onClose={()=>setModal(false)} sports={sports} onSave={addEvent} defaultDate={selectedDate||undefined} />
    </div>
  )
}
