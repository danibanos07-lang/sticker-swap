'use client'
import { useRef, useState, useEffect } from 'react'
import { STICKER_DATA, getTeamPrefix } from '@/lib/stickerData'
import { Button } from '@/components/ui/Button'

type ScanState = 'idle' | 'loading' | 'processing' | 'results' | 'error'

interface Props {
  teamKey: string
  onConfirm: (codes: string[]) => Promise<void>
}

// Resize a photo to max 1400px wide before OCR — phone cameras are 4K+
// which massively inflates processing time with no accuracy benefit.
function resizeImage(file: File, maxWidth = 1400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('blob')), 'image/jpeg', 0.88)
    }
    img.onerror = reject
    img.src = url
  })
}

export function ScanPagePanel({ teamKey, onConfirm }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Keep the worker alive between scans so language data (~10MB) is only
  // downloaded and initialised once per page visit.
  const workerRef = useRef<any>(null)

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [detectedCodes, setDetectedCodes] = useState<string[]>([])
  const [missingCodes, setMissingCodes] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const teamStickers = STICKER_DATA[teamKey] || []
  const prefix = getTeamPrefix(teamKey)

  // Clean up worker when component unmounts
  useEffect(() => {
    return () => { workerRef.current?.terminate() }
  }, [])

  const getWorker = async () => {
    if (workerRef.current) return workerRef.current

    setScanState('loading')
    setProgress(0)
    setProgressLabel('Loading OCR engine…')

    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng', 1, {
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'loading tesseract core') {
          setProgressLabel('Loading OCR engine…')
          setProgress(Math.round(m.progress * 30))
        } else if (m.status === 'loading language traineddata') {
          setProgressLabel('Downloading language data…')
          setProgress(30 + Math.round(m.progress * 40))
        } else if (m.status === 'initializing api') {
          setProgressLabel('Initialising…')
          setProgress(70 + Math.round(m.progress * 10))
        } else if (m.status === 'recognizing text') {
          setProgressLabel('Reading page…')
          setProgress(80 + Math.round(m.progress * 20))
        }
      },
    })

    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      tessedit_pageseg_mode: 11 as unknown as import('tesseract.js').PSM,
    })

    workerRef.current = worker
    return worker
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (inputRef.current) inputRef.current.value = ''

    try {
      const worker = await getWorker()
      setScanState('processing')
      setProgressLabel('Resizing image…')
      setProgress(0)

      const resized = await resizeImage(file)

      setProgressLabel('Reading page…')
      const { data } = await worker.recognize(resized)

      const upperText = data.text.toUpperCase()
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
      workerRef.current = null
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
    setProgress(0)
    setProgressLabel('')
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
          style={{ background: 'transparent', color: 'var(--text)', border: '2px dashed var(--text-muted)' }}
        >
          📷 Scan Album Page
        </button>
      )}

      {(scanState === 'loading' || scanState === 'processing') && (
        <div className="flex flex-col items-center py-6 gap-4 w-full">
          <div
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin flex-shrink-0"
            style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
          />
          <div className="w-full flex flex-col gap-2">
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{progressLabel}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: 'var(--primary)' }}
              />
            </div>
            {scanState === 'loading' && (
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                First scan downloads ~10 MB of language data. Subsequent scans are instant.
              </p>
            )}
          </div>
        </div>
      )}

      {scanState === 'error' && (
        <div className="rounded-xl p-4 flex flex-col items-center gap-3 text-center" style={{ background: 'var(--border)' }}>
          <div className="text-3xl">🔦</div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Couldn't read the page</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Try better lighting, hold steady, and make sure sticker codes are fully visible.
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
                  <button onClick={() => setSelected(new Set(missingCodes))} className="text-xs font-bold" style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>All</button>
                  <button onClick={() => setSelected(new Set())} className="text-xs" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>None</button>
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
                      <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)', color: isSelected ? 'white' : 'var(--text-muted)' }}>
                        {isSelected ? '✓' : ''}
                      </span>
                      <span className="font-bold text-xs flex-shrink-0" style={{ color: isSelected ? 'white' : 'var(--text)', minWidth: '44px' }}>{code}</span>
                      <span className="text-xs flex-1 truncate" style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                        {isFoil ? '✨ ' : ''}{sticker?.name.replace(' FOIL', '')}
                      </span>
                    </button>
                  )
                })}
              </div>

              <Button variant="primary" size="md" className="w-full" loading={saving} disabled={selected.size === 0} onClick={handleConfirm}>
                ❓ Add {selected.size} to Need List
              </Button>
            </>
          )}

          <div className="flex gap-2">
            <button onClick={() => { reset(); triggerCamera() }} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
              📷 Scan Again
            </button>
            <button onClick={reset} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
