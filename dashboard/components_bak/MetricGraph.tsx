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
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label} TREND (24H)</h4>
          <div className="text-xl font-black text-white">
            {data[data.length - 1]}<span className="text-[10px] text-slate-500 ml-1 font-medium">{unit}</span>
          </div>
        </div>
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
          {data[data.length - 1] > data[0] ? '↑' : '↓'} {Math.abs(((data[data.length - 1] - data[0]) / (data[0] || 1)) * 100).toFixed(1)}%
        </div>
      </div>

      <div className="h-24 flex items-end gap-1 px-1">
        {data.map((val, i) => {
          const height = ((val - min) / (range || 1)) * 80 + 20;
          return (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: i * 0.02, duration: 0.5 }}
              className={`flex-1 rounded-t-sm bg-${color}-500/30 group-hover:bg-${color}-500/50 transition-colors relative group/bar`}
            >
               <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 font-mono text-white pointer-events-none">
                  {val}{unit}
               </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none"></div>
    </div>
  );
}
