import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SymptomInput } from '../components/SymptomInput';
import { DiagnosisStream } from '../components/DiagnosisStream';
import { DiagnosticInterview } from '../components/DiagnosticInterview';
import { DiagnoseResponse, aiApi, OllamaStatus } from '../lib/api';
import { useAuthStore } from '../store/authStore';

type Tab = 'symptoms' | 'interview';

const NurseChat = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string; streaming?: boolean }[]>([
    { role: 'ai', text: 'Based on your reported symptoms, I can help clarify your diagnosis or answer clinical questions. How can I assist?' },
  ]);
  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const token = useAuthStore((s) => s.token);

  const { data: ollamaStatus } = useQuery<OllamaStatus>({
    queryKey: ['ollama-status'],
    queryFn: aiApi.ollamaStatus,
    refetchInterval: 30000,
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const history = messages.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setMessages((prev) => [...prev, { role: 'ai', text: '', streaming: true }]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '', full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.token) {
              full += evt.token;
              setMessages((prev) => {
                const u = [...prev];
                u[u.length - 1] = { role: 'ai', text: full, streaming: !evt.done };
                return u;
              });
            }
            if (evt.done) setMessages((prev) => { const u = [...prev]; u[u.length - 1].streaming = false; return u; });
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'ai', text: 'Connection error.' }; return u; });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-ink border-t-2 border-acid/30 shadow-hard">
      <header className="bg-black/20 p-4 px-8 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-acid/20 border border-acid/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-acid" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <span className="font-mono text-[10px] uppercase text-parchment tracking-widest">Clinical AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${ollamaStatus?.online ? 'bg-acid animate-pulse' : 'bg-sienna'}`}/>
          <span className="font-mono text-[9px] text-fog uppercase">{ollamaStatus?.online ? 'Online' : 'Offline'}</span>
        </div>
      </header>

      <div className="p-8 space-y-6 max-h-[400px] overflow-y-auto terminal-scroll">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start space-x-4 max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''}`}>
            <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center font-mono text-xs
              ${msg.role === 'ai' ? 'bg-[#363630] border-b border-acid text-acid' : 'bg-linen text-ink'}`}>
              {msg.role === 'ai' ? 'AI' : (useAuthStore.getState().user?.email?.slice(0, 2).toUpperCase() ?? 'ME')}
            </div>
            <div className={`p-4 text-sm leading-relaxed
              ${msg.role === 'ai'
                ? 'bg-transparent text-parchment border border-white/10'
                : 'bg-cream text-ink shadow-hard'
              }`}>
              {msg.text || (msg.streaming && <span className="font-mono text-[10px] text-acid animate-pulse">...</span>)}
              {msg.streaming && msg.text && <span className="inline-block w-0.5 h-3.5 bg-acid ml-0.5 animate-pulse align-middle"/>}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      <div className="p-6 bg-black/20 border-t border-white/5">
        {!ollamaStatus?.online && (
          <p className="font-mono text-[10px] text-sienna mb-3">
            Ollama offline — run <code className="bg-white/10 px-1">ollama serve</code> to enable
          </p>
        )}
        <div className="relative">
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={sending}
            placeholder="Type your clinical question..."
            className="w-full bg-transparent border-b border-white/20 focus:border-acid text-parchment font-body px-0 py-3 focus:outline-none placeholder:text-fog/50 text-sm"
          />
          <button
            onClick={send} disabled={!input.trim() || sending}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-acid font-mono text-[10px] uppercase tracking-widest hover:text-parchment transition-colors disabled:opacity-40"
          >
            Send Command
          </button>
        </div>
      </div>
    </div>
  );
};

export const PatientPortal = () => {
  const [tab, setTab]           = useState<Tab>('symptoms');
  const [result, setResult]     = useState<DiagnoseResponse | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="ml-0 min-h-screen bg-parchment grain-overlay">
      <div className="max-w-7xl mx-auto p-12">
        {/* Page header */}
        <div className="mb-12">
          <h2 className="font-headline text-[36px] text-ink leading-tight">Health Portal</h2>
          <p className="font-body text-[14px] text-fog mt-1 italic">Welcome back, {user?.email?.split('@')[0]}</p>
          <div className="h-[3px] bg-acid w-20 mt-4"/>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-linen mb-8">
          {(['symptoms', 'interview'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`h-10 px-6 font-mono text-[11px] uppercase tracking-widest transition-colors
                ${tab === t
                  ? 'text-ink border-b-2 border-acid -mb-px'
                  : 'text-fog hover:text-ink'
                }`}
            >
              {t === 'symptoms' ? 'Symptom Check' : 'Diagnostic Interview'}
            </button>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left 55% */}
          <section className="lg:w-[55%]">
            {tab === 'symptoms' ? (
              <SymptomInput onResult={(r) => { setResult(r); setChatOpen(false); }} />
            ) : (
              <DiagnosticInterview />
            )}
          </section>

          {/* Right 45% */}
          <section className="lg:w-[45%] flex flex-col space-y-8">
            {result ? (
              <DiagnosisStream sessionId={result.session_id} onnxResult={result.onnx_top_candidates} />
            ) : (
              <div className="flex items-center justify-center h-64 opacity-20">
                <div className="w-48 h-48 border-2 border-linen rounded-full flex items-center justify-center p-8 text-center">
                  <p className="font-headline italic text-lg text-ink leading-tight">
                    Select your symptoms to begin analysis.
                  </p>
                </div>
              </div>
            )}

            {/* Nurse AI trigger */}
            <button
              onClick={() => setChatOpen((o) => !o)}
              className="bg-ink p-8 flex items-center justify-between cursor-pointer group hover:bg-[#363630] transition-all"
            >
              <div>
                <h3 className="text-parchment font-headline text-lg">Consult Nurse AI</h3>
                <p className="text-acid font-mono text-[10px] uppercase mt-1">Live Clinical Agent Available</p>
              </div>
              <svg className={`w-5 h-5 text-parchment transition-transform ${chatOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="square" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </section>
        </div>

        {/* Nurse chat slide-down */}
        {chatOpen && (
          <div className="mt-12">
            <NurseChat />
          </div>
        )}

        {/* Footer meta */}
        <footer className="mt-24 pt-8 border-t border-linen flex justify-between items-center text-fog">
          <div className="flex space-x-12">
            <div>
              <p className="font-mono text-[9px] uppercase">Node Identity</p>
              <p className="font-mono text-[10px]">PX-ALPHA-7729-UK</p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase">Model Version</p>
              <p className="font-mono text-[10px]">FedHealth-ONNX-v1.0</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
