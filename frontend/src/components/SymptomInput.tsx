import React, { useState } from 'react';
import { aiApi, DiagnoseResponse } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

const SYMPTOM_GROUPS = [
  {
    category: 'Respiratory & Chest',
    symptoms: ['Dry Cough', 'Shortness of Breath', 'Chest Pressure', 'Wheezing', 'Chest Pain'],
  },
  {
    category: 'Neurological',
    symptoms: ['Acute Vertigo', 'Visual Auras', 'Limb Numbness', 'Migraine Cluster', 'Confusion'],
  },
  {
    category: 'General Systemic',
    symptoms: ['Fever (38°C+)', 'Fatigue', 'Joint Pain', 'Night Sweats', 'Chills', 'Weight Loss'],
  },
  {
    category: 'Gastrointestinal',
    symptoms: ['Nausea', 'Vomiting', 'Abdominal Pain', 'Diarrhoea', 'Heartburn'],
  },
  {
    category: 'Cardiovascular',
    symptoms: ['Palpitations', 'Oedema', 'Syncope', 'Hypertension', 'Bradycardia'],
  },
];

interface Props {
  onResult: (result: DiagnoseResponse) => void;
}

export const SymptomInput: React.FC<Props> = ({ onResult }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [freeText, setFreeText]  = useState('');
  const [loading, setLoading]    = useState(false);
  const user = useAuthStore((s) => s.user);

  const toggle = (s: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0 && !freeText.trim()) {
      toast.error('Select at least one symptom');
      return;
    }
    setLoading(true);
    try {
      const symptoms = Array.from(selected).map((s) => s.toLowerCase().replace(/\s+/g, '-'));
      const result = await aiApi.diagnose(
        symptoms,
        user?.hospital_id ?? 'HOSP_001',
        freeText.trim() || undefined,
      );
      onResult(result);
    } catch {
      toast.error('Analysis failed — check backend connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cream shadow-hard border-t-[3px] border-acid relative">
      <div className="p-8">
        <header className="mb-6 flex justify-between items-end">
          <div>
            <h3 className="font-headline text-xl text-ink">Symptom Inventory</h3>
            <p className="font-mono text-[10px] uppercase text-fog mt-1">Batch ID: #882-BIO-PX</p>
          </div>
          <span className="font-mono text-[10px] text-acid bg-ink px-2 py-1">ENCRYPTED INPUT</span>
        </header>

        <div className="space-y-8">
          {SYMPTOM_GROUPS.map((group) => (
            <div key={group.category}>
              <label className="font-mono text-[11px] uppercase tracking-wider mb-3 block text-fog">
                {group.category}
              </label>
              <div className="flex flex-wrap gap-2">
                {group.symptoms.map((s) => {
                  const active = selected.has(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggle(s)}
                      className={`h-[28px] px-4 flex items-center font-body text-[12px] transition-all btn-press relative
                        ${active
                          ? 'bg-ink text-parchment pr-8'
                          : 'bg-cream border border-linen text-ink hover:bg-linen/20'
                        }`}
                    >
                      {s}
                      {active && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-acid rounded-full"/>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Free text */}
        <div className="mt-8">
          <label className="font-mono text-[11px] uppercase tracking-wider mb-2 block text-fog">
            Additional Notes (Optional)
          </label>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Describe any additional symptoms or context..."
            rows={3}
            className="registration-focus w-full bg-parchment border border-linen p-3 font-body text-sm text-ink placeholder:text-fog resize-none outline-none"
          />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="font-mono text-[10px] text-fog">
            {selected.size} symptom{selected.size !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-ink text-parchment px-8 py-4 flex items-center space-x-4 btn-press transition-all group disabled:opacity-60"
          >
            <span className="font-mono uppercase text-sm tracking-widest">
              {loading ? 'Analysing...' : 'Execute AI Analysis'}
            </span>
            <span className={`w-2 h-2 bg-acid rounded-full ${loading ? 'animate-heartbeat' : 'shadow-[0_0_8px_#7AE23A] animate-pulse'}`}/>
          </button>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="mx-8 mb-8 bg-linen/10 p-4 flex items-start space-x-3 border-l-4 border-acid">
        <svg className="w-5 h-5 text-ink shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <p className="font-mono text-[10px] uppercase text-fog">Federated Privacy Guard</p>
          <p className="text-xs mt-1 text-ink opacity-80 leading-relaxed">
            Your raw medical data never leaves this device. Only secure cryptographic gradients are transmitted to the FedHealth global model.
          </p>
        </div>
      </div>
    </div>
  );
};
