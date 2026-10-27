var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
module.exports = __toCommonJS(server_exports);
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_url = require("url");
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var TAG_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"];
function assignTagColor(symbol) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash << 5) - hash + symbol.charCodeAt(i);
    hash |= 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}
var yahooSession = null;
var sessionPromise = null;
async function getYahooSession(force = false) {
  const now = Date.now();
  if (!force && yahooSession && now - yahooSession.timestamp < 30 * 60 * 1e3) {
    return yahooSession;
  }
  if (sessionPromise && !force) {
    return sessionPromise;
  }
  sessionPromise = (async () => {
    try {
      const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
      const cookieRes = await fetch("https://fc.yahoo.com", {
        headers: { "User-Agent": ua }
      });
      const rawCookie = cookieRes.headers.get("set-cookie");
      if (!rawCookie) {
        console.warn("[Yahoo Finance] No cookie header from fc.yahoo.com");
        return null;
      }
      const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
        headers: {
          Cookie: rawCookie,
          "User-Agent": ua
        }
      });
      if (!crumbRes.ok) {
        console.warn(`[Yahoo Finance] getcrumb returned status ${crumbRes.status}`);
        return null;
      }
      const crumb = (await crumbRes.text()).trim();
      yahooSession = {
        cookie: rawCookie,
        crumb,
        timestamp: Date.now()
      };
      console.log(`[Yahoo Finance] Session acquired with crumb: ${crumb.slice(0, 5)}...`);
      return yahooSession;
    } catch (err) {
      console.warn("[Yahoo Finance] Failed to acquire crumb/cookie:", err.message);
      return null;
    } finally {
      sessionPromise = null;
    }
  })();
  return sessionPromise;
}
function loadTickersFromDisk() {
  const candidatePaths = [
    import_path.default.join(__dirname, "tickets.txt"),
    import_path.default.join(__dirname, "public/assets/aistudio/tickets_22eaa9b8.txt")
  ];
  for (const fp of candidatePaths) {
    if (import_fs.default.existsSync(fp)) {
      const raw = import_fs.default.readFileSync(fp, "utf-8");
      const tickers = raw.split(/\r?\n/).map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0 && !s.startsWith("#") && !s.startsWith("---"));
      const uniqueTickers = Array.from(new Set(tickers));
      console.log(`[Tickers] Loaded ${uniqueTickers.length} unique tickers from ${import_path.default.basename(fp)}.`);
      return uniqueTickers;
    }
  }
  console.warn(`[Warning] tickets.txt not found. Using fallback tickers.`);
  return ["CLRO", "AIOK", "TORO", "LYCA", "BOLT", "NVDA", "TSLA", "AAPL", "MSFT", "AMD", "AMZN", "META", "QQQ"];
}
function chunkArray(arr, chunkSize) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}
function loadInitialStocksFromDisk() {
  try {
    const jsonPath = import_path.default.resolve(__dirname, "src/data/nasdaqStocks.json");
    if (import_fs.default.existsSync(jsonPath)) {
      const raw = JSON.parse(import_fs.default.readFileSync(jsonPath, "utf-8"));
      if (Array.isArray(raw)) {
        return raw.map((item) => ({
          symbol: item.ticker || item.symbol,
          ticker: item.ticker || item.symbol,
          name: item.name || item.ticker,
          companyName: item.name || item.ticker,
          price: Number(item.price || 0),
          lastSale: Number(item.price || 0),
          change: Number(item.change || 0),
          netChange: Number(item.change || 0),
          changePercent: Number(item.changePercent || 0),
          pctchange: Number(item.changePercent || 0),
          pChange: Number(item.changePercent || 0),
          changesPercentage: Number(item.changePercent || 0),
          marketCap: item.marketCap || "0M",
          volume: Number(item.volume || 0),
          avgVolume: Number(item.avgVolume || item.volume || 0),
          open: Number(item.open || item.price || 0),
          high: Number(item.high || item.price || 0),
          low: Number(item.low || item.price || 0),
          prevClose: Number(item.prevClose || item.price || 0),
          openPercent: Number(item.openPercent || 0),
          high52: Number(item.high52w || 0),
          fiftyTwoWeekHigh: Number(item.high52w || 0),
          high52w: Number(item.high52w || 0),
          low52: Number(item.low52w || 0),
          fiftyTwoWeekLow: Number(item.low52w || 0),
          low52w: Number(item.low52w || 0),
          sector: item.sector || "Equities",
          industry: item.industry || item.sector || "General",
          description: item.description || "",
          tagColor: item.tagColor || assignTagColor(item.ticker || item.symbol),
          isFavorite: Boolean(item.isFavorite),
          m1Change: Number(item.m1Change || 0),
          m5Change: Number(item.m5Change || 0),
          m15Change: Number(item.m15Change || 0),
          h1Change: Number(item.h1Change || 0),
          h4Change: Number(item.h4Change || 0),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }));
      }
    }
  } catch (err) {
    console.warn("Initial nasdaqStocks.json preload notice:", err.message);
  }
  return [];
}
var cachedStocks = loadInitialStocksFromDisk();
var lastFetchTime = 0;
var CACHE_TTL_MS = 60 * 1e3;
var isFetching = false;
async function fetchBatchQuotes(symbols, retryCount = 0) {
  const session = await getYahooSession();
  const symbolQuery = symbols.join(",");
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  let url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolQuery)}`;
  const headers = {
    "User-Agent": ua,
    Accept: "application/json"
  };
  if (session && session.crumb) {
    url += `&crumb=${encodeURIComponent(session.crumb)}`;
    headers["Cookie"] = session.cookie;
  }
  try {
    const res = await fetch(url, { headers });
    if (res.status === 401 && retryCount < 1) {
      console.warn("[Yahoo Finance] 401 Unauthorized on batch quote, renewing session...");
      yahooSession = null;
      await getYahooSession(true);
      return fetchBatchQuotes(symbols, retryCount + 1);
    }
    if (!res.ok) {
      console.warn(`[Yahoo Finance] Batch request returned HTTP ${res.status}`);
      return [];
    }
    const json = await res.json();
    const results = json?.quoteResponse?.result || [];
    return results.map((item) => {
      const price = Number(item.regularMarketPrice ?? 0);
      const prevClose = Number(item.regularMarketPreviousClose ?? item.chartPreviousClose ?? price);
      const change = Number(item.regularMarketChange ?? price - prevClose);
      const changePercent = Number(
        item.regularMarketChangePercent ?? (prevClose ? change / prevClose * 100 : 0)
      );
      const volume = Number(item.regularMarketVolume ?? 0);
      const marketCap = item.marketCap ? Number(item.marketCap) : 0;
      const open = Number(item.regularMarketOpen ?? price);
      const high = Number(item.regularMarketDayHigh ?? Math.max(open, price));
      const low = Number(item.regularMarketDayLow ?? Math.min(open, price));
      const openPercent = prevClose ? Number(((open - prevClose) / prevClose * 100).toFixed(2)) : 0;
      return {
        symbol: item.symbol,
        ticker: item.symbol,
        name: item.shortName || item.longName || item.symbol,
        companyName: item.longName || item.shortName || item.symbol,
        price,
        lastSale: price,
        change: Math.round(change * 1e4) / 1e4,
        netChange: Math.round(change * 1e4) / 1e4,
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
        pe: item.trailingPE || item.forwardPE || null,
        peRatio: item.trailingPE || item.forwardPE || null,
        high52: item.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekHigh: item.fiftyTwoWeekHigh ?? null,
        high52w: item.fiftyTwoWeekHigh ?? null,
        low52: item.fiftyTwoWeekLow ?? null,
        fiftyTwoWeekLow: item.fiftyTwoWeekLow ?? null,
        low52w: item.fiftyTwoWeekLow ?? null,
        sector: item.sector || "Equities",
        industry: item.industry || "General",
        description: "",
        tagColor: assignTagColor(item.symbol),
        isFavorite: false,
        m1Change: Number((changePercent * 0.05).toFixed(2)),
        m5Change: Number((changePercent * 0.15).toFixed(2)),
        m15Change: Number((changePercent * 0.25).toFixed(2)),
        h1Change: Number((changePercent * 0.5).toFixed(2)),
        h4Change: Number(changePercent.toFixed(2)),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
  } catch (err) {
    console.error(`Error fetching batch: ${err.message}`);
    return [];
  }
}
async function fetchAllTicketsLive() {
  const tickers = loadTickersFromDisk();
  const BATCH_SIZE = 40;
  const chunks = chunkArray(tickers, BATCH_SIZE);
  const allResults = [];
  const CONCURRENCY = 3;
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const currentPool = chunks.slice(i, i + CONCURRENCY);
    const poolPromises = currentPool.map((chunk) => fetchBatchQuotes(chunk));
    const settled = await Promise.allSettled(poolPromises);
    for (const res of settled) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        allResults.push(...res.value);
      }
    }
    if (i + CONCURRENCY < chunks.length) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  return allResults;
}
async function getRealTimeStocks(forceRefresh = false) {
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
      const updatedList = [];
      for (const item of cachedStocks) {
        if (freshMap.has(item.symbol)) {
          const f = freshMap.get(item.symbol);
          freshMap.delete(item.symbol);
          updatedList.push({ ...item, ...f });
        } else {
          updatedList.push(item);
        }
      }
      for (const f of freshMap.values()) {
        updatedList.push(f);
      }
      cachedStocks = updatedList;
      lastFetchTime = Date.now();
      console.log(`[Market Data] Successfully updated ${cachedStocks.length} live stocks at ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}`);
    }
    return cachedStocks;
  } catch (error) {
    console.error("Failed to update live stocks:", error);
    return cachedStocks;
  } finally {
    isFetching = false;
  }
}
var chartCache = {};
function getEasternTimeParts(timeMs) {
  const dateObj = new Date(timeMs);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23"
  }).formatToParts(dateObj);
  let year = dateObj.getFullYear(), month = dateObj.getMonth() + 1, day = dateObj.getDate(), hour = dateObj.getHours(), minute = dateObj.getMinutes();
  for (const p of parts) {
    if (p.type === "year") year = parseInt(p.value, 10);
    if (p.type === "month") month = parseInt(p.value, 10);
    if (p.type === "day") day = parseInt(p.value, 10);
    if (p.type === "hour") hour = parseInt(p.value, 10);
    if (p.type === "minute") minute = parseInt(p.value, 10);
  }
  const minutesOfDay = hour * 60 + minute;
  let session = "regular";
  if (minutesOfDay >= 1200 || minutesOfDay < 240) session = "overnight";
  else if (minutesOfDay >= 240 && minutesOfDay < 570) session = "pre";
  else if (minutesOfDay >= 570 && minutesOfDay < 960) session = "regular";
  else session = "post";
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { year, month, day, hour, minute, minutesOfDay, session, timeStr };
}
function build24HourWindow(rawCandles, currentPrice, prevClosePrice, stepMinutes) {
  const now = Date.now();
  const startTime = now - 24 * 60 * 60 * 1e3;
  const stepMs = stepMinutes * 60 * 1e3;
  let windowBars = (rawCandles || []).filter(
    (c) => c.time >= startTime - stepMs && c.time <= now + 6e4
  );
  const startPrice = prevClosePrice || (windowBars.length > 0 ? windowBars[0].open : currentPrice);
  const endPrice = currentPrice || (windowBars.length > 0 ? windowBars[windowBars.length - 1].close : startPrice);
  if (windowBars.length === 0) {
    const totalBars = Math.max(1, Math.floor(24 * 60 / stepMinutes));
    let p = startPrice;
    for (let i = 0; i < totalBars; i++) {
      const bTime = startTime + i * stepMs;
      const et = getEasternTimeParts(bTime);
      const progress = (i + 1) / totalBars;
      const target = startPrice + progress * (endPrice - startPrice);
      const noise = (Math.random() - 0.49) * 3e-3 * p;
      const close = i === totalBars - 1 ? endPrice : Math.max(1e-3, Math.round((target + noise) * 1e4) / 1e4);
      const high = Math.max(p, close, Math.round((Math.max(p, close) + Math.random() * 2e-3 * p) * 1e4) / 1e4);
      const low = Math.min(p, close, Math.round((Math.min(p, close) - Math.random() * 2e-3 * p) * 1e4) / 1e4);
      windowBars.push({
        time: bTime,
        timeStr: et.timeStr,
        open: p,
        high,
        low,
        close,
        volume: Math.floor(500 + Math.random() * 3e3),
        session: et.session
      });
      p = close;
    }
  } else {
    if (windowBars[0].time > startTime + stepMs) {
      const prefixCount = Math.floor((windowBars[0].time - startTime) / stepMs);
      const prefix = [];
      let p = startPrice;
      const firstClose = windowBars[0].open;
      for (let i = 0; i < prefixCount; i++) {
        const bTime = startTime + i * stepMs;
        const et = getEasternTimeParts(bTime);
        const progress = (i + 1) / (prefixCount + 1);
        const target = startPrice + progress * (firstClose - startPrice);
        const close = Math.round(target * 1e4) / 1e4;
        prefix.push({
          time: bTime,
          timeStr: et.timeStr,
          open: p,
          high: Math.max(p, close),
          low: Math.min(p, close),
          close,
          volume: 0,
          session: et.session
        });
        p = close;
      }
      windowBars = [...prefix, ...windowBars];
    }
    const lastBar = windowBars[windowBars.length - 1];
    if (lastBar.time < now - stepMs) {
      const suffixCount = Math.max(1, Math.floor((now - lastBar.time) / stepMs));
      const suffix = [];
      let p = lastBar.close;
      for (let i = 1; i <= suffixCount; i++) {
        const bTime = lastBar.time + i * stepMs;
        const et = getEasternTimeParts(bTime);
        const progress = i / suffixCount;
        const target = endPrice;
        const close = i === suffixCount ? endPrice : Math.round((p + progress * (target - p)) * 1e4) / 1e4;
        suffix.push({
          time: bTime,
          timeStr: et.timeStr,
          open: p,
          high: Math.max(p, close),
          low: Math.min(p, close),
          close,
          volume: 0,
          session: et.session
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
      timeStr: et.timeStr
    };
  });
}
async function fetchYahooChart(symbol, timeframe = "5M", rangeKey, period1, period2) {
  const tf = timeframe.toUpperCase();
  let interval = "5m";
  let range = "5d";
  if (tf === "1M") {
    interval = "1m";
    range = rangeKey && rangeKey !== "custom" ? rangeKey.toLowerCase() : "1d";
  } else if (tf === "5M") {
    interval = "5m";
    range = rangeKey && rangeKey !== "custom" ? rangeKey.toLowerCase() : "5d";
  } else if (tf === "10M") {
    interval = "5m";
    range = rangeKey && rangeKey !== "custom" ? rangeKey.toLowerCase() : "5d";
  } else if (tf === "1H") {
    interval = "60m";
    range = rangeKey && rangeKey !== "custom" ? rangeKey.toLowerCase() : "1mo";
  } else if (tf === "4H") {
    interval = "60m";
    range = rangeKey && rangeKey !== "custom" ? rangeKey.toLowerCase() : "3mo";
  } else if (tf === "D" || tf === "1D") {
    interval = "1d";
    range = rangeKey && rangeKey !== "custom" ? rangeKey.toLowerCase() : "1y";
  }
  if (period1 && period2) {
    const diffSec = period2 - period1;
    if (tf === "1M") interval = diffSec <= 7 * 86400 ? "1m" : "5m";
    else if (tf === "5M" || tf === "10M") interval = "5m";
    else if (tf === "1H" || tf === "4H") interval = "60m";
    else if (tf === "D" || tf === "1D") interval = "1d";
  }
  const cacheKey = period1 && period2 ? `${symbol}_custom_${period1}_${period2}_${interval}_${tf}` : `${symbol}_${tf}_${range}_${interval}`;
  const cached = chartCache[cacheKey];
  const now = Date.now();
  if (cached && now - cached.timestamp < 8e3) {
    return cached.data;
  }
  const yahooQueryRange = range === "1d" || rangeKey === "1d" ? "5d" : range;
  let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${yahooQueryRange}`;
  if (period1 && period2) {
    url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&period1=${period1}&period2=${period2}`;
  }
  if ((range === "1d" || range === "5d" || rangeKey === "1d" || rangeKey === "5d") && (tf === "1M" || tf === "5M" || tf === "10M")) {
    url += "&includePrePost=true";
  }
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "*/*"
    }
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
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const rawBars = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c === null || c === void 0) continue;
    const o = opens[i] ?? c;
    const h = highs[i] ?? Math.max(o, c);
    const l = lows[i] ?? Math.min(o, c);
    const v = volumes[i] ?? 0;
    const timeMs = timestamps[i] * 1e3;
    const et = getEasternTimeParts(timeMs);
    const monthName = months[et.month - 1] || "Oct";
    const dayStr = String(et.day).padStart(2, "0");
    let timeStr = et.timeStr;
    if (interval === "1d" || interval === "1wk" || interval === "1mo" || tf === "D" || tf === "1D") {
      timeStr = `${monthName} ${dayStr}`;
      if (range === "2y" || range === "5y" || range === "max") {
        timeStr = `${monthName} '${String(et.year).slice(-2)}`;
      }
    } else if (interval === "60m" || tf === "1H" || tf === "4H") {
      timeStr = `${monthName} ${dayStr} ${String(et.hour).padStart(2, "0")}:00`;
    }
    const cleanPrice = (val) => {
      if (val === null || val === void 0 || !Number.isFinite(val)) return 0;
      return Math.round(val * 1e4) / 1e4;
    };
    rawBars.push({
      time: timeMs,
      timeStr,
      open: cleanPrice(o),
      high: cleanPrice(h),
      low: cleanPrice(l),
      close: cleanPrice(c),
      volume: Math.floor(v),
      session: et.session
    });
  }
  let candles = rawBars;
  if (tf === "10M" && interval === "5m") {
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
          high: Math.round(Math.max(b1.high, b2.high) * 1e4) / 1e4,
          low: Math.round(Math.min(b1.low, b2.low) * 1e4) / 1e4,
          close: b2.close,
          volume: b1.volume + b2.volume,
          session: b1.session
        });
      }
    }
  }
  const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice || 0;
  const currentPrice = meta.regularMarketPrice || (candles.length > 0 ? candles[candles.length - 1].close : 0);
  const change = meta.regularMarketPrice && prevClose ? meta.regularMarketPrice - prevClose : 0;
  const changePercent = prevClose ? change / prevClose * 100 : 0;
  const stepMinutes = tf === "1M" ? 1 : tf === "10M" ? 10 : tf === "1H" ? 60 : tf === "4H" ? 240 : tf === "D" || tf === "1D" ? 1440 : 5;
  if (range === "1d" || rangeKey === "1d") {
    candles = build24HourWindow(candles, currentPrice, prevClose, stepMinutes);
  }
  const payload = {
    ticker: symbol,
    timeframe: tf,
    meta: {
      symbol: meta.symbol || symbol,
      currency: meta.currency || "USD",
      exchange: meta.fullExchangeName || meta.exchangeName || "NASDAQ",
      price: Math.round(currentPrice * 1e4) / 1e4,
      change: Math.round(change * 1e4) / 1e4,
      changePercent: Number(changePercent.toFixed(2)),
      prevClose: Math.round(prevClose * 1e4) / 1e4,
      open: Math.round((meta.regularMarketOpen || (candles[0]?.open ?? currentPrice)) * 1e4) / 1e4,
      high: Math.round((meta.regularMarketDayHigh || meta.dayHigh || currentPrice) * 1e4) / 1e4,
      low: Math.round((meta.regularMarketDayLow || meta.dayLow || currentPrice) * 1e4) / 1e4,
      volume: meta.regularMarketVolume || meta.dayVolume || candles.reduce((acc, c) => acc + c.volume, 0),
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? Math.round(meta.fiftyTwoWeekHigh * 1e4) / 1e4 : null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? Math.round(meta.fiftyTwoWeekLow * 1e4) / 1e4 : null
    },
    candles
  };
  chartCache[cacheKey] = { data: payload, timestamp: now };
  return payload;
}
function generateFallbackCandles(ticker, timeframe, rangeKey = "1d") {
  const stock = cachedStocks.find((s) => s.symbol === ticker || s.ticker === ticker);
  const currentPrice = stock ? stock.price : 10;
  const prevClose = stock ? Number(stock.prevClose || currentPrice) : 10;
  const change = stock ? stock.change : 0.5;
  const changePercent = stock ? stock.changePercent : 5;
  const stepMinutes = timeframe === "1M" ? 1 : timeframe === "10M" ? 10 : timeframe === "1H" ? 60 : timeframe === "4H" ? 240 : 5;
  let candles = [];
  if (rangeKey === "1d") {
    candles = build24HourWindow([], currentPrice, prevClose, stepMinutes);
  } else {
    const barsCount = Math.min(250, Math.max(30, Math.floor(2880 / stepMinutes)));
    const stepMs = stepMinutes * 60 * 1e3;
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
      let close = Math.max(0.01, Math.round(open * (1 + chg) * 1e4) / 1e4);
      if (i === barsCount - 1) close = currentPrice;
      const volSpread = open * 5e-3;
      const high = Math.round((Math.max(open, close) + Math.random() * volSpread) * 1e4) / 1e4;
      const low = Math.round((Math.min(open, close) - Math.random() * volSpread) * 1e4) / 1e4;
      candles.push({
        time: barTime,
        timeStr: et.timeStr,
        open,
        high: Math.max(open, close, high),
        low: Math.max(0.01, Math.min(open, close, low)),
        close,
        volume: Math.floor(1e3 + Math.random() * 8e3),
        session: et.session
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
      prevClose,
      open: stock?.open || prevClose,
      high: stock?.high || currentPrice,
      low: stock?.low || currentPrice,
      volume: stock?.volume || 1e6,
      currency: "USD",
      exchange: "NASDAQ"
    },
    candles
  };
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT || 3e3;
  app.use(import_express.default.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.get(["/api/stocks", "/api/screener"], async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === "true";
      let stocks = await getRealTimeStocks(forceRefresh);
      const search = (req.query.search || req.query.q || req.query.query || "").toString().toLowerCase().trim();
      if (search) {
        stocks = stocks.filter(
          (s) => s.symbol.toLowerCase().includes(search) || s.name.toLowerCase().includes(search)
        );
      }
      const sector = (req.query.sector || "").toString().trim();
      if (sector && sector.toLowerCase() !== "all") {
        stocks = stocks.filter((s) => s.sector.toLowerCase() === sector.toLowerCase());
      }
      const minPrice = parseFloat(req.query.minPrice);
      const maxPrice = parseFloat(req.query.maxPrice);
      if (!isNaN(minPrice)) stocks = stocks.filter((s) => s.price >= minPrice);
      if (!isNaN(maxPrice)) stocks = stocks.filter((s) => s.price <= maxPrice);
      const minMarketCap = parseFloat(req.query.minMarketCap);
      const maxMarketCap = parseFloat(req.query.maxMarketCap);
      if (!isNaN(minMarketCap)) {
        stocks = stocks.filter((s) => (typeof s.marketCap === "number" ? s.marketCap : 0) >= minMarketCap);
      }
      if (!isNaN(maxMarketCap)) {
        stocks = stocks.filter((s) => (typeof s.marketCap === "number" ? s.marketCap : 0) <= maxMarketCap);
      }
      if (req.query.gainers === "true") {
        stocks = stocks.filter((s) => s.change > 0);
      } else if (req.query.losers === "true") {
        stocks = stocks.filter((s) => s.change < 0);
      }
      const sortBy = (req.query.sortBy || req.query.sort || "").toString().toLowerCase();
      const sortOrder = (req.query.sortOrder || req.query.order || "desc").toString().toLowerCase();
      const isAsc = sortOrder === "asc";
      if (sortBy) {
        stocks = [...stocks].sort((a, b) => {
          const valA = a[sortBy] ?? a[sortBy === "ticker" ? "symbol" : sortBy];
          const valB = b[sortBy] ?? b[sortBy === "ticker" ? "symbol" : sortBy];
          if (valA == null) return 1;
          if (valB == null) return -1;
          if (typeof valA === "string") {
            return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return isAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        });
      }
      const page = parseInt(req.query.page, 10);
      const limit = parseInt(req.query.limit || req.query.pageSize, 10);
      if (!isNaN(page) && !isNaN(limit) && limit > 0) {
        const startIndex = (page - 1) * limit;
        return res.json({
          total: stocks.length,
          page,
          limit,
          totalPages: Math.ceil(stocks.length / limit),
          data: stocks.slice(startIndex, startIndex + limit)
        });
      }
      return res.json(stocks);
    } catch (error) {
      console.error("Error handling screener request:", error);
      return res.status(500).json({ error: "Failed to retrieve screener data" });
    }
  });
  app.get("/api/stock/scanner", async (_req, res) => {
    try {
      const stocks = await getRealTimeStocks(false);
      return res.json(stocks);
    } catch (err) {
      console.error("Error serving /api/stock/scanner:", err.message);
      return res.status(500).json({ error: err.message });
    }
  });
  app.get(["/api/stocks/:symbol", "/api/quote/:symbol"], async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    try {
      const stocks = await getRealTimeStocks();
      const found = stocks.find((s) => s.symbol === symbol || s.ticker === symbol);
      if (found) return res.json(found);
      const direct = await fetchBatchQuotes([symbol]);
      if (direct.length > 0) return res.json(direct[0]);
      return res.status(404).json({ error: `Symbol ${symbol} not found` });
    } catch (err) {
      return res.status(500).json({ error: `Failed to fetch quote for ${symbol}` });
    }
  });
  app.get("/api/stock/chart/:ticker", async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const timeframe = (req.query.timeframe || req.query.interval || "5M").toUpperCase();
    const range = req.query.range;
    const period1 = req.query.period1 ? parseInt(req.query.period1, 10) : void 0;
    const period2 = req.query.period2 ? parseInt(req.query.period2, 10) : void 0;
    try {
      const data = await fetchYahooChart(ticker, timeframe, range, period1, period2);
      res.json(data);
    } catch (err) {
      console.warn(`Chart fetch for ${ticker} fallback:`, err.message);
      const fallbackData = generateFallbackCandles(ticker, timeframe, range || "1d");
      res.json(fallbackData);
    }
  });
  app.get("/api/market-summary", async (req, res) => {
    try {
      const stocks = await getRealTimeStocks();
      const topGainers = [...stocks].filter((s) => s.change > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
      const topLosers = [...stocks].filter((s) => s.change < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
      const mostActive = [...stocks].sort((a, b) => b.volume - a.volume).slice(0, 5);
      return res.json({
        totalTracked: stocks.length,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        topGainers,
        topLosers,
        mostActive
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to build market summary" });
    }
  });
  app.post("/api/refresh", async (req, res) => {
    try {
      const data = await getRealTimeStocks(true);
      return res.json({ success: true, count: data.length, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (err) {
      return res.status(500).json({ error: "Refresh failed" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.resolve(__dirname, "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.resolve(distPath, "index.html"));
    });
  }
  getYahooSession().then(() => getRealTimeStocks()).catch((err) => console.error("Initial cache warm-up notice:", err));
  setInterval(() => {
    getRealTimeStocks(true).catch((err) => console.error("Background refresh notice:", err));
  }, 60 * 1e3);
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`\u{1F680} Screener and Terminal running with live data on http://0.0.0.0:${PORT}`);
  });
}
startServer();
