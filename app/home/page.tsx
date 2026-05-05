'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const [username, setUsername] = useState('')
  const [stats, setStats] = useState({ have: 0, need: 0, trades: 0 })

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, stickersRes, tradesRes] = await Promise.all([
        supabase.from('profiles').select('username').eq('user_id', user.id).single(),
        supabase.from('user_stickers').select('status').eq('user_id', user.id),
        supabase.from('trades').select('id').or(`initiator_id.eq.${user.id},responder_id.eq.${user.id}`).eq('status', 'pending'),
      ])

      if (profileRes.data) setUsername(profileRes.data.username)
      if (stickersRes.data) {
        setStats(s => ({
          ...s,
          have: stickersRes.data.filter((x: any) => x.status === 'have' || x.status === 'have_duplicate').length,
          need: stickersRes.data.filter((x: any) => x.status === 'need').length,
        }))
      }
      if (tradesRes.data) setStats(s => ({ ...s, trades: tradesRes.data.length }))
    }
    load()
  }, [])

  const quickLinks = [
    { href: '/stickers', icon: '📋', label: 'MY ALBUM', sub: `${stats.have} stickers tracked`, color: 'var(--primary)' },
    { href: '/discover', icon: '🔍', label: 'DISCOVER', sub: 'Find traders nearby', color: 'var(--green)' },
    { href: '/trades', icon: '🔄', label: 'MY TRADES', sub: `${stats.trades} active`, color: 'var(--gold)' },
    { href: '/profile', icon: '👤', label: 'PROFILE', sub: 'Settings & location', color: '#6366F1' },
  ]

  return (
    <AppShell>
      <div className="p-4 pt-6 fade-up">
        {/* Welcome banner */}
        <div
          className="rounded-2xl p-5 mb-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #1A1A2E 100%)' }}
        >
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl opacity-20">⚽</div>
          <p className="text-white/70 text-sm mb-1" style={{ fontFamily: 'var(--font-body)' }}>Welcome back,</p>
          <h2 className="text-white text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
            {username || 'Collector'}!
          </h2>
          <p className="text-white/60 text-xs mt-1">FIFA World Cup 2026™ Album</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Have', value: stats.have, color: 'var(--green)', icon: '✅' },
            { label: 'Need', value: stats.need, color: 'var(--primary)', icon: '❓' },
            { label: 'Trades', value: stats.trades, color: 'var(--gold)', icon: '🔄' },
          ].map(stat => (
            <div key={stat.label} className="card p-3 text-center">
              <div className="text-xl mb-0.5">{stat.icon}</div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Quick Access
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map((link, i) => (
            <Link key={link.href} href={link.href}>
              <div
                className={`card p-4 active:scale-95 transition-transform cursor-pointer fade-up fade-up-delay-${i + 1}`}
                style={{ borderLeft: `4px solid ${link.color}` }}
              >
                <div className="text-3xl mb-2">{link.icon}</div>
                <div className="font-bold text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1rem' }}>
                  {link.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{link.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* WC2026 badge */}
        <div className="text-center mt-8">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🏆 Panini FIFA World Cup 2026™ Official Album</span>
        </div>
      </div>
    </AppShell>
  )
}
