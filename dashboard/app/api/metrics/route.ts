import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = url.searchParams.get('target');
  const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

  try {
    // 1. Fetch Real Server Metrics from Node Exporter
    const cpuRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`);
    const memRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100`);
    const diskRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100`);
    
    const cpuData = await cpuRes.json();
    const memData = await memRes.json();
    const diskData = await diskRes.json();

    const servers = (cpuData.data?.result || []).map((res: any, idx: number) => {
      const memVal = memData.data?.result[idx]?.value[1] || '0';
      const diskVal = diskData.data?.result[idx]?.value[1] || '0';
      return {
        hostname: res.metric.instance || 'Host',
        ip: res.metric.instance.split(':')[0],
        ram_used: Math.round(parseFloat(memVal)),
        ram_total: 100,
        cpu_load: Math.round(parseFloat(res.value[1])),
        disk_used: Math.round(parseFloat(diskVal)),
        disk_total: 100,
        status: 'online'
      };
    });

    // 2. Fetch Real Website Metrics from Blackbox Exporter
    const latencyRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_duration_seconds * 1000`);
    const sslRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_ssl_earliest_cert_expiry`);
    
    const latencyData = await latencyRes.json();
    const sslData = await sslRes.json();

    const websites = (latencyData.data?.result || []).map((res: any, idx: number) => {
      const sslVal = sslData.data?.result.find((s: any) => s.metric.instance === res.metric.instance)?.value[1];
      const sslDays = sslVal ? Math.floor((parseFloat(sslVal) - Date.now() / 1000) / 86400) : null;

      return {
        target: res.metric.instance || 'Unknown',
        rpm: 0, 
        latency: Math.round(parseFloat(res.value[1])),
        ssl_days: sslDays,
        trend: 'stable',
        vps: 'Local-Fleet'
      };
    });

    // 3. Fetch Real Container Metrics (cAdvisor)
    const containerRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=container_memory_usage_bytes{name!=""}`);
    const containerData = await containerRes.json();
    const containers = (containerData.data?.result || []).map((res: any) => ({
      name: res.metric.name,
      memory: (parseFloat(res.value[1]) / 1024 / 1024).toFixed(1) + 'MB',
      status: 'running'
    }));

    // 4. Fetch Real Database Metrics (Postgres Exporter)
    const dbRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=pg_up`);
    const dbData = await dbRes.json();
    const dbStatus = dbData.data?.result?.[0]?.value?.[1] === '1' ? 'Healthy' : 'Down';

    // 5. Fetch Real PM2 Application Metrics (PM2 Exporter)
    const pm2Res = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_process_cpu`);
    const pm2MemRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_process_memory`);
    const pm2Data = await pm2Res.json();
    const pm2MemData = await pm2MemRes.json();
    
    const apps = (pm2Data.data?.result || []).map((res: any, idx: number) => ({
      name: res.metric.name || 'Unknown App',
      cpu: parseFloat(res.value[1]).toFixed(1) + '%',
      memory: (parseFloat(pm2MemData.data?.result[idx]?.value[1] || 0) / 1024 / 1024).toFixed(1) + 'MB',
      status: 'active'
    }));

    if (target) {
        const single = websites.find((w: any) => w.target.includes(target.replace(/https?:\/\//, ''))) || websites[0];
        return NextResponse.json(single);
    }

    if (servers.length === 0 && websites.length === 0) throw new Error('No real metrics found in Prometheus');

    return NextResponse.json({ websites, servers, containers, dbStatus, apps });

  } catch (error: any) {
    console.error('Metrics Retrieval Failed:', error.message);
    return NextResponse.json({ 
      error: 'Data Retrieval Failed', 
      message: 'Connection to monitoring database failed. Showing no data to avoid false information.',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
