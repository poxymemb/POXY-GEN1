/* Plaque — the certificate primitive (Codex §5 brand device). Ink bar,
   mint number in JetBrains Mono, optional provenance line. Reused by the
   reveal, figure detail, museum pedestals and trades. */
import './plaque.css';
import { el } from '../../lib/dom';

export interface PlaqueOptions {
  /** Mint number, e.g. 142. */
  mint: number;
  /** Run size, e.g. 2500. */
  run: number;
  /** Optional provenance, e.g. "Opened 12 Mar 2026". */
  provenance?: string;
}

export function formatMint(mint: number, run: number): string {
  return `\u2116 ${String(mint).padStart(4, '0')} / ${run.toLocaleString('en-GB')}`;
}

export function Plaque(options: PlaqueOptions): HTMLElement {
  const { mint, run, provenance } = options;

  const bar = el('span', { class: 'px-plaque__bar' }, [formatMint(mint, run)]);

  if (!provenance) {
    return el('span', { class: 'px-plaque' }, [bar]);
  }

  return el('span', { class: 'px-plaque px-plaque--with-provenance' }, [
    bar,
    el('span', { class: 'px-plaque__provenance' }, [provenance]),
  ]);
}
