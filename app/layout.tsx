import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['300','400','500','600','700','800'] })

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
      <body className={outfit.className}>{children}</body>
    </html>
  )
}