import { NextResponse } from 'next/server';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const hourAgo = now - 3600;

    // 1. GLOBAL SIGNALS & HISTORY (Last 1 Hour)
    const [rpsRes, errRes, latRes, upRes, cpuHistRes] = await Promise.all([
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(nginx_http_requests_total[5m]))`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(nginx_http_requests_total{status=~"5.."}[5m])) / sum(rate(nginx_http_requests_total[5m])) * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg(probe_duration_seconds) * 1000`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg_over_time(probe_success[24h]) * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query_range?query=100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)&start=${hourAgo}&end=${now}&step=60s`)
    ]);

    const rps = await rpsRes.json();
    const errRate = await errRes.json();
    const avgLat = await latRes.json();
    const uptime = await upRes.json();
    const cpuHist = await cpuHistRes.json();

    // 2. INFRASTRUCTURE 
    const [cpuRes, ramRes, diskRes, netInRes, netOutRes] = await Promise.all([
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}) / node_filesystem_size_bytes{mountpoint="/"} * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(node_network_receive_bytes_total[5m]))`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(node_network_transmit_bytes_total[5m]))`)
    ]);

    const cpu = await cpuRes.json();
    const ram = await ramRes.json();
    const disk = await diskRes.json();
    const netIn = await netInRes.json();
    const netOut = await netOutRes.json();

    // 3. WEBSITES & PM2
    const sslRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_ssl_earliest_cert_expiry - time()`);
    const sslData = await sslRes.json();
    const pm2Res = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_up`);
    const pm2Data = await pm2Res.json();
    const pm2RestartsRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_restarts`);
    const pm2RestartsData = await pm2RestartsRes.json();

    // 4. ACTIVE ALERTS
    const alertsRes = await fetch(`${PROMETHEUS_URL}/api/v1/alerts`);
    const alertsData = await alertsRes.json();

    // Transform CPU History for Sparkline
    const cpuHistory = (cpuHist.data?.result?.[0]?.values || []).map((v: any) => parseFloat(v[1]));

    const websites = (sslData.data?.result || []).map((res: any) => ({
      domain: res.metric.domain,
      status: res.value[1] > 0 ? 'Up' : 'Down',
      ssl_days: Math.floor(res.value[1] / 86400)
    }));

    const apps = (pm2Data.data?.result || []).map((res: any, idx: number) => ({
      name: res.metric.name || 'App',
      status: res.value[1] === '1' ? 'Running' : 'Crashed',
      restarts: pm2RestartsData.data?.result?.[idx]?.value?.[1] || 0
    }));

    return Response.json({
      global: {
        status: (alertsData.data?.alerts?.length || 0) > 0 ? 'DEGRADED' : 'HEALTHY',
        rps: parseFloat(rps.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        error_rate: parseFloat(errRate.data?.result?.[0]?.value?.[1] || '0').toFixed(2),
        avg_latency: Math.round(parseFloat(avgLat.data?.result?.[0]?.value?.[1] || '0')),
        uptime: parseFloat(uptime.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        active_alerts: alertsData.data?.alerts?.length || 0
      },
      infra: {
        cpu: parseFloat(cpu.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        ram: parseFloat(ram.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        disk: parseFloat(disk.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        net_in: (parseFloat(netIn.data?.result?.[0]?.value?.[1] || '0') / 1024 / 1024).toFixed(2),
        net_out: (parseFloat(netOut.data?.result?.[0]?.value?.[1] || '0') / 1024 / 1024).toFixed(2),
        cpu_history: cpuHistory
      },
      websites,
      apps,
      alerts: (alertsData.data?.alerts || []).map((a: any) => ({
        severity: a.labels.severity,
        message: a.annotations.summary || a.labels.alertname
      }))
    });

  } catch (error: any) {
    console.error('Metrics Retrieval Failed:', error.message);
    return Response.json({ error: 'Data synchronization failure' }, { status: 500 });
  }
}
