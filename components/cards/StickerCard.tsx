import React from 'react'
import { Badge } from '@/components/ui/Badge'

interface UserSticker {
  id: string
  sticker_number: number
  sticker_name: string
  team: string
  status: 'have' | 'need' | 'have_duplicate'
}

interface StickerCardProps {
  sticker: UserSticker
  onClick?: () => void
}

export const StickerCard: React.FC<StickerCardProps> = ({ sticker, onClick }) => {
  const statusColors: Record<string, 'success' | 'error' | 'warning'> = {
    have: 'success',
    have_duplicate: 'warning',
    need: 'error',
  }

  return (
    <div
      className="card px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
      onClick={onClick}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
        style={{ background: 'var(--primary)', fontFamily: 'var(--font-display)' }}
      >
        {sticker.sticker_number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{sticker.sticker_name}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sticker.team}</p>
      </div>
      <Badge variant={statusColors[sticker.status]}>
        {sticker.status === 'have' ? '✅ Have' : sticker.status === 'need' ? '❓ Need' : '⭐ Dupe'}
      </Badge>
    </div>
  )
}
