'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ProfileData {
  username: string
  bio: string
  age: number | ''
  search_radius_km: number
  latitude: number
  longitude: number
}

export default function Profile() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileData>({
    username: '', bio: '', age: '', search_radius_km: 50, latitude: 0, longitude: 0
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ have: 0, need: 0, dupes: 0 })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [profileRes, stickersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('user_stickers').select('status').eq('user_id', user.id),
      ])

      if (profileRes.data) {
        const p = profileRes.data
        setProfile({
          username: p.username || '',
          bio: p.bio || '',
          age: p.age || '',
          search_radius_km: p.search_radius_km || 50,
          latitude: p.latitude || 0,
          longitude: p.longitude || 0,
        })
      }
      if (stickersRes.data) {
        setStats({
          have: stickersRes.data.filter((s: any) => s.status === 'have').length,
          dupes: stickersRes.data.filter((s: any) => s.status === 'have_duplicate').length,
          need: stickersRes.data.filter((s: any) => s.status === 'need').length,
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase.from('profiles').update({
      username: profile.username,
      bio: profile.bio,
      age: profile.age || null,
      search_radius_km: profile.search_radius_km,
    }).eq('user_id', user.id)

    if (err) setError(err.message)
    else { setSuccess(true); setTimeout(() => setSuccess(false), 2000) }
    setSaving(false)
  }

  const handleSetLocation = () => {
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4))
        const lon = parseFloat(pos.coords.longitude.toFixed(4))
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from('profiles').update({ latitude: lat, longitude: lon }).eq('user_id', user.id)
        setProfile(p => ({ ...p, latitude: lat, longitude: lon }))
        setLocating(false)
      },
      () => { setError('Could not get location. Please allow location access.'); setLocating(false) },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const completionPct = Math.round((stats.have / 680) * 100)

  return (
    <AppShell title="PROFILE">
      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div className="p-4 flex flex-col gap-4">
          {/* Album progress */}
          <div className="card p-5 fade-up" style={{ borderTop: '4px solid var(--gold)' }}>
            <div className="flex justify-between items-center mb-2">
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1.2rem' }}>ALBUM PROGRESS</h3>
              <span className="font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>{completionPct}%</span>
            </div>
            <div className="w-full h-3 rounded-full mb-3 overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${completionPct}%`, background: 'linear-gradient(90deg, var(--gold), var(--primary))' }} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-bold" style={{ color: 'var(--green)', fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>{stats.have}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>✅ Have</p>
              </div>
              <div>
                <p className="font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>{stats.dupes}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>⭐ Dupes</p>
              </div>
              <div>
                <p className="font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>{stats.need}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>❓ Need</p>
              </div>
            </div>
          </div>

          {/* Edit profile */}
          <div className="card p-5 fade-up fade-up-delay-1">
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1.2rem', marginBottom: '1rem' }}>EDIT PROFILE</h3>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <Input
                label="Username"
                value={profile.username}
                onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                required
              />
              <Input
                label="Age"
                type="number"
                value={profile.age}
                onChange={e => setProfile(p => ({ ...p, age: parseInt(e.target.value) || '' }))}
                min="5"
                max="120"
                placeholder="Your age"
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell other collectors about yourself..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 rounded-xl resize-none"
                  style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)', fontFamily: 'var(--font-body)' }}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm" style={{ color: 'var(--green)' }}>✅ Profile saved!</p>}
              <Button type="submit" variant="primary" size="md" loading={saving} className="w-full">
                Save Profile
              </Button>
            </form>
          </div>

          {/* Location */}
          <div className="card p-5 fade-up fade-up-delay-2">
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>LOCATION</h3>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              {profile.latitude !== 0
                ? `📍 Location set (approx. ${profile.latitude.toFixed(2)}, ${profile.longitude.toFixed(2)})`
                : '📍 Location not set — needed to find traders near you'}
            </p>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Search radius</span>
                <span className="font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>{profile.search_radius_km} km</span>
              </div>
              <input
                type="range"
                min={5}
                max={200}
                step={5}
                value={profile.search_radius_km}
                onChange={e => setProfile(p => ({ ...p, search_radius_km: parseInt(e.target.value) }))}
              />
            </div>
            <Button variant="secondary" size="md" onClick={handleSetLocation} loading={locating} className="w-full">
              {locating ? '' : '📍 Update My Location'}
            </Button>
          </div>

          {/* Logout */}
          <div className="card p-4 fade-up fade-up-delay-3">
            <Button variant="outline" size="md" onClick={handleLogout} className="w-full">
              🚪 Log Out
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
