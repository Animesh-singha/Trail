'use client';

import { useState } from 'react';
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
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-lg transition-all flex items-center justify-center"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              AI SOC Assistant
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 text-sm mt-10">
                Ask me how to resolve currently active alerts, or general DevOps questions!
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-400 p-3 rounded-2xl rounded-bl-none text-xs flex gap-1">
                  <span className="animate-bounce">●</span><span className="animate-bounce delay-100">●</span><span className="animate-bounce delay-200">●</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about fixing an incident..."
              className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button 
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 text-sm rounded-xl transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
