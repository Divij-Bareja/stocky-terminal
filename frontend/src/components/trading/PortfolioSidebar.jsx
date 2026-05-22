import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PriceCell from '@/components/trading/PriceCell';
import PnlValue from '../PnlValue.jsx';
import { formatPrice, formatQuantity } from '@/utils/format';
import { cn } from '@/lib/utils';

export default function PortfolioSidebar({
  portfolio,
  username,
  analytics,
  loading,
  error,
  onRetry,
  selectedSymbol,
  onSelectHolding,
}) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
          Loading portfolio…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const portfolioUsername = username ?? portfolio?.username ?? 'Trader';
  const {
    totalPortfolioValue,
    balance,
    unrealizedPnL,
    unrealizedPnLPercent,
    holdingsWithMetrics,
  } = analytics;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
          Portfolio
        </CardTitle>
        <p className="text-sm font-medium">{portfolioUsername}</p>
      </CardHeader>

      <CardContent className="space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Total value" value={formatPrice(totalPortfolioValue)} large />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unrealized P/L</p>
            <PnlValue value={unrealizedPnL} size="md" />
            <PnlValue value={unrealizedPnLPercent} asPercent className="text-xs" />
          </div>
          <Metric label="Cash" value={formatPrice(balance)} />
          <Metric label="Invested" value={formatPrice(analytics.totalInvested)} />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Holdings
          </p>
          {!holdingsWithMetrics.length ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No positions</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sym</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Mkt</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdingsWithMetrics.map(({ holding, metrics }) => (
                  <TableRow
                    key={holding.holdingId ?? holding.symbol}
                    data-state={selectedSymbol === holding.symbol ? 'selected' : undefined}
                    className="cursor-pointer"
                    onClick={() => onSelectHolding?.(holding)}
                  >
                    <TableCell className="font-mono font-semibold text-emerald-400">
                      {holding.symbol}
                    </TableCell>
                    <TableCell className="text-right">{formatQuantity(holding.quantity)}</TableCell>
                    <TableCell className="text-right">
                      <PriceCell value={metrics.marketValue}>
                        {formatPrice(metrics.marketValue)}
                      </PriceCell>
                    </TableCell>
                    <TableCell className="text-right">
                      <PnlValue value={metrics.unrealizedPnL} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, large = false }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 font-mono tabular-nums text-foreground',
          large ? 'text-base font-semibold' : 'text-sm',
        )}
      >
        {value}
      </p>
    </div>
  );
}
