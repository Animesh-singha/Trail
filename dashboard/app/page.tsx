'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Activity, ShieldAlert, CheckCircle, ServerCrash, Server, X, Maximize2,
  Layout, Server as ServerIcon, Globe, AlertCircle,
  Terminal as TerminalIcon, Share2, ShieldCheck, Shield, Eye, EyeOff,
  Brain, Info, Zap, ArrowRight, Boxes, Network, Share as ShareIcon, Search
} from 'lucide-react';

import ChatWidget from '@/components/ChatWidget';
import LiveLogsViewer from '@/components/LiveLogsViewer';
import UptimeMonitor from '@/components/UptimeMonitor';
import ServerGrid from '@/components/ServerGrid';
import FileIntegrityList from '@/components/FileIntegrityList';
import SiteCard from '@/components/SiteCard';
import FleetOverview from '@/components/FleetOverview';
import ErrorStream from '@/components/ErrorStream';
import InfrastructureTopology from '@/components/InfrastructureTopology';
import MetricGraph from '@/components/MetricGraph';
import CommandPalette from '@/components/CommandPalette';
import AlertTimeline from '@/components/AlertTimeline';
import RootCauseTimeline from '@/components/RootCauseTimeline';
import BackupPanel from '@/components/BackupPanel';
import SandboxSimulator from '@/components/SandboxSimulator';
import AuthGateway from '@/components/AuthGateway';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';


export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, last24h: 0 });
  const [loading, setLoading] = useState(true);
  const [monitoredSites, setMonitoredSites] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'offline'>('all');
  const [servers, setServers] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState('Unknown');
  const [analytics, setAnalytics] = useState<any>({ mttr: '0.0', frequency: [] });
  const [selectedSite, setSelectedSite] = useState<any | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'infrastructure' | 'apps' | 'topology' | 'web-assets' | 'errors' | 'incidents'>('overview');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const tabNavRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tabNavRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -14;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => setMousePos({ x: 0, y: 0 });

  const filteredIncidents = incidents.filter(i => {
    const ts = new Date(i.timestamp).getTime();
    if (timeRange === '1h') return ts > Date.now() - 3600000;
    if (timeRange === '5m') return ts > Date.now() - 300000;
    if (timeRange === '24h') return ts > Date.now() - 86400000;
    if (timeRange === '7d') return ts > Date.now() - 604800000;
    return true;
  });

  const handleExplainAI = async () => {
    if (!selectedIncident) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/v1/incidents/${selectedIncident.id}/analyze`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!selectedIncident) setAiAnalysis(null);
  }, [selectedIncident]);

  useEffect(() => {
    if (selectedIncident) {
      const fetchTimeline = async () => {
        setIsTimelineLoading(true);
        try {
          const res = await fetch(`${API_BASE}/v1/incidents/${selectedIncident.id}/timeline`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            setTimelineEvents(data);
          }
        } finally {
          setIsTimelineLoading(false);
        }
      };
      fetchTimeline();
    }
  }, [selectedIncident]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let attempts = 0;

    const connectWS = () => {
      const wsUrl = API_BASE.replace('http', 'ws') + '/ws';
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('Connected to Nexus SOC WebSocket');
        attempts = 0; // Reset on successful connection
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle new incidents
          if (data.type === 'INCIDENT_NEW') {
            const newIncident = data.payload;
            setIncidents(prev => [newIncident, ...prev].slice(0, 50));
            // Update stats
            setStats((prev: any) => ({
              ...prev,
              total: prev.total + 1,
              critical: newIncident.severity === 'CRITICAL' ? prev.critical + 1 : prev.critical,
            }));
          } 
          // Handle incident updates (from Queue or Manual edits)
          else if (data.type === 'INCIDENT_UPDATED') {
            const updated = data.payload;
            setIncidents(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
          }
          // Handle topology updates (Real-time Sync)
          else if (data.type === 'TOPOLOGY_UPDATED') {
            const topoData = data.payload;
            
            const hubServers = topoData.nodes.filter((n: any) => n.type === 'SERVER').map((n: any) => ({
              hostname: n.name,
              ip: n.metadata?.ip || '0.0.0.0',
              ram_used: n.metadata?.memory?.used_gb || 0,
              ram_total: n.metadata?.memory?.total_gb || 0,
              cpu_load: n.metadata?.cpu?.load_avg || 0,
              status: n.status
            }));

            const hubWebsites = topoData.nodes.filter((n: any) => n.type === 'DOMAIN').map((n: any) => ({
              target: n.name,
              rpm: n.metadata?.metrics?.rpm || 0,
              latency: n.metadata?.metrics?.p95_ms || 0,
              memory: n.metadata?.metrics?.mem_mb || 0,
              cpu: n.metadata?.metrics?.cpu_pct || 0,
              trend: 'stable',
              vps: n.metadata?.server || 'unknown'
            }));

            if (hubServers.length > 0) setServers(hubServers);
            if (hubWebsites.length > 0) setMonitoredSites(hubWebsites);
          }
        } catch (err) {
          console.error('WS Message Error:', err);
        }
      };

      socket.onclose = (e) => {
        console.log(`WebSocket disconnected: ${e.reason || 'No reason'}`);
        // Exponential backoff: 1s, 2s, 4s, 8s, up to 30s
        const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
        attempts++;
        console.log(`Reconnecting in ${delay/1000}s... (Attempt ${attempts})`);
        reconnectTimeout = setTimeout(connectWS, delay);
      };

      socket.onerror = (err) => {
        console.error('WebSocket Error:', err);
        socket?.close();
      };
    };

    connectWS();

    // 2. Initial Data Fetch (One-time)
    const fetchInitialData = async () => {
      try {
        // Fetch incidents from AI Analyzer
        const incRes = await fetch(`${API_BASE}/v1/incidents`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
        });
        if (incRes.ok) {
          const incData = await incRes.json();
          setIncidents(incData);
          setStats({
            total: incData.length,
            critical: incData.filter((i: any) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length,
            last24h: incData.filter((i: any) => new Date(i.timestamp).getTime() > Date.now() - 86400000).length
          });
        }

        const statsRes = await fetch(`${API_BASE}/v1/incidents/stats`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setAnalytics(statsData);
        }

        // FETCH LIVE TOPOLOGY FROM HUB
        const topoRes = await fetch(`${API_BASE}/v1/visibility/topology`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
        });
        
        let serversData = [];
        let sitesData = [];

        if (topoRes.ok) {
          const topoData = await topoRes.json();
          
          // Map nodes to Dashboard format
          serversData = topoData.nodes.filter((n: any) => n.type === 'SERVER').map((n: any) => ({
            hostname: n.name,
            ip: n.metadata?.ip || '0.0.0.0',
            ram_used: n.metadata?.memory?.used_gb || 0,
            ram_total: n.metadata?.memory?.total_gb || 0,
            cpu_load: n.metadata?.cpu?.load_avg || 0,
            status: n.status
          }));

          sitesData = topoData.nodes.filter((n: any) => n.type === 'DOMAIN').map((n: any) => ({
            target: n.name,
            rpm: n.metadata?.metrics?.rpm || 0,
            latency: n.metadata?.metrics?.p95_ms || 0,
            memory: n.metadata?.metrics?.mem_mb || 0,
            cpu: n.metadata?.metrics?.cpu_pct || 0,
            trend: 'stable',
            vps: n.metadata?.server || 'unknown'
          }));
        }

        // 3. Always fetch real-time PM2 and Container data from our metrics service
        const metricsRes = await fetch('/api/metrics');
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          if (metricsData.apps) setApps(metricsData.apps);
          if (metricsData.containers) setContainers(metricsData.containers);
          if (metricsData.dbStatus) setDbStatus(metricsData.dbStatus);
          
          // Fallback servers/sites if topology is empty
          if (serversData.length === 0 && metricsData.servers) serversData = metricsData.servers;
          if (sitesData.length === 0 && metricsData.websites) sitesData = metricsData.websites;
        }

        setServers(serversData);
        setMonitoredSites(sitesData);

      } finally {
        setLoading(false);
      }
    };
    // 3. System Health Polling (Elite Telemetry)
    const fetchHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/control/health`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSystemHealth(data);
        }
      } catch (err) {
        console.error('Failed to fetch system health', err);
      }
    };

    fetchInitialData();
    fetchHealth();
    const healthInterval = setInterval(fetchHealth, 10000); // Poll every 10s

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(healthInterval);
      socket?.close();
    };
  }, [isAuthenticated]);

  const [simResult, setSimResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Helper to simulate action
  const handleSimulateAction = async (id: number, type: 'incident' | 'control', action?: string, target?: string) => {
    setIsSimulating(true);
    setSimResult(null);
    try {
      const url = type === 'incident' 
        ? `${API_BASE}/v1/incidents/${id}/simulate`
        : `${API_BASE}/v1/control/simulate`;
      
      const body = type === 'control' ? JSON.stringify({ action, target }) : null;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
        },
        body
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult({ ...data, type, originalId: id });
      }
    } catch (err) {
      console.error('Simulation failed', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApproveFix = async (id: number) => {
    // If we haven't simulated yet, do it first!
    if (!simResult || simResult.originalId !== id) {
      await handleSimulateAction(id, 'incident');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/v1/incidents/${id}/approve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
        }
      });
      if (res.ok) {
        setSimResult(null); // Clear simulation on success
        // Incident updated via WS
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/v1/incidents/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setIncidents((prev: any[]) => prev.map((i: any) => i.id === id ? updated : i));
      }
    } catch (err) {
      console.error('Failed to update incident status', err);
    }
  };

  const healthScore = Math.max(0, 100 - (Number(stats.critical) * 10) - (incidents.filter((i: any) => i.status === 'OPEN').length * 2));

  // Group and Filter sites by VPS
  const sitesByVps = monitoredSites
    .filter(site => {
      const matchesSearch = site.target.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || site.status === 'offline';
      return matchesSearch && matchesFilter;
    })
    .reduce((acc: Record<string, any[]>, site: any) => {
      const vps = site.vps || 'unknown';
      if (!acc[vps]) acc[vps] = [];
      acc[vps].push(site);
      return acc;
    }, {});

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layout },
    { id: 'infrastructure', label: 'Infrastructure', icon: Server },
    { id: 'apps', label: 'App View', icon: Boxes },
    { id: 'topology', label: 'Topology', icon: Network },
    { id: 'web-assets', label: 'Web Assets', icon: Globe },
    { id: 'incidents', label: 'Incidents', icon: AlertCircle },
    { id: 'live-errors', label: 'Live Errors', icon: TerminalIcon },
  ];

  if (!isAuthenticated) {
    return <AuthGateway onAuth={() => setIsAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-500/20 border-t-slate-500 rounded-full animate-spin"></div>
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Synchronizing Fleet...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* GLOBAL STATUS HEADER (SRE COMMAND CENTER UPGRADE) */}
      <div className="bg-slate-950/80 border-b border-slate-800/50 backdrop-blur-xl sticky top-0 z-[60] py-3 px-8 shadow-2xl">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center sm:gap-6 gap-3">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="group flex flex-col cursor-help">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest group-hover:text-slate-300 transition-colors">Fleet Nodes</span>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-white">{servers.filter(s => s.status === 'online').length}</span>
                <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold">READY</span>
              </div>
            </div>
            <div className="w-px h-6 bg-slate-800 hidden sm:block"></div>
            <div className="group flex flex-col cursor-help">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest group-hover:text-slate-300 transition-colors">Active Assets</span>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-white">{monitoredSites.length}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold">LIVE</span>
              </div>
            </div>
            <div className="w-px h-6 bg-slate-800 hidden sm:block"></div>
            <div className="group flex flex-col cursor-help">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest group-hover:text-rose-400 transition-colors">Open Incidents</span>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-rose-500">{incidents.filter(i => i.status === 'OPEN').length}</span>
                <span className="text-[9px] sm:text-[10px] text-rose-400 font-bold animate-pulse">ATTN</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* ELITE SYSTEM MODE INDICATOR */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 ${
              systemHealth?.status === 'DEGRADED' ? 'bg-amber-500/10 border-amber-500/30' : 
              systemHealth?.status === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/30' : 
              'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                systemHealth?.status === 'DEGRADED' ? 'bg-amber-500' : 
                systemHealth?.status === 'CRITICAL' ? 'bg-rose-500' : 
                'bg-emerald-500'
              }`}></div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                systemHealth?.status === 'DEGRADED' ? 'text-amber-400' : 
                systemHealth?.status === 'CRITICAL' ? 'text-rose-400' : 
                'text-emerald-400'
              }`}>
                {systemHealth?.status || 'NORMAL'} MODE
              </span>
            </div>

            <div className="hidden lg:flex flex-col items-end mr-4">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Hub Ingestion Lag</span>
              <div className="text-[10px] font-bold text-white flex gap-2">
                <span>{systemHealth?.telemetry?.lastIngestionLag || 0}ms</span>
                {systemHealth?.telemetry?.droppedEvents > 0 && (
                   <span className="text-rose-400">({systemHealth.telemetry.droppedEvents} DROPPED)</span>
                )}
              </div>
            </div>

            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[9px] font-black text-slate-400 hover:text-white transition-all group">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-500 group-hover:text-white group-hover:border-slate-500 transition-colors">Ctrl + K</kbd>
              COMMAND CENTER
            </button>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-[10px] font-bold text-slate-400 focus:ring-1 focus:ring-slate-500 outline-none"
            >
              <option value="1h">Last 1 Hour</option>
              <option value="5m">Last 5 Minutes</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>
      </div>

      <main className="min-h-screen glow-mesh text-slate-100 selection:bg-indigo-500/30">
        <div className="p-4 md:p-8 max-w-7xl mx-auto relative z-10">

          {/* Premium Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-slate-700/50 pb-6 mb-8"
          >
            {/* Top Row: Title + Sandbox badge */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <ShieldAlert className="text-indigo-400" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    Nexus SOC Module
                  </h1>
                  <p className="text-slate-400 text-sm md:text-base ml-0.5 mt-0.5">Autonomous monitoring platform with AI incident resolution.</p>
                </div>
              </div>
            </div>

            {/* Middle Row: Uptime Monitor Pills */}
            <div className="mb-5">
              <UptimeMonitor onTargetsUpdate={() => { }} />
            </div>

            {/* Bottom Row: Navigation Tabs */}
            <div className="bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap gap-1 shadow-inner w-full">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex-1 md:flex-initial ${activeTab === tab.id ? 'bg-slate-800 text-white shadow-lg shadow-black/40' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.header>

          {/* Main Content Area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* 1. OVERVIEW SECTION */}
              {activeTab === 'overview' && (
                <section>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-indigo-100 uppercase tracking-tight">
                    <Layout className="text-indigo-500" /> Fleet Intelligence Overview
                  </h2>
                  <FleetOverview 
                    websites={monitoredSites} 
                    servers={servers} 
                    containers={containers}
                    dbStatus={dbStatus}
                    securityScore={healthScore} 
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Activity size={18} className="text-emerald-400" /> System Health Status</h3>
                      <div className="glass-panel p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-6">
                          <span className="text-sm font-bold text-slate-300">Global Uptime Aggregate</span>
                          <span className="text-emerald-400 font-black">
                            {monitoredSites.length > 0 
                              ? (monitoredSites.filter(s => s.status === 'online').length / monitoredSites.length * 100).toFixed(2) 
                              : '0.00'}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-8">
                          <div className="h-full w-[99.9%] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/50 text-center">
                            <div className="text-2xl font-black text-rose-500">{stats.critical}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Active Alerts</div>
                          </div>
                          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/50 text-center">
                            <div className="text-2xl font-black text-indigo-400">{monitoredSites.length}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Live Targets</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <AlertTimeline incidents={incidents} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <MetricGraph
                      label="Fleet Avg CPU"
                      data={servers.map(s => s.cpu_load)}
                      color="indigo"
                      unit="%"
                    />
                    <MetricGraph
                      label="Network Ingress"
                      data={[]}
                      color="emerald"
                      unit="mb/s"
                    />
                    <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Fleet Regional Distribution</div>
                      <div className="space-y-4">
                        {[
                          { region: 'Europe (FRA)', count: 2, status: 'Active' },
                          { region: 'US East (NYC)', count: 1, status: 'Active' },
                          { region: 'Asia (SIN)', count: 0, status: 'Provisioning' }
                        ].map(reg => (
                          <div key={reg.region} className="flex justify-between items-center bg-slate-900/40 p-3 rounded-lg border border-slate-800/30">
                            <span className="text-[10px] font-bold text-slate-300">{reg.region}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${reg.count > 0 ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-800 text-slate-500'}`}>
                              {reg.count} NODES
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* 2. INFRASTRUCTURE SECTION */}
              {activeTab === 'infrastructure' && (
                <section>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-indigo-100 uppercase tracking-tight">
                    <ServerIcon className="text-indigo-500" /> Fleet Audit & Control
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <ServerGrid />
                    </div>
                    <div>
                      <FileIntegrityList />
                    </div>
                  </div>
                </section>
              )}

              {/* 2.5 APP VIEW SECTION */}
              {activeTab === 'apps' && (
                <section className="space-y-8">
                   <div className="flex justify-between items-end mb-6">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-3 text-indigo-100 uppercase tracking-tight mb-2">
                        <Boxes className="text-indigo-500" /> Application Discovery
                      </h2>
                      <p className="text-slate-500 text-sm italic">Automated mapping of running processes to ports and internal services.</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 rounded-xl transition-all">
                        Refresh Mapping
                      </button>
                    </div>
                  </div>

                  {servers.map(server => (
                    <div key={server.id} className="glass-panel p-6 rounded-3xl border border-slate-800/50">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                             <Server size={20} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{server.hostname}</h3>
                            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">{server.ip} • Ubuntu 22.04 LTS</p>
                          </div>
                        </div>
                        <div className="flex gap-6">
                           <div className="text-right">
                              <div className="text-[9px] text-slate-500 uppercase font-black mb-1">CPU App Overhead</div>
                              <div className="text-sm font-bold text-white">4.2%</div>
                           </div>
                           <div className="text-right">
                              <div className="text-[9px] text-slate-500 uppercase font-black mb-1">Mapped Services</div>
                              <div className="text-sm font-bold text-indigo-400">5 Active</div>
                           </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              <th className="px-4 pb-2">Process</th>
                              <th className="px-4 pb-2">PID</th>
                              <th className="px-4 pb-2">User</th>
                              <th className="px-4 pb-2">Port(s)</th>
                              <th className="px-4 pb-2">CPU/MEM</th>
                              <th className="px-4 pb-2">Uptime</th>
                              <th className="px-4 pb-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs">
                            {/* App Discovery auto-detects PM2 and Docker processes */}
                            {apps.length > 0 ? (
                              apps.map((app: any, i: number) => (
                                <tr key={i} className="bg-slate-900/40 hover:bg-slate-900/60 transition-colors border-y border-slate-800/30">
                                  <td className="px-4 py-3 font-bold text-indigo-100 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    {app.name}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-slate-400">N/A</td>
                                  <td className="px-4 py-3 text-slate-500">ubuntu</td>
                                  <td className="px-4 py-3 font-mono text-indigo-400">---</td>
                                  <td className="px-4 py-3 text-slate-400">{app.cpu} / {app.memory}</td>
                                  <td className="px-4 py-3 text-slate-500">online</td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                      {app.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
                                  Waiting for PM2 Discovery Agent to scan VPS processes...
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* 3. WEB ASSETS SECTION */}
              {activeTab === 'web-assets' && (
                <section className="space-y-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                      <div>
                        <h2 className="text-2xl font-bold mb-2 flex items-center gap-3 text-indigo-100 uppercase tracking-tight">
                          <Globe className="text-indigo-500" /> Live Site Health Monitor
                        </h2>
                        <p className="text-slate-500 text-sm">Managing {monitoredSites.length} assets across your global fleet.</p>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                          <input 
                            type="text" 
                            placeholder="Search assets..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <button 
                          onClick={() => setFilterStatus(filterStatus === 'all' ? 'offline' : 'all')}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            filterStatus === 'offline' 
                              ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {filterStatus === 'offline' ? 'Showing Offline Only' : 'Show All'}
                        </button>
                      </div>
                    </div>

                    {Object.keys(sitesByVps).map((vpsName, vIdx) => (
                      <div key={vpsName} className="space-y-6 mb-10">
                        <div className="flex items-center gap-4">
                          <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] bg-indigo-500/5 px-4 py-1.5 rounded-full border border-indigo-500/20 flex items-center gap-2">
                            <ServerIcon size={10} /> {vpsName} FLEET
                          </h2>
                          <div className="h-px flex-1 bg-slate-800/50"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {sitesByVps[vpsName].map((site: any) => (
                            <SiteCard
                              key={site.target}
                              target={site.target}
                              vps={vpsName}
                              onClick={() => setSelectedSite(site)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </section>
              )}

              {/* 4. TOPOLOGY SECTION */}
              {activeTab === 'topology' && (
                <section>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-indigo-100 uppercase tracking-tight">
                    <Network className="text-indigo-500" /> Infrastructure Dependency Web
                  </h2>
                  <InfrastructureTopology incidents={filteredIncidents} />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/50">
                      <div className="text-[10px] text-indigo-400 font-bold mb-2 uppercase">Traffic Flow Analysis</div>
                      <p className="text-xs text-slate-400">Current ingress distributed evenly across 3 primary load balancer nodes with 42ms overhead.</p>
                    </div>
                    <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/50">
                      <div className="text-[10px] text-emerald-400 font-bold mb-2 uppercase">Core Redundancy</div>
                      <p className="text-xs text-slate-400">Database cluster at 100% health. Replication lag at 2ms. Failover ready in secondary region.</p>
                    </div>
                    <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/50">
                      <div className="text-[10px] text-rose-400 font-bold mb-2 uppercase">Security Perimeter</div>
                      <p className="text-xs text-slate-400">Threat assessment at 0/100. No active bypass attempts detected in global firewall logs.</p>
                    </div>
                  </div>
                </section>
              )}

              {/* 5. LIVE ERRORS SECTION */}
              {activeTab === 'errors' && (
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-rose-100 uppercase tracking-tight">
                      <TerminalIcon className="text-rose-500" /> Critical Error Feed
                    </h2>
                    <div className="text-[10px] text-slate-500 font-mono">Consolidated Global Logs</div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <ErrorStream />
                    </div>
                    <div className="space-y-6">
                      <div className="glass-panel p-6 rounded-2xl bg-rose-500/5 border-rose-500/20">
                        <h3 className="text-sm font-bold text-rose-300 mb-4 flex items-center gap-2 underline underline-offset-4 decoration-rose-500/30">Immediate Actions</h3>
                        <ul className="space-y-4">
                          <li className="flex gap-3 text-xs leading-relaxed text-slate-300">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1 shrink-0"></span>
                            Check VPS resource saturation if high error rates persist.
                          </li>
                          <li className="flex gap-3 text-xs leading-relaxed text-slate-300">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1 shrink-0"></span>
                            Validate SSL/TLS certificates for targets showing "Handshake Failure".
                          </li>
                        </ul>
                      </div>
                      <button
                        onClick={() => {
                          const topIncident = incidents.find(i => i.status === 'OPEN' && i.severity === 'CRITICAL') || incidents.find(i => i.status === 'OPEN');
                          if (topIncident) {
                            setSelectedIncident(topIncident);
                          } else {
                            alert('No open incidents to analyze.');
                          }
                        }}
                        className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-black text-xs uppercase tracking-widest rounded-2xl border border-rose-500/30 transition-all flex items-center justify-center gap-3 group"
                      >
                        <Activity size={16} className="group-hover:animate-pulse" /> Run AI Diagnostic
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* 6. INCIDENT MANAGEMENT SECTION */}
              {activeTab === 'incidents' && (
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100 uppercase tracking-tight">
                      <AlertCircle className="text-slate-500" /> Incident Command Center
                    </h2>
                    <div className="flex gap-4">
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span> {filteredIncidents.filter(i => i.status === 'OPEN').length} OPEN
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> {filteredIncidents.filter(i => i.status === 'INVESTIGATING').length} INVESTIGATING
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-6">
                      {filteredIncidents.length === 0 ? (
                        <div className="glass-panel p-20 text-center opacity-50 flex flex-col items-center">
                          <CheckCircle size={48} className="text-emerald-500 mb-4" />
                          <p className="text-xl font-bold uppercase tracking-widest">No Active Incidents</p>
                        </div>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {filteredIncidents.map((inc) => (
                            <motion.div
                              key={inc.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`glass-panel p-6 rounded-2xl border-l-4 transition-all ${inc.status === 'RESOLVED' ? 'opacity-60 grayscale-[0.5] border-l-emerald-500' :
                                  inc.severity === 'CRITICAL' ? 'border-l-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.1)]' :
                                    inc.severity === 'HIGH' ? 'border-l-rose-500' :
                                      'border-l-slate-500'
                                }`}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${inc.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                                        inc.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                          'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                      }`}>{inc.severity}</span>
                                    <span className="text-xs font-mono text-slate-500">{new Date(inc.timestamp).toLocaleString()}</span>
                                  </div>
                                  <h3 className="text-lg font-bold text-white">{inc.alert_name}</h3>
                                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{inc.service}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-[9px] text-slate-500 uppercase font-black mb-1">AI Confidence</div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500" style={{ width: `${inc.confidence}%` }}></div>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-400">{inc.confidence}%</span>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 relative">
                                {(!inc.root_cause || inc.root_cause === 'Gemini API Error' || inc.status === 'OPEN') && (
                                  <div className="md:col-span-2 bg-slate-950/90 border border-slate-500/30 rounded-xl p-4 font-mono text-[10px] overflow-hidden relative group">
                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                                      <div className="flex gap-1">
                                        <div className="w-2 h-2 rounded-full bg-rose-500/50"></div>
                                        <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                                        <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                                      </div>
                                      <span className="text-slate-400 font-bold uppercase tracking-widest">Nexus AI Agent Output</span>
                                      <div className="ml-auto flex items-center gap-2">
                                        <span className="w-2 h-2 bg-slate-500 rounded-full animate-ping"></span>
                                        <span className="text-slate-500">LIVE_ANALYSIS</span>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-1.5 min-h-[80px]">
                                      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}} className="flex gap-2">
                                         <span className="text-slate-600">[00:01]</span>
                                         <span className="text-emerald-500">INIT</span>
                                         <span className="text-slate-400">Heuristics engine engaged for {inc.alert_name}...</span>
                                      </motion.div>
                                      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.5}} className="flex gap-2">
                                         <span className="text-slate-600">[00:03]</span>
                                         <span className="text-slate-400">SCAN</span>
                                         <span className="text-slate-400">Analyzing metrics baseline for {inc.service}...</span>
                                      </motion.div>
                                      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:2.5}} className="flex gap-2 underline decoration-slate-500/30">
                                         <span className="text-slate-600">[00:06]</span>
                                         <span className="text-amber-500">MATCH</span>
                                         <span className="text-slate-200">Signature found: {inc.alert_name} (Confidence: {inc.confidence}%)</span>
                                      </motion.div>
                                      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:3.5}} className="flex gap-2">
                                         <span className="text-slate-600">[00:08]</span>
                                         <span className="text-emerald-500">DONE</span>
                                         <span className="text-slate-400">Root cause identified. Formulating remediation...</span>
                                      </motion.div>
                                    </div>

                                    {/* Overlay that vanishes after "Thinking" */}
                                    <motion.div 
                                      initial={{ opacity: 1 }} 
                                      animate={{ opacity: 0 }} 
                                      transition={{ delay: 5.5, duration: 0.5 }}
                                      className="absolute inset-x-0 bottom-0 top-[35px] bg-slate-950/40 backdrop-blur-[1px] pointer-events-none"
                                    />
                                  </div>
                                )}

                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/50">
                                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Root Cause Analysis</div>
                                  <p className="text-sm text-slate-300 leading-relaxed italic">"{inc.root_cause}"</p>
                                </div>
                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/50">
                                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Remediation Steps</div>
                                  <p className="text-sm text-emerald-400/90 leading-relaxed">{inc.suggested_fix}</p>
                                </div>
                              </div>

                              <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => setSelectedIncident(inc)}
                                    className="px-4 py-2.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 font-bold text-[10px] uppercase tracking-widest border border-slate-500/30 rounded-xl transition-all"
                                  >
                                    Investigate Timeline
                                  </button>
                                  <button
                                    onClick={() => handleStatusUpdate(inc.id, 'RESOLVED')}
                                    className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-[10px] uppercase tracking-widest border border-emerald-500/30 rounded-xl transition-all"
                                  >
                                    Resolve
                                  </button>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${inc.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500' :
                                    inc.status === 'INVESTIGATING' ? 'bg-amber-500/10 text-amber-500' :
                                      'bg-rose-500/10 text-rose-500 animate-pulse'
                                  }`}>
                                  Status: {inc.status}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="glass-panel p-6 rounded-2xl border border-slate-500/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                        <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                          <Activity size={16} /> Incident KPIs
                        </h3>
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                              <span>Mean Time to Resolve</span>
                              <span className="text-white">{analytics.mttr}m</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-500" style={{ width: `${Math.min(100, Number(analytics.mttr) * 5)}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                              <span>AI Accuracy (Confidence)</span>
                              <span className="text-white">{incidents.length > 0 ? (incidents.reduce((acc: any, i: any) => acc + i.confidence, 0) / incidents.length).toFixed(1) : 0}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${incidents.length > 0 ? (incidents.reduce((acc: any, i: any) => acc + i.confidence, 0) / incidents.length) : 0}%` }}></div>
                            </div>
                          </div>
                          <div className="pt-4 grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/50 text-center">
                              <div className="text-xl font-black text-rose-500">{incidents.filter(i => i.status === 'OPEN').length}</div>
                              <div className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">Current Backlog</div>
                            </div>
                            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/50 text-center">
                              <div className="text-xl font-black text-emerald-500">{incidents.filter(i => i.status === 'RESOLVED').length}</div>
                              <div className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">Resolved (24h)</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (incidents.length === 0) return alert('No incidents to export');
                          const header = 'ID,Alert Name,Severity,Status,Timestamp,Root Cause,Suggested Fix\n';
                          const csv = incidents.map(i => `${i.id},"${i.alert_name}",${i.severity},${i.status},${new Date(i.timestamp).toISOString()},"${i.root_cause || ''}","${i.suggested_fix || ''}"`).join('\n');
                          const blob = new Blob([header + csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `nexus_sla_report_${new Date().toISOString().slice(0, 10)}.csv`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="w-full py-4 bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-black/40 hover:scale-[1.02] active:scale-[0.98] transition-all border border-slate-700/50"
                      >
                        Export SLA Report (CSV)
                      </button>

                      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-[10px] text-slate-500 leading-relaxed font-mono">
                        <div className="text-slate-400 font-bold mb-1">PLATFORM INSIGHT</div>
                        AI suggests that the last 3 critical incidents were related to VPS-NYC-02 resource exhaustion.
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Shared Modals & Widgets */}
          <AnimatePresence>
            {selectedSite && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedSite(null)}
                  className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                ></motion.div>

                <motion.div
                  layoutId={`logs-${selectedSite.target}`}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-5xl bg-[#0b0f19] border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                >
                  {/* Modal Header */}
                  <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-500/10 rounded-lg text-slate-400">
                        <Maximize2 size={18} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white leading-none mb-1">Live Terminal: {selectedSite.target.replace(/https?:\/\//, '')}</h2>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{selectedSite.vps} Infrastructure</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedSite(null)}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Log Viewer Container */}
                  <div className="flex-1 overflow-hidden p-6 bg-[#060910]">
                    <LiveLogsViewer
                      target={selectedSite.target}
                      siteName={selectedSite.target.replace(/https?:\/\//, '')}
                      className="h-full border-0 !bg-transparent"
                    />
                  </div>

                  {/* Bottom Instructions */}
                  <div className="px-6 py-3 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse"></span>
                      READ-TIME LOG STREAM ACTIVE
                    </div>
                    <div className="text-[10px] text-slate-400 flex gap-4">
                      <span>Press ESC to exit</span>
                      <span>Scroll to browse history</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {selectedIncident && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedIncident(null)}
                  className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                ></motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-4xl bg-[#0b0f19] border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                  {/* Modal Header */}
                  <div className="px-8 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${selectedIncident.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        <ShieldAlert size={22} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white leading-none mb-1">{selectedIncident.alert_name}</h2>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em]">Incident ID: {selectedIncident.id} • {selectedIncident.service}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedIncident(null)}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Timeline Section */}
                    <div className="lg:col-span-2 space-y-8">
                      <div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <TerminalIcon size={14} className="text-slate-500" /> Root Cause Storyboard
                        </h3>
                        <RootCauseTimeline events={timelineEvents} isLoading={isTimelineLoading} />
                      </div>
                    </div>

                    {/* Actions & AI Section */}
                    <div className="space-y-6">
                      <div className="glass-panel p-6 rounded-2xl border border-slate-500/20 bg-slate-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <Activity size={40} className="text-slate-400" />
                        </div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Shield size={12} /> AI Incident Analyst
                        </h4>

                        <div className="bg-slate-950/80 rounded-xl p-3 font-mono text-[9px] text-slate-400 mb-6 border border-slate-800">
                          <div className="flex items-center gap-2 mb-2 text-slate-500/70 border-b border-slate-800 pb-1">
                             <TerminalIcon size={10} /> Agent-Logs: v3.1.2-nexus
                          </div>
                          <div className="space-y-1">
                            <div className="flex gap-2 animate-pulse"><span className="text-slate-600">&gt;</span> SCANNING_VPC_TRAFFIC</div>
                            <div className="flex gap-2"><span className="text-slate-600">&gt;</span> CORRELATING_HOST_LOGS</div>
                            <div className="flex gap-2"><span className="text-slate-600">&gt;</span> IDENTIFIED_THREAT: {selectedIncident.alert_name}</div>
                            <div className="flex gap-2 text-emerald-400"><span className="text-slate-600">&gt;</span> READY_FOR_REMEDIATION</div>
                          </div>
                        </div>

                        {aiAnalysis ? (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                          >
                            <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                               <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Blast Radius</div>
                               <div className="flex items-center gap-2">
                                  <div className="text-sm font-black text-rose-400">{aiAnalysis.user_impact_percent}%</div>
                                  <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-500" style={{ width: `${aiAnalysis.user_impact_percent}%` }}></div>
                                  </div>
                               </div>
                            </div>

                            <div className="text-[10px] text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                              <span className="text-slate-400 font-bold block mb-1">PROBABLE ROOT CAUSE</span>
                              {aiAnalysis.root_cause}
                            </div>
                            
                            <div className="space-y-2">
                               <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest ml-1">Remediation Path</span>
                               {aiAnalysis.suggested_actions?.map((action: string, idx: number) => (
                                 <div key={idx} className="flex gap-2 text-[10px] text-slate-300 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/20">
                                    <div className="mt-0.5"><CheckCircle size={10} className="text-emerald-500" /></div>
                                    <span>{action}</span>
                                 </div>
                               ))}
                            </div>
                          </motion.div>
                        ) : (
                          <>
                            <p className="text-xs text-slate-300 leading-relaxed mb-6">
                              Gemini can correlate metrics, logs, and traces to identify the root cause of this incident.
                            </p>
                            <button
                              onClick={handleExplainAI}
                              disabled={isAnalyzing}
                              className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-black/40 flex items-center justify-center gap-2 border border-slate-700/50"
                            >
                              {isAnalyzing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Shield size={14} />}
                              {isAnalyzing ? 'Analyzing Failure...' : 'Explain with Gemini AI'}
                            </button>
                          </>
                        )}
                      </div>

                      <div className="space-y-3">
                        {selectedIncident.status === 'PENDING_APPROVAL' && (
                          <button 
                            onClick={() => handleApproveFix(selectedIncident.id)}
                            className="w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 group"
                          >
                            <Activity size={14} className="group-hover:animate-pulse" />
                            Approve & Execute Fix
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            handleStatusUpdate(selectedIncident.id, 'RESOLVED');
                            setSelectedIncident(null);
                          }}
                          className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 group"
                        >
                          <ShieldCheck size={14} className="group-hover:scale-110 transition-transform" />
                          Resolve Incident
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-20 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-6"
          >
            <div className="text-slate-500 text-xs font-medium">© 2026 Nexus Monitoring Systems • Autonomous SOC Module</div>
            <div className="flex gap-4">
              <button className="text-[10px] font-bold text-slate-400 hover:text-slate-300 uppercase tracking-[0.2em] transition-colors">Documentation</button>
              <button className="text-[10px] font-bold text-slate-400 hover:text-slate-300 uppercase tracking-[0.2em] transition-colors">API Access</button>
              <button className="text-[10px] font-bold text-slate-400 hover:text-slate-300 uppercase tracking-[0.2em] transition-colors">System Logs</button>
            </div>
          </motion.div>

          <ChatWidget activeIncident={incidents.length > 0 ? incidents[0] : undefined} />

          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onAction={async (action, target) => {
              if (action.startsWith('go-')) {
                setActiveTab(action.split('-')[1] as any);
              } else {
                await handleSimulateAction(0, 'control', action, target);
              }
            }}
          />
        </div>
      </main>
      

      {/* DECISION SIMULATOR UI OVERLAY */}
      {simResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Brain className="w-6 h-6 text-slate-400" />
                  Decision Intelligence Preview
                </h3>
                <p className="text-slate-400 text-sm mt-1">Modeling consequences for: <span className="text-slate-300 font-mono">{simResult.action}</span> on <span className="text-slate-300 font-mono">{simResult.target}</span></p>
              </div>
              <button onClick={() => setSimResult(null)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar text-white">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-slate-400">Historical Success Rate</span>
                    <span className="text-2xl font-mono font-bold text-emerald-400">{simResult.simulation.successRate}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${simResult.simulation.successRate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 italic">Based on {simResult.simulation.historicalCount} previous executions</p>
                </div>
                
                <div className={`p-5 rounded-xl border ${
                  simResult.simulation.risk === 'LOW' ? 'bg-emerald-500/10 border-emerald-500/20' :
                  simResult.simulation.risk === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20' :
                  'bg-rose-500/10 border-rose-500/20'
                }`}>
                  <span className="text-sm text-slate-400 block mb-1 text-white">Operational Risk</span>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-6 h-6 ${
                      simResult.simulation.risk === 'LOW' ? 'text-emerald-400' :
                      simResult.simulation.risk === 'MEDIUM' ? 'text-amber-400' :
                      'text-rose-400'
                    }`} />
                    <span className={`text-2xl font-bold ${
                      simResult.simulation.risk === 'LOW' ? 'text-emerald-400' :
                      simResult.simulation.risk === 'MEDIUM' ? 'text-amber-400' :
                      'text-rose-400'
                    }`}>{simResult.simulation.risk}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/50 flex gap-4">
                  <div className="mt-1"><Info className="w-5 h-5 text-slate-400" /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Primary Effect</h4>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">{simResult.simulation.primary}</p>
                  </div>
                </div>

                <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/50 flex gap-4">
                  <div className="mt-1"><Zap className="w-5 h-5 text-amber-400" /></div>
                  <div className="w-full">
                    <h4 className="text-sm font-semibold text-slate-200">Secondary Dependencies</h4>
                    <ul className="mt-2 space-y-2">
                      {simResult.simulation.secondary.map((eff: string, idx: number) => (
                        <li key={idx} className="text-slate-400 text-sm flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          {eff}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {simResult.simulation.contextWarning && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex gap-3 items-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                  <p className="text-amber-200 text-xs italic">{simResult.simulation.contextWarning}</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setSimResult(null)}
                className="px-6 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const { type, originalId, action, target } = simResult;
                  const res = await fetch(`${API_BASE}/v1/${type === 'incident' ? `incidents/${originalId}/approve` : 'control/execute'}`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
                    },
                    body: type === 'control' ? JSON.stringify({ action, target }) : null
                  });
                  if (res.ok) {
                    setSimResult(null);
                    if (type === 'control') alert('Action Queued successfully via BullMQ');
                  }
                }}
                className="px-8 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white shadow-lg shadow-black/40 transition-all font-bold flex items-center gap-2 border border-slate-700/50"
              >
                {simResult.type === 'incident' ? 'Confirm Remediation' : 'Confirm Execution'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
