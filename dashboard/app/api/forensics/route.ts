import fs from 'fs';
import path from 'path';

// SRE FORENSIC ENGINE v6.3 - UPDATED: 2026-05-02
const PM2_LOG_PATH = '/root/.pm2/logs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service')?.toLowerCase();

  if (!service) {
    return Response.json({ error: 'Service name required' }, { status: 400 });
  }

  try {
    if (!fs.existsSync(PM2_LOG_PATH)) {
       return Response.json({ error: `Forensic path missing: ${PM2_LOG_PATH}` }, { status: 404 });
    }

    const files = fs.readdirSync(PM2_LOG_PATH);
    const logFile = files.find(f => 
      f.toLowerCase().includes(service) && 
      (f.endsWith('-out.log') || f.endsWith('.log'))
    );
    
    if (!logFile) {
      return Response.json({ error: `Evidence for ${service} not found.` }, { status: 404 });
    }

    const fullPath = path.join(PM2_LOG_PATH, logFile);
    const stats = fs.statSync(fullPath);
    const start = Math.max(0, stats.size - 50000); 

    const buffer = Buffer.alloc(50000);
    const fd = fs.openSync(fullPath, 'r');
    fs.readSync(fd, buffer, 0, 50000, start);
    fs.closeSync(fd);

    return new Response(buffer.toString('utf8'), {
      headers: { 
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store, max-age=0' 
      },
    });
  } catch (error: any) {
    return Response.json({ error: `Forensic Link Error: ${error.message}` }, { status: 500 });
  }
}
