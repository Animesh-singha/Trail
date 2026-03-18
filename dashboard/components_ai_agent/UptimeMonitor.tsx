'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Globe2, Database } from 'lucide-react';

export default function UptimeMonitor({ onTargetsUpdate }: { onTargetsUpdate?: (targets: string[]) => void }) {
  const [targets, setTargets] = useState<{ target: string, status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll Prometheus every 10 seconds for probe_success state
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/uptime');
        if (!res.ok) {
           // Skip processing if Prometheus is not available locally
           return;
        }
        const data = await res.json();
        
        // Handle gracefully if Prometheus is not supplying array data yet
        if (Array.isArray(data)) {
           setTargets(data);
           if (onTargetsUpdate) {
             onTargetsUpdate(data.map((t: any) => t.target));
           }
        }
      } catch (err) {
        // Silently catch in local testing 
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  return (
    <div className="flex flex-wrap gap-4 mt-8 relative z-10">
       {/* Default chip */}
       {targets.length === 0 && (
         <div className="flex items-center gap-3 px-5 py-2 rounded-full border border-white/[0.05] bg-white/[0.02] text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
           <Globe2 size={12} className="opacity-30" />
           ZERO_EXTERNAL_NODES_ACTIVE
         </div>
       )}

       {targets.map((t, i) => (
         <motion.div 
           initial={{ opacity: 0, scale: 0.9, y: 10 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           transition={{ delay: i * 0.1, duration: 0.5 }}
           key={i} 
           className={`flex items-center gap-4 pl-4 pr-2 py-2 rounded-full border transition-all duration-500 group cursor-pointer ${
             t.status === 'UP' ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400 hover:border-cyan-500/40' : 'bg-rose-500/5 border-rose-500/20 text-rose-400 hover:border-rose-500/40'
           }`}
         >
           <div className="flex items-center gap-3">
             <Globe size={14} className={t.status === 'UP' ? 'text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]'} />
             <span className="text-[10px] font-black uppercase tracking-tighter group-hover:text-white transition-colors">{t.target.replace(/https?:\/\//, '')}</span>
             <span className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] ml-1 ${t.status === 'UP' ? 'bg-cyan-400' : 'bg-rose-400 animate-pulse'}`}></span>
           </div>
           
           <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
           
           <a 
             href={`/api/backup?target=${encodeURIComponent(t.target)}`} 
             download
             title="Download Database Backup"
             className="p-2 hover:bg-white/10 rounded-full transition-all group/btn relative overflow-hidden"
           >
             <Database size={13} className="text-white/40 group-hover/btn:text-white transition-colors relative z-10" />
             <div className="absolute inset-0 bg-cyan-500 opacity-0 group-hover/btn:opacity-20 blur-sm transition-opacity"></div>
           </a>
         </motion.div>
       ))}
    </div>
  );
}
