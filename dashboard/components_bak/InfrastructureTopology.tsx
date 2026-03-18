'use client';

import { motion } from 'framer-motion';
import { Globe, Shield, Cpu, Database, Server, ArrowRight } from 'lucide-react';

export default function InfrastructureTopology() {
  const nodes = [
    { id: 'web', label: 'Internet / Users', icon: Globe, color: 'bg-indigo-500', x: 50, y: 50 },
    { id: 'fw', label: 'Global Firewall', icon: Shield, color: 'bg-rose-500', x: 250, y: 50 },
    { id: 'lb', label: 'Load Balancer', icon: Cpu, color: 'bg-emerald-500', x: 450, y: 50 },
    { id: 'api1', label: 'API Cluster Node 01', icon: Server, color: 'bg-indigo-400', x: 700, y: 0 },
    { id: 'api2', label: 'API Cluster Node 02', icon: Server, color: 'bg-indigo-400', x: 700, y: 100 },
    { id: 'db', label: 'PostgreSQL Primary', icon: Database, color: 'bg-amber-500', x: 950, y: 50 },
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
    <div className="glass-panel p-8 rounded-3xl min-h-[400px] overflow-hidden relative">
      <div className="flex justify-between items-center mb-8">
         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ActivityIcon size={16} /> Global Topology Map
         </h3>
         <div className="flex gap-4 text-[10px] uppercase font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-700"></span> Standby</span>
         </div>
      </div>

      <div className="relative w-full h-[300px] mt-10">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((conn, i) => {
            const fromNode = nodes.find(n => n.id === conn.from)!;
            const toNode = nodes.find(n => n.id === conn.to)!;
            return (
              <motion.line
                key={i}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.2 }}
                transition={{ duration: 1, delay: i * 0.2 }}
                x1={`${(fromNode.x / 1000) * 100}%`}
                y1={`${fromNode.y + 20}%`}
                x2={`${(toNode.x / 1000) * 100}%`}
                y2={`${toNode.y + 20}%`}
                stroke="white"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            );
          })}
        </svg>

        {nodes.map((node, i) => (
          <motion.div
            key={node.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15, delay: i * 0.1 }}
            style={{ 
               left: `${(node.x / 1000) * 100}%`,
               top: `${node.y}%`,
               transform: 'translate(-50%, -50%)'
            }}
            className="absolute flex flex-col items-center gap-3 group"
          >
            <div className={`p-4 rounded-2xl ${node.color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform cursor-pointer relative`}>
               <node.icon className="text-white" size={24} />
               <div className="absolute -inset-2 bg-inherit opacity-20 blur-lg group-hover:opacity-40 transition-opacity rounded-full"></div>
            </div>
            <div className="text-center">
               <div className="text-[10px] font-black text-white uppercase tracking-tight">{node.label}</div>
               <div className="text-[9px] text-slate-500 font-mono">LATENCY: {Math.floor(Math.random() * 20) + 1}ms</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 flex items-center justify-between">
         <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ALL DOWNSTREAM CHANNELS OPERATIONAL
         </div>
         <div className="text-[10px] text-indigo-400 font-black uppercase tracking-widest cursor-pointer hover:underline">
            View Traffic Matrix →
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
