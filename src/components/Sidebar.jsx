const TOOL_ICONS = {
  mesh: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h18M12 3v18M3 8h18M3 16h18M8 3v18M16 3v18" opacity="0.4" />
    </svg>
  ),
  fractal: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <polygon points="12 6 18 9.5 18 14.5 12 18 6 14.5 6 9.5 12 6" opacity="0.5" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  noise: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8" cy="8" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="16" cy="10" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="10" cy="15" r="0.8" fill="currentColor" opacity="0.7" />
      <circle cx="17" cy="16" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="12" cy="11" r="0.6" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  blob: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c4.5 0 8 2.5 9 6s-1 7-4 9-7 2-10 0-4-6-3-9 3.5-6 8-6z" />
    </svg>
  ),
}

export default function Sidebar({ tools, activeTool, setActiveTool, narrow }) {
  const width = narrow ? 56 : 220
  return (
    <aside style={{
      width,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(255,255,255,0.02)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
      transition: 'width 0.2s',
    }}>
      {/* Logo */}
      <div style={{ padding: narrow ? '20px 0 16px' : '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: narrow ? 'center' : 'flex-start', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <svg viewBox="0 0 18.62 11.73" style={{ width: 28, height: 18, flexShrink: 0 }}>
          <polygon points="18.62 0 12 0 6 5.86 12 11.73 18.62 11.73 12.62 5.86 18.62 0" fill="#0339f8"/>
          <polygon points="0 0 0 11.72 6 5.86 0 0" fill="rgba(255,255,255,0.9)"/>
        </svg>
        {!narrow && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>
              Design <span className="display-italic">Toolkit</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>Studio</div>
          </div>
        )}
      </div>

      {/* Tool Nav */}
      <nav style={{ padding: narrow ? '12px 6px' : '12px 10px' }}>
        {!narrow && (
          <div style={{ padding: '0 12px', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tools</span>
          </div>
        )}
        {tools.map(({ key, label }) => {
          const active = activeTool === key
          const Icon = TOOL_ICONS[key]
          return (
            <button key={key} onClick={() => setActiveTool(key)} title={narrow ? label : undefined} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: narrow ? 'center' : 'flex-start', gap: 10,
              padding: narrow ? '10px 0' : '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              marginBottom: 2,
              background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: active ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.35)',
              fontSize: 13, fontWeight: active ? 500 : 400,
              textAlign: 'left', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' } }}
            >
              <Icon />
              {!narrow && label}
              {!narrow && active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#0339f8' }} />}
            </button>
          )
        })}
      </nav>

      {!narrow && <div style={{ margin: '0 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }} />}

      {/* Footer */}
      {!narrow && (
        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
            Kieran Duffy — Design Tools
          </div>
        </div>
      )}
    </aside>
  )
}
