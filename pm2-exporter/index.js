const http = require('http');
const pm2 = require('pm2');
const { Registry, Gauge, collectDefaultMetrics } = require('prom-client');

// 1. Setup Prometheus Registry
const register = new Registry();
collectDefaultMetrics({ register });

// 2. Define High-Fidelity Metrics
const pm2_up = new Gauge({ name: 'pm2_up', help: 'Is the process running', labelNames: ['name'], registers: [register] });
const pm2_cpu = new Gauge({ name: 'pm2_cpu', help: 'Process cpu usage', labelNames: ['name'], registers: [register] });
const pm2_memory = new Gauge({ name: 'pm2_memory', help: 'Process memory usage', labelNames: ['name'], registers: [register] });
const pm2_restarts = new Gauge({ name: 'pm2_restarts', help: 'Process restarts', labelNames: ['name'], registers: [register] });

// 3. Create the SRE Server
const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    pm2.connect((err) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('PM2 Connect Error: ' + err.message);
      }
      
      pm2.list(async (err, list) => {
        pm2.disconnect();
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          return res.end('PM2 List Error: ' + err.message);
        }

        // Map PM2 data to Prometheus metrics
        list.forEach(proc => {
          const name = proc.name;
          const status = proc.pm2_env.status === 'online' ? 1 : 0;
          pm2_up.set({ name }, status);
          pm2_cpu.set({ name }, proc.monit.cpu || 0);
          pm2_memory.set({ name }, proc.monit.memory || 0);
          pm2_restarts.set({ name }, proc.pm2_env.restart_time || 0);
        });

        // SEND WITH CORRECT HEADERS (Crucial Fix)
        res.writeHead(200, { 'Content-Type': register.contentType });
        res.end(await register.metrics());
      });
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = 9209;
server.listen(PORT, () => {
  console.log(`🚀 SRE PM2 Exporter active on port ${PORT}`);
  console.log(`🎯 Prometheus Header Fix: ${register.contentType}`);
});
