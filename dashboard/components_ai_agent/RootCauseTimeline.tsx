'use client';

import { motion } from 'framer-motion';
import { Terminal, Database, Activity, Zap, Shield, Clock, Info, AlertTriangle, CheckCircle, Package } from 'lucide-react';

interface TimelineEvent {
  id: string;
  timestamp: string;
  source: 'metric' | 'log' | 'deploy' | 'action' | 'ai';
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  message: string;
  service: string;
  metadata?: any;
}

interface RootCauseTimelineProps {
  events: TimelineEvent[];
  isLoading?: boolean;
}

export default function RootCauseTimeline({ events, isLoading }: RootCauseTimelineProps) {
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'metric': return <Zap size={14} />;
      case 'log': return <Database size={14} />;
      case 'deploy': return <Package size={14} />;
      case 'action': return <Terminal size={14} />;
      case 'ai': return <Shield size={14} />;
      default: return <Info size={14} />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-rose-500 shadow-[0_0_12px_#f43f5e]';
      case 'WARNING': return 'bg-amber-500 shadow-[0_0_8px_#f59e0b]';
      case 'SUCCESS': return 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
      default: return 'bg-slate-600';
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 opacity-30">
       <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
       <span className="text-[10px] font-black uppercase tracking-widest">Reconstructing failure timeline...</span>
    </div>
  );

  return (
    <div className="relative pl-6 space-y-0 text-white/40 custom-scrollbar">
      {/* Central Timeline Line */}
      <div className="absolute left-8 top-4 bottom-4 w-[1px] bg-white/5 shadow-[0_0_10px_rgba(255,255,255,0.05)]"></div>

      {events.map((event, i) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.6 }}
          className="relative pl-14 pb-10 group"
        >
          {/* Timeline Dot with Icon Background */}
          <div className="absolute left-0 top-0 w-16 h-16 flex items-center justify-center rounded-[22px] bg-[#050B18] border border-white/5 z-10 group-hover:border-cyan-500/30 transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]">
             <div className="text-white/20 group-hover:text-cyan-400 transition-colors">
               {getSourceIcon(event.source)}
             </div>
             {/* Tiny Severity Indicator */}
             <div className={`absolute -right-1.5 -top-1.5 w-4 h-4 rounded-full border-[3px] border-[#0b0f19] z-20 transition-transform group-hover:scale-125 ${getSeverityStyle(event.severity)}`}></div>
          </div>

          <div className="pt-1">
            <div className="flex items-center gap-4 mb-2">
               <span className="text-[10px] font-black font-mono text-white/20 tracking-tighter">
                 {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
               </span>
               <span className="px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500/50">
                 {event.source}
               </span>
               <div className="w-1 h-1 rounded-full bg-white/10 italic"></div>
               <span className="text-[10px] font-black text-white/30 uppercase tracking-tighter group-hover:text-white/60 transition-colors">
                 {event.service}
               </span>
            </div>
            
            <p className={`text-base font-black leading-tight tracking-tight drop-shadow-sm ${
              event.severity === 'CRITICAL' ? 'text-rose-400' : 
              event.severity === 'WARNING' ? 'text-amber-400' : 'text-white/90'
            }`}>
              {event.message}
            </p>

            {/* Event Meta/Action Block */}
            {event.metadata && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] text-[10px] space-y-2 group-hover:border-cyan-500/10 transition-colors"
              >
                 {event.metadata.reason && (
                    <p className="text-cyan-400 font-black uppercase tracking-[0.1em] flex items-center gap-2">
                       <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse"></div>
                       ROOT_CAUSE: {event.metadata.reason}
                    </p>
                 )}
                 {event.metadata.user && (
                    <p className="text-white/20 font-black italic uppercase tracking-widest">TRIGGER_AUTHORITY: {event.metadata.user}</p>
                 )}
              </motion.div>
            )}
          </div>
        </motion.div>
      ))}

      {events.length === 0 && (
        <div className="py-24 text-center opacity-10 border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center gap-4">
           <Clock size={48} strokeWidth={1} className="text-white" />
           <p className="text-[10px] uppercase font-black tracking-[0.4em]">Awaiting Event Correlation...</p>
        </div>
      )}
    </div>
  );
}
