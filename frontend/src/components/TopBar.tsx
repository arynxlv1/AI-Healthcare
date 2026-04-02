import React from 'react';

interface Props {
  title: string;
}

export const TopBar: React.FC<Props> = ({ title }) => (
  <header className="sticky top-0 h-16 bg-parchment border-b-2 border-linen border-double z-10 flex justify-between items-center px-8">
    <span className="font-serif text-xl font-bold text-ink">{title}</span>
    <div className="flex items-center space-x-6">
      <div className="relative flex items-center">
        <span className="material-symbols-outlined text-fog text-[18px] absolute left-3">search</span>
        <input
          className="bg-cream border-none focus:ring-1 focus:ring-acid pl-10 pr-4 py-1.5 text-xs font-mono uppercase w-64 focus:outline-none placeholder:text-fog"
          placeholder="Patient ID or Lab Ref..."
          type="text"
        />
      </div>
      <div className="flex items-center space-x-3">
        <span className="material-symbols-outlined text-ink cursor-pointer hover:text-acid transition-colors text-[20px]">notifications</span>
      </div>
    </div>
  </header>
);
