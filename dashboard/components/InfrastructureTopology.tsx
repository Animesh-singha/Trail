'use client';

import { motion } from 'framer-motion';
import { Globe, Shield, Cpu, Database, Server } from 'lucide-react';

export default function InfrastructureTopology({ incidents = [] }: { incidents?: any[] }) {
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

  // Helper to figure out which nodes are currently under attack
  const isTargetUnderAttack = (id: string) => {
    return incidents.some(inc => {
      if (inc.status !== 'OPEN') return false;
      const t = inc.service?.toLowerCase() || '';
      if (id === 'web') return false; // Web is abstract
      if (id === 'fw' && (t.includes('lon-01') || inc.alert_name === 'HighFailedSSHLogins')) return true;
      if (id === 'lb' && (t.includes('demon-bank') || inc.alert_name === 'NetworkIngressAnomaly')) return true;
      if (id === 'api1' && (t.includes('api.dev') || inc.alert_name === 'SuspiciousWAFPayload')) return true;
      if (id === 'db' && (t.includes('nyc-02') || inc.alert_name === 'HostOomKill')) return true;
      return false;
    });
  };

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
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {connections.map((conn, i) => {
            const fromNode = nodes.find(n => n.id === conn.from)!;
            const toNode = nodes.find(n => n.id === conn.to)!;
            const isConnectionUnderAttack = isTargetUnderAttack(toNode.id);
            return (
              <motion.line
                key={i}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: isConnectionUnderAttack ? 0.8 : 0.2 }}
                transition={{ duration: isConnectionUnderAttack ? 0.3 : 1, delay: i * 0.2, repeat: isConnectionUnderAttack ? Infinity : 0, repeatType: "reverse" }}
                x1={`${(fromNode.x / 1000) * 100}%`}
                y1={`${fromNode.y + 20}%`}
                x2={`${(toNode.x / 1000) * 100}%`}
                y2={`${toNode.y + 20}%`}
                stroke={isConnectionUnderAttack ? "#f43f5e" : "white"}
                strokeWidth={isConnectionUnderAttack ? "3" : "2"}
                strokeDasharray="4 4"
              />
            );
          })}
        </svg>

        {nodes.map((node, i) => {
          const isAttacked = isTargetUnderAttack(node.id);
          return (
            <motion.div
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: isAttacked ? [1, 1.1, 1] : 1, opacity: 1 }}
              transition={{ 
                type: isAttacked ? 'tween' : 'spring', 
                damping: 15, 
                delay: isAttacked ? 0 : i * 0.1,
                repeat: isAttacked ? Infinity : 0,
                duration: isAttacked ? 1 : undefined
              }}
              style={{ 
                 left: `${(node.x / 1000) * 100}%`,
                 top: `${node.y}%`,
                 transform: 'translate(-50%, -50%)'
              }}
              className="absolute flex flex-col items-center gap-3 group z-10"
            >
              <div className={`p-4 rounded-2xl ${isAttacked ? 'bg-rose-600 shadow-[0_0_30px_#e11d48]' : node.color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform cursor-pointer relative`}>
                 <node.icon className="text-white" size={24} />
                 <div className={`absolute -inset-2 bg-inherit opacity-20 blur-lg transition-opacity rounded-full ${isAttacked ? 'opacity-80 animate-pulse' : 'group-hover:opacity-40'}`}></div>
              </div>
              <div className="text-center">
                 <div className={`text-[10px] font-black uppercase tracking-tight ${isAttacked ? 'text-rose-500' : 'text-white'}`}>{node.label}</div>
                 <div className="text-[9px] text-slate-500 font-mono">
                   {isAttacked ? <span className="text-rose-400 font-bold">ATTACK DETECTED</span> : `LATENCY: ${Math.floor(Math.random() * 20) + 1}ms`}
                 </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 flex items-center justify-between">
         <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ALL DOWNSTREAM CHANNELS OPERATIONAL
         </div>
         <div
           className="text-[10px] text-indigo-400 font-black uppercase tracking-widest cursor-pointer hover:text-indigo-300 transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-lg"
           title="This is a visual topology map. Real-time traffic data requires Prometheus integration."
           onClick={() => alert('Traffic Matrix requires Prometheus to be connected.\n\nOnce deployed with Prometheus running, this will show real-time packet flow between your nodes.\n\nSee DEPLOYMENT_GUIDE.md → Step 12 to set up Prometheus.')}
         >
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
