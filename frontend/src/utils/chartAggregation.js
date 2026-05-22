import { CANDLE_INTERVAL_SEC, TICK_INTERVAL_SEC } from './mockTickData.js';
import { enforceContinuousOhlc, sortOhlcBarsByRealTime } from './chartIndexScale.js';

/** Candle width for aggregating ticks into OHLC bars. */
export const CANDLE_INTERVAL_MS = CANDLE_INTERVAL_SEC * 1000;

/**
 * Snap a Unix timestamp (seconds) to the start of the current candle bucket.
 */
export function snapTimeToCandleBucket(rawTimeSec) {
  const t = Math.floor(Number(rawTimeSec));
  if (!Number.isFinite(t)) return NaN;
  return Math.floor(t / CANDLE_INTERVAL_SEC) * CANDLE_INTERVAL_SEC;
}

/**
 * Normalize tick timestamps to milliseconds (accepts Unix seconds or ms).
 */
export function tickTimeToMs(time) {
  const t = Number(time);
  if (!Number.isFinite(t)) return NaN;
  return t < 1e12 ? t * 1000 : t;
}

/**
 * lightweight-charts UTCTimestamp (seconds) for a bucket start.
 */
export function chartTimeFromBucketMs(bucketMs) {
  return Math.floor(bucketMs / 1000);
}

/**
 * Deterministic noise in [0, 1) — stable wicks when replaying historical ticks.
 */
function seededRandom(bucketMs, salt = 0) {
  const x = Math.sin(bucketMs * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Wick extension beyond the candle body (open/close range).
 */
function wickVariance(open, close, bucketMs) {
  const bodyHigh = Math.max(open, close);
  const bodyLow = Math.min(open, close);
  const span = bodyHigh - bodyLow || bodyHigh * 0.001;
  const up = span * (0.08 + seededRandom(bucketMs, 1) * 0.22);
  const down = span * (0.08 + seededRandom(bucketMs, 2) * 0.22);
  return { up, down };
}

/**
 * Build OHLC with continuous body and synthetic wicks:
 * high = max(open, close) + variance, low = min(open, close) - variance.
 */
function buildCandle({ bucketTime, open, close, high = null, low = null }) {
  const openN = Number(open);
  const closeN = Number(close);
  const bodyHigh = Math.max(openN, closeN);
  const bodyLow = Math.min(openN, closeN);
  const bucketMs = bucketTime * 1000;
  const { up, down } = wickVariance(openN, closeN, bucketMs);

  const wickHigh = bodyHigh + up;
  const wickLow = Math.max(0.01, bodyLow - down);

  return {
    bucketTime,
    time: bucketTime,
    open: openN,
    close: closeN,
    high: high != null ? Math.max(high, wickHigh) : wickHigh,
    low: low != null ? Math.min(low, wickLow) : wickLow,
  };
}

/**
 * Apply one tick to the in-progress candle (or start a new bucket).
 * Tick times are snapped to the candle interval before bucketing.
 * Multiple ticks in the same bucket update close/high/low in place.
 * @returns {{ candle: object|null, isNewBucket: boolean }}
 */
export function applyTickToOhlc(tick, currentCandle) {
  const rawTime = Math.floor(Number(tick.time));
  const price = Number(tick.value);
  if (!Number.isFinite(rawTime) || !Number.isFinite(price)) {
    return { candle: currentCandle, isNewBucket: false };
  }

  const bucketTime = snapTimeToCandleBucket(rawTime);

  if (currentCandle?.bucketTime === bucketTime) {
    const open = currentCandle.open;
    const close = price;
    return {
      candle: buildCandle({
        bucketTime,
        open,
        close,
        high: Math.max(currentCandle.high, price),
        low: Math.min(currentCandle.low, price),
      }),
      isNewBucket: false,
    };
  }

  const open = currentCandle != null ? currentCandle.close : price;
  const close = price;

  return {
    candle: buildCandle({ bucketTime, open, close }),
    isNewBucket: currentCandle != null,
  };
}

/** Fresh bar object for lightweight-charts (never mutate and reuse). */
export function toChartBar(candle) {
  if (!candle) return null;
  const time =
    candle.chartTime != null
      ? Math.floor(candle.chartTime)
      : snapTimeToCandleBucket(candle.time);
  return {
    time,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}

/**
 * Groups raw tick stream `{ time, value }` into OHLC buckets (batch / initial load).
 */
export function aggregateTicksToOhlc(ticks) {
  if (!ticks?.length) return [];

  const sorted = [...ticks].sort((a, b) => a.time - b.time);
  let current = null;
  const bars = [];

  for (const tick of sorted) {
    const { candle, isNewBucket } = applyTickToOhlc(tick, current);
    if (!candle) continue;

    if (isNewBucket && current) {
      const bar = toChartBar(current);
      if (bar) bars.push(bar);
    }
    current = candle;
  }

  if (current) {
    const bar = toChartBar(current);
    if (bar) bars.push(bar);
  }

  return enforceContinuousOhlc(sortOhlcBarsByRealTime(bars));
}

/**
 * Line series uses the same time scale as candles — one point per bar close.
 */
export function ohlcToLineData(ohlcBars) {
  return ohlcBars.map((bar) => ({
    time: bar.time,
    value: bar.close,
  }));
}

export { TICK_INTERVAL_SEC, CANDLE_INTERVAL_SEC };
