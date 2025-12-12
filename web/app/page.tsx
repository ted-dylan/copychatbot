'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Coffee, CloudRain, Zap, ArrowUp, User } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Custom Hook for Manual Chat (Keep existing logic)
function useManualChat() {
  const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const append = async (inputMessage: { role: string; content: string }) => {
    setError(null);
    const userMsg = { id: Date.now().toString(), ...inputMessage };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Network response was not ok');
      }
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const assistantMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' };
      setMessages([...newMessages, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantMsg.content += chunk;

        setMessages(prev => {
          const others = prev.slice(0, -1);
          return [...others, { ...assistantMsg }];
        });
      }
    } catch (error: any) {
      console.error('Chat Error:', error);
      setError(error.message || '알 수 없는 오류가 발생했습니다.');
      setMessages(prev => prev.filter(m => m.role !== 'assistant' || m.content !== ''));
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, append, isLoading, error };
}

// Auth Component (Invite Code Only)
function AuthPage({ onLogin }: { onLogin: () => void }) {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (inviteCode === 'xowns') {
      onLogin();
    } else {
      setError('ACCESS DENIED: 코드가 올바르지 않습니다.');
      setInviteCode(''); // 틀리면 초기화
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in relative z-10">
      <div className="relative mb-10 w-40 h-40 md:w-56 md:h-56 group flex items-center justify-center">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 via-cyan-400 to-mint-300 blur-[50px] opacity-50 rounded-full animate-pulse-slow"></div>

        {/* Image Container: Circular Clip */}
        <div className="relative z-10 w-full h-full rounded-full overflow-hidden border-4 border-white/10 shadow-2xl ring-1 ring-white/20 animate-float">
          <img
            src="/bot_character.jpg"
            alt="Bot"
            className="w-full h-full object-cover transform scale-110"
          />
        </div>
      </div>

      <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-white to-cyan-300 mb-4 tracking-tight">
        PRIVATE ACCESS
      </h1>
      <p className="text-slate-400 mb-8 max-w-xs text-sm font-mono tracking-wider">
        초대 코드를 입력하여 입장하세요.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-6">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <input
            type="password"
            placeholder="ACCESS CODE"
            className="relative w-full p-4 bg-[#1E1E24] border border-white/10 rounded-xl focus:outline-none focus:border-purple-400/50 text-white placeholder:text-slate-600 transition-all font-mono text-center tracking-[0.5em] text-lg uppercase"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            autoFocus
          />
        </div>

        {error && <p className="text-red-400 text-xs font-bold font-mono animate-pulse">{error}</p>}

        <button
          type="submit"
          className="w-full py-4 bg-white text-black font-black tracking-widest rounded-xl hover:bg-cyan-300 transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          ENTER
        </button>
      </form>

      <div className="mt-12 text-[10px] text-slate-600 font-mono">
        SECURED BY COPYTHERAPIST
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { messages, append, isLoading, error } = useManualChat();
  const [input, setInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Auth State
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickTags = [
    { icon: <CloudRain size={18} />, text: "비오는 감성", desc: "Rainy Vibe" },
    { icon: <Coffee size={18} />, text: "월요병 치유", desc: "Energy" },
    { icon: <Zap size={18} />, text: "강렬한 한줄", desc: "Impact" },
    { icon: <Sparkles size={18} />, text: "인스타 감성", desc: "Aesthetic" },
  ];

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = input;
    setInput('');
    await append({ role: 'user', content: msg });
  };

  useEffect(() => {
    // Check local storage for session
    // const savedAuth = localStorage.getItem('auth_token');
    // if (savedAuth === 'valid_session') {
    //   setIsAuthenticated(true);
    // }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isAuthenticated) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAuthenticated]);

  const handleLoginSuccess = () => {
    localStorage.setItem('auth_token', 'valid_session');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0F1014] text-slate-100 font-sans selection:bg-purple-300 selection:text-purple-900 overflow-hidden">

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow delay-700"></div>
      </div>

      {!isAuthenticated ? (
        <AuthPage onLogin={handleLoginSuccess} />
      ) : (
        <>
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-[#0F1014]/70 border-b border-white/5 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 relative flex items-center justify-center rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-purple-500/20 cursor-pointer hover:scale-105 transition-transform">
                <img src="/bot_character.jpg" alt="Bot" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  CopyTherapist
                </h1>
                <span className="text-[10px] text-slate-500 font-medium tracking-wider">MUSE ENGINE</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium tracking-wider text-slate-400 uppercase hover:bg-white/10 hover:text-white transition-colors"
            >
              LOGOUT
            </button>
          </header>

          {/* Chat Area */}
          <main className="flex-1 overflow-y-auto relative z-10 p-4 sm:p-6 space-y-6 scroll-smooth custom-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center space-y-10 animate-fade-in">
                {/* 3D Character Container - Main Chat */}
                <div className="relative group cursor-pointer w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                  {/* Glow ring */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 via-cyan-400 to-mint-300 blur-[80px] opacity-30 rounded-full group-hover:opacity-50 transition-opacity duration-1000 animate-spin-slow"></div>

                  {/* Floating Image: Soft Rounded Rect or Circle */}
                  <div className="relative w-48 h-48 md:w-64 md:h-64 animate-float rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_50px_-10px_rgba(168,85,247,0.4)]">
                    <img
                      src="/bot_character.jpg"
                      alt="3D Bot Character"
                      className="w-full h-full object-cover transform scale-105"
                    />
                    {/* Glossy Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
                  </div>
                </div>

                <div className="space-y-3 relative z-20">
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-lg">
                    What is your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-white">Story?</span>
                  </h2>
                  <p className="text-slate-400 text-sm md:text-base max-w-sm mx-auto leading-relaxed font-light">
                    당신의 고민을 감각적인 카피로 바꿔드려요.<br />
                    지금 떠오르는 단어나 감정을 던져주세요.
                  </p>
                </div>

                {/* Quick Tags */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-2xl px-4">
                  {quickTags.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(tag.text)}
                      className="group relative flex flex-col justify-center items-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-300/30 rounded-2xl transition-all duration-300 backdrop-blur-sm"
                    >
                      <div className="p-2 rounded-full bg-white/5 text-purple-300 group-hover:text-white group-hover:bg-purple-500 transition-colors duration-300">
                        {tag.icon}
                      </div>
                      <div className="text-center">
                        <span className="block text-sm font-semibold text-slate-200 group-hover:text-white">{tag.text}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider group-hover:text-purple-200">{tag.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((m, i) => (
              <div key={m.id} className={cn("flex w-full animate-slide-up", m.role === 'user' ? "justify-end" : "justify-start")}>
                {m.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-full border-2 border-white/10 bg-[#1E1E24] overflow-hidden flex-shrink-0 mr-3 mt-1 shadow-lg">
                    <img
                      src="/bot_character.jpg"
                      alt="Bot"
                      className="w-full h-full object-cover scale-150"
                    />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] sm:max-w-[70%] p-5 rounded-3xl text-[15px] md:text-base leading-7 shadow-xl backdrop-blur-md border",
                    m.role === 'user'
                      ? "bg-gradient-to-br from-purple-600 to-indigo-600 border-purple-500/30 text-white rounded-br-sm"
                      : "bg-white/5 border-white/10 text-slate-100 rounded-bl-sm"
                  )}
                >
                  <div className="whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
                {m.role === 'user' && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center flex-shrink-0 ml-3 mt-1 shadow-lg border border-white/5">
                    <User size={18} className="text-slate-400" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-pulse ml-14">
                <div className="flex gap-1 bg-white/5 px-4 py-3 rounded-full border border-white/5">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mx-auto max-w-md p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm text-center backdrop-blur-sm">
                <span className="font-bold mr-2">⚠️ Error:</span> {error}
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </main>

          {/* Input Area */}
          <div className="p-4 sm:p-6 bg-gradient-to-t from-[#0F1014] via-[#0F1014]/90 to-transparent sticky bottom-0 z-20">
            <form onSubmit={handleFormSubmit} className="relative max-w-3xl mx-auto group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full opacity-20 blur-md group-focus-within:opacity-40 transition-opacity duration-500"></div>
              <div className="relative flex items-center bg-[#1E1E24]/80 backdrop-blur-xl rounded-full border border-white/10 group-focus-within:border-purple-400/50 transition-all p-1.5 pl-6 shadow-2xl">
                <input
                  className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-slate-500 font-medium py-3"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message CopyTherapist..."
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-tr from-purple-500 to-indigo-500 text-white rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                >
                  <ArrowUp size={22} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(1deg); }
        }
        @keyframes spin-slow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes pulse-slow {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes slide-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.4s ease-out; }
        .animate-fade-in { animation: slide-up 0.8s ease-out; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
      `}</style>
    </div>
  );
}
