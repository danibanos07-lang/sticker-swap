'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, BookOpen, Compass, Users, ArrowLeftRight, User } from 'lucide-react'

const navItems = [
  { label: 'Home', href: '/home', Icon: House },
  { label: 'Album', href: '/stickers', Icon: BookOpen },
  { label: 'Discover', href: '/discover', Icon: Compass },
  { label: 'Friends', href: '/friends', Icon: Users },
  { label: 'Trades', href: '/trades', Icon: ArrowLeftRight },
  { label: 'Profile', href: '/profile', Icon: User },
]

export const BottomNav: React.FC = () => {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center h-16 z-50"
      style={{
        background: 'var(--nav-bg)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}
    >
      {navItems.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90"
            style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            <item.Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            <span
              className="font-semibold"
              style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem' }}
            >
              {item.label}
            </span>
            {active && (
              <div
                className="absolute bottom-0 w-8 h-0.5 rounded-full"
                style={{ background: 'var(--primary)' }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
