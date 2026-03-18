'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Clock, CheckCircle, Flame, ShieldAlert } from 'lucide-react';

interface AlertTimelineProps {
  incidents: any[];
}

export default function AlertTimeline({ incidents }: AlertTimelineProps) {
  // Mock some system events for density
  const systemEvents = [
    { id: 's1', type: 'system', alert_name: 'Nginx Configuration Reloaded', service: 'vps-lon-01', timestamp: new Date(Date.now() - 500000).toISOString(), severity: 'INFO' },
    { id: 's2', type: 'system', alert_name: 'Database Backup Completed', service: 'all-nodes', timestamp: new Date(Date.now() - 1200000).toISOString(), severity: 'SUCCESS' },
  ];

  const allEvents = [
    ...incidents.map(i => ({ ...i, type: 'incident' })),
    ...systemEvents
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="glass-panel p-6 rounded-[28px] h-full flex flex-col border border-white/[0.03] bg-black/20">
      <div className="flex justify-between items-center mb-8 relative z-10">
        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-3">
          <Clock size={12} className="text-cyan-500/50" /> OPERATIONAL EVENT DEEP-SCAN
        </h3>
        <span className="text-[8px] font-black text-cyan-400/40 bg-cyan-500/5 px-2 py-0.5 rounded-full border border-cyan-500/10 uppercase tracking-widest">REAL-TIME</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-3 space-y-8 custom-scrollbar relative z-10">
        {allEvents.map((event, i) => (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.6 }}
            className="relative pl-8 border-l border-white/[0.05] pb-1 group"
          >
            {/* Timeline Dot */}
            <div className={`absolute -left-[6.5px] top-0 w-3 h-3 rounded-full border-2 border-[#050B18] z-20 transition-all group-hover:scale-125 ${
              event.severity === 'CRITICAL' ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]' : 
              event.severity === 'WARNING' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
              event.severity === 'SUCCESS' ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'bg-white/10'
            }`}></div>

            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-black text-white/80 leading-tight uppercase tracking-tight group-hover:text-white transition-colors">{event.alert_name}</span>
              <span className="text-[9px] text-white/10 font-black font-mono tracking-tighter">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            
            <div className="flex items-center gap-3">
                <span className="text-[9px] text-white/20 font-black uppercase tracking-[0.1em] flex items-center gap-1.5 group-hover:text-cyan-500/40 transition-colors">
                   <div className="w-1 h-1 rounded-full bg-current opacity-30"></div>
                   {event.service}
                </span>
                {event.severity === 'CRITICAL' && (
                  <motion.span 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-[8px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-1 bg-rose-500/5 px-2 py-0.5 rounded-full border border-rose-500/20"
                  >
                     <Flame size={8} fill="currentColor" /> CRITICAL_FAILURE
                  </motion.span>
                )}
            </div>
          </motion.div>
        ))}
        
        {allEvents.length === 0 && (
          <div className="py-24 text-center opacity-10">
             <ShieldAlert size={40} className="mx-auto mb-6 text-white" />
             <p className="text-[10px] uppercase font-black tracking-[0.4em]">Neural Scanner Idle...</p>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
        <button className="w-full py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-[9px] font-black text-white/20 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 uppercase tracking-[0.3em] transition-all duration-500 group">
           Access Deployment Matrix <span className="inline-block group-hover:translate-x-1 transition-transform ml-2">→</span>
        </button>
      </div>
    </div>
  );
}
