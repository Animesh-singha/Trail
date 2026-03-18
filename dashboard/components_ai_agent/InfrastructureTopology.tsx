'use client';

import { motion } from 'framer-motion';
import { Globe, Shield, Cpu, Database, Server, ArrowRight, Activity } from 'lucide-react';

export default function InfrastructureTopology() {
  const nodes = [
    { id: 'web', label: 'External Cluster', icon: Globe, color: 'bg-cyan-500', x: 50, y: 50 },
    { id: 'fw', label: 'Neural Shield', icon: Shield, color: 'bg-rose-500', x: 250, y: 50 },
    { id: 'lb', label: 'Traffic Director', icon: Cpu, color: 'bg-indigo-500', x: 450, y: 50 },
    { id: 'api1', label: 'Core Node 01', icon: Server, color: 'bg-cyan-600', x: 700, y: 0 },
    { id: 'api2', label: 'Core Node 02', icon: Server, color: 'bg-cyan-600', x: 700, y: 100 },
    { id: 'db', label: 'Primary Matrix', icon: Database, color: 'bg-indigo-600', x: 950, y: 50 },
  ];

  const connections = [
    { from: 'web', to: 'fw' },
    { from: 'fw', to: 'lb' },
    { from: 'lb', to: 'api1' },
    { from: 'lb', to: 'api2' },
    { from: 'api1', to: 'db' },
    { from: 'api2', to: 'db' },
  ];

  return (
    <div className="glass-panel p-8 rounded-[32px] min-h-[450px] overflow-hidden relative border border-white/[0.03] bg-black/20">
      <div className="flex justify-between items-center mb-10 relative z-10">
         <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-3">
            <Activity size={14} className="text-cyan-500/50" /> NEURAL TOPOLOGY INTERFACE
         </h3>
         <div className="flex gap-6 text-[9px] uppercase font-black tracking-[0.15em]">
            <span className="flex items-center gap-2 text-cyan-400 text-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
               <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div> 
               Synchronized
            </span>
            <span className="flex items-center gap-2 text-white/10 italic">
               <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div> 
               Standby Mode
            </span>
         </div>
      </div>

      <div className="relative w-full h-[320px] mt-4">
        <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_0_8px_rgba(6,182,212,0.1)]">
          {connections.map((conn, i) => {
            const fromNode = nodes.find(n => n.id === conn.from)!;
            const toNode = nodes.find(n => n.id === conn.to)!;
            return (
              <motion.line
                key={i}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.15 }}
                transition={{ duration: 2, delay: i * 0.3, ease: "easeInOut" }}
                x1={`${(fromNode.x / 1000) * 100}%`}
                y1={`${fromNode.y + 25}%`}
                x2={`${(toNode.x / 1000) * 100}%`}
                y2={`${toNode.y + 25}%`}
                stroke="white"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
            );
          })}
        </svg>

        {nodes.map((node, i) => (
          <motion.div
            key={node.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, delay: i * 0.15 }}
            style={{ 
               left: `${(node.x / 1000) * 100}%`,
               top: `${node.y + 10}%`,
               transform: 'translate(-50%, -50%)'
            }}
            className="absolute flex flex-col items-center gap-4 group cursor-pointer"
          >
            <div className={`p-5 rounded-[22px] ${node.color} shadow-[0_0_20px_rgba(0,0,0,0.4)] group-hover:scale-110 transition-all duration-500 relative border border-white/10`}>
               <node.icon className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" size={26} />
               <div className="absolute -inset-3 bg-inherit opacity-0 group-hover:opacity-20 blur-2xl transition-all duration-700 rounded-full"></div>
            </div>
            <div className="text-center space-y-1">
               <div className="text-[10px] font-black text-white uppercase tracking-tighter group-hover:text-cyan-400 transition-colors">{node.label}</div>
               <div className="text-[8px] text-white/20 font-black tracking-[0.1em] font-mono">LAT_S: {Math.floor(Math.random() * 15) + 2}ms</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 p-5 bg-white/[0.01] rounded-[22px] border border-white/[0.05] flex items-center justify-between relative z-10 transition-all hover:bg-white/[0.02]">
         <div className="text-[9px] text-white/20 font-black tracking-[.2em] flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse"></span>
            ALL_MATRIX_CHANNELS_SYNCHRONIZED_OPERATIONAL
         </div>
         <div className="text-[9px] text-cyan-400/40 font-black uppercase tracking-[0.25em] cursor-pointer hover:text-cyan-400 transition-all flex items-center gap-2 group">
            Analysis Protocol <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
         </div>
      </div>
    </div>
  );
}

function ActivityIcon({ size }: { size: number }) {
  return (
    <svg 
      width={size} height={size} 
      viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
