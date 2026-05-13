'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { STICKER_DATA } from '@/lib/stickerData'
import Link from 'next/link'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [age, setAge] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const ageNum = parseInt(age)
    if (!age || ageNum < 5 || ageNum > 120) {
      setError('Please enter a valid age (5–120)')
      setLoading(false)
      return
    }

    try {
      if (!supabase) throw new Error('Supabase not configured. Check environment variables.')
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, age: ageNum } },
      })

      if (authError) throw authError
      if (!data.user) throw new Error('No user returned from signup')

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        user_id: data.user.id,
        username,
        age: ageNum,
        latitude: 0,
        longitude: 0,
        search_radius_km: 50,
      }, { onConflict: 'user_id' })

      if (profileError) {
        console.error('Profile error:', profileError.message)
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      // Initialize the full album as "need" for this new user
      const allStickers = Object.entries(STICKER_DATA).flatMap(([teamKey, stickers]) =>
        stickers.map(s => ({
          user_id: data.user.id,
          sticker_number: parseInt(s.code.replace(/\D/g, '')),
          sticker_name: s.name,
          team: teamKey,
          status: 'need' as const,
        }))
      )
      const CHUNK = 500
      for (let i = 0; i < allStickers.length; i += CHUNK) {
        await supabase.from('user_stickers').insert(allStickers.slice(i, i + CHUNK))
      }

      window.location.href = '/home'
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'Failed to sign up. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="text-center mb-8 fade-up">
        <div className="text-5xl mb-2">⚽</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--primary)' }}>
          STICKERSWAP
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>FIFA World Cup 2026™</p>
      </div>

      <div className="card w-full max-w-sm p-6 fade-up fade-up-delay-1">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text)', marginBottom: '1.5rem' }}>
          JOIN THE SWAP
        </h2>
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <Input label="Username" type="text" value={username}
            onChange={e => setUsername(e.target.value)} placeholder="collector123" required />
          <Input label="Age" type="number" value={age}
            onChange={e => setAge(e.target.value)} placeholder="Your age" min="5" max="120" required />
          <Input label="Email" type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <Input label="Password" type="password" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required />
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>
              {error}
            </div>
          )}
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em', fontSize: '1.2rem' }}>
            {loading ? '' : 'CREATE ACCOUNT'}
          </Button>
        </form>
        <p className="text-center mt-5 text-sm" style={{ color: 'var(--text-muted)' }}>
          Already a member?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Log In</Link>
        </p>
      </div>
    </div>
  )
}