import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import LogoPanel from './components/LogoPanel'
import MeshGradient from './tools/MeshGradient'
import FractalGlass from './tools/FractalGlass'
import NoiseTexture from './tools/NoiseTexture'
import BlobMaker from './tools/BlobMaker'

const TOOLS = [
  { key: 'mesh', label: 'Mesh Gradient', Component: MeshGradient },
  { key: 'fractal', label: 'Fractal Glass', Component: FractalGlass },
  { key: 'noise', label: 'Noise Texture', Component: NoiseTexture },
  { key: 'blob', label: 'Blob Maker', Component: BlobMaker },
]

export function useNarrow(breakpoint = 720) {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint)
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return narrow
}

export default function App() {
  const [activeTool, setActiveTool] = useState('mesh')
  const narrow = useNarrow()
  const tool = TOOLS.find(t => t.key === activeTool)
  const ActiveComponent = tool.Component

  // Layout:
  // - Mobile: [logo header] / [main canvas] / [tool tab bar at bottom]
  // - Desktop: [logo strip far left] [main canvas] [tool nav far right]
  return (
    <div style={{
      display: 'flex',
      flexDirection: narrow ? 'column' : 'row',
      height: '100dvh', width: '100vw', background: '#0b0b0f', position: 'relative',
    }}>
      {/* Ambient glow */}
      <div aria-hidden style={{
        position: 'fixed',
        bottom: '-20vh', left: '50%', transform: 'translateX(-50%)',
        width: '90vw', height: '65vh',
        background: [
          'radial-gradient(ellipse 60% 80% at 30% 100%, rgba(110,60,200,0.22) 0%, transparent 60%)',
          'radial-gradient(ellipse 50% 70% at 65% 100%, rgba(60,100,220,0.16) 0%, transparent 55%)',
          'radial-gradient(ellipse 45% 60% at 80% 100%, rgba(190,90,130,0.12) 0%, transparent 55%)',
        ].join(', '),
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <LogoPanel narrow={narrow} />

      <main style={{ flex: 1, position: 'relative', zIndex: 5, overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
        <ActiveComponent narrow={narrow} />
      </main>

      <Sidebar tools={TOOLS} activeTool={activeTool} setActiveTool={setActiveTool} narrow={narrow} />
    </div>
  )
}
