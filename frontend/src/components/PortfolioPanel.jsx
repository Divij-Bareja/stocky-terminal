import { useMemo } from 'react';
import { formatPrice, formatQuantity } from '../utils/format.js';
import { computePortfolioAnalytics } from '../utils/portfolioAnalytics.js';
import PortfolioAnalytics from './PortfolioAnalytics.jsx';
import PnlValue from './PnlValue.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

export default function PortfolioPanel({
  portfolio,
  loading,
  error,
  onRetry,
  onSell,
  sellDisabled,
}) {
  const analytics = useMemo(
    () => computePortfolioAnalytics(portfolio),
    [portfolio],
  );

  if (loading) {
    return (
      <section className="glass-card p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Portfolio
        </h2>
        <LoadingSpinner />
      </section>
    );
  }

  if (error) {
    return (
      <section className="glass-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Portfolio
        </h2>
        <p className="text-sm text-red-400">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            Retry
          </button>
        )}
      </section>
    );
  }

  if (!portfolio) return null;

  const { username } = portfolio;
  const { holdingsWithMetrics } = analytics;

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/5 px-4 py-4 sm:px-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Portfolio
        </h2>
        <p className="mt-1 font-medium text-slate-100">{username}</p>
      </div>

      <PortfolioAnalytics analytics={analytics} />

      <div className="px-4 py-4 sm:px-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Holdings
        </h3>

        {!holdingsWithMetrics.length ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No positions yet. Buy shares from the market table.
          </p>
        ) : (
          <ul className="space-y-3">
            {holdingsWithMetrics.map(({ holding, metrics }) => (
              <li
                key={holding.holdingId ?? `${holding.symbol}-${holding.stockId}`}
                className="rounded-lg border border-white/5 bg-white/[0.03] p-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-base font-semibold text-emerald-400">
                      {holding.symbol}
                    </span>
                    <p className="mt-0.5 font-mono text-sm text-slate-200">
                      {formatPrice(metrics.marketValue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      Unrealized P/L
                    </p>
                    <PnlValue value={metrics.unrealizedPnL} size="md" />
                    <PnlValue
                      value={metrics.unrealizedPnLPercent}
                      asPercent
                      className="mt-0.5 block"
                    />
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-slate-500">Qty</dt>
                    <dd className="font-mono text-slate-300">
                      {formatQuantity(holding.quantity)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Avg buy</dt>
                    <dd className="font-mono text-slate-300">
                      {formatPrice(holding.averageBuyPrice ?? holding.averagePrice)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Market</dt>
                    <dd className="font-mono text-slate-300">
                      {formatPrice(holding.currentPrice)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Cost basis</dt>
                    <dd className="font-mono text-slate-300">
                      {formatPrice(metrics.costBasis)}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => onSell(holding)}
                  disabled={sellDisabled}
                  className="mt-3 w-full rounded-lg border border-red-500/40 bg-red-500/10 py-2 text-xs font-semibold text-red-400 transition-all hover:border-red-400/60 hover:bg-red-500/20 hover:shadow-md hover:shadow-red-900/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sell
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
