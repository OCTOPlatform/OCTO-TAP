/**
 * cardExport.ts
 * Utilitas untuk mengekspor desain kartu fisik akrilik utuh (Print Artwork)
 * dan Label Verifikasi Produksi (Production Sheet) beresolusi tinggi (300 DPI).
 * Mencegah kesalahan tertukar (mismatch) antara QR Code, kode fisik kartu, dan chip NFC.
 */

export interface ExportArtworkOptions {
  businessName: string;
  cardCode: string;
  token: string;
  qrCodeUrl?: string;
  redirectUrl: string;
  theme: 'octo_navy' | 'octo_frosted' | 'google_white' | 'luxury_gold';
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
 * 1. Ekspor Desain Kartu Utuh (Print Artwork) - Skala 100x100mm @ 300 DPI (1200x1200px)
 */
export async function exportCardArtworkPNG(options: ExportArtworkOptions): Promise<void> {
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

    // 2. Business Name & Stars
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = cfg.titleColor;
    const bizText = businessName || 'Nama Usaha / Bisnis';
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
    ctx.fillText('Tap NFC atau Scan QR untuk Ulas Kami di Google', width / 2, headerY + 260);

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

  // Trigger Download
  const filename = `${cardCode || 'OCTO'}-${theme}-${side === 'front' ? 'depan' : 'belakang'}.png`;
  downloadCanvasAsPNG(canvas, filename);
}

/**
 * 2. Ekspor Lembar Verifikasi Produksi (Production Sheet / QR Badge Label)
 * Ukuran: 800 x 1060 px
 * Berisi QR Code tajam + Kotak data identitas super jelas agar anti-tertukar di percetakan.
 */
export async function exportProductionLabelPNG(options: ExportProductionLabelOptions): Promise<void> {
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

  drawRow('BISNIS', businessName || 'Stok Gudang (Belum Dihubungkan)', infoY + 115);
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

  const filename = `${cardCode || 'OCTO'}-label-produksi.png`;
  downloadCanvasAsPNG(canvas, filename);
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
