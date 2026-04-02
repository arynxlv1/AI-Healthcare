import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
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
  const user  = useAuthStore((s) => s.user);

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
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'ai', text: full, streaming: !evt.done }; return u; });
            }
            if (evt.done) setMessages((prev) => { const u = [...prev]; u[u.length - 1].streaming = false; return u; });
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'ai', text: 'Connection error.' }; return u; });
    } finally { setSending(false); }
  };

  const initials = user?.email?.split('@')[0].slice(0, 2).toUpperCase() ?? 'ME';

  return (
    <div className="mt-12 bg-ink hard-offset border-t-2 border-acid/30">
      {/* Header */}
      <header className="bg-black/20 p-4 px-8 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-acid/20 border border-acid/50 flex items-center justify-center">
            <span className="material-symbols-outlined text-acid text-lg">support_agent</span>
          </div>
          <span className="font-label text-[10px] uppercase text-parchment tracking-widest">Clinical AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${ollamaStatus?.online ? 'bg-acid animate-pulse' : 'bg-sienna'}`} />
          <span className="font-label text-[9px] text-fog uppercase">{ollamaStatus?.online ? 'Online' : 'Offline'}</span>
        </div>
      </header>

      {/* Messages */}
      <div className="p-8 space-y-6 max-h-[500px] overflow-y-auto terminal-scroll">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start space-x-4 max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''}`}>
            <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center font-mono text-xs
              ${msg.role === 'ai' ? 'bg-[#363630] border-b border-acid text-acid' : 'bg-linen text-ink'}`}>
              {msg.role === 'ai' ? <span className="material-symbols-outlined text-acid text-lg">biotech</span> : initials}
            </div>
            <div className={`p-4 text-sm leading-relaxed
              ${msg.role === 'ai' ? 'bg-transparent text-parchment border border-white/10' : 'bg-cream text-ink hard-offset'}`}>
              {msg.text || (msg.streaming && <span className="font-mono text-[10px] text-acid animate-pulse">...</span>)}
              {msg.streaming && msg.text && <span className="inline-block w-0.5 h-3.5 bg-acid ml-0.5 animate-pulse align-middle" />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-black/20 border-t border-white/5">
        {!ollamaStatus?.online && (
          <p className="font-label text-[10px] text-sienna mb-3">
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
            className="absolute right-0 top-1/2 -translate-y-1/2 text-acid font-label text-[10px] uppercase tracking-widest hover:text-parchment transition-colors disabled:opacity-40"
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
    <div className="flex min-h-screen bg-parchment">
      <Sidebar />
      <div className="ml-[220px] flex-1">
        <TopBar title="Health Portal" />
        <main className="max-w-7xl mx-auto p-12">
          {/* Page header */}
          <div className="mb-12">
            <h2 className="font-headline text-[36px] text-ink leading-tight">Health Portal</h2>
            <p className="font-body text-[14px] text-fog mt-1 italic">
              Welcome back, {user?.email?.split('@')[0]}
            </p>
            <div className="h-[3px] bg-acid w-20 mt-4" />
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-linen mb-8 gap-6">
            {(['symptoms', 'interview'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 font-body font-semibold text-sm border-b-2 transition-colors
                  ${tab === t ? 'border-acid text-ink' : 'border-transparent text-fog hover:text-ink'}`}
              >
                {t === 'symptoms' ? 'Symptom Analysis' : 'Diagnostic Interview'}
              </button>
            ))}
          </div>

          {/* Two-column layout */}
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Left 55% */}
            <section className="lg:w-[55%]">
              {tab === 'symptoms'
                ? <SymptomInput onResult={(r) => { setResult(r); setChatOpen(false); }} />
                : <DiagnosticInterview />
              }
            </section>

            {/* Right 45% */}
            <section className="lg:w-[45%] flex flex-col space-y-8">
              {result ? (
                <DiagnosisStream sessionId={result.session_id} onnxResult={result.onnx_top_candidates} />
              ) : (
                <div className="flex items-center justify-center h-64 opacity-10 pointer-events-none">
                  <div className="w-60 h-60 border-2 border-linen rounded-full flex items-center justify-center p-8 text-center">
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-4xl mb-4">stethoscope</span>
                      <p className="font-headline italic text-lg text-ink leading-tight">
                        Select your symptoms to begin analysis.
                      </p>
                    </div>
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
                  <p className="text-acid font-label text-[10px] uppercase mt-1">Live Clinical Agent Available</p>
                </div>
                <span className={`material-symbols-outlined text-parchment transition-transform ${chatOpen ? 'rotate-90' : ''}`}>
                  keyboard_arrow_right
                </span>
              </button>
            </section>
          </div>

          {/* Nurse chat */}
          {chatOpen && <NurseChat />}

          {/* Footer */}
          <footer className="mt-24 pt-8 border-t border-linen flex justify-between items-center text-fog">
            <div className="flex space-x-12">
              <div>
                <p className="font-label text-[9px] uppercase">Node Identity</p>
                <p className="font-mono text-[10px]">PX-ALPHA-7729-UK</p>
              </div>
              <div>
                <p className="font-label text-[9px] uppercase">Model Version</p>
                <p className="font-mono text-[10px]">FedHealth-ONNX-v1.0</p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
