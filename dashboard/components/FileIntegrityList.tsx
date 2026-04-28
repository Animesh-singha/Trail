'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileCode, FileText, FileSearch, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function FileIntegrityList() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/integrity');
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err) {
        console.error('Failed to fetch integrity logs');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000); // Scan every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && logs.length === 0) return (
    <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Scanning server filesystem...</div>
  );

  return (
    <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800/60 h-full flex flex-col">
      <div className="px-6 py-5 border-b border-slate-800/60 bg-slate-900/30 flex justify-between items-center shrink-0">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <FileSearch size={12} /> File Integrity Audit
        </h3>
        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Live Watcher</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-600 text-xs italic">No recent modifications detected.</div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {logs.map((log, i) => {
              const isSensitive = log.file.includes('.env') || log.file.includes('config') || log.file.includes('rules');
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-lg ${isSensitive ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'} group-hover:scale-110 transition-transform`}>
                        {log.type === 'ts' || log.type === 'js' ? <FileCode size={14} /> : <FileText size={14} />}
                      </div>
                      <div className="truncate">
                        <div className={`text-xs font-bold truncate ${isSensitive ? 'text-rose-300' : 'text-slate-200'}`}>
                          {log.file.split('/').pop()}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono truncate">{log.file}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-300 font-mono font-bold">{log.size}</div>
                      <div className="text-[8px] text-slate-600 uppercase font-black">{log.type}</div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] text-slate-500">
                      <Clock size={10} />
                      {new Date(log.modified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {isSensitive ? (
                      <div className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase tracking-tighter">
                         <AlertTriangle size={10} /> Sensitive Modification
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[8px] font-black text-emerald-500/50 uppercase tracking-tighter">
                         <ShieldCheck size={10} /> Verified Change
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800/60">
        <p className="text-[9px] text-slate-600 leading-relaxed italic">
          "FIM Agent is monitoring your root directory for unexpected code injections or config drifts."
        </p>
      </div>
    </div>
  );
}
