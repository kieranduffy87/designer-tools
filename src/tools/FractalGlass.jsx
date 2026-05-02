import { useState, useRef, useCallback, useId } from 'react'

// ─── Preset SVG content (acts as source image for the displacement filter) ──

const PRESETS = [
  {
    key: 'aurora',
    label: 'Aurora',
    render: (id) => (
      <>
        <defs>
          <radialGradient id={`${id}-1`} cx="20%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#0339f8" />
            <stop offset="100%" stopColor="#0339f8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-2`} cx="80%" cy="20%" r="55%">
            <stop offset="0%" stopColor="#f06292" />
            <stop offset="100%" stopColor="#f06292" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-3`} cx="50%" cy="90%" r="60%">
            <stop offset="0%" stopColor="#ff8a65" />
            <stop offset="100%" stopColor="#ff8a65" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-4`} cx="90%" cy="80%" r="50%">
            <stop offset="0%" stopColor="#9c27b0" />
            <stop offset="100%" stopColor="#9c27b0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="600" fill="#1a0a4a" />
        <rect width="800" height="600" fill={`url(#${id}-1)`} />
        <rect width="800" height="600" fill={`url(#${id}-2)`} />
        <rect width="800" height="600" fill={`url(#${id}-3)`} />
        <rect width="800" height="600" fill={`url(#${id}-4)`} />
      </>
    ),
  },
  {
    key: 'sunset',
    label: 'Sunset',
    render: (id) => (
      <>
        <defs>
          <linearGradient id={`${id}-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2b0a3d" />
            <stop offset="40%" stopColor="#d62828" />
            <stop offset="65%" stopColor="#f77f00" />
            <stop offset="85%" stopColor="#fcbf49" />
            <stop offset="100%" stopColor="#ffe2a8" />
          </linearGradient>
        </defs>
        <rect width="800" height="600" fill={`url(#${id}-bg)`} />
        <circle cx="400" cy="380" r="110" fill="#ffeb3b" opacity="0.95" />
      </>
    ),
  },
  {
    key: 'stripes',
    label: 'Stripes',
    render: () => (
      <>
        <rect width="800" height="600" fill="#0b0b0f" />
        {['#ff006e', '#fb5607', '#ffbe0b', '#3a86ff', '#8338ec', '#06d6a0'].map((c, i) => (
          <rect key={i} x={i * (800 / 6)} y="0" width={800 / 6} height="600" fill={c} />
        ))}
      </>
    ),
  },
  {
    key: 'grid',
    label: 'Grid',
    render: () => {
      const colors = ['#0339f8', '#f06292', '#ffeb3b', '#06d6a0', '#9c27b0', '#ff8a65']
      const tiles = []
      const cols = 8, rows = 6
      const tw = 800 / cols, th = 600 / rows
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          tiles.push(
            <rect key={`${r}-${c}`} x={c * tw} y={r * th} width={tw} height={th}
              fill={colors[(r * cols + c) % colors.length]} />
          )
        }
      }
      return <>{tiles}</>
    },
  },
  {
    key: 'circles',
    label: 'Circles',
    render: () => (
      <>
        <rect width="800" height="600" fill="#0a0a1f" />
        {Array.from({ length: 14 }, (_, i) => {
          const r = 30 + i * 22
          const c = ['#0339f8', '#9c27b0', '#f06292', '#ff8a65', '#ffeb3b'][i % 5]
          return <circle key={i} cx="400" cy="300" r={r} fill="none" stroke={c} strokeWidth="14" opacity="0.85" />
        })}
      </>
    ),
  },
  {
    key: 'sunburst',
    label: 'Burst',
    render: () => {
      const lines = []
      const cx = 400, cy = 300
      for (let i = 0; i < 36; i++) {
        const angle = (i * Math.PI * 2) / 36
        const x2 = cx + Math.cos(angle) * 600
        const y2 = cy + Math.sin(angle) * 600
        const c = ['#0339f8', '#f06292', '#ffbe0b', '#06d6a0'][i % 4]
        lines.push(<line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke={c} strokeWidth="20" />)
      }
      return (
        <>
          <rect width="800" height="600" fill="#0b0b0f" />
          {lines}
          <circle cx={cx} cy={cy} r="60" fill="#ffeb3b" />
        </>
      )
    },
  },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function FractalGlass() {
  const [presetKey, setPresetKey] = useState('aurora')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [frequency, setFrequency] = useState(0.013)
  const [scale, setScale] = useState(90)
  const [octaves, setOctaves] = useState(2)
  const [seed, setSeed] = useState(1)
  const [exporting, setExporting] = useState(false)

  const svgRef = useRef(null)
  const filterId = useId().replace(/:/g, '_')
  const sourceId = useId().replace(/:/g, '_')

  const preset = PRESETS.find(p => p.key === presetKey) || PRESETS[0]

  const onUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setUploadedImage(ev.target.result)
    reader.readAsDataURL(file)
  }, [])

  const clearUpload = useCallback(() => setUploadedImage(null), [])

  const randomize = useCallback(() => {
    setSeed(Math.floor(Math.random() * 999))
    setFrequency(0.005 + Math.random() * 0.04)
    setScale(40 + Math.random() * 140)
  }, [])

  const exportPNG = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    setExporting(true)

    const cloned = svg.cloneNode(true)
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    cloned.setAttribute('width', '1600')
    cloned.setAttribute('height', '1200')
    const serialized = new XMLSerializer().serializeToString(cloned)
    const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1600; canvas.height = 1200
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 1600, 1200)
      canvas.toBlob(blob => {
        const dl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = dl; a.download = 'fractal-glass.png'; a.click()
        URL.revokeObjectURL(dl)
        URL.revokeObjectURL(url)
        setExporting(false)
      }, 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); setExporting(false) }
    img.src = url
  }, [])

  return (
    <div style={{ display: 'flex', height: '100%' }}>

      {/* ── Canvas area ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, minWidth: 0, gap: 16 }}>
        <div style={{
          position: 'relative', width: '100%', maxWidth: 800,
          aspectRatio: '4 / 3', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          background: '#0b0b0f',
        }}>
          <svg ref={svgRef} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"
            style={{ display: 'block', width: '100%', height: '100%' }}>
            <defs>
              <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves={octaves} seed={seed} result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale={scale} xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>

            <g filter={`url(#${filterId})`}>
              {uploadedImage ? (
                <image href={uploadedImage} x="0" y="0" width="800" height="600" preserveAspectRatio="xMidYMid slice" />
              ) : (
                preset.render(sourceId)
              )}
            </g>
          </svg>
        </div>

        <div style={{
          padding: '4px 12px', borderRadius: 999,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 11, color: 'rgba(255,255,255,0.3)',
        }}>
          freq {frequency.toFixed(3)} · scale {Math.round(scale)} · octaves {octaves} · seed {seed}
        </div>
      </div>

      {/* ── Controls panel ──────────────────────────────────────────────── */}
      <div style={{
        width: 260, flexShrink: 0, height: '100%', overflowY: 'auto',
        background: 'rgba(255,255,255,0.02)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        padding: '24px 20px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        <div>
          <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: 'rgba(255,255,255,0.85)', margin: '0 0 4px' }}>
            Fractal <span className="display-italic">Glass</span>
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Glass distortion via displacement map</p>
        </div>

        {/* Image source */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Source</label>

          {/* Preset thumbnails */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
            {PRESETS.map(p => {
              const active = !uploadedImage && presetKey === p.key
              const thumbId = `thumb-${p.key}`
              return (
                <button key={p.key} onClick={() => { setPresetKey(p.key); setUploadedImage(null) }}
                  title={p.label}
                  style={{
                    position: 'relative', aspectRatio: '4 / 3', borderRadius: 8, padding: 0, overflow: 'hidden',
                    border: `1.5px solid ${active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    background: '#0b0b0f', cursor: 'pointer', transition: 'border-color 0.15s',
                  }}>
                  <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    {p.render(thumbId)}
                  </svg>
                </button>
              )
            })}
          </div>

          {/* Upload */}
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
            border: '1px dashed rgba(255,255,255,0.15)',
            background: uploadedImage ? 'rgba(3,57,248,0.1)' : 'rgba(255,255,255,0.02)',
            color: uploadedImage ? 'rgba(140,180,255,0.9)' : 'rgba(255,255,255,0.5)',
            fontSize: 11, transition: 'all 0.15s',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {uploadedImage ? 'Image uploaded' : 'Upload image'}
            <input type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
          </label>
          {uploadedImage && (
            <button onClick={clearUpload} style={{
              marginTop: 6, width: '100%', padding: '5px 0', borderRadius: 6,
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
              fontSize: 10, cursor: 'pointer',
            }}>Clear upload</button>
          )}
        </div>

        {/* Frequency */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Frequency</label>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>{frequency.toFixed(3)}</span>
          </div>
          <input type="range" min="0.001" max="0.06" step="0.001" value={frequency}
            onChange={e => setFrequency(parseFloat(e.target.value))} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
            <span>Smooth</span><span>Fine</span>
          </div>
        </div>

        {/* Scale */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Distortion</label>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(scale)}</span>
          </div>
          <input type="range" min="0" max="250" step="1" value={scale}
            onChange={e => setScale(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>

        {/* Octaves */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Detail</label>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>{octaves}</span>
          </div>
          <input type="range" min="1" max="6" step="1" value={octaves}
            onChange={e => setOctaves(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>

        {/* Seed */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Seed</label>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>{seed}</span>
          </div>
          <input type="range" min="0" max="999" step="1" value={seed}
            onChange={e => setSeed(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={randomize} style={{
            width: '100%', padding: '9px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
            fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >Randomize</button>
          <button onClick={exportPNG} disabled={exporting} style={{
            width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
            background: exporting ? 'rgba(3,57,248,0.5)' : '#0339f8', color: '#fff',
            fontSize: 12, fontWeight: 500, cursor: exporting ? 'wait' : 'pointer',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = '#0250ff' }}
            onMouseLeave={e => { if (!exporting) e.currentTarget.style.background = '#0339f8' }}
          >
            {exporting ? 'Exporting…' : 'Export PNG (1600×1200)'}
          </button>
        </div>
      </div>
    </div>
  )
}
