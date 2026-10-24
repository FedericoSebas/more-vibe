import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
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

// Helper to fetch live chart from Yahoo Finance
// Helper to fetch live chart from Yahoo Finance with genuine timeframe aggregation
async function fetchYahooChart(symbol: string, timeframe = '5M') {
  const tf = timeframe.toUpperCase();
  let interval = '5m';
  let range = '5d';

  if (tf === '1M') {
    interval = '1m';
    range = '2d';
  } else if (tf === '5M') {
    interval = '5m';
    range = '5d';
  } else if (tf === '10M') {
    // Fetch 5m bars over 10d and aggregate every 2 bars into true 10m candles
    interval = '5m';
    range = '10d';
  } else if (tf === '1H') {
    interval = '60m';
    range = '1mo';
  } else if (tf === '4H') {
    // Fetch 60m bars over 3mo and aggregate every 4 bars into true 4h candles
    interval = '60m';
    range = '3mo';
  } else if (tf === 'D' || tf === '1D') {
    interval = '1d';
    range = '1y';
  }

  const cacheKey = `${symbol}_${tf}`;
  const cached = chartCache[cacheKey];
  const now = Date.now();
  // Cache for 8 seconds
  if (cached && now - cached.timestamp < 8000) {
    return cached.data;
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
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
    if (tf === 'D' || tf === '1D') {
      timeStr = `${month} ${day}`;
    } else if (tf === '1H' || tf === '4H') {
      timeStr = `${month} ${day} ${hours}:00`;
    }

    rawBars.push({
      time: timeMs,
      timeStr,
      open: Number(o.toFixed(2)),
      high: Number(h.toFixed(2)),
      low: Number(l.toFixed(2)),
      close: Number(c.toFixed(2)),
      volume: Math.floor(v)
    });
  }

  // Proper timeframe aggregation
  let candles = rawBars;

  if (tf === '10M') {
    // Merge every 2 consecutive 5m bars into a true 10m bar
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
          high: Number(Math.max(b1.high, b2.high).toFixed(2)),
          low: Number(Math.min(b1.low, b2.low).toFixed(2)),
          close: b2.close,
          volume: b1.volume + b2.volume
        });
      }
    }
  } else if (tf === '4H') {
    // Merge every 4 consecutive 1h bars into a true 4h bar
    candles = [];
    for (let i = 0; i < rawBars.length; i += 4) {
      const chunk = rawBars.slice(i, i + 4);
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
        high: Number(h.toFixed(2)),
        low: Number(l.toFixed(2)),
        close: bLast.close,
        volume: v
      });
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
      price: Number(currentPrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      prevClose: Number(prevClose.toFixed(2)),
      open: Number((meta.regularMarketOpen || (candles[0]?.open ?? currentPrice)).toFixed(2)),
      high: Number((meta.regularMarketDayHigh || meta.dayHigh || currentPrice).toFixed(2)),
      low: Number((meta.regularMarketDayLow || meta.dayLow || currentPrice).toFixed(2)),
      volume: meta.regularMarketVolume || meta.dayVolume || (candles.reduce((acc, c) => acc + c.volume, 0)),
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || null
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

    const data = await fetchYahooChart(ticker, timeframe);
    res.json(data);
  } catch (err: any) {
    console.error(`Error fetching chart for ${req.params.ticker}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Route: Live NASDAQ Scanner Quotes
app.get('/api/stock/scanner', async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    const cached = quoteCache['nasdaq_scanner'];
    // 10s cache for scanner batch
    if (cached && now - cached.timestamp < 10000) {
      return res.json(cached.data);
    }

    const quotes = await Promise.allSettled(
      NASDAQ_SYMBOLS.map(sym => fetchYahooChart(sym, '5M'))
    );

    const successful = quotes
      .filter((q): q is PromiseFulfilledResult<any> => q.status === 'fulfilled')
      .map(q => {
        const item = q.value;
        const candles = item.candles || [];
        const last = candles[candles.length - 1];
        const first = candles[0];
        const m1 = candles[candles.length - 2] ? ((last.close - candles[candles.length - 2].close) / candles[candles.length - 2].close) * 100 : 0;
        const m5 = candles[candles.length - 3] ? ((last.close - candles[candles.length - 3].close) / candles[candles.length - 3].close) * 100 : 0;
        const m15 = candles[candles.length - 5] ? ((last.close - candles[candles.length - 5].close) / candles[candles.length - 5].close) * 100 : 0;
        const h1 = candles[candles.length - 13] ? ((last.close - candles[candles.length - 13].close) / candles[candles.length - 13].close) * 100 : 0;
        const h4 = candles[candles.length - 49] ? ((last.close - candles[candles.length - 49].close) / candles[candles.length - 49].close) * 100 : 0;

        return {
          ticker: item.ticker,
          price: item.meta.price,
          change: item.meta.change,
          changePercent: item.meta.changePercent,
          openPercent: first ? Number((((item.meta.price - first.open) / first.open) * 100).toFixed(2)) : 0,
          volume: item.meta.volume,
          high: item.meta.high,
          low: item.meta.low,
          open: item.meta.open,
          prevClose: item.meta.prevClose,
          m1Change: Number(m1.toFixed(2)),
          m5Change: Number(m5.toFixed(2)),
          m15Change: Number(m15.toFixed(2)),
          h1Change: Number(h1.toFixed(2)),
          h4Change: Number(h4.toFixed(2)),
        };
      });

    quoteCache['nasdaq_scanner'] = { data: successful, timestamp: now };
    res.json(successful);
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
