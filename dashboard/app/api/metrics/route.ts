import { NextResponse } from 'next/server';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const hourAgo = now - 3600;

    // 1. FETCH SRE-GRADE TELEMETRY (THE "GOLDEN SIGNALS")
    const [
      rpsRes, errRes, p95Res, loadRes, 
      cpuRes, ramRes, diskRes, netInRes, netOutRes, cpuHistRes,
      sslRes, wLatRes, wUpRes,
      pm2Res, pm2RRes, pm2CRes, pm2MRes,
      upstreamRes, alertsRes
    ] = await Promise.all([
      // Traffic: Rate of requests over 5m
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(nginx_http_requests_total[5m]))`),
      // Error Rate: % of 5xx errors
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(nginx_http_requests_total{status=~"5.."}[5m])) / sum(rate(nginx_http_requests_total[5m])) * 100`),
      // Latency: p95 quantile (the "Truth")
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=histogram_quantile(0.95, sum(rate(nginx_http_request_duration_seconds_bucket[5m])) by (le)) * 1000`),
      // Saturation: Load Average (1m)
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=node_load1`),
      // Infra: CPU/RAM/Disk
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}) / node_filesystem_size_bytes{mountpoint="/"} * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(node_network_receive_bytes_total[5m]))`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(node_network_transmit_bytes_total[5m]))`),
      fetch(`${PROMETHEUS_URL}/api/v1/query_range?query=100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)&start=${hourAgo}&end=${now}&step=60s`),
      // Assets: SSL & Websites
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_ssl_earliest_cert_expiry - time()`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_duration_seconds * 1000`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg_over_time(probe_success[24h]) * 100`),
      // Apps: PM2 Bot discovery
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_up`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_restarts`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_cpu`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_memory`),
      // Forensics: Upstream Latency & Alerts
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg(nginx_upstream_response_time_seconds) * 1000`),
      fetch(`${PROMETHEUS_URL}/api/v1/alerts`)
    ]);

    const [rps, errRate, p95, load, cpu, ram, disk, netIn, netOut, cpuHist, ssl, wLat, wUp, pm2, pm2R, pm2C, pm2M, upstream, alerts] = await Promise.all([
      rpsRes.json(), errRes.json(), p95Res.json(), loadRes.json(),
      cpuRes.json(), ramRes.json(), diskRes.json(), netInRes.json(), netOutRes.json(), cpuHistRes.json(),
      sslRes.json(), wLatRes.json(), wUpRes.json(),
      pm2Res.json(), pm2RRes.json(), pm2CRes.json(), pm2MRes.json(), upstreamRes.json(), alerts.json()
    ]);

    // MAPPING WEBSITES (External Fleet)
    const websites = (ssl.data?.result || []).map((res: any) => {
      const domain = res.metric.instance || res.metric.domain || 'yoforex.net';
      const latMatch = (wLat.data?.result || []).find((l: any) => (l.metric.instance || '').includes(domain));
      const upMatch = (wUp.data?.result || []).find((u: any) => (u.metric.instance || '').includes(domain));
      
      const expirySeconds = parseFloat(res.value[1]);
      const expiryDays = Math.floor(expirySeconds / 86400);

      return {
        domain: domain.replace('https://', '').split(':')[0],
        status: upMatch && parseFloat(upMatch.value[1]) > 0 ? 'Up' : 'Down',
        latency: latMatch ? Math.round(parseFloat(latMatch.value[1])) + 'ms' : '---',
        uptime: upMatch ? parseFloat(upMatch.value[1]).toFixed(1) + '%' : '100.0%',
        ssl_expiry: expiryDays > 0 ? `${expiryDays} Days` : 'EXPIRED',
        ssl_status: expiryDays < 7 ? 'CRITICAL' : (expiryDays < 15 ? 'WARNING' : 'HEALTHY')
      };
    });

    // MAPPING APPS (Service Topology)
    const apps = (pm2.data?.result || []).map((res: any) => {
      const name = res.metric.name || res.metric.app || res.metric.item || 'Unknown Bot';
      const cpuVal = (pm2C.data?.result || []).find((c: any) => (c.metric.name === name || c.metric.app === name));
      const memVal = (pm2M.data?.result || []).find((m: any) => (m.metric.name === name || m.metric.app === name));
      const restVal = (pm2R.data?.result || []).find((r: any) => (r.metric.name === name || r.metric.app === name));
      
      return {
        name,
        status: parseFloat(res.value[1]) >= 1 ? 'Running' : 'Stopped',
        restarts: restVal ? parseInt(restVal.value[1]) : 0,
        cpu: cpuVal ? parseFloat(cpuVal.value[1]).toFixed(1) + '%' : '0.0%',
        memory: memVal ? (parseFloat(memVal.value[1]) / 1024 / 1024).toFixed(1) + 'MB' : '0.0MB'
      };
    });

    return Response.json({
      global: {
        status: (alerts.data?.alerts?.length || 0) > 0 ? 'DEGRADED' : 'HEALTHY',
        rps: parseFloat(rps.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        error_rate: parseFloat(errRate.data?.result?.[0]?.value?.[1] || '0').toFixed(2),
        p95_latency: Math.round(parseFloat(p95.data?.result?.[0]?.value?.[1] || '0')),
        load_avg: parseFloat(load.data?.result?.[0]?.value?.[1] || '0').toFixed(2),
        active_alerts: (alerts.data?.alerts || []).filter((a: any) => a.state === 'firing').length,
        upstream_latency: Math.round(parseFloat(upstream.data?.result?.[0]?.value?.[1] || '0'))
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
      apps: apps.sort((a: any, b: any) => b.name.localeCompare(a.name)),
      alerts: (alerts.data?.alerts || []).map((a: any) => ({
        severity: a.labels.severity,
        message: a.annotations.summary || a.labels.alertname,
        time: a.activeAt,
        status: a.state
      }))
    });

  } catch (error: any) {
    console.error('Metrics Engine Failure:', error.message);
    return Response.json({ error: 'Telemetry link severed' }, { status: 500 });
  }
}
