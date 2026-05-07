import type { Metadata } from 'next'
import { Outfit, Fredoka } from 'next/font/google'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['300','400','500','600','700','800'], variable: '--font-outfit' })
const fredoka = Fredoka({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-fredoka' })

export const metadata: Metadata = {
  title: 'StickerSwap — FIFA World Cup 2026',
  description: 'Trade Panini World Cup 2026 stickers with collectors near you',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',(s==='dark'||(!s&&d))?'dark':'light');}catch(e){}})();` }} />
      </head>
      <body className={`${outfit.variable} ${fredoka.variable} ${outfit.className}`}>{children}</body>
    </html>
  )
}