'use client'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { BottomNav } from './BottomNav'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { OnboardingTutorial } from '@/components/tutorial/OnboardingTutorial'
import { createClient } from '@/lib/supabase/client'

interface AppShellProps {
  children: React.ReactNode
  showNav?: boolean
  title?: string
  headerRight?: React.ReactNode
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  showNav = true,
  title,
  headerRight,
}) => {
  const [showTutorial, setShowTutorial] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')

    const checkTutorial = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('has_seen_tutorial')
        .eq('user_id', user.id)
        .single()
      if (profile && !profile.has_seen_tutorial) {
        setShowTutorial(true)
      }
    }
    checkTutorial()
  }, [])

  const completeTutorial = async () => {
    setShowTutorial(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ has_seen_tutorial: true }).eq('user_id', user.id)
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Top header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 h-14"
        style={{
          background: 'var(--nav-bg)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="flex items-center" style={{ borderRadius: 10, overflow: 'hidden', background: 'white' }}>
          <Image
            src="/logo.png"
            alt="StickerSwap"
            width={148}
            height={40}
            style={{ objectFit: 'contain', display: 'block' }}
            priority
          />
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          <ThemeToggle />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 pb-20" style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>
        {title && (
          <div className="px-4 pt-6 pb-2">
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text)' }}>
              {title}
            </h1>
          </div>
        )}
        {children}
        <footer
          className="text-center py-3 text-xs"
          style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}
        >
          Founded by Daniel Baños
        </footer>
      </main>

      {showNav && <BottomNav />}
      {showTutorial && <OnboardingTutorial onComplete={completeTutorial} />}
    </div>
  )
}
