'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  ExternalLink, 
  CheckCircle, 
  Edit3, 
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  MapPin,
  X
} from 'lucide-react';
import { api } from '@/lib/api';
import { Business } from '@/types';

interface BusinessesViewProps {
  onIssueCardsForBusiness: (business: Business) => void;
  isCreateOpenInitially?: boolean;
  onCloseCreateInitially?: () => void;
}

export const BusinessesView: React.FC<BusinessesViewProps> = ({
  onIssueCardsForBusiness,
  isCreateOpenInitially = false,
  onCloseCreateInitially,
}) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(isCreateOpenInitially);
  const [createName, setCreateName] = useState('');
  const [createMapsUrl, setCreateMapsUrl] = useState('');
  const [createResolvedPreview, setCreateResolvedPreview] = useState<{ review_url: string; place_id?: string } | null>(null);
  const [checkingCreateUrl, setCheckingCreateUrl] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editBusiness, setEditBusiness] = useState<Business | null>(null);
  const [editName, setEditName] = useState('');
  const [editMapsUrl, setEditMapsUrl] = useState('');
  const [editResolvedPreview, setEditResolvedPreview] = useState<{ review_url: string; place_id?: string } | null>(null);
  const [checkingEditUrl, setCheckingEditUrl] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setIsCreateOpen(isCreateOpenInitially);
  }, [isCreateOpenInitially]);

  useEffect(() => {
    loadBusinesses();
  }, [search, statusFilter]);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const res = await api.getBusinesses({ search, status: statusFilter, limit: 100 });
      setBusinesses(res.businesses);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const extractPlaceId = (u: string): string => {
    const match = u.match(/[?&]placeid=([^&#]+)/);
    return match ? match[1] : '';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      if (!createName.trim()) {
        throw new Error('Nama bisnis wajib diisi');
      }
      if (!createMapsUrl.trim()) {
        throw new Error('URL Google Maps wajib diisi');
      }

      // Convert Google Maps URL to review_url via Productmate endpoint
      const res = await api.resolveGoogleReviewLink(createMapsUrl.trim());
      const finalUrl = res.review_url;

      await api.createBusiness(createName.trim(), finalUrl);
      setCreateName('');
      setCreateMapsUrl('');
      setCreateResolvedPreview(null);
      setIsCreateOpen(false);
      if (onCloseCreateInitially) onCloseCreateInitially();
      loadBusinesses();
    } catch (err: any) {
      setCreateError(err.message || 'Gagal mendaftarkan bisnis');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleVerify = async (b: Business) => {
    if (!confirm(`Konfirmasi verifikasi bahwa URL review benar-benar milik "${b.name}"?`)) return;
    try {
      await api.verifyBusinessURL(b.id);
      loadBusinesses();
    } catch (err: any) {
      alert(`Gagal memverifikasi URL: ${err.message}`);
    }
  };

  const openEdit = (b: Business) => {
    setEditBusiness(b);
    setEditName(b.name);
    setEditMapsUrl(b.google_review_url);
    setEditResolvedPreview({
      review_url: b.google_review_url,
      place_id: extractPlaceId(b.google_review_url),
    });
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBusiness) return;

    setEditError(null);
    setEditLoading(true);

    try {
      if (!editName.trim()) {
        throw new Error('Nama bisnis wajib diisi');
      }
      if (!editMapsUrl.trim()) {
        throw new Error('URL Google Maps wajib diisi');
      }

      let finalUrl = editMapsUrl.trim();
      // If URL changed and is not already direct writereview, resolve it
      if (finalUrl !== editBusiness.google_review_url) {
        const res = await api.resolveGoogleReviewLink(finalUrl);
        finalUrl = res.review_url;
      }

      await api.updateBusiness(editBusiness.id, {
        name: editName.trim(),
        google_review_url: finalUrl,
      });
      setEditBusiness(null);
      loadBusinesses();
    } catch (err: any) {
      setEditError(err.message || 'Gagal mengubah data bisnis');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Kelola Bisnis & Target Google Review ({total})</h2>
          <p className="text-xs text-slate-400 mt-1">
            Daftarkan bisnis klien, validasi tautan ulasan Google, dan pantau kartu yang terhubung.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreateOpen(true);
            setCreateError(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Bisnis Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama bisnis atau URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">ACTIVE (Aktif)</option>
          <option value="PENDING">PENDING (Menunggu Verifikasi)</option>
          <option value="INACTIVE">INACTIVE (Nonaktif)</option>
        </select>
        <button
          onClick={loadBusinesses}
          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors cursor-pointer"
          title="Segarkan data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Businesses Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama Bisnis</th>
                <th className="py-3 px-4">Target Google Review URL</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Kartu Terhubung</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && businesses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Memuat data bisnis...
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Tidak ada data bisnis ditemukan. Silakan tambahkan bisnis baru.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{b.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {b.id.substring(0, 8)}...</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <a
                        href={b.google_review_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-400 hover:underline truncate"
                        title={b.google_review_url}
                      >
                        <span className="truncate">{b.google_review_url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      {b.verified_at && (
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                          <CheckCircle className="w-3 h-3" />
                          <span>Terverifikasi Admin</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {b.status === 'ACTIVE' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                          ACTIVE
                        </span>
                      )}
                      {b.status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                          PENDING VERIFIKASI
                        </span>
                      )}
                      {b.status === 'INACTIVE' && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30 text-[10px] font-semibold">
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-white">{b.total_cards || 0}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({b.active_cards || 0} aktif)</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === 'PENDING' && (
                          <button
                            onClick={() => handleVerify(b)}
                            className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Verifikasi Google Review URL"
                          >
                            Verifikasi URL
                          </button>
                        )}
                        <button
                          onClick={() => onIssueCardsForBusiness(b)}
                          className="px-2 py-1 rounded bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                          title="Terbitkan Kartu untuk Bisnis Ini"
                        >
                          + Kartu
                        </button>
                        <button
                          onClick={() => openEdit(b)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Bisnis & URL"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Bisnis Baru */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>Registrasi Bisnis Baru</span>
              </h3>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  if (onCloseCreateInitially) onCloseCreateInitially();
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Bisnis / Merchant <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Contoh: Kopi Kenangan Senopati"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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
                    value={createMapsUrl}
                    onChange={(e) => {
                      setCreateMapsUrl(e.target.value);
                      setCreateResolvedPreview(null);
                    }}
                    placeholder="https://maps.app.goo.gl/... atau https://www.google.com/maps/place/..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Gunakan URL Google Maps (misal dari tombol Share/Bagikan di Google Maps).</span>
                    {createMapsUrl.trim() && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setCheckingCreateUrl(true);
                            setCreateError(null);
                            const res = await api.resolveGoogleReviewLink(createMapsUrl);
                            setCreateResolvedPreview(res);
                          } catch (err: any) {
                            setCreateError(err.message);
                          } finally {
                            setCheckingCreateUrl(false);
                          }
                        }}
                        disabled={checkingCreateUrl}
                        className="text-cyan-400 hover:text-cyan-300 font-medium underline flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0 ml-2"
                      >
                        {checkingCreateUrl ? 'Memeriksa...' : 'Cek Review Link'}
                      </button>
                    )}
                  </div>

                  {createResolvedPreview && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 font-mono break-all space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-sans font-semibold text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Link Ulasan Berhasil Dikonversi:</span>
                      </div>
                      <div className="text-slate-300 text-[10px] select-all">
                        {createResolvedPreview.review_url}
                      </div>
                      {createResolvedPreview.place_id && (
                        <div className="text-slate-400 text-[10px]">
                          Place ID: <span className="text-emerald-400">{createResolvedPreview.place_id}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Sistem otomatis mengonversi URL Google Maps menjadi URL review bintang 5 langsung via endpoint Productmate agar pelanggan diarahkan langsung ke form ulasan.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs text-slate-300">
                <div className="flex items-center gap-2 font-medium text-amber-300 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Status Awal: PENDING</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Sesuai PRD, bisnis baru dibuat dengan status PENDING. Kartu baru dapat diaktifkan setelah URL diverifikasi oleh admin.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    if (onCloseCreateInitially) onCloseCreateInitially();
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? 'Menyimpan...' : 'Simpan Bisnis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Bisnis & Update URL */}
      {editBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <span>Edit Bisnis & URL Google Review</span>
              </h3>
              <button onClick={() => setEditBusiness(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Bisnis</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
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
                    value={editMapsUrl}
                    onChange={(e) => {
                      setEditMapsUrl(e.target.value);
                      setEditResolvedPreview(null);
                    }}
                    placeholder="https://maps.app.goo.gl/... atau https://www.google.com/maps/place/..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Masukkan URL Google Maps baru jika ingin mengubah target ulasan.</span>
                    {editMapsUrl.trim() && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setCheckingEditUrl(true);
                            setEditError(null);
                            const res = await api.resolveGoogleReviewLink(editMapsUrl);
                            setEditResolvedPreview(res);
                          } catch (err: any) {
                            setEditError(err.message);
                          } finally {
                            setCheckingEditUrl(false);
                          }
                        }}
                        disabled={checkingEditUrl}
                        className="text-cyan-400 hover:text-cyan-300 font-medium underline flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0 ml-2"
                      >
                        {checkingEditUrl ? 'Memeriksa...' : 'Cek Review Link'}
                      </button>
                    )}
                  </div>

                  {editResolvedPreview && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 font-mono break-all space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-sans font-semibold text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Link Ulasan Aktif / Dikonversi:</span>
                      </div>
                      <div className="text-slate-300 text-[10px] select-all">
                        {editResolvedPreview.review_url}
                      </div>
                      {editResolvedPreview.place_id && (
                        <div className="text-slate-400 text-[10px]">
                          Place ID: <span className="text-emerald-400">{editResolvedPreview.place_id}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Sistem otomatis memperbarui URL target ulasan langsung via Productmate tanpa perlu cetak ulang kartu fisik.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-xs text-slate-300">
                <div className="flex items-center gap-2 font-medium text-cyan-300 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Keunggulan Sistem Redirect Dinamis</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ketika URL diubah, semua {editBusiness.total_cards || 0} kartu yang sudah dicetak akan otomatis mengarah ke URL baru ini tanpa perlu mencetak ulang kartu akrilik! Perubahan dicatat di Audit Log.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditBusiness(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? 'Menyimpan...' : 'Perbarui URL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
