import React from 'react'
import { MatchResult } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface MatchCardProps {
  match: MatchResult
  onConnect?: () => void
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onConnect }) => {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-lg flex-shrink-0"
          style={{ background: `hsl(${(match.profile.username.charCodeAt(0) * 40) % 360}, 60%, 45%)` }}
        >
          {match.profile.username[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="font-bold" style={{ color: 'var(--text)' }}>{match.profile.username}</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>📍 {match.distance_km} km away</p>
          <Badge variant="success">{match.match_label}</Badge>
        </div>
      </div>
      {match.profile.bio && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{match.profile.bio}</p>
      )}
      <div className="text-center text-2xl font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
        {match.match_score}%
      </div>
      {onConnect && (
        <Button onClick={onConnect} size="sm" className="w-full">Connect</Button>
      )}
    </div>
  )
}
