'use client';

import React from 'react';
import { 
  Layers, 
  Building2, 
  CreditCard, 
  Factory, 
  Compass, 
  History, 
  LogOut, 
  UserCheck, 
  Sparkles,
  Wifi
} from 'lucide-react';
import { AdminUser } from '@/types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: AdminUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogout,
}) => {
  const navItems = [
    { id: 'overview', label: 'Ringkasan', icon: Layers },
    { id: 'businesses', label: 'Bisnis & URL', icon: Building2 },
    { id: 'cards', label: 'Inventaris Kartu', icon: CreditCard },
    { id: 'production', label: 'Produksi & QC', icon: Factory },
    { id: 'redirect', label: 'Simulator Tap / Scan', icon: Compass },
    { id: 'audit', label: 'Audit Trail', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      {/* Top Brand Bar */}
      <div className="border-b border-slate-800/60 bg-slate-900/40 px-4 py-1.5 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-cyan-400 tracking-wider">OCTO</span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400 font-medium">ONE PLATFORM. MANY POSSIBILITIES. Smart business tools, connected.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/40">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Master Brand Suite</span>
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Name */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900/80 border border-slate-800 p-1 shadow-lg shadow-cyan-500/10 hover:border-cyan-500/30 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Logo-OCTO-TAP.png"
                alt="OCTO Tap Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">OCTO</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Tap
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Google Review NFC + QR Management System
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Admin User / Actions */}
          <div className="flex items-center gap-3">
            <a
              href="/activate"
              target="_blank"
              rel="noreferrer"
              className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg border border-cyan-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Buka Halaman Aktivasi Lapangan (Mobile Mode)"
            >
              <Wifi className="w-4 h-4 rotate-90" />
              <span className="hidden xl:inline">Portal Aktivasi</span>
            </a>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-medium text-slate-200">{user.full_name}</span>
                  <span className="text-[10px] text-slate-400">{user.email}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
                  <UserCheck className={`w-3.5 h-3.5 ${user.role === 'SALES' ? 'text-cyan-400' : 'text-emerald-400'}`} />
                  <span className={`font-medium hidden sm:inline ${user.role === 'SALES' ? 'text-cyan-400' : 'text-emerald-400'}`}>
                    {user.role === 'SALES' ? 'Sales' : 'Admin'}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile Nav Tabs */}
        <div className="md:hidden flex items-center space-x-1 py-2 overflow-x-auto border-t border-slate-800/80 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
