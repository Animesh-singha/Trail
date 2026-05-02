'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Shield, Server, Globe, Cpu, Database, 
  Terminal, AlertTriangle, CheckCircle, Clock, 
  RefreshCw, ChevronRight, X, Play, Pause, Copy, Search, Hash, Flame, Zap
} from 'lucide-react';

export default function SREDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [signals, setSignals] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'signals'>('signals');
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

  const fetchSignals = useCallback(async (service: string) => {
    try {
      const response = await fetch(`/api/forensics/signals?service=${encodeURIComponent(service)}`);
      const json = await response.json();
      setSignals(json.signals || []);
    } catch (err) {
      console.error('Signal Engine Error');
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive && selectedService) {
      interval = setInterval(() => {
        if (activeTab === 'logs') fetchLogs(selectedService);
        else fetchSignals(selectedService);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLive, selectedService, activeTab, fetchLogs, fetchSignals]);

  const handleOpenForensics = (service: string) => {
    setSelectedService(service);
    setLogs('⏳ Initializing forensic link...');
    setSignals([]);
    setActiveTab('signals');
    setIsDrawerOpen(true);
    fetchSignals(service);
    fetchLogs(service);
  };

  const renderFormattedLine = (line: string, index: number) => {
    if (!line.trim()) return null;
    let isJson = false;
    let formattedJson = '';
    if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
      try {
        const obj = JSON.parse(line);
        formattedJson = JSON.stringify(obj, null, 2);
        isJson = true;
      } catch (e) {}
    }
    let colorClass = 'text-slate-400';
    if (line.match(/error|fail|critical|fatal|exception/i)) colorClass = 'text-rose-400 font-bold';
    else if (line.match(/warn|alert/i)) colorClass = 'text-amber-400';
    else if (line.match(/success|done|completed|ok/i)) colorClass = 'text-emerald-400';
    else if (line.match(/select|insert|update|delete|query|db/i)) colorClass = 'text-cyan-400 italic';
    const timestampRegex = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}|\d{2}:\d{2}:\d{2})/g;
    return (
      <div key={index} className={`flex gap-4 py-0.5 px-2 hover:bg-slate-800/40 rounded transition-colors ${index % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
        <span className="text-slate-700 w-8 flex-shrink-0 text-right select-none text-[9px] mt-1">{index + 1}</span>
        <div className={`flex-1 break-all ${colorClass}`}>
          {isJson ? (
            <pre className="whitespace-pre-wrap bg-slate-900/50 p-2 rounded border border-slate-800/50 mt-1 text-indigo-300">{formattedJson}</pre>
          ) : (
            line.split(timestampRegex).map((part, i) => (
              timestampRegex.test(part) ? <span key={i} className="text-slate-600 font-bold mr-1">[{part}]</span> : <span key={i}>{part}</span>
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

  const incidents = data?.apps?.filter((a: any) => a.severity !== 'HEALTHY') || [];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-400 font-sans selection:bg-indigo-500/30 overflow-x-hidden p-4 md:p-8">
      
      {/* INCIDENT BAR (PRIORITY LAYER) */}
      {incidents.length > 0 && (
        <div className="max-w-[1600px] mx-auto mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-6 overflow-hidden">
           <div className="flex items-center gap-2 text-rose-500 animate-pulse">
              <Flame className="w-5 h-5" />
              <span className="font-black text-xs uppercase tracking-widest">Active Incidents</span>
           </div>
           <div className="flex-1 flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
              {incidents.map((inc: any) => (
                <div key={inc.name} className="flex-shrink-0 flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-rose-500/20">
                   <div className={`w-2 h-2 rounded-full ${inc.severity === 'CRITICAL' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-amber-500'}`} />
                   <div>
                      <p className="text-white text-[10px] font-bold leading-none mb-1">{inc.name}</p>
                      <p className="text-[9px] text-rose-400 font-mono">{inc.restarts_1h} restarts / hr</p>
                   </div>
                   <button onClick={() => handleOpenForensics(inc.name)} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-500">
                      <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* HEADER */}
      <header className="max-w-[1600px] mx-auto mb-8 grid grid-cols-1 md:grid-cols-5 gap-px bg-slate-800/30 border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 bg-[#0d0d0f] flex flex-col justify-between border-r border-slate-800/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-500" />
            </div>
            <h1 className="text-white font-bold tracking-tight uppercase">ALAGENT <span className="text-indigo-500 text-[10px] ml-1 px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">SRE</span></h1>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Fleet Pulse</p>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${data?.global?.status === 'HEALTHY' ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
              <span className={`text-2xl font-black tracking-tighter ${data?.global?.status === 'HEALTHY' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {data?.global?.status}
              </span>
            </div>
          </div>
        </div>
        {[
          { label: 'P95 Latency', value: `${data?.global?.p95_latency}ms`, icon: Clock, color: 'text-indigo-400' },
          { label: 'Load (Saturation)', value: data?.global?.load_avg, icon: Activity, color: 'text-amber-400' },
          { label: 'Traffic (RPS)', value: data?.global?.rps, icon: Globe, color: 'text-cyan-400' },
          { label: 'Alert Events', value: data?.global?.active_alerts, icon: AlertTriangle, color: data?.global?.active_alerts > 0 ? 'text-rose-400' : 'text-emerald-400' }
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

      <main className="max-w-[1600px] mx-auto space-y-8">
        
        {/* RESOURCE TOPOLOGY */}
        <section className="bg-[#0d0d0f] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/20">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Service Resource Topology</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800/50">
                  <th className="px-6 py-4 font-medium">Service Identity</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">CPU</th>
                  <th className="px-6 py-4 font-medium">Memory</th>
                  <th className="px-6 py-4 font-medium">Restarts (1h)</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 font-mono">
                {data?.apps?.map((app: any) => (
                  <tr key={app.name} className={`hover:bg-white/[0.02] transition-colors group ${app.severity === 'CRITICAL' ? 'bg-rose-500/[0.05]' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-300">{app.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${app.status === 'Running' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-indigo-400">{app.cpu}</td>
                    <td className="px-6 py-4 text-xs text-blue-400">{app.memory}</td>
                    <td className="px-6 py-4">
                       <span className={`text-xs ${app.restarts_1h > 10 ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>{app.restarts_1h}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleOpenForensics(app.name)}
                        className="text-[9px] font-black px-3 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-white transition-all flex items-center gap-1 ml-auto"
                      >
                        <Terminal className="w-3 h-3" /> FORENSICS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECURITY & COMPLIANCE GRID (v7.0 Enhanced) */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-4 h-4 text-slate-500" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Security & SSL Compliance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {data?.websites?.map((site: any) => {
               const days = parseInt(site.ssl_expiry);
               const isCritical = days < 7 || site.ssl_expiry === 'EXPIRED';
               const isWarning = days < 15;
               
               return (
                 <div key={site.domain} className={`bg-[#0d0d0f] p-4 border rounded-xl transition-all group ${isCritical ? 'border-rose-500/50 bg-rose-500/[0.02]' : isWarning ? 'border-amber-500/30' : 'border-slate-800/50 hover:border-indigo-500/30'}`}>
                   <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${site.status === 'Up' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                         <span className="text-xs font-bold text-white truncate max-w-[120px]">{site.domain}</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${isCritical ? 'bg-rose-500/20 border-rose-500/40 text-rose-500' : isWarning ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                        {site.status}
                      </span>
                   </div>
                   <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mb-1">
                      <span>SSL STATUS</span>
                      <span>LATENCY</span>
                   </div>
                   <div className="flex justify-between items-center text-xs font-bold">
                      <span className={isCritical ? 'text-rose-500' : isWarning ? 'text-amber-400' : 'text-emerald-500'}>{site.ssl_expiry}</span>
                      <span className="text-indigo-400">{site.latency}</span>
                   </div>
                 </div>
               );
             })}
          </div>
        </section>
      </main>

      {/* FORENSIC SIDE DRAWER (v7.0 SIGNAL AWARE) */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[750px] bg-[#0d0d0f] border-l border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg"><Terminal className="w-5 h-5 text-indigo-500" /></div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{selectedService}</h3>
                <p className="text-[10px] text-slate-500 font-mono">SIGNAL_AWARE_FORENSICS</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsLive(!isLive)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isLive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />} {isLive ? 'LIVE' : 'STREAM'}
              </button>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex border-b border-slate-800">
             <button onClick={() => setActiveTab('signals')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'signals' ? 'text-indigo-500 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-600 hover:text-slate-400'}`}>
                Semantic Signals
             </button>
             <button onClick={() => setActiveTab('logs')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'text-indigo-500 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-600 hover:text-slate-400'}`}>
                Raw Forensics
             </button>
          </div>

          <div className="flex-1 overflow-hidden p-4">
            {activeTab === 'signals' ? (
              <div className="h-full overflow-y-auto space-y-4">
                 {signals.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-600">
                      <Zap className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-[10px] uppercase tracking-widest">No critical signals detected in scan</p>
                   </div>
                 ) : (
                   signals.map((sig, i) => (
                     <div key={i} className={`p-4 rounded-xl border ${sig.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-800/40 border-slate-800/60'}`}>
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2">
                              <AlertTriangle className={`w-4 h-4 ${sig.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'}`} />
                              <h4 className="text-xs font-bold text-white">{sig.name}</h4>
                           </div>
                           <span className="text-[10px] font-black px-2 py-0.5 rounded bg-black/40 text-slate-400">{sig.count} Hits</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mb-3 bg-black/20 p-2 rounded truncate">{sig.example}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase">
                           <Zap className="w-3 h-3" /> Root Cause identified
                        </div>
                     </div>
                   ))
                 )}
              </div>
            ) : (
              <div className="h-full w-full bg-[#050506] border border-slate-800/50 rounded-xl overflow-y-auto p-4 font-mono text-[11px] leading-relaxed">
                {logs.split('\n').map((line, i) => renderFormattedLine(line, i))}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-12 pt-8 border-t border-slate-800/50 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-600 font-medium">SRE SIGNAL COMMAND :: v7.0.0</p>
      </footer>
    </div>
  );
}
