import { Candle, StockQuote, VolumeProfileLevel, MacdPoint, Timeframe, DateRangeKey, CustomDateRange } from '../types/stock';
import nasdaqStocksData from '../data/nasdaqStocks.json';

// Comprehensive dataset containing all 3,431 NASDAQ stocks from the market ticket registry
export const INITIAL_STOCKS: StockQuote[] = nasdaqStocksData as StockQuote[];

// Generate realistic candlestick history matching the timeframe, date range, and screenshot characteristics
export function generateCandlesForStock(
  stock: StockQuote, 
  timeframe: Timeframe,
  rangeKey?: DateRangeKey,
  customRange?: CustomDateRange
): Candle[] {
  const candles: Candle[] = [];
  let barCount = 360; // Historical bar count for smooth bidirectional panning & time stretching
  let intervalMinutes = 5;

  if (rangeKey && rangeKey !== 'custom') {
    switch (rangeKey) {
      case '1d':
        intervalMinutes = timeframe === '1M' ? 1 : 5;
        barCount = intervalMinutes === 1 ? 960 : 192; // 16 hours of extended trading: Pre-Market (4am-9:30am), Regular (9:30am-4pm), After-Hours (4pm-8pm)
        break;
      case '5d':
        intervalMinutes = 5;
        barCount = 960; // 5 days with complete Pre-Market, Regular, and Post-Market sessions
        break;
      case '1mo':
        intervalMinutes = 60;
        barCount = 140;
        break;
      case '3mo':
        intervalMinutes = 60;
        barCount = 280;
        break;
      case '6mo':
        intervalMinutes = 1440;
        barCount = 130;
        break;
      case 'ytd':
        intervalMinutes = 1440;
        barCount = 200;
        break;
      case '1y':
        intervalMinutes = 1440;
        barCount = 252;
        break;
      case '2y':
        intervalMinutes = 1440;
        barCount = 504;
        break;
      case '5y':
        intervalMinutes = 10080;
        barCount = 260;
        break;
      case 'max':
        intervalMinutes = 43200;
        barCount = 120;
        break;
    }
  } else if (rangeKey === 'custom' && customRange) {
    const startMs = new Date(customRange.startDate).getTime();
    const endMs = new Date(customRange.endDate).getTime();
    const diffDays = Math.max(1, (endMs - startMs) / 86400000);
    if (diffDays <= 2) {
      intervalMinutes = 5;
      barCount = Math.round(diffDays * 78);
    } else if (diffDays <= 14) {
      intervalMinutes = 15;
      barCount = Math.round(diffDays * 26);
    } else if (diffDays <= 60) {
      intervalMinutes = 60;
      barCount = Math.round(diffDays * 7);
    } else if (diffDays <= 730) {
      intervalMinutes = 1440;
      barCount = Math.round(diffDays);
    } else {
      intervalMinutes = 10080;
      barCount = Math.round(diffDays / 7);
    }
  } else {
    if (timeframe === '1M') intervalMinutes = 1;
    else if (timeframe === '5M') intervalMinutes = 5;
    else if (timeframe === '10M') intervalMinutes = 10;
    else if (timeframe === '1H') intervalMinutes = 60;
    else if (timeframe === '4H') intervalMinutes = 240;
    else if (timeframe === 'D') intervalMinutes = 1440;
  }

  // Intraday 1D session: exactly 16 hours (04:00 AM to 20:00 PM ET)
  if (rangeKey === '1d' || (!rangeKey && (timeframe === '1M' || timeframe === '5M' || timeframe === '10M'))) {
    const stepMinutes = timeframe === '1M' ? 1 : (timeframe === '10M' ? 10 : (timeframe === '1H' ? 60 : 5));
    const totalMinutes = 16 * 60; // 960 minutes
    const barsCount = Math.floor(totalMinutes / stepMinutes);

    // Anchor to today's date in Eastern Time at 04:00 AM EDT
    // 04:00 AM EDT is 08:00 UTC (Oct 23, 2024 as shown in screenshot)
    const baseAnchorMs = Date.UTC(2024, 9, 23, 8, 0, 0);

    let price = stock.ticker === 'AIOK' ? 2.22 : (stock.ticker === 'TORO' ? 3.68 : stock.price * (1 - (stock.changePercent / 100) * 0.85));

    for (let idx = 0; idx < barsCount; idx++) {
      const minuteOffset = idx * stepMinutes;
      const barTime = baseAnchorMs + minuteOffset * 60 * 1000;
      const etTotalMinutes = 240 + minuteOffset; // Starts at 4:00 AM (240 minutes)
      const etHour = Math.floor(etTotalMinutes / 60);
      const etMinute = etTotalMinutes % 60;
      const timeStr = `${String(etHour).padStart(2, '0')}:${String(etMinute).padStart(2, '0')}`;

      // Session: Pre (4:00-9:30), Regular (9:30-16:00), Post (16:00-20:00)
      let session: 'pre' | 'regular' | 'post' = 'regular';
      if (etTotalMinutes < 570) {
        session = 'pre';
      } else if (etTotalMinutes < 960) {
        session = 'regular';
      } else {
        session = 'post';
      }

      const open = price;
      let changePct = 0;
      let volume = 1500;

      if (stock.ticker === 'AIOK') {
        // High-fidelity reproduction of Image 2 AIOK curve ($12.02, +182.82%, High $14.80, Low $2.20)
        if (etTotalMinutes < 570) {
          // Pre-Market (4:00 - 9:30 AM): Flat base between 2.20 and 2.45, low volume
          changePct = (Math.random() - 0.49) * 0.006;
          volume = Math.floor(1000 + Math.random() * 4000);
        } else if (etTotalMinutes === 570) {
          // 9:30 AM Opening bell breakout gap!
          changePct = 0.28 + Math.random() * 0.08;
          volume = Math.floor(450000 + Math.random() * 100000);
        } else if (etTotalMinutes < 630) {
          // 9:31 - 10:30 AM: Massive surge running from $3 up to High of Day $14.80
          const progress = (etTotalMinutes - 570) / 60;
          const targetPrice = 3.2 + progress * (14.80 - 3.2);
          const diff = (targetPrice - price) / price;
          changePct = diff * 0.4 + (Math.random() - 0.35) * 0.025;
          volume = Math.floor(120000 + Math.random() * 180000);
        } else if (etTotalMinutes < 720) {
          // 10:30 AM - 12:00 PM: Natural pullback from $14.80 down to $9.80 - $10.40
          const progress = (etTotalMinutes - 630) / 90;
          const targetPrice = 14.80 - progress * (14.80 - 10.10);
          const diff = (targetPrice - price) / price;
          changePct = diff * 0.25 + (Math.random() - 0.55) * 0.018;
          volume = Math.floor(45000 + Math.random() * 65000);
        } else if (etTotalMinutes < 960) {
          // 12:00 PM - 4:00 PM: Consolidation & climb from $10.10 toward $11.60
          const progress = (etTotalMinutes - 720) / 240;
          const targetPrice = 10.10 + progress * (11.65 - 10.10);
          const diff = (targetPrice - price) / price;
          changePct = diff * 0.15 + (Math.random() - 0.48) * 0.012;
          volume = Math.floor(35000 + Math.random() * 55000);
        } else {
          // 4:00 PM - 8:00 PM (After-Hours): Secondary rally settling right at $12.0200
          const progress = (etTotalMinutes - 960) / 240;
          const targetPrice = 11.65 + progress * (12.02 - 11.65);
          const diff = (targetPrice - price) / price;
          changePct = diff * 0.18 + (Math.random() - 0.5) * 0.008;
          volume = Math.floor(15000 + Math.random() * 30000);
        }
      } else if (stock.ticker === 'TORO') {
        if (etTotalMinutes < 570) {
          changePct = (Math.random() - 0.49) * 0.005;
          volume = Math.floor(2000 + Math.random() * 6000);
        } else if (etTotalMinutes === 570) {
          changePct = 0.12 + Math.random() * 0.04;
          volume = 280000;
        } else if (etTotalMinutes < 630) {
          changePct = (Math.random() - 0.3) * 0.022;
          volume = Math.floor(35000 + Math.random() * 50000);
        } else if (etTotalMinutes < 960) {
          changePct = (Math.random() - 0.52) * 0.015;
          volume = Math.floor(12000 + Math.random() * 25000);
        } else {
          const diff = (4.28 - price) / price;
          changePct = diff * 0.12 + (Math.random() - 0.5) * 0.007;
          volume = Math.floor(8000 + Math.random() * 15000);
        }
      } else {
        const targetClose = stock.price;
        const progress = idx / barsCount;
        const expectedPrice = (stock.price * (1 - (stock.changePercent / 100) * 0.85)) + progress * (targetClose - (stock.price * (1 - (stock.changePercent / 100) * 0.85)));
        const diff = (expectedPrice - price) / price;
        changePct = diff * 0.15 + (Math.random() - 0.49) * 0.014;
        volume = Math.floor((stock.volume / barsCount) * (0.3 + Math.random() * 1.4));
      }

      let close = Math.max(0.0001, Math.round(open * (1 + changePct) * 10000) / 10000);
      if (idx === barsCount - 1) {
        close = Math.round(stock.price * 10000) / 10000;
      }

      const volatility = Math.abs(close - open) * (1.1 + Math.random() * 1.4) + (open * 0.0008);
      let high = Math.round((Math.max(open, close) + Math.random() * volatility) * 10000) / 10000;
      let low = Math.round((Math.min(open, close) - Math.random() * volatility) * 10000) / 10000;

      if (stock.ticker === 'AIOK') {
        if (etTotalMinutes >= 620 && etTotalMinutes <= 635) {
          high = Math.max(high, 14.8000);
        }
        if (etTotalMinutes < 570) {
          low = Math.max(2.2000, low);
        }
      }

      candles.push({
        time: barTime,
        timeStr,
        open: Math.round(open * 10000) / 10000,
        high: Math.max(open, close, high),
        low: Math.max(0.0001, Math.min(open, close, low)),
        close,
        volume,
        session
      });

      price = close;
    }

    return candles;
  }

  // 5D range: 5 distinct trading days with full Pre (4:00-9:30), Reg (9:30-16:00), Post (16:00-20:00)
  if (rangeKey === '5d') {
    const stepMinutes = 5;
    const minutesPerDay = 16 * 60; // 960 mins
    const barsPerDay = Math.floor(minutesPerDay / stepMinutes); // 192 bars
    const days = 5;
    const baseAnchorMs = Date.UTC(2024, 9, 17, 8, 0, 0); // Start 5 weekdays earlier

    let price = stock.price * (1 - (stock.changePercent / 100) * 0.7);

    for (let dayIdx = 0; dayIdx < days; dayIdx++) {
      const dayStartMs = baseAnchorMs + dayIdx * 24 * 60 * 60 * 1000;
      for (let b = 0; b < barsPerDay; b++) {
        const minuteOffset = b * stepMinutes;
        const barTime = dayStartMs + minuteOffset * 60 * 1000;
        const etTotalMinutes = 240 + minuteOffset;
        const etHour = Math.floor(etTotalMinutes / 60);
        const etMinute = etTotalMinutes % 60;
        const timeStr = `${String(etHour).padStart(2, '0')}:${String(etMinute).padStart(2, '0')}`;

        let session: 'pre' | 'regular' | 'post' = 'regular';
        if (etTotalMinutes < 570) session = 'pre';
        else if (etTotalMinutes < 960) session = 'regular';
        else session = 'post';

        const open = price;
        const isLastDay = dayIdx === days - 1;
        const target = isLastDay ? stock.price : stock.price * (0.85 + (dayIdx / days) * 0.15);
        const diff = (target - price) / price;
        const changePct = diff * 0.08 + (Math.random() - 0.49) * 0.015;
        let close = Math.max(0.0001, Math.round(open * (1 + changePct) * 10000) / 10000);
        if (isLastDay && b === barsPerDay - 1) {
          close = Math.round(stock.price * 10000) / 10000;
        }

        const vol = Math.abs(close - open) * (1.1 + Math.random() * 1.3) + (open * 0.0008);
        const high = Math.round((Math.max(open, close) + Math.random() * vol) * 10000) / 10000;
        const low = Math.round((Math.min(open, close) - Math.random() * vol) * 10000) / 10000;
        const volume = Math.floor((stock.volume / (barsPerDay * days)) * (0.3 + Math.random() * 1.4));

        candles.push({
          time: barTime,
          timeStr,
          open: Math.round(open * 10000) / 10000,
          high: Math.max(open, close, high),
          low: Math.max(0.0001, Math.min(open, close, low)),
          close,
          volume,
          session
        });

        price = close;
      }
    }

    return candles;
  }

  // Multi-month and higher date ranges
  const now = Date.now();
  const intervalMs = intervalMinutes * 60 * 1000;
  let currentPrice = stock.ticker === 'TORO' ? 3.68 : stock.price * (1 - stock.changePercent / 100 * 0.85);

  for (let i = barCount - 1; i >= 0; i--) {
    const candleTime = now - i * intervalMs;
    const dateObj = new Date(candleTime);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getMonth()];
    const day = dateObj.getDate().toString().padStart(2, '0');
    const hours = dateObj.getHours().toString().padStart(2, '0');
    let timeStr = `${month} ${day}`;
    if (intervalMinutes >= 1440 || timeframe === 'D') {
      timeStr = `${month} ${day}`;
      if (rangeKey === '2y' || rangeKey === '5y' || rangeKey === 'max') {
        timeStr = `${month} '${dateObj.getFullYear().toString().slice(-2)}`;
      }
    } else if (intervalMinutes >= 60 || timeframe === '1H' || timeframe === '4H') {
      timeStr = `${month} ${day} ${hours}:00`;
    }

    const open = currentPrice;
    const targetPct = (stock.price - currentPrice) / currentPrice;
    const changePct = targetPct * 0.12 + (Math.random() - 0.48) * 0.015;
    const volumeBase = (stock.volume / barCount) * (0.4 + Math.random() * 1.2);

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
      volume,
      session: 'regular'
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
