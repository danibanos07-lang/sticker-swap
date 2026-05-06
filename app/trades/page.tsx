'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface TradeRow {
  id: string
  initiator_id: string
  responder_id: string
  status: 'pending' | 'accepted' | 'completed' | 'rejected'
  created_at: string
  other_username: string
  initiator_sticker_number: number
  responder_sticker_number: number
}

export default function Trades() {
  const [trades, setTrades] = useState<TradeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')
  const [tab, setTab] = useState<'active' | 'completed'>('active')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setMyId(user.id)

      const { data: rawTrades } = await supabase
        .from('trades')
        .select('*')
        .or(`initiator_id.eq.${user.id},responder_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!rawTrades) { setLoading(false); return }

      // Fetch other user usernames
      const otherIds = rawTrades.map((t: any) => t.initiator_id === user.id ? t.responder_id : t.initiator_id)
      const uniqueIds = [...new Set(otherIds)]
      const { data: profiles } = await supabase.from('profiles').select('user_id, username').in('user_id', uniqueIds)

      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.username]))

      setTrades(rawTrades.map((t: any) => ({
        ...t,
        other_username: profileMap[t.initiator_id === user.id ? t.responder_id : t.initiator_id] || 'Unknown',
      })))
      setLoading(false)
    }
    load()
  }, [])

  const active = trades.filter(t => t.status === 'pending' || t.status === 'accepted')
  const completed = trades.filter(t => t.status === 'completed' || t.status === 'rejected')
  const displayed = tab === 'active' ? active : completed

  const statusVariant: Record<string, 'warning' | 'success' | 'default' | 'error'> = {
    pending: 'warning',
    accepted: 'success',
    completed: 'default',
    rejected: 'error',
  }

  return (
    <AppShell title="MY TRADES">
      {/* Tabs */}
      <div className="flex gap-2 px-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'active' as const, label: `Active (${active.length})` },
          { key: 'completed' as const, label: `History (${completed.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === t.key ? 'var(--primary)' : 'var(--border)',
              color: tab === t.key ? 'white' : 'var(--text-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 card p-6">
            <div className="text-5xl mb-3">🔄</div>
            <p style={{ color: 'var(--text-muted)' }}>
              {tab === 'active' ? 'No active trades. Discover traders nearby!' : 'No completed trades yet.'}
            </p>
            {tab === 'active' && (
              <Link href="/discover" className="inline-block mt-3">
                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>Go to Discover →</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map((trade, i) => {
              const iAmInitiator = trade.initiator_id === myId
              return (
                <Link key={trade.id} href={`/trades/${trade.id}`}>
                  <div className={`card p-4 active:scale-98 transition-transform fade-up fade-up-delay-${Math.min(i + 1, 4)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white"
                          style={{ background: 'var(--primary)', fontFamily: 'var(--font-display)' }}
                        >
                          {trade.other_username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{trade.other_username}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {iAmInitiator ? 'You offered' : 'They offered'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={statusVariant[trade.status]}>{trade.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>#{trade.initiator_sticker_number || '?'}</span>
                      <span>⇄</span>
                      <span>#{trade.responder_sticker_number || '?'}</span>
                      <span className="ml-auto">{new Date(trade.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
