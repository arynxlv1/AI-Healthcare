import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { flApi, FLStatus } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface LogLine { time: string; text: string; color: string }

const logColor = (line: string): string => {
  if (line.includes('ERROR') || line.includes('WARN'))  return 'text-sienna';
  if (line.includes('AUTHENTICATED') || line.includes('COMPLETE') || line.includes('VERIFIED')) return 'text-acid';
  if (line.includes('INFO') || line.includes('PRIVACY') || line.includes('APPROACHING')) return 'text-ochre';
  return 'text-parchment/60';
};

export const FLStatusPanel: React.FC = () => {
  const [triggerStatus, setTriggerStatus] = useState<'idle' | 'running'>('idle');
  const [logs, setLogs]   = useState<LogLine[]>([
    { time: '14:02:11', text: 'INITIALIZING SECURE ENCLAVE...', color: 'text-parchment/50' },
    { time: '14:02:15', text: 'NODE_07: AUTHENTICATED SUCCESSFULLY', color: 'text-acid' },
    { time: '14:02:18', text: 'INFO: PARTIAL GRADIENT DESCENT STARTING', color: 'text-ochre' },
    { time: '14:02:45', text: 'SYNC_ROUND_COMPLETE', color: 'text-parchment/60' },
    { time: '14:03:15', text: 'IDLE_WAITING_FOR_TRIGGER', color: 'text-parchment/50' },
  ]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef      = useRef<WebSocket | null>(null);
  const token      = useAuthStore((s) => s.token);
  const qc         = useQueryClient();

  const { data: status, isLoading } = useQuery<FLStatus>({
    queryKey: ['fl-status'],
    queryFn: flApi.status,
    refetchInterval: 30000,
  });

  // WebSocket for live events
  useEffect(() => {
    if (!token) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/fl?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        if (evt.type === 'heartbeat') return;
        const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const text = evt.message ?? `${evt.type?.toUpperCase()} round=${evt.round ?? ''} acc=${evt.accuracy ? (evt.accuracy * 100).toFixed(2) + '%' : ''}`;
        setLogs((prev) => [...prev.slice(-49), { time: now, text, color: logColor(text) }]);
        if (evt.type === 'fl_progress') {
          qc.invalidateQueries({ queryKey: ['fl-status'] });
          setTriggerStatus('idle');
        }
      } catch {}
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, [token]);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const triggerMut = useMutation({
    mutationFn: flApi.trigger,
    onSuccess: (data: any) => {
      toast.success(data.message ?? 'FL round triggered');
      setTriggerStatus('running');
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs((prev) => [...prev, { time: now, text: 'AGGREGATION ROUND INITIATED...', color: 'text-ochre' }]);
      qc.invalidateQueries({ queryKey: ['fl-status'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? 'Trigger failed'),
  });

  const chartData = status?.history?.map((r) => ({
    round: `R${r.round}`,
    accuracy: +(r.accuracy * 100).toFixed(2),
    loss: +(r.loss * 100).toFixed(2),
  })) ?? [];

  // Privacy budget bar
  const epsilonMatch = status?.privacy_budget?.match(/[\d.]+/);
  const epsilon = epsilonMatch ? parseFloat(epsilonMatch[0]) : 0;
  const maxEpsilon = 4.0;
  const epsilonPct = Math.min((epsilon / maxEpsilon) * 100, 100);
  const epsilonBarColor = epsilonPct >= 90 ? 'bg-sienna' : epsilonPct >= 70 ? 'bg-ochre' : 'bg-acid';

  return (
    <div className="space-y-8">
      {/* Stat blocks */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-0">
        {[
          { label: 'Global Accuracy', value: status ? `${(status.accuracy * 100).toFixed(1)}%` : '—', sub: '+2.4% vs PRV_ITERATION', subColor: 'text-acid' },
          { label: 'Active Nodes',    value: status ? `${status.clients}/${status.clients}` : '—', sub: 'ALL SYSTEMS NOMINAL', subColor: 'text-ink' },
          { label: 'Current Round',   value: status ? String(status.current_round) : '—', sub: 'APPROACHING THRESHOLD', subColor: 'text-ochre' },
          { label: 'Privacy Budget',  value: status?.privacy_budget ?? 'ε=0.00', sub: 'DISTRIBUTED ENCRYPTION', subColor: 'text-ink' },
        ].map((s, i) => (
          <div key={s.label} className={`py-4 ${i < 3 ? 'border-r border-linen pr-8' : 'pl-8'} ${i > 0 ? 'px-8' : ''}`}>
            <p className="font-mono text-[11px] uppercase text-fog mb-2">{s.label}</p>
            <h3 className="text-4xl font-headline font-bold text-ink">
              {isLoading ? '...' : s.value}
            </h3>
            <div className="double-rule"/>
            <p className={`font-mono text-[9px] ${s.subColor}`}>{s.sub}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Chart + privacy budget */}
        <div className="lg:col-span-8 space-y-8">
          {/* Training history chart */}
          <div className="bg-cream p-8 shadow-hard border-t-[3px] border-ochre">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-headline font-bold text-ink">Training History</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-ink inline-block"/>
                  <span className="font-mono text-[10px] uppercase">Accuracy</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-sienna inline-block"/>
                  <span className="font-mono text-[10px] uppercase">Loss</span>
                </div>
              </div>
            </div>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="font-mono text-[11px] text-fog uppercase">No training rounds yet — trigger a round to begin</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="#D9D0BE" strokeDasharray="2 2" vertical={false}/>
                  <XAxis dataKey="round" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#6F7B65' }} axisLine={{ stroke: '#D9D0BE' }} tickLine={false}/>
                  <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#6F7B65' }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11, background: '#EDE7D9', border: '1px solid #D9D0BE', borderRadius: 0 }}/>
                  <Line type="linear" dataKey="accuracy" stroke="#2A2A26" strokeWidth={2} dot={{ fill: '#2A2A26', r: 3, strokeWidth: 0 }} activeDot={{ r: 4 }}/>
                  <Line type="linear" dataKey="loss" stroke="#A63B10" strokeWidth={1.5} strokeDasharray="4 2" dot={{ fill: '#A63B10', r: 2, strokeWidth: 0 }}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Privacy budget */}
          <div className="bg-linen/10 border border-linen p-8 shadow-hard">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-mono text-xs uppercase font-bold text-ink">Differential Privacy Budget Consumption</h4>
              <span className="font-mono text-xs text-ochre">THRESHOLD: ε = {maxEpsilon.toFixed(1)}</span>
            </div>
            <div className="flex items-baseline space-x-4 mb-6">
              <span className="font-mono text-[36px] font-bold text-ink leading-none">
                {status?.privacy_budget ?? 'ε=0.00'}
              </span>
              <span className="font-mono text-xs text-fog uppercase">Budget Spent</span>
            </div>
            <div className="relative w-full h-[10px] border-t border-b border-linen">
              <div className={`absolute left-0 top-0 bottom-0 ${epsilonBarColor} transition-all duration-700`} style={{ width: `${epsilonPct}%` }}/>
            </div>
            <div className="mt-4 flex justify-between font-mono text-[9px] uppercase text-fog">
              <span>Start [0.0]</span>
              <span>Target Horizon [{maxEpsilon.toFixed(1)}]</span>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Trigger card */}
          <div className="bg-parchment border border-ink p-8 flex flex-col items-center text-center shadow-hard">
            <svg className="w-10 h-10 text-ink mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <h3 className="text-2xl font-headline font-bold text-ink mb-2">Start New Round</h3>
            <p className="font-body text-sm text-fog leading-relaxed mb-8">
              Initiate decentralised model weight aggregation across all institutional nodes.
            </p>
            <button
              onClick={() => triggerMut.mutate()}
              disabled={triggerMut.isPending || triggerStatus === 'running'}
              className="group w-full h-[48px] bg-ink text-parchment flex items-center justify-center space-x-3 hover:bg-[#363630] transition-colors relative overflow-hidden disabled:opacity-60"
            >
              <span className="relative flex h-3 w-3">
                {triggerStatus === 'running' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre opacity-75"/>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-ochre"/>
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-acid opacity-75"/>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-acid"/>
                  </>
                )}
              </span>
              <span className="font-mono text-[12px] uppercase font-bold tracking-widest">
                {triggerMut.isPending ? 'Triggering...' : triggerStatus === 'running' ? 'Running...' : 'Execute Aggregation'}
              </span>
            </button>
          </div>

          {/* Live log feed */}
          <div className="bg-ink p-6 h-[400px] flex flex-col border border-linen">
            <div className="flex items-center justify-between mb-4 border-b border-[#363630] pb-2">
              <span className="font-mono text-[10px] text-parchment uppercase tracking-widest">System_Logs_v4.2</span>
              <span className="w-2 h-2 bg-acid rounded-full animate-pulse"/>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-2 terminal-scroll">
              {logs.map((l, i) => (
                <p key={i} className={l.color}>
                  [{l.time}] {l.text}
                </p>
              ))}
              <div className="animate-pulse inline-block w-2 h-4 bg-acid/50 ml-1"/>
              <div ref={logsEndRef}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
