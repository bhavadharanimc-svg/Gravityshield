// GlowText – renders text with configurable neon glow
export function GlowText({ children, color = 'green', className = '', tag: Tag = 'span' }) {
  const colorClass = {
    green: 'text-glow-green',
    cyan: 'text-glow-cyan',
    red: 'text-glow-red',
    amber: 'text-glow-amber',
  }[color] || 'text-glow-green';
  return <Tag className={`${colorClass} ${className}`}>{children}</Tag>;
}

// SeverityBadge
export function SeverityBadge({ level }) {
  const cls = {
    CRITICAL: 'badge-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
  }[level] || 'badge-low';
  return (
    <span className={`${cls} px-2 py-0.5 text-xs font-bold tracking-widest rounded`}
      style={{ fontFamily: 'Orbitron, monospace' }}>
      {level}
    </span>
  );
}

// Terminal-style panel wrapper
export function Panel({ children, className = '', variant = '' }) {
  return (
    <div className={`panel ${variant ? `panel-${variant}` : ''} ${className}`}>
      {children}
    </div>
  );
}

// Panel header with bracket decoration
export function PanelHeader({ icon, title, subtitle, color = 'green' }) {
  const colorClass = {
    green: 'text-glow-green',
    cyan: 'text-glow-cyan',
    red: 'text-glow-red',
    amber: 'text-glow-amber',
  }[color];
  return (
    <div className="flex items-center gap-3 mb-4">
      {icon && <span className={`text-xl ${colorClass}`}>{icon}</span>}
      <div>
        <h2 className={`font-orbitron text-sm font-bold tracking-widest ${colorClass}`}>
          {title}
        </h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'rgba(0,255,65,0.5)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// Spinner
export function Spinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      className="spin" style={{ filter: 'drop-shadow(0 0 6px #00ff41)' }}>
      <circle cx="12" cy="12" r="10" stroke="rgba(0,255,65,0.2)" strokeWidth="2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#00ff41" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Blinking cursor indicator
export function StatusDot({ active = true }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${active ? 'bg-green-400 animate-pulse-glow' : 'bg-gray-700'}`}
      style={active ? { boxShadow: '0 0 6px #00ff41' } : {}} />
  );
}
