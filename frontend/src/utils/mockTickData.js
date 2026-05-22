/** Seconds between each mock tick (matches STOCK_POLL_INTERVAL_MS). */
export const TICK_INTERVAL_SEC = 1;

/** Seconds between each OHLC candle on the chart (1-minute buckets). */
export const CANDLE_INTERVAL_SEC = 60;

/** Default number of 1m candles in the seeded history. */
export const DEFAULT_HISTORY_CANDLES = 60;

/**
 * Snap a Unix timestamp (seconds) to the start of the current candle bucket.
 */
export function snapTimeToCandleBucket(rawTimeSec) {
  const t = Math.floor(Number(rawTimeSec));
  if (!Number.isFinite(t)) return NaN;
  return Math.floor(t / CANDLE_INTERVAL_SEC) * CANDLE_INTERVAL_SEC;
}

/**
 * Current minute bucket: Math.floor(now / 60) * 60
 */
export function getSnappedNow(nowMs = Date.now()) {
  const nowInSeconds = Math.floor(nowMs / 1000);
  return Math.floor(nowInSeconds / CANDLE_INTERVAL_SEC) * CANDLE_INTERVAL_SEC;
}

/**
 * Wall-clock anchors for historical → live handoff.
 */
export function getHandoffTimestamps(nowMs = Date.now()) {
  const nowSec = Math.floor(nowMs / 1000);
  const snappedNow = getSnappedNow(nowMs);
  const liveBucket = snappedNow;
  const lastHistoricalBucket = snappedNow - CANDLE_INTERVAL_SEC;
  const lastHistoricalCloseSec = lastHistoricalBucket + CANDLE_INTERVAL_SEC - TICK_INTERVAL_SEC;

  return {
    nowSec,
    snappedNow,
    liveBucket,
    lastHistoricalBucket,
    lastHistoricalCloseSec,
  };
}

function symbolSeed(symbol) {
  let h = 0;
  const s = String(symbol ?? '');
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededUnit(seed, index) {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function normalizeMarketPrice(price) {
  const n = Number(price);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const MAX_DRIFT_MODIFIER = 0.03;
const RANDOM_WALK_NOISE_RANGE = 0.003;
const MEAN_REVERSION_WEIGHT = 0.12;
const NEWS_BASE_IMPACT = 0.006;
const DRIFT_DECAY_FACTOR = 0.99;
const DRIFT_EPSILON = 0.00001;

const stockStateBySymbol = new Map();
const newsEventListeners = new Set();

export const newsEvents = [
  { headline: '{SYMBOL} announces record earnings', type: 'bullish', intensity: 2.0 },
  { headline: '{SYMBOL} secures major government contract', type: 'bullish', intensity: 1.4 },
  { headline: '{SYMBOL} unveils breakthrough AI product line', type: 'bullish', intensity: 0.6 },
  { headline: '{SYMBOL} CEO steps down unexpectedly', type: 'bearish', intensity: 1.7 },
  { headline: '{SYMBOL} faces regulatory investigation', type: 'bearish', intensity: 1.9 },
  { headline: '{SYMBOL} misses quarterly guidance', type: 'bearish', intensity: 0.5 },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomItem(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function normalizeSymbol(symbol) {
  return String(symbol ?? '').trim().toUpperCase();
}

function getOrCreateStockState(symbol = '') {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!stockStateBySymbol.has(normalizedSymbol)) {
    const seed = symbolSeed(normalizedSymbol);
    const baselineDrift = ((seed % 400) - 200) / 1_000_000;
    stockStateBySymbol.set(normalizedSymbol, {
      baselineDrift,
      currentDriftModifier: 0,
    });
  }
  return stockStateBySymbol.get(normalizedSymbol);
}

function decayDriftModifier(state) {
  if (!state) return;
  const next = state.currentDriftModifier * DRIFT_DECAY_FACTOR;
  state.currentDriftModifier = Math.abs(next) < DRIFT_EPSILON ? 0 : next;
}

function emitNewsEvent(newsEvent) {
  for (const listener of newsEventListeners) {
    listener(newsEvent);
  }
}

export function subscribeToNewsEvents(listener) {
  if (typeof listener !== 'function') return () => {};
  newsEventListeners.add(listener);
  return () => {
    newsEventListeners.delete(listener);
  };
}

export function triggerRandomNews(symbols = []) {
  const symbolPool = symbols?.length
    ? [...new Set(symbols.map((s) => normalizeSymbol(s)).filter(Boolean))]
    : [...stockStateBySymbol.keys()].filter(Boolean);

  const symbol = randomItem(symbolPool);
  const event = randomItem(newsEvents);
  if (!symbol || !event) return null;

  const state = getOrCreateStockState(symbol);
  const direction = event.type === 'bullish' ? 1 : -1;
  const shock = direction * NEWS_BASE_IMPACT * Number(event.intensity || 1);
  state.currentDriftModifier = clamp(
    state.currentDriftModifier + shock,
    -MAX_DRIFT_MODIFIER,
    MAX_DRIFT_MODIFIER,
  );

  const headline = event.headline.replace(/\{SYMBOL\}/g, symbol);
  const newsEvent = {
    headline,
    symbol,
    type: event.type,
    intensity: event.intensity,
  };
  emitNewsEvent(newsEvent);
  return newsEvent;
}

/**
 * Continuous random-walk OHLC with dynamic timestamps up to the current minute.
 * Loop: start at snappedNow - (count * interval), +interval per candle.
 * Last historical bucket is snappedNow - interval; live continues at snappedNow.
 */
export function seedHistoricalCandles(currentPrice, candleCount, symbol = '', nowMs = Date.now()) {
  const marketPrice = normalizeMarketPrice(currentPrice);
  if (marketPrice == null || candleCount < 1) return [];

  const nowInSeconds = Math.floor(nowMs / 1000);
  const snappedNow = Math.floor(nowInSeconds / CANDLE_INTERVAL_SEC) * CANDLE_INTERVAL_SEC;
  let currentTime = snappedNow - candleCount * CANDLE_INTERVAL_SEC;

  const seed = symbolSeed(symbol);
  const driftPct = ((seed % 400) - 200) / 10_000;
  let walkPrice = marketPrice / (1 + driftPct);

  const candles = [];

  for (let i = 0; i < candleCount; i += 1) {
    const open = walkPrice;
    const isLast = i === candleCount - 1;

    let close;
    if (isLast) {
      close = marketPrice;
    } else {
      const variancePct = (seededUnit(seed, i) - 0.5) * 0.004;
      close = Math.max(0.01, open * (1 + variancePct));
    }

    const bodyHigh = Math.max(open, close);
    const bodyLow = Math.min(open, close);
    const span = bodyHigh - bodyLow || bodyHigh * 0.0008;
    const wickUp = span * (0.1 + seededUnit(seed, i + 1000) * 0.2);
    const wickDown = span * (0.1 + seededUnit(seed, i + 2000) * 0.2);

    candles.push({
      time: currentTime,
      open,
      high: bodyHigh + wickUp,
      low: Math.max(0.01, bodyLow - wickDown),
      close,
    });

    walkPrice = close;
    currentTime += CANDLE_INTERVAL_SEC;
  }

  return candles;
}

/**
 * Historical ticks only. Last close uses the final candle bucket @ market price.
 */
export function candlesToHistoryTicks(candles, currentPrice) {
  if (!candles?.length) return [];

  const marketPrice = normalizeMarketPrice(currentPrice);
  const ticks = [];
  const lastCandle = candles[candles.length - 1];
  const lastBucket = snapTimeToCandleBucket(lastCandle.time);
  const lastCloseSec = lastBucket + CANDLE_INTERVAL_SEC - TICK_INTERVAL_SEC;

  for (let i = 0; i < candles.length; i += 1) {
    const c = candles[i];
    const bucketTime = snapTimeToCandleBucket(c.time);
    const isLast = i === candles.length - 1;

    ticks.push({ time: bucketTime, value: c.open });

    const closeTime = isLast
      ? lastCloseSec
      : bucketTime + CANDLE_INTERVAL_SEC - TICK_INTERVAL_SEC;

    if (closeTime > bucketTime) {
      ticks.push({
        time: closeTime,
        value: isLast && marketPrice != null ? marketPrice : c.close,
      });
    } else if (c.close !== c.open) {
      ticks.push({ time: bucketTime, value: c.close });
    }
  }

  return ticks.sort((a, b) => a.time - b.time);
}

/** Live tick at wall-clock now — same price as last historical close. */
export function createLiveHandoffTick(currentPrice, nowMs = Date.now()) {
  const marketPrice = normalizeMarketPrice(currentPrice);
  if (marketPrice == null) return null;

  return {
    time: Math.floor(nowMs / 1000),
    value: marketPrice,
  };
}

export function seedHistoricalTicks(
  currentPrice,
  candleCount = DEFAULT_HISTORY_CANDLES,
  symbol = '',
) {
  const count = Math.max(2, Math.floor(Number(candleCount)));
  const candles = seedHistoricalCandles(currentPrice, count, symbol);
  const ticks = candlesToHistoryTicks(candles, currentPrice);
  const handoff = createLiveHandoffTick(currentPrice);
  if (handoff) ticks.push(handoff);
  return ticks.sort((a, b) => a.time - b.time);
}

export function seedHistoricalOhlcBars(
  currentPrice,
  candleCount = DEFAULT_HISTORY_CANDLES,
  symbol = '',
) {
  const count = Math.max(2, Math.floor(Number(candleCount)));
  return seedHistoricalCandles(currentPrice, count, symbol).map((c) => ({
    time: snapTimeToCandleBucket(c.time),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

export function lastCloseFromSeries(series) {
  if (!series?.length) return null;
  const v = Number(series[series.length - 1].value);
  return Number.isFinite(v) ? v : null;
}

export function createTick(series, currentPrice, symbol = '') {
  const marketPrice = normalizeMarketPrice(currentPrice);
  const nowSec = Math.floor(Date.now() / 1000);

  if (marketPrice == null) {
    return {
      time: nowSec,
      value: Number(currentPrice),
    };
  }

  const lastValue = Number(series?.[series.length - 1]?.value);
  const basePrice = Number.isFinite(lastValue) && lastValue > 0 ? lastValue : marketPrice;
  const state = getOrCreateStockState(symbol);

  const randomNoise = (Math.random() - 0.5) * RANDOM_WALK_NOISE_RANGE;
  const reversion = ((marketPrice - basePrice) / basePrice) * MEAN_REVERSION_WEIGHT;
  const drift = state.baselineDrift + state.currentDriftModifier + randomNoise + reversion;
  const nextPrice = Math.max(0.01, basePrice * (1 + drift));

  decayDriftModifier(state);

  return {
    time: nowSec,
    value: nextPrice,
  };
}

export function createLiveOverlayTick(_series, currentPrice) {
  return createLiveHandoffTick(currentPrice);
}

export function buildTicksForChart(tickHistory, currentPrice) {
  if (!tickHistory?.length && currentPrice == null) return [];

  const ticks = [...tickHistory].sort((a, b) => a.time - b.time);
  const overlay = createLiveOverlayTick(ticks, currentPrice);
  if (!overlay) return ticks;

  const last = ticks[ticks.length - 1];
  if (!last) {
    ticks.push(overlay);
  } else if (last.time === overlay.time) {
    if (last.value !== overlay.value) {
      ticks[ticks.length - 1] = overlay;
    }
  } else if (overlay.time > last.time) {
    ticks.push(overlay);
  }

  return ticks;
}
