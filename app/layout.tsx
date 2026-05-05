import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
