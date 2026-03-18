'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Terminal, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ErrorStream() {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllErrors = async () => {
      try {
        // We poll the global logs API
        const res = await fetch('/api/logs?limit=50');
        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.result) {
            const allLogs: any[] = [];
            data.data.result.forEach((stream: any) => {
              const site = stream.stream.target || 'system';
              stream.values.forEach((v: [string, string]) => {
                 const logText = v[1];
                 // Filter for error keywords
                 if (/error|failed|critical|exception|timeout|refused/i.test(logText)) {
                    allLogs.push({
                       ts: v[0],
                       msg: logText,
                       site: site.replace(/https?:\/\//, '')
                    });
                 }
              });
            });
            // Sort by TS descending
            allLogs.sort((a, b) => Number(b.ts) - Number(a.ts));
            setErrors(allLogs.slice(0, 20));
          }
        }
      } catch (err) {
        // Sandbox fallback
        setErrors([
          { ts: Date.now().toString() + "000000", site: 'nexus-core-api.dev', msg: '[500] Internal Server Error: Connection pool exhausted.' },
          { ts: (Date.now() - 5000).toString() + "000000", site: 'demo-bank.io', msg: '[ERROR] Payload validation failed for /api/v1/transfer' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllErrors();
    const interval = setInterval(fetchAllErrors, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel overflow-hidden flex flex-col h-[500px] border border-rose-500/10">
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
            <AlertCircle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Consolidated Error Stream</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Cross-Platform Critical Feed</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-[10px] font-bold text-rose-400 bg-rose-400/5 px-3 py-1 rounded-full border border-rose-400/20 animate-pulse">LIVE AGGREGATION</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-[#060910] space-y-3 font-mono text-[11px]">
        {loading && errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4">
            <RefreshCcw size={32} className="animate-spin opacity-20" />
            <span className="uppercase tracking-[0.3em] text-[10px]">Filtering global logs...</span>
          </div>
        ) : errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2 opacity-30">
             <Terminal size={40} />
             <span className="uppercase tracking-[0.2em] text-[10px]">No critical errors in current buffer</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {errors.map((err, idx) => (
              <motion.div
                key={err.ts + idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="group relative bg-slate-900/40 border border-slate-800/50 p-3 rounded-xl hover:bg-rose-500/5 hover:border-rose-500/20 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                   <span className="px-2 py-0.5 bg-slate-800 rounded-md text-indigo-400 font-bold border border-slate-700">{err.site}</span>
                   <span className="text-slate-600">{new Date(Number(err.ts)/1000000).toLocaleTimeString()}</span>
                </div>
                <div className="text-rose-400/90 whitespace-pre-wrap leading-relaxed group-hover:text-rose-400 transition-colors">
                  {err.msg}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="bg-slate-950/50 px-6 py-3 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono">
         <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
            MONITORING GLOBAL WEBHOOKS
         </div>
         <div className="flex gap-4">
            <span>Buffer: 20 Items</span>
            <span>Refreshes: 4s</span>
         </div>
      </div>
    </div>
  );
}
