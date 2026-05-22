import { CANDLE_INTERVAL_SEC, snapTimeToCandleBucket } from './mockTickData.js';

export function sortOhlcBarsByRealTime(bars) {
  return [...bars].sort((a, b) => a.time - b.time);
}

/**
 * Force each candle open to the previous close (no vertical gaps).
 */
export function enforceContinuousOhlc(bars) {
  if (!bars?.length) return [];
  const out = bars.map((b) => ({ ...b }));

  for (let i = 1; i < out.length; i += 1) {
    const prevClose = out[i - 1].close;
    out[i].open = prevClose;
    out[i].high = Math.max(out[i].high, out[i].open, out[i].close);
    out[i].low = Math.min(out[i].low, out[i].open, out[i].close);
  }

  return out;
}

/**
 * Chart bars use real wall-clock bucket times (no synthetic 2017 epoch).
 */
export function toSequentialChartBars(bars) {
  const sorted = enforceContinuousOhlc(sortOhlcBarsByRealTime(bars));
  const timeLabels = new Map();
  const bucketToChartTime = new Map();

  const chartBars = sorted.map((bar) => {
    const chartTime = snapTimeToCandleBucket(bar.time);
    timeLabels.set(chartTime, chartTime);
    bucketToChartTime.set(chartTime, chartTime);
    return { ...bar, time: chartTime, chartTime };
  });

  return {
    chartBars,
    timeLabels,
    bucketToChartTime,
    barCount: chartBars.length,
  };
}

/**
 * Resolve chart time for a bucket — uses real snapped wall-clock time.
 */
export function resolveChartTimeForBucket(bucketTime, bucketToChartTime) {
  const bucket = snapTimeToCandleBucket(bucketTime);
  if (!Number.isFinite(bucket)) return null;

  const existing = bucketToChartTime.get(bucket);
  if (existing != null) return existing;

  bucketToChartTime.set(bucket, bucket);
  return bucket;
}

export function barSpacingForBarCount(barCount, chartWidthPx) {
  if (!barCount || !chartWidthPx) return 12;
  const columnWidth = chartWidthPx / Math.max(barCount, 1);
  return Math.max(4, columnWidth * 0.92);
}

/** UTCTimestamp (seconds) from lightweight-charts `time` argument. */
export function timeToUnixSeconds(time) {
  if (typeof time === 'number') return time;
  if (typeof time === 'object' && time != null && 'year' in time) {
    return Date.UTC(time.year, time.month - 1, time.day) / 1000;
  }
  return NaN;
}

const LOCAL_TIME_AXIS = {
  hour: '2-digit',
  minute: '2-digit',
};

const LOCAL_TIME_CROSSHAIR = {
  year: '2-digit',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/** X-axis tick labels — browser local timezone. */
export function formatChartAxisTime(time) {
  const sec = timeToUnixSeconds(time);
  if (!Number.isFinite(sec)) return '';
  return new Date(sec * 1000).toLocaleTimeString(navigator.language, LOCAL_TIME_AXIS);
}

/** Crosshair / tooltip time — matches local axis (not UTC). */
export function formatChartCrosshairTime(time) {
  const sec = timeToUnixSeconds(time);
  if (!Number.isFinite(sec)) return '';
  return new Date(sec * 1000).toLocaleString(navigator.language, LOCAL_TIME_CROSSHAIR);
}

/** @deprecated use formatChartAxisTime */
export function formatRealTimeLabel(realTimeSec) {
  return formatChartAxisTime(realTimeSec);
}

export { CANDLE_INTERVAL_SEC };
