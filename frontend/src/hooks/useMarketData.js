import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REFRESH_INTERVAL_MS, STOCK_POLL_INTERVAL_MS } from '../constants.js';
import { fetchStocks } from '../services/stockService.js';
import { fetchPortfolio } from '../services/portfolioService.js';
import { computePortfolioAnalytics } from '../utils/portfolioAnalytics.js';
import { enrichStocksWithMarketMetrics } from '../utils/marketMetrics.js';
import {
  createTick,
  DEFAULT_HISTORY_CANDLES,
  seedHistoricalTicks,
  subscribeToNewsEvents,
  triggerRandomNews,
} from '../utils/mockTickData.js';

function getErrorMessage(err, fallback) {
  return err.response?.data?.message ?? err.message ?? fallback;
}

/** Tick buffer: open + close per candle plus live polls. */
const MAX_HISTORY_POINTS = DEFAULT_HISTORY_CANDLES * 2 + 120;
const NEWS_EVENT_MIN_INTERVAL_MS = 30_000;
const NEWS_EVENT_MAX_INTERVAL_MS = 60_000;

function randomNewsIntervalMs() {
  return NEWS_EVENT_MIN_INTERVAL_MS
    + Math.floor(Math.random() * (NEWS_EVENT_MAX_INTERVAL_MS - NEWS_EVENT_MIN_INTERVAL_MS + 1));
}

/**
 * Central market data hook — polls backend for live ticks and builds chart history.
 */
export function useMarketData({ userId, enabled = true } = {}) {
  const [stocks, setStocks] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [stocksLoading, setStocksLoading] = useState(enabled);
  const [portfolioLoading, setPortfolioLoading] = useState(enabled);
  const [stocksError, setStocksError] = useState(null);
  const [portfolioError, setPortfolioError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [priceHistory, setPriceHistory] = useState({});
  const [latestNewsHeadline, setLatestNewsHeadline] = useState(null);
  const [latestNewsEvent, setLatestNewsEvent] = useState(null);

  const priceHistoryRef = useRef({});
  const stockSymbolsRef = useRef([]);

  const loadStocks = useCallback(async (isInitial = false) => {
    if (!enabled) return;
    if (isInitial) setStocksLoading(true);
    setStocksError(null);

    try {
      const data = await fetchStocks();
      setLastUpdated(new Date());
      const nextHistory = { ...priceHistoryRef.current };

      const simulatedStocks = data.map((stock) => {
        const symbol = stock.symbol;
        const price = Number(stock.currentPrice);
        if (!symbol || Number.isNaN(price)) return stock;

        let series = nextHistory[symbol] ? [...nextHistory[symbol]] : [];
        if (series.length === 0) {
          series = seedHistoricalTicks(price, DEFAULT_HISTORY_CANDLES, symbol);
        } else {
          const tick = createTick(series, price, symbol);
          const last = series[series.length - 1];

          if (!last || tick.time > last.time) {
            series.push(tick);
          } else {
            series[series.length - 1] = tick;
          }
        }

        if (series.length > MAX_HISTORY_POINTS) {
          series.splice(0, series.length - MAX_HISTORY_POINTS);
        }

        nextHistory[symbol] = series;
        const simulatedPrice = Number(series[series.length - 1]?.value);
        if (!Number.isFinite(simulatedPrice) || simulatedPrice <= 0) return stock;

        return {
          ...stock,
          currentPrice: simulatedPrice,
        };
      });

      priceHistoryRef.current = nextHistory;
      setPriceHistory(nextHistory);

      const stocksWithMetrics = enrichStocksWithMarketMetrics(simulatedStocks);
      setStocks(stocksWithMetrics);
      stockSymbolsRef.current = stocksWithMetrics.map((stock) => stock.symbol).filter(Boolean);
    } catch (err) {
      if (isInitial) {
        setStocksError(
          getErrorMessage(err, 'Unable to reach the server. Is the backend running on port 8080?'),
        );
      }
    } finally {
      if (isInitial) setStocksLoading(false);
    }
  }, [enabled]);

  const loadPortfolio = useCallback(async (isInitial = false) => {
    if (!enabled || userId == null) return;
    if (isInitial) setPortfolioLoading(true);
    setPortfolioError(null);

    try {
      const data = await fetchPortfolio(userId);
      setPortfolio(data);
    } catch (err) {
      if (isInitial) {
        setPortfolioError(
          getErrorMessage(err, `Unable to load portfolio for user ${userId}.`),
        );
      }
    } finally {
      if (isInitial) setPortfolioLoading(false);
    }
  }, [enabled, userId]);

  const refreshAll = useCallback(
    async (isInitial = false) => {
      await Promise.all([loadStocks(isInitial), loadPortfolio(isInitial)]);
    },
    [loadStocks, loadPortfolio],
  );

  useEffect(() => {
    if (!enabled) {
      setStocks([]);
      setPortfolio(null);
      setStocksLoading(false);
      setPortfolioLoading(false);
      setStocksError(null);
      setPortfolioError(null);
      setLastUpdated(null);
      setPriceHistory({});
      setLatestNewsHeadline(null);
      setLatestNewsEvent(null);
      priceHistoryRef.current = {};
      stockSymbolsRef.current = [];
      return undefined;
    }

    refreshAll(true);
    const stockIntervalId = setInterval(() => loadStocks(false), STOCK_POLL_INTERVAL_MS);
    const portfolioIntervalId = setInterval(() => loadPortfolio(false), REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(stockIntervalId);
      clearInterval(portfolioIntervalId);
    };
  }, [enabled, refreshAll, loadStocks, loadPortfolio]);

  useEffect(() => {
    if (!enabled) return undefined;
    const unsubscribe = subscribeToNewsEvents((newsEvent) => {
      setLatestNewsEvent(newsEvent ?? null);
      setLatestNewsHeadline(newsEvent?.headline ?? null);
    });
    return unsubscribe;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const intervalMs = randomNewsIntervalMs();
    const newsIntervalId = setInterval(() => {
      triggerRandomNews(stockSymbolsRef.current);
    }, intervalMs);

    return () => clearInterval(newsIntervalId);
  }, [enabled]);

  const analytics = useMemo(
    () => computePortfolioAnalytics(portfolio),
    [portfolio],
  );

  const holdingsBySymbol = useMemo(() => {
    const map = new Map();
    portfolio?.holdings?.forEach((h) => map.set(h.symbol, h));
    return map;
  }, [portfolio]);

  return {
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
    isInitialLoading: enabled && stocksLoading && portfolioLoading,
  };
}
