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
    <div className="glass-panel overflow-hidden flex flex-col h-[520px] border border-rose-500/20 bg-black/40 rounded-[28px]">
      <div className="bg-white/[0.02] px-8 py-5 border-b border-white/5 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-500/5 rounded-2xl text-rose-500 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
            <AlertCircle size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tighter">CROSS-NODE ERROR SYNTHESIS</h3>
            <p className="text-[9px] text-rose-500/50 uppercase tracking-[0.3em] font-black">Buffer Status: Active Aggregation</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-[8px] font-black text-rose-400 bg-rose-500/5 px-4 py-1.5 rounded-full border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)] tracking-[0.2em] uppercase">NEURAL_LIVE</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-transparent space-y-4 font-mono text-[11px] custom-scrollbar relative z-10">
        {loading && errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/10 gap-6">
            <RefreshCcw size={40} className="animate-spin opacity-20 text-rose-500" />
            <span className="uppercase tracking-[0.4em] text-[9px] font-black">Filtering Global Streams...</span>
          </div>
        ) : errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/5 gap-4 opacity-40">
             <Terminal size={48} />
             <span className="uppercase tracking-[0.3em] text-[9px] font-black">Clear Buffer: No Anomalies Detected</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {errors.map((err, idx) => (
              <motion.div
                key={err.ts + idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative bg-white/[0.02] border border-white/5 p-4 rounded-2xl hover:bg-rose-500/5 hover:border-rose-500/30 transition-all duration-500"
              >
                <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
                      <span className="px-2.5 py-1 bg-white/[0.03] rounded-lg text-cyan-400 font-black border border-white/5 text-[9px] uppercase tracking-widest">{err.site}</span>
                   </div>
                   <span className="text-[10px] text-white/10 font-black font-mono tracking-tighter">{new Date(Number(err.ts)/1000000).toLocaleTimeString()}</span>
                </div>
                <div className="text-rose-400/80 font-medium whitespace-pre-wrap leading-relaxed group-hover:text-rose-400 transition-colors text-xs bg-black/20 p-3 rounded-xl border border-white/[0.02]">
                  {err.msg}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="bg-white/[0.01] px-8 py-4 border-t border-white/5 flex justify-between items-center text-[9px] text-white/20 font-black uppercase tracking-[0.2em] relative z-10">
         <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping opacity-50 shadow-[0_0_10px_#f43f5e]"></span>
            AGENT_STREAM: ACTIVE_MONITORING
         </div>
         <div className="flex gap-6 opacity-40">
            <span>VOL: 20 SLOTS</span>
            <span>FREQ: 4000MS</span>
         </div>
      </div>
    </div>
  );
}
