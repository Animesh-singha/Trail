'use client';

import { motion } from 'framer-motion';

interface MetricGraphProps {
  data: number[];
  label: string;
  color: string;
  unit: string;
}

export default function MetricGraph({ data, label, color, unit }: MetricGraphProps) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min;

  return (
    <div className="glass-panel p-6 rounded-[24px] border border-white/[0.03] hover:border-cyan-500/30 transition-all group relative overflow-hidden bg-black/20">
      <div className="flex justify-between items-end mb-8 relative z-10">
        <div>
          <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1.5">{label} ANALYSIS</h4>
          <div className="text-2xl font-black text-white tracking-tighter">
            {data[data.length - 1]}<span className="text-[10px] text-white/20 ml-1 font-black lowercase opacity-40">{unit}</span>
          </div>
        </div>
        <div className={`text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 ${data[data.length - 1] > data[0] ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'} border`}>
          {data[data.length - 1] > data[0] ? '↑' : '↓'} {Math.abs(((data[data.length - 1] - data[0]) / (data[0] || 1)) * 100).toFixed(1)}%
        </div>
      </div>

      <div className="h-28 flex items-end gap-1.5 px-1 relative z-10">
        {data.map((val, i) => {
          const height = ((val - min) / (range || 1)) * 70 + 30;
          return (
            <motion.div
              key={i}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${height}%`, opacity: 1 }}
              transition={{ delay: i * 0.03, duration: 0.8, ease: "circOut" }}
              className={`flex-1 rounded-t-lg transition-all duration-500 relative group/bar ${color === 'cyan' ? 'bg-cyan-500/20 group-hover:bg-cyan-500/40' : 'bg-indigo-500/20 group-hover:bg-indigo-500/40'}`}
            >
               <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-10 transition-opacity rounded-t-lg"></div>
               <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#0B0F19] border border-white/10 text-[9px] px-2 py-1 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all scale-90 group-hover/bar:scale-100 whitespace-nowrap z-20 font-black text-white shadow-2xl pointer-events-none">
                  {val}{unit}
               </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Scanning Line Effect */}
      <motion.div 
        animate={{ y: [0, 150, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 h-[1px] bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.3)] pointer-events-none z-0"
      />

      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/[0.02] to-transparent pointer-events-none"></div>
    </div>
  );
}
