import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { triageApi, TriageCase } from '../lib/api';
import { toast } from 'sonner';

type Filter = 'all' | 'high' | 'pending' | 'unassigned';

const URGENCY_COLOR: Record<string, string> = {
  high:     'text-sienna',
  critical: 'text-sienna',
  medium:   'text-[#C97B84]',
  low:      'text-fog',
};

export const TriageQueue: React.FC = () => {
  const [filter, setFilter]         = useState<Filter>('all');
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [notes, setNotes]           = useState<Record<string, string>>({});
  const [confirmedIds, setConfirmed] = useState<Set<string>>(new Set());
  const [overriddenIds, setOverridden] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data: queue = [], isLoading } = useQuery<TriageCase[]>({
    queryKey: ['triage-queue'],
    queryFn: triageApi.queue,
    refetchInterval: 15000,
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => triageApi.confirm(id),
    onSuccess: (_, id) => {
      toast.success('Case confirmed');
      setConfirmed((s) => new Set(s).add(id));
      setExpanded(null);
      qc.invalidateQueries({ queryKey: ['triage-queue'] });
    },
    onError: () => toast.error('Confirm failed'),
  });

  const overrideMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => triageApi.override(id, note),
    onSuccess: (_, { id }) => {
      toast.success('Override submitted');
      setOverridden((s) => new Set(s).add(id));
      setExpanded(null);
      qc.invalidateQueries({ queryKey: ['triage-queue'] });
    },
    onError: () => toast.error('Override failed — notes must be ≥5 chars'),
  });

  const filtered = queue.filter((c) => {
    if (filter === 'high')      return c.urgency?.toLowerCase() === 'high';
    if (filter === 'pending')   return c.status === 'pending';
    if (filter === 'unassigned') return c.status === 'pending';
    return true;
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',       label: 'All Records'  },
    { key: 'high',      label: 'High Risk'    },
    { key: 'pending',   label: 'Long Wait'    },
    { key: 'unassigned',label: 'Unassigned'   },
  ];

  return (
    <div>
      {/* Filter bar */}
      <div className="border-t border-b border-linen bg-parchment mb-12 flex items-center h-12">
        <div className="flex items-center h-full px-4 space-x-8">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`h-full px-2 font-mono text-[11px] uppercase tracking-widest border-b-2 flex items-center transition-all
                ${filter === f.key
                  ? 'text-ink border-acid'
                  : 'text-fog border-transparent hover:text-ink'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto px-4">
          <span className="font-mono text-[10px] text-fog">{filtered.length} cases</span>
        </div>
      </div>

      {/* Case list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-cream animate-pulse border-b border-linen"/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-headline italic text-2xl text-linen">No cases in queue</p>
        </div>
      ) : (
        <div className="space-y-0">
          {filtered.map((c) => {
            const isExpanded = expanded === c.id;
            const urgency = c.urgency?.toLowerCase() ?? 'low';
            const urgencyColor = URGENCY_COLOR[urgency] ?? 'text-fog';
            const borderColor = confirmedIds.has(c.id)
              ? 'border-l-4 border-l-acid'
              : overriddenIds.has(c.id)
              ? 'border-l-4 border-l-sienna'
              : '';

            return (
              <div key={c.id} className={`group ${borderColor}`}>
                {/* Row */}
                <div
                  className="flex items-center py-6 border-b border-linen hover:bg-cream transition-colors cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : c.id)}
                >
                  {/* Urgency */}
                  <div className="w-40 px-6 shrink-0">
                    <span className={`font-headline italic text-2xl ${urgencyColor}`}>
                      {c.urgency ?? 'Low'}
                    </span>
                  </div>
                  <div className="h-10 w-[1px] bg-linen shrink-0"/>

                  {/* Data columns */}
                  <div className="flex-grow px-8 grid grid-cols-12 gap-4 items-center min-w-0">
                    <div className="col-span-3">
                      <p className="font-mono text-[10px] text-fog uppercase mb-1">Specimen ID</p>
                      <p className="font-mono text-sm text-ink font-semibold truncate">{c.id.slice(0, 10)}</p>
                    </div>
                    <div className="col-span-4">
                      <p className="font-mono text-[10px] text-fog uppercase mb-1">Diagnosis</p>
                      <p className="font-body font-bold text-[15px] text-ink leading-tight truncate">{c.ai_diagnosis}</p>
                    </div>
                    <div className="col-span-3 flex flex-wrap gap-1">
                      {c.symptoms?.slice(0, 3).map((s) => (
                        <span key={s} className="bg-linen/20 border border-linen px-2 py-0.5 text-[9px] font-mono uppercase text-ink">
                          {s.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="font-mono text-[10px] text-fog uppercase">Status</p>
                      <p className="font-mono text-xs text-fog">{c.status}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-8 flex space-x-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => confirmMut.mutate(c.id)}
                      disabled={confirmMut.isPending}
                      className="border border-ink px-4 py-2 font-mono text-[11px] uppercase text-ink hover:bg-acid hover:text-ink transition-all"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : c.id)}
                      className="border border-ink px-4 py-2 font-mono text-[11px] uppercase text-ink hover:bg-sienna hover:text-parchment transition-all"
                    >
                      Override
                    </button>
                  </div>
                </div>

                {/* Inline expansion */}
                {isExpanded && (
                  <div className="bg-cream border-l-4 border-sienna ml-5 py-8 px-10 border-b border-linen">
                    <div className="grid grid-cols-2 gap-12">
                      <div>
                        <h4 className="font-mono text-[11px] uppercase text-fog mb-4 tracking-widest">Override Notes</h4>
                        <textarea
                          value={notes[c.id] ?? ''}
                          onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                          placeholder="Submit reasoning for override (min 5 characters)..."
                          className="registration-focus w-full bg-parchment border border-linen p-3 text-sm font-body text-ink focus:outline-none min-h-[100px] resize-none"
                        />
                        {(notes[c.id]?.length ?? 0) > 0 && (notes[c.id]?.trim().length ?? 0) < 5 && (
                          <p className="font-mono text-[10px] text-sienna mt-1">Minimum 5 characters required</p>
                        )}
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={() => overrideMut.mutate({ id: c.id, note: notes[c.id] ?? '' })}
                            disabled={(notes[c.id]?.trim().length ?? 0) < 5 || overrideMut.isPending}
                            className="bg-ink text-parchment px-6 py-2 font-mono text-[11px] uppercase tracking-widest hover:bg-sienna transition-all disabled:opacity-40"
                          >
                            Submit Override
                          </button>
                          <button
                            onClick={() => setExpanded(null)}
                            className="border border-linen px-6 py-2 font-mono text-[11px] uppercase text-fog hover:text-ink transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-mono text-[11px] uppercase text-fog mb-4 tracking-widest">Reported Symptoms</h4>
                        <div className="flex flex-wrap gap-2">
                          {c.symptoms?.map((s) => (
                            <span key={s} className="bg-linen/20 border border-linen px-3 py-1 text-[10px] font-mono uppercase text-ink">
                              {s.replace(/-/g, ' ')}
                            </span>
                          ))}
                        </div>
                        <div className="mt-6">
                          <p className="font-mono text-[10px] text-fog uppercase mb-2">Hospital</p>
                          <p className="font-mono text-sm text-ink">{c.hospital_id}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
