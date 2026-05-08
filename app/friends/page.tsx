'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'
import { Profile, TradePair } from '@/lib/types'
import { SearchFriend } from '@/components/discover/SearchFriend'
import { ProposeTradeModal } from '@/components/trades/ProposeTradeModal'

type Tab = 'friends' | 'find'

interface FriendEntry {
  profile: Profile
  requestId: string
}

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [pendingReceived, setPendingReceived] = useState<FriendEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [proposeModal, setProposeModal] = useState<{ userId: string; username: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const [{ data: accepted }, { data: pending }] = await Promise.all([
        supabase
          .from('friend_requests')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'accepted'),
        supabase
          .from('friend_requests')
          .select('*')
          .eq('receiver_id', user.id)
          .eq('status', 'pending'),
      ])

      const fetchProfiles = async (ids: string[]) => {
        if (!ids.length) return []
        const { data } = await supabase.from('profiles').select('*').in('user_id', ids)
        return data || []
      }

      if (accepted?.length) {
        const otherIds = accepted.map((r: Record<string, string>) => r.sender_id === user.id ? r.receiver_id : r.sender_id)
        const profiles = await fetchProfiles(otherIds)
        setFriends(
          accepted
            .map((r: Record<string, string>) => {
              const otherId = r.sender_id === user.id ? r.receiver_id : r.sender_id
              const profile = profiles.find((p: Profile) => p.user_id === otherId)
              return profile ? { profile, requestId: r.id } : null
            })
            .filter(Boolean) as FriendEntry[]
        )
      }

      if (pending?.length) {
        const senderIds = pending.map((r: Record<string, string>) => r.sender_id)
        const profiles = await fetchProfiles(senderIds)
        setPendingReceived(
          pending
            .map((r: Record<string, string>) => {
              const profile = profiles.find((p: Profile) => p.user_id === r.sender_id)
              return profile ? { profile, requestId: r.id } : null
            })
            .filter(Boolean) as FriendEntry[]
        )
      }

      setLoading(false)
    }
    init()
  }, [])

  const acceptRequest = async (requestId: string, profile: Profile) => {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId)
    setPendingReceived(prev => prev.filter(f => f.requestId !== requestId))
    setFriends(prev => [...prev, { profile, requestId }])
  }

  const handleCreateTrade = async (pair: TradePair) => {
    if (!proposeModal || !currentUserId) return
    const { data } = await supabase
      .from('trades')
      .insert({
        initiator_id: currentUserId,
        responder_id: proposeModal.userId,
        initiator_sticker_number: pair.give.sticker_number,
        initiator_sticker_team: pair.give.team,
        initiator_sticker_name: pair.give.sticker_name,
        responder_sticker_number: pair.receive.sticker_number,
        responder_sticker_team: pair.receive.team,
        responder_sticker_name: pair.receive.sticker_name,
      })
      .select()
      .single()
    setProposeModal(null)
    if (data) router.push(`/trades/${data.id}`)
  }

  const Avatar = ({ username }: { username: string }) => (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
      style={{ background: `hsl(${(username.charCodeAt(0) * 40) % 360}, 60%, 45%)` }}
    >
      {username[0]?.toUpperCase()}
    </div>
  )

  return (
    <AppShell title="FRIENDS">
      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {([
          { key: 'friends' as Tab, label: `👥 My Friends${friends.length ? ` (${friends.length})` : ''}` },
          { key: 'find' as Tab, label: `🔍 Find Friends${pendingReceived.length ? ` · ${pendingReceived.length} pending` : ''}` },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
            style={{
              background: tab === t.key ? 'var(--primary)' : 'var(--border)',
              color: tab === t.key ? 'white' : 'var(--text-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'find' ? (
        <div className="p-4">
          {currentUserId
            ? <SearchFriend currentUserId={currentUserId} />
            : <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          }
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-3">

          {/* Pending requests */}
          {pendingReceived.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Pending Requests ({pendingReceived.length})
              </p>
              {pendingReceived.map(({ profile, requestId }) => (
                <div key={requestId} className="card p-4 flex flex-col gap-3" style={{ borderLeft: '3px solid var(--gold)' }}>
                  <div className="flex items-center gap-3">
                    <Avatar username={profile.username} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate" style={{ color: 'var(--text)' }}>{profile.username}</p>
                      {profile.bio
                        ? <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{profile.bio}</p>
                        : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Wants to be your friend</p>
                      }
                    </div>
                    <Link href={`/user/${profile.user_id}`}>
                      <span className="text-xs px-3 py-1.5 rounded-xl font-bold" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                        View
                      </span>
                    </Link>
                  </div>
                  <button
                    onClick={() => acceptRequest(requestId, profile)}
                    className="w-full py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'var(--green)' }}
                  >
                    ✅ Accept Friend Request
                  </button>
                </div>
              ))}
              <div className="my-1" style={{ borderBottom: '1px solid var(--border)' }} />
            </>
          )}

          {/* Friends list */}
          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : friends.length === 0 ? (
            <div className="card p-6 text-center">
              <div className="text-5xl mb-3">👥</div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>No friends yet</p>
              <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
                Search for collectors by username and send a friend request.
              </p>
              <button
                onClick={() => setTab('find')}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'var(--primary)' }}
              >
                🔍 Find Friends
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Friends ({friends.length})
              </p>
              {friends.map(({ profile, requestId }) => (
                <div key={requestId} className="card p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar username={profile.username} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate" style={{ color: 'var(--text)' }}>{profile.username}</p>
                      {profile.bio && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{profile.bio}</p>
                      )}
                      {profile.age && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Age {profile.age}</p>
                      )}
                    </div>
                    <Link href={`/user/${profile.user_id}`}>
                      <span className="text-xs px-3 py-1.5 rounded-xl font-bold" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                        View
                      </span>
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/profile/messages/${profile.user_id}`} className="flex-1">
                      <button className="w-full py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'var(--green)' }}>
                        💬 Message
                      </button>
                    </Link>
                    <button
                      onClick={() => setProposeModal({ userId: profile.user_id, username: profile.username })}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: 'var(--primary)' }}
                    >
                      🔄 Trade
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      {proposeModal && currentUserId && (
        <ProposeTradeModal
          myId={currentUserId}
          otherUserId={proposeModal.userId}
          otherUsername={proposeModal.username}
          onConfirm={handleCreateTrade}
          onClose={() => setProposeModal(null)}
        />
      )}
    </AppShell>
  )
}
