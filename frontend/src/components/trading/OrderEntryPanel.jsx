import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PriceCell from '@/components/trading/PriceCell';
import { formatPrice, formatQuantity } from '@/utils/format';
import { parseTradeQuantity } from '@/utils/trade';
import { cn } from '@/lib/utils';

export default function OrderEntryPanel({
  selectedStock,
  holding,
  currentPrice,
  balance,
  onBuy,
  onSell,
  tradeDisabled,
  isSubmitting,
}) {
  const [side, setSide] = useState('buy');
  const [quantityInput, setQuantityInput] = useState('1');
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    setQuantityInput('1');
    setValidationError(null);
    setSide(holding ? 'sell' : 'buy');
  }, [selectedStock?.id, holding?.holdingId]);

  const quantity = parseTradeQuantity(quantityInput);
  const unitPrice = Number(currentPrice ?? selectedStock?.currentPrice) || 0;
  const estimatedTotal = quantity != null ? quantity * unitPrice : 0;
  const maxSell = holding?.quantity ?? 0;
  const insufficientFunds =
    side === 'buy' && balance != null && quantity != null && estimatedTotal > Number(balance);
  const insufficientHoldings =
    side === 'sell' && quantity != null && maxSell > 0 && quantity > maxSell;

  const canExecute = useMemo(() => {
    if (!selectedStock || !quantity || isSubmitting || tradeDisabled) return false;
    if (side === 'buy') return !insufficientFunds;
    return holding && !insufficientHoldings;
  }, [
    selectedStock,
    quantity,
    isSubmitting,
    tradeDisabled,
    side,
    insufficientFunds,
    holding,
    insufficientHoldings,
  ]);

  const executeTrade = () => {
    if (!quantity) {
      setValidationError('Enter a whole number of shares (minimum 1).');
      return;
    }
    if (insufficientFunds) {
      setValidationError('Insufficient buying power.');
      return;
    }
    if (insufficientHoldings) {
      setValidationError(`You only own ${formatQuantity(maxSell)} shares.`);
      return;
    }
    if (side === 'sell' && !holding) {
      setValidationError('No position to sell.');
      return;
    }
    setValidationError(null);
    if (side === 'buy') onBuy(quantity);
    else onSell(quantity);
  };

  const handleSharesKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (canExecute) executeTrade();
  };

  if (!selectedStock) {
    return (
      <Card className="flex h-full min-h-0 flex-col overflow-hidden">
        <CardContent className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Select a symbol from the watchlist or portfolio to place an order.
        </CardContent>
      </Card>
    );
  }

  const symbol = selectedStock.symbol;
  const isBuy = side === 'buy';

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="shrink-0 border-b border-border py-3">
        <CardTitle className="font-mono text-lg">{symbol}</CardTitle>
        <PriceCell value={unitPrice} className="mt-1 text-xl font-semibold">
          {formatPrice(unitPrice)}
        </PriceCell>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(
              isBuy && 'border-green-600/50 bg-green-600/20 text-green-400 hover:bg-green-600/30',
            )}
            onClick={() => {
              setSide('buy');
              setValidationError(null);
            }}
            disabled={tradeDisabled || isSubmitting}
          >
            Buy
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              !isBuy && 'border-red-600/50 bg-red-600/20 text-red-400 hover:bg-red-600/30',
            )}
            onClick={() => {
              setSide('sell');
              setValidationError(null);
            }}
            disabled={tradeDisabled || isSubmitting || !holding}
          >
            Sell
          </Button>
        </div>

        <div className="mt-4 shrink-0 space-y-4">
          <div>
            <label htmlFor="order-qty" className="mb-1.5 block text-xs text-muted-foreground">
              Shares
            </label>
            <div className="flex gap-2">
              <Input
                id="order-qty"
                type="number"
                min={1}
                max={!isBuy ? maxSell : undefined}
                value={quantityInput}
                onChange={(e) => {
                  setQuantityInput(e.target.value);
                  setValidationError(null);
                }}
                onKeyDown={handleSharesKeyDown}
                disabled={tradeDisabled || isSubmitting}
              />
              {!isBuy && maxSell > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setQuantityInput(String(maxSell))}
                  disabled={tradeDisabled || isSubmitting}
                >
                  Max
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between tabular-nums">
              <span className="text-muted-foreground">
                Est. {isBuy ? 'cost' : 'proceeds'}
              </span>
              <span className="font-mono font-medium">
                {quantity != null ? formatPrice(estimatedTotal) : '—'}
              </span>
            </div>
            {balance != null && isBuy && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Buying power: {formatPrice(balance)}
              </p>
            )}
            {holding && !isBuy && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Position: {formatQuantity(maxSell)} shares
              </p>
            )}
          </div>

          {validationError && (
            <p className="text-xs text-destructive" role="alert">
              {validationError}
            </p>
          )}
        </div>

        {/* Anchored execution — always visible without scrolling */}
        <div className="mt-auto shrink-0 pt-4">
          <Button
            type="button"
            size="lg"
            disabled={!canExecute}
            onClick={executeTrade}
            className={cn(
              'w-full text-base font-bold text-white shadow-lg',
              isBuy
                ? 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500'
                : 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
            )}
          >
            {isSubmitting ? 'Executing…' : `${isBuy ? 'Buy' : 'Sell'} ${symbol}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
