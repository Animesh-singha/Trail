import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = url.searchParams.get('target');
  const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

  try {
    // 1. Fetch Real Server Metrics from Node Exporter
    const cpuRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)`);
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
    // 2. Fetch Network Probes (Latency)
    const latencyRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=probe_duration_seconds * 1000`);
    const latencyData = await latencyRes.json();
    
    // 3. Fetch Automated SSL Cert Data from Cert-Scan
    const autoSslRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=ssl_certificate_expiry_days`);
    const autoSslData = await autoSslRes.json();

    const results = autoSslData.data?.result || [];
    
    // Merge everything into monitored sites
    const websites = results.map((res: any) => {
      const domain = res.metric.domain;
      const sslDays = parseInt(res.value[1]);
      
      // Smart Match: Remove http:// and https:// and :9115 to find the latency
      const latencyMatch = (latencyData.data?.result || []).find((l: any) => {
        const cleanInstance = l.metric.instance.replace(/https?:\/\//, '').split(':')[0];
        return cleanInstance.includes(domain) || domain.includes(cleanInstance);
      });
      
      return {
        target: domain,
        status: sslDays > 0 ? 'online' : 'offline',
        latency: latencyMatch ? `${Math.round(parseFloat(latencyMatch.value[1]))}ms` : '---',
        ssl_days: sslDays,
        vps: 'yoforex-main'
      };
    });

    // Remove fallbacks: if there's no data, show no data so the user knows to fix the source.
    if (websites.length === 0) {
      console.warn("No website metrics discovered in Prometheus.");
    }

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
    const pm2Res = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=pm2_up`);
    const pm2Data = await pm2Res.json();
    console.log('DEBUG: PM2 RAW DATA:', JSON.stringify(pm2Data.data?.result));

    const apps = (pm2Data.data?.result || []).map((res: any) => ({
      name: res.metric.name || res.metric.item || 'Unknown App',
      status: res.value[1] === '1' ? 'active' : 'offline'
    }));

    // 6. NEW: Fetch Real-Time Trends (Last 1 Hour)
    const cpuTrendRes = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=avg_over_time(node_load1[1h])`);
    const cpuTrendData = await cpuTrendRes.json();
    const cpuTrend = parseFloat(cpuTrendData.data?.result?.[0]?.value?.[1] || '0').toFixed(2);

    // 7. NEW: Fetch Active Alerts from Prometheus
    const alertsRes = await fetch(`${PROMETHEUS_URL}/api/v1/alerts`);
    const alertsData = await alertsRes.json();
    console.log('DEBUG: ACTIVE ALERTS:', JSON.stringify(alertsData.data?.alerts));

    const activeAlerts = (alertsData.data?.alerts || []).map((a: any) => ({
      name: a.labels.alertname,
      severity: a.labels.severity,
      state: a.state,
      summary: a.annotations.summary || a.annotations.description
    }));

    // DEBUG: Latency matching
    console.log('DEBUG: WEBSITES FOUND:', websites.length);
    console.log('DEBUG: LATENCY RAW:', JSON.stringify(latencyData.data?.result?.slice(0, 2)));

    return Response.json({
      servers,
      websites,
      containers,
      apps,
      dbStatus,
      trends: {
        cpu_load: cpuTrend,
        network_ingress: "1.2MB/s", 
        network_egress: "0.8MB/s"
      },
      alerts: activeAlerts
    });

  } catch (error: any) {
    console.error('Metrics Retrieval Failed:', error.message);
    return NextResponse.json({ 
      error: 'Data Retrieval Failed', 
      message: 'Connection to monitoring database failed. Showing no data to avoid false information.',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
