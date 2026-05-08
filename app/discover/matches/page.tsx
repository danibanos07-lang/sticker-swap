'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { findMatches } from '@/lib/matching-algorithm'
import { Profile, MatchResult, TradePair } from '@/lib/types'
import { ProposeTradeModal } from '@/components/trades/ProposeTradeModal'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [myId, setMyId] = useState('')
  const [proposeModal, setProposeModal] = useState<{ userId: string; username: string; initialPair?: TradePair } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!profile) { setError('Profile not found'); setLoading(false); return }
      setMyId(user.id)
      setMyProfile(profile)

      if (!profile.latitude || profile.latitude === 0) {
        setError('Set your location in Profile to find matches.')
        setLoading(false)
        return
      }

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .not('latitude', 'eq', 0)

      if (allProfiles) {
        const results = await findMatches(profile, allProfiles, supabase)
        setMatches(results)
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleCreateTrade = async (pair: TradePair) => {
    if (!proposeModal) return
    const { data } = await supabase
      .from('trades')
      .insert({
        initiator_id: myId,
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

  return (
    <AppShell showNav={false}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => router.push('/discover')}
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          ←
        </button>
        <div className="flex-1">
          <p className="font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1.1rem' }}>
            🏆 STICKER MATCHES
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ranked by sticker trade compatibility</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Calculating sticker matches...</p>
          </div>
        ) : error ? (
          <div className="card p-6 text-center">
            <div className="text-5xl mb-3">📍</div>
            <p className="font-bold mb-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              LOCATION NEEDED
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{error}</p>
            <Link href="/profile">
              <Button variant="primary" size="md" className="w-full">Go to Profile</Button>
            </Link>
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-6 text-center">
            <div className="text-5xl mb-3">🌍</div>
            <p className="font-bold mb-2" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              NO MATCHES YET
            </p>
            <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              No traders with matching stickers found within {myProfile?.search_radius_km ?? 50} km.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Add more stickers to your album or increase your search radius.
            </p>
            <div className="flex gap-2 mt-4">
              <Link href="/stickers" className="flex-1">
                <Button variant="secondary" size="md" className="w-full">📋 My Album</Button>
              </Link>
              <Link href="/profile" className="flex-1">
                <Button variant="primary" size="md" className="w-full">📍 Profile</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {matches.length} Compatible Trader{matches.length !== 1 ? 's' : ''} Found
            </p>
            {matches.map((m, i) => {
              const score = m.stickerMatchScore
              const pct = score?.percentage ?? 0
              const canGive = score?.canGive ?? 0
              const canReceive = score?.canReceive ?? 0

              const barColor = pct >= 60 ? 'var(--green)' : pct >= 30 ? 'var(--gold)' : 'var(--primary)'

              return (
                <div
                  key={m.profile.user_id}
                  className={`card p-4 fade-up fade-up-delay-${Math.min(i + 1, 4)}`}
                  style={{ borderLeft: `4px solid ${barColor}` }}
                >
                  {/* User header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                      style={{ background: `hsl(${(m.profile.username.charCodeAt(0) * 40) % 360}, 60%, 45%)` }}
                    >
                      {m.profile.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                        {m.profile.username}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>📍 {m.distance_km} km away</p>
                    </div>
                    {/* Match % badge */}
                    <div
                      className="px-3 py-1 rounded-xl text-sm font-bold"
                      style={{ background: barColor, color: pct >= 60 ? 'white' : pct >= 30 ? '#1A1A2E' : 'white', fontFamily: 'var(--font-display)' }}
                    >
                      {pct}%
                    </div>
                  </div>

                  {/* Match progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      <span>Match compatibility</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                  </div>

                  {/* Trade stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-xl p-2 text-center" style={{ background: 'var(--border)' }}>
                      <p className="text-lg font-bold" style={{ color: 'var(--green)', fontFamily: 'var(--font-display)' }}>
                        {canReceive}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>They can give you</p>
                    </div>
                    <div className="rounded-xl p-2 text-center" style={{ background: 'var(--border)' }}>
                      <p className="text-lg font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                        {canGive}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>You can give them</p>
                    </div>
                  </div>

                  {m.profile.bio && (
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{m.profile.bio}</p>
                  )}

                  {/* Best trade pair preview */}
                  {m.bestTradePair ? (
                    <div className="rounded-xl p-3 mb-3" style={{ background: 'var(--border)' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        ⚡ Best Trade
                      </p>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span style={{ color: 'var(--primary)', fontWeight: 700, minWidth: '52px' }}>You give</span>
                          <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                            {m.bestTradePair.give.team} #{m.bestTradePair.give.sticker_number} — {m.bestTradePair.give.sticker_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span style={{ color: 'var(--green)', fontWeight: 700, minWidth: '52px' }}>You get</span>
                          <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                            {m.bestTradePair.receive.team} #{m.bestTradePair.receive.sticker_number} — {m.bestTradePair.receive.sticker_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl px-3 py-2 mb-3 text-xs text-center" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                      No mutual stickers to trade yet
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="gold"
                      size="sm"
                      className="w-full"
                      onClick={() => setProposeModal({
                        userId: m.profile.user_id,
                        username: m.profile.username,
                        initialPair: m.bestTradePair,
                      })}
                    >
                      ⚡ Propose Trade
                    </Button>
                    <div className="flex gap-2">
                      <Link href={`/profile/messages/${m.profile.user_id}`} className="flex-1">
                        <button
                          className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95"
                          style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
                        >
                          💬 Message
                        </button>
                      </Link>
                      <Link href={`/user/${m.profile.user_id}`} className="flex-1">
                        <button
                          className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95"
                          style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
                        >
                          👤 Profile
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
      {proposeModal && (
        <ProposeTradeModal
          myId={myId}
          otherUserId={proposeModal.userId}
          otherUsername={proposeModal.username}
          initialPair={proposeModal.initialPair}
          onConfirm={handleCreateTrade}
          onClose={() => setProposeModal(null)}
        />
      )}
    </AppShell>
  )
}
