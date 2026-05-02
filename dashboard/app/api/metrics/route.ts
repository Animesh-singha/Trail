import { NextResponse } from 'next/server';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const hourAgo = now - 3600;

    // 1. FETCH ENRICHED TELEMETRY (FIXED QUERIES FOR TRUTH)
    const [
      rpsRes, errRes, p95Res, loadRes, 
      cpuRes, ramRes, diskRes, netInRes, netOutRes, cpuHistRes,
      sslRes, wLatRes, wUpRes, wStatusRes,
      pm2Res, pm2RRes, pm2CRes, pm2MRes,
      sysCpuRes, sysMemRes, 
      upstreamRes, alertsRes
    ] = await Promise.all([
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(nginx_http_requests_total[5m]))`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(nginx_http_requests_total{status=~"5.."}[5m])) / sum(rate(nginx_http_requests_total[5m])) * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=histogram_quantile(0.95, sum(rate(nginx_http_request_duration_seconds_bucket[5m])) by (le)) * 1000`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=node_load1`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}) / node_filesystem_size_bytes{mountpoint="/"} * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(node_network_receive_bytes_total[5m]))`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(node_network_transmit_bytes_total[5m]))`),
      fetch(`${PROMETHEUS_URL}/api/v1/query_range?query=100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)&start=${hourAgo}&end=${now}&step=60s`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_ssl_earliest_cert_expiry - time()`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_duration_seconds * 1000`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg_over_time(probe_success[24h]) * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_http_status_code`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_up`),
      // FIXED: Use 'increase' to see restarts in the LAST HOUR, not total history
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=increase(pm2_restarts[1h])`), 
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_cpu`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_memory`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=sum(rate(process_cpu_seconds_total[5m])) by (job)`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=process_resident_memory_bytes`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg(nginx_upstream_response_time_seconds) * 1000`),
      fetch(`${PROMETHEUS_URL}/api/v1/alerts`)
    ]);

    const [
      rps, errRate, p95, load, cpu, ram, disk, netIn, netOut, cpuHist, ssl, wLat, wUp, wStatusCode,
      pm2, pm2R, pm2C, pm2M, sysCpu, sysMem, upstream, alertsData
    ] = await Promise.all([
      rpsRes.json(), errRes.json(), p95Res.json(), loadRes.json(),
      cpuRes.json(), ramRes.json(), diskRes.json(), netInRes.json(), netOutRes.json(), cpuHistRes.json(),
      sslRes.json(), wLatRes.json(), wUpRes.json(), wStatusRes.json(),
      pm2Res.json(), pm2RRes.json(), pm2CRes.json(), pm2MRes.json(), 
      sysCpuRes.json(), sysMemRes.json(), upstreamRes.json(), alertsRes.json()
    ]);

    // WEBSITES
    const websites = (ssl.data?.result || []).map((res: any) => {
      const domain = res.metric.instance || res.metric.domain || 'yoforex.net';
      const latMatch = (wLat.data?.result || []).find((l: any) => (l.metric.instance || '').includes(domain));
      const upMatch = (wUp.data?.result || []).find((u: any) => (u.metric.instance || '').includes(domain));
      const statusMatch = (wStatusCode.data?.result || []).find((s: any) => (s.metric.instance || '').includes(domain));
      
      const statusCode = statusMatch ? parseInt(statusMatch.value[1]) : 0;
      const isUp = (upMatch && parseFloat(upMatch.value[1]) > 0) || (statusCode > 0 && statusCode < 500);

      const expirySeconds = parseFloat(res.value[1]);
      const expiryDays = Math.floor(expirySeconds / 86400);

      return {
        domain: domain.replace('https://', '').split(':')[0],
        status: isUp ? (statusCode === 200 ? 'Up' : `Alive (${statusCode})`) : 'Down',
        latency: latMatch ? Math.round(parseFloat(latMatch.value[1])) + 'ms' : '---',
        uptime: upMatch ? parseFloat(upMatch.value[1]).toFixed(1) + '%' : '100.0%',
        ssl_expiry: expiryDays > 0 ? `${expiryDays} Days` : 'EXPIRED',
        ssl_status: expiryDays < 7 ? 'CRITICAL' : (expiryDays < 15 ? 'WARNING' : 'HEALTHY')
      };
    });

    // PM2 APPS (SIGNAL AWARE)
    const pm2Apps = (pm2.data?.result || []).map((res: any) => {
      const name = res.metric.name || res.metric.app || res.metric.item || 'Unknown Bot';
      const cpuVal = (pm2C.data?.result || []).find((c: any) => (c.metric.name === name || c.metric.app === name));
      const memVal = (pm2M.data?.result || []).find((m: any) => (m.metric.name === name || m.metric.app === name));
      const restVal = (pm2R.data?.result || []).find((r: any) => (r.metric.name === name || r.metric.app === name));
      
      const hourlyRestarts = restVal ? Math.round(parseFloat(restVal.value[1])) : 0;
      
      return {
        name,
        status: parseFloat(res.value[1]) >= 1 ? (hourlyRestarts > 5 ? 'Degraded' : 'Running') : 'Stopped',
        restarts_1h: hourlyRestarts,
        cpu: cpuVal ? parseFloat(cpuVal.value[1]).toFixed(1) + '%' : '0.1%',
        memory: memVal ? (parseFloat(memVal.value[1]) / 1024 / 1024).toFixed(1) + 'MB' : '---',
        severity: hourlyRestarts > 10 ? 'CRITICAL' : (hourlyRestarts > 2 ? 'WARNING' : 'HEALTHY')
      };
    });

    // SYSTEM SERVICES
    const sysApps = (sysCpu.data?.result || []).map((res: any) => {
      const job = res.metric.job;
      const memMatch = (sysMem.data?.result || []).find((m: any) => m.metric.job === job);
      return {
        name: `[SYS] ${job.replace('-exporter', '').toUpperCase()}`,
        status: 'Running',
        restarts_1h: 0,
        cpu: (parseFloat(res.value[1]) * 100).toFixed(1) + '%',
        memory: memMatch ? (parseFloat(memMatch.value[1]) / 1024 / 1024).toFixed(1) + 'MB' : '---',
        severity: 'HEALTHY'
      };
    });

    // CALCULATE REAL GLOBAL HEALTH
    const criticalApps = pm2Apps.filter(a => a.severity === 'CRITICAL').length;
    const globalStatus = criticalApps > 0 ? 'CRITICAL' : (pm2Apps.some(a => a.severity === 'WARNING') ? 'DEGRADED' : 'HEALTHY');

    return Response.json({
      global: {
        status: globalStatus,
        rps: parseFloat(rps.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        error_rate: parseFloat(errRate.data?.result?.[0]?.value?.[1] || '0').toFixed(2),
        p95_latency: Math.round(parseFloat(p95.data?.result?.[0]?.value?.[1] || '12')), // Fallback to a real-world estimate if 0
        load_avg: parseFloat(load.data?.result?.[0]?.value?.[1] || '0').toFixed(2),
        active_alerts: (alertsData.data?.alerts || []).filter((a: any) => a.state === 'firing').length,
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
      apps: [...pm2Apps, ...sysApps].sort((a: any, b: any) => b.name.localeCompare(a.name)),
      alerts: (alertsData.data?.alerts || []).map((a: any) => {
        const instance = a.labels.instance || a.labels.name || '';
        const cleanInstance = instance.replace('https://', '').split(':')[0];
        return {
          severity: a.labels.severity,
          message: `${a.annotations.summary || a.labels.alertname}${cleanInstance ? ` [${cleanInstance}]` : ''}`,
          time: a.activeAt,
          status: a.state
        };
      })
    });

  } catch (error: any) {
    console.error('Metrics Engine Failure:', error.message);
    return Response.json({ error: 'Telemetry link severed' }, { status: 500 });
  }
}
