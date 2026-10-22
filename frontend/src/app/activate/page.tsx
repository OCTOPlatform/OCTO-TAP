'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Wifi,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  User,
  ArrowRight,
  RefreshCw,
  Search,
  Building2,
  LogOut,
  MapPin,
} from 'lucide-react';
import { api, getStoredUser, clearStoredToken } from '@/lib/api';
import { AdminUser, InspectedCardToken } from '@/types';

function ActivationContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  // Auth State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showSalesEasterEgg, setShowSalesEasterEgg] = useState(false);

  // Easter egg: mendeteksi pengetikan kata kunci "elzein"
  useEffect(() => {
    let buffer = '';
    const KEYWORD = 'elzein';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        buffer = buffer.slice(0, -1);
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer = (buffer + e.key.toLowerCase()).slice(-KEYWORD.length);
        if (buffer === KEYWORD) {
          setShowSalesEasterEgg((prev) => !prev);
          buffer = '';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Card Inspection State
  const [tokenInput, setTokenInput] = useState(tokenFromUrl);
  const [activeToken, setActiveToken] = useState(tokenFromUrl);
  const [cardData, setCardData] = useState<InspectedCardToken | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Activation Form State
  const [businessName, setBusinessName] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [resolvingUrl, setResolvingUrl] = useState(false);
  const [resolvedPreview, setResolvedPreview] = useState<{
    review_url: string;
    place_id?: string;
  } | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [activating, setActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState<boolean>(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  // Check stored user on mount
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Inspect card when activeToken changes
  useEffect(() => {
    if (!activeToken) return;

    let isMounted = true;
    setInspectLoading(true);
    setInspectError(null);
    setCardData(null);
    setActivationSuccess(false);

    api
      .inspectCardToken(activeToken)
      .then((data) => {
        if (isMounted) {
          setCardData(data);
          if (data.business_name) {
            setBusinessName(data.business_name);
          }
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setInspectError(err.message || 'Kartu tidak dikenali atau token tidak valid.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setInspectLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeToken]);

  // Handle Sales Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await api.login(loginEmail, loginPassword);
      setCurrentUser(res.admin_user);
    } catch (err: any) {
      setLoginError(err.message || 'Login gagal. Periksa email dan password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    setCurrentUser(null);
  };

  // Resolve Google Maps URL
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

  // Handle Instant Activation
  const handleActivateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeToken || !businessName.trim() || !mapsUrl.trim()) return;

    setActivating(true);
    setActivationError(null);

    try {
      // 1. Pastikan review URL sudah di-resolve
      let finalReviewUrl = resolvedPreview?.review_url;
      if (!finalReviewUrl) {
        const resolved = await api.resolveGoogleReviewLink(mapsUrl.trim());
        finalReviewUrl = resolved.review_url;
      }

      // 2. Hubungkan & Aktifkan kartu
      await api.activateCardByToken({
        token: activeToken,
        business_name: businessName.trim(),
        google_review_url: finalReviewUrl,
      });

      setActivationSuccess(true);
    } catch (err: any) {
      setActivationError(err.message || 'Gagal mengaktifkan kartu');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Header Bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo-OCTO-TAP.png" alt="OCTO-TAP" className="w-7 h-7 object-contain" />
          <div>
            <span className="text-xs font-black tracking-wider uppercase block text-cyan-400">
              OCTO-TAP
            </span>
            <span className="text-[10px] text-slate-400 font-mono">PORTAL AKTIVASI SALES</span>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 text-[11px] bg-slate-900 border border-slate-800 rounded-full px-3 py-1">
            <span className="text-slate-300 font-medium truncate max-w-[120px]">
              {currentUser.full_name}
            </span>
            <span className="px-1.5 py-0.2 bg-cyan-950 text-cyan-400 rounded-full text-[9px] font-bold">
              {currentUser.role || 'SALES'}
            </span>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 ml-1 transition-colors"
              title="Keluar"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5">
        {/* State 1: No Token Provided (User just opened /activate) */}
        {!activeToken && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
              <Wifi className="w-8 h-8 rotate-90 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tap Kartu untuk Aktivasi</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Dekatkan kartu fisik OCTO-TAP ke sensor NFC smartphone Anda atau scan QR code pada kartu.
              </p>
            </div>

            <div className="pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (tokenInput.trim()) {
                    setActiveToken(tokenInput.trim());
                  }
                }}
                className="space-y-2"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Atau masukkan Token kartu..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs"
                  >
                    Cek
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* State 2: Inspecting Card Token */}
        {activeToken && inspectLoading && (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <div className="text-xs font-medium text-slate-300">
              Membaca data kartu fisik...
            </div>
          </div>
        )}

        {/* State 3: Card Inspection Error */}
        {activeToken && !inspectLoading && inspectError && (
          <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl space-y-3 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="text-sm font-bold text-red-200">Kartu Tidak Dikenali</h3>
            <p className="text-xs text-red-300/80 leading-relaxed">{inspectError}</p>
            <button
              onClick={() => setActiveToken('')}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium"
            >
              Coba Kartu Lain
            </button>
          </div>
        )}

        {/* State 4: Card Found! */}
        {activeToken && !inspectLoading && cardData && (
          <>
            {/* Card Identity Header Banner */}
            <div className="p-3.5 bg-gradient-to-r from-cyan-950/60 to-slate-950 border border-cyan-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-mono text-sm">
                  <Wifi className="w-5 h-5 rotate-90" />
                </div>
                <div>
                  <div className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">
                    KODE KARTU FISIK
                  </div>
                  <div className="text-sm font-black text-white font-mono">
                    {cardData.card_code}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    cardData.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {cardData.status === 'ACTIVE' ? 'SUDAH AKTIF' : 'SIAP DIAKTIFKAN'}
                </span>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                  Batch: {cardData.batch_id}
                </div>
              </div>
            </div>

            {/* If Card is Already Active */}
            {cardData.status === 'ACTIVE' && !activationSuccess && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Kartu Ini Sudah Aktif</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>
                    Bisnis:{' '}
                    <strong className="text-white">
                      {cardData.business_name || 'Terhubung'}
                    </strong>
                  </div>
                  <div className="truncate text-slate-400 text-[11px] font-mono">
                    URL: {cardData.google_review_url}
                  </div>
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href={api.getRedirectUrl(cardData.token)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg text-center flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Uji Review Link</span>
                  </a>
                  <button
                    onClick={() => setActiveToken('')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium"
                  >
                    Aktivasi Lain
                  </button>
                </div>
              </div>
            )}

            {/* If Activation Just Succeeded! */}
            {activationSuccess && (
              <div className="p-5 bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-xl space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-200">
                    Kartu Berhasil Diaktifkan!
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Kartu <strong>{cardData.card_code}</strong> kini resmi terhubung ke{' '}
                    <strong className="text-white">{businessName}</strong>.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 text-left">
                  <div className="flex justify-between">
                    <span>Nama Toko:</span>
                    <strong className="text-white">{businessName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <strong className="text-emerald-400 font-bold">ACTIVE</strong>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <a
                    href={api.getRedirectUrl(activeToken)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Uji Buka Google Review di HP Klien</span>
                  </a>
                  <button
                    onClick={() => {
                      setActiveToken('');
                      setBusinessName('');
                      setMapsUrl('');
                      setResolvedPreview(null);
                      setActivationSuccess(false);
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium"
                  >
                    Aktivasi Kartu Baru Berikutnya
                  </button>
                </div>
              </div>
            )}

            {/* If Card Needs Activation and Not Succeeded Yet */}
            {cardData.status !== 'ACTIVE' && !activationSuccess && (
              <>
                {/* Auth Gate: Must Login First */}
                {!currentUser ? (
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                      <Lock className="w-4 h-4" />
                      <span>Masuk sebagai Tim Sales / Agen</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Silakan login dengan akun sales Anda untuk menghubungkan kartu ini ke toko merchant.
                    </p>

                    {loginError && (
                      <div className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-lg text-red-200 text-[11px] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                          Email Akun
                        </label>
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="sales@octotap.com"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {loginLoading ? 'Memproses...' : 'Masuk & Lanjutkan Aktivasi'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {showSalesEasterEgg && (
                        <div className="pt-2 text-center animate-in fade-in duration-200">
                          <button
                            type="button"
                            onClick={() => {
                              setLoginEmail('sales@octotap.com');
                              setLoginPassword('password123');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Mode Rahasia: Gunakan Akun Demo Sales (sales@octotap.com)</span>
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                ) : (
                  /* Form Aktivasi Cepat untuk Sales */
                  <form onSubmit={handleActivateCard} className="space-y-4">
                    {activationError && (
                      <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{activationError}</span>
                      </div>
                    )}

                    {/* Field 1: Nama Usaha */}
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
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-medium"
                      />
                    </div>

                    {/* Field 2: Google Maps Link */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>Link Google Maps</span>
                          <span className="text-red-400">*</span>
                        </label>
                        <span className="text-[9px] text-slate-500">
                          Salin dari Google Maps
                        </span>
                      </div>

                      <div className="flex gap-1.5">
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
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                          title="Periksa review link Google"
                        >
                          {resolvingUrl ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Cek Link</span>
                        </button>
                      </div>

                      {/* Error or Success Preview */}
                      {resolveError && (
                        <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{resolveError}</span>
                        </p>
                      )}

                      {resolvedPreview && (
                        <div className="mt-2 p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Link Ulasan Terverifikasi Otomatis</span>
                          </div>
                          {resolvedPreview.place_id && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Place ID: {resolvedPreview.place_id}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={activating || !businessName.trim() || !mapsUrl.trim()}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
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
              </>
            )}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-md text-center mt-6 text-[11px] text-slate-500 space-y-1">
        <p>OCTO-TAP Smart Review System • Field Activation Engine</p>
        <p className="text-[10px]">
          Setelah aktivasi, kartu langsung dapat diuji coba dengan HP klien.
        </p>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      }
    >
      <ActivationContent />
    </Suspense>
  );
}
