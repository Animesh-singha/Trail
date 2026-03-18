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
    <div className="glass-panel p-6 rounded-2xl h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <Clock size={12} className="text-indigo-500" /> Operational Alert Feed
        </h3>
        <span className="text-[9px] font-bold text-slate-600 uppercase">Live (50ms pol)</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
        {allEvents.map((event, i) => (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative pl-6 border-l border-slate-800 pb-2"
          >
            {/* Timeline Dot */}
            <div className={`absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-[#02040a] ${
              event.severity === 'CRITICAL' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 
              event.severity === 'WARNING' ? 'bg-amber-500' :
              event.severity === 'SUCCESS' ? 'bg-emerald-500' : 'bg-slate-600'
            }`}></div>

            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] font-bold text-white leading-tight uppercase tracking-tight">{event.alert_name}</span>
              <span className="text-[8px] text-slate-600 font-mono">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            
            <div className="flex items-center gap-2">
               <span className="text-[9px] text-slate-500 font-mono lowercase tracking-tighter truncate max-w-[120px]">{event.service}</span>
               {event.severity === 'CRITICAL' && (
                 <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter flex items-center gap-1">
                    <Flame size={8} /> HOT
                 </span>
               )}
            </div>
          </motion.div>
        ))}
        
        {allEvents.length === 0 && (
          <div className="py-20 text-center opacity-30">
             <ShieldAlert size={32} className="mx-auto mb-4" />
             <p className="text-xs uppercase font-black">Scanning for events...</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800/50">
        <button className="w-full text-[9px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors">
          View Audit History →
        </button>
      </div>
    </div>
  );
}
