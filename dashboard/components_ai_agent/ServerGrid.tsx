'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, HardDrive, Server, ShieldCheck, MoreVertical, RefreshCw, Power, Trash2 } from 'lucide-react';

export default function ServerGrid() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await fetch('/api/metrics');
        if (res.ok) {
          const data = await res.json();
          if (data.servers) {
            setServers(data.servers);
          }
        }
      } catch (err) {
        setServers([
            { hostname: 'vps-lon-01', ip: '45.12.88.101', ram_used: 1.4, ram_total: 4, cpu_load: 12, disk_used: 45, disk_total: 100, load_avg: [0.12, 0.45, 0.88], net_in: '12MB/s', net_out: '4MB/s', status: 'online' },
            { hostname: 'vps-nyc-02', ip: '104.21.5.22', ram_used: 6.8, ram_total: 8, cpu_load: 45, disk_used: 110, disk_total: 200, load_avg: [1.2, 1.45, 1.33], net_in: '85MB/s', net_out: '22MB/s', status: 'online' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchServers();
    const interval = setInterval(fetchServers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (hostname: string, action: string) => {
    setActionPending(`${hostname}-${action}`);
    setActiveMenu(null);
    try {
      const res = await fetch('http://localhost:3001/v1/control/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: hostname, action })
      });
      const result = await res.json();
      alert(result.message);
    } catch (err) {
      alert('Failed to execute command: Network Error');
    } finally {
      setActionPending(null);
    }
  };

  if (loading && servers.length === 0) return (
    <div className="flex justify-center py-20 opacity-30">
        <div className="flex flex-col items-center gap-4">
           <RefreshCw className="animate-spin text-cyan-400" size={32} />
           <div className="text-cyan-400 font-black text-[10px] tracking-[0.3em]">SYNCHRONIZING VPS NODES...</div>
        </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {servers.map((server, i) => {
        const ramPercent = (server.ram_used / server.ram_total) * 100;
        const diskPercent = (server.disk_used / server.disk_total) * 100;
        const isMenuOpen = activeMenu === server.hostname;
        
        return (
          <motion.div
            key={server.hostname}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-[28px] border border-white/[0.03] hover:border-cyan-500/30 transition-all group relative overflow-visible bg-black/20"
          >
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-all duration-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                <Server size={22} />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/5 border border-cyan-500/20 text-[8px] font-black text-cyan-400 uppercase tracking-[0.1em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse"></span>
                  {server.status}
                </div>
                
                <div className="relative">
                  <button 
                    onClick={() => setActiveMenu(isMenuOpen ? null : server.hostname)}
                    className="p-1.5 text-white/10 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                  >
                    <MoreVertical size={16} />
                  </button>
                  
                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-48 bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] py-2 overflow-hidden"
                      >
                         {[
                           { id: 'RESTART_NGINX', label: 'Reload Routing', icon: RefreshCw, color: 'hover:text-cyan-400' },
                           { id: 'RESTART_NODE', label: 'Cycle Instances', icon: RefreshCw, color: 'hover:text-indigo-400' },
                           { id: 'CLEANUP_DISK', label: 'Purge Disk', icon: Trash2, color: 'hover:text-amber-400' },
                           { id: 'REBOOT', label: 'Kernel Reboot', icon: Power, color: 'hover:text-rose-500' }
                         ].map(opt => (
                           <button
                             key={opt.id}
                             disabled={!!actionPending}
                             onClick={() => handleAction(server.hostname, opt.id)}
                             className={`w-full px-5 py-2.5 text-left text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-colors ${opt.color} hover:bg-white/[0.03] text-white/40 disabled:opacity-50 text-xs`}
                           >
                             <opt.icon size={12} className={actionPending === `${server.hostname}-${opt.id}` ? 'animate-spin' : ''} />
                             {actionPending === `${server.hostname}-${opt.id}` ? 'Executing...' : opt.label}
                           </button>
                         ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="relative z-10 mb-6">
               <h3 className="text-sm font-black text-white uppercase tracking-tighter group-hover:text-cyan-300 transition-colors truncate">{server.hostname}</h3>
               <div className="flex items-center gap-2 mt-1">
                  <div className="w-1 h-1 rounded-full bg-white/10"></div>
                  <p className="text-[9px] text-white/20 font-black tracking-[0.1em]">{server.ip}</p>
               </div>
            </div>

            <div className="space-y-6 relative z-10">
              {/* RAM & CPU Bar Group */}
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-[8px] uppercase font-black tracking-[0.2em] text-white/30">
                       <span>Memory</span>
                       <span className="text-cyan-400">{server.ram_used} / {server.ram_total}G</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
                      <motion.div initial={{width: 0}} animate={{width:`${ramPercent}%`}} className={`h-full relative ${ramPercent > 85 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_rgba(14,165,233,0.3)]'}`} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-[8px] uppercase font-black tracking-[0.2em] text-white/30">
                       <span>Core Load</span>
                       <span className="text-indigo-400">{server.cpu_load}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
                      <motion.div initial={{width: 0}} animate={{width:`${server.cpu_load}%`}} className={`h-full relative ${server.cpu_load > 60 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-gradient-to-r from-indigo-600 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)]'}`} />
                    </div>
                 </div>
              </div>

              {/* Disk Usage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[8px] uppercase font-black tracking-[0.2em] text-white/30">
                   <div className="flex items-center gap-2"><HardDrive size={10} className="text-cyan-500/50" /> Storage Volume</div>
                   <span className="text-white/40">{server.disk_used}G / {server.disk_total}G</span>
                </div>
                <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${diskPercent}%` }} 
                    className={`h-full relative ${diskPercent > 90 ? 'bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]' : 'bg-white/20'}`} 
                  />
                </div>
              </div>

              {/* Load Avg & Network throughput */}
              <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-6 group-hover:border-white/10 transition-colors">
                 <div className="space-y-1">
                    <span className="text-[7px] text-white/20 font-black uppercase tracking-[0.2em] block">Load Avg</span>
                    <div className="text-[9px] font-black text-cyan-500/50 tracking-widest font-mono">
                       {server.load_avg ? server.load_avg.join('  ') : '0.0 0.0 0.0'}
                    </div>
                 </div>
                 <div className="space-y-1 text-right">
                    <span className="text-[7px] text-white/20 font-black uppercase tracking-[0.2em] block">Inbound / Outbound</span>
                    <div className="text-[9px] font-black text-emerald-500/60 tracking-tighter font-mono">
                       {server.net_in || '0mb/s'}  <span className="text-white/10 font-thin mx-1">/</span>  {server.net_out || '0mb/s'}
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
