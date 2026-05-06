'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { DirectMessage } from '@/lib/types'

export default function ConversationPage() {
  const { userId: otherUserId } = useParams<{ userId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [myId, setMyId] = useState('')
  const [otherUsername, setOtherUsername] = useState('...')
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      // Fetch the other user's profile
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', otherUserId)
        .single()
      setOtherUsername(otherProfile?.username || 'User')

      // Fetch conversation history
      // Requires the direct_messages table (see SQL migration in lib/types.ts)
      const { data: msgs, error } = await supabase
        .from('direct_messages')
        .select('id, sender_id, receiver_id, content, created_at, read')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })

      if (error) {
        setTableError(true)
        setLoading(false)
        return
      }

      setMessages(msgs || [])

      // Mark all unread messages from other user as read
      const unreadIds = (msgs || [])
        .filter((m: DirectMessage) => m.receiver_id === user.id && !m.read)
        .map((m: DirectMessage) => m.id)

      if (unreadIds.length > 0) {
        await supabase
          .from('direct_messages')
          .update({ read: true })
          .in('id', unreadIds)
      }

      setLoading(false)
    }
    init()

    // Real-time subscription for new messages in this conversation
    const channel = supabase
      .channel(`dm-${[myId, otherUserId].sort().join('-')}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        async (payload: any) => {
          const m = payload.new as DirectMessage
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          // Only process messages relevant to this conversation
          const isRelevant =
            (m.sender_id === user.id && m.receiver_id === otherUserId) ||
            (m.sender_id === otherUserId && m.receiver_id === user.id)
          if (!isRelevant) return

          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(x => x.id === m.id)) return prev
            return [...prev, m]
          })

          // Mark as read if it came from the other user
          if (m.sender_id === otherUserId) {
            await supabase
              .from('direct_messages')
              .update({ read: true })
              .eq('id', m.id)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [otherUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = msgText.trim()
    if (!text || !myId) return
    setSending(true)
    setMsgText('')

    const { error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: myId,
        receiver_id: otherUserId,
        content: text,
        read: false,
      })

    if (error) {
      setTableError(true)
    }
    setSending(false)
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h`
    return d.toLocaleDateString()
  }

  return (
    <AppShell showNav={false}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 sticky top-14 z-30" style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => router.push('/profile/messages')}
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          ←
        </button>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
          style={{ background: `hsl(${(otherUsername.charCodeAt(0) * 40) % 360}, 60%, 45%)` }}
        >
          {otherUsername[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1.1rem' }}>
            {otherUsername}
          </p>
        </div>
        <button
          onClick={() => router.push(`/user/${otherUserId}`)}
          className="text-xs px-2 py-1 rounded-lg"
          style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
        >
          View Profile
        </button>
      </div>

      {tableError ? (
        <div className="p-6 text-center">
          <div className="text-4xl mb-3">🚧</div>
          <p className="font-bold mb-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            SETUP REQUIRED
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            The direct messages table hasn&apos;t been created yet. Apply the SQL migration from{' '}
            <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text)' }}>
              lib/types.ts
            </code>{' '}
            in your Supabase dashboard.
          </p>
        </div>
      ) : loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading conversation...</div>
      ) : (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👋</div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Start a conversation with {otherUsername}
                </p>
              </div>
            )}
            {messages.map(m => {
              const isMe = m.sender_id === myId
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
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
                  <p className="text-xs mt-0.5 px-1" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(m.created_at)}
                    {isMe && m.read && ' · Read'}
                  </p>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Message input */}
          <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--nav-bg)' }}>
            <input
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder={`Message ${otherUsername}...`}
              className="flex-1 px-4 py-2.5 rounded-xl border-2"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text)',
                borderColor: 'var(--border)',
                fontFamily: 'var(--font-body)',
              }}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={sendMessage}
              loading={sending}
              disabled={!msgText.trim()}
              style={{ minWidth: '48px' }}
            >
              {sending ? '' : '→'}
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
