import { NextResponse } from 'next/server';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const window10m = now - 600;

    // 1. FETCH RAW DATA
    const [
      rpsRes, errRes, p95Res, loadRes, 
      cpuRes, ramRes, diskRes, netInRes, netOutRes,
      sslRes, wLatRes, wUpRes, wStatusRes,
      pm2Res, pm2RRes, pm2CRes, pm2MRes,
      pm2R10mRes, // NEW: 10-minute restart window
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
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_ssl_earliest_cert_expiry - time()`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_duration_seconds * 1000`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg_over_time(probe_success[24h]) * 100`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_http_status_code`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_up`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=increase(pm2_restarts[1h])`), 
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_cpu`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_memory`),
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=increase(pm2_restarts[10m])`), // ANOMALY DETECTION
      fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg(nginx_upstream_response_time_seconds) * 1000`),
      fetch(`${PROMETHEUS_URL}/api/v1/alerts`)
    ]);

    const [
      rps, errRate, p95, load, cpu, ram, disk, netIn, netOut, ssl, wLat, wUp, wStatusCode,
      pm2, pm2R, pm2C, pm2M, pm2R10m, upstream, alertsData
    ] = await Promise.all([
      rpsRes.json(), errRes.json(), p95Res.json(), loadRes.json(),
      cpuRes.json(), ramRes.json(), diskRes.json(), netInRes.json(), netOutRes.json(),
      sslRes.json(), wLatRes.json(), wUpRes.json(), wStatusRes.json(),
      pm2Res.json(), pm2RRes.json(), pm2CRes.json(), pm2MRes.json(), 
      pm2R10mRes.json(), upstreamRes.json(), alertsRes.json()
    ]);

    // 2. INCIDENT DETECTION ENGINE (The Brain)
    const activeIncidents: any[] = [];
    
    // PM2 APPS (SIGNAL AWARE)
    const pm2Apps = (pm2.data?.result || []).map((res: any) => {
      const name = res.metric.name || res.metric.app || 'Unknown';
      const r10m = (pm2R10m.data?.result || []).find((r: any) => r.metric.name === name);
      const r10mVal = r10m ? Math.round(parseFloat(r10m.value[1])) : 0;
      const restVal = (pm2R.data?.result || []).find((r: any) => r.metric.name === name);
      const hourlyRestarts = restVal ? Math.round(parseFloat(restVal.value[1])) : 0;
      
      const cpuVal = (pm2C.data?.result || []).find((c: any) => c.metric.name === name);
      const memVal = (pm2M.data?.result || []).find((m: any) => m.metric.name === name);

      let severity = 'HEALTHY';
      let fix = '';

      if (r10mVal > 3) {
        severity = 'CRITICAL';
        fix = 'Restart loop detected. Check for config errors or port conflicts.';
        activeIncidents.push({ service: name, issue: 'Rapid Restart Spike', severity, fix });
      } else if (hourlyRestarts > 10) {
        severity = 'WARNING';
        fix = 'High restart rate. Check memory pressure or upstream timeouts.';
      }

      return {
        name,
        status: parseFloat(res.value[1]) >= 1 ? (severity === 'HEALTHY' ? 'Running' : severity) : 'Stopped',
        restarts_1h: hourlyRestarts,
        restarts_10m: r10mVal,
        cpu: cpuVal ? parseFloat(cpuVal.value[1]).toFixed(1) + '%' : '0.1%',
        memory: memVal ? (parseFloat(memVal.value[1]) / 1024 / 1024).toFixed(1) + 'MB' : '---',
        severity
      };
    });

    // WEBSITES (SIGNAL AWARE)
    const websites = (ssl.data?.result || []).map((res: any) => {
      const domain = res.metric.instance || 'yoforex.net';
      const latMatch = (wLat.data?.result || []).find((l: any) => (l.metric.instance || '').includes(domain));
      const upMatch = (wUp.data?.result || []).find((u: any) => (u.metric.instance || '').includes(domain));
      const statusMatch = (wStatusCode.data?.result || []).find((s: any) => (s.metric.instance || '').includes(domain));
      
      const statusCode = statusMatch ? parseInt(statusMatch.value[1]) : 0;
      const latencyVal = latMatch ? Math.round(parseFloat(latMatch.value[1])) : 0;
      const isUp = (upMatch && parseFloat(upMatch.value[1]) > 0) || (statusCode > 0 && statusCode < 500);

      const expirySeconds = parseFloat(res.value[1]);
      const expiryDays = Math.floor(expirySeconds / 86400);

      if (!isUp) {
        activeIncidents.push({ service: domain, issue: 'Service Unreachable', severity: 'CRITICAL', fix: 'Check Nginx config or upstream server status.' });
      } else if (latencyVal > 2000) {
        activeIncidents.push({ service: domain, issue: 'Extreme Latency Spike', severity: 'WARNING', fix: 'Potential resource bottleneck or DB locking.' });
      }

      return {
        domain: domain.replace('https://', '').split(':')[0],
        status: isUp ? (statusCode === 200 ? 'Up' : `Alive (${statusCode})`) : 'Down',
        latency: latencyVal + 'ms',
        uptime: upMatch ? parseFloat(upMatch.value[1]).toFixed(1) + '%' : '100.0%',
        ssl_expiry: expiryDays > 0 ? `${expiryDays} Days` : 'EXPIRED',
        ssl_status: expiryDays < 7 ? 'CRITICAL' : (expiryDays < 15 ? 'WARNING' : 'HEALTHY'),
        is_api: statusCode !== 200 && statusCode > 0
      };
    });

    return Response.json({
      global: {
        status: activeIncidents.some(i => i.severity === 'CRITICAL') ? 'CRITICAL' : (activeIncidents.length > 0 ? 'DEGRADED' : 'HEALTHY'),
        rps: parseFloat(rps.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        error_rate: parseFloat(errRate.data?.result?.[0]?.value?.[1] || '0').toFixed(2),
        p95_latency: Math.round(parseFloat(p95.data?.result?.[0]?.value?.[1] || '12')),
        load_avg: parseFloat(load.data?.result?.[0]?.value?.[1] || '0').toFixed(2),
      },
      incidents: activeIncidents,
      infra: {
        cpu: parseFloat(cpu.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        ram: parseFloat(ram.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        disk: parseFloat(disk.data?.result?.[0]?.value?.[1] || '0').toFixed(1),
        net_in: (parseFloat(netIn.data?.result?.[0]?.value?.[1] || '0') / 1024 / 1024).toFixed(2),
        net_out: (parseFloat(netOut.data?.result?.[0]?.value?.[1] || '0') / 1024 / 1024).toFixed(2),
      },
      websites,
      apps: pm2Apps.sort((a: any, b: any) => {
        const severityOrder: any = { 'CRITICAL': 0, 'WARNING': 1, 'HEALTHY': 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      alerts: (alertsData.data?.alerts || []).map((a: any) => ({
        severity: a.labels.severity,
        message: a.annotations.summary || a.labels.alertname,
        status: a.state
      }))
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
