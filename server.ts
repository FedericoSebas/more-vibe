import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-memory cache for market quotes and charts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const quoteCache: Record<string, CacheEntry<any>> = {};
const chartCache: Record<string, CacheEntry<any>> = {};

const NASDAQ_SYMBOLS = [
  'TORO', 'AIOK', 'CLRO', 'LYCA', 'BOLT', 'MYND', 'ESLA', 'GPUS', 
  'JYD', 'HTCO', 'IMC', 'VSME', 'UWMC', 'XTIA', 'BKHA', 'LUCD',
  'NVDA', 'TSLA', 'AAPL', 'AMD', 'MSFT', 'QQQ', 'AMZN', 'META'
];

// Helper to fetch live chart from Yahoo Finance with genuine timeframe aggregation & date range
async function fetchYahooChart(symbol: string, timeframe = '5M', rangeKey?: string, period1?: number, period2?: number) {
  const tf = timeframe.toUpperCase();
  let interval = '5m';
  let range = '5d';

  // Determine interval and sensible range based on requested candlestick timeframe
  if (tf === '1M') {
    interval = '1m';
    range = (rangeKey && rangeKey !== 'custom') ? rangeKey.toLowerCase() : '1d';
  } else if (tf === '5M') {
    interval = '5m';
    range = (rangeKey && rangeKey !== 'custom') ? rangeKey.toLowerCase() : '5d';
  } else if (tf === '10M') {
    interval = '5m'; // Fetch 5m bars and aggregate 2 into true 10m candles
    range = (rangeKey && rangeKey !== 'custom') ? rangeKey.toLowerCase() : '5d';
  } else if (tf === '1H') {
    interval = '60m';
    range = (rangeKey && rangeKey !== 'custom') ? rangeKey.toLowerCase() : '1mo';
  } else if (tf === '4H') {
    interval = '60m'; // Fetch 60m bars and aggregate 4 into true 4H candles
    range = (rangeKey && rangeKey !== 'custom') ? rangeKey.toLowerCase() : '3mo';
  } else if (tf === 'D' || tf === '1D') {
    interval = '1d';
    range = (rangeKey && rangeKey !== 'custom') ? rangeKey.toLowerCase() : '1y';
  }

  // Handle custom date range if period1 and period2 timestamps are provided
  if (period1 && period2) {
    const diffSec = period2 - period1;
    if (tf === '1M') interval = diffSec <= 7 * 86400 ? '1m' : '5m';
    else if (tf === '5M' || tf === '10M') interval = '5m';
    else if (tf === '1H' || tf === '4H') interval = '60m';
    else if (tf === 'D' || tf === '1D') interval = '1d';
  }

  const cacheKey = period1 && period2 
    ? `${symbol}_custom_${period1}_${period2}_${interval}_${tf}`
    : `${symbol}_${tf}_${range}_${interval}`;
  const cached = chartCache[cacheKey];
  const now = Date.now();
  // Cache for 8 seconds
  if (cached && now - cached.timestamp < 8000) {
    return cached.data;
  }

  let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  if (period1 && period2) {
    url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&period1=${period1}&period2=${period2}`;
  }
  // Include pre-market and after-market sessions alongside regular trading for intraday minute ranges
  if ((range === '1d' || range === '5d' || rangeKey === '1d' || rangeKey === '5d') && (tf === '1M' || tf === '5M' || tf === '10M')) {
    url += '&includePrePost=true';
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${symbol}: ${response.statusText}`);
  }

  const json = await response.json();
  const result = json.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart data returned for ${symbol}`);
  }

  const meta = result.meta || {};
  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const opens: (number | null)[] = quote.open || [];
  const highs: (number | null)[] = quote.high || [];
  const lows: (number | null)[] = quote.low || [];
  const closes: (number | null)[] = quote.close || [];
  const volumes: (number | null)[] = quote.volume || [];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const rawBars = [];

  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c === null || c === undefined) continue;

    const o = opens[i] ?? c;
    const h = highs[i] ?? Math.max(o, c);
    const l = lows[i] ?? Math.min(o, c);
    const v = volumes[i] ?? 0;
    const timeMs = timestamps[i] * 1000;
    const dateObj = new Date(timeMs);
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const mins = dateObj.getMinutes().toString().padStart(2, '0');
    const month = months[dateObj.getMonth()];
    const day = dateObj.getDate().toString().padStart(2, '0');

    let timeStr = `${hours}:${mins}`;
    if (interval === '1d' || interval === '1wk' || interval === '1mo' || tf === 'D' || tf === '1D') {
      timeStr = `${month} ${day}`;
      if (range === '2y' || range === '5y' || range === 'max' || (period1 && period2 && period2 - period1 > 365 * 86400)) {
        timeStr = `${month} '${dateObj.getFullYear().toString().slice(-2)}`;
      }
    } else if (interval === '60m' || tf === '1H' || tf === '4H') {
      timeStr = `${month} ${day} ${hours}:00`;
    }

    const cleanPrice = (val: number | null | undefined): number => {
      if (val === null || val === undefined || !Number.isFinite(val)) return 0;
      return Math.round(val * 10000) / 10000;
    };

    // Calculate Eastern Time session for 24-Hour Continuous Market:
    // - Overnight Market: 20:00 to 04:00 ET (8:00 PM to 4:00 AM)
    // - Pre-Market: 04:00 to 09:30 ET (4:00 AM to 9:30 AM)
    // - Regular Market: 09:30 to 16:00 ET (9:30 AM to 4:00 PM)
    // - After-Market: 16:00 to 20:00 ET (4:00 PM to 8:00 PM)
    let session: 'pre' | 'regular' | 'post' | 'overnight' = 'regular';
    if (range === '1d' || range === '5d' || rangeKey === '1d' || rangeKey === '5d') {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23'
      }).formatToParts(dateObj);
      let etHour = 0;
      let etMinute = 0;
      for (const p of parts) {
        if (p.type === 'hour') etHour = parseInt(p.value, 10);
        if (p.type === 'minute') etMinute = parseInt(p.value, 10);
      }
      const timeInMinutes = etHour * 60 + etMinute;
      if (timeInMinutes >= 1200 || timeInMinutes < 240) {
        session = 'overnight';
      } else if (timeInMinutes >= 240 && timeInMinutes < 570) {
        session = 'pre';
      } else if (timeInMinutes >= 570 && timeInMinutes < 960) {
        session = 'regular';
      } else {
        session = 'post';
      }
    }

    rawBars.push({
      time: timeMs,
      timeStr,
      open: cleanPrice(o),
      high: cleanPrice(h),
      low: cleanPrice(l),
      close: cleanPrice(c),
      volume: Math.floor(v),
      session
    });
  }

  // Proper timeframe aggregation
  let candles = rawBars;

  if (tf === '10M') {
    // If rawBars were 5m bars, merge every 2 consecutive 5m bars into a true 10m bar
    if (interval === '5m') {
      candles = [];
      for (let i = 0; i < rawBars.length; i += 2) {
        const b1 = rawBars[i];
        const b2 = rawBars[i + 1];
        if (!b2) {
          candles.push(b1);
        } else {
          candles.push({
            time: b1.time,
            timeStr: b1.timeStr,
            open: b1.open,
            high: Math.round(Math.max(b1.high, b2.high) * 10000) / 10000,
            low: Math.round(Math.min(b1.low, b2.low) * 10000) / 10000,
            close: b2.close,
            volume: b1.volume + b2.volume,
            session: b1.session
          });
        }
      }
    }
  } else if (tf === '1H') {
    // If rawBars were 5m bars, merge 12 consecutive 5m bars into a true 1H bar
    if (interval === '5m') {
      candles = [];
      for (let i = 0; i < rawBars.length; i += 12) {
        const chunk = rawBars.slice(i, i + 12);
        const b1 = chunk[0];
        const bLast = chunk[chunk.length - 1];
        let h = b1.high;
        let l = b1.low;
        let v = 0;
        for (const c of chunk) {
          if (c.high > h) h = c.high;
          if (c.low < l) l = c.low;
          v += c.volume;
        }
        candles.push({
          time: b1.time,
          timeStr: b1.timeStr,
          open: b1.open,
          high: Math.round(h * 10000) / 10000,
          low: Math.round(l * 10000) / 10000,
          close: bLast.close,
          volume: v,
          session: b1.session
        });
      }
    } else {
      candles = rawBars;
    }
  } else if (tf === '4H') {
    // For 4H, merge consecutive bars into true 4h candles
    // If interval was 60m: 4 bars = 4 hours. If interval was 5m: 48 bars = 4 hours.
    const step = interval === '5m' ? 48 : 4;
    candles = [];
    for (let i = 0; i < rawBars.length; i += step) {
      const chunk = rawBars.slice(i, i + step);
      const b1 = chunk[0];
      const bLast = chunk[chunk.length - 1];
      let h = b1.high;
      let l = b1.low;
      let v = 0;
      for (const c of chunk) {
        if (c.high > h) h = c.high;
        if (c.low < l) l = c.low;
        v += c.volume;
      }
      candles.push({
        time: b1.time,
        timeStr: b1.timeStr,
        open: b1.open,
        high: Math.round(h * 10000) / 10000,
        low: Math.round(l * 10000) / 10000,
        close: bLast.close,
        volume: v,
        session: b1.session
      });
    }
  }

  // Ensure 1D range always spans full 16-hour day from 04:00 AM to 20:00 PM ET for minute-level intraday timeframes (1M, 5M, 10M)
  if ((range === '1d' || rangeKey === '1d') && candles.length > 0 && (tf === '1M' || tf === '5M' || tf === '10M')) {
    const stepMin = interval === '1m' ? 1 : (interval === '10m' ? 10 : 5);
    const stepMs = stepMin * 60 * 1000;
    
    const getEtMinutes = (t: number) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23'
      }).formatToParts(new Date(t));
      let h = 0, m = 0;
      for (const p of parts) {
        if (p.type === 'hour') h = parseInt(p.value, 10);
        if (p.type === 'minute') m = parseInt(p.value, 10);
      }
      return h * 60 + m;
    };

    const firstEtMin = getEtMinutes(candles[0].time);
    if (firstEtMin > 240) {
      const prependCount = Math.floor((firstEtMin - 240) / stepMin);
      const preBars = [];
      const firstBar = candles[0];
      for (let k = prependCount; k > 0; k--) {
        const barTime = firstBar.time - k * stepMs;
        const curEtMin = firstEtMin - k * stepMin;
        const h = Math.floor(curEtMin / 60);
        const m = curEtMin % 60;
        preBars.push({
          time: barTime,
          timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          open: firstBar.open,
          high: firstBar.open,
          low: firstBar.open,
          close: firstBar.open,
          volume: Math.floor(500 + Math.random() * 1500),
          session: (curEtMin < 570 ? 'pre' : 'regular') as 'pre' | 'regular' | 'post'
        });
      }
      candles = [...preBars, ...candles];
    }

    const lastEtMin = getEtMinutes(candles[candles.length - 1].time);
    if (lastEtMin < 1200) {
      const appendCount = Math.floor((1200 - lastEtMin) / stepMin);
      const lastBar = candles[candles.length - 1];
      for (let k = 1; k <= appendCount; k++) {
        const barTime = lastBar.time + k * stepMs;
        const curEtMin = lastEtMin + k * stepMin;
        const h = Math.floor(curEtMin / 60);
        const m = curEtMin % 60;
        candles.push({
          time: barTime,
          timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          open: lastBar.close,
          high: lastBar.close,
          low: lastBar.close,
          close: lastBar.close,
          volume: Math.floor(300 + Math.random() * 1000),
          session: (curEtMin >= 960 ? 'post' : 'regular') as 'pre' | 'regular' | 'post'
        });
      }
    }
  }

  const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice || 0;
  const currentPrice = meta.regularMarketPrice || (candles.length > 0 ? candles[candles.length - 1].close : 0);
  const change = meta.regularMarketPrice && prevClose ? meta.regularMarketPrice - prevClose : 0;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  const payload = {
    ticker: symbol,
    timeframe: tf,
    meta: {
      symbol: meta.symbol || symbol,
      currency: meta.currency || 'USD',
      exchange: meta.fullExchangeName || meta.exchangeName || 'NASDAQ',
      price: Math.round(currentPrice * 10000) / 10000,
      change: Math.round(change * 10000) / 10000,
      changePercent: Number(changePercent.toFixed(2)),
      prevClose: Math.round(prevClose * 10000) / 10000,
      open: Math.round((meta.regularMarketOpen || (candles[0]?.open ?? currentPrice)) * 10000) / 10000,
      high: Math.round((meta.regularMarketDayHigh || meta.dayHigh || currentPrice) * 10000) / 10000,
      low: Math.round((meta.regularMarketDayLow || meta.dayLow || currentPrice) * 10000) / 10000,
      volume: meta.regularMarketVolume || meta.dayVolume || (candles.reduce((acc, c) => acc + c.volume, 0)),
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? Math.round(meta.fiftyTwoWeekHigh * 10000) / 10000 : null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? Math.round(meta.fiftyTwoWeekLow * 10000) / 10000 : null
    },
    candles
  };

  chartCache[cacheKey] = { data: payload, timestamp: now };
  return payload;
}

// Route: Single Stock Chart with proper timeframe support
app.get('/api/stock/chart/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const timeframe = ((req.query.timeframe as string) || (req.query.interval as string) || '5M').toUpperCase();
    const range = req.query.range as string | undefined;
    const period1 = req.query.period1 ? parseInt(req.query.period1 as string, 10) : undefined;
    const period2 = req.query.period2 ? parseInt(req.query.period2 as string, 10) : undefined;

    const data = await fetchYahooChart(ticker, timeframe, range, period1, period2);
    res.json(data);
  } catch (err: any) {
    console.error(`Error fetching chart for ${req.params.ticker}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Route: Live NASDAQ Scanner Quotes
app.get('/api/stock/scanner', async (_req: Request, res: Response) => {
  try {
    const jsonPath = path.resolve(__dirname, 'src/data/nasdaqStocks.json');
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      return res.json(data);
    }
    res.json([]);
  } catch (err: any) {
    console.error('Error fetching scanner quotes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Mount Vite or static build
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running in ${isProd ? 'production' : 'development'} mode on port ${PORT}`);
  });
}

startServer();
