'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type TradeStatus = 'pending' | 'accepted' | 'completed' | 'rejected' | 'canceled'

interface TradeRow {
  id: string
  initiator_id: string
  responder_id: string
  initiator_username: string
  responder_username: string
  initiator_sticker_number: number
  initiator_sticker_team: string
  initiator_sticker_name: string
  responder_sticker_number: number
  responder_sticker_team: string
  responder_sticker_name: string
  status: TradeStatus
  created_at: string
}

type TabKey = 'incoming' | 'outgoing' | 'history'

function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', zIndex: 200 }}
        onClick={onCancel}
      />
      <div style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(88vw, 360px)',
        background: 'var(--bg-card)',
        borderRadius: '20px',
        padding: '24px 20px',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <p style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'center', fontSize: '0.95rem', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '11px', borderRadius: '12px',
              background: 'var(--border)', color: 'var(--text-muted)',
              fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Go back
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '11px', borderRadius: '12px',
              background: 'var(--primary)', color: 'white',
              fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_BADGE: Record<TradeStatus, 'warning' | 'success' | 'default' | 'error' | 'info'> = {
  pending: 'warning',
  accepted: 'success',
  completed: 'info',
  rejected: 'error',
  canceled: 'default',
}

const STATUS_LABEL: Record<TradeStatus, string> = {
  pending: '⏳ Pending',
  accepted: '✅ Accepted',
  completed: '🏆 Completed',
  rejected: '❌ Rejected',
  canceled: '✖ Canceled',
}

export default function Trades() {
  const supabase = createClient()
  const [trades, setTrades] = useState<TradeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')
  const [tab, setTab] = useState<TabKey>('incoming')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [actionError, setActionError] = useState('')
  const [acting, setActing] = useState(false)

  const loadTrades = useCallback(async (uid: string) => {
    const { data: rawTrades } = await supabase
      .from('trades')
      .select('*')
      .or(`initiator_id.eq.${uid},responder_id.eq.${uid}`)
      .order('created_at', { ascending: false })

    if (!rawTrades) return

    const allIds = new Set<string>()
    rawTrades.forEach((t: Record<string, string>) => {
      allIds.add(t.initiator_id)
      allIds.add(t.responder_id)
    })
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', [...allIds])

    const pm = Object.fromEntries((profiles || []).map((p: Record<string, string>) => [p.user_id, p.username]))

    setTrades(rawTrades.map((t: Record<string, string>) => ({
      ...t,
      initiator_username: pm[t.initiator_id] || 'Unknown',
      responder_username: pm[t.responder_id] || 'Unknown',
    })) as TradeRow[])
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setMyId(user.id)
      await loadTrades(user.id)
      setLoading(false)
    }
    init()
  }, [])

  const incoming = trades.filter(t => t.responder_id === myId && t.status === 'pending')
  const outgoing = trades.filter(t => t.initiator_id === myId && t.status === 'pending')
  const history = trades.filter(t => t.status !== 'pending')
  const displayed = tab === 'incoming' ? incoming : tab === 'outgoing' ? outgoing : history

  const switchTab = (t: TabKey) => { setTab(t); setSelected(new Set()); setActionError('') }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const isAllSelected = displayed.length > 0 && selected.size === displayed.length
  const toggleSelectAll = () =>
    setSelected(isAllSelected ? new Set() : new Set(displayed.map(t => t.id)))

  // ── Core accept logic: validates stickers and swaps collections ──
  const doAcceptTrade = async (trade: TradeRow): Promise<string | null> => {
    if (!trade.initiator_sticker_team || trade.initiator_sticker_number === 0 ||
        !trade.responder_sticker_team || trade.responder_sticker_number === 0) {
      return 'Stickers not fully specified. Open the trade to select which stickers to exchange.'
    }

    const [{ data: initSticker }, { data: respSticker }] = await Promise.all([
      supabase
        .from('user_stickers')
        .select('*')
        .eq('user_id', trade.initiator_id)
        .eq('sticker_number', trade.initiator_sticker_number)
        .eq('team', trade.initiator_sticker_team)
        .eq('status', 'have_duplicate')
        .maybeSingle(),
      supabase
        .from('user_stickers')
        .select('*')
        .eq('user_id', trade.responder_id)
        .eq('sticker_number', trade.responder_sticker_number)
        .eq('team', trade.responder_sticker_team)
        .eq('status', 'have_duplicate')
        .maybeSingle(),
    ])

    if (!initSticker)
      return `${trade.initiator_username} no longer has ${trade.initiator_sticker_team} #${trade.initiator_sticker_number} as a duplicate.`
    if (!respSticker)
      return `You no longer have ${trade.responder_sticker_team} #${trade.responder_sticker_number} as a duplicate.`

    // Remove both duplicates
    await Promise.all([
      supabase.from('user_stickers').delete().eq('id', initSticker.id),
      supabase.from('user_stickers').delete().eq('id', respSticker.id),
    ])

    // Add received stickers (upsert handles already-owned stickers)
    await Promise.all([
      supabase.from('user_stickers').upsert({
        user_id: trade.initiator_id,
        sticker_number: respSticker.sticker_number,
        sticker_name: respSticker.sticker_name,
        team: respSticker.team,
        status: 'have',
      }, { onConflict: 'user_id,team,sticker_number' }),
      supabase.from('user_stickers').upsert({
        user_id: trade.responder_id,
        sticker_number: initSticker.sticker_number,
        sticker_name: initSticker.sticker_name,
        team: initSticker.team,
        status: 'have',
      }, { onConflict: 'user_id,team,sticker_number' }),
    ])

    await supabase.from('trades').update({ status: 'completed' }).eq('id', trade.id)
    return null
  }

  // ── Single-trade actions (each prompts confirmation) ──
  const withConfirm = (message: string, action: () => Promise<void>) => {
    setConfirm({ message, onConfirm: () => { setConfirm(null); action() } })
  }

  const runSingle = async (action: (t: TradeRow) => Promise<string | null>, trade: TradeRow) => {
    setActing(true)
    setActionError('')
    const err = await action(trade)
    if (err) setActionError(err)
    await loadTrades(myId)
    setActing(false)
  }

  const acceptOne = (trade: TradeRow) =>
    withConfirm(
      'Accept this trade? Both collections will be updated automatically.',
      () => runSingle(doAcceptTrade, trade)
    )

  const rejectOne = (trade: TradeRow) =>
    withConfirm('Reject this trade?', () =>
      runSingle(async t => {
        const { error } = await supabase.from('trades').update({ status: 'rejected' }).eq('id', t.id)
        return error ? `Could not reject: ${error.message}` : null
      }, trade)
    )

  const cancelOne = (trade: TradeRow) =>
    withConfirm('Cancel this trade?', () =>
      runSingle(async t => {
        const { error } = await supabase.from('trades').update({ status: 'canceled' }).eq('id', t.id)
        return error ? `Could not cancel: ${error.message}` : null
      }, trade)
    )

  // ── Bulk actions ──
  const runBulk = async (action: (t: TradeRow) => Promise<string | null>) => {
    setActing(true)
    setActionError('')
    const toProcess = displayed.filter(t => selected.has(t.id))
    const errors: string[] = []
    for (const trade of toProcess) {
      const err = await action(trade)
      if (err) errors.push(err)
    }
    setSelected(new Set())
    await loadTrades(myId)
    setActing(false)
    if (errors.length) setActionError(errors[0])
  }

  const bulkAccept = () => {
    const n = selected.size
    withConfirm(
      `Accept ${n} trade${n !== 1 ? 's' : ''}? Both users' collections will be updated for each.`,
      () => runBulk(doAcceptTrade)
    )
  }

  const bulkReject = () => {
    const n = selected.size
    withConfirm(`Reject ${n} trade${n !== 1 ? 's' : ''}?`, () =>
      runBulk(async t => {
        const { error } = await supabase.from('trades').update({ status: 'rejected' }).eq('id', t.id)
        return error ? error.message : null
      })
    )
  }

  const bulkCancel = () => {
    const n = selected.size
    withConfirm(`Cancel ${n} trade${n !== 1 ? 's' : ''}?`, () =>
      runBulk(async t => {
        const { error } = await supabase.from('trades').update({ status: 'canceled' }).eq('id', t.id)
        return error ? error.message : null
      })
    )
  }

  const hasSelection = selected.size > 0

  return (
    <AppShell title="MY TRADES">
      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {([
          { key: 'incoming' as TabKey, label: `📥 Incoming`, count: incoming.length },
          { key: 'outgoing' as TabKey, label: `📤 Outgoing`, count: outgoing.length },
          { key: 'history' as TabKey, label: `📋 History`, count: history.length },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5"
            style={{
              background: tab === t.key ? 'var(--primary)' : 'var(--border)',
              color: tab === t.key ? 'white' : 'var(--text-muted)',
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'var(--primary)',
                  color: tab === t.key ? 'white' : 'white',
                  minWidth: '20px',
                  textAlign: 'center',
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk action bar — only when trades selected */}
      {hasSelection && tab !== 'history' && (
        <div
          className="px-4 py-2.5 flex items-center gap-2 flex-wrap"
          style={{ background: 'var(--bg-card)', borderBottom: '2px solid var(--primary)' }}
        >
          <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
            {selected.size} selected
          </span>
          {tab === 'incoming' && (
            <>
              <button
                onClick={bulkAccept}
                disabled={acting}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ background: 'var(--green)' }}
              >
                ✅ Accept Selected
              </button>
              <button
                onClick={bulkReject}
                disabled={acting}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ background: 'var(--primary)' }}
              >
                ❌ Reject Selected
              </button>
            </>
          )}
          <button
            onClick={bulkCancel}
            disabled={acting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
          >
            ✖ Cancel Selected
          </button>
        </div>
      )}

      {/* Error banner */}
      {actionError && (
        <div
          className="mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: '#FEE2E2', color: '#991B1B' }}
        >
          ⚠️ {actionError}
          <button
            onClick={() => setActionError('')}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 card p-6">
            <div className="text-5xl mb-3">🔄</div>
            <p style={{ color: 'var(--text-muted)' }}>
              {tab === 'incoming'
                ? 'No incoming trades right now.'
                : tab === 'outgoing'
                ? 'No outgoing trades right now.'
                : 'No trade history yet.'}
            </p>
            {tab !== 'history' && (
              <Link href="/discover" className="inline-block mt-3">
                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                  Find traders →
                </span>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Select All row */}
            {tab !== 'history' && (
              <label className="flex items-center gap-2 px-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </span>
              </label>
            )}

            {displayed.map((trade, i) => {
              const iAmInitiator = trade.initiator_id === myId
              const myOfferNum = iAmInitiator ? trade.initiator_sticker_number : trade.responder_sticker_number
              const myOfferTeam = iAmInitiator ? trade.initiator_sticker_team : trade.responder_sticker_team
              const myOfferName = iAmInitiator ? trade.initiator_sticker_name : trade.responder_sticker_name
              const theirOfferNum = iAmInitiator ? trade.responder_sticker_number : trade.initiator_sticker_number
              const theirOfferTeam = iAmInitiator ? trade.responder_sticker_team : trade.initiator_sticker_team
              const theirOfferName = iAmInitiator ? trade.responder_sticker_name : trade.initiator_sticker_name
              const otherName = iAmInitiator ? trade.responder_username : trade.initiator_username
              const isSelected = selected.has(trade.id)
              const canSelect = tab !== 'history'

              const stickerLabel = (team: string, num: number, name: string) => {
                if (!team || num === 0) return '?'
                return name ? `${name} (${team} #${num})` : `${team} #${num}`
              }

              return (
                <div
                  key={trade.id}
                  className={`card p-4 flex flex-col gap-3 transition-all fade-up fade-up-delay-${Math.min(i + 1, 4)}`}
                  style={isSelected ? { border: '2px solid var(--primary)' } : {}}
                >
                  {/* Main info row */}
                  <div className="flex items-start gap-3">
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(trade.id)}
                        style={{ width: '18px', height: '18px', marginTop: '3px', accentColor: 'var(--primary)', flexShrink: 0 }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      {/* Header: direction + status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: `hsl(${(otherName.charCodeAt(0) * 40) % 360}, 60%, 45%)` }}
                          >
                            {otherName[0]?.toUpperCase()}
                          </div>
                          <p className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
                            {iAmInitiator ? `You → ${otherName}` : `${otherName} → You`}
                          </p>
                        </div>
                        <Badge variant={STATUS_BADGE[trade.status]}>
                          {STATUS_LABEL[trade.status]}
                        </Badge>
                      </div>

                      {/* Sticker exchange */}
                      <div className="flex flex-col gap-1 mb-2">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span style={{ color: 'var(--text-muted)', minWidth: '50px' }}>You give</span>
                          <span
                            className="font-semibold px-2 py-0.5 rounded-lg truncate"
                            style={{ background: 'var(--border)', color: 'var(--text)', fontSize: '0.78rem', maxWidth: '180px' }}
                          >
                            {stickerLabel(myOfferTeam, myOfferNum, myOfferName)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span style={{ color: 'var(--text-muted)', minWidth: '50px' }}>You get</span>
                          <span
                            className="font-semibold px-2 py-0.5 rounded-lg truncate"
                            style={{ background: 'var(--border)', color: 'var(--text)', fontSize: '0.78rem', maxWidth: '180px' }}
                          >
                            {stickerLabel(theirOfferTeam, theirOfferNum, theirOfferName)}
                          </span>
                        </div>
                      </div>

                      {/* Date */}
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        🕐 {formatDate(trade.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap" style={{ paddingLeft: canSelect ? '26px' : '0' }}>
                    {tab === 'incoming' && (
                      <>
                        <button
                          onClick={() => acceptOne(trade)}
                          disabled={acting}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-opacity"
                          style={{ background: 'var(--green)', minWidth: '80px', opacity: acting ? 0.6 : 1 }}
                        >
                          ✅ Accept
                        </button>
                        <button
                          onClick={() => rejectOne(trade)}
                          disabled={acting}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-opacity"
                          style={{ background: 'var(--primary)', minWidth: '80px', opacity: acting ? 0.6 : 1 }}
                        >
                          ❌ Reject
                        </button>
                      </>
                    )}
                    {tab !== 'history' && (
                      <button
                        onClick={() => cancelOne(trade)}
                        disabled={acting}
                        className="py-2 px-3 rounded-xl text-xs font-semibold transition-opacity"
                        style={{ background: 'var(--border)', color: 'var(--text-muted)', opacity: acting ? 0.6 : 1 }}
                      >
                        ✖ Cancel
                      </button>
                    )}
                    <Link href={`/trades/${trade.id}`} className="ml-auto self-center">
                      <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
                        View →
                      </span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </AppShell>
  )
}
