import { NextResponse } from 'next/server';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const hourAgo = now - 3600;

    // 1. FETCH ALL RAW TELEMETRY IN PARALLEL
    const [
      rpsRes, errRes, latRes, upRes, 
      cpuRes, ramRes, diskRes, netInRes, netOutRes, cpuHistRes,
      sslRes, websiteLatRes, websiteUpRes,
      pm2Res, pm2RestartsRes, pm2CpuRes, pm2MemRes,
      alertsRes
    ] = await Promise.all([
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(nginx_http_requests_total[5m]))`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(nginx_http_requests_total{status=~"5.."}[5m])) / sum(rate(nginx_http_requests_total[5m])) * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg(probe_duration_seconds) * 1000`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg_over_time(probe_success[24h]) * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}) / node_filesystem_size_bytes{mountpoint="/"} * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(node_network_receive_bytes_total[5m]))`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(node_network_transmit_bytes_total[5m]))`),
      fetch(`${PROMETHEUS_URL}/api/v1/query_range?query=100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)&start=${hourAgo}&end=${now}&step=60s`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_ssl_earliest_cert_expiry - time()`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_duration_seconds * 1000`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg_over_time(probe_success[24h]) * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_up`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_restarts`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_cpu`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_memory`),
      fetch(`${PROMETHEUS_URL}/api/v1/alerts`)
    ]);

    // PARSE EVERYTHING
    const [rps, errRate, avgLat, globalUptime, cpu, ram, disk, netIn, netOut, cpuHist, ssl, wLat, wUp, pm2, pm2R, pm2C, pm2M, alertsData] = await Promise.all([
      rpsRes.json(), errRes.json(), latRes.json(), upRes.json(),
      cpuRes.json(), ramRes.json(), diskRes.json(), netInRes.json(), netOutRes.json(), cpuHistRes.json(),
      sslRes.json(), websiteLatRes.json(), websiteUpRes.json(),
      pm2Res.json(), pm2RestartsRes.json(), pm2CpuRes.json(), pm2MemRes.json(), alertsRes.json()
    ]);

    // 2. MAPPING WEBSITES (REAL DATA ONLY)
    const websites = (ssl.data?.result || []).map((res: any) => {
      const domain = res.metric.domain;
      const latMatch = (wLat.data?.result || []).find((l: any) => l.metric.instance?.includes(domain));
      const upMatch = (wUp.data?.result || []).find((u: any) => u.metric.instance?.includes(domain));
      
      return {
        domain,
        status: res.value[1] > 0 ? 'Up' : 'Down',
        latency: latMatch ? Math.round(parseFloat(latMatch.value[1])) + 'ms' : '---',
        uptime: upMatch ? parseFloat(upMatch.value[1]).toFixed(1) + '%' : '100%',
        ssl_days: Math.floor(res.value[1] / 86400)
      };
    });

    // 3. MAPPING APPS (REAL DATA ONLY)
    const apps = (pm2.data?.result || []).map((res: any, idx: number) => {
      const name = res.metric.name || res.metric.app || res.metric.item || 'App';
      const cpuVal = (pm2C.data?.result || []).find((c: any) => (c.metric.name || c.metric.app) === name);
      const memVal = (pm2M.data?.result || []).find((m: any) => (m.metric.name || m.metric.app) === name);
      
      return {
        name,
        status: res.value[1] === '1' ? 'Running' : 'Crashed',
        restarts: pm2R.data?.result?.[idx]?.value?.[1] || 0,
        cpu: cpuVal ? parseFloat(cpuVal.value[1]).toFixed(1) + '%' : '---',
        memory: memVal ? (parseFloat(memVal.value[1]) / 1024 / 1024).toFixed(1) + 'MB' : '---'
      };
    });

    return Response.json({
      global: {
        status: (alertsData.data?.alerts?.length || 0) > 0 ? 'DEGRADED' : 'HEALTHY',
        rps: parseFloat(rps.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        error_rate: parseFloat(errRate.data?.result?.[0]?.value?.[1] || '0').toFixed(2),
        avg_latency: Math.round(parseFloat(avgLat.data?.result?.[0]?.value?.[1] || '0')),
        uptime: parseFloat(globalUptime.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        active_alerts: alertsData.data?.alerts?.length || 0
      },
      infra: {
        cpu: parseFloat(cpu.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        ram: parseFloat(ram.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        disk: parseFloat(disk.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        net_in: (parseFloat(netIn.data?.result?.[0]?.value?.[1] || '0') / 1024 / 1024).toFixed(2),
        net_out: (parseFloat(netOut.data?.result?.[0]?.value?.[1] || '0') / 1024 / 1024).toFixed(2),
        cpu_history: (cpuHist.data?.result?.[0]?.values || []).map((v: any) => parseFloat(v[1]))
      },
      websites,
      apps,
      alerts: (alertsData.data?.alerts || []).map((a: any) => ({
        severity: a.labels.severity,
        message: a.annotations.summary || a.labels.alertname,
        time: a.activeAt
      }))
    });

  } catch (error: any) {
    console.error('Metrics Engine Failure:', error.message);
    return Response.json({ error: 'Telemetry link severed' }, { status: 500 });
  }
}
