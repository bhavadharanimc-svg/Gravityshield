import { useEffect, useRef, useState } from 'react';
import { Spinner } from './Atoms';

const SCAN_MESSAGES = [
  'INITIALIZING GRAVITY SHIELD CORE...',
  'LOADING THREAT INTELLIGENCE DATABASE...',
  'PARSING LOG FORMAT (APACHE/SSH/GENERIC)...',
  'ANALYZING IP REPUTATION...',
  'RUNNING BRUTE FORCE DETECTION...',
  'SCANNING FOR PORT SCAN SIGNATURES...',
  'DETECTING INJECTION PATTERNS...',
  'CHECKING TEMPORAL ANOMALIES...',
  'CROSS-REFERENCING KNOWN BAD ACTORS...',
  'COMPUTING THREAT SEVERITY SCORES...',
  'GENERATING THREAT REPORT...',
  'ANALYSIS COMPLETE ✓',
];

export default function ScanAnimation({ isScanning, progress, linesTotal }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [displayedLines, setDisplayedLines] = useState([]);
  const intervalRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isScanning) {
      setMsgIndex(0);
      setDisplayedLines([]);
      let i = 0;
      intervalRef.current = setInterval(() => {
        if (i < SCAN_MESSAGES.length) {
          setDisplayedLines(prev => [...prev, SCAN_MESSAGES[i]]);
          setMsgIndex(i);
          i++;
        } else {
          clearInterval(intervalRef.current);
        }
      }, 180);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isScanning]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedLines]);

  if (!isScanning && displayedLines.length === 0) return null;

  return (
    <div className="panel scan-overlay animate-fade-in"
      style={{
        background: 'rgba(0,5,0,0.97)',
        border: '1px solid rgba(0,255,65,0.4)',
        boxShadow: '0 0 40px rgba(0,255,65,0.1), inset 0 0 40px rgba(0,255,65,0.02)',
      }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
        <Spinner size={20} />
        <div>
          <h2 className="font-orbitron text-sm font-bold text-glow-green tracking-widest">
            GRAVITY SHIELD — DEEP SCAN
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(0,255,65,0.5)' }}>
            Analyzing {linesTotal.toLocaleString()} log entries for anomalies
          </p>
        </div>
        <div className="ml-auto text-right">
          <div className="font-orbitron text-2xl text-glow-green">{progress}%</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }} />
        </div>
      </div>

      {/* Scrolling log messages */}
      <div ref={scrollRef} className="p-4 overflow-y-auto" style={{ height: 200, fontFamily: 'JetBrains Mono, monospace' }}>
        {displayedLines.map((msg, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5 text-xs animate-slide-in-left"
            style={{ animationDelay: `${i * 0.05}s` }}>
            <span style={{ color: 'rgba(0,255,65,0.4)' }}>
              [{String(i + 1).padStart(2, '0')}]
            </span>
            <span style={{
              color: i === displayedLines.length - 1 ? 'var(--green-neon)' : 'rgba(0,255,65,0.5)',
              textShadow: i === displayedLines.length - 1 ? '0 0 10px rgba(0,255,65,0.8)' : 'none',
            }}>
              {msg}
            </span>
            {i === displayedLines.length - 1 && isScanning && (
              <span className="animate-blink" style={{ color: 'var(--green-neon)' }}>█</span>
            )}
          </div>
        ))}
      </div>

      {/* Bottom status */}
      <div className="px-4 pb-3 text-xs" style={{ color: 'rgba(0,255,65,0.4)' }}>
        <span className="animate-blink">▶</span> GRAVITY_SHIELD_ENGINE v2.0 &nbsp;|&nbsp;
        THREAT_DB v{new Date().getFullYear()}.06 &nbsp;|&nbsp;
        STATUS: {isScanning ? 'SCANNING' : 'COMPLETE'}
      </div>
    </div>
  );
}
