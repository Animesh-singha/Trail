'use client';

import { motion } from 'framer-motion';
import { PieChart, Activity, ShieldCheck, Server } from 'lucide-react';

interface FleetOverviewProps {
  websites: any[];
  servers: any[];
  securityScore?: number;
}

export default function FleetOverview({ websites, servers, securityScore = 100 }: FleetOverviewProps) {
  // Logic: Calculate distribution
  const onlineSites = websites.filter(w => w.status !== 'offline').length;
  const highLoadServers = servers.filter(s => s.cpu_load > 60).length;
  const avgRamUsed = servers.reduce((acc, s) => acc + (s.ram_used / s.ram_total), 0) / (servers.length || 1);

  const stats = [
    { label: 'Security Health', value: `${securityScore}%`, icon: ShieldCheck, color: securityScore > 80 ? 'text-emerald-400' : 'text-rose-400' },
    { label: 'Active Targets', value: onlineSites, total: websites.length, icon: Activity, color: 'text-indigo-400' },
    { label: 'Node Capacity', value: `${Math.round(avgRamUsed * 100)}%`, icon: Server, color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
      {/* Visual Charts Container */}
      <div className="lg:col-span-2 glass-panel p-8 rounded-3xl relative overflow-hidden group">
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
                  stroke="url(#gradient-indigo)" 
                  strokeWidth="3.5" 
                  strokeDasharray={`${(onlineSites/websites.length)*100} 100`}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 100" }}
                  animate={{ strokeDasharray: `${(onlineSites/(websites.length || 1))*100} 100` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                   <linearGradient id="gradient-indigo" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#818cf8" />
                   </linearGradient>
                </defs>
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white">{onlineSites}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Healthy</span>
             </div>
          </div>

          <div className="flex-1 space-y-6 w-full">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Fleet Performance Trends</h3>
              <p className="text-xs text-slate-400">Aggregated real-time analysis across {servers.length} VPS nodes and {websites.length} application clusters.</p>
            </div>
            
            <div className="space-y-4">
               {/* VPS RAM Distribution Bars */}
               {servers.map(s => {
                  const perc = (s.ram_used / s.ram_total) * 100;
                  return (
                    <div key={s.hostname} className="space-y-1.5">
                       <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-slate-500">
                          <span>{s.hostname}</span>
                          <span className={perc > 80 ? 'text-rose-400' : 'text-slate-300'}>{Math.round(perc)}%</span>
                       </div>
                       <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${perc}%` }}
                            className={`h-full ${perc > 80 ? 'bg-rose-500' : 'bg-indigo-500/60'}`}
                          ></motion.div>
                       </div>
                    </div>
                  )
               })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Column */}
      <div className="space-y-6">
        {stats.map((s, idx) => (
          <motion.div
            key={s.label}
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

        <div className="glass-panel p-6 rounded-2xl bg-indigo-500/5 border-indigo-500/20">
           <div className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-3">System Intelligence</div>
           <p className="text-xs text-slate-400 leading-relaxed italic">"AI Analyzer is currently monitoring <span className="text-indigo-300">all streams</span>. Root cause detection is active."</p>
        </div>
      </div>
    </div>
  );
}
