import { useState, useRef, useCallback, useId } from 'react'

// Sample images bundled as remote URLs (Unsplash). The user can also upload.
// High-res sources so the displaced output stays sharp at large render sizes.
const SAMPLES = [
  { key: 'building', label: 'Building', url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=200&q=70' },
  { key: 'flower',   label: 'Flower',   url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=200&q=70' },
  { key: 'beach',    label: 'Beach',    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=70' },
  { key: 'mountain', label: 'Mountain', url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=200&q=70' },
  { key: 'forest',   label: 'Forest',   url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&q=70' },
  { key: 'city',     label: 'City',     url: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=200&q=70' },
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

  // viewBox is 1600x1200 (2x of the 800x600 we used to use) so the filter
  // operates at higher resolution → sharper bands and crisper imagery.
  // We want roughly `steps` visible bands across the band axis.
  const isVertical = typeKey === 'vertical'
  const freq = (steps / 1600).toFixed(6)
  const baseFreq = isVertical ? `${freq} 0` : `0 ${freq}`
  // Displacement scale lives in user-space; double it so the slider value
  // stays visually equivalent to the previous 800x600 coordinate system.
  const displacementScale = distortion * 2

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
      cloned.setAttribute('width', '3840')
      cloned.setAttribute('height', '2880')
      const imgEl = cloned.querySelector('image')
      if (imgEl) imgEl.setAttribute('href', dataHref)

      const serialized = new XMLSerializer().serializeToString(cloned)
      const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 3840; canvas.height = 2880
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, 3840, 2880)
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

  return (
    <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', height: '100%', width: '100%' }}>
      {/* Canvas */}
      <div style={{
        flex: narrow ? '0 0 auto' : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: narrow ? 12 : 40,
        minHeight: 0,
      }}>
        <div style={{
          position: 'relative', width: '100%', maxWidth: 900,
          aspectRatio: '4/3',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          background: '#0b0b0f',
        }}>
          <svg ref={svgRef} viewBox="0 0 1600 1200" preserveAspectRatio="xMidYMid slice"
            style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'auto' }}>
            <defs>
              <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%"
                filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB">
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
                  scale={displacementScale}
                  xChannelSelector={isVertical ? 'G' : 'R'}
                  yChannelSelector={isVertical ? 'R' : 'G'}
                  result="displaced" />
                {blur > 0 && <feGaussianBlur in="displaced" stdDeviation={blur} />}
              </filter>
            </defs>

            {showOriginal ? (
              <image href={imageHref} x="0" y="0" width="1600" height="1200" preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous" />
            ) : (
              <g filter={`url(#${filterId})`}>
                <image href={imageHref} x="0" y="0" width="1600" height="1200" preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous" />
              </g>
            )}
          </svg>

          {/* Floating action stack */}
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
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

      {/* Controls panel */}
      <div style={{
        width: narrow ? '100%' : 280,
        flex: narrow ? '1 1 auto' : '0 0 auto',
        height: narrow ? 'auto' : '100%',
        overflowY: 'auto',
        background: 'rgba(255,255,255,0.02)',
        borderLeft: narrow ? 'none' : '1px solid rgba(255,255,255,0.06)',
        borderTop: narrow ? '1px solid rgba(255,255,255,0.06)' : 'none',
        padding: narrow ? '14px 16px' : '24px 20px',
        display: 'flex', flexDirection: 'column', gap: narrow ? 14 : 20,
      }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: 'rgba(255,255,255,0.85)' }}>
            Fractal <span className="display-italic">Glass</span>
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Stepped column displacement</p>
        </div>

        {/* Image */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Image</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {SAMPLES.map(s => {
              const active = !uploadedImage && sampleKey === s.key
              return (
                <button key={s.key} onClick={() => { setSampleKey(s.key); setUploadedImage(null) }} style={{
                  width: '100%', aspectRatio: '4/3', borderRadius: 8, padding: 0, overflow: 'hidden',
                  border: `2px solid ${active ? '#0339f8' : 'rgba(255,255,255,0.08)'}`,
                  background: '#0b0b0f', cursor: 'pointer', transition: 'border-color 0.15s',
                }}>
                  <img src={s.thumb} alt={s.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Direction */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Direction</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {TYPES.map(t => {
              const active = typeKey === t.key
              return (
                <button key={t.key} onClick={() => setTypeKey(t.key)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(3,57,248,0.18)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#7aa4ff' : 'rgba(255,255,255,0.55)',
                  fontSize: 11, fontWeight: 500, transition: 'all 0.15s',
                }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <Slider label="Steps"      value={steps}      min={4}   max={80}  step={1}    onChange={setSteps} />
        <Slider label="Distortion" value={distortion} min={0}   max={300} step={1}    onChange={setDistortion} />
        <Slider label="Blur"       value={blur}       min={0}   max={8}   step={0.1}  onChange={setBlur} format={v => v.toFixed(1)} />

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={randomize} style={{
            width: '100%', padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            Randomize
          </button>
          <button onClick={exportPNG} disabled={exporting} style={{
            width: '100%', padding: '10px 16px', borderRadius: 10, border: 'none',
            background: exporting ? 'rgba(3,57,248,0.5)' : '#0339f8', color: '#fff',
            fontSize: 12, fontWeight: 500, cursor: exporting ? 'wait' : 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = '#0250ff' }}
            onMouseLeave={e => { if (!exporting) e.currentTarget.style.background = '#0339f8' }}
          >
            {exporting ? 'Exporting…' : 'Export 4K PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, step, onChange, format }) {
  const display = format ? format(value) : Math.round(value)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</label>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%' }} />
    </div>
  )
}

const fabBtn = {
  width: 32, height: 32, borderRadius: '50%', border: 'none',
  background: 'rgba(20,20,28,0.85)', backdropFilter: 'blur(8px)',
  color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
}
