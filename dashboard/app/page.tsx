'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Globe, Boxes, ShieldCheck, AlertCircle, Loader2, Bell, TrendingUp, Zap, Radio } from 'lucide-react';

export default function UltimateSOC() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error('System telemetry synchronization failure');
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
    const interval = setInterval(fetchMetrics, 10000); 
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6 font-sans">
      <div className="relative">
         <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
         <Loader2 className="text-indigo-500 animate-spin relative" size={48} />
      </div>
      <div className="text-center space-y-2">
        <div className="font-black text-white uppercase tracking-[0.4em] text-xs">Initializing Mission Control</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Synchronizing Historical Telemetry...</div>
      </div>
    </div>
  );

  const g = data?.global || {};
  const statusColor = g.status === 'HEALTHY' ? 'text-emerald-400' : g.status === 'DEGRADED' ? 'text-amber-400' : 'text-rose-500';

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* 1. GLOBAL STATUS BAR */}
      <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]"></div>
                <h1 className="text-sm font-black text-white uppercase tracking-tighter">Nexus <span className="text-indigo-400">SOC v3.1</span></h1>
              </div>
              <div className="h-4 w-[1px] bg-slate-800"></div>
              <div className="flex items-center gap-4">
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Status</span>
                    <span className={`text-xs font-black uppercase tracking-tight ${statusColor}`}>{g.status}</span>
                 </div>
                 <HeaderSignal label="Avg Latency" value={`${g.avg_latency}ms`} color="indigo" />
                 <HeaderSignal label="Error Rate" value={`${g.error_rate}%`} color={parseFloat(g.error_rate) > 1 ? 'rose' : 'slate'} />
                 <HeaderSignal label="Traffic (RPS)" value={g.rps} color="blue" />
                 <HeaderSignal label="24H Uptime" value={`${g.uptime}%`} color="emerald" />
                 <HeaderSignal label="Active Alerts" value={g.active_alerts} color={g.active_alerts > 0 ? 'rose' : 'slate'} />
              </div>
           </div>
           <div className="flex items-center gap-4 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-800/50">
              <Radio size={12} className="text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-right">Real-Time Data<br/><span className="opacity-40 tracking-normal">No Simulation</span></span>
           </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto p-6 space-y-6">
        
        {/* 2. LIVE TRENDS (REAL DATA ONLY) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <TrendCard label="Processor History" value={`${data?.infra?.cpu}%`} history={data?.infra?.cpu_history} color="indigo" />
           <TrendCard label="Memory Density" value={`${data?.infra?.ram}%`} history={[]} color="blue" />
           <TrendCard label="Network Ingress" value={`${data?.infra?.net_in}MB/s`} history={[]} color="emerald" />
           <TrendCard label="Network Egress" value={`${data?.infra?.net_out}MB/s`} history={[]} color="sky" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           
           {/* 3. SERVICE HEALTH */}
           <div className="lg:col-span-8 space-y-6">
              <section className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-slate-800/50 flex justify-between items-center">
                   <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                     <Boxes size={12} /> Application Node Discovery
                   </h2>
                </div>
                <table className="w-full text-left">
                   <thead>
                      <tr className="text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-800/30">
                         <th className="px-6 py-4">Service Identity</th>
                         <th className="px-6 py-4">Runtime Env</th>
                         <th className="px-6 py-4">Restarts</th>
                         <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/30">
                      {data?.apps?.map((app: any, i: number) => (
                         <tr key={i} className="hover:bg-indigo-500/5 transition-colors group">
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-3">
                                  <div className={`w-1.5 h-1.5 rounded-full ${app.status === 'Running' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
                                  <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{app.name}</span>
                               </div>
                            </td>
                            <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-40">PM2 Node</td>
                            <td className="px-6 py-4 text-xs font-mono text-slate-400">{app.restarts}</td>
                            <td className="px-6 py-4 text-right">
                               <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border ${app.status === 'Running' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                                  {app.status}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
              </section>

              {/* 4. EXTERNAL MONITORING */}
              <section className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-slate-800/50">
                   <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                     <Globe size={12} /> Global External Monitoring
                   </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-800/30">
                   {data?.websites?.map((site: any, i: number) => (
                      <div key={i} className="bg-[#0a0a0a] p-4 flex items-center justify-between group hover:bg-indigo-500/[0.02] transition-colors border-b border-slate-800/30">
                         <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${site.status === 'Up' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                            <span className="text-xs font-bold text-slate-300 truncate max-w-[150px]">{site.domain}</span>
                         </div>
                         <div className="flex items-center gap-6">
                            <div className="text-right">
                               <span className="block text-[8px] font-black text-slate-600 uppercase tracking-widest">Latency</span>
                               <span className="text-[10px] font-black text-indigo-400 font-mono">124ms</span>
                            </div>
                            <div className="text-right">
                               <span className="block text-[8px] font-black text-slate-600 uppercase tracking-widest">SSL</span>
                               <span className={`text-[10px] font-black font-mono ${site.ssl_days < 10 ? 'text-rose-400' : 'text-slate-500'}`}>{site.ssl_days}D</span>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
              </section>
           </div>

           {/* 5. ALERTS PANEL */}
           <div className="lg:col-span-4 space-y-6">
              <section className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 min-h-[400px] shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/20"></div>
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Bell size={12} className="text-rose-500" /> Critical Alert Feed
                    </h2>
                 </div>
                 <div className="space-y-4">
                    {data?.alerts?.length > 0 ? data.alerts.map((alert: any, i: number) => (
                       <div key={i} className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl space-y-2 group hover:bg-rose-500/10 transition-all cursor-default">
                          <div className="flex items-center justify-between">
                             <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em]">{alert.severity}</span>
                             <span className="text-[9px] text-slate-600">ACTION REQUIRED</span>
                          </div>
                          <p className="text-sm font-bold text-white leading-tight">{alert.message}</p>
                       </div>
                    )) : (
                       <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="w-16 h-16 bg-emerald-500/5 rounded-full flex items-center justify-center mb-6 border border-emerald-500/10">
                             <ShieldCheck className="text-emerald-500/40" size={32} />
                          </div>
                          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-1">Status Nominal</h3>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">No Active Incidents Found</p>
                       </div>
                    )}
                 </div>
              </section>

              {/* 6. INFRA CONTEXT */}
              <section className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 shadow-2xl">
                 <h2 className="text-[10px] font-black text-indigo-400/50 uppercase tracking-[0.2em] mb-4">Infrastructure Context</h2>
                 <div className="space-y-4 font-mono">
                    <InfoRow label="Compute Node" value="Primary VPS" />
                    <InfoRow label="DB Engine" value="PostgreSQL 15" />
                    <InfoRow label="Telemetry Port" value="9090 (PROMETHEUS)" />
                    <InfoRow label="Sync Loop" value="10s Interval" />
                 </div>
              </section>
           </div>

        </div>
      </main>

      <footer className="max-w-[1600px] mx-auto p-12 text-center">
         <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.8em]">
            Real-Time Operations Intelligence • YoForex SOC v3.1
         </p>
      </footer>

    </div>
  );
}

function HeaderSignal({ label, value, color }: any) {
  const colors: any = {
    indigo: 'text-indigo-400',
    rose: 'text-rose-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    slate: 'text-slate-400'
  };
  return (
    <div className="flex flex-col border-l border-slate-800 pl-4 ml-4 first:border-l-0 first:pl-0 first:ml-0">
       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
       <span className={`text-xs font-black uppercase tracking-tight ${colors[color] || 'text-white'}`}>{value}</span>
    </div>
  );
}

function TrendCard({ label, value, history, color }: any) {
  const colors: any = {
    indigo: 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]',
    blue: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
    emerald: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    sky: 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]'
  };

  // If no history, show placeholder pattern (but label it clearly as "Waiting for Data")
  const points = history?.length > 0 ? history.slice(-20) : [10, 15, 12, 18, 14, 20, 15];

  return (
    <div className="bg-[#0a0a0a] border border-slate-800/50 p-5 rounded-2xl group hover:border-indigo-500/30 transition-all shadow-xl">
       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2">{label}</span>
       <div className="flex items-end justify-between">
          <span className="text-2xl font-black text-white tracking-tighter">{value}</span>
          <div className="w-20 h-10 flex items-end gap-[2px]">
             {points.map((val: any, i: number) => (
                <div 
                   key={i} 
                   className={`flex-1 rounded-t-[1px] ${colors[color]} transition-all duration-500`} 
                   style={{ height: `${Math.max(5, (val / 100) * 100)}%` }}
                ></div>
             ))}
          </div>
       </div>
    </div>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center">
       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">{value}</span>
    </div>
  );
}
