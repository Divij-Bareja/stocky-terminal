import { useEffect, useMemo, useState } from 'react';
import { formatPrice, formatQuantity } from '../utils/format.js';
import { parseTradeQuantity } from '../utils/trade.js';

export default function SellModal({
  holding,
  onClose,
  onConfirm,
  isSubmitting,
}) {
  const [quantityInput, setQuantityInput] = useState('1');
  const [validationError, setValidationError] = useState(null);

  const maxQuantity = holding?.quantity ?? 0;
  const quantity = parseTradeQuantity(quantityInput);
  const unitPrice = holding?.currentPrice ?? 0;
  const estimatedProceeds = quantity != null ? quantity * unitPrice : 0;
  const exceedsHoldings =
    quantity != null && maxQuantity > 0 && quantity > maxQuantity;

  const canSubmit =
    quantity != null &&
    !exceedsHoldings &&
    !isSubmitting &&
    holding?.stockId != null &&
    maxQuantity > 0;

  useEffect(() => {
    setQuantityInput('1');
    setValidationError(null);
  }, [holding?.holdingId, holding?.stockId]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, isSubmitting]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!quantity) {
      setValidationError('Enter a whole number of shares (minimum 1).');
      return;
    }
    if (exceedsHoldings) {
      setValidationError(
        `You only own ${formatQuantity(maxQuantity)} share${maxQuantity === 1 ? '' : 's'}.`,
      );
      return;
    }
    setValidationError(null);
    onConfirm(quantity);
  };

  const holdingsHint = useMemo(() => {
    if (maxQuantity <= 0) return null;
    if (quantity == null) return `Owned: ${formatQuantity(maxQuantity)} shares`;
    const remaining = maxQuantity - quantity;
    return `Remaining after sale: ${formatQuantity(remaining)} share${remaining === 1 ? '' : 's'}`;
  }, [maxQuantity, quantity]);

  if (!holding) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sell-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
        aria-label="Close modal"
        disabled={isSubmitting}
      />

      <div className="glass-modal relative w-full max-w-md animate-[modalIn_0.2s_ease-out]">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Sell shares
              </p>
              <h2 id="sell-modal-title" className="mt-1 font-mono text-2xl font-bold text-red-400">
                {holding.symbol}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <dl className="mb-6 space-y-3 rounded-xl border border-white/5 bg-white/5 p-4 text-sm backdrop-blur-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Current price</dt>
              <dd className="font-mono font-medium text-slate-100">{formatPrice(unitPrice)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="text-slate-400">Estimated proceeds</dt>
              <dd className="font-mono text-lg font-semibold text-red-400">
                {quantity != null ? formatPrice(estimatedProceeds) : '—'}
              </dd>
            </div>
            {holdingsHint && (
              <p className="text-xs text-slate-500">{holdingsHint}</p>
            )}
          </dl>

          <label htmlFor="sell-quantity" className="mb-2 block text-sm font-medium text-slate-300">
            Quantity
          </label>
          <div className="flex gap-2">
            <input
              id="sell-quantity"
              type="number"
              min={1}
              max={maxQuantity}
              step={1}
              value={quantityInput}
              onChange={(e) => {
                setQuantityInput(e.target.value);
                setValidationError(null);
              }}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-600/80 bg-slate-800/80 px-4 py-3 font-mono text-slate-100 outline-none transition-colors focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
              autoFocus
            />
            <button
              type="button"
              disabled={isSubmitting || maxQuantity <= 0}
              onClick={() => {
                setQuantityInput(String(maxQuantity));
                setValidationError(null);
              }}
              className="shrink-0 rounded-lg border border-slate-600 px-3 text-xs font-medium text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200 disabled:opacity-50"
            >
              Max
            </button>
          </div>

          {(validationError || exceedsHoldings) && (
            <p className="mt-2 text-sm text-red-400" role="alert">
              {validationError ??
                `You only own ${formatQuantity(maxQuantity)} share${maxQuantity === 1 ? '' : 's'}.`}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500 hover:shadow-lg hover:shadow-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Processing…' : `Sell ${quantity ?? ''} share${quantity === 1 ? '' : 's'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
