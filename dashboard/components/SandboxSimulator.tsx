'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Terminal, Zap, X, Shield, Activity, Skull, Database } from 'lucide-react';

export default function SandboxSimulator({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const simulateAttack = async (type: string, node: string) => {
    setLoadingAction(type);
    try {
      const res = await fetch('http://localhost:3001/v1/sandbox/trigger-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attackType: type, targetNode: node })
      });
      if (res.ok) {
        // Short success delay
        setTimeout(() => setLoadingAction(null), 1000);
      } else {
        alert("Failed to inject simulation payload.");
        setLoadingAction(null);
      }
    } catch (err) {
      alert("Error reaching AI Analyzer backend.");
      setLoadingAction(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          ></motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-slate-950 border-2 border-indigo-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.15)] ring-1 ring-white/10"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
                  <Terminal size={22} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white leading-none mb-1">Interactive Sandbox</h2>
                  <p className="text-[10px] text-indigo-400/80 font-mono uppercase tracking-[0.2em]">Inject Telemetry & Security Payloads</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
               <p className="text-sm text-slate-400 leading-relaxed border-l-2 border-indigo-500/50 pl-4">
                 Use this panel to simulate critical security and infrastructure events. These actions inject <strong>mock Prometheus/WAF alerts</strong> directly into the Nexus AI Analyzer pipeline, allowing you to observe the dashboard's real-time diagnostic and auto-remediation behaviors without requiring actual server attacks.
               </p>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* SSH Brute Force */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-rose-500/20 hover:border-rose-500/50 transition-colors group">
                     <div className="flex items-center gap-3 mb-3">
                        <ShieldAlert size={18} className="text-rose-500" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-tight">SSH Brute Force</h3>
                     </div>
                     <p className="text-[10px] text-slate-400 mb-4 h-8 shrink-0">Triggers 50+ rapid failed logins. Tests IPS/Fail2Ban response via AI.</p>
                     <button
                       onClick={() => simulateAttack('SSH_BRUTE_FORCE', 'VPS-LON-01')}
                       disabled={loadingAction !== null}
                       className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[10px] uppercase tracking-widest border border-rose-500/30 rounded-xl transition-all flex justify-center items-center h-10"
                     >
                       {loadingAction === 'SSH_BRUTE_FORCE' ? <Activity className="animate-spin" size={16} /> : 'Attack VPS-LON-01'}
                     </button>
                  </div>

                  {/* SQL Injection */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-orange-500/20 hover:border-orange-500/50 transition-colors group">
                     <div className="flex items-center gap-3 mb-3">
                        <Skull size={18} className="text-orange-500" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-tight">SQL Injection (WAF)</h3>
                     </div>
                     <p className="text-[10px] text-slate-400 mb-4 h-8 shrink-0">Simulates `UNION SELECT` payloads aimed at authentication endpoints.</p>
                     <button
                       onClick={() => simulateAttack('SQL_INJECTION', 'demo-bank.io')}
                       disabled={loadingAction !== null}
                       className="w-full py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold text-[10px] uppercase tracking-widest border border-orange-500/30 rounded-xl transition-all flex justify-center items-center h-10"
                     >
                       {loadingAction === 'SQL_INJECTION' ? <Activity className="animate-spin" size={16} /> : 'Attack demo-bank.io'}
                     </button>
                  </div>

                  {/* DDoS */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-indigo-500/20 hover:border-indigo-500/50 transition-colors group">
                     <div className="flex items-center gap-3 mb-3">
                        <Zap size={18} className="text-indigo-500" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-tight">Volumetric DDoS</h3>
                     </div>
                     <p className="text-[10px] text-slate-400 mb-4 h-8 shrink-0">Massive UDP flood simulation (5000% ingress spike) on load balancers.</p>
                     <button
                       onClick={() => simulateAttack('DDOS_SPIKE', 'nexus-core-api.dev')}
                       disabled={loadingAction !== null}
                       className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold text-[10px] uppercase tracking-widest border border-indigo-500/30 rounded-xl transition-all flex justify-center items-center h-10"
                     >
                       {loadingAction === 'DDOS_SPIKE' ? <Activity className="animate-spin" size={16} /> : 'Flood API Gateway'}
                     </button>
                  </div>

                  {/* Resource Exhaustion */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-amber-500/20 hover:border-amber-500/50 transition-colors group">
                     <div className="flex items-center gap-3 mb-3">
                        <Database size={18} className="text-amber-500" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-tight">Memory Leak (OOM)</h3>
                     </div>
                     <p className="text-[10px] text-slate-400 mb-4 h-8 shrink-0">Simulates a runaway process eating 100% RAM triggering Kernel OOM Killer.</p>
                     <button
                       onClick={() => simulateAttack('RESOURCE_EXHAUSTION', 'VPS-NYC-02')}
                       disabled={loadingAction !== null}
                       className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-[10px] uppercase tracking-widest border border-amber-500/30 rounded-xl transition-all flex justify-center items-center h-10"
                     >
                       {loadingAction === 'RESOURCE_EXHAUSTION' ? <Activity className="animate-spin" size={16} /> : 'Crash VPS-NYC-02'}
                     </button>
                  </div>

               </div>
               
               <div className="pt-2 text-center">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                     <Shield size={10} /> Safe Mode Enforced
                  </span>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
