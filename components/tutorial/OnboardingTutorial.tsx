'use client'
import { useState } from 'react'

interface Step {
  emoji: string
  title: string
  body: string
  tip?: string
  // which bottom-nav icon to highlight (0=Home 1=Album 2=Discover 3=Friends 4=Trades 5=Profile)
  navIndex: number | null
  navLabel?: string
}

const NAV_ICONS = ['🏠', '📋', '🌍', '👥', '🔄', '👤']
const NAV_LABELS = ['Home', 'Album', 'Discover', 'Friends', 'Trades', 'Profile']

const STEPS: Step[] = [
  {
    emoji: '⚽',
    title: 'Welcome to StickerSwap!',
    body: 'Your FIFA World Cup 2026 Panini sticker companion. Track your collection, find nearby traders, and swap duplicates with friends. Let\'s take a quick tour!',
    navIndex: null,
  },
  {
    emoji: '📋',
    title: 'Add Your Stickers',
    body: 'Head to the Album tab and tap + Add. Choose a team, then pick a sticker from the dropdown — each one shows the real player name from the official Panini checklist.',
    tip: 'Use Batch Entry to tap-select multiple stickers from a team grid all at once.',
    navIndex: 1,
    navLabel: 'Album',
  },
  {
    emoji: '🗂️',
    title: 'Track Your Collection',
    body: 'Mark every sticker as ✅ Have, ❓ Need, or ⭐ Dupe. Each card in your list shows three toggle buttons — tap any to switch status instantly, or tap 🗑 to remove it.',
    navIndex: 1,
    navLabel: 'Album',
  },
  {
    emoji: '👥',
    title: 'Find & Add Friends',
    body: 'Go to the Friends tab and search for any collector by their exact username. Send a friend request — once accepted you can message or start a trade directly from their card.',
    navIndex: 3,
    navLabel: 'Friends',
  },
  {
    emoji: '🌍',
    title: 'Discover Nearby Traders',
    body: 'On the Discover tab, share your location and drag the radius slider. StickerSwap ranks every collector near you by sticker compatibility — so you always make the best possible trade!',
    tip: 'Tap "🏆 View Matches" to see your highest-compatibility matches ranked.',
    navIndex: 2,
    navLabel: 'Discover',
  },
]

interface Props {
  onComplete: () => void
}

export function OnboardingTutorial({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <>
      {/* ── Overlay ── */}
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.80)', zIndex: 300 }}
      />

      {/* ── Spotlight ring on nav icon ── */}
      {current.navIndex !== null && (
        <div
          style={{
            position: 'fixed',
            left: `${((current.navIndex + 0.5) / NAV_ICONS.length) * 100}%`,
            bottom: '32px',
            transform: 'translate(-50%, 50%)',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: '3px solid white',
            boxShadow: '0 0 0 6px rgba(255,255,255,0.15), 0 0 24px rgba(255,255,255,0.6)',
            zIndex: 302,
            pointerEvents: 'none',
            animation: 'tutorialPulse 1.8s ease-in-out infinite',
          }}
        />
      )}

      {/* ── Tutorial card ── */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: current.navIndex !== null ? '8%' : '50%',
          transform: current.navIndex !== null ? 'translateX(-50%)' : 'translate(-50%, -50%)',
          width: 'min(92vw, 440px)',
          background: 'var(--bg-card)',
          borderRadius: '28px',
          padding: '28px 24px 20px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          zIndex: 301,
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
      >
        {/* Progress bar */}
        <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--primary)',
              borderRadius: '2px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Step counter */}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, textAlign: 'center', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Step {step + 1} of {STEPS.length}
        </p>

        {/* Emoji */}
        <div style={{ fontSize: '3.2rem', textAlign: 'center', marginBottom: '10px', lineHeight: 1 }}>
          {current.emoji}
        </div>

        {/* Title */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--text)', textAlign: 'center', marginBottom: '10px', lineHeight: 1.15 }}>
          {current.title}
        </h2>

        {/* Body */}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.65, textAlign: 'center', marginBottom: '12px' }}>
          {current.body}
        </p>

        {/* Tip */}
        {current.tip && (
          <div style={{ background: 'var(--border)', borderRadius: '14px', padding: '10px 14px', marginBottom: '12px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', lineHeight: 1.5 }}>
              💡 {current.tip}
            </p>
          </div>
        )}

        {/* Mini nav indicator */}
        {current.navIndex !== null && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Find it here ↓
            </p>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
              {NAV_ICONS.map((icon, i) => {
                const active = i === current.navIndex
                return (
                  <div
                    key={i}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: active ? '1.3rem' : '1rem',
                      background: active ? 'var(--primary)' : 'var(--border)',
                      color: active ? 'white' : 'var(--text-muted)',
                      boxShadow: active ? '0 4px 12px rgba(200,16,46,0.4)' : 'none',
                      transform: active ? 'scale(1.12)' : 'scale(1)',
                      transition: 'all 0.2s',
                      gap: '2px',
                    }}
                  >
                    <span>{icon}</span>
                    <span style={{ fontSize: '0.45rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                      {NAV_LABELS[i]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          {!isFirst && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '14px',
                background: 'var(--border)',
                color: 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}
          {isLast ? (
            <button
              onClick={onComplete}
              style={{
                flex: 2,
                padding: '13px',
                borderRadius: '14px',
                background: 'var(--green)',
                color: 'white',
                fontWeight: 700,
                fontSize: '1rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,132,61,0.4)',
              }}
            >
              🚀 Let's Go!
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                flex: isFirst ? 1 : 2,
                padding: '13px',
                borderRadius: '14px',
                background: 'var(--primary)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(200,16,46,0.35)',
              }}
            >
              Next →
            </button>
          )}
        </div>

        {/* Skip */}
        <button
          onClick={onComplete}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            cursor: 'pointer',
            padding: '6px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          Skip Tutorial
        </button>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes tutorialPulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(255,255,255,0.15), 0 0 24px rgba(255,255,255,0.6); }
          50% { box-shadow: 0 0 0 10px rgba(255,255,255,0.05), 0 0 32px rgba(255,255,255,0.9); }
        }
      `}</style>
    </>
  )
}
