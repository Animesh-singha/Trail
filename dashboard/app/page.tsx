'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Globe, Boxes, ShieldCheck, AlertCircle } from 'lucide-react';

export default function SimpleDashboard() {
  const [data, setData] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono text-slate-500 uppercase tracking-widest animate-pulse">
      Initialising Real-Time Telemetry...
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
            <Server size={14} /> VPS Infrastructure
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data?.servers?.map((s: any, i: number) => (
              <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-bold text-white">{s.hostname}</span>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Online</span>
                </div>
                <div className="space-y-4">
                  <MetricLine label="CPU LOAD" value={`${s.cpu_load}%`} progress={s.cpu_load} />
                  <MetricLine label="RAM USAGE" value={`${s.ram_used}%`} progress={s.ram_used} />
                  <MetricLine label="DISK SPACE" value={`${s.disk_used}%`} progress={s.disk_used} />
                </div>
              </div>
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
                    <th className="px-4 py-3">NAME</th>
                    <th className="px-4 py-3">CPU / MEM</th>
                    <th className="px-4 py-3 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Docker Section */}
                  {data?.containers?.map((c: any, i: number) => (
                    <tr key={`c-${i}`} className="border-b border-slate-800/30 hover:bg-slate-800/20">
                      <td className="px-4 py-3 font-medium text-slate-300">{c.name.replace(/^\//, '')} <span className="text-[10px] opacity-30 ml-2">DOCKER</span></td>
                      <td className="px-4 py-3 text-slate-500">N/A / {c.memory}</td>
                      <td className="px-4 py-3 text-right"><span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded uppercase">Running</span></td>
                    </tr>
                  ))}
                  {/* PM2 Section */}
                  {data?.apps?.map((a: any, i: number) => (
                    <tr key={`a-${i}`} className="border-b border-slate-800/30 hover:bg-slate-800/20">
                      <td className="px-4 py-3 font-medium text-indigo-100">{a.name} <span className="text-[10px] opacity-30 ml-2">PM2</span></td>
                      <td className="px-4 py-3 text-slate-500">{a.cpu} / {a.memory}</td>
                      <td className="px-4 py-3 text-right"><span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded uppercase">Active</span></td>
                    </tr>
                  ))}
                  {(!data?.apps?.length && !data?.containers?.length) && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-600 italic">No services discovered yet...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Web Assets */}
          <section>
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Globe size={14} /> Web Assets (Live Monitoring)
            </h2>
            <div className="space-y-4">
              {data?.websites?.map((w: any, i: number) => (
                <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${w.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                    <span className="text-sm font-bold text-white">{w.target}</span>
                  </div>
                  <div className="flex gap-6 items-center">
                    <div className="text-right">
                      <div className="text-[8px] text-slate-500 uppercase font-black">LATENCY</div>
                      <div className="text-xs font-mono text-indigo-400">{w.latency}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] text-slate-500 uppercase font-black">SSL EXPIRE</div>
                      <div className="text-xs font-mono text-slate-300">{w.ssl_days} Days</div>
                    </div>
                  </div>
                </div>
              ))}
              {!data?.websites?.length && (
                <div className="text-center py-8 text-slate-600 italic">No websites found...</div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto p-6 text-center text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] border-t border-slate-900 mt-12">
        Nexus SOC System v2.0 • Real-Time Infrastructure Intelligence
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
    <div className={`px-4 py-1.5 rounded-xl border flex items-center gap-2 ${colors[color]}`}>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
      <span className="text-sm font-black">{value}</span>
    </div>
  );
}

function MetricLine({ label, value, progress }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
        <span>{label}</span>
        <span className="text-slate-300">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)] transition-all duration-500" 
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        ></div>
      </div>
    </div>
  );
}
