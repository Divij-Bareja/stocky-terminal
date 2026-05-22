import { formatDecimal, formatPrice } from '../utils/format.js';

export default function StockTable({ stocks, onBuy, tradeDisabled }) {
  if (!stocks.length) {
    return (
      <p className="py-12 text-center text-slate-400">
        No stocks available. Add stocks via the API to see live prices.
      </p>
    );
  }

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
            <th className="px-4 py-4 font-semibold sm:px-6">Symbol</th>
            <th className="px-4 py-4 font-semibold text-right sm:px-6">Price</th>
            <th className="hidden px-4 py-4 font-semibold text-right sm:table-cell sm:px-6">Drift</th>
            <th className="hidden px-4 py-4 font-semibold text-right md:table-cell md:px-6">Volatility</th>
            <th className="px-4 py-4 font-semibold text-right sm:px-6">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {stocks.map((stock) => (
            <tr
              key={stock.id ?? stock.symbol}
              className="group transition-colors duration-200 hover:bg-white/[0.04]"
            >
              <td className="px-4 py-4 font-mono font-semibold text-emerald-400 sm:px-6">
                {stock.symbol}
              </td>
              <td className="px-4 py-4 text-right font-mono text-slate-100 sm:px-6">
                {formatPrice(stock.currentPrice)}
              </td>
              <td className="hidden px-4 py-4 text-right font-mono text-slate-300 sm:table-cell sm:px-6">
                {formatDecimal(stock.drift)}
              </td>
              <td className="hidden px-4 py-4 text-right font-mono text-slate-300 md:table-cell md:px-6">
                {formatDecimal(stock.volatility)}
              </td>
              <td className="px-4 py-4 text-right sm:px-6">
                <button
                  type="button"
                  onClick={() => onBuy(stock)}
                  disabled={tradeDisabled}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-all duration-200 hover:border-emerald-400/60 hover:bg-emerald-500/20 hover:shadow-md hover:shadow-emerald-900/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Buy
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
