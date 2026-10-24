import { Candle, StockQuote, VolumeProfileLevel, MacdPoint, Timeframe } from '../types/stock';

// Initial stock dataset seeded from the NASDAQ market scanner in the user screenshot
export const INITIAL_STOCKS: StockQuote[] = [
  {
    ticker: 'TORO',
    name: 'Toro Corp',
    price: 4.28,
    change: 0.69,
    changePercent: 18.85,
    openPercent: 17.57,
    volume: 335894,
    avgVolume: 250000,
    high: 4.52,
    low: 3.65,
    open: 3.68,
    prevClose: 3.59,
    afterHoursChange: -0.07,
    afterHoursPercent: -1.61,
    m1Change: 0.00,
    m5Change: 0.00,
    m15Change: 0.00,
    h1Change: 0.00,
    h4Change: 0.70,
    tagColor: '#ef4444',
    isFavorite: true,
    marketCap: '$84.2M',
    peRatio: 5.4,
    floatShares: '16.8M',
    high52w: 6.85,
    low52w: 2.15,
    sector: 'Marine Shipping',
    description: 'Toro Corp operates an international fleet of tanker vessels carrying crude oil and petroleum products, as well as dry bulk vessels.'
  },
  {
    ticker: 'AIOK',
    name: 'Aioke Health Corp',
    price: 3.42,
    change: 2.21,
    changePercent: 182.82,
    openPercent: 116.58,
    volume: 42894587,
    avgVolume: 1200000,
    high: 3.80,
    low: 1.15,
    open: 1.58,
    prevClose: 1.21,
    afterHoursChange: 0.08,
    afterHoursPercent: 2.34,
    m1Change: -0.05,
    m5Change: 3.42,
    m15Change: 5.14,
    h1Change: 7.03,
    h4Change: -18.26,
    tagColor: '#ef4444',
    marketCap: '$45.1M',
    peRatio: 0,
    floatShares: '8.4M',
    high52w: 5.10,
    low52w: 0.85,
    sector: 'Biotechnology',
    description: 'Aioke Health develops computational drug therapies and oncology candidate solutions targeted at genetic immunotherapies.'
  },
  {
    ticker: 'CLRO',
    name: 'ClearOne Inc',
    price: 1.62,
    change: 0.66,
    changePercent: 69.27,
    openPercent: 64.97,
    volume: 36618744,
    avgVolume: 850000,
    high: 1.84,
    low: 0.95,
    open: 0.98,
    prevClose: 0.96,
    afterHoursChange: -0.02,
    afterHoursPercent: -1.23,
    m1Change: -0.67,
    m5Change: -2.65,
    m15Change: -3.92,
    h1Change: 0.01,
    h4Change: -9.84,
    tagColor: '#3b82f6',
    marketCap: '$38.9M',
    peRatio: 12.1,
    floatShares: '19.2M',
    high52w: 2.45,
    low52w: 0.62,
    sector: 'Audio Communications',
    description: 'ClearOne designs, develops and markets conferencing, collaboration, and network streaming solutions for enterprise communications.'
  },
  {
    ticker: 'LYCA',
    name: 'Lyca Mobile Tech',
    price: 2.15,
    change: 0.86,
    changePercent: 66.67,
    openPercent: 5.08,
    volume: 2287448,
    avgVolume: 410000,
    high: 2.40,
    low: 1.28,
    open: 2.05,
    prevClose: 1.29,
    m1Change: 0.00,
    m5Change: 0.00,
    m15Change: 1.47,
    h1Change: 1.43,
    h4Change: -10.33,
    tagColor: '#10b981',
    marketCap: '$52.7M',
    peRatio: 8.6,
    floatShares: '14.5M',
    high52w: 3.90,
    low52w: 0.92,
    sector: 'Telecommunications',
    description: 'Lyca Mobile Tech provides wireless mobile virtual network operator services and global MVNO roaming architecture.'
  },
  {
    ticker: 'BOLT',
    name: 'Bolt Biotherapeutics',
    price: 1.84,
    change: 0.61,
    changePercent: 49.64,
    openPercent: -10.17,
    volume: 12883312,
    avgVolume: 920000,
    high: 2.12,
    low: 1.18,
    open: 2.05,
    prevClose: 1.23,
    m1Change: 0.88,
    m5Change: 0.59,
    m15Change: 1.55,
    h1Change: 5.05,
    h4Change: 9.41,
    tagColor: '#ef4444',
    marketCap: '$64.3M',
    peRatio: 0,
    floatShares: '22.1M',
    high52w: 3.10,
    low52w: 0.74,
    sector: 'Biotechnology',
    description: 'Bolt Biotherapeutics is a clinical-stage biopharmaceutical company developing novel immunotherapies using Boltbody immune-stimulating conjugates.'
  },
  {
    ticker: 'MYND',
    name: 'Mynd Life Sciences',
    price: 0.85,
    change: 0.27,
    changePercent: 47.42,
    openPercent: -17.24,
    volume: 61528249,
    avgVolume: 3400000,
    high: 1.05,
    low: 0.55,
    open: 1.03,
    prevClose: 0.58,
    m1Change: -2.71,
    m5Change: 4.19,
    m15Change: 11.24,
    h1Change: 0.95,
    h4Change: 41.88,
    tagColor: '#3b82f6',
    marketCap: '$41.8M',
    peRatio: 0,
    floatShares: '48.9M',
    high52w: 1.60,
    low52w: 0.31,
    sector: 'Neuroscience & Life Sci',
    description: 'Mynd Life Sciences develops small molecule neuro-pharmaceutical solutions targeting major depressive disorders and inflammation pathways.'
  },
  {
    ticker: 'ESLA',
    name: 'Estrella Immunopharma',
    price: 1.64,
    change: 0.43,
    changePercent: 35.53,
    openPercent: 28.93,
    volume: 3718736,
    avgVolume: 510000,
    high: 1.95,
    low: 1.20,
    open: 1.27,
    prevClose: 1.21,
    m1Change: 0.00,
    m5Change: -0.54,
    m15Change: 1.44,
    h1Change: 1.46,
    h4Change: -1.95,
    tagColor: '#10b981',
    marketCap: '$29.4M',
    peRatio: 0,
    floatShares: '11.2M',
    high52w: 4.20,
    low52w: 0.88,
    sector: 'Biotechnology',
    description: 'Estrella Immunopharma focuses on developing T-cell therapies with enhanced therapeutic profiles targeting blood cancers and solid tumors.'
  },
  {
    ticker: 'GPUS',
    name: 'Hyperscale GPU Tech',
    price: 2.88,
    change: 0.73,
    changePercent: 34.05,
    openPercent: 11.71,
    volume: 385266603,
    avgVolume: 18000000,
    high: 3.45,
    low: 2.10,
    open: 2.58,
    prevClose: 2.15,
    m1Change: -0.51,
    m5Change: -0.89,
    m15Change: -0.38,
    h1Change: -1.89,
    h4Change: -7.82,
    tagColor: '#ef4444',
    marketCap: '$490.2M',
    peRatio: 24.8,
    floatShares: '124.0M',
    high52w: 4.80,
    low52w: 1.10,
    sector: 'AI Cloud Infrastructure',
    description: 'Hyperscale GPU Tech provides decentralized high-throughput GPU computing clusters for LLM model inference and generative fine-tuning.'
  },
  {
    ticker: 'JYD',
    name: 'Jiayuan Digital Tech',
    price: 1.22,
    change: 0.30,
    changePercent: 32.61,
    openPercent: 31.65,
    volume: 3649005,
    avgVolume: 420000,
    high: 1.38,
    low: 0.91,
    open: 0.93,
    prevClose: 0.92,
    m1Change: 0.00,
    m5Change: 0.00,
    m15Change: 4.06,
    h1Change: -1.62,
    h4Change: -2.16,
    tagColor: '#3b82f6',
    marketCap: '$19.8M',
    peRatio: 14.2,
    floatShares: '12.6M',
    high52w: 2.10,
    low52w: 0.54,
    sector: 'Software Infrastructure',
    description: 'Jiayuan Digital Technology provides automated enterprise resource software, SaaS analytics, and workflow automation services in Asian markets.'
  },
  {
    ticker: 'HTCO',
    name: 'Hickory Tech Corp',
    price: 3.12,
    change: 0.74,
    changePercent: 30.77,
    openPercent: 26.45,
    volume: 3577552,
    avgVolume: 610000,
    high: 3.55,
    low: 2.30,
    open: 2.47,
    prevClose: 2.38,
    m1Change: -3.20,
    m5Change: -4.01,
    m15Change: 1.42,
    h1Change: -4.65,
    h4Change: -6.52,
    tagColor: '#ef4444',
    marketCap: '$58.1M',
    peRatio: 18.9,
    floatShares: '15.4M',
    high52w: 4.10,
    low52w: 1.62,
    sector: 'Semiconductors',
    description: 'Hickory Tech designs specialized analog chipsets and mixed-signal power management IC modules for EV and industrial applications.'
  },
  {
    ticker: 'IMC',
    name: 'IMC Global Logistics',
    price: 4.88,
    change: 1.08,
    changePercent: 28.43,
    openPercent: 23.15,
    volume: 82533,
    avgVolume: 45000,
    high: 5.15,
    low: 3.75,
    open: 3.96,
    prevClose: 3.80,
    m1Change: 0.00,
    m5Change: 0.00,
    m15Change: 0.00,
    h1Change: 2.22,
    h4Change: 2.34,
    tagColor: '#10b981',
    marketCap: '$88.5M',
    peRatio: 9.3,
    floatShares: '14.1M',
    high52w: 7.20,
    low52w: 2.95,
    sector: 'Logistics & Freight',
    description: 'IMC Global Logistics manages intermodal drayage services, customs brokerage, and supply chain cold-storage warehousing.'
  },
  {
    ticker: 'VSME',
    name: 'VSME Energy Systems',
    price: 5.62,
    change: 1.23,
    changePercent: 28.05,
    openPercent: 32.79,
    volume: 323067,
    avgVolume: 110000,
    high: 6.20,
    low: 4.25,
    open: 4.39,
    prevClose: 4.39,
    m1Change: 0.00,
    m5Change: 0.00,
    m15Change: 0.11,
    h1Change: 2.05,
    h4Change: -7.62,
    tagColor: '#ef4444',
    marketCap: '$112.4M',
    peRatio: 16.5,
    floatShares: '17.8M',
    high52w: 8.90,
    low52w: 3.10,
    sector: 'Clean Energy & Solar',
    description: 'VSME Energy Systems designs smart micro-grid storage solutions and commercial utility-scale inverters.'
  },
  {
    ticker: 'UWMC',
    name: 'UWM Holdings Corp',
    price: 7.85,
    change: 1.62,
    changePercent: 26.09,
    openPercent: 23.93,
    volume: 25471371,
    avgVolume: 6800000,
    high: 8.12,
    low: 6.18,
    open: 6.33,
    prevClose: 6.23,
    m1Change: -0.62,
    m5Change: -0.62,
    m15Change: 0.05,
    h1Change: 0.78,
    h4Change: -0.93,
    tagColor: '#3b82f6',
    marketCap: '$12.4B',
    peRatio: 22.3,
    floatShares: '158.0M',
    high52w: 9.40,
    low52w: 4.80,
    sector: 'Mortgage Lending',
    description: 'UWM Holdings is the leading wholesale mortgage originator in the United States providing tech-driven underwriting platforms.'
  },
  {
    ticker: 'XTIA',
    name: 'Inpixon Micro Tech',
    price: 0.78,
    change: 0.16,
    changePercent: 25.88,
    openPercent: 25.88,
    volume: 4415725,
    avgVolume: 980000,
    high: 0.89,
    low: 0.61,
    open: 0.62,
    prevClose: 0.62,
    m1Change: 0.16,
    m5Change: 0.16,
    m15Change: 2.09,
    h1Change: 0.16,
    h4Change: 0.64,
    tagColor: '#10b981',
    marketCap: '$14.2M',
    peRatio: 0,
    floatShares: '18.5M',
    high52w: 2.30,
    low52w: 0.42,
    sector: 'IoT & Spatial Intelligence',
    description: 'Inpixon provides indoor intelligence, real-time location systems (RTLS), and ultra-wideband RF positioning sensors.'
  },
  {
    ticker: 'BKHA',
    name: 'Black Hawk Energy',
    price: 2.92,
    change: 0.60,
    changePercent: 25.87,
    openPercent: 28.57,
    volume: 204535,
    avgVolume: 80000,
    high: 3.25,
    low: 2.28,
    open: 2.32,
    prevClose: 2.32,
    m1Change: 0.00,
    m5Change: 0.00,
    m15Change: 5.80,
    h1Change: -0.19,
    h4Change: -2.04,
    tagColor: '#ef4444',
    marketCap: '$32.1M',
    peRatio: 7.2,
    floatShares: '9.6M',
    high52w: 4.50,
    low52w: 1.80,
    sector: 'Oil & Gas Exploration',
    description: 'Black Hawk Energy engages in exploration, acquisition, and extraction of Permian basin oil reserves.'
  },
  {
    ticker: 'LUCD',
    name: 'Lucid Diagnostics Inc',
    price: 1.48,
    change: 0.30,
    changePercent: 25.42,
    openPercent: -5.32,
    volume: 111802102,
    avgVolume: 4200000,
    high: 1.76,
    low: 1.10,
    open: 1.56,
    prevClose: 1.18,
    m1Change: 0.72,
    m5Change: 0.22,
    m15Change: 0.10,
    h1Change: -3.36,
    h4Change: -1.24,
    tagColor: '#3b82f6',
    marketCap: '$72.5M',
    peRatio: 0,
    floatShares: '42.0M',
    high52w: 2.80,
    low52w: 0.65,
    sector: 'Medical Diagnostics',
    description: 'Lucid Diagnostics commercializes EsoGuard non-invasive DNA test tools for early esophageal cancer detection.'
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 142.18,
    change: 4.88,
    changePercent: 3.55,
    openPercent: 2.10,
    volume: 58210940,
    avgVolume: 48000000,
    high: 144.20,
    low: 138.90,
    open: 139.30,
    prevClose: 137.30,
    afterHoursChange: 0.65,
    afterHoursPercent: 0.46,
    m1Change: 0.08,
    m5Change: 0.24,
    m15Change: 0.58,
    h1Change: 1.12,
    h4Change: 2.80,
    tagColor: '#10b981',
    isFavorite: true,
    marketCap: '$3.52T',
    peRatio: 52.4,
    floatShares: '2.45B',
    high52w: 149.77,
    low52w: 75.60,
    sector: 'Semiconductors & AI',
    description: 'NVIDIA pioneer in accelerated computing and GPU architecture empowering world-scale artificial intelligence models.'
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc',
    price: 256.40,
    change: 8.92,
    changePercent: 3.60,
    openPercent: 1.85,
    volume: 74120930,
    avgVolume: 65000000,
    high: 259.80,
    low: 248.10,
    open: 251.80,
    prevClose: 247.48,
    m1Change: 0.12,
    m5Change: 0.45,
    m15Change: 0.89,
    h1Change: 1.75,
    h4Change: 3.10,
    tagColor: '#ef4444',
    marketCap: '$815.6B',
    peRatio: 64.2,
    floatShares: '2.68B',
    high52w: 271.00,
    low52w: 138.80,
    sector: 'Automotive & Clean Tech',
    description: 'Tesla designs electric vehicles, battery energy storage systems, and autonomous full self-driving networks.'
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc',
    price: 231.50,
    change: 1.85,
    changePercent: 0.81,
    openPercent: 0.42,
    volume: 38401200,
    avgVolume: 45000000,
    high: 232.80,
    low: 229.40,
    open: 230.50,
    prevClose: 229.65,
    m1Change: 0.02,
    m5Change: 0.05,
    m15Change: 0.14,
    h1Change: 0.35,
    h4Change: 0.65,
    tagColor: '#3b82f6',
    marketCap: '$3.48T',
    peRatio: 33.8,
    floatShares: '15.1B',
    high52w: 237.23,
    low52w: 164.08,
    sector: 'Consumer Electronics',
    description: 'Apple designs smartphones, personal computers, tablets, wearables, and ecosystem digital cloud software services.'
  },
  {
    ticker: 'QQQ',
    name: 'Invesco QQQ Trust (NASDAQ 100)',
    price: 494.35,
    change: 5.62,
    changePercent: 1.15,
    openPercent: 0.80,
    volume: 41203900,
    avgVolume: 38000000,
    high: 496.10,
    low: 490.20,
    open: 490.50,
    prevClose: 488.73,
    m1Change: 0.04,
    m5Change: 0.12,
    m15Change: 0.28,
    h1Change: 0.64,
    h4Change: 1.05,
    tagColor: '#10b981',
    isFavorite: true,
    marketCap: '$290B',
    peRatio: 28.5,
    floatShares: '580M',
    high52w: 503.52,
    low52w: 350.20,
    sector: 'Index ETF',
    description: 'Tracks the NASDAQ-100 Index, comprising the 100 largest non-financial companies listed on the NASDAQ exchange.'
  }
];

// Generate realistic candlestick history matching the timeframe and screenshot characteristics
export function generateCandlesForStock(stock: StockQuote, timeframe: Timeframe): Candle[] {
  const candles: Candle[] = [];
  const barCount = 200; // Expanded historical bar count for smooth bidirectional panning
  
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

    const close = Math.max(0.1, Number((open * (1 + changePct)).toFixed(2)));
    const volatility = Math.abs(close - open) * (1.2 + Math.random() * 1.5) + (open * 0.003);
    const high = Number((Math.max(open, close) + Math.random() * volatility).toFixed(2));
    const low = Number((Math.min(open, close) - Math.random() * volatility).toFixed(2));
    const volume = Math.floor(Math.max(100, volumeBase));

    candles.push({
      time: candleTime,
      timeStr,
      open,
      high,
      low: Math.max(0.05, low),
      close,
      volume
    });

    currentPrice = close;
  }

  // Force the final candle close to match current stock price
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    last.close = stock.price;
    last.high = Math.max(last.high, stock.price);
    last.low = Math.min(last.low, stock.price);
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
      result.push(Number((sum / period).toFixed(3)));
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
      result.push(Number(prevEma.toFixed(3)));
    } else {
      const currentEma: number = (candles[i].close - (prevEma as number)) * multiplier + (prevEma as number);
      prevEma = currentEma;
      result.push(Number(currentEma.toFixed(3)));
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
      result.push(Number((cumulativeTypicalPriceVolume / cumulativeVolume).toFixed(3)));
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
export function formatVolume(num: number): string {
  return num.toLocaleString('en-US');
}

export function formatCompactVolume(num: number): string {
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
}
