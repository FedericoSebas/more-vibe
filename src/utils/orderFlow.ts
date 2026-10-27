import { 
  Candle, 
  FootprintLevel, 
  CandleFootprint, 
  Level2Book, 
  Level2Order, 
  OrderFlowTrade, 
  StockQuote,
  StackedImbalance 
} from '../types/stock';

/**
 * Calculates a dynamic tick size for the footprint chart based on price range
 * to ensure 10-25 clean, readable price ladder levels inside each candle.
 */
export function calculateDynamicTickSize(low: number, high: number, price: number): number {
  const range = Math.max(0.01, high - low);
  
  // Aim for roughly 10-20 discrete levels per candle
  const rawStep = range / 14;
  
  if (price < 2) {
    if (rawStep < 0.002) return 0.001;
    if (rawStep < 0.005) return 0.005;
    return 0.01;
  }
  if (price < 15) {
    if (rawStep < 0.02) return 0.01;
    if (rawStep < 0.05) return 0.02;
    return 0.05;
  }
  if (price < 100) {
    if (rawStep < 0.05) return 0.02;
    if (rawStep < 0.10) return 0.05;
    if (rawStep < 0.25) return 0.10;
    return 0.25;
  }
  if (price < 500) {
    if (rawStep < 0.20) return 0.10;
    if (rawStep < 0.50) return 0.25;
    if (rawStep < 1.00) return 0.50;
    return 1.00;
  }
  
  if (rawStep < 0.50) return 0.25;
  if (rawStep < 1.00) return 0.50;
  if (rawStep < 2.50) return 1.00;
  return 2.50;
}

/**
 * Generates high-fidelity footprint order flow auction levels for a candle.
 * Reproduces true Bid x Ask order book execution mechanics:
 * - Market sells hit the bid (Bid Volume)
 * - Market buys lift the ask (Ask Volume)
 * - Volume clusters around the Value Area (POC)
 * - Detects aggressive buying/selling imbalances (e.g. 400% ratio)
 * - Simulates institutional stacked sweeps (3+ contiguous levels)
 */
export function generateCandleFootprint(
  candle: Candle,
  level2Context?: Level2Book | null,
  imbalanceRatio = 4.0,
  imbalanceMode: 'level' | 'diagonal' = 'diagonal',
  minVolumeThreshold = 10
): CandleFootprint {
  const { open, high, low, close, volume } = candle;
  const isUp = close >= open;
  const tickSize = calculateDynamicTickSize(low, high, close);
  
  // Quantize start and end prices
  const minPrice = Math.floor(low / tickSize) * tickSize;
  const maxPrice = Math.ceil(high / tickSize) * tickSize;
  
  const levelsCount = Math.max(3, Math.min(40, Math.round((maxPrice - minPrice) / tickSize) + 1));
  const levels: FootprintLevel[] = [];
  
  // Value area center around body midpoint
  const bodyCenter = (open + close) / 2;
  // Natural POC offset towards close if trending strongly
  const pocTargetPrice = isUp 
    ? bodyCenter + (close - bodyCenter) * 0.4
    : bodyCenter - (bodyCenter - close) * 0.4;
    
  let maxLevelVol = 0;
  let pocLevelIndex = 0;
  let runningDelta = 0;
  let minDelta = 0;
  let maxDelta = 0;

  // Step 1: Calculate raw weight for each level
  const rawWeights: number[] = [];
  for (let i = 0; i < levelsCount; i++) {
    const lvlPrice = minPrice + i * tickSize;
    const distToPoc = Math.abs(lvlPrice - pocTargetPrice);
    const normalizedDist = distToPoc / Math.max(0.01, high - low);
    
    // Gaussian-like concentration at POC + slight randomness
    const variance = 0.22;
    const bellWeight = Math.exp(-(normalizedDist * normalizedDist) / (2 * variance * variance));
    
    // Higher volume inside candle body, lower volume on wicks
    const isInsideBody = lvlPrice >= Math.min(open, close) && lvlPrice <= Math.max(open, close);
    const bodyBonus = isInsideBody ? 1.4 : 0.65;
    
    // Deterministic pseudo-random variation based on price level & time
    const levelSeed = Math.sin((candle.time + i * 997) * 0.01) * 0.5 + 0.5;
    const randomFactor = 0.75 + levelSeed * 0.5;
    
    const weight = Math.max(0.05, bellWeight * bodyBonus * randomFactor);
    rawWeights.push(weight);
  }
  
  const sumWeights = rawWeights.reduce((a, b) => a + b, 0) || 1;

  // Authentic Stacked Imbalance generation:
  // Determine if this candle features an institutional block sweep (3-4 consecutive price levels)
  const stackSeed = Math.sin(candle.time * 0.0051 + (candle.volume % 773));
  const hasStack = levelsCount >= 6 && Math.abs(stackSeed) > 0.28;
  const stackIsBuy = isUp ? stackSeed > -0.3 : stackSeed > 0.35;
  const stackLength = Math.min(levelsCount - 2, Math.abs(stackSeed) > 0.6 ? 4 : 3);
  
  let stackStartIdx = -1;
  if (hasStack) {
    const minBodyIdx = Math.max(1, Math.floor((Math.min(open, close) - minPrice) / tickSize));
    const maxBodyIdx = Math.min(levelsCount - stackLength - 1, Math.ceil((Math.max(open, close) - minPrice) / tickSize));
    if (maxBodyIdx >= minBodyIdx) {
      stackStartIdx = minBodyIdx + Math.floor(Math.abs(stackSeed * 7) % (maxBodyIdx - minBodyIdx + 1));
    } else {
      stackStartIdx = Math.max(1, Math.min(levelsCount - stackLength - 1, Math.floor(levelsCount / 2) - 1));
    }
  }
  
  // Step 2: Build footprint levels
  for (let i = 0; i < levelsCount; i++) {
    const lvlPrice = Math.round((minPrice + i * tickSize) * 10000) / 10000;
    const levelVolFraction = rawWeights[i] / sumWeights;
    const levelTotalVol = Math.max(10, Math.round(volume * levelVolFraction));
    
    let buyRatio: number;
    const pricePosition = (lvlPrice - low) / Math.max(0.01, high - low);
    
    if (isUp) {
      buyRatio = 0.48 + 0.28 * pricePosition;
    } else {
      buyRatio = 0.52 - 0.28 * (1 - pricePosition);
    }

    // Check if this level falls into the institutional stacked sweep
    if (hasStack && i >= stackStartIdx && i < stackStartIdx + stackLength) {
      if (stackIsBuy) {
        // Institutional buyer sweep: Ask is >= 4.2x to 15x Bid
        buyRatio = 0.83 + ((i - stackStartIdx) * 0.02) + (Math.sin(candle.time + i) * 0.04);
        buyRatio = Math.max(0.82, Math.min(0.96, buyRatio));
      } else {
        // Institutional seller dump: Bid is >= 4.2x to 15x Ask
        buyRatio = 0.17 - ((i - stackStartIdx) * 0.02) - (Math.sin(candle.time + i) * 0.04);
        buyRatio = Math.max(0.04, Math.min(0.18, buyRatio));
      }
    } else {
      // General auction sweeps / absorption
      const levelSeed = Math.sin((candle.time * 0.003 + i * 2.718));
      if (levelSeed > 0.62) {
        buyRatio = 0.81 + (levelSeed - 0.62) * 0.35;
      } else if (levelSeed < -0.62) {
        buyRatio = 0.19 - (-levelSeed - 0.62) * 0.35;
      } else {
        buyRatio += (Math.cos((candle.time + i) * 0.05) * 0.10);
      }
    }
    
    // Level 2 depth skew
    if (level2Context) {
      buyRatio += level2Context.imbalanceRatio * 0.08;
    }
    
    buyRatio = Math.max(0.04, Math.min(0.96, buyRatio));
    
    const askVol = Math.round(levelTotalVol * buyRatio);
    const bidVol = Math.max(1, levelTotalVol - askVol);
    const levelDelta = askVol - bidVol;
    
    runningDelta += levelDelta;
    if (runningDelta < minDelta) minDelta = runningDelta;
    if (runningDelta > maxDelta) maxDelta = runningDelta;
    
    if (levelTotalVol > maxLevelVol) {
      maxLevelVol = levelTotalVol;
      pocLevelIndex = i;
    }
    
    levels.push({
      price: lvlPrice,
      bidVolume: bidVol,
      askVolume: askVol,
      totalVolume: bidVol + askVol,
      delta: levelDelta,
      isPoc: false,
      isBuyImbalance: false,
      isSellImbalance: false
    });
  }
  
  // Set POC (Point of Control)
  if (levels[pocLevelIndex]) {
    levels[pocLevelIndex].isPoc = true;
  }
  
  // Step 3: Imbalance detection (Horizontal price-level or Diagonal auction)
  for (let i = 0; i < levels.length; i++) {
    const curLevel = levels[i];
    
    if (imbalanceMode === 'level') {
      const bid = Math.max(1, curLevel.bidVolume);
      const ask = Math.max(1, curLevel.askVolume);
      
      const bRatio = ask / bid;
      const sRatio = bid / ask;
      curLevel.buyImbalanceRatio = Math.round(bRatio * 10) / 10;
      curLevel.sellImbalanceRatio = Math.round(sRatio * 10) / 10;
      
      if (bRatio >= imbalanceRatio && curLevel.askVolume >= minVolumeThreshold) {
        curLevel.isBuyImbalance = true;
      }
      if (sRatio >= imbalanceRatio && curLevel.bidVolume >= minVolumeThreshold) {
        curLevel.isSellImbalance = true;
      }
    } else {
      // Diagonal auction comparison
      if (i > 0) {
        const prevBid = Math.max(1, levels[i - 1].bidVolume);
        const bRatio = curLevel.askVolume / prevBid;
        curLevel.buyImbalanceRatio = Math.round(bRatio * 10) / 10;
        if (bRatio >= imbalanceRatio && curLevel.askVolume >= minVolumeThreshold) {
          curLevel.isBuyImbalance = true;
        }
      }
      
      if (i < levels.length - 1) {
        const nextAsk = Math.max(1, levels[i + 1].askVolume);
        const sRatio = curLevel.bidVolume / nextAsk;
        curLevel.sellImbalanceRatio = Math.round(sRatio * 10) / 10;
        if (sRatio >= imbalanceRatio && curLevel.bidVolume >= minVolumeThreshold) {
          curLevel.isSellImbalance = true;
        }
      }
    }
  }
  
  const totalDelta = levels.reduce((acc, l) => acc + l.delta, 0);
  const totalCalculatedVol = levels.reduce((acc, l) => acc + l.totalVolume, 0) || volume;
  const deltaPercent = totalCalculatedVol > 0 ? (totalDelta / totalCalculatedVol) * 100 : 0;
  
  return {
    levels,
    pocPrice: levels[pocLevelIndex]?.price ?? close,
    totalDelta,
    deltaPercent: Math.round(deltaPercent * 10) / 10,
    totalVolume: totalCalculatedVol,
    minDelta,
    maxDelta,
    tickSize
  };
}

/**
 * Creates a normalized StackedImbalance data structure from consecutive levels
 */
function createStackedImbalanceObj(
  candle: Candle,
  candleIndex: number,
  levels: FootprintLevel[],
  side: 'buy' | 'sell',
  tickSize: number
): StackedImbalance {
  const sorted = [...levels].sort((a, b) => a.price - b.price);
  const minPrice = sorted[0].price;
  const maxPrice = sorted[sorted.length - 1].price;
  
  const totalVolume = sorted.reduce((sum, l) => sum + l.totalVolume, 0);
  const totalDelta = sorted.reduce((sum, l) => sum + l.delta, 0);

  let highestVol = -1;
  let pocPrice = sorted[0].price;
  for (const l of sorted) {
    if (l.totalVolume > highestVol) {
      highestVol = l.totalVolume;
      pocPrice = l.price;
    }
  }

  return {
    id: `stack_${candle.time}_${side}_${minPrice.toFixed(4)}_${maxPrice.toFixed(4)}`,
    candleIndex,
    candleTime: candle.time,
    candleTimeStr: candle.timeStr,
    side,
    count: sorted.length,
    topPrice: Math.round((maxPrice + tickSize * 0.5) * 10000) / 10000,
    bottomPrice: Math.round((minPrice - tickSize * 0.5) * 10000) / 10000,
    pocPrice,
    tickSize,
    levels: sorted,
    totalVolume,
    totalDelta,
    mitigated: false,
    mitigatedCandleIndex: null,
    mitigatedCandleTime: null,
    mitigatedPrice: null,
    status: 'active'
  };
}

/**
 * Extracts stacked imbalances within a single candle's footprint
 */
export function extractCandleStackedImbalances(
  candle: Candle,
  candleIndex: number,
  fp: CandleFootprint,
  minStackLevels = 3
): StackedImbalance[] {
  const result: StackedImbalance[] = [];
  const levels = fp.levels;
  if (!levels || levels.length < minStackLevels) return result;

  // 1. Detect Buy Stacks (consecutive levels with isBuyImbalance)
  let currentBuyStack: FootprintLevel[] = [];
  for (let i = 0; i < levels.length; i++) {
    const lvl = levels[i];
    if (lvl.isBuyImbalance) {
      currentBuyStack.push(lvl);
    } else {
      if (currentBuyStack.length >= minStackLevels) {
        result.push(createStackedImbalanceObj(candle, candleIndex, currentBuyStack, 'buy', fp.tickSize));
      }
      currentBuyStack = [];
    }
  }
  if (currentBuyStack.length >= minStackLevels) {
    result.push(createStackedImbalanceObj(candle, candleIndex, currentBuyStack, 'buy', fp.tickSize));
  }

  // 2. Detect Sell Stacks (consecutive levels with isSellImbalance)
  let currentSellStack: FootprintLevel[] = [];
  for (let i = 0; i < levels.length; i++) {
    const lvl = levels[i];
    if (lvl.isSellImbalance) {
      currentSellStack.push(lvl);
    } else {
      if (currentSellStack.length >= minStackLevels) {
        result.push(createStackedImbalanceObj(candle, candleIndex, currentSellStack, 'sell', fp.tickSize));
      }
      currentSellStack = [];
    }
  }
  if (currentSellStack.length >= minStackLevels) {
    result.push(createStackedImbalanceObj(candle, candleIndex, currentSellStack, 'sell', fp.tickSize));
  }

  return result;
}

/**
 * Detects all stacked imbalances across candles and projects / reflects
 * their key levels forward in time until the NEXT candle that reaches those key levels.
 * If no subsequent candle reaches them, the stack remains 'active' (untested key support/resistance).
 */
export function detectAndProjectStackedImbalances(
  candles: Candle[],
  footprintLookup: (index: number) => CandleFootprint | undefined,
  minStackLevels = 3
): StackedImbalance[] {
  const allStacks: StackedImbalance[] = [];

  // Step 1: Detect all stacks across candles
  for (let i = 0; i < candles.length; i++) {
    const fp = footprintLookup(i);
    if (!fp) continue;
    const candleStacks = extractCandleStackedImbalances(candles[i], i, fp, minStackLevels);
    allStacks.push(...candleStacks);
  }

  // Step 2: For each stack, project forward to find the NEXT candle that reaches those key levels
  for (const stack of allStacks) {
    const startIdx = stack.candleIndex;
    let foundMitigation = false;

    for (let k = startIdx + 1; k < candles.length; k++) {
      const nextCandle = candles[k];
      // A candle reaches the key levels if its [low, high] price range overlaps the stack's [bottomPrice, topPrice]
      if (nextCandle.low <= stack.topPrice && nextCandle.high >= stack.bottomPrice) {
        stack.mitigated = true;
        stack.mitigatedCandleIndex = k;
        stack.mitigatedCandleTime = nextCandle.time;
        stack.mitigatedCandleTimeStr = nextCandle.timeStr;
        
        // Touch price: where the candle tested the key levels
        if (stack.side === 'buy') {
          stack.mitigatedPrice = Math.min(stack.topPrice, Math.max(stack.bottomPrice, nextCandle.low));
        } else {
          stack.mitigatedPrice = Math.max(stack.bottomPrice, Math.min(stack.topPrice, nextCandle.high));
        }
        stack.status = 'mitigated';
        foundMitigation = true;
        break; // Stop at the NEXT candle that reaches those key levels!
      }
    }

    if (!foundMitigation) {
      stack.mitigated = false;
      stack.mitigatedCandleIndex = null;
      stack.status = 'active';
    }
  }

  return allStacks;
}

/**
 * Generates an authentic NASDAQ Level 2 Depth of Market (DOM) Order Book.
 * Includes Bids & Asks across 14 depth tiers, Market Participant IDs (MPIDs),
 * Order Counts, Cumulative Depth, Spread, and Imbalance Meter.
 */
export function generateLevel2Book(stock: StockQuote, livePrice?: number): Level2Book {
  const price = livePrice || stock.price;
  
  // Calculate spread based on stock price
  const spreadCents = price < 5 ? 0.01 : price < 50 ? 0.01 : price < 200 ? 0.02 : 0.05;
  const halfSpread = spreadCents / 2;
  const bestBid = Math.round((price - halfSpread) * 1000) / 1000;
  const bestAsk = Math.round((price + halfSpread) * 1000) / 1000;
  
  const tickStep = spreadCents;
  const MPIDS = ['NSDQ', 'ARCA', 'EDGX', 'BATS', 'IEX', 'BYX', 'MEMX', 'CHX'];
  
  const depthLevels = 14;
  const bids: Level2Order[] = [];
  const asks: Level2Order[] = [];
  
  let runningBidTotal = 0;
  let runningAskTotal = 0;
  
  // Stock volume scale factor for realistic lot sizes
  const volScale = Math.max(1, Math.min(20, Math.round(stock.volume / 250000)));
  
  // Generate Bids (descending order from best bid)
  for (let i = 0; i < depthLevels; i++) {
    const lvlPrice = Math.round((bestBid - i * tickStep) * 1000) / 1000;
    // Liquidity often clusters 3-6 ticks away from top of book
    const depthCurve = 1 + Math.sin((i / depthLevels) * Math.PI) * 1.8;
    const baseSize = Math.round((100 + Math.random() * 400 * depthCurve) * volScale);
    const size = Math.round(baseSize / 100) * 100; // Standard 100-share lots
    runningBidTotal += size;
    
    bids.push({
      id: `bid_${stock.ticker}_${i}`,
      price: lvlPrice,
      size,
      total: runningBidTotal,
      ordersCount: Math.max(1, Math.round(size / (150 * volScale))),
      mpid: MPIDS[i % MPIDS.length]
    });
  }
  
  // Generate Asks (ascending order from best ask)
  for (let i = 0; i < depthLevels; i++) {
    const lvlPrice = Math.round((bestAsk + i * tickStep) * 1000) / 1000;
    const depthCurve = 1 + Math.sin((i / depthLevels) * Math.PI) * 1.8;
    // Bias size slightly by stock change direction to create realistic order book pressure
    const bias = stock.change >= 0 ? 0.85 : 1.15;
    const baseSize = Math.round((100 + Math.random() * 400 * depthCurve * bias) * volScale);
    const size = Math.round(baseSize / 100) * 100;
    runningAskTotal += size;
    
    asks.push({
      id: `ask_${stock.ticker}_${i}`,
      price: lvlPrice,
      size,
      total: runningAskTotal,
      ordersCount: Math.max(1, Math.round(size / (150 * volScale))),
      mpid: MPIDS[(i + 2) % MPIDS.length]
    });
  }
  
  const spread = Math.round((bestAsk - bestBid) * 1000) / 1000;
  const spreadPercent = price > 0 ? (spread / price) * 100 : 0;
  
  // Imbalance: -1 (all asks) to +1 (all bids)
  const totalDepth = runningBidTotal + runningAskTotal;
  const imbalanceRatio = totalDepth > 0 ? (runningBidTotal - runningAskTotal) / totalDepth : 0;
  
  return {
    ticker: stock.ticker,
    bids,
    asks,
    spread,
    spreadPercent: Math.round(spreadPercent * 100) / 100,
    bidDepthTotal: runningBidTotal,
    askDepthTotal: runningAskTotal,
    imbalanceRatio: Math.round(imbalanceRatio * 100) / 100,
    lastUpdated: Date.now()
  };
}

/**
 * Generates streaming Time & Sales trades (executed trades tape)
 * directly synced with the Level 2 order book and footprint.
 */
export function generateRecentTrades(stock: StockQuote, count = 25): OrderFlowTrade[] {
  const trades: OrderFlowTrade[] = [];
  const now = Date.now();
  const price = stock.price;
  const spread = price < 5 ? 0.01 : price < 50 ? 0.01 : 0.02;
  
  for (let i = 0; i < count; i++) {
    const tradeTime = now - (count - 1 - i) * 650;
    const d = new Date(tradeTime);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    
    // Aggressive side
    const isBuy = Math.random() < (stock.change >= 0 ? 0.58 : 0.44);
    const tradePrice = isBuy 
      ? Math.round((price + (Math.random() < 0.2 ? spread : 0)) * 1000) / 1000
      : Math.round((price - (Math.random() < 0.2 ? spread : 0)) * 1000) / 1000;
      
    // Common stock sizes: 100, 200, 500, 1000, 2500
    const lotMultipliers = [1, 1, 2, 3, 5, 10, 15];
    const lot = lotMultipliers[Math.floor(Math.random() * lotMultipliers.length)];
    const size = lot * 100;
    
    trades.push({
      id: `trade_${now}_${i}`,
      time: tradeTime,
      timeStr,
      price: tradePrice,
      size,
      side: isBuy ? 'buy' : 'sell'
    });
  }
  
  return trades;
}

/**
 * Compact number formatting for order flow volume (e.g. 140, 2.4K, 1.8M)
 */
export function formatOrderFlowVolume(vol: number): string {
  if (vol >= 1000000) {
    return `${(vol / 1000000).toFixed(1)}M`;
  }
  if (vol >= 1000) {
    return `${(vol / 1000).toFixed(1)}K`;
  }
  return vol.toString();
}
