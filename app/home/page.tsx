'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Compass, ArrowLeftRight, User, CheckCircle2, HelpCircle } from 'lucide-react'

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

  const statItems = [
    { label: 'Have', value: stats.have, color: 'var(--green)', Icon: CheckCircle2 },
    { label: 'Need', value: stats.need, color: 'var(--primary)', Icon: HelpCircle },
    { label: 'Trades', value: stats.trades, color: 'var(--gold)', Icon: ArrowLeftRight },
  ]

  const quickLinks = [
    { href: '/stickers', Icon: BookOpen, label: 'My Album', sub: `${stats.have} stickers tracked` },
    { href: '/discover', Icon: Compass, label: 'Discover', sub: 'Find traders nearby' },
    { href: '/trades', Icon: ArrowLeftRight, label: 'My Trades', sub: `${stats.trades} active` },
    { href: '/profile', Icon: User, label: 'Profile', sub: 'Settings & location' },
  ]

  return (
    <AppShell>
      <div className="p-4 pt-6 fade-up">
        {/* Welcome banner */}
        <div
          className="rounded-2xl p-5 mb-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #2A1F00 0%, #0F0F0F 100%)' }}
        >
          <p className="text-white/70 text-sm mb-1" style={{ fontFamily: 'var(--font-body)' }}>Welcome back,</p>
          <h2 className="text-white text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
            {username || 'Collector'}
          </h2>
          <p className="text-white/50 text-xs mt-1">FIFA World Cup 2026™ Album</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {statItems.map(stat => (
            <div key={stat.label} className="card p-3 text-center">
              <stat.Icon size={18} style={{ color: stat.color, margin: '0 auto 4px' }} strokeWidth={2} />
              <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Quick Access
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map((link, i) => (
            <Link key={link.href} href={link.href}>
              <div className={`card p-4 active:scale-95 transition-transform cursor-pointer fade-up fade-up-delay-${i + 1}`}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(201,168,76,0.10)' }}
                >
                  <link.Icon size={18} style={{ color: 'var(--primary)' }} strokeWidth={2} />
                </div>
                <div className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '0.95rem' }}>
                  {link.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{link.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
