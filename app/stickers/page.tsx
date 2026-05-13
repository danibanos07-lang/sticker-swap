'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { STICKER_DATA, TEAM_NAMES, getTeamPrefix } from '@/lib/stickerData'
import { Input } from '@/components/ui/Input'

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

  // Single add
  const [addTeamKey, setAddTeamKey] = useState(TEAM_NAMES[0])
  const [addStickerCode, setAddStickerCode] = useState('')
  const [addStatus, setAddStatus] = useState<'have' | 'need' | 'have_duplicate'>('have')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState(false)

  // Batch add
  const [batchTeamKey, setBatchTeamKey] = useState(TEAM_NAMES[0])
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [batchStatus, setBatchStatus] = useState<'have' | 'need' | 'have_duplicate'>('have')
  const [batching, setBatching] = useState(false)
  const [batchSuccess, setBatchSuccess] = useState(false)

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

  // Reset sticker selection when team changes
  const handleAddTeamChange = (team: string) => {
    setAddTeamKey(team)
    setAddStickerCode('')
    setAddError('')
  }

  const handleBatchTeamChange = (team: string) => {
    setBatchTeamKey(team)
    setSelectedCodes(new Set())
  }

  const toggleCode = (code: string) => {
    setSelectedCodes(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const filtered = stickers.filter(s => {
    const matchTab = tab === 'all' || tab === 'add' || s.status === tab || (tab === 'have' && s.status === 'have_duplicate')
    const matchSearch = !search || s.sticker_number.toString().includes(search) || s.sticker_name.toLowerCase().includes(search.toLowerCase())
    const matchTeam = !teamFilter || s.team === teamFilter
    return matchTab && matchSearch && matchTeam
  })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addStickerCode) { setAddError('Please select a sticker'); return }
    setAdding(true)
    setAddError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const sticker = STICKER_DATA[addTeamKey]?.find(s => s.code === addStickerCode)
    if (!sticker) { setAddError('Invalid sticker selected'); setAdding(false); return }

    const num = parseInt(addStickerCode.replace(/\D/g, ''))
    const existing = stickers.find(s => s.sticker_number === num && s.team === addTeamKey)

    let err
    if (existing) {
      const res = await supabase.from('user_stickers')
        .update({ status: addStatus, sticker_name: sticker.name })
        .eq('id', existing.id)
      err = res.error
    } else {
      const res = await supabase.from('user_stickers').insert({
        user_id: user.id,
        sticker_number: num,
        sticker_name: sticker.name,
        team: addTeamKey,
        status: addStatus,
      })
      err = res.error
    }

    if (err) { setAddError(err.message); setAdding(false); return }
    setAddStickerCode('')
    setAddSuccess(true)
    setTimeout(() => setAddSuccess(false), 2000)
    await load()
    setAdding(false)
  }

  const handleStatusChange = async (id: string, newStatus: 'have' | 'need' | 'have_duplicate') => {
    // Optimistic update
    setStickers(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))
    const { error } = await supabase.from('user_stickers').update({ status: newStatus }).eq('id', id)
    if (error) await load() // rollback on failure
  }

  const handleDelete = async (id: string) => {
    // Optimistic update
    setStickers(prev => prev.filter(s => s.id !== id))
    const { error } = await supabase.from('user_stickers').delete().eq('id', id)
    if (error) await load() // rollback on failure
  }

  const handleBatch = async () => {
    if (selectedCodes.size === 0) return
    setBatching(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const teamStickers = STICKER_DATA[batchTeamKey] || []
    const rows = [...selectedCodes].map(code => {
      const sticker = teamStickers.find(s => s.code === code)!
      const num = parseInt(code.replace(/\D/g, ''))
      return {
        user_id: user.id,
        sticker_number: num,
        sticker_name: sticker.name,
        team: batchTeamKey,
        status: batchStatus,
      }
    })

    await supabase.from('user_stickers').upsert(rows, { onConflict: 'user_id,team,sticker_number' })
    setSelectedCodes(new Set())
    setBatchSuccess(true)
    setTimeout(() => setBatchSuccess(false), 2000)
    await load()
    setBatching(false)
  }

const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'all', label: `All (${stickers.length})` },
    { key: 'have', label: `Have (${stickers.filter(s => s.status === 'have' || s.status === 'have_duplicate').length})` },
    { key: 'need', label: `Need (${stickers.filter(s => s.status === 'need').length})` },
    { key: 'add', label: '+ Add' },
  ]

  const selectStyle = {
    background: 'var(--bg-input)',
    color: 'var(--text)',
    borderColor: 'var(--border)',
  }

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
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'add' ? (
        <div className="p-4 flex flex-col gap-4">

          {/* ── Single Add ── */}
          <div className="card p-4">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text)', marginBottom: '1rem' }}>
              ADD SINGLE STICKER
            </h3>
            <form onSubmit={handleAdd} className="flex flex-col gap-3">

              {/* Step 1: Team */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>1. Select Team</label>
                <select
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none"
                  style={selectStyle}
                  value={addTeamKey}
                  onChange={e => handleAddTeamChange(e.target.value)}
                >
                  {TEAM_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Step 2: Sticker */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>2. Select Sticker</label>
                <select
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none"
                  style={selectStyle}
                  value={addStickerCode}
                  onChange={e => setAddStickerCode(e.target.value)}
                >
                  <option value="">-- Choose sticker --</option>
                  {(STICKER_DATA[addTeamKey] || []).map(s => (
                    <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
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

          {/* ── Batch Entry ── */}
          <div className="card p-4">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
              BATCH ENTRY
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Select a team, then tap the stickers you want to add at once.
            </p>
            <div className="flex flex-col gap-3">

              {/* Team selector */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Team</label>
                <select
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none"
                  style={selectStyle}
                  value={batchTeamKey}
                  onChange={e => handleBatchTeamChange(e.target.value)}
                >
                  {TEAM_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Sticker grid */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Stickers {selectedCodes.size > 0 && (
                      <span style={{ color: 'var(--primary)' }}>({selectedCodes.size} selected)</span>
                    )}
                  </label>
                  {selectedCodes.size > 0 && (
                    <button
                      onClick={() => setSelectedCodes(new Set())}
                      className="text-xs"
                      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(STICKER_DATA[batchTeamKey] || []).map(s => {
                    const active = selectedCodes.has(s.code)
                    return (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => toggleCode(s.code)}
                        title={s.name}
                        className="py-2 px-1 rounded-lg text-xs font-bold transition-all text-center leading-tight"
                        style={{
                          background: active ? 'var(--primary)' : 'var(--border)',
                          color: active ? 'white' : 'var(--text-muted)',
                        }}
                      >
                        {s.code}
                      </button>
                    )
                  })}
                </div>
                {selectedCodes.size > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[...selectedCodes].sort().map(code => {
                      const sticker = STICKER_DATA[batchTeamKey]?.find(s => s.code === code)
                      return (
                        <span
                          key={code}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--primary)', color: 'white' }}
                        >
                          {code} — {sticker?.name}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex gap-2">
                {(['have', 'need', 'have_duplicate'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBatchStatus(s)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: batchStatus === s ? 'var(--primary)' : 'var(--border)',
                      color: batchStatus === s ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {s === 'have' ? '✅ Have' : s === 'need' ? '❓ Need' : '⭐ Dupe'}
                  </button>
                ))}
              </div>

              {batchSuccess && <p className="text-sm" style={{ color: 'var(--green)' }}>✅ Saved!</p>}
              <Button
                onClick={handleBatch}
                variant="secondary"
                size="md"
                loading={batching}
                disabled={selectedCodes.size === 0}
                className="w-full"
              >
                Save {selectedCodes.size > 0 ? `${selectedCodes.size} Sticker${selectedCodes.size !== 1 ? 's' : ''}` : 'All'}
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
              style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }}
            >
              <option value="">All Teams</option>
              {TEAM_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
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
              {filtered.map(s => {
                const prefix = getTeamPrefix(s.team)
                const code = prefix ? `${prefix}${s.sticker_number}` : `#${s.sticker_number}`
                return (
                  <div key={s.id} className="card px-4 py-3 flex flex-col gap-2">
                    {/* Top row: code + name + delete */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs flex-shrink-0 text-center"
                        style={{ background: 'var(--primary)', fontFamily: 'var(--font-display)' }}
                      >
                        {code}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{s.sticker_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>🏳️ {s.team}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-all"
                        style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
                        title="Remove sticker"
                      >
                        🗑
                      </button>
                    </div>
                    {/* Status toggle row */}
                    <div className="flex gap-1.5">
                      {(['have', 'need', 'have_duplicate'] as const).map(st => {
                        const active = s.status === st
                        const label = st === 'have' ? '✅ Have' : st === 'need' ? '❓ Need' : '⭐ Dupe'
                        return (
                          <button
                            key={st}
                            onClick={() => !active && handleStatusChange(s.id, st)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              background: active ? 'var(--primary)' : 'var(--border)',
                              color: active ? 'white' : 'var(--text-muted)',
                              cursor: active ? 'default' : 'pointer',
                              fontWeight: active ? 700 : 500,
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
