'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Shield, Server, Globe, Cpu, Database, 
  Terminal, AlertTriangle, CheckCircle, Clock, 
  RefreshCw, ChevronRight, X, Play, Pause, Copy, Search, Hash, Flame, Zap, Wrench, Siren
} from 'lucide-react';

export default function SREWarRoom() {
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
      const text = await response.text();
      setLogs(text || '📡 Stream established. Waiting for data...');
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
    setIsDrawerOpen(true);
    fetchSignals(service);
    fetchLogs(service);
  };

  const renderFormattedLine = (line: string, index: number) => {
    if (!line.trim()) return null;
    let colorClass = 'text-slate-400';
    if (line.match(/error|fail|critical|fatal|exception/i)) colorClass = 'text-rose-400 font-bold';
    else if (line.match(/warn|alert/i)) colorClass = 'text-amber-400';
    else if (line.match(/success|done|completed|ok/i)) colorClass = 'text-emerald-400';
    return (
      <div key={index} className={`flex gap-4 py-0.5 px-2 hover:bg-slate-800/40 rounded transition-colors ${index % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
        <span className="text-slate-700 w-8 flex-shrink-0 text-right select-none text-[9px] mt-1">{index + 1}</span>
        <div className={`flex-1 break-all ${colorClass}`}>{line}</div>
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-indigo-400 font-mono text-sm tracking-widest animate-pulse">BOOTING WAR ROOM...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050507] text-slate-400 font-sans selection:bg-indigo-500/30 overflow-x-hidden p-4 md:p-8">
      
      {/* 🟥 INCIDENT COMMAND CENTER (v8.0 Decision Layer) */}
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Siren className="w-5 h-5 text-rose-500" />
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Incident Command Center</h2>
        </div>
        
        {data?.incidents?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.incidents.map((inc: any, i: number) => (
              <div key={i} className="bg-[#0d0d0f] border-l-4 border-rose-500 p-6 rounded-r-2xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Flame className="w-12 h-12 text-rose-500" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-black bg-rose-500/20 text-rose-500 px-2 py-0.5 rounded uppercase tracking-widest">Active {inc.severity}</span>
                  <span className="text-xs font-bold text-white uppercase">{inc.service}</span>
                </div>
                <h3 className="text-lg font-black text-rose-400 mb-2 leading-tight">{inc.issue}</h3>
                <div className="bg-black/40 p-3 rounded-xl border border-rose-500/10 mb-4">
                  <div className="flex items-start gap-2 text-indigo-400">
                    <Wrench className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Recommended Fix</p>
                      <p className="text-xs leading-relaxed">{inc.fix}</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenForensics(inc.service)}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Terminal className="w-4 h-4" /> INITIATE FORENSIC SCAN
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#0d0d0f] border border-emerald-500/20 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-4 opacity-50" />
            <h3 className="text-xl font-black text-white tracking-tight">System Operational</h3>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-mono">No critical incidents detected in the last 10 minutes</p>
          </div>
        )}
      </div>

      {/* 🟧 TRUTH METRICS (v8.0 SLO Layer) */}
      <header className="max-w-[1600px] mx-auto mb-10 grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'P95 Latency (SLO)', value: `${data?.global?.p95_latency}ms`, icon: Clock, color: 'text-indigo-500' },
          { label: 'Error Rate', value: `${data?.global?.error_rate}%`, icon: AlertTriangle, color: parseFloat(data?.global?.error_rate) > 0 ? 'text-rose-500' : 'text-emerald-500' },
          { label: 'Traffic (RPS)', value: data?.global?.rps, icon: Globe, color: 'text-cyan-400' },
          { label: 'System Load', value: data?.global?.load_avg, icon: Activity, color: 'text-amber-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-[#0d0d0f] p-6 border border-slate-800/50 rounded-2xl shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{stat.label}</p>
              <stat.icon className={`w-5 h-5 ${stat.color} opacity-30`} />
            </div>
            <p className="text-3xl font-black tracking-tighter text-white">{stat.value}</p>
          </div>
        ))}
      </header>

      {/* 🟨 SERVICE TOPOLOGY (Ranked by Severity) */}
      <main className="max-w-[1600px] mx-auto space-y-10">
        <section className="bg-[#0d0d0f] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Service Health Topology</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-600 border-b border-slate-800/50">
                  <th className="px-6 py-4 font-black">Identity</th>
                  <th className="px-6 py-4 font-black">State</th>
                  <th className="px-6 py-4 font-black">Spikes (10m)</th>
                  <th className="px-6 py-4 font-black">CPU / RAM</th>
                  <th className="px-6 py-4 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {data?.apps?.map((app: any) => (
                  <tr key={app.name} className={`hover:bg-white/[0.02] transition-colors group ${app.severity === 'CRITICAL' ? 'bg-rose-500/[0.05]' : ''}`}>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${app.severity === 'CRITICAL' ? 'bg-rose-500 animate-ping' : app.severity === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <span className="text-xs font-bold text-slate-300">{app.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${app.severity === 'CRITICAL' ? 'border-rose-500/50 text-rose-500' : 'border-emerald-500/30 text-emerald-500'}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-mono ${app.restarts_10m > 0 ? 'text-rose-500 font-bold' : 'text-slate-600'}`}>+{app.restarts_10m} restarts</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">
                      <span className="text-indigo-400">{app.cpu}</span> / <span className="text-blue-400">{app.memory}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleOpenForensics(app.name)} className="text-[9px] font-black px-4 py-1.5 rounded bg-slate-800 hover:bg-indigo-600 text-white transition-all">
                        DIAGNOSE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 🟦 COMPLIANCE & SSL (Signal Aware) */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-slate-600" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Security & Compliance Grid</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data?.websites?.map((site: any) => {
              const isCrit = parseInt(site.ssl_expiry) < 7;
              return (
                <div key={site.domain} className={`bg-[#0d0d0f] p-5 border rounded-2xl transition-all ${isCrit ? 'border-rose-500/50' : 'border-slate-800/50'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-black text-white truncate max-w-[150px]">{site.domain}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCrit ? 'bg-rose-500 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>{site.status}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-slate-600 uppercase">SSL EXPIRY</span>
                      <span className={isCrit ? 'text-rose-500' : 'text-indigo-400'}>{site.ssl_expiry}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-slate-600 uppercase">LATENCY</span>
                      <span className="text-cyan-400">{site.latency}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* DIAGNOSTIC DRAWER (v8.0 Signal Intelligence) */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[800px] bg-[#0d0d0f] border-l border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="px-8 py-6 border-b border-slate-800 bg-[#121214] flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-500/10 rounded-xl"><Terminal className="w-6 h-6 text-indigo-500" /></div>
               <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">{selectedService}</h3>
                  <p className="text-[10px] text-slate-500 font-mono tracking-widest">DIAGNOSTIC_MODE_v8.0</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsLive(!isLive)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${isLive ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />} {isLive ? 'LIVE STREAM' : 'PAUSED'}
              </button>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
          </div>

          <div className="flex bg-[#121214] border-b border-slate-800">
             <button onClick={() => setActiveTab('signals')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'signals' ? 'text-indigo-500 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-600'}`}>Semantic Signals</button>
             <button onClick={() => setActiveTab('logs')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'logs' ? 'text-indigo-500 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-600'}`}>Raw Forensic Scan</button>
          </div>

          <div className="flex-1 overflow-hidden p-8">
            {activeTab === 'signals' ? (
              <div className="h-full space-y-6 overflow-y-auto">
                 {signals.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center">
                      <Zap className="w-16 h-16 text-slate-800 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Scanning for signal clusters...</p>
                   </div>
                 ) : (
                   signals.map((sig, i) => (
                     <div key={i} className={`p-6 rounded-2xl border ${sig.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-900 border-slate-800'}`}>
                        <div className="flex justify-between items-center mb-4">
                           <div className="flex items-center gap-3">
                              <AlertTriangle className={`w-5 h-5 ${sig.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'}`} />
                              <h4 className="text-sm font-black text-white">{sig.name}</h4>
                           </div>
                           <span className="text-[10px] font-black px-2 py-1 rounded bg-black/50 text-slate-500">{sig.count} EVENTS</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono bg-black/30 p-4 rounded-xl border border-white/[0.02] truncate mb-4">{sig.example}</p>
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest"><Zap className="w-4 h-4" /> Root cause signature confirmed</div>
                     </div>
                   ))
                 )}
              </div>
            ) : (
              <div className="h-full bg-black/50 border border-slate-800 rounded-2xl overflow-y-auto p-6 font-mono text-[11px] leading-loose">
                {logs.split('\n').map((line, i) => renderFormattedLine(line, i))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
