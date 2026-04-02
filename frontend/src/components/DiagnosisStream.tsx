import React, { useEffect, useRef, useState } from 'react';
import { OnnxResult } from '../lib/api';

interface Props {
  sessionId: string;
  onnxResult: OnnxResult;
}

const RISK_COLORS: Record<string, string> = {
  critical: 'text-sienna',
  high:     'text-sienna',
  medium:   'text-[#C97B84]',
  low:      'text-primary',
};

export const DiagnosisStream: React.FC<Props> = ({ sessionId, onnxResult }) => {
  const [reasoning, setReasoning] = useState('');
  const [streaming, setStreaming]  = useState(true);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/ai/diagnose/stream?session_id=${sessionId}`);
    esRef.current = es;
    let text = '';

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.token) {
          text += payload.token;
          setReasoning(text);
        }
        if (payload.done) { es.close(); setStreaming(false); }
        if (payload.error) {
          setReasoning(payload.type === 'conn_error'
            ? 'Ollama is not running. Start it with `ollama serve` to enable AI reasoning.'
            : `AI reasoning unavailable: ${payload.error}`);
          es.close(); setStreaming(false);
        }
      } catch {}
    };
    es.onerror = () => { es.close(); setStreaming(false); };

    return () => { es.close(); };
  }, [sessionId]);

  const primary = onnxResult.predictions[0];
  const riskColor = RISK_COLORS[onnxResult.risk_level] ?? 'text-fog';

  return (
    <div className="space-y-6">
      {/* Primary diagnosis card */}
      <div className="bg-cream shadow-hard border-t-[3px] border-sienna">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="font-mono text-[10px] uppercase text-fog mb-1">Primary Match Found</p>
              <h3 className="font-headline text-[24px] text-ink">{primary?.label ?? 'Unknown'}</h3>
            </div>
            <div className="bg-ink px-3 py-1">
              <span className={`font-mono text-[10px] uppercase font-bold ${riskColor}`}>
                {onnxResult.risk_level.toUpperCase()} RISK
              </span>
            </div>
          </div>

          <div className="flex items-baseline space-x-4 mb-8">
            <span className={`font-mono text-[48px] font-bold tracking-tighter ${riskColor}`}>
              {primary?.percentage ?? 0}<span className="text-2xl">%</span>
            </span>
            <span className="font-mono text-[11px] uppercase text-fog">Confidence Interval</span>
            <span className="font-mono text-[10px] text-fog ml-auto">{onnxResult.latency_ms}ms</span>
          </div>

          <div className="double-rule"/>

          <h4 className="font-mono text-[10px] uppercase text-fog mb-4">Differential Diagnosis (Alt)</h4>
          <ul className="space-y-0">
            {onnxResult.predictions.slice(1, 6).map((p) => (
              <li key={p.label} className="flex justify-between items-center border-b border-linen py-2.5">
                <span className="font-body text-sm text-ink">{p.label}</span>
                <span className="font-mono text-xs text-fog">{p.percentage}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Immediate steps */}
      {onnxResult.immediate_steps.length > 0 && (
        <div className="bg-cream shadow-hard border-t-[3px] border-acid">
          <div className="p-8">
            <header className="mb-6">
              <h3 className="font-headline text-lg text-ink">Recommended Interventions</h3>
              <p className="font-mono text-[10px] uppercase text-fog mt-1">Status: Immediate Action Required</p>
            </header>
            <ol className="space-y-6">
              {onnxResult.immediate_steps.map((step, i) => (
                <li key={i} className="flex space-x-6">
                  <span className="font-headline italic text-2xl text-linen leading-none shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm leading-relaxed text-ink">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* AI Reasoning stream */}
      <div className="bg-cream shadow-hard border-t-[3px] border-fog">
        <div className="p-8">
          <header className="mb-4 flex items-center justify-between">
            <h3 className="font-headline text-lg text-ink">AI Clinical Reasoning</h3>
            {streaming && (
              <span className="flex items-center gap-2 font-mono text-[10px] text-acid uppercase">
                <span className="w-1.5 h-1.5 bg-acid rounded-full animate-pulse"/>
                Generating
              </span>
            )}
          </header>
          {!reasoning && streaming ? (
            <div className="space-y-2">
              {[90, 75, 85, 60].map((w, i) => (
                <div key={i} className="h-3 bg-linen/40 animate-pulse" style={{ width: `${w}%` }}/>
              ))}
            </div>
          ) : (
            <div className="font-body text-sm text-ink leading-relaxed whitespace-pre-wrap">
              {reasoning}
              {streaming && <span className="inline-block w-0.5 h-4 bg-acid ml-0.5 animate-pulse align-middle"/>}
            </div>
          )}
        </div>
      </div>

      <p className="font-mono text-[10px] text-fog italic text-center">
        This AI assessment is for informational purposes only and does not replace professional medical advice.
      </p>
    </div>
  );
};
