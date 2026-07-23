import { useState, useRef, useCallback, useEffect } from 'react'
import ExportMenu from '../components/ExportMenu'

// Sample images that look great as halftones (high contrast, strong subjects).
const SAMPLES = [
  { key: 'portrait', label: 'Portrait', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=70' },
  { key: 'face',     label: 'Face',     url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70' },
  { key: 'neon',     label: 'Neon',     url: 'https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=200&q=70' },
  { key: 'tokyo',    label: 'Tokyo',    url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=200&q=70' },
  { key: 'city',     label: 'Skyline',  url: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=200&q=70' },
  { key: 'building', label: 'Building', url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=2000&q=92', thumb: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=200&q=70' },
]

const PRESETS = [
  { key: 'news',  label: 'News',     values: { dotSize: 7,  angle: 45, contrast: 1.25, brightness: 0,   colorMode: 'mono',    bgColor: '#ffffff', fgColor: '#0a0a0a', shape: 'dot',    invert: false } },
  { key: 'comic', label: 'Comic',    values: { dotSize: 9,  angle: 0,  contrast: 1.6,  brightness: 5,   colorMode: 'mono',    bgColor: '#fef9e7', fgColor: '#0a0a0a', shape: 'dot',    invert: false } },
  { key: 'pop',   label: 'Pop',      values: { dotSize: 11, angle: 30, contrast: 1.4,  brightness: 0,   colorMode: 'duotone', bgColor: '#fff200', fgColor: '#ec008c', shape: 'dot',    invert: false } },
  { key: 'riso',  label: 'Risograph',values: { dotSize: 8,  angle: 22, contrast: 1.35, brightness: 8,   colorMode: 'duotone', bgColor: '#f4f1e8', fgColor: '#3d50d9', shape: 'dot',    invert: false } },
  { key: 'cmyk',  label: 'CMYK',     values: { dotSize: 9,  angle: 0,  contrast: 1.2,  brightness: 0,   colorMode: 'cmyk',    bgColor: '#ffffff', fgColor: '#000000', shape: 'dot',    invert: false } },
  { key: 'punk',  label: 'Punk',     values: { dotSize: 10, angle: 15, contrast: 1.8,  brightness: -10, colorMode: 'duotone', bgColor: '#000000', fgColor: '#00ff88', shape: 'dot',    invert: true  } },
]

// Display-canvas resolution used for the live preview. Exports render fresh at
// the resolution chosen in the ExportMenu.
const VIEW_W = 1600, VIEW_H = 1200

// Luminance + per-channel "ink amount" sample functions.
const lumInk = (r, g, b) => 1 - (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
const cInk   = (r, g, b) => 1 - r / 255
const mInk   = (_, g)    => 1 - g / 255
const yInk   = (_, __, b) => 1 - b / 255
const kInk   = (r, g, b) => Math.min(1 - r/255, 1 - g/255, 1 - b/255)

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Cover-fit draw of the source image into the target canvas.
function drawCover(ctx, img, W, H) {
  const ar = img.width / img.height
  const tar = W / H
  let dw, dh, dx, dy
  if (ar > tar) {
    dh = H; dw = H * ar; dx = (W - dw) / 2; dy = 0
  } else {
    dw = W; dh = W / ar; dx = 0; dy = (H - dh) / 2
  }
  ctx.drawImage(img, dx, dy, dw, dh)
}

// Render one halftone layer to ctx using a sample function (0-1 = ink amount).
// shape: 'dot' (circle), 'square' (rotated square), 'line' (horizontal stroke).
function drawHalftoneLayer({ ctx, srcData, W, H, dotSize, angleDeg, color, sampleFn, blendMode, shape, invert }) {
  ctx.save()
  if (blendMode) ctx.globalCompositeOperation = blendMode
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineCap = 'round'

  const angle = angleDeg * Math.PI / 180
  const cos = Math.cos(angle), sin = Math.sin(angle)

  const diag = Math.ceil(Math.hypot(W, H))
  const n = Math.ceil(diag / dotSize) + 2
  const cx = W / 2, cy = H / 2

  // Maximum dot footprint that just covers a grid cell + a touch of overlap.
  const rMax = dotSize * 0.72

  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) {
      const lx = (i + 0.5) * dotSize - cx
      const ly = (j + 0.5) * dotSize - cy
      // Rotate around the canvas center.
      const x = cx + lx * cos - ly * sin
      const y = cy + lx * sin + ly * cos

      if (x < -dotSize || x > W + dotSize || y < -dotSize || y > H + dotSize) continue

      const sx = Math.max(0, Math.min(W - 1, Math.floor(x)))
      const sy = Math.max(0, Math.min(H - 1, Math.floor(y)))
      const idx = (sy * W + sx) * 4
      let v = sampleFn(srcData[idx], srcData[idx + 1], srcData[idx + 2])
      if (invert) v = 1 - v
      if (v <= 0.02) continue

      const r = v * rMax

      if (shape === 'square') {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angle)
        const s = r * 1.6
        ctx.fillRect(-s / 2, -s / 2, s, s)
        ctx.restore()
      } else if (shape === 'line') {
        const len = v * dotSize * 1.2
        ctx.lineWidth = Math.max(0.6, dotSize * 0.35)
        ctx.beginPath()
        ctx.moveTo(x - (len / 2) * cos, y - (len / 2) * sin)
        ctx.lineTo(x + (len / 2) * cos, y + (len / 2) * sin)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.restore()
}

// Render the full halftone composition to a target canvas at any resolution.
function renderHalftone({ canvas, image, W, H, dotSize, angle, contrast, brightness, colorMode, bgColor, fgColor, shape, invert }) {
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Pass 1: paint the source image to a temp canvas (with contrast/brightness),
  // then read its pixels for sampling.
  const tmp = document.createElement('canvas')
  tmp.width = W; tmp.height = H
  const tctx = tmp.getContext('2d')
  tctx.imageSmoothingEnabled = true
  tctx.imageSmoothingQuality = 'high'
  tctx.filter = `contrast(${contrast}) brightness(${100 + brightness}%)`
  drawCover(tctx, image, W, H)
  tctx.filter = 'none'

  const srcData = tctx.getImageData(0, 0, W, H).data

  // Pass 2: paint the halftone.
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)

  if (colorMode === 'cmyk') {
    // Standard CMYK screen angles. Using `multiply` blending on a white-ish
    // background simulates ink stacking.
    drawHalftoneLayer({ ctx, srcData, W, H, dotSize, angleDeg: 15, color: '#FFEC00', sampleFn: yInk, blendMode: 'multiply', shape, invert })
    drawHalftoneLayer({ ctx, srcData, W, H, dotSize, angleDeg: 75, color: '#00B7EB', sampleFn: cInk, blendMode: 'multiply', shape, invert })
    drawHalftoneLayer({ ctx, srcData, W, H, dotSize, angleDeg: 45, color: '#EC008C', sampleFn: mInk, blendMode: 'multiply', shape, invert })
    drawHalftoneLayer({ ctx, srcData, W, H, dotSize, angleDeg: 0,  color: '#0a0a0a', sampleFn: kInk, blendMode: 'multiply', shape, invert })
  } else {
    // Mono / Duotone: bgColor = paper, fgColor = ink, dot size = inverse luminance.
    drawHalftoneLayer({ ctx, srcData, W, H, dotSize, angleDeg: angle, color: fgColor, sampleFn: lumInk, shape, invert })
  }
}

export default function HalftoneScreen({ narrow }) {
  const [sampleKey, setSampleKey] = useState('portrait')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [dotSize, setDotSize] = useState(8)
  const [angle, setAngle] = useState(45)
  const [contrast, setContrast] = useState(1.25)
  const [brightness, setBrightness] = useState(0)
  const [colorMode, setColorMode] = useState('mono')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [fgColor, setFgColor] = useState('#0a0a0a')
  const [shape, setShape] = useState('dot')
  const [invert, setInvert] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [loading, setLoading] = useState(true)

  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  const sample = SAMPLES.find(s => s.key === sampleKey) || SAMPLES[0]
  const imageHref = uploadedImage || sample.url

  // Load the source image whenever it changes.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadImage(imageHref).then(img => {
      if (cancelled) return
      imageRef.current = img
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [imageHref])

  // Re-render the halftone whenever any control changes.
  useEffect(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || loading) return
    if (showOriginal) {
      canvas.width = VIEW_W; canvas.height = VIEW_H
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#0b0b0f'
      ctx.fillRect(0, 0, VIEW_W, VIEW_H)
      drawCover(ctx, image, VIEW_W, VIEW_H)
      return
    }
    renderHalftone({
      canvas, image,
      W: VIEW_W, H: VIEW_H,
      dotSize, angle, contrast, brightness,
      colorMode, bgColor, fgColor, shape, invert,
    })
  }, [loading, showOriginal, dotSize, angle, contrast, brightness, colorMode, bgColor, fgColor, shape, invert])

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
    setDotSize(v.dotSize); setAngle(v.angle); setContrast(v.contrast); setBrightness(v.brightness)
    setColorMode(v.colorMode); setBgColor(v.bgColor); setFgColor(v.fgColor)
    setShape(v.shape); setInvert(v.invert)
  }, [])

  // Render the halftone at an arbitrary export resolution. Dot size scales with
  // resolution so dot density stays visually identical to the preview.
  const renderCanvas = useCallback(async (w, h) => {
    const image = imageRef.current
    if (!image) throw new Error('Image not loaded')
    const canvas = document.createElement('canvas')
    const scale = w / VIEW_W
    renderHalftone({
      canvas, image,
      W: w, H: h,
      dotSize: dotSize * scale,
      angle, contrast, brightness,
      colorMode, bgColor, fgColor, shape, invert,
    })
    return canvas
  }, [dotSize, angle, contrast, brightness, colorMode, bgColor, fgColor, shape, invert])

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
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)', background: bgColor,
        }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

          {loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(11,11,15,0.6)', color: 'rgba(255,255,255,0.6)', fontSize: 12,
            }}>Loading image…</div>
          )}

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
            Halftone <span className="display-italic">Photo</span>
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Newsprint, comic & CMYK halftone effects</p>
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

        {/* Color mode */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Mode</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { k: 'mono', l: 'Mono' },
              { k: 'duotone', l: 'Duotone' },
              { k: 'cmyk', l: 'CMYK' },
            ].map(({ k, l }) => (
              <button key={k} onClick={() => setColorMode(k)} style={{
                flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: colorMode === k ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                color: colorMode === k ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                fontSize: 11, cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Shape */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Shape</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { k: 'dot', l: 'Dot' },
              { k: 'square', l: 'Square' },
              { k: 'line', l: 'Line' },
            ].map(({ k, l }) => (
              <button key={k} onClick={() => setShape(k)} style={{
                flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: shape === k ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                color: shape === k ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                fontSize: 11, cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Colors (mono/duotone only) */}
        {colorMode !== 'cmyk' && (
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Colors</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ position: 'relative' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: bgColor, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)' }} />
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>paper</span>
              <label style={{ position: 'relative', marginLeft: 'auto' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: fgColor, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)' }} />
                <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>ink</span>
            </div>
          </div>
        )}

        <Slider label="Dot Size"   value={dotSize}    min={3}    max={30}  step={1}    onChange={setDotSize} />
        <Slider label="Angle"      value={angle}      min={0}    max={90}  step={1}    onChange={setAngle} format={v => `${Math.round(v)}°`} />
        <Slider label="Contrast"   value={contrast}   min={0.5}  max={3}   step={0.05} onChange={setContrast} format={v => v.toFixed(2)} />
        <Slider label="Brightness" value={brightness} min={-50}  max={50}  step={1}    onChange={setBrightness} format={v => `${v > 0 ? '+' : ''}${Math.round(v)}`} />

        <div>
          <button onClick={() => setInvert(v => !v)} style={{
            width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: invert ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
            color: invert ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
            fontSize: 11, cursor: 'pointer',
          }}>
            {invert ? 'Inverted ✓' : 'Invert'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ExportMenu baseName="halftone" aspect={VIEW_W / VIEW_H} renderCanvas={renderCanvas} background={bgColor} narrow={narrow} />
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
