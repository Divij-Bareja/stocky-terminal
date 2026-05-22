import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PnlValue from '@/components/PnlValue';
import PriceCell from '@/components/trading/PriceCell';
import { formatPrice, formatVolume } from '@/utils/format';
import { cn } from '@/lib/utils';

export default function MarketWatchlist({
  stocks,
  selectedSymbol,
  onSelectStock,
  loading,
  error,
  onRetry,
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
          Live Market
        </CardTitle>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-auto p-0">
        {loading && !stocks.length ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Loading market…</p>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 p-6">
            <p className="text-sm text-destructive">{error}</p>
            <button type="button" className="text-xs text-primary underline" onClick={onRetry}>
              Retry
            </button>
          </div>
        ) : !stocks.length ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No symbols</p>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Last</TableHead>
                <TableHead className="text-right">Chg</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Chg %</TableHead>
                <TableHead className="hidden text-right md:table-cell">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.map((stock) => (
                <TableRow
                  key={stock.id ?? stock.symbol}
                  data-state={selectedSymbol === stock.symbol ? 'selected' : undefined}
                  className={cn('cursor-pointer')}
                  onClick={() => onSelectStock(stock)}
                >
                  <TableCell className="font-mono font-semibold text-emerald-400">
                    {stock.symbol}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <PriceCell value={stock.currentPrice}>
                      {formatPrice(stock.currentPrice)}
                    </PriceCell>
                  </TableCell>
                  <TableCell className="text-right">
                    <PnlValue value={stock.change} size="sm" />
                  </TableCell>
                  <TableCell className="hidden text-right sm:table-cell">
                    <PnlValue value={stock.changePercent} asPercent size="sm" />
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-muted-foreground md:table-cell">
                    {formatVolume(stock.volume)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
