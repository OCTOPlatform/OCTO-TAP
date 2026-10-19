'use client';

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Sparkles,
  Building2,
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogOut,
  RefreshCw,
  CreditCard,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AdminUser, Card } from '@/types';

interface SalesPortalViewProps {
  user: AdminUser;
  onLogout: () => void;
}

export const SalesPortalView: React.FC<SalesPortalViewProps> = ({ user, onLogout }) => {
  // Activation State
  const [cardToken, setCardToken] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [resolvingUrl, setResolvingUrl] = useState(false);
  const [resolvedPreview, setResolvedPreview] = useState<{
    review_url: string;
    place_id?: string;
  } | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState<Card | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);

  // Cards List State
  const [activeCards, setActiveCards] = useState<Card[]>([]);
  const [unassignedCards, setUnassignedCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoadingCards(true);
      const res = await api.getCards({ limit: 100 });
      const active = res.cards.filter((c) => c.status === 'ACTIVE');
      const unassigned = res.cards.filter((c) => !c.business_id && c.status !== 'REVOKED');
      setActiveCards(active);
      setUnassignedCards(unassigned);
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  const handleCheckMapsUrl = async () => {
    if (!mapsUrl.trim()) return;
    setResolvingUrl(true);
    setResolveError(null);
    setResolvedPreview(null);
    try {
      const res = await api.resolveGoogleReviewLink(mapsUrl.trim());
      setResolvedPreview({
        review_url: res.review_url,
        place_id: res.place_id,
      });
    } catch (err: any) {
      setResolveError(err.message || 'Gagal mengekstrak ulasan Google Maps');
    } finally {
      setResolvingUrl(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardToken.trim() || !businessName.trim() || !mapsUrl.trim()) return;

    setActivating(true);
    setActivationError(null);
    try {
      let finalReviewUrl = resolvedPreview?.review_url;
      if (!finalReviewUrl) {
        const resolved = await api.resolveGoogleReviewLink(mapsUrl.trim());
        finalReviewUrl = resolved.review_url;
      }

      const activatedCard = await api.activateCardByToken({
        token: cardToken.trim(),
        business_name: businessName.trim(),
        google_review_url: finalReviewUrl,
      });

      setActivationSuccess(activatedCard);
      loadCards();
    } catch (err: any) {
      setActivationError(err.message || 'Gagal mengaktifkan kartu');
    } finally {
      setActivating(false);
    }
  };

  const handleSelectUnassigned = (card: Card) => {
    setCardToken(card.token);
    setActivationSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredActive = activeCards.filter(
    (c) =>
      c.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.card_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Welcome Bar for Sales */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Wifi className="w-6 h-6 rotate-90" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Portal Sales &amp; Aktivasi Lapangan</h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold">
                TIM SALES
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Selamat bertugas, <strong className="text-slate-200">{user.full_name}</strong>! Hubungkan kartu stok fisik ke bisnis klien secara instan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/activate"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Wifi className="w-3.5 h-3.5 rotate-90" />
            <span>Mode Layar Penuh HP</span>
          </a>
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Kartu Terhubung Aktif</div>
            <div className="text-xl font-bold text-white mt-0.5">{activeCards.length} Kartu</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Stok Siap Dihubungkan</div>
            <div className="text-xl font-bold text-white mt-0.5">{unassignedCards.length} Kartu</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Interaksi Ulasan</div>
            <div className="text-xl font-bold text-white mt-0.5">
              {activeCards.reduce((acc, c) => acc + c.tap_count, 0)} Taps
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Activation Form (Left) & Stok Siap Hubung (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Aktivasi Cepat (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-white text-sm sm:text-base">Aktivasi Kartu Cepat di Lapangan</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">15 Detik Selesai</span>
          </div>

          {activationSuccess ? (
            <div className="p-5 bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-200">Kartu Berhasil Diaktifkan!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Kartu <strong className="text-white font-mono">{activationSuccess.card_code}</strong> kini resmi terhubung ke <strong className="text-white">{activationSuccess.business_name}</strong>.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href={api.getRedirectUrl(activationSuccess.token)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Uji Review Link Google</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setActivationSuccess(null);
                    setCardToken('');
                    setBusinessName('');
                    setMapsUrl('');
                    setResolvedPreview(null);
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium"
                >
                  Aktivasi Kartu Lain
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="space-y-4">
              {activationError && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{activationError}</span>
                </div>
              )}

              {/* Step 1: Token Kartu */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Token / Kode Kartu Fisik</span>
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={cardToken}
                  onChange={(e) => setCardToken(e.target.value)}
                  placeholder="Scan QR kartu atau pilih dari daftar stok di samping..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Step 2: Nama Toko */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Nama Toko / Bisnis Klien</span>
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Contoh: Kopi Kenangan - Senopati"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Step 3: Google Maps Link */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Link Google Maps</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Salin dari Google Maps HP</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={mapsUrl}
                    onChange={(e) => {
                      setMapsUrl(e.target.value);
                      setResolvedPreview(null);
                      setResolveError(null);
                    }}
                    placeholder="https://maps.app.goo.gl/... atau google.com/maps/..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleCheckMapsUrl}
                    disabled={resolvingUrl || !mapsUrl.trim()}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {resolvingUrl ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Cek Link</span>
                  </button>
                </div>

                {resolveError && (
                  <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{resolveError}</span>
                  </p>
                )}

                {resolvedPreview && (
                  <div className="mt-2.5 p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Link Google Review Berhasil Diverifikasi</span>
                    </div>
                    {resolvedPreview.place_id && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Place ID: {resolvedPreview.place_id}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={activating || !cardToken.trim() || !businessName.trim() || !mapsUrl.trim()}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-3"
              >
                {activating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menghubungkan Kartu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Hubungkan &amp; Aktifkan Sekarang</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Stok Kartu Siap Hubung (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Stok Kartu Belum Terhubung</h3>
            </div>
            <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
              {unassignedCards.length}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Pilih salah satu kartu fisik yang sudah dicetak di bawah ini untuk mengisi token secara instan:
          </p>

          <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
            {unassignedCards.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Semua kartu stok telah terhubung ke bisnis.
              </div>
            ) : (
              unassignedCards.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all flex items-center justify-between gap-3 group"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {c.card_code}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Batch: {c.batch_id}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectUnassigned(c)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Pilih</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Riwayat Kartu yang Sudah Aktif */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">Daftar Kartu yang Sudah Aktif</h3>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari toko atau kode kartu..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Active Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredActive.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-500">
              Tidak ada kartu aktif yang cocok dengan pencarian.
            </div>
          ) : (
            filteredActive.map((card) => (
              <div
                key={card.id}
                className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-400">{card.card_code}</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.2 rounded-full font-bold">
                    ACTIVE
                  </span>
                </div>
                <div className="font-bold text-white text-xs truncate">
                  {card.business_name || 'Bisnis Terhubung'}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                  <span>{card.tap_count} Kali Tap</span>
                  <a
                    href={api.getRedirectUrl(card.token)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-0.5"
                  >
                    <span>Uji Link</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
