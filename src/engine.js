// ─────────────────────────────────────────────────────────────────────────────
// GravityShield — Anomaly Detection Engine
// ─────────────────────────────────────────────────────────────────────────────

// Known suspicious IP ranges / TOR exit nodes / known bad actors (demo list)
const SUSPICIOUS_IPS = new Set([
  '192.168.100.200', '10.0.0.254', '172.16.0.100',
  '45.33.32.156', '198.51.100.1', '203.0.113.42',
  '185.220.101.1', '194.165.16.80', '91.108.4.1',
  '1.179.147.1', '5.188.86.172', '80.82.77.33',
]);

// Unusual hour thresholds (outside 06:00–22:00 is suspicious)
const UNUSUAL_HOUR_START = 22;
const UNUSUAL_HOUR_END = 6;

// Brute force: more than N attempts from same IP within log chunk
const BRUTE_FORCE_THRESHOLD = 5;
// Port scan: more than N unique ports accessed by same IP
const PORT_SCAN_THRESHOLD = 4;

// ─────────────────────────────────────────────────────────────────────────────
// Log line parsers
// ─────────────────────────────────────────────────────────────────────────────

// Apache / Nginx combined log format:
// 127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326
const apacheRegex = /^(\S+)\s+\S+\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d{3})\s+(\S+)/;

// SSH auth log format:
// Jun 19 14:23:01 server sshd[1234]: Failed password for root from 192.168.1.100 port 22 ssh2
const sshFailRegex = /(\w+\s+\d+\s+\d+:\d+:\d+).*(?:Failed password|Invalid user|authentication failure).*from\s+(\d+\.\d+\.\d+\.\d+)/;
const sshSuccessRegex = /(\w+\s+\d+\s+\d+:\d+:\d+).*Accepted (?:password|publickey) for (\S+) from\s+(\d+\.\d+\.\d+\.\d+)/;

// Generic timestamp + IP pattern
const genericRegex = /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}).*?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;

// Port in log line
const portRegex = /port\s+(\d+)|:(\d{2,5})\b/i;

function parseTimestamp(raw) {
  if (!raw) return null;
  // Apache format: 10/Oct/2000:13:55:36 -0700
  const apacheMatch = raw.match(/(\d{2})\/(\w+)\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/);
  if (apacheMatch) {
    const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    return new Date(apacheMatch[3], months[apacheMatch[2]], apacheMatch[1],
      apacheMatch[4], apacheMatch[5], apacheMatch[6]);
  }
  // ISO-like
  const d = new Date(raw);
  if (!isNaN(d)) return d;
  // Syslog: Jun 19 14:23:01
  const syslogMatch = raw.match(/(\w+)\s+(\d+)\s+(\d{2}):(\d{2}):(\d{2})/);
  if (syslogMatch) {
    const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    const year = new Date().getFullYear();
    return new Date(year, months[syslogMatch[1]] ?? 0, syslogMatch[2],
      syslogMatch[3], syslogMatch[4], syslogMatch[5]);
  }
  return null;
}

function isUnusualHour(date) {
  if (!date) return false;
  const h = date.getHours();
  return h >= UNUSUAL_HOUR_START || h < UNUSUAL_HOUR_END;
}

function extractPort(line) {
  const m = line.match(portRegex);
  if (m) return parseInt(m[1] || m[2]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main detection engine
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeLogs(rawText) {
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);
  const ipAttempts = {}; // ip -> [{lineIndex, timestamp}]
  const ipPorts = {};    // ip -> Set<port>
  const parsedLines = [];

  // First pass: parse every line
  lines.forEach((line, idx) => {
    let ip = null;
    let timestamp = null;
    let user = null;
    let statusCode = null;
    let method = null;
    let path = null;
    let logType = 'generic';

    const apacheM = line.match(apacheRegex);
    if (apacheM) {
      ip = apacheM[1];
      user = apacheM[2] !== '-' ? apacheM[2] : null;
      timestamp = parseTimestamp(apacheM[3]);
      const req = apacheM[4].split(' ');
      method = req[0];
      path = req[1];
      statusCode = parseInt(apacheM[5]);
      logType = 'apache';
    }

    const sshFailM = !apacheM && line.match(sshFailRegex);
    if (sshFailM) {
      timestamp = parseTimestamp(sshFailM[1]);
      ip = sshFailM[2];
      logType = 'ssh-fail';
    }

    const sshSuccM = !apacheM && !sshFailM && line.match(sshSuccessRegex);
    if (sshSuccM) {
      timestamp = parseTimestamp(sshSuccM[1]);
      user = sshSuccM[2];
      ip = sshSuccM[3];
      logType = 'ssh-success';
    }

    const genericM = !apacheM && !sshFailM && !sshSuccM && line.match(genericRegex);
    if (genericM) {
      timestamp = parseTimestamp(genericM[1]);
      ip = genericM[2];
      logType = 'generic';
    }

    const port = extractPort(line);

    parsedLines.push({ line, idx, ip, timestamp, user, statusCode, method, path, port, logType });

    if (ip) {
      if (!ipAttempts[ip]) ipAttempts[ip] = [];
      if (logType === 'ssh-fail' || statusCode === 401 || statusCode === 403) {
        ipAttempts[ip].push({ lineIndex: idx, timestamp });
      }
      if (port) {
        if (!ipPorts[ip]) ipPorts[ip] = new Set();
        ipPorts[ip].add(port);
      }
    }
  });

  // ── Threat detection ────────────────────────────────────────────────────────
  const flagged = [];

  parsedLines.forEach(({ line, idx, ip, timestamp, user, statusCode, method, path, port, logType }) => {
    const threats = [];

    // 1. Brute force: same IP with >= threshold failures
    if (ip && ipAttempts[ip] && ipAttempts[ip].length >= BRUTE_FORCE_THRESHOLD) {
      threats.push({
        type: 'BRUTE_FORCE',
        severity: ipAttempts[ip].length >= 10 ? 'CRITICAL' : 'HIGH',
        reason: `${ipAttempts[ip].length} failed auth attempts from ${ip}`,
        category: 'Brute Force',
      });
    }

    // 2. Port scan: same IP accessing many different ports
    if (ip && ipPorts[ip] && ipPorts[ip].size >= PORT_SCAN_THRESHOLD) {
      threats.push({
        type: 'PORT_SCAN',
        severity: ipPorts[ip].size >= 10 ? 'CRITICAL' : 'HIGH',
        reason: `Port scan detected — ${ipPorts[ip].size} unique ports from ${ip}: [${[...ipPorts[ip]].slice(0,6).join(', ')}${ipPorts[ip].size>6?'…':''}]`,
        category: 'Port Scan',
      });
    }

    // 3. Suspicious / known-bad IP
    if (ip && SUSPICIOUS_IPS.has(ip)) {
      threats.push({
        type: 'SUSPICIOUS_IP',
        severity: 'HIGH',
        reason: `Known malicious IP address: ${ip}`,
        category: 'Suspicious IP',
      });
    }

    // 4. Unusual login time
    if (timestamp && isUnusualHour(timestamp) &&
        (logType === 'ssh-success' || logType === 'ssh-fail' ||
         statusCode === 200 && (path?.includes('login') || path?.includes('admin') || path?.includes('auth')))) {
      threats.push({
        type: 'UNUSUAL_TIME',
        severity: 'MEDIUM',
        reason: `Login activity at unusual hour (${timestamp.getHours()}:${String(timestamp.getMinutes()).padStart(2,'0')})`,
        category: 'Unusual Login Time',
      });
    }

    // 5. HTTP error storms (403 / 404 / 401)
    if (statusCode === 403) {
      threats.push({
        type: 'FORBIDDEN',
        severity: 'MEDIUM',
        reason: `HTTP 403 Forbidden — unauthorized resource access attempt on ${path || 'unknown path'}`,
        category: 'Unauthorized Access',
      });
    }
    if (statusCode === 401) {
      threats.push({
        type: 'UNAUTHORIZED',
        severity: 'MEDIUM',
        reason: `HTTP 401 Unauthorized — bad credentials for ${path || 'unknown resource'}`,
        category: 'Unauthorized Access',
      });
    }

    // 6. SQL injection patterns in URL
    if (path && /('|--|;|union\s+select|drop\s+table|exec\s*\(|xp_cmdshell|or\s+1=1)/i.test(path)) {
      threats.push({
        type: 'SQL_INJECTION',
        severity: 'CRITICAL',
        reason: `SQL injection pattern in request: ${path.slice(0, 80)}`,
        category: 'SQL Injection',
      });
    }

    // 7. XSS patterns
    if (path && /<script|javascript:|onerror=|onload=/i.test(path)) {
      threats.push({
        type: 'XSS',
        severity: 'CRITICAL',
        reason: `XSS pattern detected in URL: ${path.slice(0, 80)}`,
        category: 'XSS Attack',
      });
    }

    // 8. Directory traversal
    if (path && /\.\.[\/\\]/.test(path)) {
      threats.push({
        type: 'PATH_TRAVERSAL',
        severity: 'CRITICAL',
        reason: `Directory traversal attempt: ${path.slice(0, 80)}`,
        category: 'Path Traversal',
      });
    }

    // 9. Unusual HTTP methods
    if (method && /^(TRACE|CONNECT|PROPFIND|OPTIONS)$/.test(method)) {
      threats.push({
        type: 'SUSPICIOUS_METHOD',
        severity: 'LOW',
        reason: `Unusual HTTP method used: ${method}`,
        category: 'Suspicious Method',
      });
    }

    // 10. Failed SSH on root
    if (logType === 'ssh-fail' && line.toLowerCase().includes('root')) {
      threats.push({
        type: 'ROOT_LOGIN',
        severity: 'HIGH',
        reason: `Failed root login attempt from ${ip}`,
        category: 'Root Login Attempt',
      });
    }

    if (threats.length > 0) {
      // Pick the highest severity threat for display
      const severityOrder = ['CRITICAL','HIGH','MEDIUM','LOW'];
      threats.sort((a,b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));
      const primary = threats[0];

      flagged.push({
        id: idx,
        lineNumber: idx + 1,
        raw: line,
        ip,
        timestamp: timestamp ? timestamp.toISOString() : null,
        displayTime: timestamp ? timestamp.toLocaleString() : 'Unknown',
        threats,
        severity: primary.severity,
        type: primary.type,
        category: primary.category,
        reason: primary.reason,
        quarantined: false,
      });
    }
  });

  // Deduplicate — keep worst-severity per line
  const seen = new Set();
  const unique = flagged.filter(f => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });

  // Summary counts
  const summary = {
    total: lines.length,
    flagged: unique.length,
    critical: unique.filter(f => f.severity === 'CRITICAL').length,
    high: unique.filter(f => f.severity === 'HIGH').length,
    medium: unique.filter(f => f.severity === 'MEDIUM').length,
    low: unique.filter(f => f.severity === 'LOW').length,
    categories: {},
    topIPs: {},
  };

  unique.forEach(f => {
    summary.categories[f.category] = (summary.categories[f.category] || 0) + 1;
    if (f.ip) summary.topIPs[f.ip] = (summary.topIPs[f.ip] || 0) + 1;
  });

  return { flagged: unique, summary, lines: lines.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample log generator for demo
// ─────────────────────────────────────────────────────────────────────────────

export function generateSampleLogs() {
  return `185.220.101.1 - - [19/Jun/2026:02:14:33 +0000] "GET /admin/login HTTP/1.1" 401 512
185.220.101.1 - - [19/Jun/2026:02:14:35 +0000] "POST /admin/login HTTP/1.1" 401 512
185.220.101.1 - - [19/Jun/2026:02:14:37 +0000] "POST /admin/login HTTP/1.1" 401 512
185.220.101.1 - - [19/Jun/2026:02:14:39 +0000] "POST /admin/login HTTP/1.1" 401 512
185.220.101.1 - - [19/Jun/2026:02:14:41 +0000] "POST /admin/login HTTP/1.1" 401 512
185.220.101.1 - - [19/Jun/2026:02:14:43 +0000] "POST /admin/login HTTP/1.1" 401 512
185.220.101.1 - - [19/Jun/2026:02:14:45 +0000] "POST /admin/login HTTP/1.1" 200 1024
Jun 19 02:15:01 prod-server sshd[4821]: Failed password for root from 45.33.32.156 port 22 ssh2
Jun 19 02:15:03 prod-server sshd[4822]: Failed password for root from 45.33.32.156 port 22 ssh2
Jun 19 02:15:05 prod-server sshd[4823]: Failed password for root from 45.33.32.156 port 22 ssh2
Jun 19 02:15:07 prod-server sshd[4824]: Failed password for root from 45.33.32.156 port 22 ssh2
Jun 19 02:15:09 prod-server sshd[4825]: Failed password for root from 45.33.32.156 port 22 ssh2
Jun 19 02:15:11 prod-server sshd[4826]: Failed password for root from 45.33.32.156 port 22 ssh2
Jun 19 02:15:13 prod-server sshd[4827]: Failed password for root from 45.33.32.156 port 22 ssh2
Jun 19 02:15:15 prod-server sshd[4828]: Failed password for root from 45.33.32.156 port 22 ssh2
Jun 19 02:15:17 prod-server sshd[4829]: Failed password for root from 45.33.32.156 port 22 ssh2
Jun 19 02:15:19 prod-server sshd[4830]: Accepted password for deploy from 10.0.1.5 port 22 ssh2
10.0.0.254 - - [19/Jun/2026:03:42:10 +0000] "GET /index.php?id=1' OR 1=1-- HTTP/1.1" 500 256
10.0.0.254 - - [19/Jun/2026:03:42:12 +0000] "GET /index.php?id=1; DROP TABLE users-- HTTP/1.1" 500 256
172.16.0.100 - admin [19/Jun/2026:03:55:00 +0000] "GET /../../../etc/passwd HTTP/1.1" 404 128
172.16.0.100 - admin [19/Jun/2026:03:55:01 +0000] "GET /../../../../etc/shadow HTTP/1.1" 403 128
192.168.1.50 - - [19/Jun/2026:14:30:22 +0000] "GET /index.html HTTP/1.1" 200 4523
192.168.1.50 - - [19/Jun/2026:14:30:25 +0000] "GET /about.html HTTP/1.1" 200 3200
192.168.1.50 - - [19/Jun/2026:14:30:28 +0000] "GET /styles.css HTTP/1.1" 200 12400
203.0.113.42 - - [19/Jun/2026:23:11:05 +0000] "CONNECT example.com:443 HTTP/1.1" 200 0
203.0.113.42 - - [19/Jun/2026:23:11:06 +0000] "OPTIONS / HTTP/1.1" 200 0
2026-06-19T04:01:00 SCAN 1.179.147.1 port 21
2026-06-19T04:01:01 SCAN 1.179.147.1 port 22
2026-06-19T04:01:02 SCAN 1.179.147.1 port 23
2026-06-19T04:01:03 SCAN 1.179.147.1 port 25
2026-06-19T04:01:04 SCAN 1.179.147.1 port 80
2026-06-19T04:01:05 SCAN 1.179.147.1 port 443
2026-06-19T04:01:06 SCAN 1.179.147.1 port 3306
2026-06-19T04:01:07 SCAN 1.179.147.1 port 6379
2026-06-19T04:01:08 SCAN 1.179.147.1 port 27017
194.165.16.80 - - [19/Jun/2026:01:33:20 +0000] "GET /login?next=<script>alert(1)</script> HTTP/1.1" 400 200
Jun 19 15:00:42 prod-server sshd[9001]: Accepted password for alice from 192.168.10.5 port 55821 ssh2
Jun 19 16:30:11 prod-server sshd[9100]: Failed password for Invalid user hacker from 91.108.4.1 port 22 ssh2
Jun 19 16:30:13 prod-server sshd[9101]: Failed password for Invalid user hacker from 91.108.4.1 port 22 ssh2
Jun 19 16:30:15 prod-server sshd[9102]: Failed password for Invalid user hacker from 91.108.4.1 port 22 ssh2
Jun 19 16:30:17 prod-server sshd[9103]: Failed password for Invalid user hacker from 91.108.4.1 port 22 ssh2
Jun 19 16:30:19 prod-server sshd[9104]: Failed password for Invalid user hacker from 91.108.4.1 port 22 ssh2
Jun 19 16:30:21 prod-server sshd[9105]: Failed password for Invalid user hacker from 91.108.4.1 port 22 ssh2
192.168.1.75 - bob [19/Jun/2026:09:00:00 +0000] "GET /dashboard HTTP/1.1" 200 8900
192.168.1.75 - bob [19/Jun/2026:09:05:00 +0000] "POST /api/data HTTP/1.1" 200 1200`;
}
