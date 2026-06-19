import { GlowText, Panel, PanelHeader } from './Atoms';

const CATEGORY_ICONS = {
  'Brute Force': '🔨',
  'Port Scan': '🔍',
  'Suspicious IP': '🌐',
  'Unusual Login Time': '🕐',
  'Unauthorized Access': '🔒',
  'SQL Injection': '💉',
  'XSS Attack': '⚡',
  'Path Traversal': '📁',
  'Suspicious Method': '⚠️',
  'Root Login Attempt': '💀',
};

function StatCard({ label, value, color = 'green', icon, animate = false }) {
  const colors = {
    green: { text: 'var(--green-neon)', glow: '0 0 20px rgba(0,255,65,0.3)', border: 'var(--border-green)', bg: 'rgba(0,255,65,0.05)' },
    red: { text: 'var(--red-neon)', glow: '0 0 20px rgba(255,0,64,0.3)', border: 'rgba(255,0,64,0.3)', bg: 'rgba(255,0,64,0.05)' },
    orange: { text: '#ff6400', glow: '0 0 20px rgba(255,100,0,0.3)', border: 'rgba(255,100,0,0.3)', bg: 'rgba(255,100,0,0.05)' },
    amber: { text: 'var(--amber-neon)', glow: '0 0 20px rgba(255,191,0,0.3)', border: 'rgba(255,191,0,0.3)', bg: 'rgba(255,191,0,0.05)' },
    cyan: { text: 'var(--cyan-neon)', glow: '0 0 20px rgba(0,255,255,0.3)', border: 'var(--border-cyan)', bg: 'rgba(0,255,255,0.05)' },
  };
  const c = colors[color] || colors.green;

  return (
    <div className="stat-card rounded p-4 flex flex-col items-center text-center"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: animate ? c.glow : 'none',
        animation: animate ? 'pulseGlowRed 1.5s ease-in-out infinite' : 'none',
      }}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="count-display" style={{ color: c.text, textShadow: c.glow, lineHeight: 1 }}>
        {value}
      </div>
      <div className="text-xs mt-1 tracking-widest uppercase"
        style={{ color: 'rgba(0,255,65,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
        {label}
      </div>
    </div>
  );
}

function CategoryBar({ category, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const icon = CATEGORY_ICONS[category] || '⚠️';
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm w-5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-0.5">
          <span style={{ color: 'var(--cyan-neon)' }} className="truncate">{category}</span>
          <span style={{ color: 'var(--green-neon)' }} className="ml-2 font-bold">{count}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function TopIPRow({ ip, count, quarantined, onQuarantine }) {
  return (
    <div className={`flex items-center justify-between py-1.5 border-b`}
      style={{ borderColor: 'rgba(0,255,65,0.08)' }}>
      <span className={`text-xs font-mono ${quarantined ? 'quarantined' : ''}`}
        style={{ color: quarantined ? 'rgba(255,0,64,0.4)' : 'var(--cyan-neon)' }}>
        {quarantined ? '🚫 ' : '→ '}{ip}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--amber-neon)' }}>{count} events</span>
        {!quarantined && (
          <button onClick={() => onQuarantine(ip)}
            className="btn-primary btn-danger px-2 py-0.5 text-xs"
            style={{ fontSize: '10px', padding: '2px 8px' }}>
            <span>BLOCK</span>
          </button>
        )}
        {quarantined && (
          <span className="text-xs px-2 py-0.5" style={{ color: 'rgba(255,0,64,0.6)', border: '1px solid rgba(255,0,64,0.2)', borderRadius: '2px' }}>
            BLOCKED
          </span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ summary, quarantinedIPs, onQuarantineIP }) {
  const topIPs = Object.entries(summary.topIPs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const totalCatEvents = summary.flagged;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Severity counts */}
      <Panel className="p-4">
        <PanelHeader icon="⚡" title="THREAT SUMMARY" subtitle="Real-time anomaly detection results" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Lines" value={summary.total} color="green" icon="📄" />
          <StatCard label="Flagged" value={summary.flagged} color="cyan" icon="🚨" />
          <StatCard label="Critical" value={summary.critical} color="red" icon="💀" animate={summary.critical > 0} />
          <StatCard label="High" value={summary.high} color="orange" icon="🔥" />
          <StatCard label="Medium" value={summary.medium} color="amber" icon="⚠️" />
          <StatCard label="Low" value={summary.low} color="green" icon="📋" />
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Threat categories */}
        <Panel className="p-4">
          <PanelHeader icon="📊" title="THREAT CATEGORIES" color="cyan" />
          {Object.keys(summary.categories).length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'rgba(0,255,65,0.3)' }}>No threats categorized</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(summary.categories)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, cnt]) => (
                  <CategoryBar key={cat} category={cat} count={cnt} total={totalCatEvents} />
                ))
              }
            </div>
          )}
        </Panel>

        {/* Top offending IPs */}
        <Panel className="p-4" variant="red">
          <PanelHeader icon="🌐" title="TOP OFFENDING IPs" color="red" subtitle="Most active threat sources" />
          {topIPs.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'rgba(0,255,65,0.3)' }}>No IP data available</p>
          ) : (
            <div>
              {topIPs.map(([ip, count]) => (
                <TopIPRow key={ip} ip={ip} count={count}
                  quarantined={quarantinedIPs.has(ip)}
                  onQuarantine={onQuarantineIP} />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
