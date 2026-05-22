import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
} from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice } from '@/utils/format';
import {
  aggregateTicksToOhlc,
  applyTickToOhlc,
  ohlcToLineData,
  toChartBar,
} from '@/utils/chartAggregation';
import {
  barSpacingForBarCount,
  formatChartAxisTime,
  formatChartCrosshairTime,
  resolveChartTimeForBucket,
  toSequentialChartBars,
} from '@/utils/chartIndexScale';
import { buildTicksForChart, createLiveOverlayTick } from '@/utils/mockTickData';
import { cn } from '@/lib/utils';

const LINE_OPTIONS = {
  color: '#34d399',
  lineWidth: 2,
  priceLineVisible: true,
  lastValueVisible: true,
};

const CANDLE_OPTIONS = {
  upColor: '#4ade80',
  downColor: '#f87171',
  borderUpColor: '#4ade80',
  borderDownColor: '#f87171',
  wickUpColor: '#4ade80',
  wickDownColor: '#f87171',
};

/**
 * Terminal chart — 1m OHLC, index-based x-axis (no time gaps between candles).
 */
export default function TradingChart({
  symbol,
  tickHistory = [],
  currentPrice,
  className,
}) {
  const [chartType, setChartType] = useState('line');
  const [chartReady, setChartReady] = useState(false);

  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const chartTypeRef = useRef(chartType);

  const currentCandleRef = useRef(null);
  const processedHistoryLenRef = useRef(0);
  const symbolRef = useRef(symbol);

  /** real bucket time → synthetic sequential chart time */
  const bucketToChartTimeRef = useRef(new Map());
  /** synthetic chart time → real bucket time (axis labels) */
  const timeLabelsRef = useRef(new Map());
  const resetAggregation = useCallback(() => {
    currentCandleRef.current = null;
    processedHistoryLenRef.current = 0;
    bucketToChartTimeRef.current = new Map();
    timeLabelsRef.current = new Map();
  }, []);

  const applyBarSpacing = useCallback((barCount) => {
    const chart = chartRef.current;
    const width = containerRef.current?.clientWidth ?? 0;
    if (!chart || barCount < 1) return;

    const spacing = barSpacingForBarCount(barCount, width);
    chart.timeScale().applyOptions({
      barSpacing: spacing,
      minBarSpacing: spacing * 0.85,
      maxBarSpacing: spacing * 1.15,
      uniformDistribution: true,
      fixLeftEdge: false,
      fixRightEdge: false,
    });
  }, []);

  const candleToChartBar = useCallback((candle) => {
    if (!candle) return null;

    const bucketTime = candle.bucketTime ?? candle.time;
    const chartTime = resolveChartTimeForBucket(bucketTime, bucketToChartTimeRef.current);
    if (chartTime == null) return null;

    timeLabelsRef.current.set(chartTime, chartTime);

    const bar = toChartBar({ ...candle, chartTime, time: chartTime });
    if (bar) {
      currentCandleRef.current = { ...candle, chartTime, bucketTime };
    }
    return bar;
  }, []);

  const rebuildCandleState = useCallback((ticks) => {
    if (!ticks?.length) {
      currentCandleRef.current = null;
      return null;
    }
    let current = null;
    for (const tick of ticks) {
      const { candle } = applyTickToOhlc(tick, current);
      current = candle;
    }
    if (current) {
      candleToChartBar(current);
    }
    return current;
  }, [candleToChartBar]);

  const pushSeriesUpdate = useCallback((series, candle) => {
    if (!series || !candle) return;

    try {
      const bar = candleToChartBar(candle);
      if (!bar) return;

      if (chartTypeRef.current === 'candles') {
        series.update(bar);
      } else {
        series.update({ time: bar.time, value: bar.close });
      }
    } catch {
      // out-of-order update — full resync on next setData
    }
  }, [candleToChartBar]);

  const setFullSeriesData = useCallback((series, ticks, historyLen) => {
    if (!series || !ticks.length) return;

    const ohlcBars = aggregateTicksToOhlc(ticks);
    if (!ohlcBars.length) return;

    bucketToChartTimeRef.current = new Map();
    timeLabelsRef.current = new Map();

    const { chartBars, timeLabels, bucketToChartTime, barCount } =
      toSequentialChartBars(ohlcBars);

    timeLabelsRef.current = timeLabels;
    bucketToChartTimeRef.current = bucketToChartTime;

    rebuildCandleState(ticks);
    applyBarSpacing(barCount);

    try {
      if (chartTypeRef.current === 'candles') {
        series.setData(chartBars);
      } else {
        series.setData(ohlcToLineData(chartBars));
      }
      processedHistoryLenRef.current = historyLen;
      chartRef.current?.timeScale().fitContent();
    } catch {
      resetAggregation();
    }
  }, [rebuildCandleState, applyBarSpacing, resetAggregation]);

  const removeActiveSeries = useCallback(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (chart && series) {
      chart.removeSeries(series);
    }
    seriesRef.current = null;
  }, []);

  const createSeriesForType = useCallback((type) => {
    const chart = chartRef.current;
    if (!chart) return null;

    if (type === 'candles') {
      return chart.addSeries(CandlestickSeries, CANDLE_OPTIONS);
    }
    return chart.addSeries(LineSeries, LINE_OPTIONS);
  }, []);

  // Chart init (mount only)
  useEffect(() => {
    if (!containerRef.current) return undefined;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      localization: {
        locale: navigator.language,
        timeFormatter: (time) => formatChartCrosshairTime(time),
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
        uniformDistribution: true,
        barSpacing: 12,
        minBarSpacing: 8,
        rightOffset: 2,
        tickMarkFormatter: (time) => formatChartAxisTime(time),
      },
      crosshair: { mode: 1 },
    });

    chartRef.current = chart;
    chartTypeRef.current = chartType;
    seriesRef.current = createSeriesForType(chartType);

    const ticks = buildTicksForChart(tickHistory, currentPrice);
    if (seriesRef.current && ticks.length) {
      const ohlcBars = aggregateTicksToOhlc(ticks);
      if (ohlcBars.length) {
        const { chartBars, timeLabels, bucketToChartTime, barCount } =
          toSequentialChartBars(ohlcBars);
        timeLabelsRef.current = timeLabels;
        bucketToChartTimeRef.current = bucketToChartTime;
        applyBarSpacing(barCount);
        if (chartType === 'candles') {
          seriesRef.current.setData(chartBars);
        } else {
          seriesRef.current.setData(ohlcToLineData(chartBars));
        }
        processedHistoryLenRef.current = tickHistory.length;
        chart.timeScale().fitContent();
      }
    }

    setChartReady(true);

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
      const barCount = bucketToChartTimeRef.current.size;
      if (barCount > 0) applyBarSpacing(barCount);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      seriesRef.current = null;
      chart.remove();
      chartRef.current = null;
      setChartReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createSeriesForType, applyBarSpacing]);

  useLayoutEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chartReady) return;

    if (chartTypeRef.current === chartType && seriesRef.current) return;

    removeActiveSeries();
    seriesRef.current = createSeriesForType(chartType);
    chartTypeRef.current = chartType;

    if (!seriesRef.current || !symbol) return;

    resetAggregation();
    const ticks = buildTicksForChart(tickHistory, currentPrice);
    if (ticks.length) {
      setFullSeriesData(seriesRef.current, ticks, tickHistory.length);
    }
  }, [
    chartType,
    chartReady,
    symbol,
    tickHistory,
    currentPrice,
    createSeriesForType,
    removeActiveSeries,
    resetAggregation,
    setFullSeriesData,
  ]);

  // Live tick stream
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chartReady || !chart || !series || !symbol) return;

    const symbolChanged = symbolRef.current !== symbol;
    if (symbolChanged) {
      symbolRef.current = symbol;
      resetAggregation();
      const ticks = buildTicksForChart(tickHistory, currentPrice);
      if (ticks.length) {
        setFullSeriesData(series, ticks, tickHistory.length);
      }
      return;
    }

    if (processedHistoryLenRef.current === 0 && tickHistory.length > 0) {
      const ticks = buildTicksForChart(tickHistory, currentPrice);
      setFullSeriesData(series, ticks, tickHistory.length);
      return;
    }

    const prevLen = processedHistoryLenRef.current;
    if (tickHistory.length > prevLen) {
      for (let i = prevLen; i < tickHistory.length; i += 1) {
        const { candle } = applyTickToOhlc(tickHistory[i], currentCandleRef.current);
        if (!candle) continue;
        pushSeriesUpdate(series, candle);
      }
      processedHistoryLenRef.current = tickHistory.length;
    }

    const price = Number(currentPrice);
    if (Number.isFinite(price)) {
      const liveTick = createLiveOverlayTick(tickHistory, price);
      if (!liveTick) return;

      const { candle } = applyTickToOhlc(liveTick, currentCandleRef.current);
      if (candle) {
        pushSeriesUpdate(series, candle);
      }
    }
  }, [
    tickHistory,
    currentPrice,
    symbol,
    chartReady,
    resetAggregation,
    setFullSeriesData,
    pushSeriesUpdate,
  ]);

  return (
    <Card className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}>
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-border py-2.5">
        <div className="min-w-0">
          <CardTitle className="truncate font-mono text-lg text-emerald-400">
            {symbol ?? '—'}
          </CardTitle>
          {currentPrice != null && (
            <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-foreground">
              {formatPrice(currentPrice)}
            </p>
          )}
        </div>
        <Tabs value={chartType} onValueChange={setChartType}>
          <TabsList>
            <TabsTrigger value="candles">Candles</TabsTrigger>
            <TabsTrigger value="line">Line</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="relative min-h-0 flex-1 p-0">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        {!symbol && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 text-sm text-muted-foreground">
            Select a symbol from the watchlist
          </div>
        )}
      </CardContent>
    </Card>
  );
}
