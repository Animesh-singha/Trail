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
    <div className="relative pl-4 space-y-0 text-slate-400">
      {/* Central Timeline Line */}
      <div className="absolute left-6 top-2 bottom-2 w-px bg-slate-800"></div>

      {events.map((event, i) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="relative pl-12 pb-8 group"
        >
          {/* Timeline Dot with Icon Background */}
          <div className={`absolute left-0 top-0 w-12 h-12 flex items-center justify-center rounded-xl bg-slate-950 border border-slate-800 z-10 group-hover:border-slate-700 transition-colors`}>
             <div className="text-slate-500 group-hover:text-indigo-400 transition-colors">
               {getSourceIcon(event.source)}
             </div>
             {/* Tiny Severity Indicator */}
             <div className={`absolute -right-1 -top-1 w-3 h-3 rounded-full border-2 border-[#0b0f19] ${getSeverityStyle(event.severity)}`}></div>
          </div>

          <div className="pt-0.5">
            <div className="flex items-center gap-3 mb-1">
               <span className="text-[10px] font-mono text-slate-500">
                 {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
               </span>
               <span className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[8px] font-black uppercase tracking-tighter text-slate-500">
                 {event.source}
               </span>
               <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight truncate max-w-[150px]">
                 {event.service}
               </span>
            </div>
            
            <p className={`text-sm font-bold leading-snug ${
              event.severity === 'CRITICAL' ? 'text-rose-200' : 
              event.severity === 'WARNING' ? 'text-amber-200' : 'text-slate-100'
            }`}>
              {event.message}
            </p>

            {/* Event Meta/Action Block */}
            {event.metadata && (
              <div className="mt-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800/50 text-[10px] space-y-2">
                 {event.metadata.reason && <p className="text-indigo-400 font-medium">Cause: {event.metadata.reason}</p>}
                 {event.metadata.user && <p className="text-slate-500 italic">Triggered by: {event.metadata.user}</p>}
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {events.length === 0 && (
        <div className="py-20 text-center opacity-30 border-2 border-dashed border-slate-800 rounded-3xl">
           <Clock size={32} className="mx-auto mb-4" />
           <p className="text-xs uppercase font-black">No correlated events detected</p>
        </div>
      )}
    </div>
  );
}
