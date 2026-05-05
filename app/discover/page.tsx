'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { buildMatchResults } from '@/lib/matching'
import { Profile, MatchResult } from '@/lib/types'
import { useRouter } from 'next/navigation'

export default function Discover() {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [radius, setRadius] = useState(50)
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const loadMatches = async (profile: Profile, r: number) => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', profile.user_id)
      .not('latitude', 'eq', 0)

    if (profiles) {
      const results = buildMatchResults(profile, profiles, r)
      setMatches(results)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setMyProfile(profile)
        setRadius(profile.search_radius_km || 50)
        if (profile.latitude !== 0) {
          await loadMatches(profile, profile.search_radius_km || 50)
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleSetLocation = () => {
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const lat = parseFloat(pos.coords.latitude.toFixed(4))
        const lon = parseFloat(pos.coords.longitude.toFixed(4))
        await supabase.from('profiles').update({ latitude: lat, longitude: lon }).eq('user_id', user.id)
        const updated = { ...myProfile!, latitude: lat, longitude: lon }
        setMyProfile(updated)
        await loadMatches(updated, radius)
        setLocating(false)
      },
      () => {
        setError('Could not get location. Please allow location access.')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  const handleRadiusChange = async (newRadius: number) => {
    setRadius(newRadius)
    if (myProfile && myProfile.latitude !== 0) {
      await loadMatches(myProfile, newRadius)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('profiles').update({ search_radius_km: newRadius }).eq('user_id', user.id)
    }
  }

  const startTrade = async (otherUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('trades')
      .insert({ initiator_id: user.id, responder_id: otherUserId, initiator_sticker_number: 0, responder_sticker_number: 0 })
      .select()
      .single()
    if (data) router.push(`/trades/${data.id}`)
  }

  const hasLocation = myProfile && myProfile.latitude !== 0

  return (
    <AppShell title="DISCOVER">
      <div className="p-4 flex flex-col gap-4">
        {/* Location setup */}
        {!hasLocation && (
          <div className="card p-5 text-center fade-up" style={{ borderTop: '4px solid var(--primary)' }}>
            <div className="text-4xl mb-3">📍</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
              SET YOUR LOCATION
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              We only use approximate location to find traders near you. Your exact position is never shared.
            </p>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <Button variant="primary" onClick={handleSetLocation} loading={locating} className="w-full">
              {locating ? '' : '📍 Use My Location'}
            </Button>
          </div>
        )}

        {/* Radius slider */}
        {hasLocation && (
          <div className="card p-4 fade-up">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Search Radius</span>
              <span className="font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
                {radius} KM
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={radius}
              onChange={e => handleRadiusChange(parseInt(e.target.value))}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              <span>5 km</span>
              <span>200 km</span>
            </div>
            <button
              onClick={handleSetLocation}
              className="text-xs mt-2 underline"
              style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              📍 Update my location
            </button>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : hasLocation && matches.length === 0 ? (
          <div className="text-center py-12 card p-6">
            <div className="text-5xl mb-3">🌍</div>
            <p style={{ color: 'var(--text-muted)' }}>No traders found within {radius} km.</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Try increasing your search radius.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.length > 0 && (
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {matches.length} Trader{matches.length !== 1 ? 's' : ''} Found
              </p>
            )}
            {matches.map((m, i) => (
              <div key={m.profile.user_id} className={`card p-4 fade-up fade-up-delay-${Math.min(i + 1, 4)}`}>
                <div className="flex items-center gap-3 mb-3">
                  {/* Avatar placeholder */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                    style={{ background: `hsl(${(m.profile.username.charCodeAt(0) * 40) % 360}, 60%, 45%)` }}
                  >
                    {m.profile.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate" style={{ color: 'var(--text)' }}>{m.profile.username}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>📍 {m.distance_km} km away</p>
                  </div>
                  <Badge variant={m.match_score >= 70 ? 'success' : m.match_score >= 40 ? 'warning' : 'default'}>
                    {m.match_label}
                  </Badge>
                </div>
                {m.profile.bio && (
                  <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{m.profile.bio}</p>
                )}
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl py-2 text-center text-xs font-bold" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                    🏆 Score: {m.match_score}%
                  </div>
                  <Button variant="primary" size="sm" onClick={() => startTrade(m.profile.user_id)} className="flex-1">
                    💬 Trade
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
