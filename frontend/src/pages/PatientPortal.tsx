import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Brain, Shield, X, AlertTriangle, CheckCircle,
  Activity, Stethoscope, Clock, ChevronRight, Zap, Heart,
  TrendingUp, AlertCircle, Info, MessageCircle, Send, Bot, User
} from 'lucide-react';
import { cn } from '../components/ui/shared';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { DiagnosticInterview } from '../components/DiagnosticInterview';

interface Prediction { label: string; probability: number; percentage: number }
interface DiagnosisResult {
  predictions: Prediction[]
  urgency: string
  risk_level: string
  immediate_steps: string[]
  latency_ms: number
}

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  critical: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: AlertTriangle, label: 'CRITICAL' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertCircle,   label: 'HIGH RISK' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: Activity,      label: 'MODERATE' },
  low:      { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  icon: CheckCircle,   label: 'LOW RISK' },
}

const ProbabilityBar = ({ label, percentage, rank }: { label: string; percentage: number; rank: number }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className={cn("font-medium", rank === 0 ? "text-blue-400" : "text-slate-500")}>{label}</span>
      <span className={cn("font-bold tabular-nums", rank === 0 ? "text-blue-400" : "text-slate-500")}>{percentage}%</span>
    </div>
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", rank === 0 ? "bg-blue-500" : "bg-white/20")}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, delay: rank * 0.1, ease: "easeOut" }}
      />
    </div>
  </div>
)

const ThinkingDots = () => (
  <div className="flex items-center gap-1 py-2">
    {[0, 1, 2].map(i => (
      <motion.div key={i} className="w-2 h-2 bg-blue-400 rounded-full"
        animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
    ))}
    <span className="text-xs text-slate-500 ml-2">AI is analysing...</span>
  </div>
)

const StreamingText = ({ text, isStreaming }: { text: string; isStreaming: boolean }) => {
  const formatted = text
    .replace(/## (.+)/g, '<h3 class="text-base font-bold mt-4 mb-1 text-white">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/^- (.+)/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/\n/g, '<br/>')
  return (
    <div className="text-sm leading-relaxed text-slate-300">
      <div dangerouslySetInnerHTML={{ __html: formatted }} />
      {isStreaming && <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse align-middle" />}
    </div>
  )
}

// ── Nurse Chatbot ──────────────────────────────────────────────────────────
interface ChatMsg { role: 'user' | 'assistant'; content: string; streaming?: boolean }

const NurseChat = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hi, I am Nurse AI. I can answer general health questions, explain symptoms, or help you understand a diagnosis. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const token = useAuthStore(s => s.token);

  useEffect(() => {
    api.get('/api/ai/ollama/status').then(r => setOllamaOnline(r.data.online)).catch(() => setOllamaOnline(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    setIsSending(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history }),
      });

      if (!response.ok) { throw new Error('Chat request failed'); }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.token) {
              fullText += evt.token;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullText, streaming: !evt.done };
                return updated;
              });
            }
            if (evt.error) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: evt.type === 'conn_error'
                  ? 'Ollama is not running. Please start it with `ollama serve` and ensure the model is pulled.'
                  : `Error: ${evt.error}`, streaming: false };
                return updated;
              });
            }
            if (evt.done) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Connection error. Please check the backend is running.', streaming: false };
        return updated;
      });
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
            <Bot className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Nurse AI</p>
            <p className="text-xs text-slate-500">Powered by Ollama · llama3.1</p>
          </div>
        </div>
        <div className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold',
          ollamaOnline === null ? 'text-slate-400 border-white/10 bg-white/5'
          : ollamaOnline ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
          : 'text-red-400 border-red-500/30 bg-red-500/10'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', ollamaOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
          {ollamaOnline === null ? 'Checking...' : ollamaOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn('shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
              msg.role === 'user' ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-emerald-500/20 border border-emerald-500/30')}>
              {msg.role === 'user'
                ? <User className="h-3.5 w-3.5 text-blue-400" />
                : <Bot className="h-3.5 w-3.5 text-emerald-400" />}
            </div>
            <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-blue-600/20 border border-blue-500/20 text-white rounded-tr-sm'
                : 'bg-white/5 border border-white/10 text-slate-300 rounded-tl-sm'
            )}>
              {msg.content || (msg.streaming && (
                <div className="flex items-center gap-1">
                  {[0,1,2].map(j => (
                    <motion.div key={j} className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: j * 0.2 }} />
                  ))}
                </div>
              ))}
              {msg.content}
              {msg.streaming && msg.content && <span className="inline-block w-0.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse align-middle" />}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10 shrink-0">
        {!ollamaOnline && ollamaOnline !== null && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-2">
            Ollama is offline. Run <code className="bg-white/10 px-1 rounded">ollama serve</code> and pull <code className="bg-white/10 px-1 rounded">llama3.1:8b</code> to enable the chatbot.
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask Nurse AI anything about your health..."
            disabled={isSending}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 transition-all disabled:opacity-50"
          />
          <button onClick={send} disabled={!input.trim() || isSending}
            className={cn('p-2.5 rounded-xl transition-all',
              input.trim() && !isSending ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white/5 text-slate-600 cursor-not-allowed')}>
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 text-center">Not a substitute for professional medical advice</p>
      </div>
    </div>
  );
};

// ── Main PatientPortal ─────────────────────────────────────────────────────
export const PatientPortal = () => {
  const [activeTab, setActiveTab] = useState<'diagnose' | 'chat' | 'interview'>('diagnose');
  const [inputValue, setInputValue] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();

  const { data: history } = useQuery({
    queryKey: ['patient-history'],
    queryFn: async () => { const { data } = await api.get('/api/ai/history'); return data; }
  });

  const addSymptom = (raw: string) => {
    const s = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (s && !symptoms.includes(s)) setSymptoms(prev => [...prev, s]);
    setInputValue('');
  };

  const removeSymptom = (s: string) => setSymptoms(prev => prev.filter(x => x !== s));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) { e.preventDefault(); addSymptom(inputValue); }
    if (e.key === 'Backspace' && !inputValue && symptoms.length) removeSymptom(symptoms[symptoms.length - 1]);
  };

  const runDiagnosis = async () => {
    if (!symptoms.length || isAnalysing) return;
    setIsAnalysing(true); setShowResults(false); setStreamedText(''); setDiagnosis(null);
    try {
      const { data } = await api.post('/api/ai/diagnose', {
        symptoms, hospital_id: user?.hospital_id || 'HOSP_001',
      });
      const result: DiagnosisResult = {
        predictions: data.onnx_top_candidates?.predictions || [],
        urgency: data.onnx_top_candidates?.urgency || 'low',
        risk_level: data.onnx_top_candidates?.risk_level || 'low',
        immediate_steps: data.onnx_top_candidates?.immediate_steps || [],
        latency_ms: data.onnx_top_candidates?.latency_ms || 0,
      };
      setDiagnosis(result); setShowResults(true); setIsAnalysing(false); setIsStreaming(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

      const es = new EventSource(`/api/ai/diagnose/stream?session_id=${data.session_id}`);
      let text = '';
      es.onmessage = (e) => {
        const payload = JSON.parse(e.data);
        if (payload.token) { text += payload.token; setStreamedText(text); }
        if (payload.done) { es.close(); setIsStreaming(false); queryClient.invalidateQueries({ queryKey: ['patient-history'] }); }
        if (payload.error) {
          setStreamedText(payload.type === 'conn_error'
            ? '*Ollama is not running. Start it with `ollama serve` to enable AI reasoning.*'
            : `*AI reasoning unavailable: ${payload.error}*`);
          es.close(); setIsStreaming(false);
        }
      };
      es.onerror = () => { es.close(); setIsStreaming(false); };
    } catch {
      toast.error('Diagnosis failed - check backend connection');
      setIsAnalysing(false);
    }
  };

  const reset = () => {
    setSymptoms([]); setDiagnosis(null); setStreamedText(''); setShowResults(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const riskCfg = RISK_CONFIG[diagnosis?.risk_level || 'low'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <Brain className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Health Assistant</h1>
              <p className="text-xs text-slate-400">Powered by federated learning + Llama 3.1</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-xs font-medium">
            <Shield className="h-3 w-3" /> Privacy Protected
          </div>
        </motion.header>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {([
            { id: 'diagnose',  label: 'Symptom Check',       icon: Stethoscope    },
            { id: 'interview', label: 'Diagnostic Interview', icon: Brain          },
            { id: 'chat',      label: 'Nurse AI Chat',        icon: MessageCircle  },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5')}>
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'diagnose' ? (
            <motion.div key="diagnose" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
              {/* Symptom Input */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-400" /> Describe your symptoms
                </h2>
                <div className="flex flex-wrap gap-2 min-h-[52px] bg-white/5 border border-white/10 rounded-xl p-3 cursor-text focus-within:border-blue-500/50 transition-all"
                  onClick={() => inputRef.current?.focus()}>
                  {symptoms.map(s => (
                    <motion.span key={s} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full">
                      {s.replace(/-/g, ' ')}
                      <button onClick={() => removeSymptom(s)} className="hover:text-white transition-colors"><X className="h-3 w-3" /></button>
                    </motion.span>
                  ))}
                  <input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder={symptoms.length ? "Add more..." : "Type a symptom and press Enter (e.g. chest pain, fever)"}
                    className="flex-1 min-w-[180px] bg-transparent text-sm text-white placeholder:text-slate-500 outline-none" />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-slate-500">{symptoms.length === 0 ? 'Add at least one symptom' : `${symptoms.length} symptom${symptoms.length > 1 ? 's' : ''} added`}</p>
                  <div className="flex gap-2">
                    {symptoms.length > 0 && (
                      <button onClick={reset} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">Clear</button>
                    )}
                    <button onClick={runDiagnosis} disabled={!symptoms.length || isAnalysing}
                      className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                        symptoms.length && !isAnalysing ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-white/5 text-slate-500 cursor-not-allowed')}>
                      {isAnalysing
                        ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Zap className="h-4 w-4" /></motion.div> Analysing...</>
                        : <><Brain className="h-4 w-4" /> Analyse Symptoms</>}
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {isAnalysing && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 pt-4 border-t border-white/10">
                      <ThinkingDots />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Results */}
              <AnimatePresence>
                {showResults && diagnosis && (
                  <motion.div ref={resultsRef} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className={cn("rounded-2xl border p-5 flex items-center gap-4", riskCfg.bg, riskCfg.border)}>
                      <div className="p-3 rounded-xl bg-white/10">
                        <riskCfg.icon className={cn("h-6 w-6", riskCfg.color)} />
                      </div>
                      <div className="flex-1">
                        <span className={cn("text-xs font-bold tracking-widest", riskCfg.color)}>{riskCfg.label}</span>
                        <p className={cn("text-lg font-bold", riskCfg.color)}>{diagnosis.predictions[0]?.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{diagnosis.predictions[0]?.percentage}% confidence · {diagnosis.latency_ms}ms inference</p>
                      </div>
                      <div className={cn("text-3xl font-black tabular-nums", riskCfg.color)}>{diagnosis.predictions[0]?.percentage}%</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-400" /> Differential Diagnosis</h3>
                        <div className="space-y-3">{diagnosis.predictions.slice(0, 5).map((p, i) => <ProbabilityBar key={p.label} label={p.label} percentage={p.percentage} rank={i} />)}</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><ChevronRight className="h-4 w-4 text-blue-400" /> Immediate Steps</h3>
                        <ol className="space-y-2.5">
                          {diagnosis.immediate_steps.map((step, i) => (
                            <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-start gap-3 text-sm">
                              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                              <span className="text-slate-300 leading-snug">{step}</span>
                            </motion.li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-400" /> AI Clinical Reasoning
                        {isStreaming && <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-400"><motion.div className="w-1.5 h-1.5 bg-blue-400 rounded-full" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} /> Generating...</span>}
                      </h3>
                      {isStreaming && !streamedText ? (
                        <div className="space-y-2.5">{[90, 75, 85, 60].map((w, i) => <div key={i} className="h-3.5 bg-white/10 rounded animate-pulse" style={{ width: `${w}%` }} />)}</div>
                      ) : streamedText ? (
                        <StreamingText text={streamedText} isStreaming={isStreaming} />
                      ) : (
                        <p className="text-slate-500 text-sm italic">Waiting for AI reasoning...</p>
                      )}
                    </div>

                    <div className="flex items-start gap-2 text-xs text-slate-500 bg-white/3 border border-white/5 rounded-xl p-4">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      This AI assessment is for informational purposes only and does not replace professional medical advice.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History */}
              {history && history.length > 0 && !showResults && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-blue-400" /> Recent Assessments</h3>
                  <div className="space-y-2">
                    {history.slice(0, 5).map((s: any) => {
                      const risk = s.urgency_level || 'low';
                      const cfg = RISK_CONFIG[risk] || RISK_CONFIG.low;
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/8 transition-colors">
                          <div className="flex items-center gap-3">
                            <Heart className="h-4 w-4 text-slate-400" />
                            <div>
                              <p className="text-sm font-medium">{s.onnx_predictions?.[0]?.label || 'Assessment'}</p>
                              <p className="text-xs text-slate-500">{new Date(s.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", cfg.color, cfg.bg, cfg.border)}>{cfg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : activeTab === 'interview' ? (
            <motion.div key="interview" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <DiagnosticInterview />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <NurseChat />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
