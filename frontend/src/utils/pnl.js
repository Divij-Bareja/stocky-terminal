import { formatPrice } from './format.js';

export function pnlTone(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 'neutral';
  return n > 0 ? 'profit' : 'loss';
}

export function pnlClass(value, { strong = false } = {}) {
  const tone = pnlTone(value);
  if (tone === 'profit') {
    return strong ? 'text-emerald-300' : 'text-emerald-400';
  }
  if (tone === 'loss') {
    return strong ? 'text-red-300' : 'text-red-400';
  }
  return 'text-slate-400';
}

export function formatPnL(value, { showSign = true, asPercent = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';

  if (asPercent) {
    const sign = showSign && n > 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
  }

  const formatted = formatPrice(Math.abs(n));
  if (!showSign || n === 0) return formatted;
  return `${n > 0 ? '+' : '−'}${formatted}`;
}
