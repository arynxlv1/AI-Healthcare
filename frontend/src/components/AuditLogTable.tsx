import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi, AuditLog } from '../lib/api';

const ACTION_COLORS: Record<string, string> = {
  CONFIRM_TRIAGE:  'text-primary  border-primary',
  OVERRIDE_TRIAGE: 'text-acid     border-acid',
  PII_STRIPPED:    'text-fog      border-fog',
  ACCESS_DENIED:   'text-sienna   border-sienna',
  TRIGGER_FL:      'text-ochre    border-ochre',
};

export const AuditLogTable: React.FC = () => {
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs', page],
    queryFn: () => auditApi.logs(page, PAGE_SIZE),
  });

  const filtered = logs.filter((l) =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.user_id?.toLowerCase().includes(search.toLowerCase()) ||
    l.resource_type?.toLowerCase().includes(search.toLowerCase())
  );

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'audit_logs.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-cream shadow-hard p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-headline text-2xl text-ink">Audit Log</h3>
          <p className="font-mono text-[10px] text-fog uppercase mt-1">Transaction History — Last 24 Hours</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="QUERY LOGS..."
            className="registration-focus bg-parchment border border-linen font-mono text-[10px] px-3 py-2 w-48 focus:outline-none placeholder:text-fog uppercase"
          />
          <button
            onClick={exportJSON}
            className="border-2 border-ink px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-ink hover:bg-ink hover:text-parchment transition-all"
          >
            EXPORT_MANIFEST
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-ink">
              {['Timestamp', 'Subject_ID', 'Operation', 'Resource', 'Details'].map((h) => (
                <th key={h} className="pb-3 px-4 font-mono text-[10px] text-fog uppercase font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-linen/40">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="py-4 px-4">
                      <div className="h-3 bg-linen/40 animate-pulse"/>
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center font-mono text-[11px] text-fog uppercase">
                  No audit records found
                </td>
              </tr>
            ) : filtered.map((log) => {
              const actionColor = ACTION_COLORS[log.action] ?? 'text-fog border-fog';
              const isExpanded  = expanded === log.id;
              return (
                <React.Fragment key={log.id}>
                  <tr
                    className="group hover:bg-linen/30 transition-colors cursor-pointer hover:border-l hover:border-l-acid"
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                  >
                    <td className="py-5 px-4 font-mono text-[11px] text-ink whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-5 px-4 font-body text-[13px] text-ink font-medium max-w-[120px] truncate">
                      {log.user_id}
                    </td>
                    <td className="py-5 px-4">
                      <span className={`font-mono text-[10px] uppercase border px-2 py-0.5 ${actionColor}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-5 px-4 font-mono text-[11px] text-fog">
                      {log.resource_type}{log.resource_id ? `:${log.resource_id.slice(0, 8)}` : ''}
                    </td>
                    <td className="py-5 px-4 text-right">
                      <button className="border border-linen px-2 py-1 font-mono text-[9px] text-fog hover:border-ink hover:text-ink transition-all">
                        {isExpanded ? 'COLLAPSE' : 'VIEW_SPEC'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="bg-parchment border-l-4 border-l-acid px-8 py-6">
                        <p className="font-mono text-[10px] text-fog uppercase mb-2">Full Details</p>
                        <pre className="font-mono text-[11px] text-ink bg-cream p-4 overflow-x-auto border border-linen">
                          {JSON.stringify(log.details ?? {}, null, 2)}
                        </pre>
                        <div className="mt-3 grid grid-cols-3 gap-4 font-mono text-[10px] text-fog">
                          <div><span className="uppercase">IP: </span>{log.ip_address ?? 'N/A'}</div>
                          <div><span className="uppercase">Resource ID: </span>{log.resource_id ?? 'N/A'}</div>
                          <div><span className="uppercase">Log ID: </span>{log.id.slice(0, 12)}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-between items-center border-t border-linen pt-6">
        <span className="font-mono text-[10px] text-fog uppercase">
          Page {page} · {filtered.length} of {logs.length} records
        </span>
        <div className="flex space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 border border-linen text-ink hover:bg-linen/20 transition-all disabled:opacity-30"
          >
            ‹
          </button>
          <button
            onClick={() => setPage((p) => p + 1)} disabled={logs.length < PAGE_SIZE}
            className="p-2 border border-linen text-ink hover:bg-linen/20 transition-all disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};
