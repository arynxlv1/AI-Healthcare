import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const NAV_ITEMS = [
  { icon: 'clinical_notes',   label: 'Triage Queue',    path: '/doctor',   roles: ['doctor', 'super_admin'] },
  { icon: 'folder_shared',    label: 'Health Portal',   path: '/patient',  roles: ['patient', 'super_admin'] },
  { icon: 'hub',              label: 'FL Monitoring',   path: '/hospital', roles: ['hospital_admin', 'super_admin'] },
  { icon: 'settings_suggest', label: 'System Console',  path: '/admin',    roles: ['super_admin'] },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  );

  const initials = user.email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="fixed h-full w-[220px] left-0 top-0 bg-ink z-20 flex flex-col py-6">
      {/* Brand */}
      <div className="px-6 mb-10">
        <h1 className="font-headline text-lg text-parchment tracking-tight">FedHealth AI</h1>
        <p className="font-label text-[10px] text-acid uppercase tracking-widest opacity-80 mt-0.5">
          Federated Intelligence
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col space-y-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? 'bg-[#363630] text-acid border-l-[3px] border-acid flex items-center h-[44px] px-4 font-label text-[10px] uppercase transition-colors duration-150'
                : 'text-parchment opacity-70 flex items-center h-[44px] px-4 font-label text-[10px] uppercase hover:bg-[#363630] hover:text-acid hover:opacity-100 transition-colors duration-150'
            }
          >
            <span className="material-symbols-outlined mr-3 text-[18px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="mt-auto border-t border-[#363630] pt-4">
        {/* User identity */}
        <div className="flex items-center gap-3 px-4 py-2 mb-1">
          <div className="w-8 h-8 bg-[#363630] text-parchment flex items-center justify-center font-mono text-xs border border-linen shrink-0">
            {initials}
          </div>
          <span className="font-label text-[10px] text-fog truncate">{user.email}</span>
        </div>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="text-parchment opacity-70 flex items-center h-[44px] px-4 font-label text-[10px] uppercase hover:bg-[#363630] hover:text-sienna hover:opacity-100 transition-colors duration-150 w-full text-left"
        >
          <span className="material-symbols-outlined mr-3 text-[18px]">logout</span>
          Log Out
        </button>
      </div>
    </aside>
  );
};
