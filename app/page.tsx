'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function Home() {
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  return (
    <div className="min-h-screen hero-gradient flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Trophy emoji */}
      <div className="text-8xl mb-4 fade-up" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))' }}>
        🏆
      </div>

      {/* Title */}
      <div className="text-center mb-2 fade-up fade-up-delay-1">
        <h1 className="text-white text-6xl leading-none" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          STICKER
        </h1>
        <h1 className="text-6xl leading-none gold-text" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          SWAP
        </h1>
      </div>

      {/* Subtitle */}
      <p className="text-white/80 text-center mb-2 fade-up fade-up-delay-2" style={{ fontFamily: 'var(--font-body)', fontSize: '1rem' }}>
        FIFA World Cup 2026™
      </p>
      <p className="text-white/60 text-center mb-10 fade-up fade-up-delay-2" style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
        Trade Panini stickers with collectors near you
      </p>

      {/* Buttons */}
      <div className="w-full max-w-xs flex flex-col gap-3 fade-up fade-up-delay-3">
        <Link href="/signup" className="w-full">
          <Button variant="gold" size="lg" className="w-full text-xl" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
            🚀 GET STARTED
          </Button>
        </Link>
        <Link href="/login" className="w-full">
          <Button
            size="lg"
            className="w-full text-xl"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.05em',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.4)',
              backdropFilter: 'blur(8px)',
            }}
          >
            LOG IN
          </Button>
        </Link>
      </div>

      {/* Footer */}
      <p className="text-white/40 text-xs mt-10 fade-up fade-up-delay-4" style={{ fontFamily: 'var(--font-body)' }}>
        48 teams · 680 stickers · Find your missing ones
      </p>
    </div>
  )
}
