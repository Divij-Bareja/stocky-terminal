import { formatPrice } from '../utils/format.js';
import PnlValue from './PnlValue.jsx';

export default function PortfolioAnalytics({ analytics }) {
  const {
    totalPortfolioValue,
    balance,
    holdingsValue,
    totalInvested,
    unrealizedPnL,
    unrealizedPnLPercent,
  } = analytics;

  return (
    <div className="grid grid-cols-2 gap-3 border-b border-white/5 px-4 py-4 sm:px-5">
      <StatCard label="Total portfolio" value={formatPrice(totalPortfolioValue)} highlight />
      <StatCard
        label="Unrealized P/L"
        value={<PnlValue value={unrealizedPnL} size="md" />}
        sub={<PnlValue value={unrealizedPnLPercent} asPercent size="sm" className="opacity-90" />}
      />
      <StatCard label="Cash" value={formatPrice(balance)} />
      <StatCard label="Holdings" value={formatPrice(holdingsValue)} />
      <StatCard label="Total invested" value={formatPrice(totalInvested)} className="col-span-2" />
    </div>
  );
}

function StatCard({ label, value, sub, highlight = false, className = '' }) {
  return (
    <div
      className={`rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.07] ${className}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <div
        className={`mt-1 font-mono ${highlight ? 'text-lg font-bold text-slate-50' : 'text-sm font-semibold text-slate-200'}`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5">{sub}</div>}
    </div>
  );
}
