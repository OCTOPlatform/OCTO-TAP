'use client';

import React, { useState } from 'react';
import { Wifi, Star, RefreshCw, Layers, Printer, FileCheck, Download } from 'lucide-react';
import { exportCardArtworkPNG, exportProductionLabelPNG } from '@/lib/cardExport';

export type CardDesignTheme = 'octo_navy' | 'octo_frosted' | 'google_white' | 'luxury_gold';

interface PhysicalCardMockupProps {
  businessName: string;
  cardCode: string;
  token?: string;
  qrCodeUrl?: string;
  redirectUrl: string;
  batchId?: string;
  onDownloadRawQR?: () => void;
  isDownloadingRawQR?: boolean;
}

export const PhysicalCardMockup: React.FC<PhysicalCardMockupProps> = ({
  businessName,
  cardCode,
  token = '',
  qrCodeUrl,
  redirectUrl,
  batchId,
  onDownloadRawQR,
  isDownloadingRawQR = false,
}) => {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [theme, setTheme] = useState<CardDesignTheme>('octo_navy');
  const [exportingArtwork, setExportingArtwork] = useState(false);
  const [exportingLabel, setExportingLabel] = useState(false);

  const handleExportArtwork = async () => {
    try {
      setExportingArtwork(true);
      await exportCardArtworkPNG({
        businessName,
        cardCode,
        token,
        qrCodeUrl,
        redirectUrl,
        theme,
        side,
      });
    } catch (err: any) {
      alert(`Gagal mengekspor kartu: ${err.message}`);
    } finally {
      setExportingArtwork(false);
    }
  };

  const handleExportLabel = async () => {
    try {
      setExportingLabel(true);
      await exportProductionLabelPNG({
        businessName,
        cardCode,
        batchId,
        token,
        qrCodeUrl,
        redirectUrl,
      });
    } catch (err: any) {
      alert(`Gagal mengekspor lembar kontrol: ${err.message}`);
    } finally {
      setExportingLabel(false);
    }
  };

  // Theme-specific styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'octo_frosted':
        return {
          container: 'bg-slate-900/40 backdrop-blur-xl border border-white/30 text-white shadow-2xl',
          shadow: '0 20px 45px -12px rgba(255, 255, 255, 0.12), inset 0 1px 2px 0 rgba(255, 255, 255, 0.4)',
          headerBorder: 'border-white/20',
          titleColor: 'text-white',
          subtitleColor: 'text-slate-300',
          badge: 'bg-white/10 text-cyan-300 border-white/20',
          qrBorder: 'border-white/30 bg-white/95',
          footerText: 'text-slate-300',
          codeText: 'text-cyan-300',
          backTargetBg: 'bg-white/5 border-cyan-400/50',
          backTargetText: 'text-cyan-300',
          accentColor: 'text-cyan-400',
        };
      case 'google_white':
        return {
          container: 'bg-gradient-to-b from-white via-slate-50 to-slate-100 border border-slate-300 text-slate-800 shadow-xl',
          shadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15), inset 0 0 15px rgba(255, 255, 255, 0.9)',
          headerBorder: 'border-slate-200',
          titleColor: 'text-slate-900 font-bold',
          subtitleColor: 'text-slate-600',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          qrBorder: 'border-slate-300 bg-white shadow-md',
          footerText: 'text-slate-500',
          codeText: 'text-blue-600 font-bold',
          backTargetBg: 'bg-slate-100 border-blue-500/50 text-slate-700',
          backTargetText: 'text-blue-700 font-bold',
          accentColor: 'text-blue-600',
        };
      case 'luxury_gold':
        return {
          container: 'bg-gradient-to-br from-[#0c0c0e] via-[#141418] to-[#070709] border border-amber-500/40 text-amber-100 shadow-2xl',
          shadow: '0 20px 50px -15px rgba(245, 158, 11, 0.25), inset 0 0 15px rgba(245, 158, 11, 0.08)',
          headerBorder: 'border-amber-500/30',
          titleColor: 'text-amber-200 font-semibold',
          subtitleColor: 'text-amber-200/70',
          badge: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
          qrBorder: 'border-amber-500/40 bg-white',
          footerText: 'text-amber-300/60',
          codeText: 'text-amber-300 font-mono',
          backTargetBg: 'bg-amber-950/30 border-amber-400/50',
          backTargetText: 'text-amber-300',
          accentColor: 'text-amber-400',
        };
      case 'octo_navy':
      default:
        return {
          container: 'bg-gradient-to-br from-[#0B132B] via-[#0F172A] to-[#050C1A] border border-cyan-500/40 text-white shadow-2xl',
          shadow: '0 20px 45px -15px rgba(6, 182, 212, 0.3), inset 0 0 20px rgba(6, 182, 212, 0.08)',
          headerBorder: 'border-cyan-500/20',
          titleColor: 'text-white',
          subtitleColor: 'text-slate-300',
          badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/50',
          qrBorder: 'border-cyan-500/40 bg-white',
          footerText: 'text-slate-400',
          codeText: 'text-cyan-400 font-mono',
          backTargetBg: 'bg-cyan-950/40 border-cyan-400/60',
          backTargetText: 'text-cyan-300',
          accentColor: 'text-cyan-400',
        };
    }
  };

  const currentStyles = getThemeStyles();

  return (
    <div className="flex flex-col items-center w-full max-w-sm">
      {/* Theme Switcher Tabs (2x2 Grid: Clean, Balanced, No Overflow) */}
      <div className="w-full grid grid-cols-2 gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl mb-3 text-[11px]">
        <button
          type="button"
          onClick={() => setTheme('octo_navy')}
          className={`py-1.5 px-2.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            theme === 'octo_navy'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white bg-slate-950/40 hover:bg-slate-800/60'
          }`}
          title="Tema Utama Brand OCTO (Navy & Cyan)"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 shadow-sm" />
          <span className="truncate">OCTO Signature</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('octo_frosted')}
          className={`py-1.5 px-2.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            theme === 'octo_frosted'
              ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/20'
              : 'text-slate-400 hover:text-white bg-slate-950/40 hover:bg-slate-800/60'
          }`}
          title="Akrilik Bening Glassmorphism"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0 shadow-sm" />
          <span className="truncate">Frosted Glass</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('google_white')}
          className={`py-1.5 px-2.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            theme === 'google_white'
              ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white bg-slate-950/40 hover:bg-slate-800/60'
          }`}
          title="Google Review Clean White"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-sm" />
          <span className="truncate">Google White</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('luxury_gold')}
          className={`py-1.5 px-2.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            theme === 'luxury_gold'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white bg-slate-950/40 hover:bg-slate-800/60'
          }`}
          title="Tema Hitam Mewah & Emas"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300 shrink-0 shadow-sm" />
          <span className="truncate">Black & Gold</span>
        </button>
      </div>

      {/* Acrylic Physical Card Shell */}
      <div
        className={`relative w-72 h-72 sm:w-80 sm:h-80 rounded-2xl p-4 transition-all duration-500 cursor-pointer select-none group overflow-hidden ${currentStyles.container}`}
        style={{
          boxShadow: currentStyles.shadow,
        }}
        onClick={() => setSide(side === 'front' ? 'back' : 'front')}
      >
        {/* Glossy Acrylic Surface Light Reflection (Simulating real 3mm clear acrylic) */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-cyan-500/5 to-white/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        {/* Multi-Color Google Top Accent Bar for Google White theme */}
        {theme === 'google_white' && (
          <div className="absolute top-0 left-6 right-6 h-1 flex rounded-b overflow-hidden">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>
        )}

        {side === 'front' ? (
          /* FRONT SIDE */
          <div className="h-full flex flex-col justify-between items-center text-center p-2 relative z-10">
            {/* Header: Master Brand Logo & NFC Badge */}
            <div className={`w-full flex items-center justify-between border-b ${currentStyles.headerBorder} pb-2`}>
              <div className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Logo-OCTO-TAP.png" alt="OCTO Tap Logo" className="w-6 h-6 object-contain" />
                <div className="text-left">
                  <span className={`text-[11px] font-black tracking-wider uppercase block leading-tight ${theme === 'google_white' ? 'text-slate-900' : 'text-slate-100'}`}>
                    OCTO TAP
                  </span>
                  <span className="text-[8px] text-cyan-400 block tracking-tight font-medium">SMART CONNECTED</span>
                </div>
              </div>

              <div className={`flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border ${currentStyles.badge}`}>
                <Wifi className="w-3 h-3 rotate-90" />
                <span>NFC TAP READY</span>
              </div>
            </div>

            {/* Business & Google Review Call-to-Action */}
            <div className="my-0.5">
              <h4 className={`text-sm font-bold tracking-wide truncate max-w-[240px] ${currentStyles.titleColor}`}>
                {businessName || 'Nama Toko / Bisnis'}
              </h4>
              <div className="flex items-center justify-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400 drop-shadow-sm" />
                ))}
              </div>
              <p className={`text-[10px] mt-0.5 font-medium ${currentStyles.subtitleColor}`}>
                Tap NFC atau Scan QR untuk Review Google
              </p>
            </div>

            {/* Centerpiece: QR Code */}
            <div className={`relative p-2 rounded-xl shadow-inner border-2 ${currentStyles.qrBorder}`}>
              {qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center bg-slate-100 text-slate-500 rounded text-xs p-2 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-600 mb-1" />
                  <span className="text-[10px]">Memuat QR...</span>
                </div>
              )}
            </div>

            {/* Bottom Footer: Serial Code & Powered by OCTO */}
            <div className={`w-full flex items-center justify-between text-[9px] pt-1 border-t ${currentStyles.headerBorder}`}>
              <span className={currentStyles.codeText}>{cardCode}</span>
              <span className={`${currentStyles.footerText} group-hover:text-cyan-400 transition-colors`}>
                🔄 Klik untuk balik kartu
              </span>
            </div>
          </div>
        ) : (
          /* BACK SIDE */
          <div className="h-full flex flex-col justify-between items-center text-center p-3 relative z-10">
            <div className={`w-full flex items-center justify-between border-b ${currentStyles.headerBorder} pb-2`}>
              <div className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Logo-OCTO-TAP.png" alt="OCTO Tap" className="w-4 h-4 object-contain opacity-80" />
                <span className="text-[10px] font-mono tracking-wider text-slate-300 font-semibold">NFC TOUCHPOINT</span>
              </div>
              <span className="text-[9px] text-slate-400 font-medium">SMART REVIEW CARD</span>
            </div>

            {/* NFC Chip Target Area with Radar Rings */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="absolute w-36 h-36 rounded-full border border-cyan-500/20 animate-ping opacity-30 pointer-events-none" />
              <div className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-full w-32 h-32 ${currentStyles.backTargetBg}`}>
                <Wifi className={`w-9 h-9 rotate-90 ${currentStyles.accentColor} animate-pulse`} />
                <span className={`text-[10px] font-bold mt-1 ${currentStyles.backTargetText}`}>AREA TEMPEL NFC</span>
                <span className="text-[8px] opacity-75 font-mono">NTAG213 • 13.56 MHz</span>
              </div>
            </div>

            {/* Single Source of Truth Redirect Link */}
            <div className={`w-full text-[9px] p-2 rounded border ${theme === 'google_white' ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-900/80 border-slate-800 text-slate-300'}`}>
              <div className={`truncate font-mono font-semibold ${theme === 'google_white' ? 'text-blue-600' : 'text-cyan-400'}`}>
                {redirectUrl}
              </div>
              <div className="text-[8px] opacity-70 mt-0.5">URL tunggal terintegrasi untuk chip NFC &amp; QR Code</div>
            </div>

            <span className={`text-[9px] ${currentStyles.footerText}`}>
              🔄 Klik untuk kembali ke tampak depan
            </span>
          </div>
        )}
      </div>

      {/* Info indicator */}
      <div className="mt-3 flex items-center justify-between w-full text-[11px] text-slate-400 px-1">
        <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 font-mono text-[10px] flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>{side === 'front' ? 'Tampak Depan (UV Print)' : 'Tampak Belakang (Posisi Chip NTAG213)'}</span>
        </span>
        <span className="text-[10px] text-slate-500">
          Standar Fisik 10×10 cm
        </span>
      </div>

      {/* Action Bar: Download Berkas Siap Cetak (Anti-Tertukar) */}
      <div className="w-full mt-4 pt-3 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] px-0.5">
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <Printer className="w-3.5 h-3.5" />
            <span>Unduh Berkas Cetak (Anti-Tertukar)</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">300 DPI High-Res</span>
        </div>

        {/* 1. Full Card Artwork (Based on active theme and side) */}
        <button
          type="button"
          onClick={handleExportArtwork}
          disabled={exportingArtwork}
          className="w-full py-2 px-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          title="Unduh seluruh kartu fisik akrilik lengkap dengan logo, nama bisnis, bintang Google, dan KODE KARTU"
        >
          <Printer className={`w-3.5 h-3.5 ${exportingArtwork ? 'animate-spin' : ''}`} />
          <span>
            {exportingArtwork
              ? 'Merender Artwork...'
              : `Unduh Desain Kartu ${side === 'front' ? 'Tampak Depan' : 'Tampak Belakang'} (PNG)`}
          </span>
        </button>

        {/* 2. Secondary Row: QC Production Sheet & Plain QR */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportLabel}
            disabled={exportingLabel}
            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Lembar kontrol QR + Kode Kartu + Info Bisnis untuk operator percetakan & programming chip NFC"
          >
            <FileCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{exportingLabel ? 'Memproses...' : 'Lembar QC Cetak'}</span>
          </button>

          {onDownloadRawQR ? (
            <button
              type="button"
              onClick={onDownloadRawQR}
              disabled={isDownloadingRawQR}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Unduh QR Code kotak hitam-putih saja tanpa background atau label teks"
            >
              <Download className={`w-3.5 h-3.5 text-slate-400 shrink-0 ${isDownloadingRawQR ? 'animate-bounce' : ''}`} />
              <span className="truncate">{isDownloadingRawQR ? 'Mengunduh...' : 'QR Polos Saja'}</span>
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
};
