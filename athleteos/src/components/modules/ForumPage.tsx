'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle, Topbar, Pill, Btn, Modal, ModalActions, Input, Select, Textarea } from '@/components/ui'
import type { Sport, Profile } from '@/types'

interface Props {
  sports: Sport[]
  profile: Profile | null
  showToast: (msg: string, type?: 'success' | 'error') => void
  [key: string]: unknown
}

interface ForumPost {
  id: string
  user_id: string
  sport: string
  title: string
  content: string
  post_type: 'question'|'discussion'|'tip'
  likes_count: number
  replies_count: number
  created_at: string
  author?: { full_name: string|null; username: string|null; avatar_url: string|null }
  liked?: boolean
}

interface ForumReply {
  id: string
  post_id: string
  user_id: string
  content: string
  likes_count: number
  created_at: string
  author?: { full_name: string|null; username: string|null; avatar_url: string|null }
  liked?: boolean
}

const POST_TYPES = [
  { id: 'question', label: '❓ Question', color: '#4f8ef7' },
  { id: 'discussion', label: '💬 Discussion', color: '#a855f7' },
  { id: 'tip', label: '💡 Astuce', color: '#22d3a0' },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
}

function AuthorBadge({ author, date }: { author?: ForumPost['author']; date: string }) {
  const name = author?.full_name || author?.username || 'Athlète'
  const initials = name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      {author?.avatar_url ? (
        <img src={author.avatar_url} alt={name} style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover' }} />
      ) : (
        <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,var(--a1),var(--a2))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>{initials}</div>
      )}
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--txt1)' }}>{name}</div>
        <div style={{ fontSize:10, color:'var(--txt3)' }}>{timeAgo(date)}</div>
      </div>
    </div>
  )
}

export default function ForumPage({ sports, profile, showToast }: Props) {
  const [selectedSport, setSelectedSport] = useState<string>('all')
  const [posts, setPosts]         = useState<ForumPost[]>([])
  const [loading, setLoading]     = useState(true)
  const [newPostModal, setNewPostModal] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [search, setSearch]       = useState('')
  // New post form
  const [npSport, setNpSport]     = useState(sports[0]?.label || '')
  const [npType, setNpType]       = useState<'question'|'discussion'|'tip'>('question')
  const [npTitle, setNpTitle]     = useState('')
  const [npContent, setNpContent] = useState('')
  const [saving, setSaving]       = useState(false)
  // Detail view
  const [selectedPost, setSelectedPost] = useState<ForumPost|null>(null)
  const [replies, setReplies]     = useState<ForumReply[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [replySaving, setReplySaving] = useState(false)
  const [userId, setUserId]       = useState<string|null>(null)

  const ALL_SPORTS = sports.map(s => s.label)

  useEffect(() => {
    supabase.auth.getUser().then(({data:{user}}) => setUserId(user?.id||null))
    loadPosts()
  }, [])

  async function loadPosts() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: postsData, error } = await supabase
      .from('forum_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { showToast(error.message, 'error'); setLoading(false); return }

    // fetch authors
    const userIds = [...new Set((postsData||[]).map(p=>p.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('id,full_name,username,avatar_url').in('id', userIds.length?userIds:['00000000-0000-0000-0000-000000000000'])
    const profileMap: Record<string,any> = {}
    ;(profiles||[]).forEach(p => profileMap[p.id] = p)

    // fetch user likes
    let likedPostIds: Set<string> = new Set()
    if (user) {
      const { data: likes } = await supabase.from('forum_likes').select('post_id').eq('user_id', user.id).not('post_id','is',null)
      likedPostIds = new Set((likes||[]).map(l=>l.post_id))
    }

    const enriched = (postsData||[]).map(p => ({
      ...p,
      author: profileMap[p.user_id],
      liked: likedPostIds.has(p.id),
    }))
    setPosts(enriched as ForumPost[])
    setLoading(false)
  }

  async function loadReplies(postId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: repliesData } = await supabase.from('forum_replies').select('*').eq('post_id', postId).order('created_at', { ascending: true })

    const userIds = [...new Set((repliesData||[]).map(r=>r.user_id))]
    const { data: profilesData } = await supabase.from('profiles').select('id,full_name,username,avatar_url').in('id', userIds.length?userIds:['00000000-0000-0000-0000-000000000000'])
    const profileMap: Record<string,any> = {}
    ;(profilesData||[]).forEach(p => profileMap[p.id] = p)

    let likedReplyIds: Set<string> = new Set()
    if (user) {
      const { data: likes } = await supabase.from('forum_likes').select('reply_id').eq('user_id', user.id).not('reply_id','is',null)
      likedReplyIds = new Set((likes||[]).map(l=>l.reply_id))
    }

    const enriched = (repliesData||[]).map(r => ({ ...r, author: profileMap[r.user_id], liked: likedReplyIds.has(r.id) }))
    setReplies(enriched as ForumReply[])
  }

  async function createPost() {
    if (!npTitle || !npContent || !npSport) { showToast('Remplis tous les champs', 'error'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('forum_posts').insert({
      user_id: user.id, sport: npSport, title: npTitle, content: npContent, post_type: npType,
    }).select().single()
    if (error) { showToast(error.message, 'error'); setSaving(false); return }
    showToast('Publication créée ! 🎉')
    setNewPostModal(false)
    setNpTitle(''); setNpContent('')
    setSaving(false)
    loadPosts()
  }

  async function toggleLikePost(post: ForumPost) {
    if (!userId) return
    if (post.liked) {
      await supabase.from('forum_likes').delete().eq('user_id', userId).eq('post_id', post.id)
    } else {
      await supabase.from('forum_likes').insert({ user_id: userId, post_id: post.id })
    }
    setPosts(posts.map(p => p.id===post.id ? { ...p, liked: !p.liked, likes_count: p.liked ? p.likes_count-1 : p.likes_count+1 } : p))
    if (selectedPost?.id === post.id) setSelectedPost({ ...post, liked: !post.liked, likes_count: post.liked ? post.likes_count-1 : post.likes_count+1 })
  }

  async function toggleLikeReply(reply: ForumReply) {
    if (!userId) return
    if (reply.liked) {
      await supabase.from('forum_likes').delete().eq('user_id', userId).eq('reply_id', reply.id)
    } else {
      await supabase.from('forum_likes').insert({ user_id: userId, reply_id: reply.id })
    }
    setReplies(replies.map(r => r.id===reply.id ? { ...r, liked: !r.liked, likes_count: r.liked ? r.likes_count-1 : r.likes_count+1 } : r))
  }

  async function postReply() {
    if (!replyContent.trim() || !selectedPost) return
    setReplySaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('forum_replies').insert({
      post_id: selectedPost.id, user_id: user.id, content: replyContent,
    })
    if (error) { showToast(error.message, 'error'); setReplySaving(false); return }
    setReplyContent('')
    await loadReplies(selectedPost.id)
    setPosts(posts.map(p => p.id===selectedPost.id ? { ...p, replies_count: p.replies_count+1 } : p))
    setSelectedPost({ ...selectedPost, replies_count: selectedPost.replies_count+1 })
    setReplySaving(false)
  }

  async function deletePost(post: ForumPost, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Supprimer cette publication ?')) return
    const { error } = await supabase.from('forum_posts').delete().eq('id', post.id)
    if (!error) { setPosts(posts.filter(p=>p.id!==post.id)); showToast('Publication supprimée'); if(selectedPost?.id===post.id) setSelectedPost(null) }
  }

  async function deleteReply(reply: ForumReply) {
    if (!confirm('Supprimer cette réponse ?')) return
    const { error } = await supabase.from('forum_replies').delete().eq('id', reply.id)
    if (!error) {
      setReplies(replies.filter(r=>r.id!==reply.id))
      if (selectedPost) setPosts(posts.map(p => p.id===selectedPost.id ? { ...p, replies_count: Math.max(0,p.replies_count-1) } : p))
      showToast('Réponse supprimée')
    }
  }

  const filtered = posts.filter(p => {
    const matchSport = selectedSport==='all' || p.sport===selectedSport
    const matchType = filterType==='all' || p.post_type===filterType
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.content.toLowerCase().includes(search.toLowerCase())
    return matchSport && matchType && matchSearch
  })

  return (
    <div>
      <Topbar title="Forum" subtitle="Questions, discussions et astuces entre athlètes" action={{ label: 'Nouvelle publication', fn: () => { setNpSport(selectedSport!=='all'?selectedSport:sports[0]?.label||''); setNewPostModal(true) } }} />
      <div style={{ padding: '0 28px 28px' }}>

        {/* Sport filter */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
          <button onClick={()=>setSelectedSport('all')} style={{
            padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:12,
            border:`1px solid ${selectedSport==='all'?'var(--a1)':'var(--border2)'}`,
            background:selectedSport==='all'?'rgba(79,142,247,.12)':'var(--bg3)',
            color:selectedSport==='all'?'var(--a1)':'var(--txt2)', fontFamily:'DM Sans, sans-serif',
          }}>🌐 Tous les sports</button>
          {sports.map(s=>(
            <button key={s.id} onClick={()=>setSelectedSport(s.label)} style={{
              padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:12,
              border:`1px solid ${selectedSport===s.label?'var(--a1)':'var(--border2)'}`,
              background:selectedSport===s.label?'rgba(79,142,247,.12)':'var(--bg3)',
              color:selectedSport===s.label?'var(--a1)':'var(--txt2)', fontFamily:'DM Sans, sans-serif',
              display:'flex', alignItems:'center', gap:5,
            }}>{s.icon} {s.label}</button>
          ))}
        </div>

        {/* Type filter + search */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ display:'flex', gap:4, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:3 }}>
            <button onClick={()=>setFilterType('all')} style={{ padding:'6px 12px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, background:filterType==='all'?'var(--bg4)':'transparent', color:filterType==='all'?'var(--txt1)':'var(--txt2)', fontFamily:'DM Sans, sans-serif' }}>Tout</button>
            {POST_TYPES.map(t=>(
              <button key={t.id} onClick={()=>setFilterType(t.id)} style={{ padding:'6px 12px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, background:filterType===t.id?'var(--bg4)':'transparent', color:filterType===t.id?'var(--txt1)':'var(--txt2)', fontFamily:'DM Sans, sans-serif' }}>{t.label}</button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher dans le forum…" style={{ flex:1, minWidth:200, padding:'8px 14px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:9, color:'var(--txt1)', fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none' }} />
        </div>

        {/* Posts list */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--txt3)' }}>Chargement…</div>
        ) : filtered.length===0 ? (
          <Card style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
            <div style={{ fontSize:15, color:'var(--txt1)', marginBottom:8 }}>Aucune publication</div>
            <div style={{ fontSize:13, color:'var(--txt2)', marginBottom:20 }}>Sois le premier à poser une question ou partager une astuce !</div>
            <Btn onClick={()=>setNewPostModal(true)}>+ Nouvelle publication</Btn>
          </Card>
        ) : filtered.map(post => {
          const typeCfg = POST_TYPES.find(t=>t.id===post.post_type)!
          const sportIcon = sports.find(s=>s.label===post.sport)?.icon || '🏅'
          return (
            <div key={post.id} onClick={()=>{setSelectedPost(post);loadReplies(post.id)}} style={{
              background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px', marginBottom:10, cursor:'pointer', transition:'all .15s',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <Pill color={typeCfg.color}>{typeCfg.label}</Pill>
                  <Pill color="var(--a6)">{sportIcon} {post.sport}</Pill>
                </div>
                {post.user_id===userId && (
                  <button onClick={e=>deletePost(post,e)} title="Supprimer" style={{ background:'none', border:'none', color:'var(--txt3)', cursor:'pointer', fontSize:13, padding:2 }}>🗑️</button>
                )}
              </div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--txt1)', marginBottom:6, fontFamily:'Syne, sans-serif' }}>{post.title}</div>
              <div style={{ fontSize:13, color:'var(--txt2)', lineHeight:1.6, marginBottom:12, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any, overflow:'hidden' }}>{post.content}</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <AuthorBadge author={post.author} date={post.created_at} />
                <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                  <button onClick={e=>{e.stopPropagation();toggleLikePost(post)}} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, color:post.liked?'var(--a5)':'var(--txt3)', fontFamily:'DM Sans, sans-serif' }}>
                    {post.liked?'❤️':'🤍'} {post.likes_count}
                  </button>
                  <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--txt3)' }}>
                    💬 {post.replies_count}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* New post modal */}
      <Modal open={newPostModal} onClose={()=>setNewPostModal(false)} title="✏️ Nouvelle publication">
        <Select label="Sport" value={npSport} onChange={e=>setNpSport(e.target.value)}>
          {sports.map(s=><option key={s.id} value={s.label}>{s.icon} {s.label}</option>)}
        </Select>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:'var(--txt2)', display:'block', marginBottom:6 }}>Type de publication</label>
          <div style={{ display:'flex', gap:8 }}>
            {POST_TYPES.map(t=>(
              <button key={t.id} onClick={()=>setNpType(t.id as any)} style={{
                flex:1, padding:'9px 0', borderRadius:9, cursor:'pointer', fontSize:12, fontFamily:'DM Sans, sans-serif',
                border:`1px solid ${npType===t.id?t.color:'var(--border2)'}`,
                background:npType===t.id?t.color+'15':'var(--bg3)',
                color:npType===t.id?t.color:'var(--txt2)',
              }}>{t.label}</button>
            ))}
          </div>
        </div>
        <Input label="Titre" value={npTitle} onChange={e=>setNpTitle(e.target.value)} placeholder="Ex: Comment progresser au squat ?" />
        <Textarea label="Contenu" value={npContent} onChange={e=>setNpContent(e.target.value)} placeholder="Détaille ta question, ton astuce ou lance la discussion…" />
        <ModalActions onCancel={()=>setNewPostModal(false)} onConfirm={createPost} loading={saving} confirmLabel="Publier" />
      </Modal>

      {/* Post detail modal */}
      {selectedPost && (() => {
        const typeCfg = POST_TYPES.find(t=>t.id===selectedPost.post_type)!
        const sportIcon = sports.find(s=>s.label===selectedPost.sport)?.icon || '🏅'
        return (
          <Modal open={!!selectedPost} onClose={()=>setSelectedPost(null)} title="💬 Discussion">
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:10 }}>
              <Pill color={typeCfg.color}>{typeCfg.label}</Pill>
              <Pill color="var(--a6)">{sportIcon} {selectedPost.sport}</Pill>
            </div>
            <div style={{ fontSize:17, fontWeight:700, color:'var(--txt1)', marginBottom:10, fontFamily:'Syne, sans-serif' }}>{selectedPost.title}</div>
            <div style={{ marginBottom:10 }}><AuthorBadge author={selectedPost.author} date={selectedPost.created_at} /></div>
            <div style={{ fontSize:13, color:'var(--txt2)', lineHeight:1.7, marginBottom:14, whiteSpace:'pre-line' }}>{selectedPost.content}</div>
            <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:18, paddingBottom:14, borderBottom:'1px solid var(--border)' }}>
              <button onClick={()=>toggleLikePost(selectedPost)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:13, color:selectedPost.liked?'var(--a5)':'var(--txt3)', fontFamily:'DM Sans, sans-serif' }}>
                {selectedPost.liked?'❤️':'🤍'} {selectedPost.likes_count} J'aime
              </button>
              <div style={{ fontSize:13, color:'var(--txt3)' }}>💬 {selectedPost.replies_count} réponse{selectedPost.replies_count>1?'s':''}</div>
            </div>

            {/* Replies */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16, maxHeight:300, overflowY:'auto' }}>
              {replies.length===0 ? (
                <div style={{ textAlign:'center', color:'var(--txt3)', fontSize:12, padding:'10px 0' }}>Aucune réponse encore — sois le premier à répondre !</div>
              ) : replies.map(reply => (
                <div key={reply.id} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <AuthorBadge author={reply.author} date={reply.created_at} />
                    {reply.user_id===userId && (
                      <button onClick={()=>deleteReply(reply)} style={{ background:'none', border:'none', color:'var(--txt3)', cursor:'pointer', fontSize:12 }}>🗑️</button>
                    )}
                  </div>
                  <div style={{ fontSize:13, color:'var(--txt2)', lineHeight:1.6, marginBottom:6, whiteSpace:'pre-line' }}>{reply.content}</div>
                  <button onClick={()=>toggleLikeReply(reply)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:11, color:reply.liked?'var(--a5)':'var(--txt3)', fontFamily:'DM Sans, sans-serif' }}>
                    {reply.liked?'❤️':'🤍'} {reply.likes_count}
                  </button>
                </div>
              ))}
            </div>

            {/* Reply input */}
            <div style={{ display:'flex', gap:8 }}>
              <input value={replyContent} onChange={e=>setReplyContent(e.target.value)} onKeyDown={e=>e.key==='Enter'&&postReply()} placeholder="Écris une réponse…" style={{ flex:1, padding:'10px 14px', borderRadius:9, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--txt1)', fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none' }} />
              <Btn onClick={postReply} disabled={replySaving||!replyContent.trim()}>{replySaving?'…':'Répondre'}</Btn>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
