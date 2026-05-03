const TOOL_ICONS = {
  mesh: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h18M12 3v18M3 8h18M3 16h18M8 3v18M16 3v18" opacity="0.4" />
    </svg>
  ),
  fractal: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <polygon points="12 6 18 9.5 18 14.5 12 18 6 14.5 6 9.5 12 6" opacity="0.5" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  noise: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8" cy="8" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="16" cy="10" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="10" cy="15" r="0.8" fill="currentColor" opacity="0.7" />
      <circle cx="17" cy="16" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="12" cy="11" r="0.6" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  glitch: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="14" height="12" rx="1.5" />
      <rect x="7" y="3" width="14" height="12" rx="1.5" opacity="0.45" />
      <line x1="3" y1="10" x2="17" y2="10" opacity="0.55" />
      <line x1="3" y1="14" x2="17" y2="14" opacity="0.55" />
    </svg>
  ),
}

export default function Sidebar({ tools, activeTool, setActiveTool, narrow }) {
  if (narrow) {
    // Bottom tab bar (mobile)
    return (
      <nav style={{
        flexShrink: 0,
        display: 'flex',
        background: 'rgba(15,15,22,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '6px 6px max(8px, env(safe-area-inset-bottom))',
        gap: 2,
        zIndex: 20,
      }}>
        {tools.map(({ key, label }) => {
          const active = activeTool === key
          const Icon = TOOL_ICONS[key]
          return (
            <button key={key} onClick={() => setActiveTool(key)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: active ? 'rgba(3,57,248,0.12)' : 'transparent',
              color: active ? '#7aa4ff' : 'rgba(255,255,255,0.4)',
              fontSize: 10, fontWeight: active ? 500 : 400,
              transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
            }}>
              <Icon />
              {label.split(' ')[0]}
            </button>
          )
        })}
      </nav>
    )
  }

  // Side bar on the FAR RIGHT (desktop)
  return (
    <aside style={{
      width: 220, height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(255,255,255,0.02)',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      flexShrink: 0, position: 'relative', zIndex: 10,
    }}>
      <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tools</span>
      </div>

      <nav style={{ padding: '10px 10px' }}>
        {tools.map(({ key, label }) => {
          const active = activeTool === key
          const Icon = TOOL_ICONS[key]
          return (
            <button key={key} onClick={() => setActiveTool(key)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              marginBottom: 2,
              background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: active ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.35)',
              fontSize: 13, fontWeight: active ? 500 : 400,
              textAlign: 'left', transition: 'all 0.15s',
            }}>
              <Icon />
              {label}
              {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#0339f8' }} />}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
