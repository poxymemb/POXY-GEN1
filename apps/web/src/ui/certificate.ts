/* Certificate of Authenticity — the ownership artifact (Codex, 02H).
   An A5-proportioned document: paper-grain ground, artwork slot, Fraunces
   name, small-caps title, Plaque with № / run, provenance lines, QR to the
   public verify URL, the Seal bottom-right (its legitimate home), AETRYX
   imprint. Two outputs: live DOM (screen + print stylesheet) and a canvas
   PNG export at 2x for saving/sharing. */
import './certificate.css';
import QRCode from 'qrcode';
import { el, svgFromString } from '../lib/dom';
import { Seal } from './components/seal';
import { formatMint } from './components/plaque';
import sealMarkup from './brand/seal.svg?raw';
import starMarkup from './brand/star.svg?raw';

export interface CertificateData {
  /** Figure display name, e.g. "Katana". */
  name: string;
  /** Series / set line, e.g. "Season 1 · The Awakening". */
  series: string;
  /** Rarity label, e.g. "Legendary". */
  rarity: string;
  /** Mint number within the run. */
  mint: number;
  /** Total run size. */
  run: number;
  /** How it entered the collection: "Opened" | "Crafted" | "Traded". */
  acquisition: 'Opened' | 'Crafted' | 'Traded';
  /** ISO date string of acquisition. */
  date: string;
  /** Public opening / provenance id (goes into the verify URL). */
  openingId: string;
  /** Optional artwork URL for the slot. */
  artworkUrl?: string;
  /** Collector display name. */
  collector?: string;
}

const VERIFY_BASE = 'https://poxy.world/verify/';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** Renders the certificate as a live A5-proportioned element. */
export async function Certificate(data: CertificateData): Promise<HTMLElement> {
  const verifyUrl = `${VERIFY_BASE}${encodeURIComponent(data.openingId)}`;

  const qrSvg = await QRCode.toString(verifyUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#1C1C1E', light: '#0000' },
  });

  const seal = Seal({ size: 56 });
  seal.root.classList.add('px-cert__seal');

  const art = el('div', { class: 'px-cert__art m-paper-sunken' }, [
    data.artworkUrl
      ? el('img', { src: data.artworkUrl, alt: data.name, class: 'px-cert__art-img' })
      : el('span', { class: 'px-cert__art-star' }, [svgFromString(starMarkup)]),
  ]);

  const root = el('article', { class: 'px-cert m-paper m-paper--grain', 'data-env': 'gallery' }, [
    el('header', { class: 'px-cert__head' }, [
      el('span', { class: 'px-cert__title' }, ['Certificate of Authenticity']),
      el('span', { class: 'px-cert__series t-mono' }, [data.series]),
    ]),
    art,
    el('h1', { class: 'px-cert__name t-display' }, [data.name]),
    el('p', { class: 'px-cert__rarity' }, [data.rarity]),
    el('div', { class: 'px-cert__plaque' }, [
      el('span', { class: 'px-plaque__bar' }, [formatMint(data.mint, data.run)]),
    ]),
    el('dl', { class: 'px-cert__provenance' }, [
      el('div', { class: 'px-cert__prov-row' }, [
        el('dt', {}, [`${data.acquisition}`]),
        el('dd', {}, [fmtDate(data.date)]),
      ]),
      data.collector
        ? el('div', { class: 'px-cert__prov-row' }, [
            el('dt', {}, ['Collector']),
            el('dd', {}, [data.collector]),
          ])
        : null,
      el('div', { class: 'px-cert__prov-row' }, [
        el('dt', {}, ['Record']),
        el('dd', { class: 't-mono px-cert__opening-id' }, [data.openingId]),
      ]),
    ]),
    el('footer', { class: 'px-cert__foot' }, [
      el('div', { class: 'px-cert__qr', 'aria-label': 'Verify this figure' }, [
        svgFromString(qrSvg),
        el('span', { class: 'px-cert__qr-hint' }, ['Scan to verify']),
      ]),
      el('div', { class: 'px-cert__imprint' }, [
        seal.root,
        el('span', { class: 'px-cert__legal' }, ['AETRYX LTD \u00b7 London \u00b7 poxy.world']),
      ]),
    ]),
  ]);

  return root;
}

/* ---------------------------------------------------------------- PNG --- */

const A5_W = 1240; // 148mm @ ~212dpi, 2x screen density
const A5_H = 1754;

const INK = '#1C1C1E';
const PAPER = '#F0F0F1';
const DIM = '#6E6E73';
const HAIR = 'rgba(28, 28, 30, 0.12)';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function svgToDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** Draws the certificate on a canvas and resolves to a PNG blob (A5 @ 2x). */
export async function exportCertificatePng(data: CertificateData): Promise<Blob> {
  const verifyUrl = `${VERIFY_BASE}${encodeURIComponent(data.openingId)}`;

  await document.fonts.load('600 64px Fraunces');
  await document.fonts.load('400 28px "JetBrains Mono"');
  await document.fonts.load('400 30px Inter');

  const canvas = document.createElement('canvas');
  canvas.width = A5_W;
  canvas.height = A5_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // Paper ground with a whisper of grain (3%, matches .m-paper--grain).
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, A5_W, A5_H);
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * A5_W;
    const y = Math.random() * A5_H;
    ctx.fillStyle = `rgba(28, 28, 30, ${Math.random() * 0.03})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }

  // Hairline frame.
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, A5_W - 112, A5_H - 112);

  const cx = A5_W / 2;

  // Header: small-caps title + series.
  ctx.fillStyle = DIM;
  ctx.font = '500 30px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATE OF AUTHENTICITY', cx, 160);
  ctx.font = '400 24px "JetBrains Mono", monospace';
  ctx.fillText(data.series, cx, 204);

  // Artwork slot.
  const artX = 220, artY = 260, artW = A5_W - 440, artH = 620;
  ctx.fillStyle = 'rgba(28, 28, 30, 0.04)';
  ctx.fillRect(artX, artY, artW, artH);
  ctx.strokeStyle = HAIR;
  ctx.strokeRect(artX, artY, artW, artH);
  try {
    const img = data.artworkUrl
      ? await loadImage(data.artworkUrl)
      : await loadImage(svgToDataUrl(starMarkup.replace(/currentColor/g, INK)));
    const scale = data.artworkUrl
      ? Math.min(artW / img.width, artH / img.height)
      : Math.min((artW / img.width) * 0.4, (artH / img.height) * 0.4);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.globalAlpha = data.artworkUrl ? 1 : 0.5;
    ctx.drawImage(img, artX + (artW - w) / 2, artY + (artH - h) / 2, w, h);
    ctx.globalAlpha = 1;
  } catch {
    /* artwork slot stays as sunken paper if the image fails */
  }

  // Name in Fraunces + rarity.
  ctx.fillStyle = INK;
  ctx.font = '600 76px Fraunces, serif';
  ctx.fillText(data.name, cx, artY + artH + 130);
  ctx.fillStyle = DIM;
  ctx.font = '400 30px Inter, system-ui, sans-serif';
  ctx.fillText(data.rarity, cx, artY + artH + 184);

  // Plaque: ink bar, mono numerals in paper.
  const plaqueText = formatMint(data.mint, data.run);
  ctx.font = '500 34px "JetBrains Mono", monospace';
  const pw = ctx.measureText(plaqueText).width + 88;
  const py = artY + artH + 236;
  ctx.fillStyle = INK;
  ctx.fillRect(cx - pw / 2, py, pw, 72);
  ctx.fillStyle = PAPER;
  ctx.fillText(plaqueText, cx, py + 48);

  // Provenance lines.
  let ly = py + 168;
  ctx.textAlign = 'left';
  const rows: Array<[string, string]> = [
    [data.acquisition, fmtDate(data.date)],
    ...(data.collector ? ([['Collector', data.collector]] as Array<[string, string]>) : []),
    ['Record', data.openingId],
  ];
  for (const [k, v] of rows) {
    ctx.fillStyle = DIM;
    ctx.font = '500 26px Inter, system-ui, sans-serif';
    ctx.fillText(k, 220, ly);
    ctx.fillStyle = INK;
    ctx.font = k === 'Record' ? '400 26px "JetBrains Mono", monospace' : '400 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(v, A5_W - 220, ly);
    ctx.textAlign = 'left';
    ctx.strokeStyle = HAIR;
    ctx.beginPath();
    ctx.moveTo(220, ly + 26);
    ctx.lineTo(A5_W - 220, ly + 26);
    ctx.stroke();
    ly += 78;
  }

  // Footer: QR left, seal + imprint right.
  const qrSize = 190;
  const qrY = A5_H - 330;
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, verifyUrl, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: qrSize,
    color: { dark: INK, light: '#00000000' },
  });
  ctx.drawImage(qrCanvas, 220, qrY, qrSize, qrSize);
  ctx.fillStyle = DIM;
  ctx.font = '400 22px Inter, system-ui, sans-serif';
  ctx.fillText('Scan to verify', 220, qrY + qrSize + 44);

  try {
    const sealImg = await loadImage(svgToDataUrl(sealMarkup.replace(/currentColor/g, '#C24A55')));
    ctx.drawImage(sealImg, A5_W - 220 - 150, qrY, 150, 150);
  } catch {
    /* seal missing = still a valid document */
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = DIM;
  ctx.font = '400 22px Inter, system-ui, sans-serif';
  ctx.fillText('AETRYX LTD \u00b7 London \u00b7 poxy.world', A5_W - 220, qrY + qrSize + 44);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

/** Convenience: export + trigger a download. */
export async function downloadCertificatePng(data: CertificateData): Promise<void> {
  const blob = await exportCertificatePng(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `poxy-certificate-${data.openingId}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
