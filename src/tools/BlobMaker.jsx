import { useState, useRef, useCallback } from 'react'

function generateBlob(complexity, seed) {
  const points = complexity + 3
  const angleStep = (Math.PI * 2) / points
  const rng = mulberry32(seed)

  const pathPoints = []
  for (let i = 0; i < points; i++) {
    const angle = angleStep * i
    const r = 150 + rng() * 100
    pathPoints.push({
      x: 400 + r * Math.cos(angle),
      y: 300 + r * Math.sin(angle),
    })
  }

  // Create smooth closed path with cubic bezier
  let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`
  for (let i = 0; i < pathPoints.length; i++) {
    const curr = pathPoints[i]
    const next = pathPoints[(i + 1) % pathPoints.length]
    const prev = pathPoints[(i - 1 + pathPoints.length) % pathPoints.length]
    const nextNext = pathPoints[(i + 2) % pathPoints.length]

    const cp1x = curr.x + (next.x - prev.x) / 4
    const cp1y = curr.y + (next.y - prev.y) / 4
    const cp2x = next.x - (nextNext.x - curr.x) / 4
    const cp2y = next.y - (nextNext.y - curr.y) / 4

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
  }
  d += ' Z'
  return d
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function BlobMaker() {
  const [complexity, setComplexity] = useState(5)
  const [seed, setSeed] = useState(42)
  const [fill, setFill] = useState('#0339f8')
  const [stroke, setStroke] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(0)
  const [showGradient, setShowGradient] = useState(true)
  const [gradientColor, setGradientColor] = useState('#6e3cc8')
  const [shadow, setShadow] = useState(true)
  const svgRef = useRef(null)

  const path = generateBlob(complexity, seed)

  const randomize = useCallback(() => {
    setSeed(Math.floor(Math.random() * 9999))
  }, [])

  const exportSVG = useCallback(() => {
    if (!svgRef.current) return
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgRef.current)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'blob.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 800, aspectRatio: '4/3', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', background: '#0b0b0f' }}>
          <svg ref={svgRef} viewBox="0 0 800 600" style={{ width: '100%', height: '100%' }}>
            <defs>
              {showGradient && (
                <linearGradient id="blob-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={fill} />
                  <stop offset="100%" stopColor={gradientColor} />
                </linearGradient>
              )}
              {shadow && (
                <filter id="blob-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="10" stdDeviation="20" floodColor={fill} floodOpacity="0.3" />
                </filter>
              )}
            </defs>
            <rect width="800" height="600" fill="#0b0b0f" />
            <path
              d={path}
              fill={showGradient ? 'url(#blob-grad)' : fill}
              stroke={strokeWidth > 0 ? stroke : 'none'}
              strokeWidth={strokeWidth}
              filter={shadow ? 'url(#blob-shadow)' : undefined}
            />
          </svg>
        </div>
      </div>

      <div style={{
        width: 280, height: '100%', overflowY: 'auto',
        background: 'rgba(255,255,255,0.02)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        padding: '24px 20px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: 'rgba(255,255,255,0.85)' }}>
            Blob <span className="display-italic">Maker</span>
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Organic blob shape generator</p>
        </div>

        {/* Colors */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Fill</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ position: 'relative' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: fill, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)' }} />
              <input type="color" value={fill} onChange={e => setFill(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
            {showGradient && (
              <label style={{ position: 'relative' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: gradientColor, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)' }} />
                <input type="color" value={gradientColor} onChange={e => setGradientColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
            )}
          </div>
        </div>

        {/* Gradient toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowGradient(!showGradient)} style={{
            width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: showGradient ? '#0339f8' : 'rgba(255,255,255,0.1)',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 2,
              left: showGradient ? 18 : 2,
              transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Gradient</span>
        </div>

        {/* Shadow toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShadow(!shadow)} style={{
            width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: shadow ? '#0339f8' : 'rgba(255,255,255,0.1)',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 2,
              left: shadow ? 18 : 2,
              transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Shadow</span>
        </div>

        {/* Complexity */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Complexity: {complexity}</label>
          <input type="range" min="3" max="12" step="1" value={complexity} onChange={e => setComplexity(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>

        {/* Stroke */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Stroke: {strokeWidth}</label>
          <input type="range" min="0" max="6" step="0.5" value={strokeWidth} onChange={e => setStrokeWidth(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>

        {/* Seed */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Seed: {seed}</label>
          <input type="range" min="1" max="9999" step="1" value={seed} onChange={e => setSeed(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>

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
          <button onClick={exportSVG} style={{
            width: '100%', padding: '10px 16px', borderRadius: 10, border: 'none',
            background: '#0339f8', color: '#fff',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#0250ff'}
            onMouseLeave={e => e.currentTarget.style.background = '#0339f8'}
          >
            Export SVG
          </button>
        </div>
      </div>
    </div>
  )
}
