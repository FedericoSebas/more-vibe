// src/utils/screenerCalculations.ts

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ScreenerMetrics {
  currentPrice: number;
  openPrice: number;
  volume: number;
  perf1m: number;
  perf5m: number;
  perf15m: number;
  perf1h: number;
  perf4h: number;
  change1d: number;
  changeFromOpen: number;
}

/**
 * Calculates percentage change between current price and base price
 */
export function calculatePercentChange(current: number, base: number): number {
  if (!base || base === 0 || isNaN(current) || isNaN(base)) return 0;
  return ((current - base) / base) * 100;
}

/**
 * Retrieves the historical price at or immediately preceding a target timestamp
 */
export function getPriceAtLookback(candles: Candle[], lookbackMs: number, currentTime = Date.now()): number | null {
  if (!candles || candles.length === 0) return null;
  const targetTime = currentTime - lookbackMs;

  // Assumes candles are sorted ascending by timestamp
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].timestamp <= targetTime) {
      return candles[i].close;
    }
  }

  // Fallback to the oldest candle if history is slightly shorter than lookback
  return candles[0].open;
}

/**
 * Derives all 8 screener metrics from raw market candle data
 */
export function calculateScreenerMetrics(
  candles: Candle[],
  dailyOpenPrice?: number,
  rolling24hVolume?: number
): ScreenerMetrics {
  if (!candles || candles.length === 0) {
    return {
      currentPrice: 0,
      openPrice: 0,
      volume: 0,
      perf1m: 0,
      perf5m: 0,
      perf15m: 0,
      perf1h: 0,
      perf4h: 0,
      change1d: 0,
      changeFromOpen: 0,
    };
  }

  const latestCandle = candles[candles.length - 1];
  const currentPrice = latestCandle.close;
  const now = latestCandle.timestamp || Date.now();

  // Lookback times in milliseconds
  const MS_1M = 1 * 60 * 1000;
  const MS_5M = 5 * 60 * 1000;
  const MS_15M = 15 * 60 * 1000;
  const MS_1H = 60 * 60 * 1000;
  const MS_4H = 4 * 60 * 60 * 1000;
  const MS_24H = 24 * 60 * 60 * 1000;

  const price1mAgo = getPriceAtLookback(candles, MS_1M, now) ?? latestCandle.open;
  const price5mAgo = getPriceAtLookback(candles, MS_5M, now) ?? price1mAgo;
  const price15mAgo = getPriceAtLookback(candles, MS_15M, now) ?? price5mAgo;
  const price1hAgo = getPriceAtLookback(candles, MS_1H, now) ?? price15mAgo;
  const price4hAgo = getPriceAtLookback(candles, MS_4H, now) ?? price1hAgo;
  const price24hAgo = getPriceAtLookback(candles, MS_24H, now) ?? price4hAgo;

  // Use provided session/day open price, or fallback to the candle 24h ago
  const sessionOpen = dailyOpenPrice ?? price24hAgo;

  // Calculate volume: use 24h quote volume if available, or sum of candle volume
  const totalVolume = rolling24hVolume ?? candles.reduce((acc, c) => acc + (c.volume * c.close), 0);

  return {
    currentPrice,
    openPrice: sessionOpen,
    volume: totalVolume,
    perf1m: calculatePercentChange(currentPrice, price1mAgo),
    perf5m: calculatePercentChange(currentPrice, price5mAgo),
    perf15m: calculatePercentChange(currentPrice, price15mAgo),
    perf1h: calculatePercentChange(currentPrice, price1hAgo),
    perf4h: calculatePercentChange(currentPrice, price4hAgo),
    change1d: calculatePercentChange(currentPrice, price24hAgo),
    changeFromOpen: calculatePercentChange(currentPrice, sessionOpen),
  };
}

/**
 * Format helpers for UI display
 */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
  return `$${volume.toFixed(2)}`;
}