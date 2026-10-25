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

  // Candlestick resolution is strictly dictated by the chosen timeframe
  let intervalMinutes = 5;
  if (timeframe === '1M') intervalMinutes = 1;
  else if (timeframe === '5M') intervalMinutes = 5;
  else if (timeframe === '10M') intervalMinutes = 10;
  else if (timeframe === '1H') intervalMinutes = 60;
  else if (timeframe === '4H') intervalMinutes = 240;
  else if (timeframe === 'D') intervalMinutes = 1440;

  let barCount = 360; // Historical bar count for smooth bidirectional panning & time stretching

  if (rangeKey && rangeKey !== 'custom') {
    switch (rangeKey) {
      case '1d':
        barCount = Math.max(1, Math.floor(1440 / intervalMinutes));
        break;
      case '5d':
        barCount = Math.max(1, Math.floor((5 * 1440) / intervalMinutes));
        break;
      case '1mo':
        barCount = timeframe === '4H' ? 180 : (timeframe === '1H' ? 240 : (timeframe === 'D' ? 30 : 280));
        break;
      case '3mo':
        barCount = timeframe === '4H' ? 360 : (timeframe === '1H' ? 360 : (timeframe === 'D' ? 90 : 360));
        break;
      case '6mo':
        barCount = timeframe === 'D' ? 130 : 260;
        break;
      case 'ytd':
        barCount = timeframe === 'D' ? 200 : 260;
        break;
      case '1y':
        barCount = timeframe === 'D' ? 252 : 360;
        break;
      case '2y':
        barCount = timeframe === 'D' ? 504 : 360;
        break;
      case '5y':
        barCount = 260;
        intervalMinutes = 10080;
        break;
      case 'max':
        barCount = 120;
        intervalMinutes = 43200;
        break;
    }
  } else if (rangeKey === 'custom' && customRange) {
    const startMs = new Date(customRange.startDate).getTime();
    const endMs = new Date(customRange.endDate).getTime();
    const diffDays = Math.max(1, (endMs - startMs) / 86400000);
    barCount = Math.min(1000, Math.max(10, Math.round((diffDays * 1440) / intervalMinutes)));
  }

  // Intraday 1D session: exactly 24 hours continuous market (20:00 PM ET previous day to 20:00 PM ET)
  if (rangeKey === '1d' || (!rangeKey && (timeframe === '1M' || timeframe === '5M' || timeframe === '10M'))) {
    const stepMinutes = 
      timeframe === '1M' ? 1 : 
      timeframe === '10M' ? 10 : 
      timeframe === '1H' ? 60 : 
      timeframe === '4H' ? 240 : 
      timeframe === 'D' ? 1440 : 5;
    const totalMinutes = 24 * 60; // 1440 minutes = full 24 hours
    const barsCount = Math.max(1, Math.floor(totalMinutes / stepMinutes));

    // Anchor to 20:00 EDT (00:00 UTC Oct 23, 2024) bridging into full 24h market
    const baseAnchorMs = Date.UTC(2024, 9, 23, 0, 0, 0);

    let price = stock.ticker === 'AIOK' ? 2.22 : (stock.ticker === 'TORO' ? 3.68 : stock.price * (1 - (stock.changePercent / 100) * 0.85));

    for (let idx = 0; idx < barsCount; idx++) {
      const minuteOffset = idx * stepMinutes;
      const barTime = baseAnchorMs + minuteOffset * 60 * 1000;
      // Start at 20:00 ET (1200 minutes from 00:00)
      const etMinutesOfDay = (1200 + minuteOffset) % 1440;
      const etHour = Math.floor(etMinutesOfDay / 60);
      const etMinute = etMinutesOfDay % 60;
      const timeStr = `${String(etHour).padStart(2, '0')}:${String(etMinute).padStart(2, '0')}`;

      // 24-Hour Continuous Market Sessions (Eastern Time):
      // - Overnight Market: 20:00 to 04:00 ET (8:00 PM to 4:00 AM)
      // - Pre-Market: 04:00 to 09:30 ET (4:00 AM to 9:30 AM)
      // - Regular Market: 09:30 to 16:00 ET (9:30 AM to 4:00 PM)
      // - After-Market: 16:00 to 20:00 ET (4:00 PM to 8:00 PM)
      let session: 'pre' | 'regular' | 'post' | 'overnight' = 'regular';
      if (etMinutesOfDay >= 1200 || etMinutesOfDay < 240) {
        session = 'overnight';
      } else if (etMinutesOfDay >= 240 && etMinutesOfDay < 570) {
        session = 'pre';
      } else if (etMinutesOfDay >= 570 && etMinutesOfDay < 960) {
        session = 'regular';
      } else {
        session = 'post';
      }

      const open = price;
      let changePct = 0;
      let volume = 1500;

      if (stock.ticker === 'AIOK') {
        // High-fidelity reproduction of Image 2 AIOK curve ($12.02, +182.82%, High $14.80, Low $2.20)
        if (minuteOffset < 480) {
          // Overnight Market (8:00 PM - 4:00 AM): Quiet baseline trading around 2.20 - 2.25
          changePct = (Math.random() - 0.49) * 0.004;
          volume = Math.floor(600 + Math.random() * 2000);
        } else if (minuteOffset < 810) {
          // Pre-Market (4:00 AM - 9:30 AM): Base accumulation between 2.20 and 2.45
          changePct = (Math.random() - 0.49) * 0.006;
          volume = Math.floor(1000 + Math.random() * 4000);
        } else if (minuteOffset === 810) {
          // 9:30 AM Opening bell breakout gap!
          changePct = 0.28 + Math.random() * 0.08;
          volume = Math.floor(450000 + Math.random() * 100000);
        } else if (minuteOffset < 870) {
          // 9:31 - 10:30 AM: Massive surge running from $3 up to High of Day $14.80
          const progress = (minuteOffset - 810) / 60;
          const targetPrice = 3.2 + progress * (14.80 - 3.2);
          const diff = (targetPrice - price) / price;
          changePct = diff * 0.4 + (Math.random() - 0.35) * 0.025;
          volume = Math.floor(120000 + Math.random() * 180000);
        } else if (minuteOffset < 960) {
          // 10:30 AM - 12:00 PM: Natural pullback from $14.80 down to $9.80 - $10.40
          const progress = (minuteOffset - 870) / 90;
          const targetPrice = 14.80 - progress * (14.80 - 10.10);
          const diff = (targetPrice - price) / price;
          changePct = diff * 0.25 + (Math.random() - 0.55) * 0.018;
          volume = Math.floor(45000 + Math.random() * 65000);
        } else if (minuteOffset < 1200) {
          // 12:00 PM - 4:00 PM: Consolidation & climb from $10.10 toward $11.60
          const progress = (minuteOffset - 960) / 240;
          const targetPrice = 10.10 + progress * (11.65 - 10.10);
          const diff = (targetPrice - price) / price;
          changePct = diff * 0.15 + (Math.random() - 0.48) * 0.012;
          volume = Math.floor(35000 + Math.random() * 55000);
        } else {
          // 4:00 PM - 8:00 PM (After-Market): Secondary rally settling right at $12.0200
          const progress = (minuteOffset - 1200) / 240;
          const targetPrice = 11.65 + progress * (12.02 - 11.65);
          const diff = (targetPrice - price) / price;
          changePct = diff * 0.18 + (Math.random() - 0.5) * 0.008;
          volume = Math.floor(15000 + Math.random() * 30000);
        }
      } else if (stock.ticker === 'TORO') {
        if (minuteOffset < 480) {
          // Overnight
          changePct = (Math.random() - 0.49) * 0.004;
          volume = Math.floor(1200 + Math.random() * 3000);
        } else if (minuteOffset < 810) {
          // Pre-Market
          changePct = (Math.random() - 0.49) * 0.005;
          volume = Math.floor(2000 + Math.random() * 6000);
        } else if (minuteOffset === 810) {
          // 9:30 AM
          changePct = 0.12 + Math.random() * 0.04;
          volume = 280000;
        } else if (minuteOffset < 870) {
          changePct = (Math.random() - 0.3) * 0.022;
          volume = Math.floor(35000 + Math.random() * 50000);
        } else if (minuteOffset < 1200) {
          changePct = (Math.random() - 0.52) * 0.015;
          volume = Math.floor(12000 + Math.random() * 25000);
        } else {
          // After-Market
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
        if (minuteOffset >= 860 && minuteOffset <= 875) {
          high = Math.max(high, 14.8000);
        }
        if (minuteOffset < 810) {
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

  // 5D range: 5 distinct trading days with full 24-hour continuous market (Overnight, Pre, Reg, Post)
  if (rangeKey === '5d') {
    const stepMinutes = 
      timeframe === '1M' ? 1 : 
      timeframe === '10M' ? 10 : 
      timeframe === '1H' ? 60 : 
      timeframe === '4H' ? 240 : 
      timeframe === 'D' ? 1440 : 5;
    const minutesPerDay = 24 * 60; // 1440 mins
    const barsPerDay = Math.max(1, Math.floor(minutesPerDay / stepMinutes));
    const days = 5;
    const baseAnchorMs = Date.UTC(2024, 9, 18, 0, 0, 0); // 5 trading days earlier at 20:00 EDT

    let price = stock.price * (1 - (stock.changePercent / 100) * 0.7);

    for (let dayIdx = 0; dayIdx < days; dayIdx++) {
      const dayStartMs = baseAnchorMs + dayIdx * 24 * 60 * 60 * 1000;
      for (let b = 0; b < barsPerDay; b++) {
        const minuteOffset = b * stepMinutes;
        const barTime = dayStartMs + minuteOffset * 60 * 1000;
        const etMinutesOfDay = (1200 + minuteOffset) % 1440;
        const etHour = Math.floor(etMinutesOfDay / 60);
        const etMinute = etMinutesOfDay % 60;
        const timeStr = `${String(etHour).padStart(2, '0')}:${String(etMinute).padStart(2, '0')}`;

        let session: 'pre' | 'regular' | 'post' | 'overnight' = 'regular';
        if (etMinutesOfDay >= 1200 || etMinutesOfDay < 240) session = 'overnight';
        else if (etMinutesOfDay >= 240 && etMinutesOfDay < 570) session = 'pre';
        else if (etMinutesOfDay >= 570 && etMinutesOfDay < 960) session = 'regular';
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
  let anchorTime = now;
  if (intervalMinutes === 240) {
    anchorTime = Math.floor(now / (4 * 3600 * 1000)) * (4 * 3600 * 1000);
  } else if (intervalMinutes === 60) {
    anchorTime = Math.floor(now / (3600 * 1000)) * (3600 * 1000);
  } else if (intervalMinutes === 10) {
    anchorTime = Math.floor(now / (10 * 60 * 1000)) * (10 * 60 * 1000);
  } else if (intervalMinutes === 5) {
    anchorTime = Math.floor(now / (5 * 60 * 1000)) * (5 * 60 * 1000);
  } else if (intervalMinutes === 1) {
    anchorTime = Math.floor(now / (60 * 1000)) * (60 * 1000);
  }

  let currentPrice = stock.ticker === 'TORO' ? 3.68 : stock.price * (1 - stock.changePercent / 100 * 0.85);

  for (let i = barCount - 1; i >= 0; i--) {
    const candleTime = anchorTime - i * intervalMs;
    const dateObj = new Date(candleTime);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getMonth()];
    const day = dateObj.getDate().toString().padStart(2, '0');
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const mins = dateObj.getMinutes().toString().padStart(2, '0');
    let timeStr = `${month} ${day}`;
    if (intervalMinutes >= 1440 || timeframe === 'D') {
      timeStr = `${month} ${day}`;
      if (rangeKey === '2y' || rangeKey === '5y' || rangeKey === 'max') {
        timeStr = `${month} '${dateObj.getFullYear().toString().slice(-2)}`;
      }
    } else if (intervalMinutes >= 60 || timeframe === '1H' || timeframe === '4H') {
      timeStr = `${month} ${day} ${hours}:${mins}`;
    } else {
      timeStr = `${hours}:${mins}`;
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
