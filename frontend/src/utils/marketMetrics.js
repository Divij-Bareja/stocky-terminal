/** @type {Map<string, number>} Session-fixed mock opens per symbol (resets on full page reload). */
const dailyOpenBySymbol = new Map();

/** @type {Map<string, number>} Session-fixed mock share volume per symbol. */
const volumeBySymbol = new Map();

function symbolSeed(symbol) {
  let hash = 0;
  const s = String(symbol ?? '');
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

/**
 * Mock session "daily open" — stable for the day, derived once per symbol from first seen price.
 */
export function getMockDailyOpen(symbol, currentPrice) {
  const price = Number(currentPrice);
  if (!symbol || !Number.isFinite(price) || price <= 0) return null;

  if (!dailyOpenBySymbol.has(symbol)) {
    const seed = symbolSeed(symbol);
    const dayChangePct = ((seed % 500) - 250) / 10_000;
    dailyOpenBySymbol.set(symbol, price / (1 + dayChangePct));
  }

  return dailyOpenBySymbol.get(symbol);
}

/**
 * Mock intraday share volume — stable base per symbol with a slow session ramp.
 */
export function getMockVolume(symbol) {
  if (!symbol) return null;

  if (!volumeBySymbol.has(symbol)) {
    const seed = symbolSeed(symbol);
    volumeBySymbol.set(symbol, 750_000 + (seed % 48_250_000));
  }

  const base = volumeBySymbol.get(symbol);
  const minutesSinceLoad = Math.floor((Date.now() % 86_400_000) / 60_000);
  const ramp = minutesSinceLoad * ((symbolSeed(symbol) % 400) + 100);
  return base + ramp;
}

/**
 * Attach terminal-style quote fields for the live market table.
 */
export function enrichStockWithMarketMetrics(stock) {
  if (!stock) return stock;

  const currentPrice = Number(stock.currentPrice);
  const dailyOpen = getMockDailyOpen(stock.symbol, currentPrice);
  const volume = getMockVolume(stock.symbol);

  let change = null;
  let changePercent = null;

  if (Number.isFinite(currentPrice) && dailyOpen != null && dailyOpen > 0) {
    change = currentPrice - dailyOpen;
    changePercent = (change / dailyOpen) * 100;
  }

  return {
    ...stock,
    dailyOpen,
    change,
    changePercent,
    volume,
  };
}

export function enrichStocksWithMarketMetrics(stocks) {
  if (!stocks?.length) return [];
  return stocks.map(enrichStockWithMarketMetrics);
}
