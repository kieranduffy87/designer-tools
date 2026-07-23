import { useState, useRef, useCallback, useId } from 'react'
import ExportMenu from '../components/ExportMenu'
import { svgStringToCanvas, toDataURL } from '../lib/exporter'

// Sample images that look great glitched (portraits, neon, sci-fi vibes).
const SAMPLES = [
  { key: 'portrait', label: 'Portrait', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=70' },
  { key: 'neon',     label: 'Neon',     url: 'https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=200&q=70' },
  { key: 'tokyo',    label: 'Tokyo',    url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=200&q=70' },
  { key: 'face',     label: 'Face',     url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70' },
  { key: 'city',     label: 'Skyline',  url: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=200&q=70' },
  { key: 'building', label: 'Building', url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=200&q=70' },
]

const PRESETS = [
  { key: 'crt',      label: 'CRT',      values: { rgbSplit: 14, glitch: 24, scanlines: 70, scanDensity: 4, noise: 22, hue: 60,  saturation: 130 } },
  { key: 'vhs',      label: 'VHS',      values: { rgbSplit: 22, glitch: 60, scanlines: 35, scanDensity: 3, noise: 45, hue: -10, saturation: 110 } },
  { key: 'neon',     label: 'Neon',     values: { rgbSplit: 30, glitch: 18, scanlines: 25, scanDensity: 5, noise: 18, hue: 280, saturation: 160 } },
  { key: 'broken',   label: 'Broken',   values: { rgbSplit: 38, glitch: 90, scanlines: 50, scanDensity: 2, noise: 60, hue: 200, saturation: 140 } },
  { key: 'minimal',  label: 'Minimal',  values: { rgbSplit: 6,  glitch: 8,  scanlines: 30, scanDensity: 6, noise: 12, hue: 0,   saturation: 100 } },
]

export default function GlitchScreen({ narrow }) {
  const [sampleKey, setSampleKey] = useState('portrait')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [rgbSplit, setRgbSplit] = useState(14)
  const [glitch, setGlitch] = useState(24)
  const [scanlines, setScanlines] = useState(70)
  const [scanDensity, setScanDensity] = useState(4)
  const [noise, setNoise] = useState(22)
  const [hue, setHue] = useState(60)
  const [saturation, setSaturation] = useState(130)
  const [seed, setSeed] = useState(7)
  const [showOriginal, setShowOriginal] = useState(false)

  const svgRef = useRef(null)
  const rawId = useId().replace(/:/g, '_')
  const filterId  = `f_${rawId}`
  const patternId = `p_${rawId}`

  const sample = SAMPLES.find(s => s.key === sampleKey) || SAMPLES[0]
  const imageHref = uploadedImage || sample.url

  const onUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setUploadedImage(ev.target.result)
    reader.readAsDataURL(file)
  }, [])

  const clearUpload = useCallback(() => setUploadedImage(null), [])

  const applyPreset = useCallback((preset) => {
    const v = preset.values
    setRgbSplit(v.rgbSplit); setGlitch(v.glitch); setScanlines(v.scanlines)
    setScanDensity(v.scanDensity); setNoise(v.noise); setHue(v.hue); setSaturation(v.saturation)
    setSeed(Math.floor(Math.random() * 9999))
  }, [])

  const randomize = useCallback(() => {
    setRgbSplit(Math.floor(Math.random() * 35) + 5)
    setGlitch(Math.floor(Math.random() * 80))
    setScanlines(Math.floor(Math.random() * 70) + 20)
    setScanDensity(Math.floor(Math.random() * 5) + 2)
    setNoise(Math.floor(Math.random() * 60))
    setHue(Math.floor(Math.random() * 360) - 180)
    setSaturation(Math.floor(Math.random() * 100) + 80)
    setSeed(Math.floor(Math.random() * 9999))
  }, [])

  // Serialise the live SVG (filter + scanline overlay) with the source image
  // inlined as a data URL, preserving the 1600×1200 viewBox so the glitch looks
  // identical at any export size.
  const buildExportSVG = useCallback(async (w, h) => {
    const svg = svgRef.current
    if (!svg) throw new Error('SVG not ready')
    const dataHref = await toDataURL(imageHref)
    const cloned = svg.cloneNode(true)
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    cloned.setAttribute('width', String(w))
    cloned.setAttribute('height', String(h))
    cloned.querySelectorAll('image').forEach(el => el.setAttribute('href', dataHref))
    return new XMLSerializer().serializeToString(cloned)
  }, [imageHref])

  const renderCanvas = useCallback(async (w, h) => {
    const svgString = await buildExportSVG(w, h)
    return await svgStringToCanvas(svgString, w, h, '#0b0b0f')
  }, [buildExportSVG])

  const getSVGString = useCallback(() => buildExportSVG(1600, 1200), [buildExportSVG])

  // Glitch band displacement: very low frequency on x-axis, higher on y-axis
  // gives wide horizontal bands that shift left/right.
  const bandFreqY = (0.005 + (glitch / 100) * 0.04).toFixed(5)

  return (
    <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', height: '100%', width: '100%' }}>
      {/* Canvas */}
      <div style={{
        flex: narrow ? '0 0 auto' : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: narrow ? 12 : 40, minHeight: 0,
      }}>
        <div style={{
          position: 'relative', width: '100%', maxWidth: 900,
          aspectRatio: '4/3', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)', background: '#0b0b0f',
        }}>
          <svg ref={svgRef} viewBox="0 0 1600 1200" preserveAspectRatio="xMidYMid slice"
            style={{ display: 'block', width: '100%', height: '100%' }}>
            <defs>
              <filter id={filterId} x="0%" y="0%" width="100%" height="100%"
                filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB">
                {/* Hue + saturation */}
                <feColorMatrix in="SourceGraphic" type="hueRotate" values={String(hue)} result="hued" />
                <feColorMatrix in="hued" type="saturate" values={String(saturation / 100)} result="sated" />

                {/* Glitch band displacement (horizontal slip) */}
                <feTurbulence type="fractalNoise" baseFrequency={`0.0008 ${bandFreqY}`} numOctaves="1" seed={seed} result="bandNoise" />
                <feComponentTransfer in="bandNoise" result="bands">
                  <feFuncR type="discrete" tableValues="0 0.25 0.5 0.75 1" />
                  <feFuncG type="discrete" tableValues="0.5" />
                  <feFuncA type="discrete" tableValues="1" />
                </feComponentTransfer>
                <feDisplacementMap in="sated" in2="bands" scale={glitch * 4}
                  xChannelSelector="R" yChannelSelector="G" result="glitched" />

                {/* RGB chromatic aberration: split R, G, B then offset R left, B right */}
                <feColorMatrix in="glitched" type="matrix"
                  values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rOnly" />
                <feColorMatrix in="glitched" type="matrix"
                  values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="gOnly" />
                <feColorMatrix in="glitched" type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bOnly" />
                <feOffset in="rOnly" dx={-rgbSplit} dy="0" result="rShift" />
                <feOffset in="bOnly" dx={rgbSplit}  dy="0" result="bShift" />
                <feBlend mode="screen" in="rShift" in2="gOnly" result="rg" />
                <feBlend mode="screen" in="rg"     in2="bShift" result="abr" />

                {/* Film grain via fractal noise overlay */}
                <feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves="2" seed="42" result="grainRaw" />
                <feColorMatrix in="grainRaw" type="matrix"
                  values={`0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 ${(noise / 100).toFixed(3)} 0`}
                  result="grain" />
                <feBlend in="abr" in2="grain" mode="overlay" />
              </filter>

              {/* Scanlines pattern: a single dark stripe in a {scanDensity}px tall tile */}
              <pattern id={patternId} patternUnits="userSpaceOnUse" width="6" height={scanDensity}>
                <rect x="0" y="0" width="6" height={Math.max(1, scanDensity / 2)} fill="rgba(0,0,0,0.85)" />
              </pattern>
            </defs>

            {showOriginal ? (
              <image href={imageHref} x="0" y="0" width="1600" height="1200"
                preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous" />
            ) : (
              <>
                <g filter={`url(#${filterId})`}>
                  <image href={imageHref} x="0" y="0" width="1600" height="1200"
                    preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous" />
                </g>
                {scanlines > 0 && (
                  <rect x="0" y="0" width="1600" height="1200" fill={`url(#${patternId})`}
                    opacity={(scanlines / 100).toFixed(2)}
                    style={{ mixBlendMode: 'multiply' }} />
                )}
              </>
            )}
          </svg>

          {/* Floating actions */}
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label title="Upload image" style={fabBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <input type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
            </label>
            <button title={showOriginal ? 'Show effect' : 'Show original'} onClick={() => setShowOriginal(v => !v)} style={fabBtn}>
              {showOriginal ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
            {uploadedImage && (
              <button title="Clear upload" onClick={clearUpload} style={fabBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
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
            Glitch <span className="display-italic">Screen</span>
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>CRT, VHS &amp; chromatic aberration</p>
        </div>

        {/* Image picker */}
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

        {/* Presets */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Preset</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {PRESETS.map(p => (
              <button key={p.key} onClick={() => applyPreset(p)} style={{
                padding: '8px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.65)',
                fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(3,57,248,0.15)'; e.currentTarget.style.color = '#7aa4ff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Slider label="RGB Split"   value={rgbSplit}    min={0}  max={50}  step={1}   onChange={setRgbSplit} />
        <Slider label="Glitch"      value={glitch}      min={0}  max={100} step={1}   onChange={setGlitch} />
        <Slider label="Scanlines"   value={scanlines}   min={0}  max={100} step={1}   onChange={setScanlines} format={v => `${Math.round(v)}%`} />
        <Slider label="Line Width"  value={scanDensity} min={2}  max={10}  step={1}   onChange={setScanDensity} />
        <Slider label="Noise"       value={noise}       min={0}  max={100} step={1}   onChange={setNoise} format={v => `${Math.round(v)}%`} />
        <Slider label="Hue"         value={hue}         min={-180} max={180} step={1} onChange={setHue} format={v => `${Math.round(v)}°`} />
        <Slider label="Saturation"  value={saturation}  min={0}  max={250} step={1}   onChange={setSaturation} format={v => `${Math.round(v)}%`} />

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
          <ExportMenu baseName="glitch" aspect={1600 / 1200} renderCanvas={renderCanvas} getSVGString={getSVGString} background="#0b0b0f" narrow={narrow} />
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
