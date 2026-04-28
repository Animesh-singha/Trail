'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Shield, Cpu, Database, Server, User, Globe2, Network, Activity } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface TopologyNode {
  id: string;
  label: string;
  type: 'user' | 'domain' | 'gateway' | 'app' | 'database';
  status: 'online' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

interface TopologyEdge {
  from: string;
  to: string;
  label?: string;
}

export default function InfrastructureTopology({ incidents = [] }: { incidents?: any[] }) {
  const [data, setData] = useState<{ nodes: TopologyNode[], edges: TopologyEdge[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopology = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/visibility/topology`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Topology Load Failed', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopology();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'user': return User;
      case 'domain': return Globe2;
      case 'gateway': return Shield;
      case 'app': return Cpu;
      case 'database': return Database;
      default: return Server;
    }
  };

  const getColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'error': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  // Simple layered layout logic
  const getPosition = (type: string, index: number, totalInType: number) => {
    const layers = { user: 0, domain: 1, gateway: 2, app: 3, database: 4 };
    const x = (layers[type as keyof typeof layers] ?? 0) * 250;
    const y = index * 100 + (500 - (totalInType * 100)) / 2; // Center vertically
    return { x, y };
  };

  const nodesByType = data.nodes.reduce((acc, node) => {
    acc[node.type] = acc[node.type] || [];
    acc[node.type].push(node);
    return acc;
  }, {} as Record<string, TopologyNode[]>);

  const layedNodes = data.nodes.map(node => {
    const index = nodesByType[node.type].indexOf(node);
    const pos = getPosition(node.type, index, nodesByType[node.type].length);
    return { ...node, ...pos };
  });

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center opacity-30">
        <Activity className="animate-spin text-slate-500 w-12 h-12" />
    </div>
  );

  return (
    <div className="glass-panel p-8 rounded-3xl min-h-[500px] overflow-x-auto relative bg-[#060910]/40 border border-slate-800/50 shadow-2xl">
      <div className="flex justify-between items-center mb-12">
         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Network size={14} /> Full-Stack Dependency Graph
         </h3>
         <div className="flex gap-6 text-[9px] uppercase font-black text-slate-500 tracking-widest">
            <span className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-400/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Service Operational
            </span>
            <span className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 rounded-md border border-amber-500/20 text-amber-400/80">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Latency Warning
            </span>
         </div>
      </div>

      <div className="relative" style={{ width: '1100px', height: '400px' }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
             <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#1e293b" />
             </marker>
          </defs>
          {data.edges.map((edge, i) => {
            const fromNode = layedNodes.find(n => n.id === edge.from);
            const toNode = layedNodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            return (
              <g key={i}>
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.15 }}
                  transition={{ duration: 1.5, delay: i * 0.1 }}
                  d={`M ${fromNode.x + 50} ${fromNode.y + 40} L ${toNode.x - 50} ${toNode.y + 40}`}
                  stroke="white"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="4 4"
                />
                {edge.label && (
                  <text 
                    x={(fromNode.x + toNode.x) / 2} 
                    y={(fromNode.y + toNode.y) / 2 + 35} 
                    className="text-[8px] font-mono fill-slate-600 tracking-tighter uppercase"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {layedNodes.map((node, i) => {
          const Icon = getIcon(node.type);
          const isWarning = node.status !== 'online';
          
          return (
            <motion.div
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, delay: i * 0.05 }}
              style={{ 
                 left: `${node.x}px`,
                 top: `${node.y}px`,
              }}
              className="absolute w-[180px] flex flex-col items-center gap-3 group z-10"
            >
              <div className={`p-4 rounded-2xl ${getColor(node.status)} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform cursor-pointer relative`}>
                 <Icon className="text-white" size={24} />
                 <div className={`absolute -inset-2 bg-inherit opacity-20 blur-xl transition-opacity rounded-full ${isWarning ? 'animate-pulse opacity-40' : 'group-hover:opacity-40'}`}></div>
                 <div className={`absolute -inset-2 bg-slate-500 opacity-0 blur-lg transition-opacity rounded-full ${isWarning ? 'animate-pulse opacity-20' : 'group-hover:opacity-20'}`}></div>
              </div>
              <div className="text-center">
                 <div className="text-[10px] font-black uppercase tracking-tight text-white mb-0.5">{node.label}</div>
                 <div className="text-[9px] text-slate-500 font-mono tracking-tighter italic">
                    {node.type} • {node.status === 'online' ? 'ok' : node.status}
                 </div>
                  {node.metadata?.port && (
                    <div className="text-[8px] text-slate-400 font-bold mt-1 bg-white/5 border border-slate-700/30 px-1.5 py-0.5 rounded uppercase">
                       Port {node.metadata.port}
                    </div>
                  )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-500 uppercase font-black">
         <div className="flex gap-4">
            <span className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-500 rounded-full"></div> Discovery: v2.4.0-Live</span>
            <span className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-500 rounded-full"></div> Refresh Rate: 60s</span>
         </div>
         <div className="text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 cursor-help transition-all">
            AI Impact Simulator Off-line
         </div>
      </div>
    </div>
  );
}
