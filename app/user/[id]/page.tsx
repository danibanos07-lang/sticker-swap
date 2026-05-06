'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { getUserStickerInfo, calculateMatchScore, calculateDistance } from '@/lib/matching-algorithm'
import { MatchScore } from '@/lib/types'
import Link from 'next/link'

interface UserProfileData {
  user_id: string
  username: string
  bio?: string
  age?: number
  latitude: number
  longitude: number
  search_radius_km: number
}

interface StickerStats {
  have: number
  dupes: number
  need: number
}

export default function UserProfilePage() {
  const { id: targetUserId } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [myId, setMyId] = useState('')
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [stats, setStats] = useState<StickerStats>({ have: 0, dupes: 0, need: 0 })
  const [matchScore, setMatchScore] = useState<MatchScore | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingTrade, setStartingTrade] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      // Fetch target user's profile and sticker counts
      const [profileRes, stickersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', targetUserId).single(),
        supabase.from('user_stickers').select('status').eq('user_id', targetUserId),
      ])

      if (!profileRes.data) { setLoading(false); return }
      setProfile(profileRes.data)

      if (stickersRes.data) {
        setStats({
          have: stickersRes.data.filter((s: any) => s.status === 'have').length,
          dupes: stickersRes.data.filter((s: any) => s.status === 'have_duplicate').length,
          need: stickersRes.data.filter((s: any) => s.status === 'need').length,
        })
      }

      // Fetch my own profile to compute distance and sticker match
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (myProfile && profileRes.data.latitude && profileRes.data.longitude) {
        const dist = calculateDistance(
          myProfile.latitude, myProfile.longitude,
          profileRes.data.latitude, profileRes.data.longitude
        )
        setDistanceKm(parseFloat(dist.toFixed(1)))

        // Compute sticker match score
        const [myInfo, theirInfo] = await Promise.all([
          getUserStickerInfo(user.id, supabase),
          getUserStickerInfo(targetUserId, supabase),
        ])
        setMatchScore(calculateMatchScore(myInfo, theirInfo))
      }

      setLoading(false)
    }
    init()
  }, [targetUserId])

  const startTrade = async () => {
    if (!myId) return
    setStartingTrade(true)
    const { data } = await supabase
      .from('trades')
      .insert({ initiator_id: myId, responder_id: targetUserId, initiator_sticker_number: 0, responder_sticker_number: 0 })
      .select()
      .single()
    if (data) router.push(`/trades/${data.id}`)
    setStartingTrade(false)
  }

  if (loading) {
    return (
      <AppShell showNav={false}>
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </AppShell>
    )
  }

  if (!profile) {
    return (
      <AppShell showNav={false}>
        <div className="p-6 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p style={{ color: 'var(--text-muted)' }}>User not found.</p>
          <button onClick={() => router.back()} className="mt-4 text-sm underline" style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Go back
          </button>
        </div>
      </AppShell>
    )
  }

  const pct = matchScore?.percentage ?? 0
  const barColor = pct >= 60 ? 'var(--green)' : pct >= 30 ? 'var(--gold)' : 'var(--primary)'
  const isOwnProfile = myId === targetUserId

  return (
    <AppShell showNav={false}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => router.back()}
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          ←
        </button>
        <p className="font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1.1rem' }}>
          COLLECTOR PROFILE
        </p>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Profile card */}
        <div className="card p-5 fade-up" style={{ borderTop: '4px solid var(--gold)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
              style={{ background: `hsl(${(profile.username.charCodeAt(0) * 40) % 360}, 60%, 45%)` }}
            >
              {profile.username[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1.4rem' }}>
                {profile.username}
              </h2>
              {distanceKm !== null && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>📍 {distanceKm} km away</p>
              )}
              {profile.age && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>🎂 Age {profile.age}</p>
              )}
            </div>
          </div>
          {profile.bio && (
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{profile.bio}</p>
          )}

          {/* Sticker stats */}
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            <div className="rounded-xl p-2" style={{ background: 'var(--border)' }}>
              <p className="font-bold" style={{ color: 'var(--green)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>{stats.have}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Have</p>
            </div>
            <div className="rounded-xl p-2" style={{ background: 'var(--border)' }}>
              <p className="font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>{stats.dupes}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Dupes</p>
            </div>
            <div className="rounded-xl p-2" style={{ background: 'var(--border)' }}>
              <p className="font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>{stats.need}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Need</p>
            </div>
          </div>

          {/* Action buttons — hide for own profile */}
          {!isOwnProfile && (
            <div className="flex gap-2">
              <Link href={`/profile/messages/${profile.user_id}`} className="flex-1">
                <button
                  className="w-full py-2.5 rounded-xl font-bold text-white transition-all active:scale-95"
                  style={{ background: 'var(--green)', fontFamily: 'var(--font-body)' }}
                >
                  💬 Message
                </button>
              </Link>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                onClick={startTrade}
                loading={startingTrade}
              >
                🔄 Trade
              </Button>
            </div>
          )}
          {isOwnProfile && (
            <Link href="/profile">
              <Button variant="outline" size="md" className="w-full">Edit My Profile</Button>
            </Link>
          )}
        </div>

        {/* Match score card — only for other users */}
        {!isOwnProfile && matchScore && (
          <div className="card p-4 fade-up fade-up-delay-1">
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1rem', marginBottom: '0.75rem' }}>
              STICKER COMPATIBILITY
            </h3>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Match score</span>
                <span style={{ color: barColor, fontWeight: 700 }}>{pct}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--border)' }}>
                <p className="text-xl font-bold" style={{ color: 'var(--green)', fontFamily: 'var(--font-display)' }}>
                  {matchScore.canReceive}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>They can give you</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--border)' }}>
                <p className="text-xl font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                  {matchScore.canGive}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>You can give them</p>
              </div>
            </div>

            {matchScore.totalMatches === 0 && (
              <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                No overlapping stickers yet — add more to your album to find matches.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
