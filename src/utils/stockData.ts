import { Candle, StockQuote, VolumeProfileLevel, MacdPoint, Timeframe } from '../types/stock';
import nasdaqStocksData from '../data/nasdaqStocks.json';

// Comprehensive dataset containing all 3,431 NASDAQ stocks from the market ticket registry
export const INITIAL_STOCKS: StockQuote[] = nasdaqStocksData as StockQuote[];

// Generate realistic candlestick history matching the timeframe and screenshot characteristics
export function generateCandlesForStock(stock: StockQuote, timeframe: Timeframe): Candle[] {
  const candles: Candle[] = [];
  const barCount = 360; // Expanded historical bar count for smooth bidirectional panning & time stretching
  
  let intervalMinutes = 5;
  if (timeframe === '1M') intervalMinutes = 1;
  else if (timeframe === '5M') intervalMinutes = 5;
  else if (timeframe === '10M') intervalMinutes = 10;
  else if (timeframe === '1H') intervalMinutes = 60;
  else if (timeframe === '4H') intervalMinutes = 240;
  else if (timeframe === 'D') intervalMinutes = 1440;

  const now = Date.now();
  const intervalMs = intervalMinutes * 60 * 1000;

  // Starting anchor price
  let currentPrice = stock.ticker === 'TORO' ? 3.68 : stock.price * (1 - stock.changePercent / 100 * 0.85);
  
  // Breakout bar index (e.g. at 9:30 AM market open, around bar 45)
  const breakoutIndex = Math.floor(barCount * 0.42);

  for (let i = barCount - 1; i >= 0; i--) {
    const candleTime = now - i * intervalMs;
    const dateObj = new Date(candleTime);
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const mins = dateObj.getMinutes().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getMonth()];
    const day = dateObj.getDate().toString().padStart(2, '0');

    let timeStr = `${hours}:${mins}`;
    if (timeframe === 'D') {
      timeStr = `${month} ${day}`;
    } else if (timeframe === '1H' || timeframe === '4H') {
      timeStr = `${month} ${day} ${hours}:00`;
    }

    const open = currentPrice;
    let changePct: number;
    let volumeBase = stock.volume / barCount;

    if (stock.ticker === 'TORO') {
      // Replicate the exact pattern in the TORO screenshot:
      // Early morning flat around 3.68 - 3.70, then massive gap up & climb to 4.48-4.50, then choppy consolidation between 4.20 - 4.40
      if (i > barCount - breakoutIndex) {
        // Pre-breakout: flat around 3.68
        changePct = (Math.random() - 0.49) * 0.005;
        volumeBase = 4000 + Math.random() * 8000;
      } else if (i === barCount - breakoutIndex) {
        // Breakout surge!
        changePct = 0.12 + Math.random() * 0.04;
        volumeBase = 320000; // Giant breakout volume
      } else if (i > barCount - breakoutIndex - 12) {
        // Follow-through run to high of day (4.45 - 4.52)
        changePct = (Math.random() - 0.28) * 0.025;
        volumeBase = 45000 + Math.random() * 60000;
      } else if (i > 15) {
        // Consolidation pullback & retest around 4.25 - 4.40
        changePct = (Math.random() - 0.52) * 0.016;
        volumeBase = 15000 + Math.random() * 30000;
      } else {
        // Near real-time end, stabilizing around current price 4.28
        const drift = (stock.price - currentPrice) * 0.15;
        changePct = (drift / currentPrice) + (Math.random() - 0.5) * 0.008;
        volumeBase = 12000 + Math.random() * 25000;
      }
    } else {
      // General realistic Brownian motion with drift toward stock.price
      const targetPct = (stock.price - currentPrice) / currentPrice;
      changePct = targetPct * 0.12 + (Math.random() - 0.48) * 0.015;
      volumeBase = (stock.volume / barCount) * (0.4 + Math.random() * 1.2);
    }

    const close = Math.max(0.0001, Math.round(open * (1 + changePct) * 10000) / 10000);
    const volatility = Math.abs(close - open) * (1.2 + Math.random() * 1.5) + (open * 0.0008);
    const high = Math.round((Math.max(open, close) + Math.random() * volatility) * 10000) / 10000;
    const low = Math.round((Math.min(open, close) - Math.random() * volatility) * 10000) / 10000;
    const volume = Math.floor(Math.max(100, volumeBase));

    candles.push({
      time: candleTime,
      timeStr,
      open: Math.round(open * 10000) / 10000,
      high,
      low: Math.max(0.0001, low),
      close,
      volume
    });

    currentPrice = close;
  }

  // Force the final candle close to match current stock price with 4 decimals
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    const targetPrice = Math.round(stock.price * 10000) / 10000;
    last.close = targetPrice;
    last.high = Math.max(last.high, targetPrice);
    last.low = Math.min(last.low, targetPrice);
  }

  return candles;
}

// Indicator: Simple Moving Average (SMA)
export function calculateSMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close;
      }
      result.push(Math.round((sum / period) * 10000) / 10000);
    }
  }
  return result;
}

// Indicator: Exponential Moving Average (EMA)
export function calculateEMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // First EMA is simple average
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close;
      }
      prevEma = sum / period;
      result.push(Math.round(prevEma * 10000) / 10000);
    } else {
      const currentEma: number = (candles[i].close - (prevEma as number)) * multiplier + (prevEma as number);
      prevEma = currentEma;
      result.push(Math.round(currentEma * 10000) / 10000);
    }
  }
  return result;
}

// Indicator: Volume-Weighted Average Price (VWAP)
export function calculateVWAP(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [];
  let cumulativeTypicalPriceVolume = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativeTypicalPriceVolume += typicalPrice * c.volume;
    cumulativeVolume += c.volume;

    if (cumulativeVolume === 0) {
      result.push(null);
    } else {
      result.push(Math.round((cumulativeTypicalPriceVolume / cumulativeVolume) * 10000) / 10000);
    }
  }
  return result;
}

// Indicator: MACD (Moving Average Convergence Divergence)
export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): (MacdPoint | null)[] {
  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);
  const macdLine: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macdLine.push((fastEMA[i] as number) - (slowEMA[i] as number));
    } else {
      macdLine.push(null);
    }
  }

  // Calculate Signal Line (EMA of MACD line)
  const signalMultiplier = 2 / (signalPeriod + 1);
  const signalLine: (number | null)[] = [];
  let prevSignal: number | null = null;
  let validCount = 0;

  for (let i = 0; i < macdLine.length; i++) {
    const val = macdLine[i];
    if (val === null) {
      signalLine.push(null);
      continue;
    }
    validCount++;
    if (validCount < signalPeriod) {
      signalLine.push(null);
    } else if (validCount === signalPeriod) {
      let sum = 0;
      for (let j = 0; j < signalPeriod; j++) {
        sum += macdLine[i - j] as number;
      }
      prevSignal = sum / signalPeriod;
      signalLine.push(prevSignal);
    } else {
      const currentSignal: number = (val - (prevSignal as number)) * signalMultiplier + (prevSignal as number);
      prevSignal = currentSignal;
      signalLine.push(currentSignal);
    }
  }

  const result: (MacdPoint | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    const m = macdLine[i];
    const s = signalLine[i];
    if (m !== null && s !== null) {
      result.push({
        time: candles[i].time,
        macd: Number(m.toFixed(3)),
        signal: Number(s.toFixed(3)),
        histogram: Number((m - s).toFixed(3))
      });
    } else {
      result.push(null);
    }
  }
  return result;
}

// Indicator: Volume Profile (histogram by price range across visible candles)
export function calculateVolumeProfile(candles: Candle[], buckets = 40): VolumeProfileLevel[] {
  if (candles.length === 0) return [];

  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }

  if (minPrice === maxPrice) {
    minPrice -= 0.1;
    maxPrice += 0.1;
  }

  const range = maxPrice - minPrice;
  const step = range / buckets;

  const profile: VolumeProfileLevel[] = [];
  for (let b = 0; b < buckets; b++) {
    profile.push({
      price: minPrice + b * step,
      buyVolume: 0,
      sellVolume: 0,
      totalVolume: 0
    });
  }

  for (const c of candles) {
    const isUp = c.close >= c.open;
    const bucketIdx = Math.min(buckets - 1, Math.max(0, Math.floor((c.close - minPrice) / step)));
    if (isUp) {
      profile[bucketIdx].buyVolume += c.volume;
    } else {
      profile[bucketIdx].sellVolume += c.volume;
    }
    profile[bucketIdx].totalVolume += c.volume;
  }

  return profile;
}

// Format numbers nicely (e.g. 42,894,587 or 335.09K)
export function formatVolume(num: number | null | undefined): string {
  if (num === null || num === undefined || !Number.isFinite(num)) return '0';
  return Number(num).toLocaleString('en-US');
}

export function formatCompactVolume(num: number | null | undefined): string {
  if (num === null || num === undefined || !Number.isFinite(num)) return '0';
  const n = Number(num);
  if (n >= 1000000000) return (n / 1000000000).toFixed(2) + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
  return n.toString();
}
