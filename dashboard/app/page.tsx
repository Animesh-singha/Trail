'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Shield, Server, Globe, Cpu, Database, 
  Terminal, AlertTriangle, CheckCircle, Clock, 
  RefreshCw, ChevronRight, X, Play, Pause, Copy, Search, Hash
} from 'lucide-react';

export default function SREDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/metrics');
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error('Failed to sync with command center');
    }
  };

  const fetchLogs = useCallback(async (service: string) => {
    try {
      const response = await fetch(`/api/forensics?service=${encodeURIComponent(service)}&t=${Date.now()}`);
      if (!response.ok) {
        const errorData = await response.json();
        setLogs(`❌ ERROR: ${errorData.error || 'Connection Severed'}`);
      } else {
        const text = await response.text();
        setLogs(text || '📡 Stream established. Waiting for data...');
      }
    } catch (err) {
      setLogs('❌ CRITICAL: Forensic link failed');
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, []);

  // Live Stream Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive && selectedService) {
      interval = setInterval(() => fetchLogs(selectedService), 3000);
    }
    return () => clearInterval(interval);
  }, [isLive, selectedService, fetchLogs]);

  const handleOpenLogs = (service: string) => {
    setSelectedService(service);
    setLogs('⏳ Initializing forensic link...');
    setIsDrawerOpen(true);
    fetchLogs(service);
  };

  // SMART LOG FORMATTER
  const renderFormattedLine = (line: string, index: number) => {
    if (!line.trim()) return null;

    // 1. Check for JSON
    let isJson = false;
    let formattedJson = '';
    if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
      try {
        const obj = JSON.parse(line);
        formattedJson = JSON.stringify(obj, null, 2);
        isJson = true;
      } catch (e) {}
    }

    // 2. Identify Semantic Level
    let colorClass = 'text-slate-400';
    let icon = null;

    if (line.match(/error|fail|critical|fatal|exception/i)) {
      colorClass = 'text-rose-400 font-bold';
    } else if (line.match(/warn|alert/i)) {
      colorClass = 'text-amber-400';
    } else if (line.match(/success|done|completed|ok/i)) {
      colorClass = 'text-emerald-400';
    } else if (line.match(/select|insert|update|delete|query|db/i)) {
      colorClass = 'text-cyan-400 italic';
    }

    // 3. Highlight Timestamps (Regex for common formats)
    const timestampRegex = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}|\d{2}:\d{2}:\d{2})/g;
    const parts = line.split(timestampRegex);

    return (
      <div key={index} className={`flex gap-4 py-0.5 px-2 hover:bg-slate-800/40 rounded transition-colors ${index % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
        <span className="text-slate-700 w-8 flex-shrink-0 text-right select-none text-[9px] mt-1">{index + 1}</span>
        <div className={`flex-1 break-all ${colorClass}`}>
          {isJson ? (
            <pre className="whitespace-pre-wrap bg-slate-900/50 p-2 rounded border border-slate-800/50 mt-1 text-indigo-300">
              {formattedJson}
            </pre>
          ) : (
            line.split(timestampRegex).map((part, i) => (
              timestampRegex.test(part) ? (
                <span key={i} className="text-slate-600 font-bold mr-1">[{part}]</span>
              ) : (
                <span key={i}>{part}</span>
              )
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-indigo-400 font-mono text-sm tracking-widest animate-pulse">SYNCING WITH NEXUS HUB...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-400 font-sans selection:bg-indigo-500/30 overflow-x-hidden p-4 md:p-8">
      
      {/* HEADER */}
      <header className="max-w-[1600px] mx-auto mb-8 grid grid-cols-1 md:grid-cols-5 gap-px bg-slate-800/30 border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/5">
        <div className="p-6 bg-[#0d0d0f] flex flex-col justify-between border-r border-slate-800/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-500" />
            </div>
            <h1 className="text-white font-bold tracking-tight">ALAGENT <span className="text-indigo-500 text-xs ml-1 px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">SOC</span></h1>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">System Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${data?.global?.status === 'HEALTHY' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className={`text-xl font-black tracking-tighter ${data?.global?.status === 'HEALTHY' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {data?.global?.status}
              </span>
            </div>
          </div>
        </div>

        {[
          { label: 'P95 Latency', value: `${data?.global?.p95_latency}ms`, icon: Clock, color: 'text-indigo-400' },
          { label: 'Load (1m)', value: data?.global?.load_avg, icon: Activity, color: 'text-amber-400' },
          { label: 'Traffic (RPS)', value: data?.global?.rps, icon: Globe, color: 'text-cyan-400' },
          { label: 'Error Rate', value: `${data?.global?.error_rate}%`, icon: AlertTriangle, color: data?.global?.error_rate > 1 ? 'text-rose-400' : 'text-emerald-400' }
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-[#0d0d0f] flex flex-col justify-between border-r border-slate-800/50 last:border-0">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <stat.icon className={`w-4 h-4 ${stat.color} opacity-50`} />
            </div>
            <p className={`text-2xl font-black tracking-tighter text-white`}>{stat.value}</p>
          </div>
        ))}
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* FLEET TOPOLOGY */}
        <div className="lg:col-span-12 space-y-8">
          <section className="bg-[#0d0d0f] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">SRE Service Resource Topology</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800/50">
                    <th className="px-6 py-4 font-medium">Service Identity</th>
                    <th className="px-6 py-4 font-medium">CPU</th>
                    <th className="px-6 py-4 font-medium">RAM</th>
                    <th className="px-6 py-4 font-medium">Restarts</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30 font-mono">
                  {data?.apps?.map((app: any) => (
                    <tr key={app.name} className="hover:bg-indigo-500/[0.03] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${app.status === 'Running' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="text-xs font-bold text-slate-300">{app.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-indigo-400">{app.cpu}</td>
                      <td className="px-6 py-4 text-xs text-blue-400">{app.memory}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{app.restarts}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleOpenLogs(app.name)}
                          className="text-[9px] font-black px-3 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-white transition-all flex items-center gap-1 ml-auto"
                        >
                          <Terminal className="w-3 h-3" /> LOGS
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* COMPLIANCE GRID */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {data?.websites?.map((site: any) => (
               <div key={site.domain} className="bg-[#0d0d0f] p-4 border border-slate-800/50 rounded-xl hover:border-indigo-500/30 transition-all group">
                 <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${site.status === 'Up' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                       <span className="text-xs font-bold text-white truncate max-w-[120px]">{site.domain}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${site.ssl_status === 'HEALTHY' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                      {site.ssl_expiry}
                    </span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>SSL EXPIRY</span>
                    <span>LATENCY</span>
                 </div>
                 <div className="flex justify-between items-center text-xs font-bold mt-1">
                    <span className={site.ssl_status === 'HEALTHY' ? 'text-emerald-500' : 'text-rose-500'}>{site.ssl_expiry}</span>
                    <span className="text-indigo-400">{site.latency}</span>
                 </div>
               </div>
             ))}
          </section>
        </div>
      </main>

      {/* FORENSIC SIDE DRAWER */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[700px] bg-[#0d0d0f] border-l border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* DRAWER HEADER */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Terminal className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{selectedService}</h3>
                <p className="text-[10px] text-slate-500 font-mono">INTELLIGENT_FORENSIC_PARSER_ACTIVE</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isLive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}
              >
                {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isLive ? 'LIVE' : 'STREAM'}
              </button>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* LOG VIEWER */}
          <div className="flex-1 overflow-hidden p-4 relative group">
            <div className="absolute top-8 right-8 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                onClick={() => {
                  navigator.clipboard.writeText(logs);
                  alert('Logs copied to clipboard');
                }}
                className="p-2 bg-slate-800/80 hover:bg-indigo-600 rounded-lg text-white backdrop-blur-sm"
               >
                 <Copy className="w-4 h-4" />
               </button>
            </div>
            <div className="h-full w-full bg-[#050506] border border-slate-800/50 rounded-xl overflow-y-auto p-4 font-mono text-[11px] leading-relaxed shadow-inner scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <div className="space-y-0.5">
                {logs.split('\n').map((line, i) => renderFormattedLine(line, i))}
              </div>
            </div>
          </div>

          {/* DRAWER FOOTER */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/30 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
                 Lines: {logs.split('\n').length}
               </p>
               <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
                 Sync: {new Date().toLocaleTimeString()}
               </p>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-indigo-500/50 font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              SEMANTIC_PARSER_V2
            </div>
          </div>
        </div>
      </div>

      {/* OVERLAY */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <footer className="mt-12 pt-8 border-t border-slate-800/50 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-600 font-medium">
          YOFOREX SRE INTELLIGENCE :: v6.2.3
        </p>
      </footer>

    </div>
  );
}
