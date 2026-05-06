'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { WC2026_TEAMS, WC2026Team } from '@/lib/types'

interface UserSticker {
  id: string
  sticker_number: number
  sticker_name: string
  team: string
  status: 'have' | 'need' | 'have_duplicate'
}

type ActiveTab = 'all' | 'have' | 'need' | 'add'

export default function Stickers() {
  const [stickers, setStickers] = useState<UserSticker[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ActiveTab>('all')
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')

  // Add form
  const [addNum, setAddNum] = useState('')
  const [addName, setAddName] = useState('')
  const [addTeam, setAddTeam] = useState<WC2026Team>('Argentina')
  const [addStatus, setAddStatus] = useState<'have' | 'need' | 'have_duplicate'>('have')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState(false)

  // Batch add
  const [batchNums, setBatchNums] = useState('')
  const [batchTeam, setBatchTeam] = useState<WC2026Team>('Argentina')
  const [batchStatus, setBatchStatus] = useState<'have' | 'need'>('have')
  const [batching, setBatching] = useState(false)

  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('user_stickers')
      .select('*')
      .eq('user_id', user.id)
      .order('sticker_number', { ascending: true })
    setStickers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = stickers.filter(s => {
    const matchTab = tab === 'all' || tab === 'add' || s.status === tab || (tab === 'have' && s.status === 'have_duplicate')
    const matchSearch = !search || s.sticker_number.toString().includes(search) || s.sticker_name.toLowerCase().includes(search.toLowerCase())
    const matchTeam = !teamFilter || s.team === teamFilter
    return matchTab && matchSearch && matchTeam
  })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addNum) { setAddError('Sticker number is required'); return }
    setAdding(true)
    setAddError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const num = parseInt(addNum)
    // Check if already exists → update status
    const existing = stickers.find(s => s.sticker_number === num && s.team === addTeam)
    let err
    if (existing) {
      const res = await supabase.from('user_stickers').update({ status: addStatus, sticker_name: addName || existing.sticker_name, team: addTeam }).eq('id', existing.id)
      err = res.error
    } else {
      const res = await supabase.from('user_stickers').insert({
        user_id: user.id,
        sticker_number: num,
        sticker_name: addName || `Sticker #${num}`,
        team: addTeam,
        status: addStatus,
      })
      err = res.error
    }

    if (err) { setAddError(err.message); setAdding(false); return }
    setAddNum(''); setAddName(''); setAddSuccess(true)
    setTimeout(() => setAddSuccess(false), 2000)
    await load()
    setAdding(false)
  }

  const handleBatch = async () => {
    const nums = batchNums.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    if (!nums.length) return
    setBatching(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const rows = nums.map(n => ({
      user_id: user.id,
      sticker_number: n,
      sticker_name: `${batchTeam} #${n}`,
      team: batchTeam,
      status: batchStatus,
    }))

    await supabase.from('user_stickers').upsert(rows, { onConflict: 'user_id,team,sticker_number' })
    setBatchNums('')
    await load()
    setBatching(false)
  }

  const statusColors: Record<string, 'success' | 'error' | 'warning'> = {
    have: 'success',
    have_duplicate: 'warning',
    need: 'error',
  }

  const statusLabels: Record<string, string> = {
    have: '✅ Have',
    have_duplicate: '⭐ Dupe',
    need: '❓ Need',
  }

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'all', label: `All (${stickers.length})` },
    { key: 'have', label: `Have (${stickers.filter(s => s.status === 'have' || s.status === 'have_duplicate').length})` },
    { key: 'need', label: `Need (${stickers.filter(s => s.status === 'need').length})` },
    { key: 'add', label: '+ Add' },
  ]

  return (
    <AppShell title="MY ALBUM">
      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
            style={{
              background: tab === t.key ? 'var(--primary)' : 'var(--border)',
              color: tab === t.key ? 'white' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'add' ? (
        <div className="p-4 flex flex-col gap-4">
          {/* Single add */}
          <div className="card p-4">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text)', marginBottom: '1rem' }}>
              ADD SINGLE STICKER
            </h3>
            <form onSubmit={handleAdd} className="flex flex-col gap-3">
              <Input label="Sticker Number *" type="number" value={addNum} onChange={e => setAddNum(e.target.value)} placeholder="e.g. 42" min="1" max="999" />
              <Input label="Player / Card Name" type="text" value={addName} onChange={e => setAddName(e.target.value)} placeholder="e.g. Lionel Messi" />
              <Select label="Team" value={addTeam} onChange={e => setAddTeam(e.target.value as WC2026Team)}>
                {WC2026_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Status</label>
                <div className="flex gap-2">
                  {(['have', 'need', 'have_duplicate'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAddStatus(s)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: addStatus === s ? 'var(--primary)' : 'var(--border)',
                        color: addStatus === s ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      {s === 'have' ? '✅ Have' : s === 'need' ? '❓ Need' : '⭐ Dupe'}
                    </button>
                  ))}
                </div>
              </div>
              {addError && <p className="text-sm text-red-500">{addError}</p>}
              {addSuccess && <p className="text-sm" style={{ color: 'var(--green)' }}>✅ Saved!</p>}
              <Button type="submit" variant="primary" size="md" loading={adding} className="w-full">
                Save Sticker
              </Button>
            </form>
          </div>

          {/* Batch add */}
          <div className="card p-4">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
              BATCH ENTRY
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Enter multiple sticker numbers separated by commas</p>
            <div className="flex flex-col gap-3">
              <Select label="Team" value={batchTeam} onChange={e => setBatchTeam(e.target.value as WC2026Team)}>
                {WC2026_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Input
                label="Sticker Numbers"
                value={batchNums}
                onChange={e => setBatchNums(e.target.value)}
                placeholder="1, 5, 12, 34, 67..."
              />
              <div className="flex gap-2">
                {(['have', 'need'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setBatchStatus(s)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: batchStatus === s ? 'var(--primary)' : 'var(--border)',
                      color: batchStatus === s ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {s === 'have' ? '✅ I Have These' : '❓ I Need These'}
                  </button>
                ))}
              </div>
              <Button onClick={handleBatch} variant="secondary" size="md" loading={batching} className="w-full">
                Save All
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4">
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <Input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border-2 text-sm"
              style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)', fontFamily: 'var(--font-body)' }}
            >
              <option value="">All Teams</option>
              {WC2026_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading album...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📋</div>
              <p style={{ color: 'var(--text-muted)' }}>
                {tab === 'all' ? 'No stickers yet. Tap "+ Add" to start!' : `No "${tab}" stickers.`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(s => (
                <div key={s.id} className="card px-4 py-3 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ background: 'var(--primary)', fontFamily: 'var(--font-display)' }}
                  >
                    {s.sticker_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{s.sticker_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>🏳️ {s.team}</p>
                  </div>
                  <Badge variant={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
