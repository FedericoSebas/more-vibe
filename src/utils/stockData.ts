import { Candle, StockQuote, VolumeProfileLevel, MacdPoint, Timeframe, DateRangeKey, CustomDateRange } from '../types/stock';
import nasdaqStocksData from '../data/nasdaqStocks.json';

// Ticker string hash helper
function hashTicker(ticker: string): number {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = (hash << 5) - hash + ticker.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Curated high-conviction movers for Monday, October 26, 2026
const SPECIAL_OCT26_MOVERS: Record<string, Partial<StockQuote>> = {
  CLRO: {
    prevClose: 1.62,
    open: 1.98,
    price: 2.18,
    change: 0.56,
    changePercent: 34.57,
    openPercent: 22.22,
    volume: 34820400,
    high: 2.42,
    low: 1.85,
    m1Change: 0.45,
    m5Change: 1.82,
    m15Change: 3.60,
    h1Change: 8.40,
    h4Change: 34.57,
  },
  AIOK: {
    prevClose: 12.02,
    open: 13.20,
    price: 14.25,
    change: 2.23,
    changePercent: 18.55,
    openPercent: 9.82,
    volume: 28940000,
    high: 15.80,
    low: 12.10,
    m1Change: -0.15,
    m5Change: 1.20,
    m15Change: 2.85,
    h1Change: 6.10,
    h4Change: 18.55,
  },
  TORO: {
    prevClose: 4.28,
    open: 4.90,
    price: 5.72,
    change: 1.44,
    changePercent: 33.64,
    openPercent: 14.49,
    volume: 22410000,
    high: 6.15,
    low: 4.85,
    m1Change: 0.82,
    m5Change: 2.40,
    m15Change: 4.10,
    h1Change: 11.20,
    h4Change: 33.64,
  },
  LYCA: {
    prevClose: 4.60,
    open: 5.40,
    price: 6.85,
    change: 2.25,
    changePercent: 48.91,
    openPercent: 17.39,
    volume: 19850000,
    high: 7.20,
    low: 5.25,
    m1Change: 1.25,
    m5Change: 3.50,
    m15Change: 6.20,
    h1Change: 14.80,
    h4Change: 48.91,
  },
  GPUS: {
    prevClose: 1.30,
    open: 1.55,
    price: 1.86,
    change: 0.56,
    changePercent: 43.08,
    openPercent: 19.23,
    volume: 24500000,
    high: 2.05,
    low: 1.50,
    m1Change: 0.60,
    m5Change: 2.10,
    m15Change: 5.40,
    h1Change: 12.50,
    h4Change: 43.08,
  },
  JYD: {
    prevClose: 1.80,
    open: 2.10,
    price: 2.48,
    change: 0.68,
    changePercent: 37.78,
    openPercent: 16.67,
    volume: 18900000,
    high: 2.70,
    low: 2.05,
    m1Change: 0.50,
    m5Change: 1.90,
    m15Change: 4.80,
    h1Change: 10.40,
    h4Change: 37.78,
  },
  HTCO: {
    prevClose: 2.50,
    open: 2.85,
    price: 3.25,
    change: 0.75,
    changePercent: 30.00,
    openPercent: 14.00,
    volume: 12800000,
    high: 3.45,
    low: 2.80,
    m1Change: 0.35,
    m5Change: 1.60,
    m15Change: 3.90,
    h1Change: 8.90,
    h4Change: 30.00,
  },
  ESLA: {
    prevClose: 6.50,
    open: 7.40,
    price: 8.42,
    change: 1.92,
    changePercent: 29.54,
    openPercent: 13.85,
    volume: 17600000,
    high: 8.90,
    low: 7.20,
    m1Change: 0.70,
    m5Change: 2.20,
    m15Change: 4.50,
    h1Change: 9.80,
    h4Change: 29.54,
  },
  BOLT: {
    prevClose: 3.12,
    open: 3.50,
    price: 3.95,
    change: 0.83,
    changePercent: 26.60,
    openPercent: 12.18,
    volume: 14300000,
    high: 4.20,
    low: 3.45,
    m1Change: 0.40,
    m5Change: 1.50,
    m15Change: 3.20,
    h1Change: 7.50,
    h4Change: 26.60,
  },
  MYND: {
    prevClose: 3.40,
    open: 3.80,
    price: 4.15,
    change: 0.75,
    changePercent: 22.06,
    openPercent: 11.76,
    volume: 10200000,
    high: 4.38,
    low: 3.75,
    m1Change: 0.30,
    m5Change: 1.20,
    m15Change: 2.80,
    h1Change: 6.40,
    h4Change: 22.06,
  },
  NVDA: {
    prevClose: 141.54,
    open: 142.40,
    price: 143.85,
    change: 2.31,
    changePercent: 1.63,
    openPercent: 0.61,
    volume: 12940000,
    high: 144.50,
    low: 142.10,
    m1Change: 0.08,
    m5Change: 0.22,
    m15Change: 0.45,
    h1Change: 0.95,
    h4Change: 1.63,
  },
  TSLA: {
    prevClose: 269.19,
    open: 271.80,
    price: 274.50,
    change: 5.31,
    changePercent: 1.97,
    openPercent: 0.97,
    volume: 16420000,
    high: 276.10,
    low: 270.50,
    m1Change: 0.15,
    m5Change: 0.35,
    m15Change: 0.65,
    h1Change: 1.20,
    h4Change: 1.97,
  },
  AAPL: {
    prevClose: 231.41,
    open: 232.10,
    price: 233.20,
    change: 1.79,
    changePercent: 0.77,
    openPercent: 0.30,
    volume: 8950000,
    high: 233.80,
    low: 231.90,
    m1Change: 0.05,
    m5Change: 0.12,
    m15Change: 0.25,
    h1Change: 0.55,
    h4Change: 0.77,
  },
  AMD: {
    prevClose: 156.20,
    open: 157.10,
    price: 158.45,
    change: 2.25,
    changePercent: 1.44,
    openPercent: 0.58,
    volume: 7850000,
    high: 159.20,
    low: 156.80,
    m1Change: 0.10,
    m5Change: 0.25,
    m15Change: 0.50,
    h1Change: 0.90,
    h4Change: 1.44,
  },
  MSFT: {
    prevClose: 426.00,
    open: 427.20,
    price: 428.80,
    change: 2.80,
    changePercent: 0.66,
    openPercent: 0.28,
    volume: 5600000,
    high: 429.50,
    low: 426.80,
    m1Change: 0.04,
    m5Change: 0.10,
    m15Change: 0.20,
    h1Change: 0.45,
    h4Change: 0.66,
  },
  QQQ: {
    prevClose: 492.00,
    open: 494.10,
    price: 496.40,
    change: 4.40,
    changePercent: 0.89,
    openPercent: 0.43,
    volume: 15200000,
    high: 497.10,
    low: 493.80,
    m1Change: 0.06,
    m5Change: 0.18,
    m15Change: 0.35,
    h1Change: 0.70,
    h4Change: 0.89,
  },
  AMZN: {
    prevClose: 187.00,
    open: 187.80,
    price: 188.90,
    change: 1.90,
    changePercent: 1.02,
    openPercent: 0.43,
    volume: 7100000,
    high: 189.50,
    low: 187.50,
    m1Change: 0.08,
    m5Change: 0.15,
    m15Change: 0.30,
    h1Change: 0.65,
    h4Change: 1.02,
  },
  META: {
    prevClose: 587.50,
    open: 590.20,
    price: 594.60,
    change: 7.10,
    changePercent: 1.21,
    openPercent: 0.46,
    volume: 5200000,
    high: 596.00,
    low: 589.50,
    m1Change: 0.12,
    m5Change: 0.28,
    m15Change: 0.55,
    h1Change: 0.95,
    h4Change: 1.21,
  }
};

/**
 * Updates raw stock data (captured Friday Oct 23) to reflect the active Monday, October 26, 2026 market session
 */
export function updateStockQuotesToCurrentMarket(stocks: StockQuote[]): StockQuote[] {
  return stocks.map(stock => {
    const special = SPECIAL_OCT26_MOVERS[stock.ticker];
    if (special) {
      return {
        ...stock,
        ...special,
      };
    }

    // Friday's close becomes Monday's prevClose
    const fridayClose = stock.price > 0 ? stock.price : (stock.prevClose || 10.0);
    const prevClose = Math.round(fridayClose * 10000) / 10000;

    const seed = (hashTicker(stock.ticker) % 10000) / 10000;

    let pctChange = 0;
    if (seed < 0.04) {
      // 4% of market are Monday momentum runners (+20% to +48%)
      pctChange = 20.0 + seed * 700;
    } else if (seed < 0.18) {
      // Solid gainers (+5% to +19.9%)
      pctChange = 5.0 + (seed - 0.04) * 100;
    } else if (seed < 0.60) {
      // Moderate green (+0.1% to +4.9%)
      pctChange = 0.1 + (seed - 0.18) * 11.5;
    } else if (seed < 0.90) {
      // Moderate red (-0.1% to -4.5%)
      pctChange = -0.1 - (seed - 0.60) * 14.5;
    } else {
      // Pullback / dip (-4.5% to -14%)
      pctChange = -4.5 - (seed - 0.90) * 95;
    }

    const price = Math.max(0.01, Math.round(prevClose * (1 + pctChange / 100) * 10000) / 10000);
    const gapPct = pctChange * 0.65 + (seed - 0.5) * 1.2;
    const open = Math.max(0.01, Math.round(prevClose * (1 + gapPct / 100) * 10000) / 10000);
    const change = Math.round((price - prevClose) * 10000) / 10000;
    const changePercent = Number((((price - prevClose) / prevClose) * 100).toFixed(2));
    const openPercent = Number((((open - prevClose) / prevClose) * 100).toFixed(2));

    const volMultiplier = (seed < 0.04 ? 3.5 : (seed < 0.18 ? 1.8 : 0.8)) + seed * 0.4;
    const volume = Math.floor(Math.max(25000, (stock.avgVolume || 450000) * volMultiplier));

    const high = Math.round(Math.max(open, price, price * (1 + Math.abs(pctChange) * 0.003 + 0.008)) * 10000) / 10000;
    const low = Math.round(Math.min(open, price, price * (1 - Math.abs(pctChange) * 0.003 - 0.008)) * 10000) / 10000;

    const m1Change = Number(((seed - 0.48) * 0.35).toFixed(2));
    const m5Change = Number(((seed - 0.46) * 1.2).toFixed(2));
    const m15Change = Number(((seed - 0.45) * 2.5).toFixed(2));
    const h1Change = Number((pctChange * 0.4 + (seed - 0.5) * 2.0).toFixed(2));
    const h4Change = Number(pctChange.toFixed(2));

    return {
      ...stock,
      price,
      change,
      changePercent,
      openPercent,
      volume,
      high,
      low,
      open,
      prevClose,
      m1Change,
      m5Change,
      m15Change,
      h1Change,
      h4Change,
    };
  });
}

export function getEasternTimeParts(timeMs: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(new Date(timeMs));

  let year = 2026, month = 10, day = 26, hour = 0, minute = 0;
  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  }
  const minutesOfDay = hour * 60 + minute;
  let session: 'pre' | 'regular' | 'post' | 'overnight' = 'regular';
  if (minutesOfDay >= 1200 || minutesOfDay < 240) session = 'overnight';
  else if (minutesOfDay >= 240 && minutesOfDay < 570) session = 'pre';
  else if (minutesOfDay >= 570 && minutesOfDay < 960) session = 'regular';
  else session = 'post';

  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { year, month, day, hour, minute, minutesOfDay, session, timeStr };
}

// Comprehensive dataset containing all 3,431 NASDAQ stocks updated to Monday, October 26, 2026
export const INITIAL_STOCKS: StockQuote[] = updateStockQuotesToCurrentMarket(nasdaqStocksData as StockQuote[]);

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
        barCount = Math.max(1, Math.floor(960 / intervalMinutes));
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

  // Intraday 1D session: exactly 24-hour continuous market (trailing 1440 minutes up to current real-time)
  if (rangeKey === '1d' || (!rangeKey && (timeframe === '1M' || timeframe === '5M' || timeframe === '10M'))) {
    const stepMinutes = 
      timeframe === '1M' ? 1 : 
      timeframe === '10M' ? 10 : 
      timeframe === '1H' ? 60 : 
      timeframe === '4H' ? 240 : 
      timeframe === 'D' ? 1440 : 5;
    const stepMs = stepMinutes * 60 * 1000;
    const total1DBars = Math.max(1, Math.floor((24 * 60) / stepMinutes));
    const now = Date.now();
    const startTime = now - 24 * 60 * 60 * 1000;

    const startPrice = stock.prevClose || (stock.price * (1 - (stock.changePercent / 100) * 0.85));
    const targetPrice = stock.price;
    let price = startPrice;

    for (let i = 0; i < total1DBars; i++) {
      const barTime = startTime + i * stepMs;
      const et = getEasternTimeParts(barTime);
      const open = price;
      const progress = (i + 1) / total1DBars;
      const expected = startPrice + progress * (targetPrice - startPrice);
      const diff = (expected - price) / (price || 1);
      const changePct = diff * 0.16 + (Math.random() - 0.49) * 0.012;
      let close = Math.max(0.0001, Math.round(open * (1 + changePct) * 10000) / 10000);
      if (i === total1DBars - 1) {
        close = Math.round(stock.price * 10000) / 10000;
      }
      const volatility = Math.abs(close - open) * (1.1 + Math.random() * 1.4) + (open * 0.0008);
      const high = Math.round((Math.max(open, close) + Math.random() * volatility) * 10000) / 10000;
      const low = Math.round((Math.min(open, close) - Math.random() * volatility) * 10000) / 10000;
      const volume = Math.floor((stock.volume / total1DBars) * (0.4 + Math.random() * 1.4));

      candles.push({
        time: barTime,
        timeStr: et.timeStr,
        open: Math.round(open * 10000) / 10000,
        high: Math.max(open, close, high),
        low: Math.max(0.0001, Math.min(open, close, low)),
        close,
        volume,
        session: et.session
      });
      price = close;
    }

    return candles;
  }

  // 5D range: 5 distinct trading days (Tue Oct 20, Wed Oct 21, Thu Oct 22, Fri Oct 23, Mon Oct 26) with full 24-hour continuous market
  if (rangeKey === '5d') {
    const stepMinutes = 
      timeframe === '1M' ? 1 : 
      timeframe === '10M' ? 10 : 
      timeframe === '1H' ? 60 : 
      timeframe === '4H' ? 240 : 
      timeframe === 'D' ? 1440 : 5;
    const minutesPerDay = 24 * 60; // 1440 mins
    const barsPerDay = Math.max(1, Math.floor(minutesPerDay / stepMinutes));
    const tradingDayAnchors = [
      Date.UTC(2026, 9, 20, 0, 0, 0), // Tue Oct 20 (Mon 20:00 ET)
      Date.UTC(2026, 9, 21, 0, 0, 0), // Wed Oct 21 (Tue 20:00 ET)
      Date.UTC(2026, 9, 22, 0, 0, 0), // Thu Oct 22 (Wed 20:00 ET)
      Date.UTC(2026, 9, 23, 0, 0, 0), // Fri Oct 23 (Thu 20:00 ET)
      Date.UTC(2026, 9, 26, 0, 0, 0), // Mon Oct 26 (Sun 20:00 ET)
    ];
    const days = tradingDayAnchors.length;

    let price = stock.price * (1 - (stock.changePercent / 100) * 0.7);

    for (let dayIdx = 0; dayIdx < days; dayIdx++) {
      const dayStartMs = tradingDayAnchors[dayIdx];
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
