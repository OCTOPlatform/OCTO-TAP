/**
 * cardExport.ts
 * Utilitas untuk mengekspor desain kartu fisik akrilik utuh (Print Artwork)
 * dan Label Verifikasi Produksi (Production Sheet) beresolusi tinggi (300 DPI).
 * Mencegah kesalahan tertukar (mismatch) antara QR Code, kode fisik kartu, dan chip NFC.
 */

import JSZip from 'jszip';

export type CardDesignTheme = 'octo_navy' | 'octo_frosted' | 'google_white' | 'luxury_gold';

export interface ExportArtworkOptions {
  businessName: string;
  cardCode: string;
  token: string;
  qrCodeUrl?: string;
  redirectUrl: string;
  theme: CardDesignTheme;
  side: 'front' | 'back';
}

export interface ExportProductionLabelOptions {
  businessName: string;
  cardCode: string;
  batchId?: string;
  token: string;
  qrCodeUrl?: string;
  redirectUrl: string;
}

export interface BulkCardItem {
  id: string;
  cardCode: string;
  token: string;
  batchId?: string;
  businessName?: string;
  qrCodeUrl?: string;
  redirectUrl: string;
}

export interface BulkExportOptions {
  cards: BulkCardItem[];
  theme: 'octo_navy' | 'octo_frosted' | 'google_white' | 'luxury_gold';
  exportType: 'all' | 'artwork_only' | 'labels_only';
  onProgress?: (progress: { current: number; total: number; cardCode: string; percent: number; status: string }) => void;
}

// Helper: Memuat gambar secara asynchronous
const loadImage = (src: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

// Helper: Menggambar bintang bersudut 5
const drawStar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  fillColor: string
) => {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
};

/**
 * 1. Generate Canvas Desain Kartu Utuh (Print Artwork) - Skala 100x100mm @ 300 DPI (1200x1200px)
 */
export async function generateCardArtworkCanvas(options: ExportArtworkOptions): Promise<HTMLCanvasElement> {
  const { businessName, cardCode, qrCodeUrl, redirectUrl, theme, side } = options;

  const width = 1200;
  const height = 1200;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Gagal menginisialisasi Canvas 2D Context');

  // Load logo & QR image concurrently
  const [logoImg, qrImg] = await Promise.all([
    loadImage('/Logo-OCTO-TAP.png'),
    qrCodeUrl ? loadImage(qrCodeUrl) : null,
  ]);

  const cornerRadius = 60;
  const margin = 20;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;

  // Clip to rounded card shape
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(margin, margin, cardW, cardH, cornerRadius);
  ctx.clip();

  // Konfigurasi Warna Tema
  type ThemeConfig = {
    bgGradStart: string;
    bgGradEnd: string;
    borderColor: string;
    headerBorder: string;
    titleColor: string;
    subtitleColor: string;
    codeColor: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    qrBoxBorder: string;
    isLight: boolean;
  };

  const themes: Record<string, ThemeConfig> = {
    octo_navy: {
      bgGradStart: '#0B132B',
      bgGradEnd: '#050C1A',
      borderColor: '#06B6D4',
      headerBorder: 'rgba(6, 182, 212, 0.25)',
      titleColor: '#FFFFFF',
      subtitleColor: '#94A3B8',
      codeColor: '#22D3EE',
      badgeBg: 'rgba(8, 145, 178, 0.25)',
      badgeBorder: '#06B6D4',
      badgeText: '#67E8F9',
      qrBoxBorder: '#06B6D4',
      isLight: false,
    },
    octo_frosted: {
      bgGradStart: '#F8FAFC',
      bgGradEnd: '#E2E8F0',
      borderColor: '#94A3B8',
      headerBorder: 'rgba(148, 163, 184, 0.4)',
      titleColor: '#0F172A',
      subtitleColor: '#475569',
      codeColor: '#0284C7',
      badgeBg: 'rgba(15, 23, 42, 0.08)',
      badgeBorder: '#94A3B8',
      badgeText: '#0F172A',
      qrBoxBorder: '#94A3B8',
      isLight: true,
    },
    google_white: {
      bgGradStart: '#FFFFFF',
      bgGradEnd: '#F8FAFC',
      borderColor: '#CBD5E1',
      headerBorder: 'rgba(203, 213, 225, 0.6)',
      titleColor: '#1E293B',
      subtitleColor: '#64748B',
      codeColor: '#2563EB',
      badgeBg: '#EFF6FF',
      badgeBorder: '#3B82F6',
      badgeText: '#1D4ED8',
      qrBoxBorder: '#E2E8F0',
      isLight: true,
    },
    luxury_gold: {
      bgGradStart: '#141418',
      bgGradEnd: '#070709',
      borderColor: '#F59E0B',
      headerBorder: 'rgba(245, 158, 11, 0.3)',
      titleColor: '#FEF3C7',
      subtitleColor: '#FDE68A',
      codeColor: '#F59E0B',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeBorder: '#F59E0B',
      badgeText: '#FBBF24',
      qrBoxBorder: '#F59E0B',
      isLight: false,
    },
  };

  const cfg = themes[theme] || themes.octo_navy;

  // Background Gradient
  const bgGrad = ctx.createLinearGradient(margin, margin, width - margin, height - margin);
  bgGrad.addColorStop(0, cfg.bgGradStart);
  bgGrad.addColorStop(1, cfg.bgGradEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(margin, margin, cardW, cardH);

  // Google White Accent Bar di tepi atas
  if (theme === 'google_white') {
    const barH = 12;
    const barW = (cardW - 80) / 4;
    const startX = margin + 40;
    const barColors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
    barColors.forEach((color, idx) => {
      ctx.fillStyle = color;
      ctx.fillRect(startX + idx * barW, margin, barW, barH);
    });
  }

  // -------------------------
  // TAMPAK DEPAN
  // -------------------------
  if (side === 'front') {
    // 1. Header (Logo + Brand + Badge)
    const headerY = margin + 50;
    if (logoImg) {
      ctx.drawImage(logoImg, margin + 45, headerY, 68, 68);
    }
    ctx.textAlign = 'left';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.titleColor;
    ctx.fillText('OCTO TAP', margin + 125, headerY + 36);

    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#06B6D4';
    ctx.fillText('SMART CONNECTED', margin + 125, headerY + 58);

    // Badge NFC TAP READY di kanan
    const badgeW = 200;
    const badgeH = 46;
    const badgeX = width - margin - 45 - badgeW;
    const badgeY = headerY + 10;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 23);
    ctx.fillStyle = cfg.badgeBg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cfg.badgeBorder;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.badgeText;
    ctx.fillText('• NFC TAP READY •', badgeX + badgeW / 2, badgeY + 29);

    // Garis Header Divider
    ctx.beginPath();
    ctx.moveTo(margin + 45, headerY + 85);
    ctx.lineTo(width - margin - 45, headerY + 85);
    ctx.strokeStyle = cfg.headerBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Business Name & Stars (Model B default: "Review Us on Google")
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.titleColor;
    const isModelB = !businessName || businessName.toLowerCase() === 'bisnis' || businessName.toLowerCase() === 'nama usaha / bisnis' || businessName.trim() === '';
    const bizText = isModelB ? 'Review Us on Google' : businessName;
    const displayBiz = bizText.length > 28 ? bizText.slice(0, 27) + '...' : bizText;
    ctx.fillText(displayBiz, width / 2, headerY + 150);

    // 5 Bintang Emas
    const starCenterY = headerY + 205;
    const starSpacing = 42;
    const starStartX = width / 2 - starSpacing * 2;
    for (let i = 0; i < 5; i++) {
      drawStar(ctx, starStartX + i * starSpacing, starCenterY, 5, 17, 8, '#FBBC05');
    }

    // Call to Action
    ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.subtitleColor;
    const ctaText = isModelB ? 'Tap NFC atau Scan QR Code' : 'Tap NFC atau Scan QR untuk Ulas Kami di Google';
    ctx.fillText(ctaText, width / 2, headerY + 260);

    // 3. QR Code Box (Wajib Solid White Base untuk Mesin Cetak UV)
    const qrBoxSize = 480;
    const qrBoxX = (width - qrBoxSize) / 2;
    const qrBoxY = headerY + 300;

    ctx.beginPath();
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 32);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = cfg.qrBoxBorder;
    ctx.stroke();

    // Draw QR Image
    if (qrImg) {
      const qrPadding = 30;
      ctx.drawImage(
        qrImg,
        qrBoxX + qrPadding,
        qrBoxY + qrPadding,
        qrBoxSize - qrPadding * 2,
        qrBoxSize - qrPadding * 2
      );
    }

    // 4. Footer (Card Code + Identitas)
    const footerY = height - margin - 55;
    ctx.beginPath();
    ctx.moveTo(margin + 45, footerY - 45);
    ctx.lineTo(width - margin - 45, footerY - 45);
    ctx.strokeStyle = cfg.headerBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // KODE KARTU (Tercetak Jelas & Monospace)
    ctx.textAlign = 'left';
    ctx.font = 'bold 30px "SF Mono", Menlo, Consolas, Monaco, monospace';
    ctx.fillStyle = cfg.codeColor;
    ctx.fillText(cardCode || 'OCTO-XXXXXX', margin + 45, footerY);

    ctx.textAlign = 'right';
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.subtitleColor;
    ctx.fillText('SMART REVIEW CARD', width - margin - 45, footerY);
  } else {
    // -------------------------
    // TAMPAK BELAKANG (PANDUAN TAP NFC)
    // -------------------------
    const headerY = margin + 50;
    if (logoImg) {
      ctx.drawImage(logoImg, margin + 45, headerY, 50, 50);
    }
    ctx.textAlign = 'left';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.titleColor;
    ctx.fillText('NFC TOUCHPOINT', margin + 110, headerY + 34);

    ctx.textAlign = 'right';
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.subtitleColor;
    ctx.fillText('SMART REVIEW CARD', width - margin - 45, headerY + 34);

    ctx.beginPath();
    ctx.moveTo(margin + 45, headerY + 65);
    ctx.lineTo(width - margin - 45, headerY + 65);
    ctx.strokeStyle = cfg.headerBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Radar Target Tempel NFC
    const targetCenterX = width / 2;
    const targetCenterY = height / 2 - 50;

    // Lingkaran Luar (Dotted)
    ctx.beginPath();
    ctx.arc(targetCenterX, targetCenterY, 230, 0, Math.PI * 2);
    ctx.setLineDash([12, 12]);
    ctx.strokeStyle = cfg.badgeBorder;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);

    // Lingkaran Tengah
    ctx.beginPath();
    ctx.arc(targetCenterX, targetCenterY, 170, 0, Math.PI * 2);
    ctx.fillStyle = cfg.badgeBg;
    ctx.fill();
    ctx.strokeStyle = cfg.badgeBorder;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Teks di dalam Target
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.titleColor;
    ctx.fillText('TEMPELKAN HP DI SINI', targetCenterX, targetCenterY - 20);

    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.codeColor;
    ctx.fillText('( TAP HERE )', targetCenterX, targetCenterY + 22);

    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.subtitleColor;
    ctx.fillText('Chip NTAG213 • 13.56 MHz Standard', targetCenterX, targetCenterY + 60);

    // Box URL Terintegrasi
    const urlBoxW = cardW - 120;
    const urlBoxH = 90;
    const urlBoxX = (width - urlBoxW) / 2;
    const urlBoxY = height - margin - 220;

    ctx.beginPath();
    ctx.roundRect(urlBoxX, urlBoxY, urlBoxW, urlBoxH, 16);
    ctx.fillStyle = cfg.isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.7)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cfg.headerBorder;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "SF Mono", Menlo, Consolas, Monaco, monospace';
    ctx.fillStyle = cfg.codeColor;
    const shortUrl = redirectUrl.length > 55 ? redirectUrl.slice(0, 52) + '...' : redirectUrl;
    ctx.fillText(shortUrl, width / 2, urlBoxY + 42);

    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.subtitleColor;
    ctx.fillText('URL Tunggal Terintegrasi untuk Chip NFC & QR Code', width / 2, urlBoxY + 70);

    // Footer Belakang
    const footerY = height - margin - 45;
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px "SF Mono", Menlo, Consolas, Monaco, monospace';
    ctx.fillStyle = cfg.codeColor;
    ctx.fillText(`KODE KARTU: ${cardCode || 'OCTO-XXXXXX'}`, width / 2, footerY);
  }

  // Restore clip
  ctx.restore();

  // Draw Card Outer Border
  ctx.beginPath();
  ctx.roundRect(margin, margin, cardW, cardH, cornerRadius);
  ctx.lineWidth = 5;
  ctx.strokeStyle = cfg.borderColor;
  ctx.stroke();

  // Return Canvas
  return canvas;
}

export async function exportCardArtworkPNG(options: ExportArtworkOptions): Promise<void> {
  const canvas = await generateCardArtworkCanvas(options);
  const filename = `${options.cardCode || 'OCTO'}-${options.theme}-${options.side === 'front' ? 'depan' : 'belakang'}.png`;
  downloadCanvasAsPNG(canvas, filename);
}

/**
 * 2. Generate Canvas Lembar Verifikasi Produksi (Production Sheet / QR Badge Label)
 * Ukuran: 800 x 1060 px
 * Berisi QR Code tajam + Kotak data identitas super jelas agar anti-tertukar di percetakan.
 */
export async function generateProductionLabelCanvas(options: ExportProductionLabelOptions): Promise<HTMLCanvasElement> {
  const { businessName, cardCode, batchId, token, qrCodeUrl, redirectUrl } = options;

  const width = 800;
  const height = 1060;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Gagal menginisialisasi Canvas 2D Context');

  const [logoImg, qrImg] = await Promise.all([
    loadImage('/Logo-OCTO-TAP.png'),
    qrCodeUrl ? loadImage(qrCodeUrl) : null,
  ]);

  // Background Putih Bersih
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Border Lembar
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#0F172A';
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Top Dark Banner
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(16, 16, width - 32, 110);

  if (logoImg) {
    ctx.drawImage(logoImg, 36, 32, 75, 75);
  }

  ctx.textAlign = 'left';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('OCTO-TAP • PRODUCTION QR SHEET', 130, 64);

  ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#38BDF8';
  ctx.fillText('LEMBAR KONTROL CETAK UV & PEMROGRAMAN CHIP NFC', 130, 96);

  // QR Code Box di Tengah (500x500)
  const qrBoxSize = 500;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = 150;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#E2E8F0';
  ctx.strokeRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

  if (qrImg) {
    const pad = 25;
    ctx.drawImage(qrImg, qrBoxX + pad, qrBoxY + pad, qrBoxSize - pad * 2, qrBoxSize - pad * 2);
  }

  // Box Informasi Identitas (Anti-Mismatch)
  const infoX = 40;
  const infoY = 675;
  const infoW = width - 80;
  const infoH = 285;

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(infoX, infoY, infoW, infoH, 16);
  ctx.fill();

  // 1. Highlight KODE KARTU (Paling Menonjol)
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.roundRect(infoX + 16, infoY + 16, infoW - 32, 60, 10);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.font = 'bold 32px "SF Mono", Menlo, Consolas, Monaco, monospace';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(`KODE KARTU : ${cardCode || 'OCTO-XXXXXX'}`, width / 2, infoY + 58);

  // 2. Baris Data Lainnya
  const drawRow = (label: string, value: string, yPos: number, isMono: boolean = false) => {
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(label, infoX + 25, yPos);

    ctx.font = isMono
      ? '600 16px "SF Mono", Menlo, Consolas, monospace'
      : 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const valText = value.length > 38 ? value.slice(0, 36) + '...' : value;
    ctx.fillText(valText, infoX + 185, yPos);
  };

  const isModelB = !businessName || businessName.toLowerCase() === 'bisnis' || businessName.toLowerCase() === 'nama usaha / bisnis' || businessName.trim() === '';
  drawRow('BISNIS', isModelB ? 'Stok Model B (Review Us on Google)' : businessName, infoY + 115);
  drawRow('BATCH ID', batchId || 'BATCH-PRODUCTION-01', infoY + 155, true);
  drawRow('NFC URL', redirectUrl, infoY + 195, true);
  drawRow('TOKEN', token ? token.slice(0, 24) + '...' : 'CSPRNG-SECURE', infoY + 235, true);

  // Footer Warning Text
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#DC2626';
  ctx.fillText(
    '⚠️ PERHATIAN: Pastikan KODE KARTU di atas sama persis dengan kartu fisik & data write ke NFC.',
    width / 2,
    height - 40
  );

  return canvas;
}

export async function exportProductionLabelPNG(options: ExportProductionLabelOptions): Promise<void> {
  const canvas = await generateProductionLabelCanvas(options);
  const filename = `${options.cardCode || 'OCTO'}-label-produksi.png`;
  downloadCanvasAsPNG(canvas, filename);
}

/**
 * 3. Ekspor Massal Seluruh Kartu Model B ke format ZIP (Bulk Production Package)
 */
export async function generateBulkProductionZip(options: BulkExportOptions): Promise<void> {
  const { cards, theme, exportType, onProgress } = options;
  if (!cards.length) throw new Error('Tidak ada kartu untuk diekspor');

  const zip = new JSZip();
  const total = cards.length;

  let manifestContent = `=========================================================\n`;
  manifestContent += `OCTO TAP - PAKET DESAIN PRODUKSI MASSAL (MODEL B)\n`;
  manifestContent += `Tanggal Cetak : ${new Date().toLocaleString('id-ID')}\n`;
  manifestContent += `Total Kartu   : ${total} pcs\n`;
  manifestContent += `Tema Desain   : ${theme.toUpperCase()}\n`;
  manifestContent += `Teks Standar  : Review Us on Google (5 Bintang Emas)\n`;
  manifestContent += `=========================================================\n\n`;
  manifestContent += `DAFTAR IDENTITAS KARTU, TOKEN & NFC URL:\n`;
  manifestContent += `No | Kode Kartu | Batch ID | Token (CSPRNG) | URL NFC & QR\n`;
  manifestContent += `---------------------------------------------------------\n`;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const cardCode = card.cardCode || `OCTO-${i + 1}`;
    const percent = Math.round(((i + 0.5) / total) * 90);

    onProgress?.({
      current: i + 1,
      total,
      cardCode,
      percent,
      status: `Membuat artwork & data kartu ${i + 1} dari ${total} (${cardCode})...`,
    });

    manifestContent += `${i + 1}. | ${cardCode} | ${card.batchId || '-'} | ${card.token} | ${card.redirectUrl}\n`;

    // 1. Artwork Kartu Akrilik (Depan)
    if (exportType === 'all' || exportType === 'artwork_only') {
      const artworkCanvas = await generateCardArtworkCanvas({
        businessName: card.businessName || 'Review Us on Google',
        cardCode: card.cardCode,
        token: card.token,
        qrCodeUrl: card.qrCodeUrl,
        redirectUrl: card.redirectUrl,
        theme,
        side: 'front',
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        artworkCanvas.toBlob(resolve, 'image/png', 1.0)
      );
      if (blob) {
        const folder = exportType === 'all' ? zip.folder('1_Artwork_Cetak_UV_Akrilik') : zip;
        folder?.file(`${cardCode}_Artwork_Depan_${theme}.png`, blob);
      }
    }

    // 2. Lembar Kontrol Produksi (Production Sheet)
    if (exportType === 'all' || exportType === 'labels_only') {
      const labelCanvas = await generateProductionLabelCanvas({
        businessName: card.businessName || 'Review Us on Google',
        cardCode: card.cardCode,
        batchId: card.batchId,
        token: card.token,
        qrCodeUrl: card.qrCodeUrl,
        redirectUrl: card.redirectUrl,
      });

      const labelBlob = await new Promise<Blob | null>((resolve) =>
        labelCanvas.toBlob(resolve, 'image/png', 1.0)
      );
      if (labelBlob) {
        const folder = exportType === 'all' ? zip.folder('2_Lembar_Kontrol_Produksi_NFC_QR') : zip;
        folder?.file(`${cardCode}_Lembar_Kontrol_Produksi.png`, labelBlob);
      }
    }
  }

  // Tambahkan Manifest / Lembar Instruksi Produksi
  zip.file('MANIFEST_PRODUKSI_MASSAL.txt', manifestContent);

  onProgress?.({
    current: total,
    total,
    cardCode: '',
    percent: 92,
    status: 'Mengompresi file ke ZIP berkecepatan tinggi...',
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    onProgress?.({
      current: total,
      total,
      cardCode: '',
      percent: 90 + Math.round((metadata.percent / 100) * 10),
      status: `Mengompresi ZIP (${Math.round(metadata.percent)}%)...`,
    });
  });

  // Trigger Download ZIP ke Browser
  const filename = `OCTO_TAP_ModelB_Desain_Produksi_${Date.now()}.zip`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipBlob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// Helper: Download file via anchor
function downloadCanvasAsPNG(canvas: HTMLCanvasElement, filename: string) {
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
