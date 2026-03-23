import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Shield, Lock, Mail, Brain, Activity, Zap, ChevronRight, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../components/ui/shared';

const DEMO_ACCOUNTS = [
  { role: 'patient',        email: 'patient@example.com',  label: 'Patient',        color: 'text-blue-400    bg-blue-500/10    border-blue-500/20'   },
  { role: 'doctor',         email: 'doctor@example.com',   label: 'Doctor',         color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { role: 'hospital_admin', email: 'admin@hosp001.com',    label: 'Hospital Admin', color: 'text-violet-400  bg-violet-500/10  border-violet-500/20'  },
  { role: 'super_admin',    email: 'admin@example.com',    label: 'Super Admin',    color: 'text-amber-400   bg-amber-500/10   border-amber-500/20'   },
];

// Floating particle
const Particle = ({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) => (
  <motion.div
    className="absolute rounded-full bg-blue-400/20 pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
    animate={{ y: [0, -30, 0], opacity: [0, 0.6, 0], scale: [0.8, 1.2, 0.8] }}
    transition={{ duration, repeat: Infinity, delay, ease: 'easeInOut' }}
  />
);

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 4 + Math.random() * 8,
  duration: 4 + Math.random() * 4,
  delay: Math.random() * 4,
}));

export const LoginPage = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [filledRole, setFilledRole] = useState<string | null>(null);
  const setAuth  = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();

      let hospital_id: string | undefined;
      try { hospital_id = JSON.parse(atob(data.access_token.split('.')[1])).hospital_id; } catch {}

      setAuth(data.access_token, { email, role: data.role, hospital_id });
      toast.success(`Welcome back — signed in as ${data.role.replace('_', ' ')}`);

      const routes: Record<string, string> = {
        patient: '/patient', doctor: '/doctor',
        hospital_admin: '/hospital', super_admin: '/admin',
      };
      navigate(routes[data.role] ?? '/');
    } catch {
      toast.error('Login failed — check your credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const quickFill = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword('password');
    setFilledRole(acc.role);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], x: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1], x: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Floating particles */}
        {PARTICLES.map(p => <Particle key={p.id} {...p} />)}
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative w-full max-w-md space-y-5">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center space-y-3"
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/15 border border-blue-500/30 rounded-2xl mb-2 relative"
            whileHover={{ scale: 1.05, rotate: 3 }}
          >
            <Brain className="h-8 w-8 text-blue-400" />
            <motion.div
              className="absolute inset-0 rounded-2xl border border-blue-400/40"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </motion.div>
          <h1 className="text-3xl font-black text-white tracking-tight">FedHealth AI</h1>
          <p className="text-slate-400 text-sm">Privacy-preserving medical intelligence</p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-4 text-xs text-slate-500"
          >
            <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-green-500" /> HIPAA Compliant</span>
            <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-blue-400" /> Federated Learning</span>
            <span className="flex items-center gap-1"><Activity className="h-3 w-3 text-violet-400" /> Real-time AI</span>
          </motion.div>
        </motion.div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-7 shadow-2xl"
        >
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <motion.div className="space-y-1.5" animate={{ scale: focusedField === 'email' ? 1.01 : 1 }} transition={{ duration: 0.15 }}>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors', focusedField === 'email' ? 'text-blue-400' : 'text-slate-500')} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                  placeholder="name@hospital.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div className="space-y-1.5" animate={{ scale: focusedField === 'password' ? 1.01 : 1 }} transition={{ duration: 0.15 }}>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors', focusedField === 'password' ? 'text-blue-400' : 'text-slate-500')} />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </motion.div>

            <motion.button
              type="submit" disabled={isLoading}
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 group mt-2 relative overflow-hidden"
            >
              {/* Shimmer */}
              {!isLoading && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                {isLoading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Zap className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <><span>Sign In</span><ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></>
                )}
              </span>
            </motion.button>
          </form>
        </motion.div>

        {/* Demo accounts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/3 border border-white/8 rounded-2xl p-4"
        >
          <p className="text-xs text-slate-500 text-center mb-3 uppercase tracking-wider font-semibold">Demo Accounts — click to fill</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc, i) => (
              <motion.button
                key={acc.role}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                onClick={() => quickFill(acc)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all relative overflow-hidden',
                  acc.color,
                  filledRole === acc.role && 'ring-1 ring-current'
                )}
              >
                {filledRole === acc.role && (
                  <motion.div className="absolute inset-0 bg-current opacity-10" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                )}
                <Wifi className="h-3 w-3 shrink-0" />
                <span className="truncate relative">{acc.label}</span>
              </motion.button>
            ))}
          </div>
          <p className="text-xs text-slate-600 text-center mt-2">All passwords: <code className="text-slate-400">password</code></p>
        </motion.div>
      </div>
    </div>
  );
};
