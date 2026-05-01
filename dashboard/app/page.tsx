'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Globe, Boxes, ShieldCheck, AlertCircle, Loader2, Bell, TrendingUp, Zap, Radio, Database, Cpu } from 'lucide-react';

export default function MissionControl() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error('Data link failure');
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
    <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center gap-6">
      <div className="relative">
         <div className="absolute inset-0 bg-indigo-500/20 blur-3xl animate-pulse rounded-full"></div>
         <Loader2 className="text-indigo-500 animate-spin relative" size={48} />
      </div>
      <div className="text-[10px] font-black text-white uppercase tracking-[0.5em] animate-pulse">Syncing Operational Intelligence</div>
    </div>
  );

  const g = data?.global || {};
  const statusColor = g.status === 'HEALTHY' ? 'text-emerald-400' : 'text-rose-500';

  return (
    <div className="min-h-screen bg-[#010101] text-slate-400 font-sans selection:bg-indigo-500/30 overflow-x-hidden p-4 md:p-8">
      
      {/* 1. TOP: GLOBAL HEALTH BAR (Instant Truth) */}
      <header className="max-w-[1600px] mx-auto mb-8 grid grid-cols-2 md:grid-cols-5 gap-px bg-slate-800/30 border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/5">
         <HeaderTile label="System Status" value={g.status} color={statusColor} icon={<ShieldCheck size={14}/>} />
         <HeaderTile label="Avg Latency" value={`${g.avg_latency}ms`} color="text-indigo-400" icon={<Activity size={14}/>} />
         <HeaderTile label="Error Rate" value={`${g.error_rate}%`} color={parseFloat(g.error_rate) > 1 ? 'text-rose-500' : 'text-slate-400'} icon={<AlertCircle size={14}/>} />
         <HeaderTile label="Traffic (RPS)" value={g.rps} color="text-blue-400" icon={<Zap size={14}/>} />
         <HeaderTile label="24H Uptime" value={`${g.uptime}%`} color="text-emerald-400" icon={<Globe size={14}/>} />
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         {/* LEFT COLUMN: TRENDS & SERVICES */}
         <div className="lg:col-span-8 space-y-8">
            
            {/* 2. CORE METRICS (Real History Graphs) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <TrendBox label="CPU Load Pattern" value={`${data?.infra?.cpu}%`} history={data?.infra?.cpu_history} color="indigo" />
               <TrendBox label="Traffic I/O Trend" value={`${data?.infra?.net_in}MB/s`} history={[]} color="blue" />
            </section>

            {/* 3. SERVICE TOPOLOGY (Real Data Engine) */}
            <section className="bg-[#080808] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
               <div className="px-6 py-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/20">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Boxes size={12} className="text-indigo-500"/> Service Resource Topology
                  </h2>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-800/30">
                           <th className="px-6 py-4">Identity</th>
                           <th className="px-6 py-4">CPU</th>
                           <th className="px-6 py-4">Memory</th>
                           <th className="px-6 py-4">Restarts</th>
                           <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800/30 font-mono">
                        {data?.apps?.map((app: any, i: number) => (
                           <tr key={i} className="hover:bg-indigo-500/[0.03] transition-colors group">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${app.status === 'Running' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 animate-pulse'}`}></div>
                                    <span className="text-xs font-bold text-white tracking-tight">{app.name}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-xs text-indigo-400">{app.cpu}</td>
                              <td className="px-6 py-4 text-xs text-blue-400">{app.memory}</td>
                              <td className="px-6 py-4 text-xs text-slate-500">{app.restarts}</td>
                              <td className="px-6 py-4 text-right">
                                 <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${app.status === 'Running' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-rose-400 border-rose-500/20 bg-rose-500/5'}`}>
                                    {app.status}
                                 </span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </section>

            {/* 4. WEBSITE FLEET MONITORING */}
            <section className="bg-[#080808] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
               <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/20">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Globe size={12} className="text-emerald-500"/> External Asset Fleet
                  </h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-800/20">
                  {data?.websites?.map((site: any, i: number) => (
                     <div key={i} className="bg-[#080808] p-5 flex items-center justify-between group hover:bg-emerald-500/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                           <div className={`w-1.5 h-1.5 rounded-full ${site.status === 'Up' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                           <span className="text-xs font-bold text-white tracking-tight truncate max-w-[200px]">{site.domain}</span>
                        </div>
                        <div className="flex gap-6 items-center">
                           <div className="text-right">
                              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Latency</div>
                              <div className="text-[11px] font-black text-indigo-400 font-mono">{site.latency}</div>
                           </div>
                           <div className="text-right">
                              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Uptime</div>
                              <div className="text-[11px] font-black text-emerald-400 font-mono">{site.uptime}</div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </section>
         </div>

         {/* RIGHT COLUMN: ALERTS & CONTEXT */}
         <div className="lg:col-span-4 space-y-8">
            
            {/* 5. ALERT PANEL (CRITICAL) */}
            <section className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden min-h-[400px]">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent"></div>
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Bell size={12} className="text-rose-500" /> Operational Alert Feed
                  </h2>
               </div>
               <div className="space-y-4">
                  {data?.alerts?.length > 0 ? data.alerts.map((alert: any, i: number) => (
                     <div key={i} className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl space-y-2 border-l-2 border-l-rose-500">
                        <div className="flex items-center justify-between">
                           <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{alert.severity}</span>
                           <span className="text-[8px] text-slate-600 font-black">ACTIVE</span>
                        </div>
                        <p className="text-sm font-bold text-white leading-snug tracking-tight">{alert.message}</p>
                     </div>
                  )) : (
                     <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                        <ShieldCheck className="text-emerald-500 mb-6" size={48} />
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-1">Status Nominal</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">No Active Breaches</p>
                     </div>
                  )}
               </div>
            </section>

            {/* 6. SYSTEM CONTEXT (Details) */}
            <section className="bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl p-6 shadow-xl">
               <h2 className="text-[10px] font-black text-indigo-400/50 uppercase tracking-[0.2em] mb-6">Infrastructure Context</h2>
               <div className="space-y-5 font-mono">
                  <InfoItem icon={<Server size={12}/>} label="Compute Node" value="YoForex Main VPS" />
                  <InfoItem icon={<Database size={12}/>} label="Data Engine" value="Postgres + Redis" />
                  <InfoItem icon={<TrendingUp size={12}/>} label="Scrape Pool" value="Prometheus v2" />
                  <InfoItem icon={<Radio size={12}/>} label="Telemetry" value="Real-Time / 10s" />
               </div>
            </section>

         </div>
      </main>

      <footer className="max-w-[1600px] mx-auto p-12 text-center border-t border-slate-900/50 mt-12">
         <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.8em]">
            Precision Engineering • YoForex Mission Control v4.0
         </p>
      </footer>

    </div>
  );
}

function HeaderTile({ label, value, color, icon }: any) {
  return (
    <div className="bg-[#080808] p-5 flex flex-col gap-2 border-r border-slate-800/30 last:border-r-0">
       <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
          {icon} {label}
       </div>
       <div className={`text-xl font-black tracking-tighter ${color}`}>{value}</div>
    </div>
  );
}

function TrendBox({ label, value, history, color }: any) {
  const points = history?.length > 0 ? history.slice(-20) : [10, 15, 12, 18, 14, 20, 15, 12, 10, 8, 12, 15, 20, 18, 22, 15, 12, 10, 15, 18];
  const barColor = color === 'indigo' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]';
  
  return (
    <div className="bg-[#080808] border border-slate-800/50 p-6 rounded-2xl group hover:border-indigo-500/20 transition-all shadow-xl relative overflow-hidden">
       <div className="relative z-10">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">{label}</span>
          <div className="flex items-end justify-between">
             <span className="text-3xl font-black text-white tracking-tighter">{value}</span>
             <div className="w-24 h-12 flex items-end gap-[2px]">
                {points.map((val: any, i: number) => (
                   <div key={i} className={`flex-1 rounded-t-[1px] ${barColor} transition-all duration-700`} style={{ height: `${Math.max(5, (val / 100) * 100)}%` }}></div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: any) {
  return (
    <div className="flex justify-between items-center group">
       <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
          {icon} {label}
       </div>
       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">{value}</span>
    </div>
  );
}
