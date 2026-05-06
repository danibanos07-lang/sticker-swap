'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'
import { ConversationPreview } from '@/lib/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function MessagesInbox() {
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      // Fetch all direct messages involving this user
      // Requires the direct_messages table (see SQL migration in lib/types.ts)
      const { data: msgs, error } = await supabase
        .from('direct_messages')
        .select('id, sender_id, receiver_id, content, created_at, read')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        // Table may not exist yet — show empty inbox gracefully
        setLoading(false)
        return
      }

      // Group by conversation partner
      const convMap = new Map<string, ConversationPreview>()

      for (const msg of msgs || []) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        if (!convMap.has(partnerId)) {
          convMap.set(partnerId, {
            userId: partnerId,
            username: partnerId, // will resolve below
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
            unreadCount: 0,
          })
        }
        // Count unread messages sent to us
        if (msg.receiver_id === user.id && !msg.read) {
          const existing = convMap.get(partnerId)!
          convMap.set(partnerId, { ...existing, unreadCount: existing.unreadCount + 1 })
        }
      }

      // Resolve usernames for all partners
      const partnerIds = [...convMap.keys()]
      if (partnerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', partnerIds)

        for (const p of profiles || []) {
          const existing = convMap.get(p.user_id)
          if (existing) convMap.set(p.user_id, { ...existing, username: p.username })
        }
      }

      setConversations([...convMap.values()])
      setLoading(false)
    }
    init()
  }, [])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  return (
    <AppShell showNav={false}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => router.push('/profile')}
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          ←
        </button>
        <div className="flex-1">
          <p className="font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1.1rem' }}>
            💬 MESSAGES
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Direct conversations</p>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading messages...</div>
        ) : conversations.length === 0 ? (
          <div className="card p-6 text-center mt-4">
            <div className="text-5xl mb-3">💬</div>
            <p className="font-bold mb-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              NO MESSAGES YET
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Find traders nearby and send them a message to start swapping!
            </p>
            <Link href="/discover">
              <button
                className="w-full py-2.5 rounded-xl font-bold text-white transition-all active:scale-95"
                style={{ background: 'var(--primary)', fontFamily: 'var(--font-body)' }}
              >
                🔍 Find Traders
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map((conv, i) => (
              <Link key={conv.userId} href={`/profile/messages/${conv.userId}`}>
                <div
                  className={`card p-4 flex items-center gap-3 active:scale-98 transition-transform fade-up fade-up-delay-${Math.min(i + 1, 4)}`}
                  style={{ borderLeft: conv.unreadCount > 0 ? '4px solid var(--primary)' : '4px solid transparent' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0 relative"
                    style={{ background: `hsl(${(conv.username.charCodeAt(0) * 40) % 360}, 60%, 45%)` }}
                  >
                    {conv.username[0]?.toUpperCase()}
                    {conv.unreadCount > 0 && (
                      <div
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'var(--primary)', fontSize: '0.65rem' }}
                      >
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p
                        className="font-bold text-sm truncate"
                        style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
                      >
                        {conv.username}
                      </p>
                      <p className="text-xs flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(conv.lastMessageAt)}
                      </p>
                    </div>
                    <p
                      className="text-xs truncate"
                      style={{
                        color: conv.unreadCount > 0 ? 'var(--text)' : 'var(--text-muted)',
                        fontWeight: conv.unreadCount > 0 ? 600 : 400,
                      }}
                    >
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
