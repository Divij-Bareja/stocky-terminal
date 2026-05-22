import { cn } from '@/lib/utils';

/**
 * Wall Street terminal grid: portfolio | chart + watchlist | order entry.
 * Uses viewport height so side panels never force page scroll.
 */
export default function TerminalLayout({
  header,
  ticker,
  portfolio,
  chart,
  watchlist,
  orderEntry,
  className,
}) {
  return (
    <div className={cn('flex h-screen flex-col overflow-hidden bg-background', className)}>
      {header}
      {ticker && (
        <div className="flex w-full items-center overflow-hidden whitespace-nowrap border-b border-border bg-gray-900 py-2">
          {ticker}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(240px,280px)_1fr_minmax(260px,300px)] lg:gap-4 lg:p-4">
        <aside className="order-2 flex min-h-0 flex-col overflow-hidden lg:order-1">
          {portfolio}
        </aside>

        <main className="order-1 flex min-h-0 flex-col gap-3 overflow-hidden lg:order-2">
          <section className="min-h-[240px] flex-1 overflow-hidden">{chart}</section>
          <section className="min-h-[200px] flex-1 overflow-hidden">{watchlist}</section>
        </main>

        <aside className="order-3 flex h-full max-h-full min-h-0 flex-col overflow-hidden lg:order-3 lg:sticky lg:top-0 lg:self-start lg:h-full">
          {orderEntry}
        </aside>
      </div>
    </div>
  );
}
