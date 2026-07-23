// Shared export helpers used by every tool's ExportMenu.
//
// Tools provide a `renderCanvas(w, h)` (async → HTMLCanvasElement) for raster
// output, and optionally an async `getSVGString()` for self-contained vector
// output. Everything else — format, resolution, download, clipboard — lives
// here so behaviour stays identical across tools.

export const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
}

// Formats that produce no alpha channel and therefore need an opaque backing.
export const OPAQUE_FORMATS = new Set(['jpg'])

// Trigger a browser download for a Blob.
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Promise wrapper around canvas.toBlob.
export function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
      type,
      quality,
    )
  })
}

// Copy a canvas to the clipboard as PNG. Returns true on success, false if the
// browser lacks async-clipboard image support or the write is blocked.
export async function copyCanvasToClipboard(canvas) {
  if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') return false
  try {
    const blob = await canvasToBlob(canvas, 'image/png')
    await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
    return true
  } catch {
    return false
  }
}

// Rasterise an SVG string into a canvas at w×h. `background` fills the canvas
// first (needed for opaque formats or partially transparent artwork).
export function svgStringToCanvas(svgString, w, h, background) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (background) {
          ctx.fillStyle = background
          ctx.fillRect(0, 0, w, h)
        }
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas)
      } catch (err) {
        reject(err)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to rasterise SVG'))
    }
    img.src = url
  })
}

// Fetch any image URL and return a self-contained data: URL so serialised SVGs
// and canvases stay untainted when exported.
export async function toDataURL(src) {
  if (!src || src.startsWith('data:')) return src
  const res = await fetch(src, { mode: 'cors' })
  const blob = await res.blob()
  return await new Promise((resolve) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.readAsDataURL(blob)
  })
}
