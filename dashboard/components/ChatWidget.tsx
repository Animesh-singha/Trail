'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Terminal, ChevronRight } from 'lucide-react';

export default function ChatWidget({ activeIncident }: { activeIncident?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string, ts?: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const timestamp = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, ts: timestamp() }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, incidentContext: activeIncident })
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'ai', content: data.response, ts: timestamp() }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: `⚠ SYSTEM ERROR: ${data.error || 'Connection refused.'}`, ts: timestamp() }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '⚠ NETWORK ERROR: Unable to reach AI endpoint. Check backend status.', ts: timestamp() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 group"
          >
            <div className="relative bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl shadow-2xl shadow-indigo-500/30 border border-indigo-400/30 transition-all flex items-center gap-2">
              <Terminal size={20} />
              <span className="text-xs font-bold tracking-widest uppercase hidden group-hover:block">NEXUS AI</span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-slate-950"></span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 w-[420px] h-[580px] z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-slate-700/80"
            style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1525 100%)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 bg-indigo-500/20 border border-indigo-500/40 rounded-xl flex items-center justify-center">
                    <Bot size={16} className="text-indigo-400" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse"></span>
                </div>
                <div>
                  <div className="text-xs font-black text-white tracking-widest uppercase">NEXUS-AI</div>
                  <div className="text-[9px] text-emerald-400 font-bold tracking-[0.15em] uppercase">Tier-3 SOC Analyst • Online</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeIncident && (
                  <div className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black tracking-widest rounded-full uppercase">
                    INC CONTEXT LOADED
                  </div>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-60">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
                    <Terminal size={22} className="text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-300 mb-1">NEXUS-AI SOC TERMINAL</div>
                    <div className="text-[10px] text-slate-500 max-w-[240px] leading-relaxed">
                      Query active incidents, request diagnostics, or ask infrastructure questions.
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 w-full mt-2">
                    {['Analyze current incidents', 'How to fix OOM errors?', 'Check Nginx performance'].map(q => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="text-[10px] text-left px-3 py-2 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 rounded-lg flex items-center gap-2 transition-all"
                      >
                        <ChevronRight size={10} className="text-indigo-500 shrink-0" />
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-indigo-600/30 border border-indigo-500/30' : 'bg-slate-800/80 border border-slate-700/50'}`}>
                      {msg.role === 'user' 
                        ? <User size={12} className="text-indigo-300" />
                        : <Bot size={12} className="text-slate-300" />
                      }
                    </div>
                    {/* Bubble */}
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`px-4 py-3 rounded-xl text-xs leading-relaxed whitespace-pre-wrap font-mono ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600/30 border border-indigo-500/30 text-indigo-100 rounded-tr-none' 
                          : 'bg-slate-900/80 border border-slate-700/50 text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      {msg.ts && (
                        <div className="text-[9px] text-slate-600 font-mono px-1">{msg.ts}</div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0">
                    <Bot size={12} className="text-slate-300" />
                  </div>
                  <div className="px-4 py-3 bg-slate-900/80 border border-slate-700/50 rounded-xl rounded-tl-none">
                    <div className="flex items-center gap-1.5">
                      <div className="text-[9px] text-indigo-400 font-bold tracking-widest uppercase mr-2">NEXUS-AI PROCESSING</div>
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }}></span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-950/60 shrink-0">
              <div className="flex gap-2 items-center bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2.5 focus-within:border-indigo-500/50 transition-all">
                <span className="text-indigo-500 text-xs font-bold font-mono shrink-0">{'>'}</span>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Enter diagnostic query..."
                  className="flex-1 bg-transparent text-slate-200 text-xs font-mono focus:outline-none placeholder:text-slate-600"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all shrink-0"
                >
                  <Send size={12} />
                </button>
              </div>
              <div className="text-[9px] text-slate-600 font-mono mt-1.5 pl-1">NEXUS-AI v2.0 • Powered by Groq LLaMA-3.3</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
