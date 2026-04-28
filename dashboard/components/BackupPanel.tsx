'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Download, Globe, FileArchive, CheckCircle2, AlertCircle, Clock, HardDrive } from 'lucide-react';

export default function BackupPanel() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch (err) {
      console.error('Failed to fetch backup history');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101';
    setBackupStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/v1/control/backup`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
        },
        body: JSON.stringify({ target: 'postgresql' })
      });
      
      if (res.ok) {
        setBackupStatus('success');
        setTimeout(() => {
           setBackupStatus('idle');
           fetchBackups();
        }, 2000);
      } else {
        setBackupStatus('error');
      }
    } catch (err) {
      setBackupStatus('error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
           <h2 className="text-2xl font-bold mb-2 flex items-center gap-3 text-emerald-100 uppercase tracking-tight">
             <Database className="text-emerald-500" /> Infrastructure Backups
           </h2>
           <p className="text-slate-400 text-sm max-w-xl">
             Centralized management for PostgreSQL snapshots and file-system archives across the entire fleet.
           </p>
        </div>
        
        <div className="flex gap-4">
           {backupStatus === 'loading' ? (
             <button disabled className="px-6 py-3 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-xl border border-indigo-500/30 flex items-center gap-2 animate-pulse">
               <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
               Snapshotting...
             </button>
           ) : (
             <button 
               onClick={handleBackup}
               className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-2xl shadow-indigo-500/20 transition-all flex items-center gap-2"
             >
               <Download size={16} /> Trigger Global Snapshot
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Backups Table */}
        <div className="lg:col-span-2 glass-panel rounded-3xl overflow-hidden border border-slate-800/60">
           <div className="px-8 py-6 border-b border-slate-800/60 bg-slate-900/30 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                 <Clock size={12} /> Backup History (Last 30 Days)
              </h3>
              <span className="text-[9px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded">Auto-Rotate Active</span>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-950/40">
                       <th className="px-8 py-4">Filename</th>
                       <th className="px-4 py-4">Target</th>
                       <th className="px-4 py-4 text-center">Size</th>
                       <th className="px-4 py-4">Created At</th>
                       <th className="px-8 py-4 text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/40">
                    {loading ? (
                      [1,2,3].map(i => (
                        <tr key={i} className="animate-pulse">
                           <td colSpan={5} className="px-8 py-6 h-12 bg-slate-900/10"></td>
                        </tr>
                      ))
                    ) : backups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-slate-500 text-xs italic">
                           No backup history found. Trigger your first snapshot to see it here.
                        </td>
                      </tr>
                    ) : (
                      backups.map((b, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                 <FileArchive size={16} className="text-indigo-400" />
                                 <span className="text-xs font-bold text-slate-200 font-mono truncate max-w-[200px]">{b.filename}</span>
                              </div>
                           </td>
                           <td className="px-4 py-5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-800 px-2 py-1 rounded-lg">{b.target}</span>
                           </td>
                           <td className="px-4 py-5 text-center">
                              <span className="text-xs font-bold text-emerald-400 font-mono">{b.size}</span>
                           </td>
                           <td className="px-4 py-5">
                              <div className="text-[10px] text-slate-400 font-medium">
                                 {new Date(b.timestamp).toLocaleDateString()}
                                 <span className="block text-[8px] text-slate-600 font-mono">{new Date(b.timestamp).toLocaleTimeString()}</span>
                              </div>
                           </td>
                           <td className="px-8 py-5 text-right">
                              <button className="p-2 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-all" title="Download to local">
                                 <Download size={14} />
                              </button>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Storage Stats / Info */}
        <div className="space-y-6">
           <div className="glass-panel p-8 rounded-3xl border border-slate-800/60 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Storage Insight</h4>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                       <span>Backup Vault Usage</span>
                       <span className="text-white">1.2GB / 10GB</span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '12%' }} className="h-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></motion.div>
                    </div>
                 </div>
                 
                 <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/60">
                    <div className="flex items-start gap-4">
                       <HardDrive className="text-slate-500 shrink-0 mt-1" size={18} />
                       <div>
                          <div className="text-xs font-bold text-slate-200 mb-1">Off-Site Sync</div>
                          <p className="text-[10px] text-slate-500 leading-relaxed">Your backups are automatically replicated to the encrypted Hub storage every 24 hours.</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="glass-panel p-8 rounded-3xl border border-rose-500/10 bg-rose-500/[0.02]">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
                    <AlertCircle className="text-rose-500" size={16} />
                 </div>
                 <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Safety Protocol</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Manual snapshots should be taken before any major PM2 deploy. Backups are stored in <strong>PostgreSQL Custom Format</strong> and require <code className="text-rose-300 font-mono">pg_restore</code> for recovery.
              </p>
              <button className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest border border-slate-800 rounded-xl transition-all">
                 Request Restore Session
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
