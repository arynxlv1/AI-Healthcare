import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, AlertTriangle, CheckCircle, Search, Clock,
  Stethoscope, FileText, ChevronRight, Activity, X
} from 'lucide-react';
import { cn } from '../components/ui/shared';
import api from '../lib/api';
import { toast } from 'sonner';

const URGENCY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  high:     { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-400' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  low:      { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  dot: 'bg-green-400' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pending Review', color: 'text-yellow-400' },
  confirmed:  { label: 'Confirmed',      color: 'text-green-400'  },
  overridden: { label: 'Overridden',     color: 'text-blue-400'   },
};

export const DoctorPortal = () => {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: triageQueue = [], isLoading } = useQuery({
    queryKey: ['triage-queue'],
    queryFn: async () => { const { data } = await api.get('/api/triage/queue'); return data; },
    refetchInterval: 15000,
  });

  const confirmMutation = useMutation({
    mutationFn: (caseId: string) => api.post(`/api/triage/${caseId}/confirm`),
    onSuccess: () => {
      toast.success('Case confirmed');
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      setActiveSession(null);
    },
    onError: () => toast.error('Failed to confirm case'),
  });

  const overrideMutation = useMutation({
    mutationFn: ({ caseId, note }: { caseId: string; note: string }) =>
      api.post(`/api/triage/${caseId}/override?note=${encodeURIComponent(note)}`),
    onSuccess: () => {
      toast.success('Case overridden with clinical notes');
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      setActiveSession(null);
      setOverrideNotes('');
    },
    onError: () => toast.error('Override failed — notes must be at least 5 characters'),
  });

  const filtered = triageQueue.filter((s: any) =>
    !search || s.symptoms?.join(' ').toLowerCase().includes(search.toLowerCase()) ||
    s.ai_diagnosis?.toLowerCase().includes(search.toLowerCase())
  );

  const pending   = filtered.filter((s: any) => s.status === 'pending').length;
  const urgent    = filtered.filter((s: any) => s.urgency?.toLowerCase() === 'high').length;

  const urgencyCfg = (u: string) => URGENCY_CONFIG[u?.toLowerCase()] ?? URGENCY_CONFIG.low;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white">Triage Portal</h1>
              <p className="text-slate-400 text-sm mt-0.5">Review and validate AI-generated assessments</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-black text-yellow-400">{pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-black text-red-400">{urgent}</p>
                <p className="text-xs text-slate-500">Urgent</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-black text-white">{filtered.length}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Queue sidebar */}
          <aside className="lg:col-span-2 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search symptoms or diagnosis..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 transition-all"
              />
            </div>

            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
                ))
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No cases in queue</p>
                </div>
              ) : filtered.map((session: any) => {
                const cfg = urgencyCfg(session.urgency);
                const isActive = activeSession?.id === session.id;
                return (
                  <motion.button
                    key={session.id}
                    layout
                    onClick={() => { setActiveSession(session); setOverrideNotes(''); }}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border transition-all',
                      isActive
                        ? 'bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/20'
                        : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full shrink-0 mt-0.5', cfg.dot,
                          session.urgency?.toLowerCase() === 'high' && 'animate-pulse')} />
                        <span className="text-xs font-mono text-slate-400 truncate max-w-[100px]">
                          {session.id.slice(0, 8)}…
                        </span>
                      </div>
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', cfg.color, cfg.bg, cfg.border)}>
                        {session.urgency?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{session.ai_diagnosis}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {session.symptoms?.slice(0, 3).map((s: string) => s.replace(/-/g, ' ')).join(', ')}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn('text-xs', STATUS_CONFIG[session.status]?.color ?? 'text-slate-400')}>
                        {STATUS_CONFIG[session.status]?.label ?? session.status}
                      </span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-400" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </aside>

          {/* Detail panel */}
          <main className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {activeSession ? (
                <motion.div
                  key={activeSession.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  {/* Case header */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Stethoscope className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs text-slate-400 font-mono">Case {activeSession.id.slice(0, 8)}</span>
                        </div>
                        <h2 className="text-xl font-black text-white">{activeSession.ai_diagnosis}</h2>
                      </div>
                      <button onClick={() => setActiveSession(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-xs text-slate-500 mb-1">Urgency</p>
                        <div className="flex items-center gap-2">
                          <span className={cn('w-2 h-2 rounded-full', urgencyCfg(activeSession.urgency).dot)} />
                          <span className={cn('font-bold text-sm', urgencyCfg(activeSession.urgency).color)}>
                            {activeSession.urgency?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-xs text-slate-500 mb-1">Status</p>
                        <span className={cn('font-bold text-sm', STATUS_CONFIG[activeSession.status]?.color)}>
                          {STATUS_CONFIG[activeSession.status]?.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5" /> Reported Symptoms
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {activeSession.symptoms?.map((s: string) => (
                        <span key={s} className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs px-3 py-1.5 rounded-full font-medium">
                          {s.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Doctor validation */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" /> Clinical Validation
                    </h3>
                    <textarea
                      value={overrideNotes}
                      onChange={e => setOverrideNotes(e.target.value)}
                      placeholder="Add clinical notes (required for override, min 5 characters)..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/10 transition-all resize-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => confirmMutation.mutate(activeSession.id)}
                        disabled={confirmMutation.isPending || overrideMutation.isPending}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {confirmMutation.isPending ? 'Confirming…' : 'Confirm AI Result'}
                      </button>
                      <button
                        onClick={() => overrideMutation.mutate({ caseId: activeSession.id, note: overrideNotes })}
                        disabled={overrideNotes.trim().length < 5 || confirmMutation.isPending || overrideMutation.isPending}
                        className="flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        {overrideMutation.isPending ? 'Overriding…' : 'Manual Override'}
                      </button>
                    </div>
                    {overrideNotes.length > 0 && overrideNotes.trim().length < 5 && (
                      <p className="text-xs text-red-400">Notes must be at least 5 characters to override</p>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-[500px] flex flex-col items-center justify-center bg-white/3 border border-white/8 border-dashed rounded-2xl text-slate-500"
                >
                  <Users className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm">Select a case from the queue</p>
                  <p className="text-xs mt-1 opacity-60">Click any case on the left to review</p>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};
