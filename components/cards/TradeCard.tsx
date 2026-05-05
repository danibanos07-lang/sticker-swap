import React from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface Trade {
  id: string
  initiator_id: string
  responder_id: string
  status: 'pending' | 'accepted' | 'completed' | 'rejected'
  initiator_sticker_number: number
  responder_sticker_number: number
  created_at: string
}

interface TradeCardProps {
  trade: Trade
  otherUserName?: string
  myId: string
}

export const TradeCard: React.FC<TradeCardProps> = ({ trade, otherUserName, myId: _myId }) => {
  const statusColors = {
    pending: 'warning',
    accepted: 'success',
    completed: 'default',
    rejected: 'error',
  } as const

  return (
    <div className="card p-4 flex justify-between items-center gap-4">
      <div className="flex-1">
        <p className="font-semibold" style={{ color: 'var(--text)' }}>{otherUserName || 'User'}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          #{trade.initiator_sticker_number} ⇄ #{trade.responder_sticker_number}
        </p>
        <Badge variant={statusColors[trade.status]}>{trade.status}</Badge>
      </div>
      <Link href={`/trades/${trade.id}`}>
        <Button variant="secondary" size="sm">View</Button>
      </Link>
    </div>
  )
}
