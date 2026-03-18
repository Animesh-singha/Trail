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
    <div className="flex flex-wrap gap-4 mt-4">
       {/* If there are no configured websites in blackbox exporter yet, we display a default info chip */}
       {targets.length === 0 && (
         <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800/50 text-xs text-slate-400">
           <Globe2 size={12} className="text-slate-500" />
           No Custom Websites Monitored
         </div>
       )}

       {targets.map((t, i) => (
         <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           key={i} 
           className={`flex items-center gap-3 pl-3 pr-1.5 py-1.5 rounded-full border ${
             t.status === 'UP' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
           }`}
         >
           <div className="flex items-center gap-2">
             <Globe size={12} className={t.status === 'UP' ? 'text-emerald-500' : 'text-rose-500'} />
             <span className="text-xs font-bold tracking-wide">{t.target.replace(/https?:\/\//, '')}</span>
             <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_5px_currentColor] ml-1"></span>
           </div>
           
           <div className="w-px h-4 bg-current opacity-20 mx-1"></div>
           
           <a 
             href={`/api/backup?target=${encodeURIComponent(t.target)}`} 
             download
             title="Download Database Backup"
             className="p-1.5 hover:bg-slate-800/50 rounded-full transition-colors group cursor-pointer"
           >
             <Database size={12} className="opacity-70 group-hover:opacity-100 transition-opacity" />
           </a>
         </motion.div>
       ))}
    </div>
  );
}
