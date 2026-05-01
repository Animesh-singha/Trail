'use client';

import { motion } from 'framer-motion';
import { PieChart, Activity, ShieldCheck, Server } from 'lucide-react';

interface FleetOverviewProps {
  websites: any[];
  servers: any[];
  containers?: any[];
  dbStatus?: string;
  securityScore?: number;
}

export default function FleetOverview({ websites, servers, containers = [], dbStatus = 'Unknown', securityScore = 100 }: FleetOverviewProps) {
  // Logic: Calculate distribution
  const onlineSites = websites.filter(w => w.status !== 'offline').length;
  const criticalServers = servers.filter(s => s.cpu_load > 85 || (s.ram_used / s.ram_total) > 0.9);
  
  const stats = [
    { label: 'Security Health', value: `${securityScore}%`, icon: ShieldCheck, color: securityScore > 80 ? 'text-emerald-400' : 'text-rose-400' },
    { label: 'Fleet Status', value: `${onlineSites}/${websites.length} LIVE`, icon: Activity, color: onlineSites === websites.length ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Database Health', value: dbStatus, icon: Server, color: dbStatus === 'Healthy' ? 'text-emerald-400' : 'text-rose-400' },
  ];

  const sslSite = websites.find(w => w.ssl_days !== null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
      {/* Visual Charts Container */}
      <div className="lg:col-span-2 glass-panel p-8 rounded-3xl relative overflow-hidden group border-indigo-500/10">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
          <PieChart size={180} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
          {/* Bespoke Pie Chart (SVG) */}
          <div className="relative w-40 h-40">
             <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1e293b" strokeWidth="3" />
                <motion.circle 
                  cx="18" cy="18" r="15.5" fill="none" 
                  stroke="url(#gradient-slate)" 
                  strokeWidth="3.5" 
                  strokeDasharray={`${(onlineSites/(websites.length || 1))*100} 100`}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 100" }}
                  animate={{ strokeDasharray: `${(onlineSites/(websites.length || 1))*100} 100` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                   <linearGradient id="gradient-slate" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                   </linearGradient>
                </defs>
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white">{onlineSites}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Healthy Sites</span>
             </div>
          </div>

          <div className="flex-1 space-y-6 w-full">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Global Fleet Health</h3>
              <p className="text-xs text-slate-400">Monitoring {servers.length} VPS Nodes & {websites.length} Assets</p>
            </div>
            
            <div className="space-y-4">
               {/* Hotspots Section */}
               {criticalServers.length > 0 ? (
                 <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                    <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
                       Critical Hotspots Detected
                    </div>
                    {criticalServers.map((s, sIdx) => (
                      <div key={sIdx} className="flex justify-between text-xs py-1">
                         <span className="text-slate-300 font-mono">{s.hostname}</span>
                         <span className="text-rose-400 font-bold">{Math.round(s.cpu_load)}% CPU</span>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                       <ShieldCheck size={12} /> Resource Load Optimized
                    </div>
                    <p className="text-[10px] text-slate-500">All VPS nodes operating within safety thresholds.</p>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                     <div className="text-[8px] text-slate-500 uppercase font-black mb-1">Avg Fleet Latency</div>
                     <div className="text-sm font-bold text-slate-200">
                        {websites.length > 0 
                          ? Math.round(websites.reduce((acc, w) => acc + (parseInt(w.latency) || 0), 0) / websites.length) 
                          : 0}ms
                     </div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                     <div className="text-[8px] text-slate-500 uppercase font-black mb-1">Active Containers</div>
                     <div className="text-sm font-bold text-indigo-400">
                        {containers.length}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Column */}
      <div className="space-y-6">
        {stats.map((s, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-panel p-6 rounded-2xl flex items-center justify-between group cursor-default"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-slate-800 rounded-xl ${s.color} group-hover:scale-110 transition-transform`}>
                <s.icon size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none mb-1.5">{s.label}</div>
                <div className="text-2xl font-black text-slate-100">{s.value}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
