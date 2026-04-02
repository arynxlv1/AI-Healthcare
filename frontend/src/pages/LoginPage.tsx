import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../lib/api';
import { toast } from 'sonner';

const DEMO_ACCOUNTS = [
  { label: 'Patient',        email: 'patient@example.com',  accent: 'border-t-acid'   },
  { label: 'Doctor',         email: 'doctor@example.com',   accent: 'border-t-[#C97B84]' },
  { label: 'Hospital Admin', email: 'admin@hosp001.com',    accent: 'border-t-ochre'  },
  { label: 'Super Admin',    email: 'admin@example.com',    accent: 'border-t-sienna' },
];

export const LoginPage = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const setAuth  = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      let hospital_id: string | undefined;
      try { hospital_id = JSON.parse(atob(data.access_token.split('.')[1])).hospital_id; } catch {}
      setAuth(data.access_token, { email, role: data.role, hospital_id });
      toast.success(`Signed in as ${data.role.replace('_', ' ')}`);
      const routes: Record<string, string> = {
        patient: '/patient', doctor: '/doctor',
        hospital_admin: '/hospital', super_admin: '/admin',
      };
      navigate(routes[data.role] ?? '/');
    } catch {
      toast.error('Authentication failed — check credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center p-6 relative overflow-hidden grain-overlay">
      {/* Botanical SVG background */}
      <div className="absolute inset-y-0 right-0 w-[60%] pointer-events-none opacity-40">
        <svg width="100%" height="100%" viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          <path d="M300 800C300 800 300 500 450 350M300 800C300 800 300 450 150 300M300 600L380 520M300 500L220 420M450 350C520 280 550 150 550 150M150 300C80 230 50 100 50 100M450 350L500 300M150 300L100 250" stroke="#D9D0BE" strokeWidth="1"/>
          <circle cx="550" cy="150" r="3" fill="#D9D0BE"/>
          <circle cx="50" cy="100" r="3" fill="#D9D0BE"/>
          <path d="M300 400 Q350 350 400 300 Q450 250 480 200" stroke="#D9D0BE" strokeWidth="0.5" strokeDasharray="3 3"/>
          <path d="M300 400 Q250 350 200 300 Q150 250 120 200" stroke="#D9D0BE" strokeWidth="0.5" strokeDasharray="3 3"/>
          <circle cx="300" cy="400" r="40" stroke="#D9D0BE" strokeWidth="0.5" fill="none"/>
          <circle cx="300" cy="400" r="20" stroke="#D9D0BE" strokeWidth="0.5" fill="none"/>
        </svg>
      </div>

      {/* Specimen IDs */}
      <div className="absolute top-8 left-8 space-y-2 opacity-30 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-acid inline-block"/>
          <span className="font-mono text-[9px] text-ink">NODE_CONNECTED: [SFO_STATION_01]</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-linen inline-block"/>
          <span className="font-mono text-[9px] text-ink">ENCRYPTION: AES_256_GCM</span>
        </div>
      </div>

      <main className="relative z-10 w-full max-w-[400px] flex flex-col gap-6 lg:-ml-32">
        {/* Login card */}
        <div className="bg-cream border border-linen shadow-hard overflow-hidden">
          <div className="h-[3px] bg-acid w-full"/>
          <div className="p-8">
            <header className="mb-6">
              <h1 className="font-headline text-[28px] text-ink leading-none tracking-tight">FedHealth AI</h1>
              <p className="font-mono text-[11px] text-fog mt-1 uppercase tracking-widest">Clinical Intelligence Platform</p>
              <div className="double-rule"/>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block font-body text-[11px] font-bold text-ink uppercase tracking-[0.08em]" htmlFor="email">
                  System Credential / Email
                </label>
                <input
                  id="email" type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="user_id@fedhealth.ai"
                  className="registration-focus w-full h-[40px] bg-parchment border border-linen px-3 font-mono text-sm text-ink placeholder:text-linen transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-body text-[11px] font-bold text-ink uppercase tracking-[0.08em]" htmlFor="password">
                  Encryption Key / Password
                </label>
                <input
                  id="password" type="password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="registration-focus w-full h-[40px] bg-parchment border border-linen px-3 font-mono text-sm text-ink transition-all outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit" disabled={loading}
                  className="relative group w-full h-[40px] bg-ink text-parchment font-body font-bold text-[13px] uppercase tracking-widest overflow-hidden hover:bg-moss hover:text-acid transition-colors duration-150 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="font-mono text-[11px]">AUTHENTICATING</span>
                      <span className="scanning-line"/>
                    </span>
                  ) : 'Sign In'}
                  {!loading && <span className="scanning-line opacity-0 group-hover:opacity-100 transition-opacity"/>}
                </button>
              </div>
            </form>

            <footer className="mt-8 text-center">
              <p className="font-body text-[11px] text-fog leading-relaxed italic">
                Registration is closed.<br/>
                Contact your system administrator for access.
              </p>
            </footer>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              onClick={() => { setEmail(acc.email); setPassword('password'); }}
              className={`bg-cream border border-linen border-t-[3px] ${acc.accent} p-3 cursor-pointer hover:bg-parchment transition-colors text-left`}
            >
              <p className="font-body font-semibold text-[11px] text-ink truncate">{acc.label}</p>
              <p className="font-mono text-[10px] text-fog truncate mt-0.5">{acc.email}</p>
            </button>
          ))}
        </div>
        <p className="text-center font-mono text-[10px] text-fog">All demo passwords: <span className="text-ink">password</span></p>
      </main>

      {/* Branding */}
      <div className="fixed bottom-8 right-8 text-right hidden md:block">
        <p className="font-mono text-[10px] text-linen uppercase tracking-[0.2em] mb-1">Federated Intelligence</p>
        <p className="font-headline text-xl text-linen opacity-60">Auth-Module v2.4.0</p>
      </div>
    </div>
  );
};
