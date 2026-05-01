'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Globe, Boxes, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function SimpleDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error('Failed to fetch real-time metrics');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="text-indigo-500 animate-spin" size={40} />
      <div className="font-black text-slate-500 uppercase tracking-[0.3em] text-[10px]">
        Synchronizing Infrastructure Telemetry...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* 1. Header & Global Status */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <ShieldCheck className="text-indigo-400" size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">NEXUS <span className="text-indigo-400">SOC</span></h1>
          </div>
          <div className="flex gap-6">
            <StatusPill label="Servers" value={data?.servers?.length || 0} color="indigo" />
            <StatusPill label="Websites" value={data?.websites?.length || 0} color="emerald" />
            <StatusPill label="Apps" value={data?.apps?.length || 0} color="blue" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* 2. Infrastructure Overview */}
        <section>
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Server size={14} /> VPS Infrastructure Intelligence
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {data?.servers?.map((s: any, i: number) => (
              <>
                <div key={`server-${i}`} className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-sm font-bold text-white uppercase tracking-tight">{s.hostname}</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[10px] font-black text-emerald-400 uppercase">Live</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <MetricLine label="CPU" value={`${s.cpu_load}%`} progress={s.cpu_load} />
                    <MetricLine label="RAM" value={`${s.ram_used}%`} progress={s.ram_used} />
                    <MetricLine label="DISK" value={`${s.disk_used}%`} progress={s.disk_used} />
                  </div>
                </div>
                <div key={`net-${i}`} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-center">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Network In</div>
                  <div className="text-2xl font-black text-indigo-400">1.2<span className="text-xs ml-1 opacity-50 uppercase">mb/s</span></div>
                  <div className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Network Out</div>
                  <div className="text-2xl font-black text-blue-400">0.8<span className="text-xs ml-1 opacity-50 uppercase">mb/s</span></div>
                </div>
                <div key={`status-${i}`} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-center text-center">
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fleet Status</div>
                   <div className="text-lg font-black text-emerald-400 uppercase">Optimized</div>
                   <div className="w-full bg-slate-800 h-1 rounded-full mt-4 overflow-hidden">
                      <div className="h-full w-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                   </div>
                </div>
              </>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 3. Process Monitor (PM2 & Docker) */}
          <section>
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Boxes size={14} /> Service Discovery (PM2 & Docker)
            </h2>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-500 font-bold border-b border-slate-800">
                    <th className="px-4 py-3 uppercase tracking-tighter">Identity</th>
                    <th className="px-4 py-3 uppercase tracking-tighter">Load Metrics</th>
                    <th className="px-4 py-3 text-right uppercase tracking-tighter">Node Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* PM2 Section */}
                  {data?.apps?.map((a: any, i: number) => (
                    <tr key={`a-${i}`} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-indigo-100 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        {a.name} <span className="text-[10px] font-black opacity-30 ml-2 tracking-tighter">PM2</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{a.cpu} / {a.memory}</td>
                      <td className="px-4 py-3 text-right"><span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">Active</span></td>
                    </tr>
                  ))}
                  {/* Docker Section */}
                  {data?.containers?.map((c: any, i: number) => (
                    <tr key={`c-${i}`} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-300 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        {c.name.replace(/^\//, '')} <span className="text-[10px] font-black opacity-30 ml-2 tracking-tighter">DOCKER</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">ROOT / {c.memory}</td>
                      <td className="px-4 py-3 text-right"><span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase">Running</span></td>
                    </tr>
                  ))}
                  {(!data?.apps?.length && !data?.containers?.length) && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-600 italic uppercase font-black text-[10px] tracking-widest">Scanning VPS for running services...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Web Assets */}
          <section>
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Globe size={14} /> Web Assets (Global Fleet)
            </h2>
            <div className="space-y-3">
              {data?.websites?.map((w: any, i: number) => (
                <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors cursor-default">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${w.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
                    <span className="text-sm font-bold text-white tracking-tight">{w.target}</span>
                  </div>
                  <div className="flex gap-8 items-center">
                    <div className="text-right">
                      <div className="text-[8px] text-slate-500 uppercase font-black mb-0.5">Latency</div>
                      <div className="text-xs font-black text-indigo-400 font-mono tracking-tighter">{w.latency}</div>
                    </div>
                    <div className="text-right w-16">
                      <div className="text-[8px] text-slate-500 uppercase font-black mb-0.5">SSL</div>
                      <div className={`text-xs font-black font-mono tracking-tighter ${w.ssl_days < 10 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {w.ssl_days}D
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!data?.websites?.length && (
                <div className="text-center py-8 text-slate-600 italic uppercase font-black text-[10px] tracking-widest">No assets registered in discovery...</div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto p-6 text-center text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] border-t border-slate-900 mt-12 mb-8">
        YoForex Neural SOC • Infrastructure Intelligence System v2.1
      </footer>
    </div>
  );
}

function StatusPill({ label, value, color }: any) {
  const colors: any = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
  };
  return (
    <div className={`px-4 py-1.5 rounded-xl border flex items-center gap-3 ${colors[color]}`}>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{label}</span>
      <span className="text-sm font-black tracking-tighter">{value}</span>
    </div>
  );
}

function MetricLine({ label, value, progress }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">
        <span>{label}</span>
        <span className="text-slate-300">{value}</span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] transition-all duration-700 ease-out" 
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        ></div>
      </div>
    </div>
  );
}
