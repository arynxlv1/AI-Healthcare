import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  History, Database, FileText, Search, Shield, Activity,
  Download, Cpu, Play, CheckCircle, XCircle, RefreshCw, Terminal
} from 'lucide-react';
import { cn } from '../components/ui/shared';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

const ACTION_COLORS: Record<string, string> = {
  CONFIRM_TRIAGE:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  OVERRIDE_TRIAGE: 'text-blue-400    bg-blue-500/10    border-blue-500/20',
  PII_STRIPPED:    'text-violet-400  bg-violet-500/10  border-violet-500/20',
  ACCESS_DENIED:   'text-red-400     bg-red-500/10     border-red-500/20',
  TRIGGER_FL:      'text-amber-400   bg-amber-500/10   border-amber-500/20',
};
const defaultColor = 'text-slate-400 bg-white/5 border-white/10';

// ── Model Training Panel ───────────────────────────────────────────────────
const TrainingPanel = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<'success' | 'error' | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const token = useAuthStore(s => s.token);
  const queryClient = useQueryClient();

  const { data: modelStatus } = useQuery({
    queryKey: ['model-status'],
    queryFn: async () => { const { data } = await api.get('/api/train/status'); return data; },
    refetchInterval: isTraining ? 3000 : false,
  });

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const startTraining = async () => {
    setLogs([]); setIsTraining(true); setTrainResult(null);
    try {
      const response = await fetch('/api/train/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json();
        toast.error(err.detail || 'Training failed to start');
        setIsTraining(false); return;
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
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
            if (evt.log) setLogs(prev => [...prev, evt.log]);
            if (evt.done) {
              setTrainResult(evt.success ? 'success' : 'error');
              setIsTraining(false);
              queryClient.invalidateQueries({ queryKey: ['model-status'] });
              if (evt.success) toast.success('Model trained and exported successfully');
              else toast.error('Training failed — check logs');
            }
          } catch {}
        }
      }
    } catch {
      toast.error('Connection error during training');
      setIsTraining(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-white/8">
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <Cpu className="h-4 w-4 text-violet-400" /> Model Training
        </h3>
        <div className="flex items-center gap-3">
          {modelStatus?.model_exists && (
            <div className="text-xs text-slate-500">
              Last trained: <span className="text-slate-300">{new Date(modelStatus.last_trained).toLocaleString()}</span>
              <span className="ml-2 text-slate-600">({modelStatus.size_kb} KB)</span>
            </div>
          )}
          <motion.button onClick={startTraining} disabled={isTraining}
            whileHover={!isTraining ? { scale: 1.04 } : {}} whileTap={!isTraining ? { scale: 0.96 } : {}}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative overflow-hidden',
              isTraining ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20'
            )}>
            {!isTraining && (
              <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }} />
            )}
            <span className="relative flex items-center gap-2">
              {isTraining
                ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCw className="h-3.5 w-3.5" /></motion.div> Training...</>
                : <><Play className="h-3.5 w-3.5" /> Train Model</>}
            </span>
          </motion.button>
        </div>
      </div>

      <div className="p-5">
        <AnimatePresence>
          {trainResult && (
            <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className={cn('flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border mb-4',
                trainResult === 'success' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'
              )}>
              {trainResult === 'success'
                ? <><CheckCircle className="h-4 w-4" /> Training complete — model.onnx updated</>
                : <><XCircle className="h-4 w-4" /> Training failed — see logs below</>}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-slate-950 border border-white/8 rounded-xl p-4 font-mono text-xs min-h-[160px] max-h-[280px] overflow-y-auto">
          {logs.length === 0 && !isTraining ? (
            <div className="flex items-center gap-2 text-slate-600">
              <Terminal className="h-4 w-4" />
              <span>Click "Train Model" to start. Logs will stream here.</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((line, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className={cn('leading-relaxed',
                    line.includes('Error') || line.includes('failed') ? 'text-red-400'
                    : line.includes('complete') || line.includes('exported') || line.includes('Acc') ? 'text-emerald-400'
                    : line.includes('Epoch') ? 'text-blue-300'
                    : 'text-slate-400'
                  )}>
                  <span className="text-slate-600 mr-2 select-none">{String(i + 1).padStart(3, '0')}</span>
                  {line}
                </motion.div>
              ))}
              {isTraining && (
                <div className="flex items-center gap-1.5 text-violet-400 mt-1">
                  <motion.div className="w-1.5 h-1.5 bg-violet-400 rounded-full" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                  Running...
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
        <p className="text-xs text-slate-600 mt-2">Trains on synthetic medical data · Exports to ml/model.onnx · Reloads automatically on next diagnosis</p>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
export const AdminConsole = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 50;

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: async () => {
      const { data } = await api.get('/api/audit/logs', { params: { page, page_size: PAGE_SIZE } });
      return data;
    },
  });

  const filtered = auditLogs.filter((l: any) =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.user_id?.toLowerCase().includes(search.toLowerCase()) ||
    l.resource_type?.toLowerCase().includes(search.toLowerCase())
  );

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit_logs.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: 'Total Log Entries', value: auditLogs.length, icon: FileText, accent: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { label: 'Unique Actions',    value: new Set(auditLogs.map((l: any) => l.action)).size, icon: Activity, accent: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    { label: 'Data Sources',      value: new Set(auditLogs.map((l: any) => l.resource_type)).size, icon: Database, accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <motion.div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-600/4 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 10, repeat: Infinity }} />
        <motion.div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-600/4 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 12, repeat: Infinity, delay: 2 }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Super Admin Console</h1>
            <p className="text-slate-400 text-sm mt-0.5">Global audit trail, compliance monitoring, and model management</p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-xs font-semibold">
            <motion.div className="w-1.5 h-1.5 bg-amber-400 rounded-full" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <Shield className="h-3.5 w-3.5" /> Compliance Mode
          </motion.div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -2, scale: 1.02 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 cursor-default">
              <div className={cn('p-3 rounded-xl border', s.accent)}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Model Training */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <TrainingPanel />
        </motion.div>

        {/* Audit table */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/8">
            <h3 className="font-bold flex items-center gap-2 text-sm">
              <History className="h-4 w-4 text-amber-400" /> Audit Log
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter logs..."
                  className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 w-48 transition-all" />
              </div>
              <motion.button onClick={exportJSON} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-all">
                <Download className="h-3.5 w-3.5" /> Export
              </motion.button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {['Action', 'User', 'Resource', 'Timestamp', 'Details'].map(h => (
                    <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="py-3 px-5"><div className="h-3 bg-white/5 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500 text-sm">No audit records found</td></tr>
                ) : filtered.map((log: any, i: number) => {
                  const color = ACTION_COLORS[log.action] ?? defaultColor;
                  return (
                    <motion.tr key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.5) }}
                      className="hover:bg-white/3 transition-colors">
                      <td className="py-3 px-5"><span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', color)}>{log.action}</span></td>
                      <td className="py-3 px-5 text-xs text-slate-400 font-mono max-w-[120px] truncate">{log.user_id}</td>
                      <td className="py-3 px-5 text-xs text-slate-500 font-mono">{log.resource_type}{log.resource_id ? `:${log.resource_id.slice(0, 8)}` : ''}</td>
                      <td className="py-3 px-5 text-xs text-slate-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-3 px-5 text-xs text-slate-600 max-w-[160px] truncate">{log.details ? JSON.stringify(log.details) : '-'}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-white/8">
            <p className="text-xs text-slate-500">Page {page} · {filtered.length} entries shown</p>
            <div className="flex gap-2">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-all">Previous</motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setPage(p => p + 1)} disabled={auditLogs.length < PAGE_SIZE}
                className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-all">Next</motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
