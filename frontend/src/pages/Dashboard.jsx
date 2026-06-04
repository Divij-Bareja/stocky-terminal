import { useCallback, useMemo, useState } from 'react';
import { buyStock, sellStock } from '@/services/tradeService.js';
import { loginUser, registerUser } from '@/services/authService.js';
import { useMarketData } from '@/hooks/useMarketData';
import { useAuth } from '@/context/AuthContext.jsx';
import TerminalLayout from '@/components/layout/TerminalLayout';
import TradingChart from '@/components/trading/TradingChart';
import PortfolioSidebar from '@/components/trading/PortfolioSidebar';
import MarketWatchlist from '@/components/trading/MarketWatchlist';
import OrderEntryPanel from '@/components/trading/OrderEntryPanel';
import LoginModal from '@/components/auth/LoginModal.jsx';
import RegisterModal from '@/components/auth/RegisterModal.jsx';
import { Button } from '@/components/ui/button';
import Toast from '@/components/Toast.jsx';

function getErrorMessage(err, fallback) {
  return err.response?.data?.message ?? err.message ?? fallback;
}

function toAuthUser(authResponse) {
  return {
    id: authResponse.userId,
    email: authResponse.email,
    availableCash: authResponse.availableCash,
  };
}

function deriveDisplayName(emailOrUsername) {
  if (!emailOrUsername) return 'Trader';
  if (emailOrUsername.includes('@')) return emailOrUsername.split('@')[0];
  return emailOrUsername;
}

function createGuestCredentials() {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).slice(2, 8);
  return {
    email: `guest-${timestamp}-${nonce}@stocky.local`,
    password: `Guest-${timestamp}-${nonce}`,
  };
}

export default function Dashboard() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [authModal, setAuthModal] = useState(isAuthenticated ? null : 'login');
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [guestError, setGuestError] = useState(null);
  const {
    stocks,
    portfolio,
    analytics,
    holdingsBySymbol,
    priceHistory,
    stocksLoading,
    portfolioLoading,
    stocksError,
    portfolioError,
    lastUpdated,
    latestNewsEvent,
    latestNewsHeadline,
    refreshAll,
    loadStocks,
    loadPortfolio,
    isInitialLoading,
  } = useMarketData({ userId: user?.id, enabled: isAuthenticated });

  const [selectedStock, setSelectedStock] = useState(null);
  const [tradeSubmitting, setTradeSubmitting] = useState(false);
  const [tradeToast, setTradeToast] = useState(null);

  const userEmail = user?.email ?? null;
  const portfolioUsername = portfolio?.username ?? null;
  const displayName = useMemo(
    () => deriveDisplayName(userEmail ?? portfolioUsername),
    [userEmail, portfolioUsername],
  );

  const selectedSymbol = selectedStock?.symbol ?? null;
  const selectedHolding = selectedSymbol ? holdingsBySymbol.get(selectedSymbol) : null;
  const tickHistory = selectedSymbol ? priceHistory[selectedSymbol] ?? [] : [];
  const liveSelectedPrice = selectedSymbol
    ? stocks.find((stock) => stock.symbol === selectedSymbol)?.currentPrice
    : undefined;
  const latestNewsStyle = latestNewsEvent?.type === 'bullish'
    ? 'text-emerald-300'
    : latestNewsEvent?.type === 'bearish'
      ? 'text-red-300'
      : 'text-amber-300';

  const handleAuthSuccess = useCallback((authResponse) => {
    login(authResponse.token, toAuthUser(authResponse));
    setAuthModal(null);
  }, [login]);

  const handleGuestExplore = useCallback(async () => {
    setGuestError(null);
    setGuestSubmitting(true);
    try {
      const { email: guestEmail, password: guestPassword } = createGuestCredentials();
      await registerUser(guestEmail, guestPassword);
      const authResponse = await loginUser(guestEmail, guestPassword);
      handleAuthSuccess(authResponse);
    } catch (err) {
      const message = err.response?.data?.message ?? err.message ?? 'Unable to create a guest session.';
      setGuestError(message);
    } finally {
      setGuestSubmitting(false);
    }
  }, [handleAuthSuccess]);

  const handleLogout = useCallback(() => {
    logout();
    setSelectedStock(null);
    setTradeToast(null);
    setAuthModal('login');
  }, [logout]);

  const handleSelectStock = useCallback((stock) => {
    setSelectedStock(stock);
  }, []);

  const handleSelectHolding = useCallback(
    (holding) => {
      const stock = stocks.find((item) => item.symbol === holding.symbol);
      if (stock) setSelectedStock(stock);
    },
    [stocks],
  );

  const handleBuy = async (quantity) => {
    if (!selectedStock || user?.id == null) return;
    setTradeSubmitting(true);
    const symbol = selectedStock.symbol;
    try {
      await buyStock(selectedStock.id, quantity, user.id);
      setTradeToast({
        type: 'success',
        message: `Bought ${quantity} share${quantity === 1 ? '' : 's'} of ${symbol}`,
      });
      await refreshAll(false);
    } catch (err) {
      setTradeToast({
        type: 'error',
        message: getErrorMessage(err, 'Order failed.'),
      });
    } finally {
      setTradeSubmitting(false);
    }
  };

  const handleSell = async (quantity) => {
    if (!selectedHolding || user?.id == null) return;
    setTradeSubmitting(true);
    const symbol = selectedHolding.symbol;
    try {
      await sellStock(selectedHolding.stockId, quantity, user.id);
      setTradeToast({
        type: 'success',
        message: `Sold ${quantity} share${quantity === 1 ? '' : 's'} of ${symbol}`,
      });
      await refreshAll(false);
    } catch (err) {
      setTradeToast({
        type: 'error',
        message: getErrorMessage(err, 'Order failed.'),
      });
    } finally {
      setTradeSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card/90 p-8 shadow-2xl shadow-black/40">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">Stocky Terminal</p>
            <h1 className="mt-3 text-3xl font-bold text-foreground">Secure login required</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Sign in to access your live portfolio, place trades, and monitor market events.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => {
                    setGuestError(null);
                    setAuthModal('login');
                  }}
                  disabled={guestSubmitting}
                >
                  Log in
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGuestError(null);
                    setAuthModal('register');
                  }}
                  disabled={guestSubmitting}
                >
                  Register
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-emerald-400/40 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-900/60"
                onClick={handleGuestExplore}
                disabled={guestSubmitting}
              >
                {guestSubmitting ? 'Creating Sandbox...' : 'Explore as Guest'}
              </Button>
              {guestError && <p className="text-sm text-destructive">{guestError}</p>}
            </div>
          </div>
        </div>

        <LoginModal
          open={authModal === 'login'}
          onClose={() => setAuthModal(null)}
          onSuccess={handleAuthSuccess}
          onSwitchToRegister={() => setAuthModal('register')}
        />
        <RegisterModal
          open={authModal === 'register'}
          onClose={() => setAuthModal(null)}
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setAuthModal('login')}
        />
      </>
    );
  }

  const header = (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-md">
      <div>
        <h1 className="text-sm font-bold tracking-tight">
          <span className="text-emerald-400">STOCKY</span>
          <span className="text-muted-foreground"> TERMINAL</span>
        </h1>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Live simulation · paper trading
        </p>
      </div>
      <div className="flex items-center gap-2">
        {lastUpdated && (
          <p className="hidden text-[10px] tabular-nums text-muted-foreground sm:block">
            {lastUpdated.toLocaleTimeString()}
          </p>
        )}
        <p className="hidden text-xs font-medium text-foreground sm:block">{displayName}</p>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );

  const ticker = (
    <p className={`news-marquee-text whitespace-nowrap px-4 font-mono text-lg font-semibold tracking-wide ${latestNewsStyle}`}>
      {latestNewsHeadline
        ? `NEWS · ${latestNewsHeadline}`
        : 'NEWS · Waiting for market-moving headlines...'}
    </p>
  );

  if (isInitialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Initializing terminal…
      </div>
    );
  }

  return (
    <>
      <TerminalLayout
        header={header}
        ticker={ticker}
        portfolio={(
          <PortfolioSidebar
            portfolio={portfolio}
            username={displayName}
            analytics={analytics}
            loading={portfolioLoading && !portfolio}
            error={portfolioError}
            onRetry={() => loadPortfolio(true)}
            selectedSymbol={selectedSymbol}
            onSelectHolding={handleSelectHolding}
          />
        )}
        chart={(
          <TradingChart
            symbol={selectedSymbol}
            tickHistory={tickHistory}
            currentPrice={liveSelectedPrice ?? selectedStock?.currentPrice}
          />
        )}
        watchlist={(
          <MarketWatchlist
            stocks={stocks}
            selectedSymbol={selectedSymbol}
            onSelectStock={handleSelectStock}
            loading={stocksLoading && !stocks.length}
            error={stocksError}
            onRetry={() => loadStocks(true)}
          />
        )}
        orderEntry={(
          <OrderEntryPanel
            selectedStock={selectedStock}
            holding={selectedHolding}
            currentPrice={liveSelectedPrice ?? selectedStock?.currentPrice}
            balance={portfolio?.balance}
            onBuy={handleBuy}
            onSell={handleSell}
            tradeDisabled={tradeSubmitting}
            isSubmitting={tradeSubmitting}
          />
        )}
      />

      {tradeToast && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-w-sm flex-col gap-2">
          <Toast
            message={tradeToast.message}
            type={tradeToast.type}
            onDismiss={() => setTradeToast(null)}
          />
        </div>
      )}
    </>
  );
}
