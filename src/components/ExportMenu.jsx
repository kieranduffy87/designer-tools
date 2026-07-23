import { useState, useCallback, useRef, useEffect } from 'react'
import {
  MIME, OPAQUE_FORMATS, downloadBlob, canvasToBlob,
  copyCanvasToClipboard, svgStringToCanvas,
} from '../lib/exporter'

// Resolution presets, expressed as the long-edge width in pixels.
const RES = [
  { key: '1k', label: '1K', edge: 1280 },
  { key: '2k', label: '2K', edge: 2560 },
  { key: '4k', label: '4K', edge: 3840 },
]

const RASTER_FORMATS = [
  { key: 'png', label: 'PNG' },
  { key: 'jpg', label: 'JPG' },
  { key: 'webp', label: 'WEBP' },
]

/**
 * Shared export control used by every tool.
 *
 * Props:
 *  - baseName:      download filename stem, e.g. "mesh-gradient"
 *  - aspect:        width / height of the artwork (defaults to 4:3)
 *  - renderCanvas:  async (w, h) => HTMLCanvasElement   (required)
 *  - getSVGString:  async () => string                  (optional → enables SVG)
 *  - background:    opaque fill for JPG / flattening     (optional)
 *  - narrow:        mobile flag (affects popover placement)
 */
export default function ExportMenu({
  baseName, aspect = 4 / 3, renderCanvas, getSVGString, background, narrow,
}) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState('png')
  const [resKey, setResKey] = useState('4k')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const wrapRef = useRef(null)

  const hasSVG = typeof getSVGString === 'function'
  const isVector = format === 'svg'

  const res = RES.find(r => r.key === resKey) || RES[2]
  const W = res.edge
  const H = Math.round(res.edge / aspect)

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const flash = useCallback((msg) => {
    setStatus(msg)
    setTimeout(() => setStatus(''), 2200)
  }, [])

  const buildRaster = useCallback(async () => {
    const canvas = await renderCanvas(W, H)
    // For opaque formats, flatten onto a background if the source has alpha.
    if (OPAQUE_FORMATS.has(format) && background) {
      const flat = document.createElement('canvas')
      flat.width = canvas.width; flat.height = canvas.height
      const ctx = flat.getContext('2d')
      ctx.fillStyle = background
      ctx.fillRect(0, 0, flat.width, flat.height)
      ctx.drawImage(canvas, 0, 0)
      return flat
    }
    return canvas
  }, [renderCanvas, W, H, format, background])

  const doDownload = useCallback(async () => {
    setBusy(true)
    try {
      if (isVector) {
        const svg = await getSVGString()
        downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${baseName}.svg`)
      } else {
        const canvas = await buildRaster()
        const quality = format === 'png' ? undefined : 0.92
        const blob = await canvasToBlob(canvas, MIME[format], quality)
        downloadBlob(blob, `${baseName}-${res.label}.${format}`)
      }
      flash('Saved ✓')
    } catch (err) {
      console.error('Export failed:', err)
      flash('Export failed')
    } finally {
      setBusy(false)
    }
  }, [isVector, getSVGString, buildRaster, format, baseName, res, flash])

  const doCopy = useCallback(async () => {
    setBusy(true)
    try {
      const canvas = await buildRaster()
      const ok = await copyCanvasToClipboard(canvas)
      flash(ok ? 'Copied ✓' : 'Copy unavailable')
    } catch (err) {
      console.error('Copy failed:', err)
      flash('Copy failed')
    } finally {
      setBusy(false)
    }
  }, [buildRaster, flash])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 16px', borderRadius: 10, border: 'none',
          background: '#0339f8', color: '#fff',
          fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#0250ff')}
        onMouseLeave={e => (e.currentTarget.style.background = '#0339f8')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
        <span style={{ opacity: 0.7, fontSize: 10, marginLeft: 2 }}>
          {isVector ? 'SVG' : `${format.toUpperCase()} · ${res.label}`}
        </span>
      </button>

      {status && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
          textAlign: 'center', fontSize: 11, fontWeight: 500,
          color: status.includes('✓') ? '#6ee7a8' : '#ff8a8a',
          pointerEvents: 'none',
        }}>{status}</div>
      )}

      {open && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)', left: 0, right: 0,
          background: 'rgba(22,22,30,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, padding: 14,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          zIndex: 50,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* Format */}
          <div>
            <label style={labelStyle}>Format</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {RASTER_FORMATS.map(f => (
                <Chip key={f.key} active={format === f.key} onClick={() => setFormat(f.key)}>{f.label}</Chip>
              ))}
              {hasSVG && (
                <Chip active={format === 'svg'} onClick={() => setFormat('svg')}>SVG</Chip>
              )}
            </div>
          </div>

          {/* Resolution (raster only) */}
          {!isVector && (
            <div>
              <label style={labelStyle}>Resolution</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {RES.map(r => (
                  <Chip key={r.key} active={resKey === r.key} onClick={() => setResKey(r.key)} grow>
                    {r.label}
                  </Chip>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {W} × {H} px
              </div>
            </div>
          )}
          {isVector && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              Vector output — resolution independent.
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={doDownload} disabled={busy} style={{
              flex: 1, padding: '9px 0', borderRadius: 9, border: 'none',
              background: busy ? 'rgba(3,57,248,0.5)' : '#0339f8', color: '#fff',
              fontSize: 12, fontWeight: 500, cursor: busy ? 'wait' : 'pointer',
            }}>
              {busy ? 'Working…' : 'Download'}
            </button>
            <button onClick={doCopy} disabled={busy || isVector} title={isVector ? 'Copy is only available for raster formats' : 'Copy PNG to clipboard'} style={{
              flex: 1, padding: '9px 0', borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: isVector ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.8)',
              fontSize: 12, fontWeight: 500, cursor: (busy || isVector) ? 'not-allowed' : 'pointer',
            }}>
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8,
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

function Chip({ active, onClick, children, grow }) {
  return (
    <button onClick={onClick} style={{
      flex: grow ? 1 : '0 0 auto',
      padding: '6px 12px', borderRadius: 8,
      border: `1px solid ${active ? 'rgba(3,57,248,0.6)' : 'rgba(255,255,255,0.1)'}`,
      background: active ? 'rgba(3,57,248,0.18)' : 'rgba(255,255,255,0.03)',
      color: active ? '#9db8ff' : 'rgba(255,255,255,0.5)',
      fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s',
    }}>{children}</button>
  )
}
