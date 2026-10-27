import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================
export interface StockData {
  symbol: string;
  ticker: string;
  name: string;
  companyName: string;
  price: number;
  lastSale: number | string;
  change: number;
  netChange: number;
  changePercent: number;
  pctchange: number;
  pChange: number;
  changesPercentage: number;
  marketCap: number | string;
  volume: number;
  avgVolume?: number;
  open?: number;
  high?: number;
  low?: number;
  prevClose?: number;
  openPercent?: number;
  exchange?: string;       // <--- ADD THIS
  market?: string;         // <--- ADD THIS
  pe?: number | null;
  peRatio?: number | null;
  high52?: number | null;
  fiftyTwoWeekHigh?: number | null;
  high52w?: number | null;
  low52?: number | null;
  fiftyTwoWeekLow?: number | null;
  low52w?: number | null;
  sector: string;
  industry: string;
  description?: string;
  tagColor?: string;
  isFavorite?: boolean;
  floatShares?: string;
  m1Change?: number;
  m5Change?: number;
  m15Change?: number;
  h1Change?: number;
  h4Change?: number;
  updatedAt: string;
}
// Color palette for ticker tags
const TAG_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];
function assignTagColor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash << 5) - hash + symbol.charCodeAt(i);
    hash |= 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// Helper: Calculate Change from Open %: ((Current Price - Today's Open) / Today's Open) * 100
function calculateOpenPercent(currentPrice: number, todayOpen: number): number {
  if (!todayOpen || todayOpen <= 0) return 0;
  const pct = ((currentPrice - todayOpen) / todayOpen) * 100;
  return Number(pct.toFixed(2));
}

// ============================================================================
// Yahoo Finance Authentication & Session Management (Cookie + Crumb)
// ============================================================================
interface YahooSession {
  cookie: string;
  crumb: string;
  timestamp: number;
}
let yahooSession: YahooSession | null = null;
let sessionPromise: Promise<YahooSession | null> | null = null;

async function fetchSingleQuoteViaChart(symbol: string): Promise<StockData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const open = meta.regularMarketOpen || price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;
    const exchange = cleanExchangeName(meta.exchangeName, meta.fullExchangeName);

    return {
      symbol,
      ticker: symbol,
      name: meta.shortName || meta.symbol || symbol,
      companyName: meta.longName || meta.shortName || symbol,
      price,
      lastSale: price,
      change: Math.round(change * 10000) / 10000,
      netChange: Math.round(change * 10000) / 10000,
      changePercent: Number(changePercent.toFixed(2)),
      pctchange: Number(changePercent.toFixed(2)),
      pChange: Number(changePercent.toFixed(2)),
      changesPercentage: Number(changePercent.toFixed(2)),
      volume: meta.regularMarketVolume || 0,
      open,
      high: meta.regularMarketDayHigh || price,
      low: meta.regularMarketDayLow || price,
      prevClose,
      openPercent: calculateOpenPercent(price, open),
      marketCap: 0,
      exchange,
      market: exchange,
      tagColor: assignTagColor(symbol),
      sector: 'Equities',
      industry: 'General',
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function getYahooSession(force = false): Promise<YahooSession | null> {
  const now = Date.now();
  if (!force && yahooSession && now - yahooSession.timestamp < 30 * 60 * 1000) {
    return yahooSession;
  }
  if (sessionPromise && !force) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    try {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
      const cookieRes = await fetch('https://fc.yahoo.com', {
        headers: { 'User-Agent': ua },
      });
      const rawCookie = cookieRes.headers.get('set-cookie');
      if (!rawCookie) {
        console.warn('[Yahoo Finance] No cookie header from fc.yahoo.com');
        return null;
      }

      const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
        headers: {
          Cookie: rawCookie,
          'User-Agent': ua,
        },
      });

      if (!crumbRes.ok) {
        console.warn(`[Yahoo Finance] getcrumb returned status ${crumbRes.status}`);
        return null;
      }

      const crumb = (await crumbRes.text()).trim();
      yahooSession = {
        cookie: rawCookie,
        crumb,
        timestamp: Date.now(),
      };
      console.log(`[Yahoo Finance] Session acquired with crumb: ${crumb.slice(0, 5)}...`);
      return yahooSession;
    } catch (err: any) {
      console.warn('[Yahoo Finance] Failed to acquire crumb/cookie:', err.message);
      return null;
    } finally {
      sessionPromise = null;
    }
  })();

  return sessionPromise;
}

// ============================================================================
// Ticker Loader (Reads tickets.txt)
// ============================================================================
function loadTickersFromDisk(): string[] {
  const candidatePaths = [
    path.join(__dirname, 'tickets.txt'),
    path.join(__dirname, 'public/assets/aistudio/tickets_22eaa9b8.txt'),
  ];

  for (const fp of candidatePaths) {
    if (fs.existsSync(fp)) {
      const raw = fs.readFileSync(fp, 'utf-8');
      const tickers = raw
        .split(/\r?\n/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0 && !s.startsWith('#') && !s.startsWith('---'));
      const uniqueTickers = Array.from(new Set(tickers));
      console.log(`[Tickers] Loaded ${uniqueTickers.length} unique tickers from ${path.basename(fp)}.`);
      return uniqueTickers;
    }
  }

  console.warn(`[Warning] tickets.txt not found. Using fallback tickers.`);
  return ['CLRO', 'AIOK', 'TORO', 'LYCA', 'BOLT', 'NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMD', 'AMZN', 'META', 'QQQ'];
}

// Helper: split array into chunks
function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

// ============================================================================
// Initial Stock Database Preload (from nasdaqStocks.json)
// ============================================================================
function loadInitialStocksFromDisk(): StockData[] {
  const stockMap = new Map<string, StockData>();

  // 1. Load baseline data from nasdaqStocks.json if available
  try {
    const jsonPath = path.resolve(__dirname, 'src/data/nasdaqStocks.json');
    if (fs.existsSync(jsonPath)) {
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (Array.isArray(raw)) {
        for (const item of raw) {
          const sym = (item.ticker || item.symbol || '').toUpperCase();
          if (!sym) continue;
          const price = Number(item.price || 0);
          const open = Number(item.open || item.price || 0);
          stockMap.set(sym, {
            symbol: sym,
            ticker: sym,
            name: item.name || sym,
            companyName: item.name || sym,
            price,
            lastSale: price,
            change: Number(item.change || 0),
            netChange: Number(item.change || 0),
            changePercent: Number(item.changePercent || 0),
            pctchange: Number(item.changePercent || 0),
            pChange: Number(item.changePercent || 0),
            changesPercentage: Number(item.changePercent || 0),
            marketCap: item.marketCap || '0M',
            volume: Number(item.volume || 0),
            avgVolume: Number(item.avgVolume || item.volume || 0),
            open,
            high: Number(item.high || price),
            low: Number(item.low || price),
            prevClose: Number(item.prevClose || price),
            openPercent: calculateOpenPercent(price, open),
            exchange: cleanExchangeName(item.exchange, item.fullExchangeName) || 'NASDAQ',
            market: cleanExchangeName(item.exchange, item.fullExchangeName) || 'NASDAQ',
            tagColor: assignTagColor(sym),
            sector: item.sector || 'Equities',
            industry: item.industry || 'General',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err: any) {
    console.warn('nasdaqStocks.json preload notice:', err.message);
  }

  // 2. Ensure EVERY ticker in tickets.txt exists in the cache
  const diskTickers = loadTickersFromDisk();
  for (const sym of diskTickers) {
    if (!stockMap.has(sym)) {
      // Determine probable exchange for known tickers or default to 'US'
      let detectedExchange = 'US';
      const nyseSample = ['BAK', 'PII', 'PNR', 'SES', 'CLS', 'JBLU', 'SOFI', 'JPM', 'BAC', 'DIS', 'KO', 'WMT', 'GE', 'XOM', 'CVX', 'IBM', 'BA', 'MCD', 'NKE', 'CAT', 'V', 'MA', 'GS', 'MS'];
      const amexSample = ['USAR', 'UAMY', 'EFOI', 'NAK', 'CPOP', 'SPY', 'IWM', 'DIA'];
      if (nyseSample.includes(sym)) detectedExchange = 'NYSE';
      else if (amexSample.includes(sym)) detectedExchange = 'AMEX';

      // Hash to generate plausible baseline price until live quotes arrive
      let hash = 0;
      for (let i = 0; i < sym.length; i++) {
        hash = (hash << 5) - hash + sym.charCodeAt(i);
        hash |= 0;
      }
      const baseSeed = Math.abs(hash) % 1000;
      const initialPrice = Math.max(1.0, Math.round((5 + (baseSeed / 1000) * 85) * 100) / 100);

      stockMap.set(sym, {
        symbol: sym,
        ticker: sym,
        name: sym,
        companyName: sym,
        price: initialPrice,
        lastSale: initialPrice,
        change: 0,
        netChange: 0,
        changePercent: 0,
        pctchange: 0,
        pChange: 0,
        changesPercentage: 0,
        marketCap: '$500M',
        volume: 250000 + (Math.abs(hash) % 750000),
        avgVolume: 500000,
        open: initialPrice,
        high: Math.round(initialPrice * 1.02 * 100) / 100,
        low: Math.round(initialPrice * 0.98 * 100) / 100,
        prevClose: initialPrice,
        openPercent: 0,
        exchange: detectedExchange,
        market: detectedExchange,
        sector: 'Equities',
        industry: 'General',
        tagColor: assignTagColor(sym),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return Array.from(stockMap.values());
}
// ============================================================================
// Real-Time Batch Data Fetcher with Crumb Authentication
// ============================================================================
let cachedStocks: StockData[] = loadInitialStocksFromDisk();
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000;
let isFetching = false;

function cleanExchangeName(rawExchange?: string, fullExchange?: string): string {
  const combined = `${fullExchange || ''} ${rawExchange || ''}`.toUpperCase();
  if (combined.includes('NASDAQ') || combined.includes('NMS') || combined.includes('NGS') || combined.includes('NCM')) {
    return 'NASDAQ';
  }
  if (combined.includes('NYSE') || combined.includes('NEW YORK') || combined.includes('NYQ')) {
    return 'NYSE';
  }
  if (combined.includes('AMEX') || combined.includes('AMERICAN') || combined.includes('ASE')) {
    return 'AMEX';
  }
  if (combined.includes('BATS') || combined.includes('ARCX') || combined.includes('ARCA') || combined.includes('PCX')) {
    return 'ARCA';
  }
  if (combined.includes('OTC') || combined.includes('PINK') || combined.includes('PNK')) {
    return 'OTC';
  }
  return fullExchange || rawExchange || 'US';
}

async function fetchBatchQuotes(symbols: string[], retryCount = 0): Promise<StockData[]> {
  const session = await getYahooSession();
  const symbolQuery = symbols.join(',');
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  let url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolQuery)}`;
  const headers: Record<string, string> = {
    'User-Agent': ua,
    Accept: 'application/json',
  };

  if (session && session.crumb) {
    url += `&crumb=${encodeURIComponent(session.crumb)}`;
    headers['Cookie'] = session.cookie;
  }

  try {
    const res = await fetch(url, { headers });

    if (!res.ok) {
      console.warn(`[Yahoo Finance] Batch request returned HTTP ${res.status}, using chart fallback for chunk...`);
      const fallbackResults = await Promise.all(symbols.map(s => fetchSingleQuoteViaChart(s)));
      return fallbackResults.filter((s): s is StockData => s !== null);
    }

    // // Handle 401 Unauthorized gracefully by refreshing the crumb session once
    // if (res.status === 401 && retryCount < 1) {
    //   console.warn('[Yahoo Finance] 401 Unauthorized on batch quote, renewing session...');
    //   yahooSession = null;
    //   await getYahooSession(true);
    //   return fetchBatchQuotes(symbols, retryCount + 1);
    // }

    if (!res.ok) {
      console.warn(`[Yahoo Finance] Batch request returned HTTP ${res.status}`);
      return [];
    }

    const json: any = await res.json();
    const results = json?.quoteResponse?.result || [];

    return results.map((item: any) => {
      const price = Number(item.regularMarketPrice ?? 0);
      const prevClose = Number(item.regularMarketPreviousClose ?? item.chartPreviousClose ?? price);
      const change = Number(item.regularMarketChange ?? (price - prevClose));
      const changePercent = Number(
        item.regularMarketChangePercent ?? (prevClose ? (change / prevClose) * 100 : 0)
      );
      const volume = Number(item.regularMarketVolume ?? 0);
      const marketCap = item.marketCap ? Number(item.marketCap) : 0;
      const open = Number(item.regularMarketOpen ?? price);
      const high = Number(item.regularMarketDayHigh ?? Math.max(open, price));
      const low = Number(item.regularMarketDayLow ?? Math.min(open, price));
      const openPercent = open > 0 ? Number((((price - open) / open) * 100).toFixed(2)) : 0;
      const exchange = cleanExchangeName(item.exchange, item.fullExchangeName);

      return {
        symbol: item.symbol,
        ticker: item.symbol,
        name: item.shortName || item.longName || item.symbol,
        companyName: item.longName || item.shortName || item.symbol,
        price,
        lastSale: price,
        change: Math.round(change * 10000) / 10000,
        netChange: Math.round(change * 10000) / 10000,
        changePercent: Number(changePercent.toFixed(2)),
        pctchange: Number(changePercent.toFixed(2)),
        pChange: Number(changePercent.toFixed(2)),
        changesPercentage: Number(changePercent.toFixed(2)),
        volume,
        avgVolume: Number(item.averageDailyVolume3Month || item.averageDailyVolume10Day || volume),
        open,
        high,
        low,
        prevClose,
        openPercent,
        marketCap,
        exchange,       // <--- Assigned here (e.g. "NYSE", "NASDAQ", "AMEX")
        market: exchange,
        pe: item.trailingPE || item.forwardPE || null,
        peRatio: item.trailingPE || item.forwardPE || null,
        high52: item.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekHigh: item.fiftyTwoWeekHigh ?? null,
        high52w: item.fiftyTwoWeekHigh ?? null,
        low52: item.fiftyTwoWeekLow ?? null,
        fiftyTwoWeekLow: item.fiftyTwoWeekLow ?? null,
        low52w: item.fiftyTwoWeekLow ?? null,
        sector: item.sector || 'Equities',
        industry: item.industry || 'General',
        description: '',
        tagColor: assignTagColor(item.symbol),
        isFavorite: false,
        m1Change: Number((changePercent * 0.05).toFixed(2)),
        m5Change: Number((changePercent * 0.15).toFixed(2)),
        m15Change: Number((changePercent * 0.25).toFixed(2)),
        h1Change: Number((changePercent * 0.5).toFixed(2)),
        h4Change: Number(changePercent.toFixed(2)),
        updatedAt: new Date().toISOString(),
      };
    });
  } catch (err: any) {
    console.error(`Error fetching batch: ${err.message}`);
    return [];
  }
}

async function fetchAllTicketsLive(): Promise<StockData[]> {
  const tickers = loadTickersFromDisk();
  const BATCH_SIZE = 40;
  const chunks = chunkArray(tickers, BATCH_SIZE);
  const allResults: StockData[] = [];

  const CONCURRENCY = 3;
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const currentPool = chunks.slice(i, i + CONCURRENCY);
    const poolPromises = currentPool.map((chunk) => fetchBatchQuotes(chunk));
    const settled = await Promise.allSettled(poolPromises);

    for (const res of settled) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allResults.push(...res.value);
      }
    }

    if (i + CONCURRENCY < chunks.length) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  return allResults;
}

async function getRealTimeStocks(forceRefresh = false): Promise<StockData[]> {
  const now = Date.now();
  if (!forceRefresh && cachedStocks.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedStocks;
  }

  if (isFetching && cachedStocks.length > 0) {
    return cachedStocks;
  }

  isFetching = true;
  try {
    const fresh = await fetchAllTicketsLive();
    if (fresh.length > 0) {
      const freshMap = new Map(fresh.map((s) => [s.symbol, s]));
      const updatedList: StockData[] = [];

      // Update existing
      for (const item of cachedStocks) {
        if (freshMap.has(item.symbol)) {
          const f = freshMap.get(item.symbol)!;
          freshMap.delete(item.symbol);
          updatedList.push({ ...item, ...f });
        } else {
          updatedList.push(item);
        }
      }

      // Append any new symbols
      for (const f of freshMap.values()) {
        updatedList.push(f);
      }

      cachedStocks = updatedList;
      lastFetchTime = Date.now();
      console.log(`[Market Data] Successfully updated ${cachedStocks.length} live stocks at ${new Date().toLocaleTimeString()}`);
    }
    return cachedStocks;
  } catch (error) {
    console.error('Failed to update live stocks:', error);
    return cachedStocks;
  } finally {
    isFetching = false;
  }
}

// ============================================================================
// Chart Engine & Fallback Generators
// ============================================================================
interface ChartCacheEntry {
  data: any;
  timestamp: number;
}
const chartCache: Record<string, ChartCacheEntry> = {};

function getEasternTimeParts(timeMs: number) {
  const dateObj = new Date(timeMs);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(dateObj);

  let year = dateObj.getFullYear(),
    month = dateObj.getMonth() + 1,
    day = dateObj.getDate(),
    hour = dateObj.getHours(),
    minute = dateObj.getMinutes();

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

function build24HourWindow(
  rawCandles: any[],
  currentPrice: number,
  prevClosePrice: number,
  stepMinutes: number
): any[] {
  const now = Date.now();
  const startTime = now - 24 * 60 * 60 * 1000;
  const stepMs = stepMinutes * 60 * 1000;

  let windowBars = (rawCandles || []).filter(
    (c) => c.time >= startTime - stepMs && c.time <= now + 60000
  );

  const startPrice = prevClosePrice || (windowBars.length > 0 ? windowBars[0].open : currentPrice);
  const endPrice = currentPrice || (windowBars.length > 0 ? windowBars[windowBars.length - 1].close : startPrice);

  if (windowBars.length === 0) {
    const totalBars = Math.max(1, Math.floor((24 * 60) / stepMinutes));
    let p = startPrice;
    for (let i = 0; i < totalBars; i++) {
      const bTime = startTime + i * stepMs;
      const et = getEasternTimeParts(bTime);
      const progress = (i + 1) / totalBars;
      const target = startPrice + progress * (endPrice - startPrice);
      const noise = (Math.random() - 0.49) * 0.003 * p;
      const close = i === totalBars - 1 ? endPrice : Math.max(0.001, Math.round((target + noise) * 10000) / 10000);
      const high = Math.max(p, close, Math.round((Math.max(p, close) + Math.random() * 0.002 * p) * 10000) / 10000);
      const low = Math.min(p, close, Math.round((Math.min(p, close) - Math.random() * 0.002 * p) * 10000) / 10000);

      windowBars.push({
        time: bTime,
        timeStr: et.timeStr,
        open: p,
        high,
        low,
        close,
        volume: Math.floor(500 + Math.random() * 3000),
        session: et.session,
      });
      p = close;
    }
  } else {
    if (windowBars[0].time > startTime + stepMs) {
      const prefixCount = Math.floor((windowBars[0].time - startTime) / stepMs);
      const prefix: any[] = [];
      let p = startPrice;
      const firstClose = windowBars[0].open;
      for (let i = 0; i < prefixCount; i++) {
        const bTime = startTime + i * stepMs;
        const et = getEasternTimeParts(bTime);
        const progress = (i + 1) / (prefixCount + 1);
        const target = startPrice + progress * (firstClose - startPrice);
        const close = Math.round(target * 10000) / 10000;
        prefix.push({
          time: bTime,
          timeStr: et.timeStr,
          open: p,
          high: Math.max(p, close),
          low: Math.min(p, close),
          close,
          volume: 0,
          session: et.session,
        });
        p = close;
      }
      windowBars = [...prefix, ...windowBars];
    }

    const lastBar = windowBars[windowBars.length - 1];
    if (lastBar.time < now - stepMs) {
      const suffixCount = Math.max(1, Math.floor((now - lastBar.time) / stepMs));
      const suffix: any[] = [];
      let p = lastBar.close;
      for (let i = 1; i <= suffixCount; i++) {
        const bTime = lastBar.time + i * stepMs;
        const et = getEasternTimeParts(bTime);
        const progress = i / suffixCount;
        const target = endPrice;
        const close = i === suffixCount ? endPrice : Math.round((p + progress * (target - p)) * 10000) / 10000;
        suffix.push({
          time: bTime,
          timeStr: et.timeStr,
          open: p,
          high: Math.max(p, close),
          low: Math.min(p, close),
          close,
          volume: 0,
          session: et.session,
        });
        p = close;
      }
      windowBars = [...windowBars, ...suffix];
    }
  }

  return windowBars.map((b) => {
    const et = getEasternTimeParts(b.time);
    return {
      ...b,
      session: et.session,
      timeStr: et.timeStr,
    };
  });
}

async function fetchYahooChart(
  symbol: string,
  timeframe = '5M',
  rangeKey?: string,
  period1?: number,
  period2?: number
) {
  const tf = timeframe.toUpperCase();
  let interval = '5m';
  let range = '5d';

  if (tf === '1M') {
    interval = '1m';
    range = rangeKey && rangeKey !== 'custom' ? rangeKey.toLowerCase() : '1d';
  } else if (tf === '5M') {
    interval = '5m';
    range = rangeKey && rangeKey !== 'custom' ? rangeKey.toLowerCase() : '5d';
  } else if (tf === '10M') {
    interval = '5m';
    range = rangeKey && rangeKey !== 'custom' ? rangeKey.toLowerCase() : '5d';
  } else if (tf === '1H') {
    interval = '60m';
    range = rangeKey && rangeKey !== 'custom' ? rangeKey.toLowerCase() : '1mo';
  } else if (tf === '4H') {
    interval = '60m';
    range = rangeKey && rangeKey !== 'custom' ? rangeKey.toLowerCase() : '3mo';
  } else if (tf === 'D' || tf === '1D') {
    interval = '1d';
    range = rangeKey && rangeKey !== 'custom' ? rangeKey.toLowerCase() : '1y';
  }

  if (period1 && period2) {
    const diffSec = period2 - period1;
    if (tf === '1M') interval = diffSec <= 7 * 86400 ? '1m' : '5m';
    else if (tf === '5M' || tf === '10M') interval = '5m';
    else if (tf === '1H' || tf === '4H') interval = '60m';
    else if (tf === 'D' || tf === '1D') interval = '1d';
  }

  const cacheKey =
    period1 && period2
      ? `${symbol}_custom_${period1}_${period2}_${interval}_${tf}`
      : `${symbol}_${tf}_${range}_${interval}`;
  const cached = chartCache[cacheKey];
  const now = Date.now();
  if (cached && now - cached.timestamp < 8000) {
    return cached.data;
  }

  const yahooQueryRange = range === '1d' || rangeKey === '1d' ? '5d' : range;
  let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${yahooQueryRange}`;
  if (period1 && period2) {
    url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&period1=${period1}&period2=${period2}`;
  }
  if (
    (range === '1d' || range === '5d' || rangeKey === '1d' || rangeKey === '5d') &&
    (tf === '1M' || tf === '5M' || tf === '10M')
  ) {
    url += '&includePrePost=true';
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: '*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch chart for ${symbol}: HTTP ${response.status}`);
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
    const et = getEasternTimeParts(timeMs);
    const monthName = months[et.month - 1] || 'Oct';
    const dayStr = String(et.day).padStart(2, '0');

    let timeStr = et.timeStr;
    if (interval === '1d' || interval === '1wk' || interval === '1mo' || tf === 'D' || tf === '1D') {
      timeStr = `${monthName} ${dayStr}`;
      if (range === '2y' || range === '5y' || range === 'max') {
        timeStr = `${monthName} '${String(et.year).slice(-2)}`;
      }
    } else if (interval === '60m' || tf === '1H' || tf === '4H') {
      timeStr = `${monthName} ${dayStr} ${String(et.hour).padStart(2, '0')}:00`;
    }

    const cleanPrice = (val: number | null | undefined): number => {
      if (val === null || val === undefined || !Number.isFinite(val)) return 0;
      return Math.round(val * 10000) / 10000;
    };

    rawBars.push({
      time: timeMs,
      timeStr,
      open: cleanPrice(o),
      high: cleanPrice(h),
      low: cleanPrice(l),
      close: cleanPrice(c),
      volume: Math.floor(v),
      session: et.session,
    });
  }

  let candles = rawBars;

  // Handle 10M aggregation from 5m bars
  if (tf === '10M' && interval === '5m') {
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
          session: b1.session,
        });
      }
    }
  }

  const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice || 0;
  const currentPrice = meta.regularMarketPrice || (candles.length > 0 ? candles[candles.length - 1].close : 0);
  const openPrice = meta.regularMarketOpen || (candles[0]?.open ?? currentPrice);
  const change = meta.regularMarketPrice && prevClose ? meta.regularMarketPrice - prevClose : 0;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;
  const openPercent = calculateOpenPercent(currentPrice, openPrice);

  const stepMinutes =
    tf === '1M' ? 1 : tf === '10M' ? 10 : tf === '1H' ? 60 : tf === '4H' ? 240 : tf === 'D' || tf === '1D' ? 1440 : 5;

  if (range === '1d' || rangeKey === '1d') {
    candles = build24HourWindow(candles, currentPrice, prevClose, stepMinutes);
  }

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
      openPercent,
      prevClose: Math.round(prevClose * 10000) / 10000,
      open: Math.round(openPrice * 10000) / 10000,
      high: Math.round((meta.regularMarketDayHigh || meta.dayHigh || currentPrice) * 10000) / 10000,
      low: Math.round((meta.regularMarketDayLow || meta.dayLow || currentPrice) * 10000) / 10000,
      volume: meta.regularMarketVolume || meta.dayVolume || candles.reduce((acc, c) => acc + c.volume, 0),
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? Math.round(meta.fiftyTwoWeekHigh * 10000) / 10000 : null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? Math.round(meta.fiftyTwoWeekLow * 10000) / 10000 : null,
    },
    candles,
  };

  chartCache[cacheKey] = { data: payload, timestamp: now };
  return payload;
}

function generateFallbackCandles(ticker: string, timeframe: string, rangeKey = '1d') {
  const stock = cachedStocks.find((s) => s.symbol === ticker || s.ticker === ticker);
  const currentPrice = stock ? stock.price : 10.0;
  const prevClose = stock ? Number(stock.prevClose || currentPrice) : 10.0;
  const openPrice = stock ? Number(stock.open || prevClose) : prevClose;
  const change = stock ? stock.change : 0.5;
  const changePercent = stock ? stock.changePercent : 5.0;
  const openPercent = calculateOpenPercent(currentPrice, openPrice);

  const stepMinutes =
    timeframe === '1M' ? 1 : timeframe === '10M' ? 10 : timeframe === '1H' ? 60 : timeframe === '4H' ? 240 : 5;

  let candles: any[] = [];
  if (rangeKey === '1d') {
    candles = build24HourWindow([], currentPrice, prevClose, stepMinutes);
  } else {
    const barsCount = Math.min(250, Math.max(30, Math.floor(2880 / stepMinutes)));
    const stepMs = stepMinutes * 60 * 1000;
    const now = Date.now();
    let price = prevClose;
    for (let i = 0; i < barsCount; i++) {
      const barTime = now - (barsCount - i) * stepMs;
      const et = getEasternTimeParts(barTime);
      const open = price;
      const progress = i / barsCount;
      const target = currentPrice;
      const diff = (target - price) / price;
      const chg = diff * 0.15 + (Math.random() - 0.49) * 0.01;
      let close = Math.max(0.01, Math.round(open * (1 + chg) * 10000) / 10000);
      if (i === barsCount - 1) close = currentPrice;
      const volSpread = open * 0.005;
      const high = Math.round((Math.max(open, close) + Math.random() * volSpread) * 10000) / 10000;
      const low = Math.round((Math.min(open, close) - Math.random() * volSpread) * 10000) / 10000;

      candles.push({
        time: barTime,
        timeStr: et.timeStr,
        open,
        high: Math.max(open, close, high),
        low: Math.max(0.01, Math.min(open, close, low)),
        close,
        volume: Math.floor(1000 + Math.random() * 8000),
        session: et.session,
      });
      price = close;
    }
  }

  return {
    ticker,
    timeframe,
    meta: {
      symbol: ticker,
      price: currentPrice,
      change,
      changePercent,
      openPercent,
      prevClose,
      open: openPrice,
      high: stock?.high || currentPrice,
      low: stock?.low || currentPrice,
      volume: stock?.volume || 1000000,
      currency: 'USD',
      exchange: stock?.exchange || stock?.market || 'US',
    },
    candles,
  };
}

// ============================================================================
// Server Initialization
// ============================================================================
async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // CORS Middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // --------------------------------------------------------------------------
  // API Routes
  // --------------------------------------------------------------------------

  // Screener Endpoint: /api/stocks & /api/screener
  app.get(['/api/stocks', '/api/screener'], async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === 'true';
      let stocks = await getRealTimeStocks(forceRefresh);

      // Exchange filter (?exchange=nyse, ?exchange=all)
      const exchangeFilter = (req.query.exchange || req.query.market || '').toString().trim().toUpperCase();
      if (exchangeFilter && exchangeFilter !== 'ALL') {
        stocks = stocks.filter((s) => (s.exchange || '').toUpperCase() === exchangeFilter);
      }

      // Search (?q= or ?search=)
      const search = (req.query.search || req.query.q || req.query.query || '').toString().toLowerCase().trim();
      if (search) {
        stocks = stocks.filter(
          (s) =>
            s.symbol.toLowerCase().includes(search) ||
            s.name.toLowerCase().includes(search) ||
            (s.exchange || '').toLowerCase().includes(search)
        );

        // If local filter has no matches, attempt on-demand ticker lookup across all markets
        if (stocks.length === 0 && search.length >= 1 && search.length <= 8 && !search.includes(' ')) {
          const sym = search.toUpperCase();
          const direct = await fetchBatchQuotes([sym]);
          if (direct.length > 0) {
            const idx = cachedStocks.findIndex((s) => s.symbol === sym || s.ticker === sym);
            if (idx >= 0) cachedStocks[idx] = direct[0];
            else cachedStocks.push(direct[0]);
            stocks = [direct[0]];
          } else {
            const viaChart = await fetchSingleQuoteViaChart(sym);
            if (viaChart) {
              const idx = cachedStocks.findIndex((s) => s.symbol === sym || s.ticker === sym);
              if (idx >= 0) cachedStocks[idx] = viaChart;
              else cachedStocks.push(viaChart);
              stocks = [viaChart];
            }
          }
        }
      }

      // Sector filter (?sector=...)
      const sector = (req.query.sector || '').toString().trim();
      if (sector && sector.toLowerCase() !== 'all') {
        stocks = stocks.filter((s) => s.sector.toLowerCase() === sector.toLowerCase());
      }

      // Price range filters
      const minPrice = parseFloat(req.query.minPrice as string);
      const maxPrice = parseFloat(req.query.maxPrice as string);
      if (!isNaN(minPrice)) stocks = stocks.filter((s) => s.price >= minPrice);
      if (!isNaN(maxPrice)) stocks = stocks.filter((s) => s.price <= maxPrice);

      // Open % filter: ((current price - today's open) / today's open) * 100
      const minOpenPercent = parseFloat((req.query.minOpenPercent || req.query.minOpenPct) as string);
      const maxOpenPercent = parseFloat((req.query.maxOpenPercent || req.query.maxOpenPct) as string);
      if (!isNaN(minOpenPercent)) {
        stocks = stocks.filter((s) => (s.openPercent ?? 0) >= minOpenPercent);
      }
      if (!isNaN(maxOpenPercent)) {
        stocks = stocks.filter((s) => (s.openPercent ?? 0) <= maxOpenPercent);
      }

      // Market Cap filters
      const minMarketCap = parseFloat(req.query.minMarketCap as string);
      const maxMarketCap = parseFloat(req.query.maxMarketCap as string);
      if (!isNaN(minMarketCap)) {
        stocks = stocks.filter((s) => (typeof s.marketCap === 'number' ? s.marketCap : 0) >= minMarketCap);
      }
      if (!isNaN(maxMarketCap)) {
        stocks = stocks.filter((s) => (typeof s.marketCap === 'number' ? s.marketCap : 0) <= maxMarketCap);
      }

      // Gainers / Losers quick flags
      if (req.query.gainers === 'true') {
        stocks = stocks.filter((s) => s.change > 0);
      } else if (req.query.losers === 'true') {
        stocks = stocks.filter((s) => s.change < 0);
      }

      // Sorting (?sortBy=openPercent&sortOrder=desc)
      const sortBy = (req.query.sortBy || req.query.sort || '').toString().toLowerCase();
      const sortOrder = (req.query.sortOrder || req.query.order || 'desc').toString().toLowerCase();
      const isAsc = sortOrder === 'asc';

      if (sortBy) {
        stocks = [...stocks].sort((a, b) => {
          const key = sortBy === 'ticker' ? 'symbol' : sortBy;
          const valA: any = (a as any)[key];
          const valB: any = (b as any)[key];

          if (valA == null) return 1;
          if (valB == null) return -1;

          if (typeof valA === 'string') {
            return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return isAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        });
      }

      // Optional Pagination
      const page = parseInt(req.query.page as string, 10);
      const limit = parseInt((req.query.limit || req.query.pageSize) as string, 10);

      if (!isNaN(page) && !isNaN(limit) && limit > 0) {
        const startIndex = (page - 1) * limit;
        return res.json({
          total: stocks.length,
          page,
          limit,
          totalPages: Math.ceil(stocks.length / limit),
          data: stocks.slice(startIndex, startIndex + limit),
        });
      }

      return res.json(stocks);
    } catch (error) {
      console.error('Error handling screener request:', error);
      return res.status(500).json({ error: 'Failed to retrieve screener data' });
    }
  });

  // Watchlist Scanner Endpoint (used by App.tsx)
  app.get('/api/stock/scanner', async (_req, res) => {
    try {
      const stocks = await getRealTimeStocks(false);
      return res.json(stocks);
    } catch (err: any) {
      console.error('Error serving /api/stock/scanner:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Single Quote Endpoint: /api/stocks/:symbol or /api/quote/:symbol
  app.get(['/api/stocks/:symbol', '/api/quote/:symbol'], async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    try {
      const stocks = await getRealTimeStocks();
      const found = stocks.find((s) => s.symbol === symbol || s.ticker === symbol);
      if (found) return res.json(found);

      // On-demand fetch if not in the cached list or needs fresh quote
      const direct = await fetchBatchQuotes([symbol]);
      if (direct.length > 0) {
        const idx = cachedStocks.findIndex((s) => s.symbol === symbol || s.ticker === symbol);
        if (idx >= 0) cachedStocks[idx] = direct[0];
        else cachedStocks.push(direct[0]);
        return res.json(direct[0]);
      }

      const viaChart = await fetchSingleQuoteViaChart(symbol);
      if (viaChart) {
        const idx = cachedStocks.findIndex((s) => s.symbol === symbol || s.ticker === symbol);
        if (idx >= 0) cachedStocks[idx] = viaChart;
        else cachedStocks.push(viaChart);
        return res.json(viaChart);
      }

      return res.status(404).json({ error: `Symbol ${symbol} not found` });
    } catch (err) {
      return res.status(500).json({ error: `Failed to fetch quote for ${symbol}` });
    }
  });

  // Chart Endpoint (used by App.tsx and candlestick chart)
  app.get('/api/stock/chart/:ticker', async (req: Request, res: Response) => {
    const ticker = req.params.ticker.toUpperCase();
    const timeframe = ((req.query.timeframe as string) || (req.query.interval as string) || '5M').toUpperCase();
    const range = req.query.range as string | undefined;
    const period1 = req.query.period1 ? parseInt(req.query.period1 as string, 10) : undefined;
    const period2 = req.query.period2 ? parseInt(req.query.period2 as string, 10) : undefined;

    try {
      const data = await fetchYahooChart(ticker, timeframe, range, period1, period2);
      res.json(data);
    } catch (err: any) {
      console.warn(`Chart fetch for ${ticker} fallback:`, err.message);
      const fallbackData = generateFallbackCandles(ticker, timeframe, range || '1d');
      res.json(fallbackData);
    }
  });

  // Market Overview
  app.get('/api/market-summary', async (req, res) => {
    try {
      const stocks = await getRealTimeStocks();
      const topGainers = [...stocks]
        .filter((s) => s.change > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 5);
      const topLosers = [...stocks]
        .filter((s) => s.change < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 5);
      const mostActive = [...stocks].sort((a, b) => b.volume - a.volume).slice(0, 5);

      return res.json({
        totalTracked: stocks.length,
        lastUpdated: new Date().toISOString(),
        topGainers,
        topLosers,
        mostActive,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to build market summary' });
    }
  });

  // Force cache refresh
  app.post('/api/refresh', async (req, res) => {
    try {
      const data = await getRealTimeStocks(true);
      return res.json({ success: true, count: data.length, lastUpdated: new Date().toISOString() });
    } catch (err) {
      return res.status(500).json({ error: 'Refresh failed' });
    }
  });

  // --------------------------------------------------------------------------
  // Vite Integration & Static Serving
  // --------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Pre-warm crumb session and live data in background
  getYahooSession()
    .then(() => getRealTimeStocks())
    .catch((err) => console.error('Initial cache warm-up notice:', err));

  // Background refresh every 60 seconds
  setInterval(() => {
    getRealTimeStocks(true).catch((err) => console.error('Background refresh notice:', err));
  }, 60 * 1000);

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Screener and Terminal running with live data on http://0.0.0.0:${PORT}`);
  });
}

startServer();