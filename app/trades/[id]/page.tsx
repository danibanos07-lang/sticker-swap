'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { UserSticker } from '@/lib/types'

type TradeStatus = 'pending' | 'accepted' | 'completed' | 'rejected' | 'canceled'

interface TradeDetail {
  id: string
  initiator_id: string
  responder_id: string
  status: TradeStatus
  initiator_sticker_number: number
  initiator_sticker_team: string
  initiator_sticker_name: string
  responder_sticker_number: number
  responder_sticker_team: string
  responder_sticker_name: string
  initiator_username: string
  responder_username: string
}

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  sender_username?: string
}

const STATUS_BADGE: Record<TradeStatus, 'warning' | 'success' | 'default' | 'error' | 'info'> = {
  pending: 'warning',
  accepted: 'success',
  completed: 'info',
  rejected: 'error',
  canceled: 'default',
}

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
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(88vw, 360px)',
        background: 'var(--bg-card)', borderRadius: '20px',
        padding: '24px 20px', zIndex: 201,
        display: 'flex', flexDirection: 'column', gap: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <p style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'center', fontSize: '0.95rem', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '11px', borderRadius: '12px',
            background: 'var(--border)', color: 'var(--text-muted)',
            fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.875rem',
          }}>
            Go back
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '11px', borderRadius: '12px',
            background: 'var(--primary)', color: 'white',
            fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.875rem',
          }}>
            Confirm
          </button>
        </div>
      </div>
    </>
  )
}

function StickerSelect({
  stickers,
  selectedTeam,
  selectedNumber,
  onChange,
  placeholder,
  disabled,
  emptyMessage,
}: {
  stickers: UserSticker[]
  selectedTeam: string
  selectedNumber: number
  onChange: (sticker: UserSticker) => void
  placeholder: string
  disabled?: boolean
  emptyMessage?: string
}) {
  const value = selectedTeam && selectedNumber ? `${selectedTeam}||${selectedNumber}` : ''

  if (stickers.length === 0) {
    return (
      <div
        className="w-full px-3 py-3 rounded-xl text-center text-xs"
        style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
      >
        {emptyMessage || 'No stickers available'}
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={e => {
        const s = stickers.find(st => `${st.team}||${st.sticker_number}` === e.target.value)
        if (s) onChange(s)
      }}
      disabled={disabled}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: '12px',
        background: 'var(--bg-input)', color: 'var(--text)',
        border: '2px solid var(--border)', fontSize: '0.82rem',
        appearance: 'auto',
      }}
    >
      <option value="">{placeholder}</option>
      {stickers.map(s => (
        <option key={`${s.team}||${s.sticker_number}`} value={`${s.team}||${s.sticker_number}`}>
          {s.team} #{s.sticker_number} — {s.sticker_name}
        </option>
      ))}
    </select>
  )
}

function StickerDisplay({ team, number, name, label }: {
  team: string; number: number; name: string; label: string
}) {
  return (
    <div>
      <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {team && number > 0 ? (
        <div
          className="px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--border)' }}
        >
          <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>
            {team} #{number}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{name || '—'}</p>
        </div>
      ) : (
        <div
          className="px-3 py-2.5 rounded-xl text-center text-xs"
          style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
        >
          Not set yet
        </div>
      )}
    </div>
  )
}

export default function TradePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [myId, setMyId] = useState('')
  const [trade, setTrade] = useState<TradeDetail | null>(null)
  const [myDuplicates, setMyDuplicates] = useState<UserSticker[]>([])
  const [theirDuplicates, setTheirDuplicates] = useState<UserSticker[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [actionError, setActionError] = useState('')
  const [acting, setActing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: t } = await supabase.from('trades').select('*').eq('id', id).single()
      if (!t) { router.push('/trades'); return }

      const otherId = t.initiator_id === user.id ? t.responder_id : t.initiator_id

      const [
        { data: initProfile },
        { data: respProfile },
        { data: myDupes },
        { data: theirDupes },
        { data: msgs },
      ] = await Promise.all([
        supabase.from('profiles').select('username').eq('user_id', t.initiator_id).single(),
        supabase.from('profiles').select('username').eq('user_id', t.responder_id).single(),
        supabase.from('user_stickers').select('*').eq('user_id', user.id).eq('status', 'have_duplicate').order('team').order('sticker_number'),
        supabase.from('user_stickers').select('*').eq('user_id', otherId).eq('status', 'have_duplicate').order('team').order('sticker_number'),
        supabase.from('messages').select('*').eq('trade_id', id).order('created_at', { ascending: true }),
      ])

      setTrade({
        ...t,
        initiator_username: initProfile?.username || 'Unknown',
        responder_username: respProfile?.username || 'Unknown',
      })
      setMyDuplicates((myDupes as UserSticker[]) || [])
      setTheirDuplicates((theirDupes as UserSticker[]) || [])

      if (msgs) {
        const senderIds = [...new Set(msgs.map((m: Record<string, string>) => m.sender_id))]
        const { data: profiles } = await supabase.from('profiles').select('user_id, username').in('user_id', senderIds)
        const pMap = Object.fromEntries((profiles || []).map((p: Record<string, string>) => [p.user_id, p.username]))
        setMessages(msgs.map((m: Record<string, string>) => ({ ...m, sender_username: pMap[m.sender_id] || 'User' })))
      }
      setLoading(false)
    }
    init()

    const channel = supabase
      .channel(`trade-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `trade_id=eq.${id}` },
        async (payload: Record<string, unknown>) => {
          const m = payload.new as Record<string, string>
          const { data: p } = await supabase.from('profiles').select('username').eq('user_id', m.sender_id).single()
          setMessages(prev => [...prev, { ...m, sender_username: p?.username || 'User' } as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!msgText.trim() || !myId) return
    setSending(true)
    await supabase.from('messages').insert({ trade_id: id, sender_id: myId, content: msgText.trim() })
    setMsgText('')
    setSending(false)
  }

  const setInitiatorSticker = async (sticker: UserSticker) => {
    await supabase.from('trades').update({
      initiator_sticker_number: sticker.sticker_number,
      initiator_sticker_team: sticker.team,
      initiator_sticker_name: sticker.sticker_name,
    }).eq('id', id)
    setTrade(prev => prev ? {
      ...prev,
      initiator_sticker_number: sticker.sticker_number,
      initiator_sticker_team: sticker.team,
      initiator_sticker_name: sticker.sticker_name,
    } : prev)
  }

  const setResponderSticker = async (sticker: UserSticker) => {
    await supabase.from('trades').update({
      responder_sticker_number: sticker.sticker_number,
      responder_sticker_team: sticker.team,
      responder_sticker_name: sticker.sticker_name,
    }).eq('id', id)
    setTrade(prev => prev ? {
      ...prev,
      responder_sticker_number: sticker.sticker_number,
      responder_sticker_team: sticker.team,
      responder_sticker_name: sticker.sticker_name,
    } : prev)
  }

  const withConfirm = (message: string, action: () => Promise<void>) => {
    setConfirm({ message, onConfirm: () => { setConfirm(null); action() } })
  }

  const handleAccept = async () => {
    if (!trade) return
    setActing(true)
    setActionError('')

    if (!trade.initiator_sticker_team || trade.initiator_sticker_number === 0) {
      setActionError('The other user has not selected which sticker they are offering yet.')
      setActing(false)
      return
    }
    if (!trade.responder_sticker_team || trade.responder_sticker_number === 0) {
      setActionError('The other user has not selected which sticker they want from you yet.')
      setActing(false)
      return
    }

    // Validate both stickers are still duplicates
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

    if (!initSticker) {
      setActionError(`${trade.initiator_username} no longer has ${trade.initiator_sticker_team} #${trade.initiator_sticker_number} as a duplicate.`)
      setActing(false)
      return
    }
    if (!respSticker) {
      setActionError(`You no longer have ${trade.responder_sticker_team} #${trade.responder_sticker_number} as a duplicate.`)
      setActing(false)
      return
    }

    // Swap collections
    await Promise.all([
      supabase.from('user_stickers').delete().eq('id', initSticker.id),
      supabase.from('user_stickers').delete().eq('id', respSticker.id),
    ])
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

    await supabase.from('trades').update({ status: 'completed' }).eq('id', id)
    setTrade(prev => prev ? { ...prev, status: 'completed' } : prev)
    setActing(false)
  }

  const handleReject = async () => {
    await supabase.from('trades').update({ status: 'rejected' }).eq('id', id)
    setTrade(prev => prev ? { ...prev, status: 'rejected' } : prev)
  }

  const handleCancel = async () => {
    await supabase.from('trades').update({ status: 'canceled' }).eq('id', id)
    setTrade(prev => prev ? { ...prev, status: 'canceled' } : prev)
  }

  const iAmInitiator = trade?.initiator_id === myId
  const isPending = trade?.status === 'pending'
  const isTerminal = ['completed', 'rejected', 'canceled'].includes(trade?.status || '')
  const otherUsername = trade
    ? (iAmInitiator ? trade.responder_username : trade.initiator_username)
    : '...'

  // From current user's perspective:
  // myOffer = what I give, theirOffer = what I receive
  const myOfferTeam = iAmInitiator ? trade?.initiator_sticker_team : trade?.responder_sticker_team
  const myOfferNumber = iAmInitiator ? trade?.initiator_sticker_number : trade?.responder_sticker_number
  const myOfferName = iAmInitiator ? trade?.initiator_sticker_name : trade?.responder_sticker_name
  const theirOfferTeam = iAmInitiator ? trade?.responder_sticker_team : trade?.initiator_sticker_team
  const theirOfferNumber = iAmInitiator ? trade?.responder_sticker_number : trade?.initiator_sticker_number
  const theirOfferName = iAmInitiator ? trade?.responder_sticker_name : trade?.initiator_sticker_name

  return (
    <AppShell showNav={false}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => router.push('/trades')}
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: '1.1rem' }}>
            Trade with {otherUsername}
          </p>
        </div>
        {trade && <Badge variant={STATUS_BADGE[trade.status]}>{trade.status}</Badge>}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div className="flex flex-col">
          {/* Trade proposal card */}
          <div className="p-4 card mx-4 mt-4" style={{ borderTop: '4px solid var(--gold)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', marginBottom: '1rem' }}>
              STICKER EXCHANGE
            </h3>

            {/* ── INITIATOR view: both sides editable ── */}
            {iAmInitiator && isPending && (
              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    What you're offering (your duplicates)
                  </p>
                  <StickerSelect
                    stickers={myDuplicates}
                    selectedTeam={trade?.initiator_sticker_team || ''}
                    selectedNumber={trade?.initiator_sticker_number || 0}
                    onChange={setInitiatorSticker}
                    placeholder="Select a sticker to give..."
                    emptyMessage="You have no duplicate stickers. Add some in your Album."
                  />
                </div>
                <div
                  className="flex items-center justify-center text-lg"
                  style={{ color: 'var(--gold)' }}
                >
                  ⇄
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    What you want from {otherUsername} (their duplicates)
                  </p>
                  <StickerSelect
                    stickers={theirDuplicates}
                    selectedTeam={trade?.responder_sticker_team || ''}
                    selectedNumber={trade?.responder_sticker_number || 0}
                    onChange={setResponderSticker}
                    placeholder="Select a sticker to request..."
                    emptyMessage={`${otherUsername} has no duplicate stickers available.`}
                  />
                </div>
              </div>
            )}

            {/* ── RESPONDER view (pending): read-only summary ── */}
            {!iAmInitiator && isPending && (
              <div className="flex flex-col gap-3 mb-4">
                <StickerDisplay
                  label={`${trade?.initiator_username} offers you`}
                  team={theirOfferTeam || ''}
                  number={theirOfferNumber || 0}
                  name={theirOfferName || ''}
                />
                <div
                  className="flex items-center justify-center text-lg"
                  style={{ color: 'var(--gold)' }}
                >
                  ⇄
                </div>
                <StickerDisplay
                  label="They want from you"
                  team={myOfferTeam || ''}
                  number={myOfferNumber || 0}
                  name={myOfferName || ''}
                />
              </div>
            )}

            {/* ── Terminal / non-pending: read-only summary for both ── */}
            {(!isPending || (iAmInitiator && !isPending)) && !isPending && (
              <div className="flex flex-col gap-3 mb-4">
                <StickerDisplay
                  label="You gave"
                  team={myOfferTeam || ''}
                  number={myOfferNumber || 0}
                  name={myOfferName || ''}
                />
                <div className="flex items-center justify-center text-lg" style={{ color: 'var(--gold)' }}>⇄</div>
                <StickerDisplay
                  label="You received"
                  team={theirOfferTeam || ''}
                  number={theirOfferNumber || 0}
                  name={theirOfferName || ''}
                />
              </div>
            )}

            {/* Error */}
            {actionError && (
              <div className="mb-3 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                ⚠️ {actionError}
              </div>
            )}

            {/* Action buttons */}
            {isPending && !iAmInitiator && (
              <div className="flex gap-2 mb-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  loading={acting}
                  onClick={() => withConfirm(
                    'Accept this trade? Both sticker collections will be updated automatically.',
                    handleAccept
                  )}
                >
                  ✅ Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => withConfirm('Reject this trade?', handleReject)}
                >
                  ❌ Reject
                </Button>
              </div>
            )}

            {isPending && (
              <button
                onClick={() => withConfirm('Cancel this trade?', handleCancel)}
                className="w-full py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--border)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
              >
                ✖ Cancel Trade
              </button>
            )}

            {trade?.status === 'completed' && (
              <div className="px-4 py-3 rounded-xl text-center text-sm font-bold" style={{ background: '#D1FAE5', color: '#065F46' }}>
                🏆 Trade completed — collections updated!
              </div>
            )}
            {trade?.status === 'rejected' && (
              <div className="px-4 py-3 rounded-xl text-center text-sm font-semibold" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                ❌ Trade was rejected
              </div>
            )}
            {trade?.status === 'canceled' && (
              <div className="px-4 py-3 rounded-xl text-center text-sm font-semibold" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                ✖ Trade was canceled
              </div>
            )}
          </div>

          {/* Messages */}
          <div
            className="overflow-y-auto px-4 py-3 flex flex-col gap-2"
            style={{ minHeight: '160px', maxHeight: '35vh' }}
          >
            {messages.length === 0 && (
              <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>
                No messages yet. Say hi! 👋
              </p>
            )}
            {messages.map(m => {
              const isMe = m.sender_id === myId
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{m.sender_username}</p>
                  )}
                  <div
                    className="px-4 py-2 rounded-2xl max-w-xs text-sm"
                    style={{
                      background: isMe ? 'var(--primary)' : 'var(--bg-card)',
                      color: isMe ? 'white' : 'var(--text)',
                      border: isMe ? 'none' : '1px solid var(--border)',
                      borderBottomRightRadius: isMe ? '4px' : '16px',
                      borderBottomLeftRadius: isMe ? '16px' : '4px',
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Message input */}
          {!isTerminal && (
            <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <input
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 rounded-xl border-2"
                style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)', fontFamily: 'var(--font-body)' }}
              />
              <Button variant="primary" size="sm" onClick={sendMessage} loading={sending} style={{ minWidth: '48px' }}>
                {sending ? '' : '→'}
              </Button>
            </div>
          )}
        </div>
      )}

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
