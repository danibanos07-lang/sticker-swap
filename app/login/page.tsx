'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (!supabase) throw new Error('Supabase not configured. Check environment variables.')
      console.log('Attempting login...')
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      console.log('Login result:', { data, error: authError })
      if (authError) throw authError
      console.log('Redirecting to /home...')
      router.push('/home')
      router.refresh()
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      {/* Logo */}
      <div className="text-center mb-8 fade-up">
        <div className="text-5xl mb-2">⚽</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--primary)' }}>
          STICKERSWAP
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>FIFA World Cup 2026™</p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-sm p-6 fade-up fade-up-delay-1">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text)', marginBottom: '1.5rem' }}>
          WELCOME BACK
        </h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>
              {error}
            </div>
          )}
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em', fontSize: '1.2rem' }}>
            {loading ? '' : 'LOG IN'}
          </Button>
        </form>
        <p className="text-center mt-5 text-sm" style={{ color: 'var(--text-muted)' }}>
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
