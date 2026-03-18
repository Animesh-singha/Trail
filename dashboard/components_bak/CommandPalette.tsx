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
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
      ></motion.div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="relative w-full max-w-2xl bg-[#0d1117] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center px-6 py-4 border-b border-slate-800">
          <Search className="text-slate-500 mr-4" size={20} />
          <input 
            autoFocus
            type="text"
            placeholder="Search commands, servers, or sites..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-white text-lg font-medium placeholder:text-slate-600"
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-500">
            <Command size={10} /> <span className="mt-0.5">ESC</span>
          </div>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto p-2">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => { onAction(s.id, 'global'); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-400 group text-left transition-all"
            >
              <div className="p-2 bg-slate-900 rounded-lg group-hover:bg-indigo-500/20 text-slate-500 group-hover:text-indigo-400 transition-colors">
                <s.icon size={18} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-200 group-hover:text-white">{s.label}</div>
                <div className="text-[10px] text-slate-600 uppercase font-black tracking-widest">{s.category}</div>
              </div>
              <div className="text-[10px] font-mono text-slate-700 group-hover:text-indigo-500/50">ENTER</div>
            </button>
          ))}
          
          {suggestions.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              No commands found for "{query}"
            </div>
          )}
        </div>
        
        <div className="px-6 py-3 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-600 font-mono">
           <span>Navigate with ↑↓ and Enter</span>
           <span className="flex items-center gap-3">
              <span>CTRL + K to toggle</span>
              <span>Nexus Terminal v1.4.0</span>
           </span>
        </div>
      </motion.div>
    </div>
  );
}
