import { useState, useRef, useCallback } from 'react';
import { GlowText, Panel, PanelHeader, Spinner } from './Atoms';
import { generateSampleLogs } from '../engine';

export default function LogInput({ onAnalyze, isAnalyzing }) {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [activeTab, setActiveTab] = useState('paste'); // 'paste' | 'upload'
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => setText(e.target.result || '');
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) { setActiveTab('upload'); handleFile(file); }
  }, [handleFile]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const loadSample = () => {
    setText(generateSampleLogs());
    setFileName('sample_logs.txt');
    setActiveTab('paste');
  };

  const handleAnalyze = () => {
    if (text.trim()) onAnalyze(text);
  };

  const lineCount = text.split('\n').filter(l => l.trim()).length;

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between mb-4">
        <PanelHeader icon="📋" title="LOG INPUT" subtitle="Paste or upload system/network logs" />
        <button onClick={loadSample}
          className="btn-primary btn-cyan"
          style={{ fontSize: '11px', padding: '5px 14px' }}>
          <span>LOAD SAMPLE LOGS</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-3">
        {['paste', 'upload'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="btn-primary"
            style={{
              fontSize: '11px', padding: '5px 16px',
              borderRadius: tab === 'paste' ? '3px 0 0 3px' : '0 3px 3px 0',
              opacity: activeTab === tab ? 1 : 0.4,
              borderRight: tab === 'paste' ? 'none' : undefined,
            }}>
            <span>{tab === 'paste' ? '📝 PASTE LOGS' : '📁 UPLOAD FILE'}</span>
          </button>
        ))}
      </div>

      {activeTab === 'paste' ? (
        <textarea
          className="terminal-input w-full p-3 rounded"
          style={{ height: 220, lineHeight: 1.7, fontSize: '11px' }}
          placeholder={`# Paste your logs here — supports:\n# Apache / Nginx combined log format\n# SSH auth log (syslog)\n# Custom format with timestamps and IPs\n\n192.168.1.1 - - [19/Jun/2026:14:00:00 +0000] "GET / HTTP/1.1" 200 1234\nJun 19 14:00:01 server sshd[1234]: Failed password for root from 1.2.3.4 port 22 ssh2`}
          value={text}
          onChange={e => setText(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <div
          className={`upload-zone rounded flex flex-col items-center justify-center cursor-pointer ${isDragging ? 'drag-over' : ''}`}
          style={{ height: 220 }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".log,.txt,.csv" className="hidden"
            onChange={e => handleFile(e.target.files?.[0])} />
          <div className="text-center">
            <div className="text-5xl mb-3">{isDragging ? '⚡' : '📂'}</div>
            <p className="text-glow-green font-orbitron text-sm mb-1">
              {isDragging ? 'RELEASE TO UPLOAD' : 'DROP LOG FILE HERE'}
            </p>
            <p className="text-xs" style={{ color: 'rgba(0,255,65,0.4)' }}>
              or click to browse &nbsp;|&nbsp; .log .txt .csv
            </p>
            {fileName && (
              <p className="text-xs mt-3 px-4 py-2 rounded"
                style={{ color: 'var(--cyan-neon)', background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.2)' }}>
                ✓ {fileName}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Status bar + analyze button */}
      <div className="flex items-center justify-between mt-3 gap-3">
        <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(0,255,65,0.5)' }}>
          <span>
            <span style={{ color: 'var(--green-neon)' }}>{lineCount}</span> lines ready
          </span>
          {fileName && <span style={{ color: 'var(--cyan-neon)' }}>↑ {fileName}</span>}
          <span className="hidden sm:inline">
            Supported: <span style={{ color: 'var(--amber-neon)' }}>Apache · SSH · Generic</span>
          </span>
        </div>

        <button onClick={handleAnalyze}
          disabled={!text.trim() || isAnalyzing}
          className="btn-primary flex items-center gap-2"
          style={{
            padding: '8px 24px',
            fontSize: '12px',
            opacity: !text.trim() ? 0.4 : 1,
            cursor: !text.trim() ? 'not-allowed' : 'pointer',
          }}>
          <span className="flex items-center gap-2">
            {isAnalyzing ? <Spinner size={14} /> : '⚡'}
            {isAnalyzing ? 'SCANNING...' : 'RUN ANALYSIS'}
          </span>
        </button>
      </div>
    </Panel>
  );
}
