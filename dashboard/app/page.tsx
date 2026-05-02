'use client';

import { useState, useEffect, useRef } from 'react';
import { Activity, Server, Globe, Boxes, ShieldCheck, AlertCircle, Loader2, Bell, Zap, Radio, Database, History, Terminal, ChevronRight, Lock } from 'lucide-react';

export default function MissionControl() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('Select a service to view live forensic logs...');
  const logEndRef = useRef<null | HTMLDivElement>(null);

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

  const fetchLogs = async (service: string) => {
    setLogs('⏳ Fetching forensic logs...');
    try {
      // Point to the new stabilized route
      const response = await fetch(`/api/forensics?service=${encodeURIComponent(service)}&t=${Date.now()}`);
      if (!response.ok) {
        const errorData = await response.json();
        setLogs(`❌ Error: ${errorData.error || 'Unknown problem'}`);
        return;
      }
      const data = await response.text();
      setLogs(data || 'No logs found for this service.');
    } catch (err) {
      setLogs('❌ Failed to connect to server log stream.');
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedBot) {
      const interval = setInterval(() => fetchLogs(selectedBot), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedBot]);

  if (loading) return (
    <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center gap-6">
      <div className="relative">
         <div className="absolute inset-0 bg-indigo-500/20 blur-3xl animate-pulse rounded-full"></div>
         <Loader2 className="text-indigo-500 animate-spin relative" size={48} />
      </div>
      <div className="text-[10px] font-black text-white uppercase tracking-[0.5em] animate-pulse">Syncing SRE-Grade Intelligence</div>
    </div>
  );

  const g = data?.global || {};
  const statusColor = g.status === 'HEALTHY' ? 'text-emerald-400' : 'text-rose-500';

  return (
    <div className="min-h-screen bg-[#010101] text-slate-400 font-sans selection:bg-indigo-500/30 overflow-x-hidden p-4 md:p-8">
      
      {/* 1. TOP: GLOBAL HEALTH BAR */}
      <header className="max-w-[1600px] mx-auto mb-8 grid grid-cols-2 md:grid-cols-5 gap-px bg-slate-800/30 border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
         <HeaderTile label="System Status" value={g.status} color={statusColor} icon={<ShieldCheck size={14}/>} />
         <HeaderTile label="p95 Latency" value={`${g.p95_latency}ms`} color="text-indigo-400" icon={<Activity size={14}/>} />
         <HeaderTile label="Load (Saturation)" value={g.load_avg} color={parseFloat(g.load_avg) > 2 ? 'text-amber-500' : 'text-slate-400'} icon={<AlertCircle size={14}/>} />
         <HeaderTile label="Traffic (RPS)" value={g.rps} color="text-blue-400" icon={<Zap size={14}/>} />
         <HeaderTile label="Upstream Sync" value={`${g.upstream_latency}ms`} color="text-emerald-400" icon={<Radio size={14}/>} />
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         <div className="lg:col-span-8 space-y-8">
            {/* 2. TRENDS */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <TrendBox label="CPU Resource Pattern" value={`${data?.infra?.cpu}%`} history={data?.infra?.cpu_history} color="indigo" />
               <TrendBox label="Total I/O Data Flow" value={`${data?.infra?.net_out}MB/s`} history={[]} color="blue" />
            </section>

            {/* 3. SERVICE RESOURCE TOPOLOGY */}
            <section className="bg-[#080808] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
               <div className="px-6 py-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/20">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Boxes size={12} className="text-indigo-500"/> SRE Service Resource Topology
                  </h2>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-800/30">
                           <th className="px-6 py-4">Service Identity</th>
                           <th className="px-6 py-4 text-center">CPU</th>
                           <th className="px-6 py-4 text-center">RAM</th>
                           <th className="px-6 py-4 text-center">Restarts</th>
                           <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800/30 font-mono">
                        {data?.apps?.map((app: any, i: number) => (
                           <tr key={i} className={`hover:bg-indigo-500/[0.03] transition-colors group ${selectedBot === app.name ? 'bg-indigo-500/5' : ''}`}>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${app.status === 'Running' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 animate-pulse'}`}></div>
                                    <span className="text-xs font-bold text-white tracking-tight">{app.name}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center text-xs text-indigo-400">{app.cpu}</td>
                              <td className="px-6 py-4 text-center text-xs text-blue-400">{app.memory}</td>
                              <td className="px-6 py-4 text-center text-xs text-slate-500">{app.restarts}</td>
                              <td className="px-6 py-4 text-right">
                                {!app.name.startsWith('[SYS]') && (
                                  <button 
                                    onClick={() => fetchLogs(app.name)}
                                    className="text-[9px] font-black px-2 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-white transition-all flex items-center gap-1 ml-auto"
                                  >
                                    <Terminal size={10}/> LOGS
                                  </button>
                                )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </section>

            {/* 4. WEBSITE FLEET & SSL */}
            <section className="bg-[#080808] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
               <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/20">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Globe size={12} className="text-emerald-500"/> External Fleet Compliance
                  </h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-800/20">
                  {data?.websites?.map((site: any, i: number) => (
                     <div key={i} className="bg-[#080808] p-5 flex items-center justify-between group hover:bg-emerald-500/[0.02] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                           <div className={`w-1.5 h-1.5 rounded-full ${site.status === 'Up' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                           <span className="text-xs font-bold text-white tracking-tight truncate">{site.domain}</span>
                         </div>
                        <div className="flex gap-4 items-center shrink-0">
                           <div className="text-right">
                              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">SSL Expiry</div>
                              <div className={`text-[11px] font-black font-mono flex items-center gap-1 ${site.ssl_status === 'CRITICAL' ? 'text-rose-500' : 'text-emerald-400'}`}>
                                <Lock size={10}/> {site.ssl_expiry}
                              </div>
                           </div>
                           <div className="text-right">
                              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Latency</div>
                              <div className="text-[11px] font-black text-indigo-400 font-mono">{site.latency}</div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </section>

            {/* 5. LIVE LOG TERMINAL (NEW) */}
            <section className="bg-[#050505] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/40 flex justify-between items-center">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Terminal size={12} className="text-indigo-400"/> Forensic Log Stream {selectedBot && <span className="text-indigo-400">:: {selectedBot}</span>}
                    </h2>
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500/50"></div>
                        <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                    </div>
                </div>
                <div className="p-6 h-[300px] overflow-y-auto font-mono text-[11px] leading-relaxed scrollbar-hide">
                    <pre className="text-slate-300 whitespace-pre-wrap">{logs}</pre>
                    <div ref={logEndRef} />
                </div>
            </section>
         </div>

         {/* RIGHT COLUMN */}
         <div className="lg:col-span-4 space-y-8">
            <section className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden min-h-[400px]">
               <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/30"></div>
               <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-8">
                  <Bell size={12} className="text-rose-500" /> SRE Alert Feed
               </h2>
               <div className="space-y-4">
                  {data?.alerts?.length > 0 ? data.alerts.map((alert: any, i: number) => (
                     <div key={i} className={`bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl space-y-2 border-l-2 ${alert.severity === 'critical' ? 'border-l-rose-500' : 'border-l-amber-500'}`}>
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{alert.severity}</span>
                        <p className="text-sm font-bold text-white leading-snug">{alert.message}</p>
                     </div>
                  )) : (
                     <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                        <ShieldCheck className="text-emerald-500 mb-6" size={48} />
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-1">Infrastructure Stable</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Zero Firing Alerts</p>
                     </div>
                  )}
               </div>
            </section>

            <section className="bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl p-6 shadow-xl">
               <h2 className="text-[10px] font-black text-indigo-400/50 uppercase tracking-[0.2em] mb-6">System Health Context</h2>
               <div className="space-y-5 font-mono">
                  <InfoItem icon={<Server size={12}/>} label="Node Type" value="SRE-V6 PRODUCTION" />
                  <InfoItem icon={<Activity size={12}/>} label="Telemetry Mode" value="RED MODEL (P95)" />
                  <InfoItem icon={<Database size={12}/>} label="Query Engine" value="PromQL / Range API" />
                  <InfoItem icon={<Radio size={12}/>} label="Update Frequency" value="10,000 MS" />
               </div>
            </section>
         </div>

      </main>

      <footer className="mt-12 pt-8 border-t border-slate-800/50 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-600 font-medium">
          YOFOREX SRE INTELLIGENCE :: v6.2.1
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
