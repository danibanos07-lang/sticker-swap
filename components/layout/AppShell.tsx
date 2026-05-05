'use client'
import React, { useEffect } from 'react'
import { BottomNav } from './BottomNav'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

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
  // Init theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

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
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--primary)' }}>
            ⚽ STICKERSWAP
          </span>
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
      </main>

      {showNav && <BottomNav />}
    </div>
  )
}
