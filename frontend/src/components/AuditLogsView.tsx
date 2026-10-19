'use client';

import React, { useState, useEffect } from 'react';
import { 
  History, 
  RefreshCw, 
  ShieldCheck, 
  Eye, 
  X 
} from 'lucide-react';
import { api } from '@/lib/api';
import { AuditLog } from '@/types';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  // Selected Log Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [entityType, actionFilter, adminEmail]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        entity_type: entityType || undefined,
        action: actionFilter || undefined,
        admin_email: adminEmail || undefined,
        limit: 100,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('CREATED') || action.includes('ISSUED')) {
      return <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold">{action}</span>;
    }
    if (action.includes('VERIFIED') || action.includes('ACTIVATED')) {
      return <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">{action}</span>;
    }
    if (action.includes('REVOKED')) {
      return <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[10px] font-semibold">{action}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            <span>Audit Trail & Log Keamanan Administratif</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Catatan kekal (immutable) seluruh perubahan entitas bisnis, pembaruan URL, penerbitan batch, dan transisi status kartu (PRD FR-09).
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl text-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Log ({total})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="">Semua Tipe Entitas</option>
          <option value="business">Bisnis (business)</option>
          <option value="card">Kartu (card)</option>
          <option value="batch">Batch Penerbitan (batch)</option>
        </select>

        <input
          type="text"
          placeholder="Filter aksi (misal: BUSINESS_UPDATED)..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />

        <input
          type="text"
          placeholder="Filter email admin..."
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Audit Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Admin Pelaksana</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Entitas Target</th>
                <th className="py-3 px-4 text-right">Detail Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Memuat riwayat audit log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Tidak ada catatan audit log yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-white font-medium">
                        {new Date(log.created_at).toLocaleTimeString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(log.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{log.admin_email}</div>
                      <div className="text-[10px] text-slate-500 font-mono">IP: {log.ip_address || 'localhost'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="text-slate-400 uppercase text-[10px] mr-1.5 font-sans">
                        [{log.entity_type}]
                      </span>
                      <span className="text-cyan-300 truncate inline-block max-w-[150px] align-bottom">
                        {log.entity_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-cyan-400" />
                        <span>Inspeksi</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: JSON Diff & Log Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Inspeksi Perubahan Data (Audit Log)</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500">Aksi:</span>
                  <div className="text-cyan-300 font-bold mt-0.5">{selectedLog.action}</div>
                </div>
                <div>
                  <span className="text-slate-500">Waktu Tercatat:</span>
                  <div className="text-slate-300 font-mono mt-0.5">
                    {new Date(selectedLog.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Admin Email:</span>
                  <div className="text-slate-300 mt-0.5">{selectedLog.admin_email}</div>
                </div>
                <div>
                  <span className="text-slate-500">Target Entitas:</span>
                  <div className="text-slate-300 font-mono mt-0.5">
                    {selectedLog.entity_type} ({selectedLog.entity_id})
                  </div>
                </div>
              </div>

              {/* Old vs New Values */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Nilai Sebelumnya (Old Values)
                  </span>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : '(Tidak ada nilai sebelumnya)'}
                  </pre>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-2">
                    Nilai Baru (New Values)
                  </span>
                  <pre className="text-[11px] font-mono text-cyan-200 bg-slate-900/80 p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : '(Tidak ada nilai baru)'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
