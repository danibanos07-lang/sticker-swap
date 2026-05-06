'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/Button'

type FriendStatus = 'none' | 'request_sent' | 'request_received' | 'friends' | 'self'

export function SearchFriend({ currentUserId }: { currentUserId: string }) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Profile | null>(null)
  const [status, setStatus] = useState<FriendStatus>('none')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const supabase = createClient()

  const search = async () => {
    const trimmed = query.trim()
    if (!trimmed) return
    setSearching(true)
    setNotFound(false)
    setResult(null)
    setStatus('none')
    setRequestId(null)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', trimmed)
      .maybeSingle()

    if (!profile) {
      setNotFound(true)
      setSearching(false)
      return
    }

    setResult(profile)

    if (profile.user_id === currentUserId) {
      setStatus('self')
      setSearching(false)
      return
    }

    const { data: req } = await supabase
      .from('friend_requests')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${profile.user_id}),` +
        `and(sender_id.eq.${profile.user_id},receiver_id.eq.${currentUserId})`
      )
      .maybeSingle()

    if (req) {
      setRequestId(req.id)
      if (req.status === 'accepted') {
        setStatus('friends')
      } else if (req.sender_id === currentUserId) {
        setStatus('request_sent')
      } else {
        setStatus('request_received')
      }
    }

    setSearching(false)
  }

  const sendRequest = async () => {
    if (!result) return
    setSending(true)
    const { data } = await supabase
      .from('friend_requests')
      .insert({ sender_id: currentUserId, receiver_id: result.user_id })
      .select()
      .single()
    if (data) {
      setRequestId(data.id)
      setStatus('request_sent')
    }
    setSending(false)
  }

  const acceptRequest = async () => {
    if (!requestId) return
    setSending(true)
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)
    setStatus('friends')
    setSending(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="card p-4 flex flex-col gap-3">
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text)' }}>
          🔍 FIND A FRIEND
        </h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Search any username — finds users anywhere in the world.
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl px-4 py-3 text-sm border-2 focus:outline-none transition-all"
            style={{
              background: 'var(--bg-input)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
            placeholder="Enter exact username..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            autoComplete="off"
            autoCapitalize="none"
          />
          <Button variant="primary" onClick={search} loading={searching} disabled={!query.trim()}>
            Search
          </Button>
        </div>
      </div>

      {/* Not found */}
      {notFound && (
        <div className="card p-5 text-center">
          <div className="text-3xl mb-2">🤷</div>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>No user found</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Make sure you typed the username exactly.
          </p>
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className="card p-4 fade-up flex flex-col gap-4">
          {/* Profile row */}
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
              style={{ background: `hsl(${(result.username.charCodeAt(0) * 40) % 360}, 60%, 45%)` }}
            >
              {result.username[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight truncate" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {result.username}
              </p>
              {result.bio && (
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                  {result.bio}
                </p>
              )}
              {result.age && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Age {result.age}
                </p>
              )}
            </div>
            <Link href={`/user/${result.user_id}`}>
              <button
                className="text-xs px-3 py-2 rounded-xl font-bold flex-shrink-0"
                style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
              >
                View Profile
              </button>
            </Link>
          </div>

          {/* Action */}
          {status === 'self' && (
            <p className="text-sm text-center py-2" style={{ color: 'var(--text-muted)' }}>
              This is your own profile.
            </p>
          )}
          {status === 'none' && (
            <Button variant="primary" onClick={sendRequest} loading={sending} className="w-full">
              ➕ Add Friend
            </Button>
          )}
          {status === 'request_sent' && (
            <div
              className="text-sm text-center py-3 rounded-xl font-semibold"
              style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
            >
              ⏳ Friend Request Sent
            </div>
          )}
          {status === 'request_received' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                This user already sent you a friend request!
              </p>
              <Button variant="secondary" onClick={acceptRequest} loading={sending} className="w-full">
                ✅ Accept Friend Request
              </Button>
            </div>
          )}
          {status === 'friends' && (
            <div
              className="text-sm text-center py-3 rounded-xl font-semibold text-white"
              style={{ background: 'var(--green)' }}
            >
              ✅ Already Friends
            </div>
          )}
        </div>
      )}
    </div>
  )
}
