import { useState, useCallback, useRef, useEffect } from 'react';
import { analyzeLogs } from './engine';
import MatrixBackground from './components/MatrixBackground';
import LogInput from './components/LogInput';
import ScanAnimation from './components/ScanAnimation';
import Dashboard from './components/Dashboard';
import FlaggedTable from './components/FlaggedTable';
import { StatusDot } from './components/Atoms';

// ── Clock ─────────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ color: 'var(--green-dim)', fontFamily: 'JetBrains Mono', fontSize: 12, letterSpacing: '0.05em' }}>
      {time.toUTCString().replace('GMT', 'UTC')}
    </span>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ status, scanCount }) {
  return (
    <header style={{
      background: 'rgba(0,3,0,0.95)',
      borderBottom: '1px solid rgba(0,255,65,0.2)',
      backdropFilter: 'blur(10px)',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 0 30px rgba(0,255,65,0.08)',
    }}>
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg width="38" height="38" viewBox="0 0 38 38" style={{ filter: 'drop-shadow(0 0 8px #00ff41)' }}>
              <polygon points="19,2 36,10 36,28 19,36 2,28 2,10"
                fill="none" stroke="#00ff41" strokeWidth="1.5" />
              <polygon points="19,8 30,14 30,24 19,30 8,24 8,14"
                fill="rgba(0,255,65,0.08)" stroke="#00cc33" strokeWidth="1" />
              <text x="19" y="23" textAnchor="middle"
                style={{ fill: '#00ff41', fontSize: 14, fontFamily: 'Orbitron', fontWeight: 900 }}>
                G
              </text>
            </svg>
          </div>
          <div>
            <h1 className="font-orbitron font-black text-glow-green tracking-widest"
              style={{ fontSize: 20, lineHeight: 1 }}>
              GRAVITY<span style={{ color: 'var(--cyan-neon)', textShadow: '0 0 15px rgba(0,255,255,0.8)' }}>SHIELD</span>
            </h1>
            <p style={{ color: 'rgba(0,255,65,0.4)', fontSize: 9, letterSpacing: '0.2em', fontFamily: 'JetBrains Mono' }}>
              LOG ANOMALY DETECTION SYSTEM
            </p>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-4 ml-6">
          <div className="flex items-center gap-1 text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
            <StatusDot active={status !== 'idle'} />
            <span style={{ color: status === 'scanning' ? 'var(--green-neon)' : status === 'results' ? 'var(--cyan-neon)' : 'rgba(0,255,65,0.4)' }}>
              {status === 'idle' ? 'STANDBY' : status === 'scanning' ? 'SCANNING' : 'MONITORING'}
            </span>
          </div>
          {scanCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded"
              style={{ background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.2)', color: 'var(--cyan-neon)', fontFamily: 'JetBrains Mono' }}>
              SCANS: {scanCount}
            </span>
          )}
        </div>

        <div className="ml-auto hidden md:block">
          <LiveClock />
        </div>

        {/* Nav pills */}
        <div className="flex gap-2">
          {['DASHBOARD', 'DOCS', 'SETTINGS'].map(item => (
            <span key={item} className="text-xs px-3 py-1 cursor-pointer"
              style={{
                color: item === 'DASHBOARD' ? 'var(--green-neon)' : 'rgba(0,255,65,0.3)',
                border: item === 'DASHBOARD' ? '1px solid rgba(0,255,65,0.3)' : '1px solid transparent',
                fontFamily: 'JetBrains Mono', letterSpacing: '0.1em',
                transition: 'all 0.2s',
              }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom accent line */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(0,255,65,0.6), transparent)',
      }} />
    </header>
  );
}

// ── Quarantine log sidebar ─────────────────────────────────────────────────────
function QuarantinePanel({ quarantinedIPs, onUnblock }) {
  if (quarantinedIPs.size === 0) return null;
  return (
    <div className="panel panel-red p-4 animate-fade-in"
      style={{ background: 'rgba(10,0,0,0.8)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-glow-red font-orbitron text-xs tracking-widest">🚫 QUARANTINE ZONE</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded"
          style={{ background: 'rgba(255,0,64,0.1)', border: '1px solid rgba(255,0,64,0.3)', color: 'var(--red-neon)' }}>
          {quarantinedIPs.size} BLOCKED
        </span>
      </div>
      <div className="space-y-1">
        {[...quarantinedIPs].map(ip => (
          <div key={ip} className="flex items-center justify-between py-1.5 px-2 rounded"
            style={{ background: 'rgba(255,0,64,0.05)', border: '1px solid rgba(255,0,64,0.1)' }}>
            <span className="text-xs font-mono quarantined"
              style={{ color: 'rgba(255,0,64,0.5)' }}>
              🚫 {ip}
            </span>
            <button onClick={() => onUnblock(ip)}
              className="text-xs px-2 py-0.5"
              style={{ color: 'rgba(255,0,64,0.5)', border: '1px solid rgba(255,0,64,0.2)', borderRadius: 2, cursor: 'pointer', background: 'transparent' }}>
              UNBLOCK
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [status, setStatus] = useState('idle');       // idle | scanning | results
  const [results, setResults] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [linesTotal, setLinesTotal] = useState(0);
  const [quarantinedIPs, setQuarantinedIPs] = useState(new Set());
  const [scanCount, setScanCount] = useState(0);
  const [activeView, setActiveView] = useState('input'); // input | results
  const progressRef = useRef(null);

  const runAnalysis = useCallback((rawText) => {
    const lines = rawText.split('\n').filter(l => l.trim()).length;
    setLinesTotal(lines);
    setStatus('scanning');
    setScanProgress(0);
    setResults(null);

    // Fake progress animation
    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 12 + 3;
      if (p >= 95) {
        clearInterval(progressRef.current);
        setScanProgress(95);
      } else {
        setScanProgress(Math.floor(p));
      }
    }, 100);

    // Run actual analysis after a minimum dramatic pause
    setTimeout(() => {
      const analysis = analyzeLogs(rawText);
      clearInterval(progressRef.current);
      setScanProgress(100);
      setTimeout(() => {
        setResults(analysis);
        setStatus('results');
        setActiveView('results');
        setScanCount(c => c + 1);
        // Reset quarantine on new scan
        setQuarantinedIPs(new Set());
      }, 600);
    }, 2200);
  }, []);

  const handleQuarantineIP = useCallback((ip) => {
    setQuarantinedIPs(prev => new Set([...prev, ip]));
  }, []);

  const handleUnblockIP = useCallback((ip) => {
    setQuarantinedIPs(prev => { const n = new Set(prev); n.delete(ip); return n; });
  }, []);

  const handleQuarantineAll = useCallback(() => {
    if (!results) return;
    const allIPs = results.flagged.filter(f => f.ip).map(f => f.ip);
    setQuarantinedIPs(new Set(allIPs));
  }, [results]);

  const handleNewScan = () => {
    setActiveView('input');
    setStatus('idle');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
      {/* CRT scanlines overlay */}
      <div className="crt-overlay" />

      {/* Matrix rain background */}
      <MatrixBackground />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Header status={status} scanCount={scanCount} />

        <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">

          {/* Ticker / alert bar */}
          {results && results.summary.critical > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 rounded animate-pulse-glow-red"
              style={{ background: 'rgba(255,0,64,0.05)', border: '1px solid rgba(255,0,64,0.3)' }}>
              <span style={{ color: 'var(--red-neon)', fontSize: 16 }}>⚠</span>
              <p className="text-xs font-bold tracking-wide animate-blink"
                style={{ color: 'var(--red-neon)', fontFamily: 'Orbitron', fontSize: 11 }}>
                CRITICAL THREAT ALERT
              </p>
              <span className="text-xs" style={{ color: 'rgba(255,0,64,0.7)' }}>
                {results.summary.critical} critical-severity event{results.summary.critical > 1 ? 's' : ''} detected.
                Immediate action required.
              </span>
              {quarantinedIPs.size === 0 && (
                <button onClick={handleQuarantineAll} className="ml-auto btn-primary btn-danger"
                  style={{ fontSize: '10px', padding: '3px 10px' }}>
                  <span>⚡ QUARANTINE ALL</span>
                </button>
              )}
            </div>
          )}

          {/* View tabs */}
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveView('input')}
              className="btn-primary"
              style={{ fontSize: '11px', padding: '5px 16px', opacity: activeView === 'input' ? 1 : 0.4 }}>
              <span>📋 LOG INPUT</span>
            </button>
            {results && (
              <button onClick={() => setActiveView('results')}
                className="btn-primary btn-cyan"
                style={{ fontSize: '11px', padding: '5px 16px', opacity: activeView === 'results' ? 1 : 0.4 }}>
                <span>📊 ANALYSIS RESULTS</span>
              </button>
            )}
            {results && (
              <span className="text-xs ml-2" style={{ color: 'rgba(0,255,65,0.4)' }}>
                ↳ {results.flagged.length} threats detected in {results.lines} log lines
              </span>
            )}
            {results && (
              <button onClick={handleNewScan} className="ml-auto btn-primary btn-amber"
                style={{ fontSize: '10px', padding: '4px 12px' }}>
                <span>+ NEW SCAN</span>
              </button>
            )}
          </div>

          {/* Input view */}
          {activeView === 'input' && (
            <LogInput onAnalyze={runAnalysis} isAnalyzing={status === 'scanning'} />
          )}

          {/* Scan animation */}
          {status === 'scanning' && (
            <ScanAnimation isScanning={true} progress={scanProgress} linesTotal={linesTotal} />
          )}

          {/* Results view */}
          {activeView === 'results' && results && (
            <>
              <Dashboard
                summary={results.summary}
                quarantinedIPs={quarantinedIPs}
                onQuarantineIP={handleQuarantineIP}
              />

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <div className="xl:col-span-3">
                  <FlaggedTable
                    flagged={results.flagged}
                    quarantinedIPs={quarantinedIPs}
                    onQuarantine={handleQuarantineIP}
                    onQuarantineAll={handleQuarantineAll}
                  />
                </div>
                <div className="xl:col-span-1 space-y-4">
                  <QuarantinePanel
                    quarantinedIPs={quarantinedIPs}
                    onUnblock={handleUnblockIP}
                  />

                  {/* System info */}
                  <div className="panel p-4 text-xs space-y-2"
                    style={{ fontFamily: 'JetBrains Mono', color: 'rgba(0,255,65,0.5)' }}>
                    <p className="font-orbitron text-glow-green text-xs mb-3">SYSTEM STATUS</p>
                    <div className="flex justify-between">
                      <span>Engine</span>
                      <span className="text-glow-green">ONLINE</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Threat DB</span>
                      <span style={{ color: 'var(--cyan-neon)' }}>v2026.06</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rules Loaded</span>
                      <span style={{ color: 'var(--amber-neon)' }}>10 active</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Scan Time</span>
                      <span style={{ color: 'var(--green-dim)' }}>2.2s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Blocked IPs</span>
                      <span style={{ color: quarantinedIPs.size > 0 ? 'var(--red-neon)' : 'rgba(0,255,65,0.3)' }}>
                        {quarantinedIPs.size}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Empty state on first load */}
          {activeView === 'input' && status === 'idle' && !results && (
            <div className="text-center py-10 animate-fade-in">
              <div className="relative inline-block mb-6">
                <svg width="80" height="80" viewBox="0 0 80 80"
                  className="animate-pulse-glow"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,65,0.5))' }}>
                  <polygon points="40,4 74,22 74,58 40,76 6,58 6,22"
                    fill="none" stroke="rgba(0,255,65,0.4)" strokeWidth="2" />
                  <polygon points="40,14 64,27 64,53 40,66 16,53 16,27"
                    fill="rgba(0,255,65,0.03)" stroke="rgba(0,255,65,0.2)" strokeWidth="1" />
                  <text x="40" y="46" textAnchor="middle"
                    style={{ fill: '#00ff41', fontSize: 24, fontFamily: 'Orbitron', fontWeight: 900, textShadow: '0 0 20px #00ff41' }}>
                    G
                  </text>
                </svg>
              </div>
              <h2 className="font-orbitron text-glow-green text-xl mb-2 tracking-widest">GRAVITY SHIELD</h2>
              <p className="text-sm mb-1" style={{ color: 'rgba(0,255,65,0.5)' }}>
                Advanced Cybersecurity Log Anomaly Detection
              </p>
              <p className="text-xs max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(0,255,65,0.3)' }}>
                Paste or upload your system logs above to detect brute force attacks,
                port scans, SQL injection, XSS, unusual login times, and suspicious IP activity.
              </p>
              <div className="flex justify-center gap-6 mt-6 text-xs" style={{ color: 'rgba(0,255,65,0.3)', fontFamily: 'JetBrains Mono' }}>
                {['Apache Logs', 'SSH Auth Logs', 'Custom Formats', 'Real-time Analysis'].map(f => (
                  <span key={f} className="flex items-center gap-1">
                    <span style={{ color: 'var(--green-neon)' }}>✓</span> {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-10 py-4 text-center"
          style={{
            borderTop: '1px solid rgba(0,255,65,0.1)',
            color: 'rgba(0,255,65,0.25)',
            fontSize: 11,
            fontFamily: 'JetBrains Mono',
          }}>
          GRAVITY SHIELD v2.0.0 &nbsp;|&nbsp; LOG ANOMALY DETECTION ENGINE &nbsp;|&nbsp;
          © {new Date().getFullYear()} — FOR AUTHORIZED USE ONLY
        </footer>
      </div>
    </div>
  );
}
