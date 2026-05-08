'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserSticker, TradePair } from '@/lib/types'
import { Button } from '@/components/ui/Button'

interface Props {
  myId: string
  otherUserId: string
  otherUsername: string
  initialPair?: TradePair
  onConfirm: (pair: TradePair) => Promise<void>
  onClose: () => void
}

export function ProposeTradeModal({
  myId, otherUserId, otherUsername, initialPair, onConfirm, onClose,
}: Props) {
  const supabase = createClient()
  const [myDuplicates, setMyDuplicates] = useState<UserSticker[]>([])
  const [theirDuplicates, setTheirDuplicates] = useState<UserSticker[]>([])
  const [give, setGive] = useState<UserSticker | null>(null)
  const [receive, setReceive] = useState<UserSticker | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: mine }, { data: theirs }] = await Promise.all([
        supabase.from('user_stickers').select('*').eq('user_id', myId).eq('status', 'have_duplicate').order('team').order('sticker_number'),
        supabase.from('user_stickers').select('*').eq('user_id', otherUserId).eq('status', 'have_duplicate').order('team').order('sticker_number'),
      ])

      const myList = (mine as UserSticker[]) || []
      const theirList = (theirs as UserSticker[]) || []
      setMyDuplicates(myList)
      setTheirDuplicates(theirList)

      if (initialPair) {
        const g = myList.find(s => s.team === initialPair.give.team && s.sticker_number === initialPair.give.sticker_number)
        const r = theirList.find(s => s.team === initialPair.receive.team && s.sticker_number === initialPair.receive.sticker_number)
        if (g) setGive(g)
        if (r) setReceive(r)
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleConfirm = async () => {
    if (!give || !receive) return
    setSending(true)
    await onConfirm({
      give: { sticker_number: give.sticker_number, team: give.team, sticker_name: give.sticker_name },
      receive: { sticker_number: receive.sticker_number, team: receive.team, sticker_name: receive.sticker_name },
    })
    setSending(false)
  }

  const stickerOption = (s: UserSticker) => `${s.team} #${s.sticker_number} — ${s.sticker_name}`
  const stickerKey = (s: UserSticker) => `${s.team}||${s.sticker_number}`

  return (
    <>
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.72)', zIndex: 200 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(92vw, 440px)',
        background: 'var(--bg-card)', borderRadius: '24px',
        padding: '24px 20px', zIndex: 201,
        display: 'flex', flexDirection: 'column', gap: '14px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Trade Proposal
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text)' }}>
            With {otherUsername}
          </h2>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading stickers...
          </div>
        ) : (
          <>
            {/* What you give */}
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
                You give — your duplicate stickers
              </p>
              {myDuplicates.length === 0 ? (
                <div className="px-3 py-3 rounded-xl text-xs text-center" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                  You have no duplicate stickers. Add some in your Album first.
                </div>
              ) : (
                <select
                  value={give ? stickerKey(give) : ''}
                  onChange={e => setGive(myDuplicates.find(s => stickerKey(s) === e.target.value) || null)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '12px',
                    background: 'var(--bg-input)', color: 'var(--text)',
                    border: '2px solid var(--border)', fontSize: '0.83rem',
                  }}
                >
                  <option value="">Select a sticker to give...</option>
                  {myDuplicates.map(s => (
                    <option key={stickerKey(s)} value={stickerKey(s)}>
                      {stickerOption(s)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="text-center text-xl" style={{ color: 'var(--gold)' }}>⇄</div>

            {/* What you get */}
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green)', marginBottom: '6px' }}>
                You get — {otherUsername}'s duplicate stickers
              </p>
              {theirDuplicates.length === 0 ? (
                <div className="px-3 py-3 rounded-xl text-xs text-center" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                  {otherUsername} has no duplicate stickers yet.
                </div>
              ) : (
                <select
                  value={receive ? stickerKey(receive) : ''}
                  onChange={e => setReceive(theirDuplicates.find(s => stickerKey(s) === e.target.value) || null)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '12px',
                    background: 'var(--bg-input)', color: 'var(--text)',
                    border: '2px solid var(--border)', fontSize: '0.83rem',
                  }}
                >
                  <option value="">Select a sticker to request...</option>
                  {theirDuplicates.map(s => (
                    <option key={stickerKey(s)} value={stickerKey(s)}>
                      {stickerOption(s)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Summary card — only shown when both are selected */}
            {give && receive && (
              <div style={{
                background: 'var(--border)',
                borderRadius: '14px',
                padding: '12px 14px',
                borderLeft: '3px solid var(--gold)',
              }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Summary
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text)', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Give: </span>
                  {give.team} #{give.sticker_number} — {give.sticker_name}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>Get: </span>
                  {receive.team} #{receive.sticker_number} — {receive.sticker_name}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                loading={sending}
                disabled={!give || !receive}
                onClick={handleConfirm}
              >
                📤 Send Proposal
              </Button>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '0.85rem', padding: '6px',
                  textAlign: 'center',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
