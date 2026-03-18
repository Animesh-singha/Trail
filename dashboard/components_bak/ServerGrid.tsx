'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
    <div className="flex justify-center py-10 opacity-30">
        <div className="animate-pulse text-indigo-400 font-mono text-xs">SCANNING VPS NETWORK...</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {servers.map((server, i) => {
        const ramPercent = (server.ram_used / server.ram_total) * 100;
        const diskPercent = (server.disk_used / server.disk_total) * 100;
        const isMenuOpen = activeMenu === server.hostname;
        
        return (
          <motion.div
            key={server.hostname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-5 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 transition-all group relative overflow-visible"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                <Server size={20} />
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-tighter">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                  {server.status}
                </div>
                
                <div className="relative">
                  <button 
                    onClick={() => setActiveMenu(isMenuOpen ? null : server.hostname)}
                    className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-[70] py-2 overflow-hidden">
                       {[
                         { id: 'RESTART_NGINX', label: 'Restart Nginx', icon: RefreshCw },
                         { id: 'RESTART_NODE', label: 'Restart Node', icon: RefreshCw },
                         { id: 'CLEANUP_DISK', label: 'Cleanup Disk', icon: Trash2 },
                         { id: 'REBOOT', label: 'Reboot Server', icon: Power, color: 'text-rose-500' }
                       ].map(opt => (
                         <button
                           key={opt.id}
                           disabled={!!actionPending}
                           onClick={() => handleAction(server.hostname, opt.id)}
                           className={`w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 transition-colors ${opt.color || 'text-slate-300'} hover:bg-slate-900 disabled:opacity-50`}
                         >
                           <opt.icon size={12} className={actionPending === `${server.hostname}-${opt.id}` ? 'animate-spin' : ''} />
                           {actionPending === `${server.hostname}-${opt.id}` ? 'Executing...' : opt.label}
                         </button>
                       ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <h3 className="text-sm font-bold text-white mb-0.5 truncate">{server.hostname}</h3>
            <p className="text-[10px] text-slate-500 font-mono mb-4">{server.ip}</p>

            <div className="space-y-4">
              {/* RAM & CPU Bar Group */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <div className="flex justify-between items-center mb-1 text-[9px] uppercase font-black tracking-tighter text-slate-500">
                       <span>RAM</span>
                       <span className="text-slate-300">{server.ram_used}G</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{width: 0}} animate={{width:`${ramPercent}%`}} className={`h-full ${ramPercent > 85 ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-1 text-[9px] uppercase font-black tracking-tighter text-slate-500">
                       <span>CPU</span>
                       <span className="text-slate-300">{server.cpu_load}%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{width: 0}} animate={{width:`${server.cpu_load}%`}} className={`h-full ${server.cpu_load > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    </div>
                 </div>
              </div>

              {/* Disk Usage (Operational Deepening) */}
              <div>
                <div className="flex justify-between items-center mb-1 text-[9px] uppercase font-black tracking-tighter text-slate-500">
                   <div className="flex items-center gap-1"><HardDrive size={10} /> DISK VOLUME</div>
                   <span className="text-slate-300">{server.disk_used}G / {server.disk_total}G</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${diskPercent}%` }} 
                    className={`h-full ${diskPercent > 90 ? 'bg-rose-600' : 'bg-slate-400'}`} 
                  />
                </div>
              </div>

              {/* Load Avg & Network throughput (High Density Metrics) */}
              <div className="pt-2 border-t border-slate-800/50 grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block">Load Average</span>
                    <div className="text-[10px] font-mono text-indigo-400">
                       {server.load_avg ? server.load_avg.join(' ') : '0.0 0.0 0.0'}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block">Net (In / Out)</span>
                    <div className="text-[10px] font-mono text-emerald-400">
                       {server.net_in || '0mb/s'} / {server.net_out || '0mb/s'}
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
