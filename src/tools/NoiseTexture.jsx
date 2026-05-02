import { useState, useRef, useCallback, useEffect } from 'react'

export default function NoiseTexture() {
  const [baseFreq, setBaseFreq] = useState(0.65)
  const [octaves, setOctaves] = useState(4)
  const [seed, setSeed] = useState(1)
  const [type, setType] = useState('fractalNoise')
  const [color1, setColor1] = useState('#0b0b0f')
  const [color2, setColor2] = useState('#0339f8')
  const [opacity, setOpacity] = useState(0.5)
  const [blendMode, setBlendMode] = useState('screen')
  const svgRef = useRef(null)

  const randomize = useCallback(() => {
    setSeed(Math.floor(Math.random() * 999))
    setBaseFreq(0.3 + Math.random() * 0.7)
    setOctaves(Math.floor(2 + Math.random() * 5))
  }, [])

  const exportSVG = useCallback(() => {
    if (!svgRef.current) return
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgRef.current)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'noise-texture.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportPNG = useCallback(() => {
    if (!svgRef.current) return
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgRef.current)
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 1200
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1600, 1200)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = 'noise-texture.png'
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))
  }, [])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 800, aspectRatio: '4/3', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <svg ref={svgRef} viewBox="0 0 800 600" style={{ width: '100%', height: '100%', borderRadius: 16 }}>
            <defs>
              <filter id="noise-filter" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type={type} baseFrequency={baseFreq} numOctaves={octaves} seed={seed} result="noise" />
                <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
              </filter>
              <linearGradient id="noise-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color1} />
                <stop offset="100%" stopColor={color2} />
              </linearGradient>
            </defs>
            <rect width="800" height="600" fill="url(#noise-gradient)" />
            <rect width="800" height="600" filter="url(#noise-filter)" opacity={opacity} style={{ mixBlendMode: blendMode }} />
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
            Noise <span className="display-italic">Texture</span>
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Procedural noise & grain textures</p>
        </div>

        {/* Type */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Type</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['fractalNoise', 'turbulence'].map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: type === t ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                color: type === t ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                fontSize: 11, cursor: 'pointer', textTransform: 'capitalize',
              }}>{t === 'fractalNoise' ? 'Fractal' : 'Turbulence'}</button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Gradient</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ position: 'relative' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: color1, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)' }} />
              <input type="color" value={color1} onChange={e => setColor1(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
            <label style={{ position: 'relative' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: color2, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)' }} />
              <input type="color" value={color2} onChange={e => setColor2(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Frequency: {baseFreq.toFixed(2)}</label>
          <input type="range" min="0.01" max="2" step="0.01" value={baseFreq} onChange={e => setBaseFreq(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>

        {/* Octaves */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Octaves: {octaves}</label>
          <input type="range" min="1" max="8" step="1" value={octaves} onChange={e => setOctaves(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>

        {/* Opacity */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Opacity: {opacity.toFixed(2)}</label>
          <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>

        {/* Blend Mode */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Blend Mode</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['screen', 'overlay', 'multiply', 'soft-light'].map(m => (
              <button key={m} onClick={() => setBlendMode(m)} style={{
                padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                background: blendMode === m ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                color: blendMode === m ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                fontSize: 10, cursor: 'pointer', textTransform: 'capitalize',
              }}>{m}</button>
            ))}
          </div>
        </div>

        {/* Seed */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Seed: {seed}</label>
          <input type="range" min="1" max="999" step="1" value={seed} onChange={e => setSeed(parseInt(e.target.value))} style={{ width: '100%' }} />
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
          <button onClick={exportPNG} style={{
            width: '100%', padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            Export PNG
          </button>
        </div>
      </div>
    </div>
  )
}
