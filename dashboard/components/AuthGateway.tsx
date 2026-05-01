'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AuthGatewayProps {
  onAuth: () => void;
}

export default function AuthGateway({ onAuth }: AuthGatewayProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'error' | 'success'>('idle');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'checking') return;

    setStatus('checking');

    try {
      const res = await fetch(`${API_BASE}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('nexus_token', data.accessToken);
        setStatus('success');
        setTimeout(onAuth, 800);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Auth request failed', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#6366f1_0%,transparent_70%)]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
           <div className="inline-flex p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 mb-4">
              <ShieldCheck size={32} />
           </div>
           <h1 className="text-2xl font-bold text-white tracking-tight">Access Control</h1>
           <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-black text-[10px]">Infrastructure Monitoring Node</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-1">Identity UID</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter User ID"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-1">Security Token</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className={`w-full bg-slate-950/50 border ${status === 'error' ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'} rounded-xl px-4 py-3 text-sm text-white outline-none transition-all pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {status === 'error' && (
                <p className="text-[10px] text-rose-500 font-bold ml-1 mt-1 uppercase tracking-widest">Access Denied: Invalid Credentials</p>
              )}
            </div>

            <button
              type="submit"
              disabled={status === 'checking' || !username || !password}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                status === 'success' ? 'bg-emerald-600 text-white' : 
                status === 'checking' ? 'bg-indigo-600 text-white cursor-wait' :
                'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              }`}
            >
              {status === 'checking' ? <Loader2 className="animate-spin" size={16} /> : null}
              {status === 'success' ? 'Authorized' : status === 'checking' ? 'Authorizing...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-[10px] text-slate-600 uppercase tracking-[0.3em] font-black">
          YoForex Infrastructure • SOC System v2.0
        </p>
      </motion.div>
    </div>
  );
}
