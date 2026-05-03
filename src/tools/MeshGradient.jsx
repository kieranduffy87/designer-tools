import { useState, useRef, useCallback, useEffect } from 'react'

// ─── Utilities ───────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function uid() { return Math.random().toString(36).slice(2) }
function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)) }

// ─── Palettes ────────────────────────────────────────────────────────────────

const PALETTES = [
  { name: 'Studio',  colors: ['#0339f8', '#6e3cc8', '#f06292', '#ff8a65', '#0b0b40', '#b23cf8'] },
  { name: 'Aurora',  colors: ['#023e8a', '#0096c7', '#48cae4', '#7209b7', '#560bad', '#c77dff'] },
  { name: 'Sunset',  colors: ['#d62828', '#f77f00', '#fcbf49', '#8338ec', '#2b2d42', '#ef233c'] },
  { name: 'Neon',    colors: ['#ff006e', '#fb5607', '#ffbe0b', '#3a86ff', '#8338ec', '#00b4d8'] },
  { name: 'Forest',  colors: ['#081c15', '#1b4332', '#40916c', '#74c69d', '#b7e4c7', '#2d6a4f'] },
  { name: 'Pastel',  colors: ['#ffd6ff', '#e7c6ff', '#c8b6ff', '#b8c0ff', '#bbd0ff', '#cce5ff'] },
  { name: 'Rose',    colors: ['#590d22', '#c9184a', '#ff4d6d', '#ffb3c6', '#ff9a3c', '#800f2f'] },
  { name: 'Cyber',   colors: ['#00ff9f', '#00b8d9', '#0039cb', '#d500f9', '#00bfa5', '#121212'] },
]

// ─── IDW Mesh Rendering ───────────────────────────────────────────────────────
//
// Inverse Distance Weighting interpolation — each pixel's color is a weighted
// average of all control points, with closer points having higher influence.
// The "power" parameter controls how sharp vs. smooth the transitions are.

function renderIDW(imageData, w, h, points, power) {
  const data = imageData.data
  const rgbs = points.map(p => hexToRgb(p.color))
  const pw = power / 2

  for (let py = 0; py < h; py++) {
    const sy = h > 1 ? py / (h - 1) : 0.5
    for (let px = 0; px < w; px++) {
      const sx = w > 1 ? px / (w - 1) : 0.5
      let tw = 0, r = 0, g = 0, b = 0, exact = -1

      for (let i = 0; i < points.length; i++) {
        const dx = sx - points[i].x
        const dy = sy - points[i].y
        const d2 = dx * dx + dy * dy
        if (d2 < 1e-9) { exact = i; break }
        const wi = 1 / Math.pow(d2, pw)
        tw += wi; r += wi * rgbs[i][0]; g += wi * rgbs[i][1]; b += wi * rgbs[i][2]
      }

      let fr, fg, fb
      if (exact >= 0) { [fr, fg, fb] = rgbs[exact] }
      else { fr = r / tw; fg = g / tw; fb = b / tw }

      const idx = (py * w + px) * 4
      data[idx] = fr | 0; data[idx + 1] = fg | 0; data[idx + 2] = fb | 0; data[idx + 3] = 255
    }
  }
}

// ─── Grid generation ──────────────────────────────────────────────────────────

function generateGrid(rows, cols, colors) {
  return Array.from({ length: rows * cols }, (_, i) => {
    const r = Math.floor(i / cols), c = i % cols
    return {
      id: uid(),
      x: cols > 1 ? c / (cols - 1) : 0.5,
      y: rows > 1 ? r / (rows - 1) : 0.5,
      color: colors[i % colors.length],
    }
  })
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CW = 800, CH = 600
const RENDER_DIV = 4  // preview render at 1/4 res, upscale for speed
const HIT_PX = 18     // hit-test radius in CSS px

// ─── Component ───────────────────────────────────────────────────────────────

export default function MeshGradient({ narrow }) {
  const [palette, setPalette] = useState(PALETTES[0])
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [points, setPoints] = useState(() => generateGrid(3, 3, PALETTES[0].colors))
  const [selectedId, setSelectedId] = useState(null)
  const [power, setPower] = useState(2.0)
  const [grain, setGrain] = useState(0.15)
  const [showPoints, setShowPoints] = useState(true)
  const [animating, setAnimating] = useState(false)
  const [cursor, setCursor] = useState('crosshair')
  const [exporting, setExporting] = useState(false)

  const meshRef = useRef(null)
  const uiRef = useRef(null)
  const dragRef = useRef(null)
  const rafRef = useRef(null)
  const velRef = useRef([])

  const selectedPoint = points.find(p => p.id === selectedId) ?? null

  // ── Render gradient layer ────────────────────────────────────────────────
  const renderMesh = useCallback(() => {
    const canvas = meshRef.current
    if (!canvas) return

    const sw = Math.ceil(CW / RENDER_DIV), sh = Math.ceil(CH / RENDER_DIV)
    const imgData = new ImageData(sw, sh)
    renderIDW(imgData, sw, sh, points, power)

    const tmp = new OffscreenCanvas(sw, sh)
    tmp.getContext('2d').putImageData(imgData, 0, 0)

    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(tmp, 0, 0, CW, CH)

    // Film grain overlay
    if (grain > 0.01) {
      const gd = ctx.createImageData(CW, CH)
      const ga = (grain * 80) | 0
      for (let i = 0; i < gd.data.length; i += 4) {
        const v = ((Math.random() * 2 - 1) * 255) | 0
        gd.data[i] = gd.data[i + 1] = gd.data[i + 2] = 128 + v
        gd.data[i + 3] = ga
      }
      const gt = new OffscreenCanvas(CW, CH)
      gt.getContext('2d').putImageData(gd, 0, 0)
      ctx.save()
      ctx.globalCompositeOperation = 'overlay'
      ctx.drawImage(gt, 0, 0)
      ctx.restore()
    }
  }, [points, power, grain])

  // ── Render UI (points) layer ─────────────────────────────────────────────
  const renderUI = useCallback(() => {
    const canvas = uiRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CW, CH)
    if (!showPoints) return

    // Draw edges between adjacent grid points (subtle)
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        if (idx >= points.length) continue
        const pt = points[idx]
        if (c < cols - 1 && idx + 1 < points.length) {
          const right = points[idx + 1]
          ctx.beginPath()
          ctx.moveTo(pt.x * CW, pt.y * CH)
          ctx.lineTo(right.x * CW, right.y * CH)
          ctx.stroke()
        }
        if (r < rows - 1 && idx + cols < points.length) {
          const below = points[idx + cols]
          ctx.beginPath()
          ctx.moveTo(pt.x * CW, pt.y * CH)
          ctx.lineTo(below.x * CW, below.y * CH)
          ctx.stroke()
        }
      }
    }
    ctx.restore()

    // Draw points
    for (const pt of points) {
      const px = pt.x * CW, py = pt.y * CH
      const sel = pt.id === selectedId

      if (sel) {
        // Outer glow ring
        ctx.beginPath(); ctx.arc(px, py, 16, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke()
      }

      // Shadow
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 6
      ctx.beginPath(); ctx.arc(px, py, sel ? 9 : 6, 0, Math.PI * 2)
      ctx.fillStyle = pt.color; ctx.fill()
      ctx.restore()

      // Border
      ctx.beginPath(); ctx.arc(px, py, sel ? 9 : 6, 0, Math.PI * 2)
      ctx.strokeStyle = sel ? '#ffffff' : 'rgba(255,255,255,0.65)'
      ctx.lineWidth = sel ? 2.5 : 1.5; ctx.stroke()
    }
  }, [points, selectedId, showPoints, rows, cols])

  useEffect(() => { renderMesh() }, [renderMesh])
  useEffect(() => { renderUI() }, [renderUI])

  // ── Coordinate helpers ────────────────────────────────────────────────────
  const getPos = useCallback((e) => {
    const r = uiRef.current.getBoundingClientRect()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clamp((cx - r.left) / r.width),
      y: clamp((cy - r.top) / r.height),
    }
  }, [])

  const hitTest = useCallback((nx, ny) => {
    if (!uiRef.current) return null
    const r = uiRef.current.getBoundingClientRect()
    for (let i = points.length - 1; i >= 0; i--) {
      const dx = (nx - points[i].x) * r.width
      const dy = (ny - points[i].y) * r.height
      if (dx * dx + dy * dy < HIT_PX * HIT_PX) return points[i]
    }
    return null
  }, [points])

  // ── Mouse events ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    const pos = getPos(e)
    const hit = hitTest(pos.x, pos.y)

    if (e.button === 2) {
      if (hit && points.length > 2) {
        setPoints(prev => prev.filter(p => p.id !== hit.id))
        if (selectedId === hit.id) setSelectedId(null)
      }
      return
    }

    if (hit) {
      setSelectedId(hit.id)
      dragRef.current = hit.id
      setCursor('grabbing')
    } else {
      setSelectedId(null)
      dragRef.current = null
    }
  }, [getPos, hitTest, points, selectedId])

  const onMouseMove = useCallback((e) => {
    const pos = getPos(e)
    if (dragRef.current) {
      e.preventDefault()
      setPoints(prev => prev.map(p =>
        p.id === dragRef.current ? { ...p, x: pos.x, y: pos.y } : p
      ))
      setCursor('grabbing')
    } else {
      setCursor(hitTest(pos.x, pos.y) ? 'grab' : 'crosshair')
    }
  }, [getPos, hitTest])

  const onMouseUp = useCallback(() => {
    dragRef.current = null
    setCursor('crosshair')
  }, [])

  const onDoubleClick = useCallback((e) => {
    const pos = getPos(e)
    if (hitTest(pos.x, pos.y)) return
    const newPt = {
      id: uid(), x: pos.x, y: pos.y,
      color: palette.colors[Math.floor(Math.random() * palette.colors.length)],
    }
    setPoints(prev => [...prev, newPt])
    setSelectedId(newPt.id)
  }, [getPos, hitTest, palette])

  // ── Animation ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!animating) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    velRef.current = Array.from({ length: 64 }, () => ({
      vx: (Math.random() - 0.5) * 0.0018,
      vy: (Math.random() - 0.5) * 0.0018,
    }))
    const tick = () => {
      setPoints(prev => prev.map((pt, i) => {
        if (!velRef.current[i]) velRef.current[i] = { vx: (Math.random() - 0.5) * 0.0018, vy: (Math.random() - 0.5) * 0.0018 }
        const v = velRef.current[i]
        let nx = pt.x + v.vx, ny = pt.y + v.vy
        if (nx <= 0 || nx >= 1) { v.vx *= -1; nx = clamp(nx) }
        if (ny <= 0 || ny >= 1) { v.vy *= -1; ny = clamp(ny) }
        return { ...pt, x: nx, y: ny }
      }))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [animating])

  // ── Actions ───────────────────────────────────────────────────────────────
  const applyPalette = useCallback((pal) => {
    setPalette(pal)
    setPoints(prev => prev.map((pt, i) => ({ ...pt, color: pal.colors[i % pal.colors.length] })))
  }, [])

  const applyGrid = useCallback((r, c) => {
    setRows(r); setCols(c)
    setPoints(generateGrid(r, c, palette.colors))
    setSelectedId(null)
  }, [palette])

  const randomizeColors = useCallback(() => {
    setPoints(prev => prev.map(pt => ({
      ...pt,
      color: palette.colors[Math.floor(Math.random() * palette.colors.length)],
    })))
  }, [palette])

  const warpPoints = useCallback(() => {
    setPoints(prev => prev.map(pt => ({
      ...pt,
      x: clamp(pt.x + (Math.random() - 0.5) * 0.3),
      y: clamp(pt.y + (Math.random() - 0.5) * 0.3),
    })))
  }, [])

  const exportPNG = useCallback(() => {
    setExporting(true)
    setTimeout(() => {
      const EW = CW * 4, EH = CH * 4
      // Render at 2x export res then upscale
      const rw = CW * 2, rh = CH * 2
      const imgData = new ImageData(rw, rh)
      renderIDW(imgData, rw, rh, points, power)
      const src = new OffscreenCanvas(rw, rh)
      src.getContext('2d').putImageData(imgData, 0, 0)

      const canvas = document.createElement('canvas')
      canvas.width = EW; canvas.height = EH
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(src, 0, 0, EW, EH)

      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'mesh-gradient.png'; a.click()
        URL.revokeObjectURL(url)
        setExporting(false)
      }, 'image/png')
    }, 50)
  }, [points, power])

  // ── Buttons helper ────────────────────────────────────────────────────────
  const Btn = ({ onClick, children, primary, small, danger }) => (
    <button onClick={onClick} style={{
      padding: small ? '6px 10px' : '10px 0',
      width: small ? 'auto' : '100%',
      borderRadius: 10, border: danger ? '1px solid rgba(255,80,80,0.3)' : primary ? 'none' : '1px solid rgba(255,255,255,0.12)',
      background: danger ? 'rgba(255,60,60,0.08)' : primary ? '#0339f8' : 'rgba(255,255,255,0.05)',
      color: danger ? 'rgba(255,120,120,0.9)' : '#fff',
      fontSize: 12, fontWeight: primary ? 500 : 400, cursor: 'pointer',
      transition: 'all 0.15s',
      opacity: exporting && primary ? 0.7 : 1,
    }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? 'rgba(255,60,60,0.15)' : primary ? '#0250ff' : 'rgba(255,255,255,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.background = danger ? 'rgba(255,60,60,0.08)' : primary ? '#0339f8' : 'rgba(255,255,255,0.05)' }}
    >{children}</button>
  )

  const Toggle = ({ label, value, set }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <button onClick={() => set(!value)} style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: value ? '#0339f8' : 'rgba(255,255,255,0.1)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 2, left: value ? 18 : 2, transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    const pos = getPos(e)
    const hit = hitTest(pos.x, pos.y)
    if (hit) { setSelectedId(hit.id); dragRef.current = hit.id }
    else { setSelectedId(null); dragRef.current = null }
  }, [getPos, hitTest])
  const onTouchMove = useCallback((e) => {
    if (!dragRef.current) return
    e.preventDefault()
    const pos = getPos(e)
    setPoints(prev => prev.map(p => p.id === dragRef.current ? { ...p, x: pos.x, y: pos.y } : p))
  }, [getPos])
  const onTouchEnd = useCallback(() => { dragRef.current = null }, [])

  return (
    <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', height: '100%', width: '100%' }}>

      {/* ── Canvas area ─────────────────────────────────────────────────── */}
      <div style={{ flex: narrow ? '0 0 auto' : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: narrow ? 12 : 32, minWidth: 0, gap: narrow ? 8 : 16 }}>
        <div style={{
          position: 'relative',
          width: '100%', maxWidth: 800,
          aspectRatio: `${CW} / ${CH}`,
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          flexShrink: 0,
        }}>
          {/* Gradient layer */}
          <canvas ref={meshRef} width={CW} height={CH} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            borderRadius: 16, display: 'block',
          }} />
          {/* Interaction layer */}
          <canvas ref={uiRef} width={CW} height={CH} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            borderRadius: 16, cursor, userSelect: 'none', touchAction: 'none',
          }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onDoubleClick={onDoubleClick}
            onContextMenu={e => e.preventDefault()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />
          {/* Hint */}
          {showPoints && !narrow && (
            <div style={{
              position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center',
              fontSize: 10, color: 'rgba(255,255,255,0.18)', pointerEvents: 'none',
              letterSpacing: '0.02em',
            }}>
              Drag · Double-click to add · Right-click to remove
            </div>
          )}
        </div>

        {/* Point count badge */}
        {!narrow && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              padding: '4px 12px', borderRadius: 999,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 11, color: 'rgba(255,255,255,0.3)',
            }}>
              {points.length} points · IDW power {power.toFixed(1)}
            </div>
            {animating && (
              <div style={{
                padding: '4px 12px', borderRadius: 999,
                background: 'rgba(3,57,248,0.15)', border: '1px solid rgba(3,57,248,0.3)',
                fontSize: 11, color: 'rgba(100,160,255,0.8)',
              }}>
                Animating
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Controls panel ──────────────────────────────────────────────── */}
      <div style={{
        width: narrow ? '100%' : 260, flexShrink: 0,
        flex: narrow ? '1 1 auto' : '0 0 auto',
        height: narrow ? 'auto' : '100%',
        overflowY: 'auto',
        background: 'rgba(255,255,255,0.02)',
        borderLeft: narrow ? 'none' : '1px solid rgba(255,255,255,0.06)',
        borderTop: narrow ? '1px solid rgba(255,255,255,0.06)' : 'none',
        padding: narrow ? '14px 16px' : '24px 20px',
        display: 'flex', flexDirection: 'column', gap: narrow ? 14 : 20,
      }}>

        {/* Header */}
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: 'rgba(255,255,255,0.85)', margin: '0 0 4px' }}>
            Mesh <span className="display-italic">Gradient</span>
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>True IDW interpolation</p>
        </div>

        {/* ── Selected point ─────────────────────────────────────────────── */}
        {selectedPoint ? (
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: 14,
          }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Point</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, background: selectedPoint.color,
                  border: '2px solid rgba(255,255,255,0.25)', boxShadow: `0 4px 12px ${selectedPoint.color}66`,
                }} />
                <input type="color" value={selectedPoint.color}
                  onChange={e => setPoints(prev => prev.map(p =>
                    p.id === selectedId ? { ...p, color: e.target.value } : p
                  ))}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                />
              </label>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)' }}>{selectedPoint.color.toUpperCase()}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {(selectedPoint.x * 100).toFixed(0)}%, {(selectedPoint.y * 100).toFixed(0)}%
                </div>
              </div>
              <Btn small danger onClick={() => {
                if (points.length > 2) {
                  setPoints(prev => prev.filter(p => p.id !== selectedId))
                  setSelectedId(null)
                }
              }}>Delete</Btn>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)',
            borderRadius: 12, padding: 14, textAlign: 'center',
            fontSize: 11, color: 'rgba(255,255,255,0.2)',
          }}>
            Click a point to edit it
          </div>
        )}

        {/* ── Palette ────────────────────────────────────────────────────── */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Palette</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {PALETTES.map(pal => (
              <button key={pal.name} onClick={() => applyPalette(pal)} title={pal.name} style={{
                width: 28, height: 18, borderRadius: 6, cursor: 'pointer',
                background: `linear-gradient(135deg, ${pal.colors.slice(0, 4).join(', ')})`,
                border: `1.5px solid ${palette.name === pal.name ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: palette.name === pal.name ? '0 0 0 1px rgba(255,255,255,0.15)' : 'none',
                transition: 'border-color 0.15s',
              }} />
            ))}
          </div>
        </div>

        {/* ── Grid presets ───────────────────────────────────────────────── */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Grid</label>
          <div style={{ display: 'flex', gap: 5 }}>
            {[[2,2],[3,3],[4,4],[5,5]].map(([r, c]) => {
              const active = rows === r && cols === c
              return (
                <button key={`${r}x${c}`} onClick={() => applyGrid(r, c)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.15s',
                }}>{r}×{c}</button>
              )
            })}
          </div>
        </div>

        {/* ── Smoothness (IDW power) ─────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Smoothness</label>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>{power.toFixed(1)}</span>
          </div>
          <input type="range" min="0.5" max="6" step="0.1" value={power}
            onChange={e => setPower(parseFloat(e.target.value))} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
            <span>Sharp</span><span>Smooth</span>
          </div>
        </div>

        {/* ── Grain ─────────────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Film Grain</label>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>{(grain * 100).toFixed(0)}%</span>
          </div>
          <input type="range" min="0" max="1" step="0.01" value={grain}
            onChange={e => setGrain(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>

        {/* ── Toggles ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Toggle label="Show Points" value={showPoints} set={setShowPoints} />
          <Toggle label="Animate" value={animating} set={setAnimating} />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={randomizeColors} style={{
              flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
              fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >Randomize</button>
            <button onClick={warpPoints} style={{
              flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
              fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >Warp</button>
          </div>
          <button onClick={exportPNG} disabled={exporting} style={{
            width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
            background: exporting ? 'rgba(3,57,248,0.5)' : '#0339f8', color: '#fff',
            fontSize: 12, fontWeight: 500, cursor: exporting ? 'wait' : 'pointer',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = '#0250ff' }}
            onMouseLeave={e => { if (!exporting) e.currentTarget.style.background = '#0339f8' }}
          >
            {exporting ? 'Exporting…' : 'Export PNG (3200×2400)'}
          </button>
        </div>
      </div>
    </div>
  )
}
