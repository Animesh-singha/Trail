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
    { label: 'Security Health', value: `${securityScore}%`, icon: ShieldCheck, color: securityScore > 80 ? 'text-cyan-400' : 'text-rose-400', glow: securityScore > 80 ? 'shadow-[0_0_15px_rgba(14,165,233,0.3)]' : 'shadow-[0_0_15px_rgba(244,63,94,0.3)]' },
    { label: 'Active Targets', value: onlineSites, total: websites.length, icon: Activity, color: 'text-indigo-400', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.3)]' },
    { label: 'Node Capacity', value: `${Math.round(avgRamUsed * 100)}%`, icon: Server, color: 'text-cyan-400', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.3)]' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
      {/* Visual Charts Container */}
      <div className="lg:col-span-2 glass-panel p-8 rounded-[32px] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
           <PieChart size={200} className="text-cyan-400" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
          {/* Bespoke Pie Chart (SVG) */}
          <div className="relative w-48 h-48 flex items-center justify-center">
             <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90 drop-shadow-[0_0_10px_rgba(14,165,233,0.2)]">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                <motion.circle 
                  cx="18" cy="18" r="16" fill="none" 
                  stroke="url(#gradient-ai)" 
                  strokeWidth="3.5" 
                  strokeDasharray={`${(onlineSites/websites.length)*100} 100`}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 100" }}
                  animate={{ strokeDasharray: `${(onlineSites/(websites.length || 1))*100} 100` }}
                  transition={{ duration: 2, ease: "circOut" }}
                />
                <defs>
                   <linearGradient id="gradient-ai" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0EA5E9" />
                      <stop offset="100%" stopColor="#6366F1" />
                   </linearGradient>
                </defs>
             </svg>
             <div className="absolute flex flex-col items-center justify-center">
                <motion.span 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl font-black text-white tracking-tighter"
                >
                  {onlineSites}
                </motion.span>
                <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mt-1">Status: OK</span>
             </div>
          </div>

          <div className="flex-1 space-y-8 w-full">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Fleet Synchronization</h3>
              <p className="text-[11px] text-white/40 leading-relaxed max-w-md">Neural processing active across <span className="text-cyan-400">{servers.length} VPS clusters</span> and {websites.length} application targets. Traffic integrity validated.</p>
            </div>
            
            <div className="space-y-5">
               {/* VPS RAM Distribution Bars */}
               {servers.map((s, i) => {
                  const perc = (s.ram_used / s.ram_total) * 100;
                  return (
                    <div key={s.hostname} className="space-y-2">
                       <div className="flex justify-between text-[9px] uppercase font-black tracking-[0.2em] text-white/20">
                          <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-cyan-500/40"></div> {s.hostname}</span>
                          <span className={perc > 80 ? 'text-rose-500' : 'text-cyan-400'}>{Math.round(perc)}% LOAD</span>
                       </div>
                       <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.02]">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${perc}%` }}
                            transition={{ delay: 0.5 + (i * 0.1), duration: 1 }}
                            className={`h-full relative ${perc > 80 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(14,165,233,0.3)]'}`}
                          >
                             <div className="absolute inset-0 bg-white/20 opacity-20 animate-pulse"></div>
                          </motion.div>
                       </div>
                    </div>
                  )
               })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Column */}
      <div className="grid grid-cols-1 gap-6 content-start">
        {stats.map((s, idx) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + (idx * 0.1) }}
            className="glass-panel p-6 rounded-[24px] flex items-center justify-between group hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-center gap-5">
              <div className={`p-4 bg-white/[0.03] border border-white/5 rounded-2xl ${s.color} ${s.glow} group-hover:scale-110 transition-transform duration-500`}>
                <s.icon size={22} />
              </div>
              <div>
                <div className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] mb-1">{s.label}</div>
                <div className="text-2xl font-black text-white tracking-tight">{s.value}</div>
              </div>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/5 group-hover:bg-cyan-500 transition-colors"></div>
          </motion.div>
        ))}

        <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.6 }}
           className="glass-panel p-6 rounded-[24px] bg-cyan-500/5 border-cyan-500/20"
        >
           <div className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse"></div>
              System Intelligence
           </div>
           <p className="text-[11px] text-white/40 leading-relaxed italic">"AI Agent is currently synthesizing <span className="text-indigo-300">all streams</span>. Neural root cause detection is active."</p>
        </motion.div>
      </div>
    </div>
  );
}
