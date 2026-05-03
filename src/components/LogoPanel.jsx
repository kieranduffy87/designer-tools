// Logo strip — far left on desktop, top header on mobile.
export default function LogoPanel({ narrow }) {
  if (narrow) {
    return (
      <header style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px 12px',
        background: 'rgba(15,15,22,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        zIndex: 15,
      }}>
        <svg viewBox="0 0 18.62 11.73" style={{ width: 34, height: 22, flexShrink: 0 }}>
          <polygon points="18.62 0 12 0 6 5.86 12 11.73 18.62 11.73 12.62 5.86 18.62 0" fill="#0339f8"/>
          <polygon points="0 0 0 11.72 6 5.86 0 0" fill="rgba(255,255,255,0.92)"/>
        </svg>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.92)', lineHeight: 1.15 }}>
            Design <span className="display-italic">Toolkit</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Studio · Kieran Duffy</div>
        </div>
      </header>
    )
  }

  // Desktop: thin vertical strip on the far left
  return (
    <aside style={{
      width: 64, height: '100vh', flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 0',
      background: 'rgba(255,255,255,0.015)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      zIndex: 10, position: 'relative',
    }}>
      <svg viewBox="0 0 18.62 11.73" style={{ width: 32, height: 20, flexShrink: 0 }}>
        <polygon points="18.62 0 12 0 6 5.86 12 11.73 18.62 11.73 12.62 5.86 18.62 0" fill="#0339f8"/>
        <polygon points="0 0 0 11.72 6 5.86 0 0" fill="rgba(255,255,255,0.92)"/>
      </svg>

      {/* Vertical wordmark */}
      <div style={{
        marginTop: 18,
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        fontSize: 11, letterSpacing: '0.18em',
        color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
      }}>
        Design <span className="display-italic" style={{ letterSpacing: '0.05em' }}>Toolkit</span>
      </div>

      <div style={{
        marginTop: 'auto',
        fontSize: 9, color: 'rgba(255,255,255,0.18)',
        writingMode: 'vertical-rl', transform: 'rotate(180deg)',
        letterSpacing: '0.12em',
      }}>
        Kieran Duffy
      </div>
    </aside>
  )
}
