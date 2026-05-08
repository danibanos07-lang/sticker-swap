'use client'
import { useRef, useState } from 'react'
import { STICKER_DATA, getTeamPrefix } from '@/lib/stickerData'
import { Button } from '@/components/ui/Button'

type ScanState = 'idle' | 'processing' | 'results' | 'error'

interface Props {
  teamKey: string
  onConfirm: (codes: string[]) => Promise<void>
}

export function ScanPagePanel({ teamKey, onConfirm }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [detectedCodes, setDetectedCodes] = useState<string[]>([])
  const [missingCodes, setMissingCodes] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const teamStickers = STICKER_DATA[teamKey] || []
  const prefix = getTeamPrefix(teamKey)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (inputRef.current) inputRef.current.value = ''
    setScanState('processing')

    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, {
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        logger: () => {},
      })

      await worker.setParameters({
        // Only recognize uppercase letters and digits — filters out noise
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        // PSM 11: sparse text — best for codes scattered around a page
        tessedit_pageseg_mode: 11 as unknown as import('tesseract.js').PSM,
      })

      const { data } = await worker.recognize(file)
      await worker.terminate()

      const upperText = data.text.toUpperCase()

      // Handle OCR inserting a space between the letter prefix and the number,
      // e.g. "MEX 14" or "MEX14". Both are matched and normalised.
      const rawMatches = [...upperText.matchAll(/\b([A-Z]{2,4})\s?(\d{1,2})\b/g)]
        .map(m => `${m[1]}${m[2]}`)

      const validCodes = new Set(teamStickers.map(s => s.code))
      const detected = [...new Set(
        rawMatches.filter(code => code.replace(/\d+$/, '') === prefix && validCodes.has(code))
      )]

      const detectedSet = new Set(detected)
      const missing = teamStickers.map(s => s.code).filter(c => !detectedSet.has(c))

      setDetectedCodes(detected)
      setMissingCodes(missing)
      setSelected(new Set(missing))
      setScanState(detected.length === 0 ? 'error' : 'results')
    } catch (err) {
      console.error('Scan error:', err)
      setScanState('error')
    }
  }

  const toggle = (code: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(code) ? next.delete(code) : next.add(code)
    return next
  })

  const handleConfirm = async () => {
    if (selected.size === 0) return
    setSaving(true)
    await onConfirm([...selected])
    setSaving(false)
    reset()
  }

  const reset = () => {
    setScanState('idle')
    setDetectedCodes([])
    setMissingCodes([])
    setSelected(new Set())
  }

  const triggerCamera = () => inputRef.current?.click()

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        {...{ capture: 'environment' }}
        className="hidden"
        onChange={handleFileChange}
      />

      {scanState === 'idle' && (
        <button
          type="button"
          onClick={triggerCamera}
          className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
          style={{
            background: 'transparent',
            color: 'var(--text)',
            border: '2px dashed var(--text-muted)',
          }}
        >
          📷 Scan Album Page
        </button>
      )}

      {scanState === 'processing' && (
        <div className="flex flex-col items-center py-8 gap-3">
          <div
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Reading your album page…</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This takes a few seconds</p>
        </div>
      )}

      {scanState === 'error' && (
        <div className="rounded-xl p-4 flex flex-col items-center gap-3 text-center" style={{ background: 'var(--border)' }}>
          <div className="text-3xl">🔦</div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Couldn't read the page</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Try better lighting, hold steady, and ensure sticker codes are fully visible.
            </p>
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => { reset(); triggerCamera() }}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--primary)' }}
            >
              Try Again
            </button>
            <button
              onClick={reset}
              className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {scanState === 'results' && (
        <div className="flex flex-col gap-3">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--border)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--green)', fontFamily: 'var(--font-display)' }}>{detectedCodes.length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Detected on page</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--border)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>{missingCodes.length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Missing stickers</p>
            </div>
          </div>

          {missingCodes.length === 0 ? (
            <div className="rounded-xl p-5 text-center" style={{ background: 'var(--border)' }}>
              <div className="text-3xl mb-2">🎉</div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>No missing stickers!</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>All {prefix} stickers detected on this page.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Missing — tap to toggle
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelected(new Set(missingCodes))}
                    className="text-xs font-bold"
                    style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-xs"
                    style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {missingCodes.map(code => {
                  const sticker = teamStickers.find(s => s.code === code)
                  const isSelected = selected.has(code)
                  const isFoil = sticker?.name.toLowerCase().includes('foil')
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggle(code)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left active:scale-95"
                      style={{ background: isSelected ? 'var(--primary)' : 'var(--border)' }}
                    >
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{
                          background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                          color: isSelected ? 'white' : 'var(--text-muted)',
                        }}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                      <span
                        className="font-bold text-xs flex-shrink-0"
                        style={{ color: isSelected ? 'white' : 'var(--text)', minWidth: '44px' }}
                      >
                        {code}
                      </span>
                      <span
                        className="text-xs flex-1 truncate"
                        style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}
                      >
                        {isFoil ? '✨ ' : ''}{sticker?.name.replace(' FOIL', '')}
                      </span>
                    </button>
                  )
                })}
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full"
                loading={saving}
                disabled={selected.size === 0}
                onClick={handleConfirm}
              >
                ❓ Add {selected.size} to Need List
              </Button>
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { reset(); triggerCamera() }}
              className="flex-1 py-2 rounded-xl text-xs font-bold"
              style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
            >
              📷 Scan Again
            </button>
            <button
              onClick={reset}
              className="flex-1 py-2 rounded-xl text-xs font-bold"
              style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
