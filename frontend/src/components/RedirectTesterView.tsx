'use client';

import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  Zap,
  Wifi
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, Business } from '@/types';

export const RedirectTesterView: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedToken, setSelectedToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickActionMsg, setQuickActionMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{
    status: number;
    location?: string;
    durationMs: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cardRes, bizRes] = await Promise.all([
        api.getCards({ limit: 100 }),
        api.getBusinesses({ limit: 100 }),
      ]);
      setCards(cardRes.cards);
      setBusinesses(bizRes.businesses);
      if (cardRes.cards.length > 0 && !selectedToken) {
        setSelectedToken(cardRes.cards[0].token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectedCard = cards.find((c) => c.token === selectedToken);
  const selectedBusiness = businesses.find((b) => b.id === selectedCard?.business_id);

  const handleQuickActivate = async () => {
    if (!selectedCard) return;
    setQuickActionMsg(null);
    try {
      await api.activateCard(selectedCard.id);
      setQuickActionMsg(`Kartu ${selectedCard.card_code} berhasil DIAKTIFKAN!`);
      await loadData();
      setTimeout(() => handleTestRedirect(), 300);
    } catch (err: any) {
      alert(`Gagal mengaktifkan kartu: ${err.message}`);
    }
  };

  const handleQuickVerifyBusiness = async () => {
    if (!selectedBusiness) return;
    setQuickActionMsg(null);
    try {
      await api.verifyBusinessURL(selectedBusiness.id);
      setQuickActionMsg(`Bisnis ${selectedBusiness.name} berhasil DIVERIFIKASI!`);
      await loadData();
    } catch (err: any) {
      alert(`Gagal memverifikasi bisnis: ${err.message}`);
    }
  };

  const handleTestRedirect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedToken) return;

    setLoading(true);
    setResult(null);

    const startTime = performance.now();
    try {
      const redirectUrl = api.getRedirectUrl(selectedToken);
      // We perform fetch with redirect: 'manual' to inspect 302/404/410 response
      const res = await fetch(redirectUrl, {
        method: 'GET',
        redirect: 'manual',
      });
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      const location = res.headers.get('Location') || undefined;
      // In browser fetch, status 0 or opaqueredirect means 302 Found redirect occurred
      let status = res.status;
      if (res.type === 'opaqueredirect' || status === 0) {
        status = 302;
      }

      setResult({
        status,
        location,
        durationMs,
      });
    } catch (err: any) {
      const endTime = performance.now();
      setResult({
        status: 500,
        durationMs: Math.round(endTime - startTime),
        error: err.message || 'Network error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 302:
        return '302 Found — Berhasil Redirect ke Google Review';
      case 404:
        return '404 Not Found — Token Tidak Dikenal atau Kartu Belum Aktif';
      case 410:
        return '410 Gone — Kartu Telah Dicabut Permanen (Revoked)';
      default:
        return `HTTP ${status}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400" />
          <span>Simulator Pengalaman Pengguna (Tap NFC / Scan QR)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Uji endpoint publik <span className="font-mono text-cyan-300">GET /r/{'{token}'}</span> secara langsung untuk mengukur latensi redirect (&lt;300ms) dan memverifikasi kesesuaian respons HTTP dengan PRD (302, 404, 410).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-white">Pilih Token Kartu untuk Pengujian</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pilih dari Inventaris Kartu:
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.token}>
                    {c.card_code} • {c.business_name} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Atau Tempelkan Token Acak (32-byte Base64 URL-safe):
              </label>
              <input
                type="text"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                placeholder="GQfmqlk6-idXN25KTEjODOBuz0eYOqd4cCXHCaMnlLk"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Pre-Flight Diagnostic Status */}
            {selectedCard && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Diagnostik Kesiapan Kartu:</span>
                  <span className="text-[10px] font-mono text-slate-500">{selectedCard.card_code}</span>
                </div>

                {quickActionMsg && (
                  <div className="p-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px]">
                    {quickActionMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Status Bisnis:</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`font-bold ${selectedBusiness?.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {selectedBusiness?.status || 'UNKNOWN'}
                      </span>
                      {selectedBusiness?.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={handleQuickVerifyBusiness}
                          className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold cursor-pointer"
                        >
                          Verifikasi
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Status Kartu:</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`font-bold ${selectedCard.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {selectedCard.status}
                      </span>
                      {selectedCard.status !== 'ACTIVE' && selectedCard.status !== 'REVOKED' && (
                        <button
                          type="button"
                          onClick={handleQuickActivate}
                          className="px-2 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-bold cursor-pointer"
                        >
                          Aktifkan
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {selectedCard.status !== 'ACTIVE' || selectedBusiness?.status !== 'ACTIVE' ? (
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300">
                    ⚠️ <strong>Kartu Belum Aktif:</strong> Membuka link sekarang akan memunculkan halaman <em>&quot;Kartu Belum Aktif&quot;</em>. Klik tombol di atas agar status menjadi <strong>ACTIVE</strong> untuk redirect normal.
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300">
                    ✅ <strong>Kartu &amp; Bisnis Siap:</strong> Tap/Scan akan langsung mengirim HTTP 302 redirect ke Google Review.
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => handleTestRedirect()}
                disabled={loading || !selectedToken}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Mengirim Request ke GET /r/{'{token}'}...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Jalankan Simulasi Tap / Redirect</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Card */}
          {result && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hasil Respons Public Redirect
                </span>
                <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800/40">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Latensi: {result.durationMs} ms</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Kode Status HTTP:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      result.status === 302
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : result.status === 410
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {getStatusText(result.status)}
                  </span>
                </div>

                {result.status === 302 && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                    <span className="text-slate-500">Destination Google Review:</span>
                    <div className="mt-1 font-mono text-cyan-300 break-all select-all flex items-center gap-1.5">
                      <a
                        href={api.getRedirectUrl(selectedToken)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        <span>Buka Halaman Google Review di Tab Baru</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </div>
                )}

                {result.durationMs < 300 && (
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Memenuhi target NFR-03 (P95 redirect API &lt; 300 ms)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Smartphone Simulation Frame */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-72 sm:w-80 h-[520px] rounded-[40px] border-4 border-slate-700 bg-slate-950 p-3 shadow-2xl relative flex flex-col justify-between overflow-hidden">
            {/* Phone Notch */}
            <div className="w-32 h-5 bg-slate-800 rounded-b-2xl mx-auto flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-700 mr-2" />
              <div className="w-10 h-1 rounded-full bg-slate-900" />
            </div>

            {/* Screen Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              {result?.status === 302 ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Google Review Terbuka!</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Pelanggan langsung diarahkan ke form bintang 5 Google Maps tanpa perantara.
                    </p>
                  </div>
                  <a
                    href={api.getRedirectUrl(selectedToken)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20"
                  >
                    <span>Tulis Ulasan Sekarang</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : result?.status === 410 ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-400">Kartu Dicabut (410)</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Kartu ini telah dinonaktifkan permanen oleh admin penjual.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-dashed border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto">
                    <Wifi className="w-8 h-8 rotate-90 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Dekatkan Ponsel ke Kartu</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Tap tag NFC atau pindai QR Code kartu OCTO Tap untuk membuka Google Review.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Home Indicator */}
            <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mb-1" />
          </div>
          <span className="text-[11px] text-slate-500 mt-2 font-mono">Simulasi Tampilan Ponsel Pelanggan</span>
        </div>
      </div>
    </div>
  );
};
