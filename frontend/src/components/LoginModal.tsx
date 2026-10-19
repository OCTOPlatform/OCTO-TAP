'use client';

import React, { useState } from 'react';
import { Mail, KeyRound, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminUser } from '@/types';

interface LoginModalProps {
  onSuccess: (user: AdminUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('admin@octotap.com');
  const [password, setPassword] = useState('AdminOCTO2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(email, password);
      onSuccess(res.admin_user);
    } catch (err: any) {
      setError(err.message || 'Login gagal, periksa email dan password.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@octotap.com');
    setPassword('AdminOCTO2026!');
    setError(null);
  };

  const handleFillSales = () => {
    setEmail('sales@octotap.com');
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-3 p-2 rounded-2xl bg-slate-950/60 border border-slate-800/80 shadow-xl shadow-cyan-500/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Logo-OCTO-TAP.png"
              alt="OCTO Tap Logo"
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">OCTO Tap Portal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Masuk ke Dashboard Manajemen Kartu Google Review NFC & QR
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Administrator</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@octotap.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kata Sandi</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span>Memproses...</span>
            ) : (
              <>
                <span>Masuk ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Quick Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-center relative z-10 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleFillDemo}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Akun Admin</span>
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={handleFillSales}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Akun Sales Lapangan</span>
            </button>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {email}
          </div>
        </div>
      </div>
    </div>
  );
};
