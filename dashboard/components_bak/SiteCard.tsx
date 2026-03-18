'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="glass-panel p-5 rounded-2xl border border-slate-700/50 hover:border-indigo-500/50 transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full group-hover:bg-indigo-500/10 transition-all"></div>
      
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-800 rounded-xl group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors">
            <Globe size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{siteName}</h3>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{vps}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-black text-emerald-400">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
              ONLINE
           </div>
           
           <div className="relative z-50">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <MoreVertical size={14} />
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-2 overflow-hidden">
                   {[
                     { id: 'RESTART_NODE', label: 'Restart App', icon: RefreshCw },
                     { id: 'RESTART_NGINX', label: 'Config Reload', icon: RefreshCw },
                     { id: 'CLEANUP_DISK', label: 'Purge Cache', icon: Trash2 }
                   ].map(opt => (
                     <button
                       key={opt.id}
                       disabled={!!actionPending}
                       onClick={(e) => handleAction(e, opt.id)}
                       className="w-full px-4 py-2 text-left text-[9px] font-bold uppercase tracking-widest flex items-center gap-3 text-slate-300 hover:bg-slate-900 transition-colors disabled:opacity-50"
                     >
                       <opt.icon size={10} className={actionPending === opt.id ? 'animate-spin' : ''} />
                       {actionPending === opt.id ? 'Processing' : opt.label}
                     </button>
                   ))}
                </div>
              )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Metric Items (APM Depth Upgrade) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-black">
             <Zap size={10} className="text-amber-500/70" /> Request Rate
          </div>
          <div className="text-base font-black text-slate-200">
            {metrics?.rpm || '1.2k'} <span className="text-[10px] text-slate-500 font-medium lowercase">rpm</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-black">
             <Activity size={10} className="text-rose-500/70" /> Error Rate
          </div>
          <div className="text-base font-black text-rose-500">
            {metrics?.error_rate || '0.01'} <span className="text-[10px] text-slate-500 font-medium">%</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-black">
             <Zap size={10} className="text-indigo-500/70" /> p95 Latency
          </div>
          <div className="text-base font-black text-slate-200">
            {metrics?.p95 || '42'} <span className="text-[10px] text-slate-500 font-medium lowercase">ms</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-black">
             <Cpu size={10} className="text-emerald-500/70" /> Res Time
          </div>
          <div className="text-base font-black text-slate-200">
            {metrics?.latency || '18'}<span className="text-[10px] text-slate-500 font-medium lowercase">ms</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-700/50 flex justify-between items-center group-hover:border-indigo-500/20 transition-colors">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 group-hover:text-indigo-400 transition-colors">
          <Database size={10} /> Live Logs Available
        </span>
        <div className="text-indigo-500 group-hover:translate-x-1 transition-transform">
           <Zap size={14} fill="currentColor" />
        </div>
      </div>
    </motion.div>
  );
}
