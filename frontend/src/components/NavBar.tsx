import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, LogOut, User, Activity, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from './ui/shared';

const ROLE_LABELS: Record<string, string> = {
  patient: 'Patient', doctor: 'Doctor',
  hospital_admin: 'Hospital Admin', super_admin: 'Super Admin',
};
const ROLE_COLORS: Record<string, string> = {
  patient:        'text-blue-400 bg-blue-500/10 border-blue-500/20',
  doctor:         'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  hospital_admin: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  super_admin:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
};
const ROLE_ROUTES: Record<string, { label: string; path: string }[]> = {
  patient:        [{ label: 'Health Portal', path: '/patient' }],
  doctor:         [{ label: 'Triage', path: '/doctor' }],
  hospital_admin: [{ label: 'FL Dashboard', path: '/hospital' }],
  super_admin:    [{ label: 'Admin', path: '/admin' }, { label: 'FL Dashboard', path: '/hospital' }, { label: 'Triage', path: '/doctor' }, { label: 'Patient', path: '/patient' }],
};

export const NavBar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => { clearInterval(t); window.removeEventListener('scroll', onScroll); };
  }, []);

  if (!user) return null;
  const roleColor = ROLE_COLORS[user.role] ?? 'text-slate-400 bg-white/5 border-white/10';
  const routes = ROLE_ROUTES[user.role] ?? [];

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'sticky top-0 z-50 w-full border-b transition-all duration-300',
        scrolled
          ? 'border-white/15 bg-slate-950/95 backdrop-blur-2xl shadow-2xl shadow-black/20'
          : 'border-white/8 bg-slate-950/70 backdrop-blur-xl'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-2.5 cursor-pointer shrink-0"
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="relative p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <Brain className="h-4 w-4 text-blue-400" />
            <motion.div
              className="absolute inset-0 rounded-lg bg-blue-400/20"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <span className="font-black text-sm text-white tracking-tight">FedHealth AI</span>
        </motion.div>

        {/* Nav links */}
        {routes.length > 1 && (
          <div className="hidden md:flex items-center gap-1">
            {routes.map(r => {
              const active = location.pathname === r.path;
              return (
                <motion.button
                  key={r.path}
                  onClick={() => navigate(r.path)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    'relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-white/10 rounded-lg border border-white/15"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative">{r.label}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live clock */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white/3 border border-white/8 px-2.5 py-1.5 rounded-lg">
            <Clock className="h-3 w-3" />
            <span className="tabular-nums">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1.5 rounded-lg">
            <motion.div
              className="w-1.5 h-1.5 bg-green-400 rounded-full"
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="hidden sm:inline font-semibold">Live</span>
          </div>

          {/* Role badge */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold', roleColor)}
          >
            <User className="h-3 w-3" />
            <span className="hidden sm:inline">{ROLE_LABELS[user.role] ?? user.role}</span>
          </motion.div>

          <span className="text-xs text-slate-500 hidden lg:block max-w-[140px] truncate">{user.email}</span>

          <motion.button
            onClick={() => { logout(); navigate('/login'); }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
};
