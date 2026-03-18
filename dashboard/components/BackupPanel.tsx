'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Download, Server as ServerIcon, Globe, FileArchive, CheckCircle2, AlertCircle } from 'lucide-react';

const myInfrastructure = [
  {
    vps_id: "vps-nyc-01",
    vps_name: "VPS-NYC-01 (Production)",
    ip: "100.97.103.94",
    hosted_websites: [
      { id: "site-yoforex", name: "yoforex.com", db_name: "nexus_db", path: "/var/www/yoforex" },
      { id: "site-backup", name: "backup_site.net", db_name: "backup_db", path: "/var/www/backup" }
    ]
  },
  {
    vps_id: "vps-lon-02",
    vps_name: "VPS-LON-02 (Analytics)",
    ip: "100.97.103.95",
    hosted_websites: [
      { id: "site-ai-analyzer", name: "ai-analyzer-prod", db_name: "ai_logs", path: "/opt/ai-analyzer" }
    ]
  }
];

export default function BackupPanel() {
  const [selectedVps, setSelectedVps] = useState(myInfrastructure[0].vps_id);
  const [backupStatuses, setBackupStatuses] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [backupMessages, setBackupMessages] = useState<Record<string, string>>({});

  const handleBackup = async (siteId: string, dbName: string) => {
    setBackupStatuses(prev => ({ ...prev, [siteId]: 'loading' }));
    try {
      const res = await fetch('http://localhost:3001/v1/control/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: dbName })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setBackupStatuses(prev => ({ ...prev, [siteId]: 'success' }));
        setBackupMessages(prev => ({ ...prev, [siteId]: `Backup complete: ${data.file || 'success.dump'}` }));
      } else {
        setBackupStatuses(prev => ({ ...prev, [siteId]: 'error' }));
        setBackupMessages(prev => ({ ...prev, [siteId]: data.error || 'Backup failed.' }));
      }
    } catch (err) {
      setBackupStatuses(prev => ({ ...prev, [siteId]: 'error' }));
      setBackupMessages(prev => ({ ...prev, [siteId]: 'Network or Server Error' }));
    }
    
    // Reset status after 5 seconds to allow another backup
    setTimeout(() => {
      setBackupStatuses(prev => ({ ...prev, [siteId]: 'idle' }));
    }, 5000);
  };

  const currentVps = myInfrastructure.find(v => v.vps_id === selectedVps) || myInfrastructure[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
           <h2 className="text-2xl font-bold mb-2 flex items-center gap-3 text-emerald-100 uppercase tracking-tight">
             <Database className="text-emerald-500" /> Website Asset Backups
           </h2>
           <p className="text-slate-400 text-sm max-w-xl">
             Independently manage database backups for each specific application hosted across your VPS fleet.
           </p>
        </div>
        
        {/* VPS Selector */}
        <div className="w-full md:w-72">
           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Target Server</label>
           <select 
             value={selectedVps} 
             onChange={(e) => setSelectedVps(e.target.value)}
             className="w-full bg-slate-900 border border-slate-700 text-emerald-400 text-xs font-bold rounded-xl px-4 py-3 focus:ring-1 focus:ring-emerald-500 outline-none appearance-none"
           >
             {myInfrastructure.map(vps => (
               <option key={vps.vps_id} value={vps.vps_id}>{vps.vps_name} ({vps.ip})</option>
             ))}
           </select>
        </div>
      </div>

      {/* Website Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentVps.hosted_websites.map(site => (
          <motion.div 
            key={site.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 rounded-2xl border border-slate-800/60 bg-[#0d1525] flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-6">
               <div>
                 <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1">
                   <Globe size={18} className="text-emerald-500" /> {site.name}
                 </h3>
                 <p className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                   DB: <span className="text-indigo-300 font-bold">{site.db_name}</span> | Path: <span className="text-slate-500">{site.path}</span>
                 </p>
               </div>
               <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-[9px] font-black tracking-widest uppercase">
                 Online
               </div>
            </div>

            <div className="space-y-4">
               {/* Database Backup Trigger */}
               <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-2">
                      <Database size={14} className="text-indigo-400"/> PostgreSQL Backup
                    </div>
                    <div className="text-[10px] text-slate-500">Generates a highly compressed .dump vault file</div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {backupStatuses[site.id] === 'loading' ? (
                      <div className="px-6 py-2.5 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg border border-indigo-500/30 flex items-center gap-2 animate-pulse">
                        <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </div>
                    ) : backupStatuses[site.id] === 'success' ? (
                      <div className="px-6 py-2.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30 flex items-center gap-2">
                        <CheckCircle2 size={14} /> Success
                      </div>
                    ) : backupStatuses[site.id] === 'error' ? (
                      <div className="px-6 py-2.5 bg-rose-500/20 text-rose-400 text-xs font-bold rounded-lg border border-rose-500/30 flex items-center gap-2">
                        <AlertCircle size={14} /> Failed
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleBackup(site.id, site.db_name)}
                        className="px-6 py-2.5 bg-indigo-500 text-white hover:bg-indigo-400 border border-indigo-400 shadow-lg shadow-indigo-500/20 text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                      >
                        <Download size={14} />
                        Trigger .dump
                      </button>
                    )}
                  </div>
               </div>
               
               {/* Status Messages generated by the backend */}
               <AnimatePresence>
                 {(backupStatuses[site.id] === 'error' || backupStatuses[site.id] === 'success') && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }} 
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     className={`text-[10px] font-mono px-3 py-2 rounded border ${backupStatuses[site.id] === 'success' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/5 text-rose-400 border-rose-500/20'}`}
                   >
                     {'>'} {backupMessages[site.id]}
                   </motion.div>
                 )}
               </AnimatePresence>

               {/* Simulated Filesystem Backup Trigger */}
               <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-70">
                  <div>
                    <div className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-2">
                      <FileArchive size={14} className="text-slate-400"/> Codebase Archive
                    </div>
                    <div className="text-[10px] text-slate-500">Zips website files natively via SSH</div>
                  </div>
                  
                  <button className="px-6 py-2.5 bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap">
                    <Download size={14} />
                    Zip Webroot
                  </button>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
