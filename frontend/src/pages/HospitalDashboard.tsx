import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Zap, TrendingUp, Users, Shield, Wifi, WifiOff,
  Play, RefreshCw, CheckCircle, AlertCircle, BarChart3, Lock
} from 'lucide-react';
import { cn } from '../components/ui/shared';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface FLStatus {
  accuracy: number;
  current_round: number;
  total_rounds: number;
  clients: number;
  privacy_budget: string;
  history: { round: number; accuracy: number; loss: number; clients: number }[];
}

interface WsEvent {
  type: string;
  round?: number;
  accuracy?: number;
  loss?: number;
  clients?: number;
  epsilon?: number;
  message?: string;
  step?: number;
  total_steps?: number;
}

const AccuracyBar = ({ value, label }: { value: number; label: string }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold text-white tabular-nums">{(value * 100).toFixed(1)}%</span>
    </div>
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  </div>
);

export const HospitalDashboard = () => {
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'degraded' | 'disconnected'>('disconnected');
  const [liveEvent, setLiveEvent] = useState<WsEvent | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIdleRef = useRef(0);
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();

  const { data: status, isLoading } = useQuery<FLStatus>({
    queryKey: ['fl-status'],
    queryFn: async () => { const { data } = await api.get('/api/fl/status'); return data; },
    refetchInterval: isPolling ? 3000 : false,
  });

  useEffect(() => {
    if (!token) return;
    setWsStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/fl?token=${token}`);
    ws.onopen = () => setWsStatus('connected');
    ws.onmessage = (e) => {
      try {
        const evt: WsEvent = JSON.parse(e.data);
        if (evt.type === 'info') { if (evt.message?.includes('Redis unavailable')) setWsStatus('degraded'); return; }
        if (evt.type === 'heartbeat') return;
        if (evt.type === 'fl_progress' || evt.type === 'round_status') {
          setLiveEvent(evt);
          queryClient.invalidateQueries({ queryKey: ['fl-status'] });
        }
      } catch {}
    };
    ws.onerror = () => setWsStatus('disconnected');
    ws.onclose = () => setWsStatus('disconnected');
    return () => ws.close();
  }, [token]);

  const startPolling = () => {
    setIsPolling(true);
    pollIdleRef.current = 0;
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      pollIdleRef.current += 1;
      queryClient.invalidateQueries({ queryKey: ['fl-status'] });
      if (pollIdleRef.current >= 4) { setIsPolling(false); if (pollTimerRef.current) clearInterval(pollTimerRef.current); }
    }, 3000);
  };

  useEffect(() => () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); }, []);

  const triggerMutation = useMutation({
    mutationFn: () => api.post('/api/fl/trigger'),
    onSuccess: (res) => { toast.success(res.data.message || 'FL round triggered'); startPolling(); queryClient.invalidateQueries({ queryKey: ['fl-status'] }); },
    onError: (err: any) => { toast.error(err.response?.data?.detail || 'Failed to trigger FL round'); },
  });

  const wsColor = wsStatus === 'connected' ? 'text-green-400 border-green-500/30 bg-green-500/10'
    : wsStatus === 'degraded' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
    : wsStatus === 'connecting' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
    : 'text-slate-400 border-white/10 bg-white/5';
  const WsIcon = wsStatus === 'connected' ? Wifi : WifiOff;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Federated Learning Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">{user?.hospital_id ? `Hospital ${user.hospital_id}` : 'Hospital Admin'} · Global model training</p>
          </div>
          <div className="flex items-center gap-3">
            {isPolling && (
              <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCw className="h-3 w-3" /></motion.div>
                Syncing...
              </div>
            )}
            <div className={cn('flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border font-semibold', wsColor)}>
              <WsIcon className="h-3.5 w-3.5" />
              {wsStatus === 'connected' ? 'Live' : wsStatus === 'degraded' ? 'Polling' : wsStatus === 'connecting' ? 'Connecting' : 'Offline'}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Global Accuracy', value: status ? `${(status.accuracy * 100).toFixed(1)}%` : '-', icon: TrendingUp, accent: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { label: 'Current Round', value: String(status?.current_round ?? '-'), icon: Activity, accent: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
            { label: 'Clients', value: String(status?.clients ?? '-'), icon: Users, accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Privacy Budget', value: status?.privacy_budget ?? 'e=0.00', icon: Lock, accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <div className={cn('p-3 rounded-xl border shrink-0', s.accent)}><s.icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="text-xl font-black text-white truncate">{isLoading ? '...' : s.value}</p>
                <p className="text-xs text-slate-400 truncate">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-400" /> Training History</h3>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}</div>
            ) : !status?.history?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <BarChart3 className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">No training rounds yet</p>
                <p className="text-xs mt-1 opacity-60">Trigger a round to begin</p>
              </div>
            ) : (
              <div className="space-y-4">
                {status.history.map((r) => (
                  <div key={r.round}>
                    <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Round {r.round}</span><span>{r.clients} clients · loss {r.loss.toFixed(3)}</span></div>
                    <AccuracyBar value={r.accuracy} label="" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Zap className="h-4 w-4 text-violet-400" /> Trigger Round</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Initiates a new federated learning aggregation round across all participating hospitals.</p>
              <button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending || isPolling}
                className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all',
                  triggerMutation.isPending || isPolling ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20')}>
                {triggerMutation.isPending ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCw className="h-4 w-4" /></motion.div> Triggering...</>
                ) : isPolling ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Waiting for results...</>
                ) : (
                  <><Play className="h-4 w-4" /> Trigger FL Round</>
                )}
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-400" /> Live Events</h3>
              <AnimatePresence mode="popLayout">
                {liveEvent ? (
                  <motion.div key={JSON.stringify(liveEvent)} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 space-y-1">
                    {liveEvent.type === 'fl_progress' ? (
                      <>
                        <div className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /><span className="text-xs font-bold text-emerald-400">Round {liveEvent.round} Complete</span></div>
                        <p className="text-xs text-slate-300">Accuracy: <span className="font-bold text-white">{((liveEvent.accuracy ?? 0) * 100).toFixed(2)}%</span> · Loss: <span className="font-bold text-white">{liveEvent.loss?.toFixed(4)}</span></p>
                        <p className="text-xs text-slate-500">{liveEvent.clients} clients · e={liveEvent.epsilon?.toFixed(2)}</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCw className="h-3.5 w-3.5 text-blue-400" /></motion.div>
                          <span className="text-xs font-bold text-blue-400">Step {liveEvent.step}/{liveEvent.total_steps}</span>
                        </div>
                        <p className="text-xs text-slate-400">{liveEvent.message}</p>
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-6 text-slate-600">
                    <AlertCircle className="h-6 w-6 mb-1.5 opacity-30" />
                    <p className="text-xs">No live events yet</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Shield className="h-4 w-4 text-amber-400" /> Privacy Guarantees</h3>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex justify-between"><span>Differential Privacy</span><span className="text-green-400 font-semibold">Active</span></div>
                <div className="flex justify-between"><span>Secure Aggregation</span><span className="text-green-400 font-semibold">Active</span></div>
                <div className="flex justify-between"><span>Budget Used</span><span className="text-white font-bold">{status?.privacy_budget ?? 'e=0.00'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
