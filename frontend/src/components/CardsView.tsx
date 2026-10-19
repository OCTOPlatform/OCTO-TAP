'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Download, 
  AlertOctagon, 
  RefreshCw, 
  Eye, 
  ExternalLink,
  Sparkles,
  X,
  Plus,
  Layers,
  Link as LinkIcon,
  CheckCircle2,
  CheckCircle,
  Building2,
  Package,
  Edit3,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  MapPin
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, Business, ProductionEvent, CardStatus } from '@/types';
import { PhysicalCardMockup } from './PhysicalCardMockup';

interface CardsViewProps {
  initialBusinessForBatch?: Business | null;
  onClearInitialBusiness?: () => void;
  isBatchOpenInitially?: boolean;
}

export const CardsView: React.FC<CardsViewProps> = ({
  initialBusinessForBatch,
  onClearInitialBusiness,
  isBatchOpenInitially = false,
}) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [batchFilter] = useState('');

  // Modals & Drawers - Model A (Per Business)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(isBatchOpenInitially);
  const [selectedBusinessId, setSelectedBusinessId] = useState(initialBusinessForBatch?.id || '');
  const [batchQuantity, setBatchQuantity] = useState(5);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Modals & Drawers - Model B (Pre-printed Stock / Cetak Massal)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(25);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  // Assign & Activate Modal (For Model B Stock Cards)
  const [cardToAssign, setCardToAssign] = useState<Card | null>(null);
  const [assignMode, setAssignMode] = useState<'new' | 'existing'>('new');
  const [assignExistingBizId, setAssignExistingBizId] = useState('');
  const [assignNewBizName, setAssignNewBizName] = useState('');
  const [assignMapsUrl, setAssignMapsUrl] = useState('');
  const [assignResolvedPreview, setAssignResolvedPreview] = useState<{ review_url: string; place_id?: string } | null>(null);
  const [checkingAssignUrl, setCheckingAssignUrl] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // Edit Business Link Modal from Card Detail
  const [editingCardBusiness, setEditingCardBusiness] = useState<{
    cardId: string;
    businessId: string;
    businessName: string;
    googleReviewUrl: string;
  } | null>(null);
  const [editCardBizMapsUrl, setEditCardBizMapsUrl] = useState('');
  const [editCardBizResolvedPreview, setEditCardBizResolvedPreview] = useState<{ review_url: string; place_id?: string } | null>(null);
  const [checkingEditCardBizUrl, setCheckingEditCardBizUrl] = useState(false);
  const [editCardBizName, setEditCardBizName] = useState('');
  const [editCardBizLoading, setEditCardBizLoading] = useState(false);
  const [editCardBizError, setEditCardBizError] = useState<string | null>(null);

  const [activeCardDetail, setActiveCardDetail] = useState<{ card: Card; events: ProductionEvent[] } | null>(null);
  const [downloadingQR, setDownloadingQR] = useState(false);

  useEffect(() => {
    if (initialBusinessForBatch) {
      setSelectedBusinessId(initialBusinessForBatch.id);
      setIsBatchModalOpen(true);
    }
  }, [initialBusinessForBatch]);

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    loadCards();
  }, [search, statusFilter, businessFilter, batchFilter]);

  const loadBusinesses = async () => {
    try {
      const res = await api.getBusinesses({ limit: 100 });
      setBusinesses(res.businesses);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCards = async () => {
    try {
      setLoading(true);
      const res = await api.getCards({
        search,
        status: statusFilter,
        business_id: businessFilter || undefined,
        batch_id: batchFilter || undefined,
        limit: 100,
      });
      setCards(res.cards);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId) {
      setBatchError('Pilih bisnis tujuan terlebih dahulu');
      return;
    }

    setBatchError(null);
    setBatchLoading(true);
    try {
      const idempotencyKey = `batch-client-${Date.now()}`;
      await api.batchIssueCards(selectedBusinessId, Number(batchQuantity), idempotencyKey);
      setIsBatchModalOpen(false);
      if (onClearInitialBusiness) onClearInitialBusiness();
      loadCards();
    } catch (err: any) {
      setBatchError(err.message || 'Gagal menerbitkan batch kartu');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleIssueStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockError(null);
    setStockLoading(true);
    try {
      const idempotencyKey = `stock-client-${Date.now()}`;
      await api.batchIssueStockCards(Number(stockQuantity), idempotencyKey);
      setIsStockModalOpen(false);
      loadCards();
    } catch (err: any) {
      setStockError(err.message || 'Gagal menerbitkan stok kartu massal');
    } finally {
      setStockLoading(false);
    }
  };

  const openAssignModal = (c: Card) => {
    setCardToAssign(c);
    setAssignMode('new');
    setAssignExistingBizId('');
    setAssignNewBizName('');
    setAssignMapsUrl('');
    setAssignResolvedPreview(null);
    setAssignError(null);
    setAssignSuccess(null);
  };

  const handleAssignAndActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardToAssign) return;
    setAssignError(null);
    setAssignSuccess(null);
    setAssignLoading(true);
    try {
      if (assignMode === 'existing') {
        if (!assignExistingBizId) {
          throw new Error('Pilih bisnis yang sudah terdaftar');
        }
        await api.assignAndActivateCard(cardToAssign.id, {
          business_id: assignExistingBizId,
        });
      } else {
        if (!assignNewBizName.trim()) {
          throw new Error('Nama bisnis wajib diisi');
        }
        if (!assignMapsUrl.trim()) {
          throw new Error('URL Google Maps wajib diisi');
        }

        // Convert Google Maps URL to official review URL via Productmate endpoint
        const resolved = await api.resolveGoogleReviewLink(assignMapsUrl.trim());
        const finalUrl = resolved.review_url;

        await api.assignAndActivateCard(cardToAssign.id, {
          business_name: assignNewBizName.trim(),
          google_review_url: finalUrl,
        });
      }

      setAssignSuccess(`Kartu ${cardToAssign.card_code} berhasil dihubungkan dan AKTIF!`);
      setTimeout(() => {
        setCardToAssign(null);
        setAssignSuccess(null);
        setAssignMapsUrl('');
        setAssignResolvedPreview(null);
        setAssignNewBizName('');
      }, 1200);
      loadCards();
      loadBusinesses();
      if (activeCardDetail && activeCardDetail.card.id === cardToAssign.id) {
        openCardDetail(cardToAssign);
      }
    } catch (err: any) {
      setAssignError(err.message || 'Gagal menghubungkan & mengaktifkan kartu');
    } finally {
      setAssignLoading(false);
    }
  };

  const extractPlaceId = (u: string): string => {
    const match = u.match(/[?&]placeid=([^&#]+)/);
    return match ? match[1] : '';
  };

  const openEditFromCard = (c: Card) => {
    if (!c.business_id) return;
    setEditingCardBusiness({
      cardId: c.id,
      businessId: c.business_id,
      businessName: c.business_name || '',
      googleReviewUrl: c.google_review_url || '',
    });
    setEditCardBizName(c.business_name || '');
    setEditCardBizMapsUrl(c.google_review_url || '');
    setEditCardBizResolvedPreview({
      review_url: c.google_review_url || '',
      place_id: extractPlaceId(c.google_review_url || ''),
    });
    setEditCardBizError(null);
  };

  const handleUpdateFromCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCardBusiness) return;
    setEditCardBizError(null);
    setEditCardBizLoading(true);

    try {
      if (!editCardBizName.trim()) {
        throw new Error('Nama bisnis wajib diisi');
      }
      if (!editCardBizMapsUrl.trim()) {
        throw new Error('URL Google Maps wajib diisi');
      }

      let finalUrl = editCardBizMapsUrl.trim();
      if (finalUrl !== editingCardBusiness.googleReviewUrl) {
        const resolved = await api.resolveGoogleReviewLink(finalUrl);
        finalUrl = resolved.review_url;
      }

      await api.updateBusiness(editingCardBusiness.businessId, {
        name: editCardBizName.trim(),
        google_review_url: finalUrl,
      });
      const updatedCardId = editingCardBusiness.cardId;
      setEditingCardBusiness(null);
      loadCards();
      loadBusinesses();
      const updated = await api.getCard(updatedCardId);
      setActiveCardDetail(updated);
    } catch (err: any) {
      setEditCardBizError(err.message || 'Gagal mengubah data bisnis/URL');
    } finally {
      setEditCardBizLoading(false);
    }
  };

  const openCardDetail = async (c: Card) => {
    try {
      const res = await api.getCard(c.id);
      setActiveCardDetail(res);
    } catch (err: any) {
      alert(`Gagal mengambil detail kartu: ${err.message}`);
    }
  };

  const handleGenerateQR = async (c: Card) => {
    try {
      const res = await api.generateQR(c.id);
      setCards((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, qr_code_url: res.qr_code_url, status: item.status === 'DRAFT' ? 'READY' : item.status } : item))
      );
      if (activeCardDetail && activeCardDetail.card.id === c.id) {
        setActiveCardDetail({
          ...activeCardDetail,
          card: { ...activeCardDetail.card, qr_code_url: res.qr_code_url },
        });
      }
    } catch (err: any) {
      alert(`Gagal generate QR: ${err.message}`);
    }
  };

  const handleDownloadQR = async (card: Card) => {
    try {
      setDownloadingQR(true);
      await api.downloadCardQRPNG(card.id, `${card.card_code}-qr.png`);
    } catch (err: any) {
      alert(`Gagal mengunduh QR Code: ${err.message}`);
    } finally {
      setDownloadingQR(false);
    }
  };

  const handleActivate = async (c: Card) => {
    try {
      await api.activateCard(c.id);
      loadCards();
      if (activeCardDetail && activeCardDetail.card.id === c.id) {
        openCardDetail(c);
      }
    } catch (err: any) {
      alert(`Gagal mengaktifkan kartu: ${err.message}`);
    }
  };

  const handleDeactivate = async (c: Card) => {
    try {
      await api.deactivateCard(c.id);
      loadCards();
      if (activeCardDetail && activeCardDetail.card.id === c.id) {
        openCardDetail(c);
      }
    } catch (err: any) {
      alert(`Gagal menonaktifkan kartu: ${err.message}`);
    }
  };

  const handleRevoke = async (c: Card) => {
    if (!confirm(`PERINGATAN: Mencabut (Revoke) kartu ${c.card_code} akan mengubah status menjadi REVOKED (HTTP 410).\n\nTips: Jika hanya ingin menghentikan redirect sementara, gunakan "Nonaktifkan Kartu".\n\nApakah Anda yakin ingin mencabut kartu ini?`)) return;
    try {
      await api.revokeCard(c.id);
      loadCards();
      if (activeCardDetail && activeCardDetail.card.id === c.id) {
        openCardDetail(c);
      }
    } catch (err: any) {
      alert(`Gagal mencabut kartu: ${err.message}`);
    }
  };

  const handleRestore = async (c: Card) => {
    if (!confirm(`Pulihkan kartu ${c.card_code}?\n\nKartu akan dipulihkan dari status REVOKED sehingga chip NFC & QR Code fisik dapat digunakan kembali oleh pelanggan tanpa perlu mencetak kartu baru.`)) return;
    try {
      await api.restoreCard(c.id);
      loadCards();
      if (activeCardDetail && activeCardDetail.card.id === c.id) {
        openCardDetail(c);
      }
    } catch (err: any) {
      alert(`Gagal memulihkan kartu: ${err.message}`);
    }
  };

  const getStatusBadge = (status: CardStatus) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600 text-[10px] font-semibold">DRAFT</span>;
      case 'READY':
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold">READY</span>;
      case 'IN_PRODUCTION':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">IN PRODUCTION</span>;
      case 'QC_PASSED':
        return <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-semibold">QC PASSED</span>;
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold animate-pulse">ACTIVE</span>;
      case 'INACTIVE':
        return <span className="px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 border border-zinc-600 text-[10px] font-semibold">INACTIVE</span>;
      case 'REVOKED':
        return <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">REVOKED (410)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Inventaris Kartu OCTO Tap</h2>
          <p className="text-xs text-slate-400 mt-1">
            Mendukung <strong className="text-cyan-400 font-semibold">Model A</strong> (pesanan per bisnis) dan <strong className="text-amber-400 font-semibold">Model B</strong> (cetak massal stok fisik dahulu, aktivasi kemudian).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setIsStockModalOpen(true);
              setStockError(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            title="Cetak kartu massal untuk stok fisik terlebih dahulu tanpa bisnis"
          >
            <Layers className="w-4 h-4" />
            <span>+ Cetak Stok Massal (Model B)</span>
          </button>

          <button
            onClick={() => {
              setIsBatchModalOpen(true);
              setBatchError(null);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            title="Terbitkan batch kartu untuk bisnis tertentu yang sudah terdaftar"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>+ Batch Pesanan (Model A)</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari kode kartu atau bisnis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={businessFilter}
          onChange={(e) => setBusinessFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="">Semua Bisnis & Stok</option>
          <option value="unassigned">📦 Stok Gudang Belum Terikat (Model B)</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="">Semua Status Lifecycle</option>
          <option value="DRAFT">DRAFT</option>
          <option value="READY">READY</option>
          <option value="IN_PRODUCTION">IN PRODUCTION</option>
          <option value="QC_PASSED">QC PASSED</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="REVOKED">REVOKED</option>
        </select>

        <button
          onClick={loadCards}
          className="flex items-center justify-center gap-2 px-3 py-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl text-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan ({total} Kartu)</span>
        </button>
      </div>

      {/* Cards Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Kode Kartu</th>
                <th className="py-3 px-4">Bisnis & Token</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">Status Lifecycle</th>
                <th className="py-3 px-4 text-center">Tap Count</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && cards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Memuat inventaris kartu...
                  </td>
                </tr>
              ) : cards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ada kartu ditemukan. Silakan terbitkan batch kartu baru atau cetak stok massal.
                  </td>
                </tr>
              ) : (
                cards.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-cyan-300">{c.card_code}</div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: {c.id.substring(0, 8)}...</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      {c.business_id ? (
                        <>
                          <div className="font-semibold text-white truncate flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{c.business_name || 'Bisnis'}</span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 truncate" title={c.token}>
                            Token: {c.token.substring(0, 16)}...
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            <Package className="w-3 h-3" />
                            <span>STOK GUDANG (MODEL B)</span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 truncate mt-0.5" title={c.token}>
                            Token: {c.token.substring(0, 16)}...
                          </div>
                        </>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {c.batch_id}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-white text-sm">{c.tap_count}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openCardDetail(c)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Lihat Detail & Preview Mockup"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>Detail</span>
                        </button>

                        {/* Model B Unassigned Card: Quick Assign & Activate */}
                        {!c.business_id && c.status !== 'REVOKED' && (
                          <button
                            onClick={() => openAssignModal(c)}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                            title="Hubungkan ke Bisnis & Aktifkan Link Redirect"
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Hubungkan & Aktifkan</span>
                          </button>
                        )}

                        {!c.qr_code_url && (
                          <button
                            onClick={() => handleGenerateQR(c)}
                            className="px-2 py-1 rounded bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Generate QR Code"
                          >
                            Generate QR
                          </button>
                        )}

                        {(c.status === 'QC_PASSED' || c.status === 'INACTIVE') && c.business_id && (
                          <button
                            onClick={() => handleActivate(c)}
                            className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Aktifkan Kartu"
                          >
                            Aktifkan
                          </button>
                        )}

                        {c.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleDeactivate(c)}
                            className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Nonaktifkan Kartu Sementara"
                          >
                            Nonaktifkan
                          </button>
                        )}

                        {c.status === 'REVOKED' && (
                          <button
                            onClick={() => handleRestore(c)}
                            className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                            title="Pulihkan Kartu (Restore Un-revoke)"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Pulihkan</span>
                          </button>
                        )}

                        {c.status !== 'REVOKED' && (
                          <button
                            onClick={() => handleRevoke(c)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Cabut Kartu Permanen (Revoke 410)"
                          >
                            <AlertOctagon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Terbitkan Batch Kartu */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>Penerbitan Batch Kartu Baru</span>
              </h3>
              <button
                onClick={() => {
                  setIsBatchModalOpen(false);
                  if (onClearInitialBusiness) onClearInitialBusiness();
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {batchError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{batchError}</span>
              </div>
            )}

            <form onSubmit={handleBatchIssue} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pilih Bisnis Tujuan <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={selectedBusinessId}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Pilih Bisnis --</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jumlah Kartu yang Diterbitkan (1 - 200) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Jaminan Anti-Duplikasi Token (PRD Sec. 10)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Sistem akan meng-generate token acak 32-byte CSPRNG terenkripsi Base64 URL-safe (sekitar 43 karakter) dengan penegakan Unique Constraint di database dan proteksi Idempotency Key.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBatchModalOpen(false);
                    if (onClearInitialBusiness) onClearInitialBusiness();
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={batchLoading}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {batchLoading ? 'Memproses CSPRNG...' : `Terbitkan ${batchQuantity} Kartu`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cetak Stok Massal (Model B) */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Cetak Stok Kartu Massal (Model B)</span>
              </h3>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {stockError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{stockError}</span>
              </div>
            )}

            <form onSubmit={handleIssueStock} className="space-y-4 mt-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 space-y-1.5">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  <span>Cetak Fisik Dulu, Bisnis Klien Nanti</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Model B memungkinkan Anda mencetak puluhan/ratusan kartu akrilik fisik siap pakai dengan QR code dan chip NFC unik CSPRNG. Kartu disimpan di inventaris stok. Saat ada pesanan dari klien, Anda tinggal mengklik &quot;Hubungkan &amp; Aktifkan&quot; dan memasukkan link Google Review mereka.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jumlah Kartu Stok yang Ingin Diterbitkan (1 - 200) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Rekomendasi cetak batch: 25, 50, atau 100 kartu sekaligus untuk efisiensi produksi UV Printing &amp; NFC encoding.
                </p>
              </div>

              <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kriptografi Aman &amp; Anti Duplikasi Token</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Setiap kartu fisik mendapatkan 32-byte CSPRNG token unik. Sebelum kartu dihubungkan ke bisnis, pembukaan URL redirect akan menampilkan status ramah yang menyatakan kartu belum diaktifkan.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={stockLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-amber-500/20"
                >
                  {stockLoading ? 'Menerbitkan Token...' : `Terbitkan ${stockQuantity} Kartu Stok`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hubungkan & Aktifkan Kartu Stok (Model B Assignment) */}
      {cardToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-amber-400" />
                  <span>Hubungkan &amp; Aktifkan Kartu Stok</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Kode: <strong className="text-cyan-300">{cardToAssign.card_code}</strong> • Batch: {cardToAssign.batch_id}
                </p>
              </div>
              <button
                onClick={() => setCardToAssign(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {assignSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{assignSuccess}</span>
              </div>
            )}

            {assignError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignAndActivate} className="space-y-4 mt-4">
              {/* Option Selector: New Business vs Existing Business */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setAssignMode('new')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    assignMode === 'new'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  + Input Bisnis Baru &amp; Google Review
                </button>
                <button
                  type="button"
                  onClick={() => setAssignMode('existing')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    assignMode === 'existing'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pilih Bisnis yang Ada
                </button>
              </div>

              {assignMode === 'new' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Bisnis Klien <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kopi Kenangan Mall Kelapa Gading"
                      value={assignNewBizName}
                      onChange={(e) => setAssignNewBizName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      URL Google Maps Toko / Klien <span className="text-rose-400">*</span>
                    </label>
                    <div className="space-y-2">
                      <input
                        type="url"
                        required
                        placeholder="https://maps.app.goo.gl/... atau https://www.google.com/maps/place/..."
                        value={assignMapsUrl}
                        onChange={(e) => {
                          setAssignMapsUrl(e.target.value);
                          setAssignResolvedPreview(null);
                        }}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Gunakan link share atau URL Google Maps tempat bisnis klien.</span>
                        {assignMapsUrl.trim() && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setCheckingAssignUrl(true);
                                setAssignError(null);
                                const res = await api.resolveGoogleReviewLink(assignMapsUrl);
                                setAssignResolvedPreview(res);
                              } catch (err: any) {
                                setAssignError(err.message);
                              } finally {
                                setCheckingAssignUrl(false);
                              }
                            }}
                            disabled={checkingAssignUrl}
                            className="text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0 ml-2"
                          >
                            {checkingAssignUrl ? 'Memeriksa...' : 'Cek Review Link'}
                          </button>
                        )}
                      </div>

                      {assignResolvedPreview && (
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 font-mono break-all space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-sans font-semibold text-xs">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Link Ulasan Berhasil Dikonversi:</span>
                          </div>
                          <div className="text-slate-300 text-[10px] select-all">
                            {assignResolvedPreview.review_url}
                          </div>
                          {assignResolvedPreview.place_id && (
                            <div className="text-slate-400 text-[10px]">
                              Place ID: <span className="text-emerald-400">{assignResolvedPreview.place_id}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Sistem otomatis mengonversi URL Google Maps menjadi URL ulasan resmi via Productmate sehingga saat kartu di-tap, pelanggan langsung diarahkan ke form rating bintang 5.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pilih Bisnis Terdaftar <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={assignExistingBizId}
                    onChange={(e) => setAssignExistingBizId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Pilih Bisnis --</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-cyan-950/40 border border-cyan-800/50 rounded-xl text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Aktivasi Instan (Instant Activation)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Begitu disimpan, kartu fisik yang sudah ada di tangan Anda atau dikirim ke klien akan langsung aktif. Tap NFC atau scan QR akan langsung membawa pelanggan ke review Google tanpa perlu mencetak ulang kartu!
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCardToAssign(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-amber-500/20"
                >
                  {assignLoading ? 'Menghubungkan...' : 'Hubungkan & Aktifkan Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Card Detail & Interactive Preview */}
      {activeCardDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{activeCardDetail.card.card_code}</span>
                    {getStatusBadge(activeCardDetail.card.status)}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Batch: {activeCardDetail.card.batch_id} • ID: {activeCardDetail.card.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveCardDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              {/* Left Column: Realistic Physical Acrylic Preview */}
              <div className="flex flex-col items-center justify-center bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                  Visualisasi Fisik Kartu Akrilik (100×100 mm)
                </h4>
                <PhysicalCardMockup
                  businessName={activeCardDetail.card.business_name || 'Bisnis'}
                  cardCode={activeCardDetail.card.card_code}
                  token={activeCardDetail.card.token}
                  qrCodeUrl={activeCardDetail.card.qr_code_url}
                  redirectUrl={api.getRedirectUrl(activeCardDetail.card.token)}
                  batchId={activeCardDetail.card.batch_id}
                  onDownloadRawQR={() => handleDownloadQR(activeCardDetail.card)}
                  isDownloadingRawQR={downloadingQR}
                />
                <div className="mt-3 flex items-center justify-center">
                  <a
                    href={api.getRedirectUrl(activeCardDetail.card.token)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Uji Buka URL Redirect di Tab Baru</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Information & Production Events History */}
              <div className="space-y-6">
                {/* Model B Assignment Banner if Unassigned */}
                {!activeCardDetail.card.business_id && activeCardDetail.card.status !== 'REVOKED' && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <Package className="w-4 h-4 shrink-0" />
                      <span>Kartu Stok Gudang (Model B)</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Kartu fisik ini sudah dicetak dengan Unique Token &amp; QR Code, namun belum dihubungkan ke bisnis. Hubungkan sekarang untuk mengaktifkan redirect ke Google Review.
                    </p>
                    <button
                      onClick={() => {
                        const c = activeCardDetail.card;
                        setActiveCardDetail(null);
                        openAssignModal(c);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Hubungkan ke Bisnis &amp; Aktifkan</span>
                    </button>
                  </div>
                )}

                {/* Revoked Status Banner */}
                {activeCardDetail.card.status === 'REVOKED' && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                      <AlertOctagon className="w-4 h-4 shrink-0" />
                      <span>Status Kartu: DICABUT (REVOKED - HTTP 410)</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Kartu ini dicabut pada {activeCardDetail.card.revoked_at ? new Date(activeCardDetail.card.revoked_at).toLocaleString('id-ID') : '-'}. Jika terjadi ketidaksengajaan klik Revoke, Anda dapat memulihkan kartu ini kembali agar chip NFC &amp; QR Code fisik tetap dapat digunakan oleh pelanggan tanpa harus mencetak kartu baru.
                    </p>
                    <button
                      onClick={() => handleRestore(activeCardDetail.card)}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Pulihkan Kartu Sekarang (Restore)</span>
                    </button>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Informasi Tautan & Token
                  </h4>
                  <div className="space-y-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500">Public Redirect URL:</span>
                      <div className="font-mono text-cyan-300 break-all select-all mt-0.5">
                        {api.getRedirectUrl(activeCardDetail.card.token)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Target Google Review:</span>
                        {activeCardDetail.card.business_id && (
                          <button
                            type="button"
                            onClick={() => openEditFromCard(activeCardDetail.card)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer bg-cyan-950/50 hover:bg-cyan-900/50 px-2 py-0.5 rounded border border-cyan-800/50"
                            title="Edit URL jika toko berpindah lokasi atau ganti nama"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Link Toko</span>
                          </button>
                        )}
                      </div>
                      <div className="text-slate-300 break-all mt-0.5">
                        {activeCardDetail.card.google_review_url || '-'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-500">Total Tap / Scan:</span>
                        <span className="text-white font-bold ml-1.5">{activeCardDetail.card.tap_count}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Dibuat:</span>
                        <span className="text-slate-300 ml-1.5">
                          {new Date(activeCardDetail.card.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Production Event History */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Riwayat Produksi & QC ({activeCardDetail.events?.length || 0} Peristiwa)
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {!activeCardDetail.events || activeCardDetail.events.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Belum ada riwayat peristiwa produksi yang dicatat.</p>
                    ) : (
                      activeCardDetail.events.map((ev) => (
                        <div key={ev.id} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-cyan-400 font-semibold">{ev.event_type}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(ev.created_at).toLocaleTimeString('id-ID')}
                            </span>
                          </div>
                          {ev.notes && <p className="text-slate-300 text-[11px] mt-1">{ev.notes}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  {activeCardDetail.card.status === 'QC_PASSED' && activeCardDetail.card.business_id && (
                    <button
                      onClick={() => handleActivate(activeCardDetail.card)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Aktifkan Kartu Sekarang
                    </button>
                  )}
                  {activeCardDetail.card.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleDeactivate(activeCardDetail.card)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs transition-colors cursor-pointer"
                    >
                      Nonaktifkan Kartu
                    </button>
                  )}
                  {activeCardDetail.card.status === 'INACTIVE' && activeCardDetail.card.business_id && (
                    <button
                      onClick={() => handleActivate(activeCardDetail.card)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Aktifkan Kembali
                    </button>
                  )}
                  {activeCardDetail.card.status === 'REVOKED' && (
                    <button
                      onClick={() => handleRestore(activeCardDetail.card)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Pulihkan Kartu (Restore)</span>
                    </button>
                  )}
                  {activeCardDetail.card.status !== 'REVOKED' && (
                    <button
                      onClick={() => handleRevoke(activeCardDetail.card)}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition-colors cursor-pointer ml-auto"
                    >
                      Cabut Permanen (Revoke 410)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Bisnis & URL Langsung dari Kartu */}
      {editingCardBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <span>Edit Link Google Review / Maps Toko</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCardBusiness(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editCardBizError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editCardBizError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateFromCard} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Bisnis / Toko
                </label>
                <input
                  type="text"
                  required
                  value={editCardBizName}
                  onChange={(e) => setEditCardBizName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Contoh: Kopi Kenangan Mall Kelapa Gading"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL Google Maps Toko <span className="text-rose-400">*</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    required
                    value={editCardBizMapsUrl}
                    onChange={(e) => {
                      setEditCardBizMapsUrl(e.target.value);
                      setEditCardBizResolvedPreview(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                    placeholder="https://maps.app.goo.gl/... atau https://www.google.com/maps/place/..."
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Masukkan URL Google Maps baru jika ingin mengubah target ulasan.</span>
                    {editCardBizMapsUrl.trim() && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setCheckingEditCardBizUrl(true);
                            setEditCardBizError(null);
                            const res = await api.resolveGoogleReviewLink(editCardBizMapsUrl);
                            setEditCardBizResolvedPreview(res);
                          } catch (err: any) {
                            setEditCardBizError(err.message);
                          } finally {
                            setCheckingEditCardBizUrl(false);
                          }
                        }}
                        disabled={checkingEditCardBizUrl}
                        className="text-cyan-400 hover:text-cyan-300 font-medium underline flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0 ml-2"
                      >
                        {checkingEditCardBizUrl ? 'Memeriksa...' : 'Cek Review Link'}
                      </button>
                    )}
                  </div>

                  {editCardBizResolvedPreview && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 font-mono break-all space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-sans font-semibold text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Link Ulasan Aktif / Dikonversi:</span>
                      </div>
                      <div className="text-slate-300 text-[10px] select-all">
                        {editCardBizResolvedPreview.review_url}
                      </div>
                      {editCardBizResolvedPreview.place_id && (
                        <div className="text-slate-400 text-[10px]">
                          Place ID: <span className="text-emerald-400">{editCardBizResolvedPreview.place_id}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Sistem otomatis mengonversi URL Google Maps ke link direct ulasan pop-up via Productmate tanpa perlu cetak ulang kartu fisik.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-xs text-slate-300">
                <div className="flex items-center gap-2 font-medium text-cyan-300 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Redirect Otomatis &amp; Real-time</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Jika toko berpindah lokasi atau ganti nama, ubah link di sini. Semua kartu fisik &amp; QR code yang sudah beredar di lapangan akan langsung mengarah ke lokasi baru secara instan tanpa perlu cetak kartu baru!
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCardBusiness(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editCardBizLoading}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editCardBizLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
