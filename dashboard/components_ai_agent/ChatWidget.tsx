'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send } from 'lucide-react';

export default function ChatWidget({ activeIncident }: { activeIncident?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          incidentContext: activeIncident
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: '⚠️ Error: ' + (data.error || 'Connection failed.') }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: '⚠️ Network Error' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      {!isOpen && (
        <motion.button 
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.1, rotate: 10 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-10 right-10 w-16 h-16 bg-gradient-to-br from-cyan-600 to-indigo-600 rounded-[22px] shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center group overflow-hidden border border-white/20 z-[200]"
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
          <MessageSquare size={28} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-10 right-10 w-[420px] h-[600px] bg-[#050B18]/95 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col z-[300] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-white/[0.02] p-6 border-b border-white/5 flex justify-between items-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent"></div>
              <h3 className="font-black text-white text-[12px] uppercase tracking-[0.3em] flex items-center gap-3 relative z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-pulse"></div>
                NEURAL_ASSISTANT_V2
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-white/20 hover:text-white transition-colors relative z-10">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-transparent relative">
              {messages.length === 0 ? (
                <div className="text-center text-white/20 text-[10px] font-black uppercase tracking-[0.2em] mt-24 italic leading-relaxed px-10">
                  <div className="p-5 bg-white/[0.02] rounded-3xl border border-white/[0.05] mb-6">
                    [INTERFACE_ACTIVE]
                  </div>
                  System intelligence active. Query authorized for incident resolution and architectural analysis.
                </div>
              ) : (
                messages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] p-4 rounded-[22px] text-xs font-medium leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600/90 text-white rounded-br-[4px] shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-white/[0.03] text-cyan-50 border border-white/5 rounded-bl-[4px] shadow-[0_0_20px_rgba(0,0,0,0.2)]'}`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.02] border border-white/5 text-white/20 p-4 rounded-[22px] rounded-bl-[4px] text-xs flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 animate-bounce delay-200"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Box */}
            <div className="p-6 bg-white/[0.01] border-t border-white/5 relative">
              <div className="flex gap-3 bg-black/40 p-2 rounded-[24px] border border-white/[0.05] focus-within:border-cyan-500/30 transition-all duration-500 shadow-inner">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Query system intelligence..."
                  className="flex-1 bg-transparent text-white rounded-xl px-4 py-3 text-sm focus:outline-none placeholder:text-white/10 font-medium"
                />
                <button 
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-20 text-white w-12 h-12 flex items-center justify-center rounded-[18px] transition-all duration-300 shadow-[0_5px_15px_rgba(6,182,212,0.2)]"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
