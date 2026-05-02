import fs from 'fs';
import path from 'path';

// SRE SIGNAL ENGINE v7.0 - SEMANTIC AGGREGATOR
const PM2_LOG_PATH = '/root/.pm2/logs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service')?.toLowerCase();

  if (!service) {
    return Response.json({ error: 'Service context required' }, { status: 400 });
  }

  try {
    const files = fs.readdirSync(PM2_LOG_PATH);
    const logFile = files.find(f => f.toLowerCase().includes(service) && (f.endsWith('-out.log') || f.endsWith('.log') || f.endsWith('-error.log')));
    
    if (!logFile) return Response.json({ signals: [], message: 'No evidence found' });

    const fullPath = path.join(PM2_LOG_PATH, logFile);
    const stats = fs.statSync(fullPath);
    const fd = fs.openSync(fullPath, 'r');
    const bufferSize = Math.min(stats.size, 100000); // Scan last 100KB for signals
    const buffer = Buffer.alloc(bufferSize);
    
    fs.readSync(fd, buffer, 0, bufferSize, stats.size - bufferSize);
    fs.closeSync(fd);

    const rawLogs = buffer.toString('utf8');
    const lines = rawLogs.split('\n');

    // SEMANTIC AGGREGATION LOGIC
    const clusters: Record<string, { count: number, example: string, severity: string }> = {};

    lines.forEach(line => {
      if (!line.trim()) return;

      let signature = 'General Log';
      let severity = 'info';

      if (line.match(/Failed to find Server Action/i)) {
        signature = 'Next.js Version Mismatch (Server Action)';
        severity = 'critical';
      } else if (line.match(/PrismaClientKnownRequestError|Foreign key constraint/i)) {
        signature = 'Database Constraint Violation';
        severity = 'error';
      } else if (line.match(/ETIMEDOUT|ECONNREFUSED/i)) {
        signature = 'Network/Upstream Timeout';
        severity = 'critical';
      } else if (line.match(/Invalid HTTP request|400 Bad Request/i)) {
        signature = 'Potential Malicious Traffic / Probing';
        severity = 'warning';
      } else if (line.match(/Error|Fail|Exception/i)) {
        signature = 'Unhandled Application Exception';
        severity = 'error';
      } else {
        return; // Skip non-incident noise
      }

      if (!clusters[signature]) {
        clusters[signature] = { count: 0, example: line.substring(0, 100), severity };
      }
      clusters[signature].count++;
    });

    return Response.json({
      service,
      total_incidents: Object.values(clusters).reduce((a, b) => a + b.count, 0),
      signals: Object.entries(clusters).map(([name, data]) => ({ name, ...data })),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
