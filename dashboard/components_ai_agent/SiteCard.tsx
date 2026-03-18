'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Cpu, Database, Globe, MemoryStick as Memory, Zap, MoreVertical, RefreshCw, Trash2 } from 'lucide-react';

interface SiteCardProps {
  target: string;
  vps: string;
  onClick: () => void;
}

export default function SiteCard({ target, vps, onClick }: SiteCardProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const siteName = target.replace(/https?:\/\//, '');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`/api/metrics?target=${encodeURIComponent(target)}`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (e) {}
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [target]);

  const handleAction = async (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    setActionPending(action);
    setIsMenuOpen(false);
    try {
      const res = await fetch('http://localhost:3001/v1/control/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, action })
      });
      const result = await res.json();
      alert(result.message);
    } catch (err) {
      alert('Failed to execute command');
    } finally {
      setActionPending(null);
    }
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -8, scale: 1.02, boxShadow: '0 20px 40px rgba(14,165,233,0.1)' }}
      whileTap={{ scale: 0.98 }}
      className="glass-panel p-6 rounded-[28px] border border-white/[0.03] hover:border-cyan-500/30 transition-all cursor-pointer group relative overflow-hidden bg-black/20"
    >
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full group-hover:bg-cyan-500/10 transition-all duration-700"></div>
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl group-hover:bg-cyan-500/10 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all duration-500">
            <Globe size={22} className="drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
          </div>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tighter group-hover:text-cyan-300 transition-colors">{siteName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
               <div className="w-1 h-1 rounded-full bg-cyan-500/50"></div>
               <p className="text-[9px] text-white/30 font-black uppercase tracking-[0.2em]">{vps} CLUSTER</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/5 border border-cyan-500/20 text-[8px] font-black text-cyan-400 tracking-[0.1em]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse"></span>
              ACTIVE
           </div>
           
           <div className="relative z-50">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
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
                    className="absolute right-0 mt-3 w-48 bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-2 overflow-hidden z-[100]"
                  >
                    <div className="px-4 py-2 border-b border-white/5 mb-2">
                       <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Command Suite</span>
                    </div>
                    {[
                      { id: 'RESTART_NODE', label: 'Cycle Instances', icon: RefreshCw, color: 'hover:text-cyan-400' },
                      { id: 'RESTART_NGINX', label: 'Reload Routing', icon: RefreshCw, color: 'hover:text-indigo-400' },
                      { id: 'CLEANUP_DISK', label: 'Purge Neural Cache', icon: Trash2, color: 'hover:text-rose-400' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        disabled={!!actionPending}
                        onClick={(e) => handleAction(e, opt.id)}
                        className={`w-full px-5 py-2.5 text-left text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-between transition-colors disabled:opacity-50 text-white/40 group/btn ${opt.color} hover:bg-white/[0.03]`}
                      >
                         <div className="flex items-center gap-3">
                            <opt.icon size={12} className={`${actionPending === opt.id ? 'animate-spin' : ''}`} />
                            {actionPending === opt.id ? 'Executing...' : opt.label}
                         </div>
                         <div className="w-1 h-1 rounded-full bg-transparent group-hover/btn:bg-current"></div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 relative z-10">
        {/* Metric Items (AI HUD Upgrade) */}
        <div className="space-y-2 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.03] group/metric">
          <div className="flex items-center gap-2 text-[8px] text-white/20 uppercase font-black tracking-widest">
             <Zap size={12} className="text-cyan-500/50 group-hover/metric:animate-pulse" /> RPM
          </div>
          <div className="text-xl font-black text-white tracking-tighter">
            {metrics?.rpm || '1.2k'} <span className="text-[9px] text-white/20 font-black lowercase opacity-40">req/m</span>
          </div>
        </div>

        <div className="space-y-2 p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 group/metric">
          <div className="flex items-center gap-2 text-[8px] text-rose-500/40 uppercase font-black tracking-widest">
             <Activity size={12} className="group-hover/metric:animate-bounce" /> ERR%
          </div>
          <div className="text-xl font-black text-rose-500 tracking-tighter">
            {metrics?.error_rate || '0.01'} <span className="text-[9px] text-rose-500/30 font-black opacity-40">%</span>
          </div>
        </div>

        <div className="space-y-2 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.03] group/metric">
          <div className="flex items-center gap-2 text-[8px] text-white/20 uppercase font-black tracking-widest">
             <Zap size={12} className="text-indigo-500/50 group-hover/metric:rotate-12 transition-transform" /> P95
          </div>
          <div className="text-xl font-black text-white tracking-tighter">
            {metrics?.p95 || '42'} <span className="text-[9px] text-white/20 font-black lowercase opacity-40 text-indigo-400">ms</span>
          </div>
        </div>

        <div className="space-y-2 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.03] group/metric">
          <div className="flex items-center gap-2 text-[8px] text-white/20 uppercase font-black tracking-widest">
             <Cpu size={12} className="text-emerald-500/50 group-hover/metric:scale-110 transition-transform" /> SYNC
          </div>
          <div className="text-xl font-black text-white tracking-tighter">
            {metrics?.latency || '18'}<span className="text-[9px] text-white/20 font-black lowercase opacity-40">ms</span>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center group-hover:border-cyan-500/20 transition-all relative z-10">
        <span className="text-[9px] font-black text-white/20 uppercase tracking-[.3em] flex items-center gap-2 group-hover:text-cyan-500 transition-colors">
          <Database size={10} className="text-cyan-500/40" /> Neural Logs Active
        </span>
        <div className="flex items-center gap-2 text-cyan-500/30 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all">
           <Zap size={12} fill="currentColor" className="animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}
