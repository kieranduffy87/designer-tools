import { useState, useRef, useCallback, useId, useEffect } from 'react'

// Sample images bundled as remote URLs (Unsplash). The user can also upload.
const SAMPLES = [
  { key: 'building', label: 'Building', url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=80' },
  { key: 'flower',   label: 'Flower',   url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&q=80' },
  { key: 'beach',    label: 'Beach',    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80' },
  { key: 'mountain', label: 'Mountain', url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=900&q=80' },
  { key: 'forest',   label: 'Forest',   url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80' },
  { key: 'city',     label: 'City',     url: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=900&q=80' },
]

// Direction presets
const TYPES = [
  { key: 'vertical',   label: 'Vertical'   }, // columns shift up/down (band axis runs horizontally)
  { key: 'horizontal', label: 'Horizontal' }, // rows shift left/right (band axis runs vertically)
]

// Build discrete tableValues for stepped quantisation of a 0..1 noise channel
function discreteTable(steps) {
  const out = []
  for (let i = 0; i < steps; i++) out.push((i / (steps - 1)).toFixed(4))
  return out.join(' ')
}

export default function FractalGlass({ narrow }) {
  const [typeKey, setTypeKey] = useState('vertical')
  const [sampleKey, setSampleKey] = useState('building')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [steps, setSteps] = useState(28)
  const [distortion, setDistortion] = useState(120)
  const [blur, setBlur] = useState(0)
  const [showOriginal, setShowOriginal] = useState(false)
  const [exporting, setExporting] = useState(false)

  const svgRef = useRef(null)
  const filterId = useId().replace(/:/g, '_')

  const type = TYPES.find(t => t.key === typeKey) || TYPES[0]
  const sample = SAMPLES.find(s => s.key === sampleKey) || SAMPLES[0]
  const imageHref = uploadedImage || sample.url

  // viewBox is 800x600. We want roughly `steps` visible bands across that axis.
  // For vertical mode bands run along X (so freqX > 0, freqY = 0).
  const isVertical = typeKey === 'vertical'
  const freq = (steps / 800).toFixed(5)
  const baseFreq = isVertical ? `${freq} 0` : `0 ${freq}`

  const onUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setUploadedImage(ev.target.result)
    reader.readAsDataURL(file)
  }, [])

  const clearUpload = useCallback(() => setUploadedImage(null), [])

  const randomize = useCallback(() => {
    setSteps(8 + Math.floor(Math.random() * 50))
    setDistortion(40 + Math.random() * 180)
    setBlur(Math.random() * 4)
    const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)]
    if (!uploadedImage) setSampleKey(s.key)
  }, [uploadedImage])

  const exportPNG = useCallback(async () => {
    const svg = svgRef.current
    if (!svg) return
    setExporting(true)
    try {
      // Inline the image as a dataURL so toBlob works without taint
      let dataHref = imageHref
      if (!dataHref.startsWith('data:')) {
        const res = await fetch(dataHref, { mode: 'cors' })
        const blob = await res.blob()
        dataHref = await new Promise(r => {
          const fr = new FileReader()
          fr.onload = () => r(fr.result)
          fr.readAsDataURL(blob)
        })
      }
      const cloned = svg.cloneNode(true)
      cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      cloned.setAttribute('width', '1600')
      cloned.setAttribute('height', '1200')
      const imgEl = cloned.querySelector('image')
      if (imgEl) imgEl.setAttribute('href', dataHref)

      const serialized = new XMLSerializer().serializeToString(cloned)
      const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 1600; canvas.height = 1200
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, 1600, 1200)
        canvas.toBlob(b => {
          const dl = URL.createObjectURL(b)
          const a = document.createElement('a')
          a.href = dl; a.download = 'fractal-glass.png'; a.click()
          URL.revokeObjectURL(dl)
          URL.revokeObjectURL(url)
          setExporting(false)
        }, 'image/png')
      }
      img.onerror = () => { URL.revokeObjectURL(url); setExporting(false) }
      img.src = url
    } catch {
      setExporting(false)
    }
  }, [imageHref])

  // Quantise noise to N steps so we get sharp banded "blinds" instead of smooth gradient
  const tableValues = discreteTable(Math.max(2, Math.min(steps, 80)))

  // ── Layout (mobile first; both narrow + wide use the same stacked frame) ──
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
            Fractal <span className="display-italic">Glass</span>
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>Stepped column displacement</p>
        </div>
        <button onClick={randomize} title="Randomize" style={iconBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5"/><path d="M4 20l16.2-16.2"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>
          </svg>
        </button>
      </div>

      {/* Canvas */}
      <div style={{
        flex: 1, minHeight: 0, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.02), transparent 70%)',
      }}>
        <div style={{
          position: 'relative', width: '100%', height: '100%', maxWidth: 900,
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          background: '#0b0b0f',
        }}>
          <svg ref={svgRef} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"
            style={{ display: 'block', width: '100%', height: '100%' }}>
            <defs>
              <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency={baseFreq} numOctaves="1" seed="3" result="noise" />
                {/* Quantise R into N steps; force G to constant 0.5 so the
                    other axis has zero displacement. */}
                <feComponentTransfer in="noise" result="stepped">
                  <feFuncR type="discrete" tableValues={tableValues} />
                  <feFuncG type="discrete" tableValues="0.5" />
                  <feFuncB type="discrete" tableValues="0.5" />
                  <feFuncA type="discrete" tableValues="1" />
                </feComponentTransfer>
                <feDisplacementMap in="SourceGraphic" in2="stepped"
                  scale={distortion}
                  xChannelSelector={isVertical ? 'G' : 'R'}
                  yChannelSelector={isVertical ? 'R' : 'G'}
                  result="displaced" />
                {blur > 0 && <feGaussianBlur in="displaced" stdDeviation={blur} />}
              </filter>
            </defs>

            {showOriginal ? (
              <image href={imageHref} x="0" y="0" width="800" height="600" preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous" />
            ) : (
              <g filter={`url(#${filterId})`}>
                <image href={imageHref} x="0" y="0" width="800" height="600" preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous" />
              </g>
            )}
          </svg>

          {/* Floating action stack */}
          <div style={{
            position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <label title="Upload image" style={fabBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <input type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
            </label>
            <button title={showOriginal ? 'Show effect' : 'Show original'} onClick={() => setShowOriginal(v => !v)} style={fabBtn}>
              {showOriginal ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
            {uploadedImage && (
              <button title="Clear upload" onClick={clearUpload} style={fabBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sample picker */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 12px',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {SAMPLES.map(s => {
          const active = !uploadedImage && sampleKey === s.key
          return (
            <button key={s.key} onClick={() => { setSampleKey(s.key); setUploadedImage(null) }}
              style={{
                flexShrink: 0, width: 56, height: 42, borderRadius: 8,
                padding: 0, overflow: 'hidden',
                border: `2px solid ${active ? '#0339f8' : 'rgba(255,255,255,0.08)'}`,
                background: '#0b0b0f', cursor: 'pointer', transition: 'border-color 0.15s',
              }}>
              <img src={s.url} alt={s.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          )
        })}
      </div>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {TYPES.map(t => {
          const active = typeKey === t.key
          return (
            <button key={t.key} onClick={() => setTypeKey(t.key)} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: active ? 'rgba(3,57,248,0.18)' : 'rgba(255,255,255,0.04)',
              color: active ? '#7aa4ff' : 'rgba(255,255,255,0.55)',
              fontSize: 12, fontWeight: 500, transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {t.key === 'vertical' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="18" y1="3" x2="18" y2="21"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              )}
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Sliders */}
      <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Slider label="Steps"      value={steps}      min={4}   max={80}  step={1}    onChange={setSteps} />
        <Slider label="Distortion" value={distortion} min={0}   max={300} step={1}    onChange={setDistortion} />
        <Slider label="Blur"       value={blur}       min={0}   max={8}   step={0.1}  onChange={setBlur} format={v => v.toFixed(1)} />
      </div>

      {/* Export */}
      <div style={{ padding: '0 16px 16px' }}>
        <button onClick={exportPNG} disabled={exporting} style={{
          width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: exporting ? 'rgba(3,57,248,0.5)' : '#0339f8', color: '#fff',
          fontSize: 13, fontWeight: 500, cursor: exporting ? 'wait' : 'pointer',
          transition: 'all 0.15s',
        }}>
          {exporting ? 'Exporting…' : 'Export PNG (1600×1200)'}
        </button>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, step, onChange, format }) {
  const display = format ? format(value) : Math.round(value)
  return (
    <label style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#0339f8', height: 28 }} />
    </label>
  )
}

const iconBtn = {
  width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
}

const fabBtn = {
  width: 32, height: 32, borderRadius: '50%', border: 'none',
  background: 'rgba(20,20,28,0.85)', backdropFilter: 'blur(8px)',
  color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
}
