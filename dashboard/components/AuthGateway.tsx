'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, CheckCircle, Eye, EyeOff } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AuthGatewayProps {
  onAuth: () => void;
}

export default function AuthGateway({ onAuth }: AuthGatewayProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'error' | 'success'>('idle');
  const [mounted, setMounted] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'NEXUS SOC SECURE GATEWAY v4.0.2',
    'TARGET NODE: 100.97.103.94 [PROD-DB-PRIMARY]',
    'INITIALIZING SYSTEM PROTOCOLS...',
    'READY FOR MULTI-FACTOR AUTHENTICATION.'
  ]);

  useEffect(() => {
    setMounted(true);
    // Fetch recent auth history from server
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/auth/history`);
        if (res.ok) {
          const history = await res.json();
          // Transform history into terminal lines
          const historyLines = history.reverse().map((log: any) =>
            `> RECENT ATTEMPT: ${log.username} [${log.ip_address}] - ${log.status}`
          );
          setTerminalLines(prev => [...prev.slice(0, 4), ...historyLines, ...prev.slice(4)]);
        }
      } catch (err) {
        console.error('Failed to fetch auth history', err);
      }
    };
    fetchHistory();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'checking') return;

    setStatus('checking');
    setTerminalLines(prev => [...prev.slice(-10), `> VERIFYING IDENTITY: ${username}...`]);

    // Check against backend authentication
    const performLogin = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          localStorage.setItem('nexus_token', data.accessToken); // Uses data.accessToken instead of data.token (fixed based on backend update)
          setTerminalLines(prev => [...prev, `> IDENTITY VERIFIED: ${username}`, '> ACCESS GRANTED.', '> DECRYPTING FLEET METRICS...']);
          setStatus('success');
          setTimeout(onAuth, 1000);
        } else {
          setTerminalLines(prev => [...prev, `> ATTEMPT BY: ${username}`, `> ACCESS DENIED: ${data.error || 'INVALID CREDENTIALS'}`]);
          setStatus('error');
          setTimeout(() => {
            setStatus('idle');
          }, 3000);
        }
      } catch (err) {
        console.error('Auth request failed', err);
        setTerminalLines(prev => [...prev, '> SYSTEM ERROR: UNABLE TO REACH AUTH NODE.']);
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    };

    performLogin();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex items-center justify-center p-4 font-mono">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#4f46e5_0%,transparent_50%)]"></div>
        <div className="scan-line"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-slate-950/50 border border-slate-500/30 rounded-3xl p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(255,255,255,0.05)] relative"
      >
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-slate-500/10 rounded-2xl border border-slate-500/20 text-slate-400 relative">
            <ShieldAlert size={40} className={status === 'checking' ? 'animate-pulse' : ''} />
            {status === 'success' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-1"
              >
                <CheckCircle size={16} className="text-white" />
              </motion.div>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-8 bg-black/40 p-4 rounded-xl border border-slate-800 text-[10px] text-slate-400 h-32 overflow-y-auto scrollbar-hide flex flex-col-reverse">
          <div className="flex flex-col">
            {terminalLines.map((line, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-500/50">[{mounted ? new Date().toLocaleTimeString([], { hour12: false }) : '--:--:--'}]</span>
                <span className={line.includes('DENIED') ? 'text-rose-400 font-bold' : line.includes('GRANTED') ? 'text-emerald-400 font-bold' : ''}>
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Identity UID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder="USER ID"
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-slate-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Security Token</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                placeholder="PASSWORD"
                className={`w-full bg-slate-950/80 border ${status === 'error' ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'border-slate-800 focus:border-slate-500'} rounded-xl px-4 py-3 text-sm text-white outline-none transition-all pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400 transition-colors"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {status === 'error' && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] text-rose-500 font-bold ml-1 mt-1"
              >
                ERROR: INCORRECT PASS OR USERNAME
              </motion.p>
            )}
          </div>

          <button
            type="submit"
            disabled={status === 'checking' || !username || !password}
            className="w-full mt-4 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-black/20 active:scale-95 border border-slate-700/50"
          >
            {status === 'checking' ? 'Processing...' : 'Authorize Access'}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          Protected by Nexus Neural Guard • Level 5 Clearance Required
        </p>
      </motion.div>
    </div>
  );
}
