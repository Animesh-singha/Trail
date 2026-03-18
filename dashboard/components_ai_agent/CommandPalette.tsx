'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Terminal, Server, Globe, Shield, Command } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, target: string) => void;
}

export default function CommandPalette({ isOpen, onClose, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const suggestions = [
    { id: 'restart-nginx', label: 'Restart Nginx (All Nodes)', icon: Terminal, category: 'Actions' },
    { id: 'cleanup-disk', label: 'Cleanup Disk (All Nodes)', icon: Server, category: 'Maintenance' },
    { id: 'go-infra', label: 'Go to Infrastructure Tab', icon: Globe, category: 'Navigation' },
    { id: 'go-incidents', label: 'Go to Incidents Tab', icon: Shield, category: 'Navigation' },
  ].filter(s => s.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[12vh] px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-3xl"
      ></motion.div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-[#050B18]/90 border border-white/10 rounded-[32px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        <div className="flex items-center px-8 py-6 border-b border-white/5 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent"></div>
          <Search className="text-cyan-400 mr-5 relative z-10" size={24} />
          <input 
            autoFocus
            type="text"
            placeholder="Search neural command matrix..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-white text-xl font-black placeholder:text-white/10 relative z-10 tracking-tight"
          />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-[9px] font-black text-white/30 relative z-10 uppercase tracking-widest">
            <Command size={10} /> <span>ESC</span>
          </div>
        </div>
        
        <div className="max-h-[450px] overflow-y-auto p-4 custom-scrollbar">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => { onAction(s.id, 'global'); onClose(); }}
              className="w-full flex items-center gap-5 px-6 py-4 rounded-[22px] hover:bg-white/[0.03] group text-left transition-all duration-300 relative border border-transparent hover:border-white/5"
            >
              <div className="p-3 bg-white/[0.02] rounded-2xl group-hover:bg-cyan-500/10 text-white/20 group-hover:text-cyan-400 transition-all duration-500 border border-white/5 group-hover:border-cyan-500/30 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                <s.icon size={20} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-black text-white/80 group-hover:text-white transition-colors uppercase tracking-tight">{s.label}</div>
                <div className="text-[8px] text-white/10 uppercase font-black tracking-[0.3em] group-hover:text-cyan-500/30 transition-colors mt-1.5">{s.category} SYSTEM CHIP</div>
              </div>
              <div className="text-[9px] font-black text-white/5 group-hover:text-cyan-400/20 font-mono tracking-widest transition-colors opacity-0 group-hover:opacity-100">EXEC_ENTER</div>
            </button>
          ))}
          
          {suggestions.length === 0 && (
            <div className="py-20 text-center text-white/10 text-[10px] uppercase font-black tracking-[0.3em] italic">
              [ANALYSIS_ERROR] No matches found in neural command matrix
            </div>
          )}
        </div>
        
        <div className="px-8 py-4 bg-white/[0.01] border-t border-white/5 flex justify-between items-center text-[9px] text-white/10 font-black uppercase tracking-[0.2em]">
           <div className="flex items-center gap-6">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400/20"></span> ↑↓ NAVIGATE</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400/20"></span> ↵ EXECUTE</span>
           </div>
           <div className="flex gap-6 italic opacity-50">
              <span>CTRL + K TOGGLE</span>
              <span>NEXUS_OS // NEURAL_V1.4.0</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
