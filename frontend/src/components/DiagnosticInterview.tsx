import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, User, ChevronRight, RotateCcw, AlertTriangle,
  CheckCircle, Activity, Shield, Zap, Heart, Clock,
  AlertCircle, TrendingUp, Stethoscope
} from 'lucide-react';
import { cn } from '../components/ui/shared';
import { useAuthStore } from '../store/authStore';

// ── Types ──────────────────────────────────────────────────────────────────
interface MCQOption { label: string; text: string }
interface Question { text: string; options: MCQOption[] }
interface DiagnosisResult {
  primary: string
  risk: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  alternatives: { label: string; pct: number }[]
  steps: string[]
  summary: string
}
interface ChatEntry {
  role: 'assistant' | 'user'
  content: string
  question?: Question
  selectedOption?: string
  isStreaming?: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────
const RISK_CFG = {
  low:      { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  icon: CheckCircle,   label: 'LOW RISK' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: Activity,      label: 'MODERATE' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertCircle,   label: 'HIGH RISK' },
  critical: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: AlertTriangle, label: 'CRITICAL' },
}

function parseQuestion(text: string): Question | null {
  const qMatch = text.match(/QUESTION:\s*(.+?)(?=\nA\))/s)
  const aMatch = text.match(/A\)\s*(.+?)(?=\nB\))/s)
  const bMatch = text.match(/B\)\s*(.+?)(?=\nC\))/s)
  const cMatch = text.match(/C\)\s*(.+?)(?=\nD\))/s)
  const dMatch = text.match(/D\)\s*(.+?)$/s)
  if (!qMatch || !aMatch || !bMatch || !cMatch || !dMatch) return null
  return {
    text: qMatch[1].trim(),
    options: [
      { label: 'A', text: aMatch[1].trim() },
      { label: 'B', text: bMatch[1].trim() },
      { label: 'C', text: cMatch[1].trim() },
      { label: 'D', text: dMatch[1].trim() },
    ],
  }
}

function parseDiagnosis(text: string): DiagnosisResult | null {
  if (!text.includes('DIAGNOSIS_COMPLETE')) return null
  const primary = text.match(/PRIMARY:\s*(.+)/)?.[1]?.trim() ?? 'Unknown'
  const risk = (text.match(/RISK:\s*(\w+)/)?.[1]?.toLowerCase() ?? 'low') as DiagnosisResult['risk']
  const confidence = parseInt(text.match(/CONFIDENCE:\s*(\d+)/)?.[1] ?? '0', 10)
  const altLine = text.match(/ALTERNATIVES:\s*(.+)/)?.[1] ?? ''
  const alternatives = altLine.split(',').map(a => {
    const m = a.trim().match(/(.+?)\s*\((\d+)%\)/)
    return m ? { label: m[1].trim(), pct: parseInt(m[2], 10) } : null
  }).filter(Boolean) as { label: string; pct: number }[]
  const stepsBlock = text.match(/STEPS:\n([\s\S]+?)(?=\nSUMMARY:|$)/)?.[1] ?? ''
  const steps = stepsBlock.split('\n').map(s => s.replace(/^-\s*/, '').trim()).filter(Boolean)
  const summary = text.match(/SUMMARY:\s*([\s\S]+?)$/)?.[1]?.trim() ?? ''
  return { primary, risk, confidence, alternatives, steps, summary }
}

// ── Option Button ──────────────────────────────────────────────────────────
const OptionBtn = ({ opt, selected, disabled, onClick }: {
  opt: MCQOption; selected: boolean; disabled: boolean; onClick: () => void
}) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.01 } : {}}
    whileTap={!disabled ? { scale: 0.99 } : {}}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all',
      selected
        ? 'bg-blue-600/30 border-blue-500/60 text-white'
        : disabled
        ? 'bg-white/3 border-white/8 text-slate-600 cursor-not-allowed'
        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-white cursor-pointer'
    )}
  >
    <span className={cn(
      'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border',
      selected ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/5 border-white/15 text-slate-400'
    )}>{opt.label}</span>
    <span className="leading-snug">{opt.text}</span>
    {selected && <CheckCircle className="h-4 w-4 text-blue-400 ml-auto shrink-0" />}
  </motion.button>
)

// ── Result Card ────────────────────────────────────────────────────────────
const ResultCard = ({ result, onRestart }: { result: DiagnosisResult; onRestart: () => void }) => {
  const cfg = RISK_CFG[result.risk] ?? RISK_CFG.low
  const RiskIcon = cfg.icon
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-4">
      {/* Primary diagnosis banner */}
      <div className={cn('rounded-2xl border p-5', cfg.bg, cfg.border)}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-xl bg-white/10')}>
            <RiskIcon className={cn('h-7 w-7', cfg.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-bold tracking-widest mb-0.5', cfg.color)}>{cfg.label}</p>
            <p className={cn('text-xl font-black', cfg.color)}>{result.primary}</p>
            <p className="text-xs text-slate-500 mt-0.5">AI confidence: {result.confidence}%</p>
          </div>
          <div className={cn('text-4xl font-black tabular-nums shrink-0', cfg.color)}>{result.confidence}%</div>
        </div>
        {/* Confidence bar */}
        <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div className={cn('h-full rounded-full', result.risk === 'critical' ? 'bg-red-500' : result.risk === 'high' ? 'bg-orange-500' : result.risk === 'medium' ? 'bg-yellow-500' : 'bg-green-500')}
            initial={{ width: 0 }} animate={{ width: `${result.confidence}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
        </div>
      </div>

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-blue-400" /> Differential Diagnosis
          </h4>
          <div className="space-y-2.5">
            {result.alternatives.map(a => (
              <div key={a.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{a.label}</span>
                  <span className="text-slate-500 font-bold">{a.pct}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-white/30 rounded-full" initial={{ width: 0 }} animate={{ width: `${a.pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {result.summary && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Stethoscope className="h-3.5 w-3.5 text-blue-400" /> Clinical Summary
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
        </div>
      )}

      {/* Immediate steps */}
      {result.steps.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-blue-400" /> Immediate Steps
          </h4>
          <ol className="space-y-2">
            {result.steps.map((step, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                <span className="text-slate-300 leading-snug">{step}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      )}

      {/* Disclaimer + restart */}
      <div className="flex items-start gap-2 text-xs text-slate-500 bg-white/3 border border-white/5 rounded-xl p-3">
        <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-600" />
        This AI assessment is for informational purposes only. Always consult a qualified healthcare provider.
      </div>
      <button onClick={onRestart}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 text-sm font-semibold transition-all">
        <RotateCcw className="h-4 w-4" /> Start New Assessment
      </button>
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export const DiagnosticInterview = () => {
  const [phase, setPhase] = useState<'intro' | 'interview' | 'result'>('intro')
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [apiHistory, setApiHistory] = useState<{ role: string; content: string }[]>([])
  const [questionCount, setQuestionCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null)
  const [streamBuffer, setStreamBuffer] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const token = useAuthStore(s => s.token)

  useEffect(() => {
    fetch('/api/ai/ollama/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setOllamaOnline(d.online)).catch(() => setOllamaOnline(false))
  }, [token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries, streamBuffer])

  const sendToLLM = useCallback(async (history: { role: string; content: string }[]) => {
    setIsLoading(true)
    setStreamBuffer('')

    // Add streaming placeholder
    setEntries(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }])

    try {
      const resp = await fetch('/api/ai/diagnostic-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ history }),
      })
      if (!resp.ok) throw new Error('Request failed')

      const reader = resp.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() || ''
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (!line) continue
          try {
            const evt = JSON.parse(line)
            if (evt.token) {
              fullText += evt.token
              setStreamBuffer(fullText)
            }
            if (evt.done && evt.full) fullText = evt.full
            if (evt.error) {
              fullText = evt.type === 'conn_error'
                ? 'Ollama is not running. Please start it with `ollama serve`.'
                : `Error: ${evt.error}`
            }
          } catch {}
        }
      }

      // Parse the completed response
      const diag = parseDiagnosis(fullText)
      if (diag) {
        setEntries(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: fullText, isStreaming: false }
          return updated
        })
        setResult(diag)
        setPhase('result')
      } else {
        const q = parseQuestion(fullText)
        setEntries(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: fullText,
            question: q ?? undefined,
            isStreaming: false,
          }
          return updated
        })
        setQuestionCount(c => c + 1)
        setApiHistory([...history, { role: 'assistant', content: fullText }])
      }
    } catch {
      setEntries(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Connection error. Please try again.', isStreaming: false }
        return updated
      })
    } finally {
      setIsLoading(false)
      setStreamBuffer('')
    }
  }, [token])

  const startInterview = () => {
    setPhase('interview')
    setEntries([])
    setApiHistory([])
    setQuestionCount(0)
    setResult(null)
    const initial = [{ role: 'user', content: 'Hello, I need a medical assessment. Please start by asking me questions to determine my condition.' }]
    setApiHistory(initial)
    sendToLLM(initial)
  }

  const handleAnswer = (entry: ChatEntry, opt: MCQOption) => {
    if (isLoading) return
    const answerText = `${opt.label}) ${opt.text}`

    // Mark the question as answered
    setEntries(prev => prev.map(e => e === entry ? { ...e, selectedOption: opt.label } : e))

    // Add user answer bubble
    const userEntry: ChatEntry = { role: 'user', content: answerText }
    setEntries(prev => [...prev, userEntry])

    const newHistory = [...apiHistory, { role: 'user', content: answerText }]
    setApiHistory(newHistory)
    sendToLLM(newHistory)
  }

  const restart = () => {
    setPhase('intro')
    setEntries([])
    setApiHistory([])
    setQuestionCount(0)
    setResult(null)
    setStreamBuffer('')
  }

  // ── Intro screen ──
  if (phase === 'intro') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl mx-auto">
          <Stethoscope className="h-8 w-8 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white mb-2">AI Diagnostic Interview</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
            Answer 20-25 multiple choice questions and our AI nurse will analyse your symptoms to provide a diagnosis, risk assessment, and immediate action steps.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {[
            { icon: Clock, label: '5-8 min', sub: 'Duration' },
            { icon: Heart, label: '20-25', sub: 'Questions' },
            { icon: Shield, label: 'Private', sub: 'PII stripped' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <s.icon className="h-4 w-4 text-blue-400 mx-auto mb-1" />
              <p className="text-sm font-bold text-white">{s.label}</p>
              <p className="text-xs text-slate-500">{s.sub}</p>
            </div>
          ))}
        </div>
        {ollamaOnline === false && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            Ollama is offline. Run <code className="bg-white/10 px-1 rounded">ollama serve</code> to enable the diagnostic interview.
          </div>
        )}
        <button onClick={startInterview} disabled={ollamaOnline === false}
          className={cn('flex items-center gap-2 mx-auto px-8 py-3.5 rounded-xl font-bold text-sm transition-all',
            ollamaOnline === false
              ? 'bg-white/5 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20')}>
          <Zap className="h-4 w-4" /> Begin Assessment
        </button>
        <p className="text-xs text-slate-600">Not a substitute for professional medical advice</p>
      </motion.div>
    )
  }

  // ── Result screen ──
  if (phase === 'result' && result) {
    return <ResultCard result={result} onRestart={restart} />
  }

  // ── Interview screen ──
  return (
    <div className="flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden" style={{ height: '680px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
            <Stethoscope className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Diagnostic Interview</p>
            <p className="text-xs text-slate-500">Question {questionCount} of ~25</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-emerald-500 rounded-full" animate={{ width: `${Math.min((questionCount / 25) * 100, 100)}%` }} transition={{ duration: 0.4 }} />
          </div>
          <span className="text-xs text-slate-500">{Math.round(Math.min((questionCount / 25) * 100, 100))}%</span>
          <button onClick={restart} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Restart">
            <RotateCcw className="h-3.5 w-3.5 text-slate-500 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {entries.map((entry, i) => (
          <div key={i} className={cn('flex gap-3', entry.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn('shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5',
              entry.role === 'user' ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-emerald-500/20 border border-emerald-500/30')}>
              {entry.role === 'user' ? <User className="h-3.5 w-3.5 text-blue-400" /> : <Bot className="h-3.5 w-3.5 text-emerald-400" />}
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              {entry.role === 'assistant' && (
                <div className={cn('rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-300 bg-white/5 border border-white/10 max-w-[85%]')}>
                  {entry.isStreaming ? (
                    streamBuffer ? (
                      <span>{streamBuffer}<span className="inline-block w-0.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse align-middle" /></span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {[0,1,2].map(j => (
                          <motion.div key={j} className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
                            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: j * 0.2 }} />
                        ))}
                      </div>
                    )
                  ) : (
                    entry.question ? entry.question.text : entry.content
                  )}
                </div>
              )}
              {entry.role === 'user' && (
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white bg-blue-600/20 border border-blue-500/20 max-w-[85%]">
                    {entry.content}
                  </div>
                </div>
              )}
              {/* MCQ options */}
              {entry.role === 'assistant' && entry.question && !entry.isStreaming && (
                <div className="space-y-2 max-w-[90%]">
                  {entry.question.options.map(opt => (
                    <OptionBtn
                      key={opt.label}
                      opt={opt}
                      selected={entry.selectedOption === opt.label}
                      disabled={!!entry.selectedOption || isLoading}
                      onClick={() => handleAnswer(entry, opt)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
