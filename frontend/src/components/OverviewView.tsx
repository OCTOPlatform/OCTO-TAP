'use client';

import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  PlusCircle, 
  Factory, 
  ArrowRight,
  ShieldCheck,
  Layers,
  Package,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';
import { Business, Card } from '@/types';

interface OverviewViewProps {
  onNavigate: (tab: string) => void;
  onOpenNewBusiness: () => void;
  onOpenBatchIssue: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  onOpenNewBusiness,
  onOpenBatchIssue,
}) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bizRes, cardRes] = await Promise.all([
        api.getBusinesses({ limit: 100 }),
        api.getCards({ limit: 100 }),
      ]);
      setBusinesses(bizRes.businesses);
      setCards(cardRes.cards);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalBusinesses = businesses.length;
  const activeBusinesses = businesses.filter((b) => b.status === 'ACTIVE').length;
  const totalCards = cards.length;
  const activeCards = cards.filter((c) => c.status === 'ACTIVE').length;
  const stockCards = cards.filter((c) => !c.business_id).length;
  const pendingQCCards = cards.filter((c) => ['DRAFT', 'READY', 'IN_PRODUCTION'].includes(c.status)).length;
  const totalTaps = cards.reduce((acc, c) => acc + (c.tap_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-800/40 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>OCTO Tap Production Hub • Dual Mode (Model A &amp; B)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sistem Manajemen Kartu Google Review NFC + QR
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Mendukung <strong className="text-cyan-400 font-semibold">Model A</strong> (penerbitan by order per bisnis) dan <strong className="text-amber-400 font-semibold">Model B</strong> (cetak massal stok fisik akrilik terlebih dahulu, aktivasi instan kemudian saat pembeli datang).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('cards')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>+ Cetak Stok Massal (Model B)</span>
            </button>
            <button
              onClick={onOpenNewBusiness}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-sm font-medium transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-cyan-400" />
              <span>+ Registrasi Bisnis (Model A)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Bisnis Terdaftar</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white">{totalBusinesses}</span>
            <span className="text-xs text-emerald-400 font-medium">({activeBusinesses} Aktif)</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Terverifikasi di Google Maps</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Kartu Aktif</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white">{activeCards}</span>
            <span className="text-xs text-slate-400">/ {totalCards} kartu</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Redirecting ke Google Review</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Stok Gudang (Model B)</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-300">{stockCards}</span>
            <span className="text-xs text-slate-400">kartu siap pakai</span>
          </div>
          <div className="mt-2 text-xs text-amber-400/80">Tinggal hubungkan ke bisnis</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Tap / Scan</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white">{totalTaps}</span>
            <span className="text-xs text-emerald-400 font-medium">Interaksi</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Ulasan Google pelanggan dibuka</div>
        </div>
      </div>

      {/* Model A vs Model B Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              MODEL A: By Order (Per Bisnis)
            </span>
            <span className="text-[11px] text-slate-400">On-demand Production</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Digunakan ketika klien memesan kartu secara khusus: Anda mendaftarkan nama bisnis dan link Google Review mereka terlebih dahulu, lalu menerbitkan kartu dengan token unik untuk dicetak dan dikirimkan.
          </p>
          <div className="pt-2 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span>✓ Alur: Registrasi Bisnis → Terbitkan Batch → Produksi &amp; QC → Kartu Aktif</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-bold">
              MODEL B: Cetak Massal Dulu (Stok Fisik)
            </span>
            <span className="text-[11px] text-amber-400 font-semibold">Fast Deployment</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Digunakan untuk mencetak ratusan kartu fisik siap pakai terlebih dahulu (dengan QR dan chip NFC CSPRNG unik). Saat ada pembeli, admin cukup klik <strong>&quot;Hubungkan &amp; Aktifkan&quot;</strong> dan memasukkan link review Google tanpa perlu mencetak ulang.
          </p>
          <div className="pt-2 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400">
              <span>✓ Alur: Cetak Stok Massal → Simpan Fisik → Klien Beli → Masukkan Link &amp; Aktif Seketika</span>
            </div>
          </div>
        </div>
      </div>

      {/* Production Lifecycle Infographic */}
      <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6">
        <h3 className="text-base font-semibold text-white mb-1">Alur Produksi & Keamanan OCTO Tap</h3>
        <p className="text-xs text-slate-400 mb-6">
          Setiap kartu melalui 6 tahapan terverifikasi untuk menjamin akurasi redirect dan mencegah kesalahan penulisan NFC.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="text-[11px] font-mono text-cyan-400 font-bold mb-1">01. REGISTRASI</div>
            <div className="text-xs font-semibold text-slate-200">Verifikasi URL</div>
            <p className="text-[10px] text-slate-400 mt-1">Validasi domain HTTPS Google Review</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="text-[11px] font-mono text-cyan-400 font-bold mb-1">02. TOKEN CSPRNG</div>
            <div className="text-xs font-semibold text-slate-200">32-Byte Safe</div>
            <p className="text-[10px] text-slate-400 mt-1">Base64 URL-safe tanpa tabrakan kode</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="text-[11px] font-mono text-cyan-400 font-bold mb-1">03. CETAK QR</div>
            <div className="text-xs font-semibold text-slate-200">UV Print 300DPI</div>
            <p className="text-[10px] text-slate-400 mt-1">Arahkan ke URL redirect unik</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="text-[11px] font-mono text-cyan-400 font-bold mb-1">04. WRITE NFC</div>
            <div className="text-xs font-semibold text-slate-200">NDEF Record</div>
            <p className="text-[10px] text-slate-400 mt-1">Tulis URI identik dengan QR kartu</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="text-[11px] font-mono text-cyan-400 font-bold mb-1">05. QC VERIFIKASI</div>
            <div className="text-xs font-semibold text-slate-200">Cek Kesamaan</div>
            <p className="text-[10px] text-slate-400 mt-1">Scan QR & tap NFC wajib cocok 100%</p>
          </div>
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/50">
            <div className="text-[11px] font-mono text-cyan-300 font-bold mb-1">06. AKTIF</div>
            <div className="text-xs font-semibold text-cyan-200">Redirect 302</div>
            <p className="text-[10px] text-cyan-400 mt-1">Langsung buka review Google</p>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => onNavigate('production')}
          className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/60 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Factory className="w-5 h-5" />
          </div>
          <h4 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">
            Stasiun Produksi & QC
          </h4>
          <p className="text-xs text-slate-400 mt-2">
            Alat verifikasi Web NFC dan simulator encoder untuk memastikan URL chip identik dengan QR sebelum pengiriman.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
            <span>Buka Stasiun Produksi</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('redirect')}
          className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/60 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Smartphone className="w-5 h-5" />
          </div>
          <h4 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
            Simulator Tap / Scan Pengguna
          </h4>
          <p className="text-xs text-slate-400 mt-2">
            Uji respons redirect publik GET /r/{'{token}'} secara langsung dengan simulasi pengalaman pelanggan tap di restoran/toko.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-400 font-medium">
            <span>Coba Simulator</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('audit')}
          className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/60 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
            Audit Trail & Keamanan
          </h4>
          <p className="text-xs text-slate-400 mt-2">
            Seluruh perubahan URL, penerbitan batch, dan modifikasi status kartu dicatat secara permanen dengan metadata admin.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-purple-400 font-medium">
            <span>Lihat Audit Logs</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
