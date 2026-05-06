'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  sender_username?: string
}

interface TradeDetail {
  id: string
  initiator_id: string
  responder_id: string
  status: string
  initiator_sticker_number: number
  responder_sticker_number: number
  other_username: string
}

export default function TradePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [myId, setMyId] = useState('')
  const [trade, setTrade] = useState<TradeDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  // removed unused state
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: t } = await supabase.from('trades').select('*').eq('id', id).single()
      if (!t) { router.push('/trades'); return }

      const otherId = t.initiator_id === user.id ? t.responder_id : t.initiator_id
      const { data: otherProfile } = await supabase.from('profiles').select('username').eq('user_id', otherId).single()

      setTrade({ ...t, other_username: otherProfile?.username || 'Unknown' })

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('trade_id', id)
        .order('created_at', { ascending: true })

      // Enrich with usernames
      if (msgs) {
        const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))]
        const { data: profiles } = await supabase.from('profiles').select('user_id, username').in('user_id', senderIds)
        const pMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.username]))
        setMessages(msgs.map((m: any) => ({ ...m, sender_username: pMap[m.sender_id] || 'User' })))
      }
      setLoading(false)
    }
    init()

    // Realtime messages subscription
    const channel = supabase
      .channel(`trade-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `trade_id=eq.${id}` },
        async (payload) => {
          const m = payload.new as any
          const { data: p } = await supabase.from('profiles').select('username').eq('user_id', m.sender_id).single()
          setMessages(prev => [...prev, { ...m, sender_username: p?.username || 'User' }])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!msgText.trim() || !myId) return
    setSending(true)
    await supabase.from('messages').insert({ trade_id: id, sender_id: myId, content: msgText.trim() })
    setMsgText('')
    setSending(false)
  }

  const updateStatus = async (status: string) => {
    await supabase.from('trades').update({ status }).eq('id', id)
    setTrade(prev => prev ? { ...prev, status } : prev)
  }

  const updateStickerNum = async (isInitiator: boolean, num: number) => {
    const field = isInitiator ? 'initiator_sticker_number' : 'responder_sticker_number'
    await supabase.from('trades').update({ [field]: num }).eq('id', id)
    setTrade(prev => prev ? { ...prev, [field]: num } : prev)
  }

  const iAmInitiator = trade?.initiator_id === myId
  const statusVariant: Record<string, 'warning' | 'success' | 'default' | 'error'> = {
    pending: 'warning', accepted: 'success', completed: 'default', rejected: 'error'
  }

  return (
    <AppShell showNav={false}>
      {/* Back button */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/trades')} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
          ← 
        </button>
        <div className="flex-1">
          <p className="font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1.1rem' }}>
            Trade with {trade?.other_username || '...'}
          </p>
        </div>
        {trade && <Badge variant={statusVariant[trade.status] || 'default'}>{trade.status}</Badge>}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Trade details */}
          <div className="p-4 card mx-4 mt-4" style={{ borderTop: '4px solid var(--gold)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', marginBottom: '0.75rem' }}>STICKER EXCHANGE</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>You offer sticker #</p>
                <input
                  type="number"
                  placeholder="?"
                  value={iAmInitiator ? (trade?.initiator_sticker_number || '') : (trade?.responder_sticker_number || '')}
                  onChange={e => updateStickerNum(iAmInitiator, parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border-2 text-center font-bold"
                  style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)', fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}
                  disabled={trade?.status === 'completed' || trade?.status === 'rejected'}
                />
              </div>
              <div style={{ color: 'var(--gold)', fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>⇄</div>
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>They give sticker #</p>
                <div className="w-full px-3 py-2 rounded-xl border-2 text-center font-bold"
                  style={{ background: 'var(--border)', color: 'var(--text)', borderColor: 'var(--border)', fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                  {iAmInitiator ? (trade?.responder_sticker_number || '?') : (trade?.initiator_sticker_number || '?')}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {trade?.status === 'pending' && !iAmInitiator && (
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => updateStatus('accepted')}>✅ Accept</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => updateStatus('rejected')}>❌ Decline</Button>
              </div>
            )}
            {trade?.status === 'accepted' && (
              <Button variant="gold" size="sm" className="w-full mt-3" onClick={() => updateStatus('completed')}>
                🏆 Mark as Completed
              </Button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2" style={{ minHeight: '200px', maxHeight: '40vh' }}>
            {messages.length === 0 && (
              <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>No messages yet. Say hi! 👋</p>
            )}
            {messages.map(m => {
              const isMe = m.sender_id === myId
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{m.sender_username}</p>}
                  <div
                    className="px-4 py-2 rounded-2xl max-w-xs text-sm"
                    style={{
                      background: isMe ? 'var(--primary)' : 'var(--bg-card)',
                      color: isMe ? 'white' : 'var(--text)',
                      border: isMe ? 'none' : '1px solid var(--border)',
                      borderBottomRightRadius: isMe ? '4px' : '16px',
                      borderBottomLeftRadius: isMe ? '16px' : '4px',
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Message input */}
          {trade?.status !== 'completed' && trade?.status !== 'rejected' && (
            <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <input
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 rounded-xl border-2"
                style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)', fontFamily: 'var(--font-body)' }}
              />
              <Button variant="primary" size="sm" onClick={sendMessage} loading={sending} style={{ minWidth: '48px' }}>
                {sending ? '' : '→'}
              </Button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
