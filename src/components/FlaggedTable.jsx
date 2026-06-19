import { useState, useCallback, useRef } from 'react';
import { GlowText, SeverityBadge, Panel, PanelHeader, Spinner, StatusDot } from './Atoms';

const THREAT_COLORS = {
  CRITICAL: { border: 'threat-brute', color: 'var(--red-neon)' },
  HIGH: { border: 'threat-scan', color: '#ff6400' },
  MEDIUM: { border: 'threat-login', color: 'var(--amber-neon)' },
  LOW: { border: 'threat-generic', color: 'var(--green-dim)' },
};

const TYPE_ICONS = {
  BRUTE_FORCE: '🔨',
  PORT_SCAN: '🔍',
  SUSPICIOUS_IP: '🌐',
  UNUSUAL_TIME: '🕐',
  FORBIDDEN: '🔒',
  UNAUTHORIZED: '🔑',
  SQL_INJECTION: '💉',
  XSS: '⚡',
  PATH_TRAVERSAL: '📁',
  SUSPICIOUS_METHOD: '⚠️',
  ROOT_LOGIN: '💀',
};

function ThreatTag({ threat }) {
  const icon = TYPE_ICONS[threat.type] || '⚠️';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs mr-1 mb-1 rounded"
      style={{
        background: 'rgba(0,255,255,0.06)',
        border: '1px solid rgba(0,255,255,0.2)',
        color: 'var(--cyan-neon)',
        fontSize: '10px',
      }}>
      {icon} {threat.category}
    </span>
  );
}

function LogRow({ entry, quarantined, onQuarantine, index }) {
  const [expanded, setExpanded] = useState(false);
  const tc = THREAT_COLORS[entry.severity] || THREAT_COLORS.LOW;
  const isQuarantined = quarantined;
  const animDelay = `${Math.min(index * 0.05, 1)}s`;

  return (
    <div className={`log-row ${tc.border} animate-slide-in-left`}
      style={{ animationDelay: animDelay, opacity: isQuarantined ? 0.5 : 1 }}>
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}>
        {/* Line number */}
        <span className="text-xs w-12 shrink-0 text-right"
          style={{ color: 'rgba(0,255,65,0.3)', fontFamily: 'JetBrains Mono' }}>
          {String(entry.lineNumber).padStart(4, '0')}
        </span>

        {/* Severity badge */}
        <div className="shrink-0 pt-0.5">
          <SeverityBadge level={entry.severity} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-1">
            {/* Timestamp */}
            <span style={{ color: 'rgba(0,255,65,0.6)' }}>
              ⏱ {entry.displayTime}
            </span>
            {/* IP */}
            {entry.ip && (
              <span className={isQuarantined ? 'quarantined' : ''}
                style={{ color: isQuarantined ? 'rgba(255,0,64,0.5)' : 'var(--cyan-neon)', textShadow: isQuarantined ? 'none' : '0 0 8px rgba(0,255,255,0.5)' }}>
                {isQuarantined ? '🚫' : '→'} {entry.ip}
              </span>
            )}
            {/* Type */}
            <span style={{ color: tc.color, fontSize: '10px', letterSpacing: '0.1em' }}>
              {TYPE_ICONS[entry.type] || '⚠️'} {entry.type.replace(/_/g, ' ')}
            </span>
          </div>
          {/* Reason */}
          <p className="text-xs" style={{ color: 'rgba(0,255,65,0.7)', lineHeight: 1.5 }}>
            {entry.reason}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!isQuarantined && entry.ip && (
            <button
              onClick={e => { e.stopPropagation(); onQuarantine(entry.ip); }}
              className="btn-primary btn-danger px-2 py-1"
              style={{ fontSize: '10px', padding: '3px 8px' }}>
              <span>QUARANTINE</span>
            </button>
          )}
          {isQuarantined && (
            <span className="text-xs px-2 py-1"
              style={{ color: 'rgba(255,0,64,0.5)', border: '1px solid rgba(255,0,64,0.2)', borderRadius: '2px' }}>
              BLOCKED
            </span>
          )}
          <span style={{ color: 'rgba(0,255,65,0.4)', fontSize: 16 }}>
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 animate-slide-in-up">
          {/* Raw log line */}
          <div className="p-3 rounded mb-3 overflow-x-auto"
            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,255,65,0.1)' }}>
            <p className="text-xs whitespace-pre font-mono" style={{ color: 'var(--green-dim)', lineHeight: 1.6 }}>
              {entry.raw}
            </p>
          </div>
          {/* All threats detected on this line */}
          <div className="mb-2">
            <p className="text-xs mb-1" style={{ color: 'rgba(0,255,65,0.4)' }}>ALL DETECTED THREATS:</p>
            <div className="flex flex-wrap">
              {entry.threats.map((t, i) => <ThreatTag key={i} threat={t} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlaggedTable({ flagged, quarantinedIPs, onQuarantine, onQuarantineAll }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('severity');

  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const filtered = flagged
    .filter(e => filter === 'ALL' || e.severity === filter)
    .filter(e => {
      if (!search) return true;
      const q = search.toLowerCase();
      return e.raw.toLowerCase().includes(q) || (e.ip || '').includes(q) ||
        e.reason.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'severity') return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
      if (sortBy === 'line') return a.lineNumber - b.lineNumber;
      if (sortBy === 'ip') return (a.ip || '').localeCompare(b.ip || '');
      return 0;
    });

  const FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const filterColors = { ALL: 'btn-primary', CRITICAL: 'btn-danger', HIGH: 'btn-primary', MEDIUM: 'btn-amber', LOW: 'btn-cyan' };

  return (
    <Panel className="animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'rgba(0,255,65,0.1)' }}>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <PanelHeader icon="🚨" title="FLAGGED LOG ENTRIES" subtitle={`${filtered.length} of ${flagged.length} entries displayed`} />
          <div className="ml-auto flex gap-2">
            <button onClick={onQuarantineAll}
              className="btn-primary btn-danger"
              style={{ fontSize: '11px', padding: '5px 12px' }}>
              <span>⚡ QUARANTINE ALL</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Severity filter */}
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`btn-primary ${filterColors[f]}`}
                style={{
                  fontSize: '10px', padding: '3px 10px',
                  opacity: filter === f ? 1 : 0.5,
                  boxShadow: filter === f ? undefined : 'none',
                }}>
                <span>{f}</span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{
              background: 'rgba(0,20,0,0.8)', border: '1px solid rgba(0,255,65,0.3)',
              color: 'var(--green-neon)', fontFamily: 'JetBrains Mono', fontSize: '11px',
              padding: '3px 8px', outline: 'none', cursor: 'pointer',
            }}>
            <option value="severity">Sort: Severity</option>
            <option value="line">Sort: Line #</option>
            <option value="ip">Sort: IP</option>
          </select>

          {/* Search */}
          <input
            type="text"
            className="terminal-input px-3 py-1 flex-1"
            style={{ minWidth: 200, fontSize: '11px' }}
            placeholder="Search logs, IPs, threat types..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Log rows */}
      <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🛡️</div>
            <p className="text-glow-green font-orbitron text-sm">NO THREATS FOUND</p>
            <p className="text-xs mt-2" style={{ color: 'rgba(0,255,65,0.3)' }}>
              {search || filter !== 'ALL' ? 'Try adjusting filters' : 'All systems nominal'}
            </p>
          </div>
        ) : (
          filtered.map((entry, i) => (
            <LogRow key={entry.id} entry={entry} index={i}
              quarantined={entry.ip ? quarantinedIPs.has(entry.ip) : false}
              onQuarantine={onQuarantine} />
          ))
        )}
      </div>
    </Panel>
  );
}
