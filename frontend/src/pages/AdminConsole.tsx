import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuditLogTable } from '../components/AuditLogTable';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { auditApi, flApi, triageApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface ServiceStatus { name: string; status: 'ok' | 'degraded' | 'offline'; latency: string }

const SERVICE_COLOR = { ok: 'bg-acid', degraded: 'bg-ochre', offline: 'bg-sienna' };

const TrainingPanel = () => {
  const [logs, setLogs]           = useState<string[]>([]);
  const [training, setTraining]   = useState(false);
  const [result, setResult]       = useState<'success' | 'error' | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const token = useAuthStore((s) => s.token);
  const qc    = useQueryClient();

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const startTraining = async () => {
    setLogs([]); setTraining(true); setResult(null);
    try {
      const res = await fetch('/api/train/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast.error('Training failed to start'); setTraining(false); return; }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
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
            if (evt.log) setLogs((p) => [...p, evt.log]);
            if (evt.done) {
              setResult(evt.success ? 'success' : 'error');
              setTraining(false);
              qc.invalidateQueries({ queryKey: ['model-status'] });
              if (evt.success) toast.success('Model trained and exported');
              else toast.error('Training failed — check logs');
            }
          } catch {}
        }
      }
    } catch { toast.error('Connection error'); setTraining(false); }
  };

  const logColor = (line: string) => {
    if (line.includes('Error') || line.includes('failed')) return 'text-sienna';
    if (line.includes('complete') || line.includes('exported') || line.includes('Acc')) return 'text-acid';
    if (line.includes('Epoch')) return 'text-ochre';
    return 'text-parchment/60';
  };

  return (
    <div className="bg-cream shadow-hard border-t-[3px] border-fog">
      <div className="flex items-center justify-between p-6 border-b border-linen">
        <h3 className="font-headline text-lg text-ink">Model Training</h3>
        <button
          onClick={startTraining} disabled={training}
          className="bg-ink text-parchment px-6 py-2 font-mono text-[11px] uppercase tracking-widest hover:bg-moss hover:text-acid transition-all disabled:opacity-50 relative overflow-hidden"
        >
          {training ? 'Training...' : 'Train Model'}
          {!training && <span className="scanning-line opacity-0 hover:opacity-100"/>}
        </button>
      </div>
      {result && (
        <div className={`mx-6 mt-4 px-4 py-2 font-mono text-[11px] border ${result === 'success' ? 'text-acid border-acid/30 bg-acid/5' : 'text-sienna border-sienna/30 bg-sienna/5'}`}>
          {result === 'success' ? '✓ Training complete — model.onnx updated' : '✗ Training failed — see logs below'}
        </div>
      )}
      <div className="p-6">
        <div className="bg-ink border border-linen/20 p-4 font-mono text-[11px] min-h-[160px] max-h-[280px] overflow-y-auto terminal-scroll">
          {logs.length === 0 && !training ? (
            <span className="text-parchment/40">Click "Train Model" to start. Logs will stream here.</span>
          ) : (
            <div className="space-y-0.5">
              {logs.map((line, i) => (
                <div key={i} className={logColor(line)}>
                  <span className="text-parchment/20 mr-2 select-none">{String(i + 1).padStart(3, '0')}</span>
                  {line}
                </div>
              ))}
              {training && <div className="flex items-center gap-1.5 text-ochre mt-1"><span className="w-1.5 h-1.5 bg-ochre rounded-full animate-pulse"/>Running...</div>}
              <div ref={logsEndRef}/>
            </div>
          )}
        </div>
        <p className="font-mono text-[9px] text-fog mt-2 uppercase">
          Trains on synthetic medical data · Exports to ml/model.onnx · Reloads on next inference
        </p>
      </div>
    </div>
  );
};

export const AdminConsole = () => {
  const [services] = useState<ServiceStatus[]>([
    { name: 'FL_ORCHESTRATOR', status: 'ok',       latency: '42ms'    },
    { name: 'ENCLAVE_SHIELD',  status: 'ok',       latency: '12ms'    },
    { name: 'DATA_INGEST_V4',  status: 'degraded', latency: '890ms'   },
    { name: 'BIO_LLM_API',     status: 'ok',       latency: '156ms'   },
    { name: 'SECURE_AUTH',     status: 'ok',       latency: '8ms'     },
  ]);

  const { data: auditLogs = [] } = useQuery({ queryKey: ['audit-logs', 1], queryFn: () => auditApi.logs(1, 50) });
  const { data: flStatus }       = useQuery({ queryKey: ['fl-status'],     queryFn: flApi.status });
  const { data: queue = [] }     = useQuery({ queryKey: ['triage-queue'],  queryFn: triageApi.queue });

  const stats = [
    { label: 'Audit Entries',    value: auditLogs.length },
    { label: 'FL Rounds',        value: flStatus?.current_round ?? 0 },
    { label: 'Triage Cases',     value: queue.length },
    { label: 'Active Hospitals', value: new Set(queue.map((c: any) => c.hospital_id)).size || 1 },
  ];

  return (
    <div className="ml-0 min-h-screen bg-parchment grain-overlay">
      <div className="p-12 max-w-7xl mx-auto">
        {/* Page header */}
        <section className="mb-12">
          <h2 className="font-headline text-[36px] text-ink leading-tight">System</h2>
          <p className="font-mono text-[14px] text-fog mt-1 tracking-wider">Console // Global Infrastructure Node</p>
        </section>

        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-linen mb-8">
          {stats.map((s, i) => (
            <div key={s.label} className={`p-6 ${i < 3 ? 'border-r border-linen' : ''}`}>
              <p className="font-mono text-[10px] text-fog uppercase mb-1">{s.label}</p>
              <p className="font-headline text-3xl font-bold text-ink">{s.value}</p>
            </div>
          ))}
        </div>

        {/* System health strip */}
        <section className="mb-16">
          <div className="double-rule"/>
          <div className="grid grid-cols-5 divide-x divide-linen py-4">
            {services.map((svc) => (
              <div key={svc.name} className="px-6 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body font-bold text-ink text-sm truncate">{svc.name}</span>
                  {/* 4px square status indicator per spec */}
                  <div className={`w-3 h-3 ${SERVICE_COLOR[svc.status]}`}/>
                </div>
                <span className="font-mono text-[10px] text-fog">RESP: {svc.latency}</span>
              </div>
            ))}
          </div>
          <div className="double-rule"/>
        </section>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Audit log */}
          <ErrorBoundary>
            <AuditLogTable />
          </ErrorBoundary>

          {/* Right: Model training + system metrics */}
          <div className="space-y-8">
            <TrainingPanel />

            {/* System metrics */}
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: 'CPU_UTILIZATION', value: '34.2', unit: '%',    pct: 34,  accent: 'border-l-acid'   },
                { label: 'AVG_LATENCY',     value: '128',  unit: 'ms',   pct: null, accent: 'border-l-sienna' },
                { label: 'THROUGHPUT',      value: '4.8',  unit: 'Gb/s', pct: 68,  accent: 'border-l-acid'   },
              ].map((m) => (
                <div key={m.label} className={`bg-linen/10 border-l-4 ${m.accent} p-6 shadow-hard`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-mono text-[10px] text-fog uppercase">{m.label}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-mono text-4xl font-bold text-ink">{m.value}</span>
                    <span className="font-mono text-lg text-fog ml-1">{m.unit}</span>
                  </div>
                  {m.pct !== null && (
                    <div className="mt-4 h-1 w-full bg-linen/30 overflow-hidden">
                      <div className="h-full bg-acid" style={{ width: `${m.pct}%` }}/>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
