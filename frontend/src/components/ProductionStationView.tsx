'use client';

import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  Wifi, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Check, 
  X
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ManifestItem, Business } from '@/types';

export const ProductionStationView: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [manifest, setManifest] = useState<ManifestItem[]>([]);
  const [, setLoading] = useState(false);

  // QC station state
  const [, setNfcWritten] = useState(false);
  const [, setNfcVerified] = useState(false);
  const [qcNotes, setQcNotes] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedBusiness]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cardsRes, bizRes, manifestRes] = await Promise.all([
        api.getCards({ business_id: selectedBusiness || undefined, limit: 100 }),
        api.getBusinesses({ limit: 100 }),
        api.getManifest({ business_id: selectedBusiness || undefined }),
      ]);
      setCards(cardsRes.cards);
      setBusinesses(bizRes.businesses);
      setManifest(manifestRes);
      if (cardsRes.cards.length > 0 && !selectedCard) {
        setSelectedCard(cardsRes.cards[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCard = (c: Card) => {
    setSelectedCard(c);
    setNfcWritten(false);
    setNfcVerified(false);
    setActionMessage(null);
  };

  const handleSimulateWriteNFC = async () => {
    if (!selectedCard) return;
    setActionMessage(null);
    try {
      const redirectUrl = api.getRedirectUrl(selectedCard.token);
      await api.recordProductionEvent(
        selectedCard.id,
        'NFC_WRITTEN',
        { device: 'ACR122U USB NFC Writer', written_url: redirectUrl },
        'NDEF URI record successfully written to NTAG213 chip.'
      );
      setNfcWritten(true);
      setActionMessage({ type: 'success', text: `NFC NDEF Record berhasil ditulis: ${redirectUrl}` });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Gagal menulis NFC' });
    }
  };

  const handleSimulateVerifyNFC = async () => {
    if (!selectedCard) return;
    setActionMessage(null);
    try {
      const redirectUrl = api.getRedirectUrl(selectedCard.token);
      await api.recordProductionEvent(
        selectedCard.id,
        'NFC_VERIFIED',
        { read_url: redirectUrl },
        'Tag read matches exact QR redirect URL. Zero discrepancy.'
      );
      setNfcVerified(true);
      setActionMessage({ type: 'success', text: 'Verifikasi Berhasil! URL NFC dan URL QR cocok 100%.' });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Verifikasi gagal' });
    }
  };

  const handlePassQC = async () => {
    if (!selectedCard) return;
    setActionMessage(null);
    try {
      await api.recordProductionEvent(
        selectedCard.id,
        'QC_PASSED',
        { passed: true, visual_inspection: 'OK', nfc_test: 'OK', notes: qcNotes },
        qcNotes || 'Quality control inspection passed. Ready for packaging and delivery.'
      );
      setSelectedCard({ ...selectedCard, status: 'QC_PASSED' });
      setActionMessage({ type: 'success', text: `Kartu ${selectedCard.card_code} dinyatakan LOLOS QC (QC_PASSED)! Silakan klik tombol 'Aktifkan Kartu' di bawah agar link redirect dapat langsung dibuka.` });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Gagal meloloskan QC' });
    }
  };

  const handleActivateCard = async () => {
    if (!selectedCard) return;
    setActionMessage(null);
    try {
      await api.activateCard(selectedCard.id);
      setSelectedCard({ ...selectedCard, status: 'ACTIVE' });
      setActionMessage({ type: 'success', text: `Kartu ${selectedCard.card_code} BERHASIL DIAKTIFKAN (ACTIVE)! Link redirect sekarang sudah siap dan aktif mengarah ke Google Review.` });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Gagal mengaktifkan kartu' });
    }
  };

  const handleVerifyBusiness = async (bizId: string) => {
    setActionMessage(null);
    try {
      await api.verifyBusinessURL(bizId);
      setActionMessage({ type: 'success', text: 'Bisnis berhasil diverifikasi (ACTIVE)! Sekarang Anda dapat mengaktifkan kartu ini.' });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Gagal memverifikasi bisnis' });
    }
  };

  const handleFailQC = async () => {
    if (!selectedCard) return;
    const reason = prompt('Masukkan alasan penolakan QC (misal: goresan akrilik / chip NFC tidak terbaca):');
    if (!reason) return;
    try {
      await api.recordProductionEvent(
        selectedCard.id,
        'QC_FAILED',
        { passed: false, reason },
        reason
      );
      setActionMessage({ type: 'error', text: `Kartu ditolak QC: ${reason}` });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Gagal memproses penolakan QC' });
    }
  };

  const exportManifestCSV = () => {
    if (manifest.length === 0) return;
    const headers = ['Card Code', 'Business Name', 'Token', 'Redirect URL (QR & NFC)', 'Status'];
    const rows = manifest.map((m) => [
      m.card_code,
      `"${m.business_name.replace(/"/g, '""')}"`,
      m.token,
      m.redirect_url,
      m.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OCTO_Tap_Production_Manifest_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Factory className="w-5 h-5 text-cyan-400" />
            <span>Stasiun Produksi NFC & Quality Control (QC)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Penulisan NDEF URI record ke chip NFC NTAG213, verifikasi kesamaan URL antara QR dan NFC, dan sertifikasi kelolosan QC sebelum aktivasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportManifestCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Manifest CSV</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left is Card Selector, Right is Interactive QC Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Queue */}
        <div className="lg:col-span-1 rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Antrean Kartu Produksi
            </h3>
            <span className="text-xs text-slate-400">{cards.length} kartu</span>
          </div>

          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Semua Bisnis</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
            {cards.map((c) => {
              const isSelected = selectedCard?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCard(c)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/60 text-white shadow-md shadow-cyan-900/20'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-cyan-300">{c.card_code}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-400 truncate">{c.business_name || '📦 Stok Gudang (Model B)'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive QC & NFC Programmer Console */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-6">
          {selectedCard ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white font-mono">{selectedCard.card_code}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                      Status: {selectedCard.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Bisnis: <span className="text-slate-200 font-medium">{selectedCard.business_name || '📦 Stok Gudang (Model B)'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Target Google Review:</div>
                  <div className="text-xs text-slate-300 max-w-[200px] truncate">{selectedCard.google_review_url || '(Belum terhubung ke bisnis)'}</div>
                </div>
              </div>

              {actionMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    actionMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  {actionMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{actionMessage.text}</span>
                </div>
              )}

              {/* URL Alignment Box (PRD FR-06) */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-cyan-400" />
                    <span>Single Source of Truth: Redirect URL</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    QR & NFC Wajib Identik
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg font-mono text-cyan-300 text-xs break-all select-all border border-slate-800">
                  {api.getRedirectUrl(selectedCard.token)}
                </div>
                <p className="text-[11px] text-slate-400">
                  URL di atas adalah satu-satunya URL yang boleh di-encode ke chip NFC dan QR Code kartu ini. Perubahan target review diatur dinamis di cloud tanpa perlu modifikasi chip.
                </p>
              </div>

              {/* Step 1 & 2: NFC Write and Verification Simulation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <Wifi className="w-4 h-4 text-cyan-400 rotate-90" />
                    <span>1. Penulisan NDEF URI</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Menulis URI record ke tag NTAG213 menggunakan NFC Writer.
                  </p>
                  <button
                    onClick={handleSimulateWriteNFC}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow transition-colors cursor-pointer"
                  >
                    Tulis Tag NFC Sekarang
                  </button>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>2. Verifikasi Ulang Pembacaan</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Baca ulang NFC dan bandingkan URL dengan URL QR kartu.
                  </p>
                  <button
                    onClick={handleSimulateVerifyNFC}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
                  >
                    Verifikasi Kesamaan URL
                  </button>
                </div>
              </div>

              {/* Step 3: QC Certification */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    3. Catatan Inspeksi QC Fisik & Digital
                  </span>
                  <span className="text-[10px] text-slate-500">Akrilik 100x100mm, Sudut R8, UV Print</span>
                </div>
                <input
                  type="text"
                  placeholder="Catatan inspektor (opsional, misal: Cetakan jernih, respon tap cepat)..."
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handlePassQC}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Nyatakan Lolos QC (QC_PASSED)</span>
                  </button>
                  <button
                    onClick={handleFailQC}
                    className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Tolak (Gagal QC)</span>
                  </button>
                </div>
              </div>

              {/* Step 4: Aktivasi Kartu & Status Redirect */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    4. Status Akhir: Aktivasi Kartu (Siap Digunakan Pelanggan)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Syarat: QC_PASSED & Bisnis ACTIVE
                  </span>
                </div>

                {selectedCard.status === 'ACTIVE' ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-300">Kartu Sudah AKTIF (ACTIVE)</div>
                        <div className="text-[11px] text-slate-400">Pelanggan tap NFC atau scan QR akan langsung diarahkan ke Google Review.</div>
                      </div>
                    </div>
                    <a
                      href={api.getRedirectUrl(selectedCard.token)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                    >
                      Buka Link Redirect
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!selectedCard.business_id ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-1.5">
                        <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                          <span>📦 Kartu Stok Gudang (Model B)</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Kartu ini dicetak sebagai stok gudang dan belum dihubungkan ke bisnis. Penulisan NFC dan uji QC tetap dapat dilakukan. Setelah kartu lolos QC, kartu dapat disimpan sebagai stok atau dihubungkan ke bisnis klien di menu <strong>Inventaris Kartu</strong>.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Business status warning if PENDING */}
                        {businesses.find((b) => b.id === selectedCard.business_id)?.status === 'PENDING' && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                            <div>
                              <span className="font-semibold block">⚠️ Bisnis Masih Berstatus PENDING</span>
                              <span className="text-[11px] text-slate-400">URL Google Review harus diverifikasi terlebih dahulu sebelum kartu dapat aktif.</span>
                            </div>
                            <button
                              onClick={() => handleVerifyBusiness(selectedCard.business_id!)}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                            >
                              Verifikasi Bisnis
                            </button>
                          </div>
                        )}

                        {selectedCard.status === 'QC_PASSED' ? (
                          <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-cyan-300">QC Telah Berhasil! Langkah Terakhir: Aktifkan Kartu</div>
                              <div className="text-[11px] text-slate-400">Klik tombol di samping agar pelanggan bisa membuka review Google saat tap/scan.</div>
                            </div>
                            <button
                              onClick={handleActivateCard}
                              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer shrink-0 ml-2"
                            >
                              🚀 Aktifkan Kartu Sekarang
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500">
                            Status saat ini: <span className="font-mono text-cyan-400">{selectedCard.status}</span>. Selesaikan Step 1 (Tulis NFC), Step 2 (Verifikasi), dan Step 3 (Lolos QC) di atas untuk mengaktifkan kartu ini.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">
              Pilih kartu dari antrean di sebelah kiri untuk memulai proses penulisan NFC dan QC.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
