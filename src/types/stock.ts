export type Timeframe = '1M' | '5M' | '10M' | '1H' | '4H' | 'D';

export type DateRangeKey = 
  | '1d' 
  | '5d' 
  | '1mo' 
  | '3mo' 
  | '6mo' 
  | 'ytd' 
  | '1y' 
  | '2y' 
  | '5y' 
  | 'max' 
  | 'custom';

export interface CustomDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export type ChartType = 'candles' | 'hollow' | 'line' | 'area';

export type DrawingTool = 'crosshair' | 'pan' | 'trendline' | 'horizontal' | 'fibonacci' | 'brush' | 'ruler' | 'select' | null;

export type MarketSession = 'pre' | 'regular' | 'post' | 'overnight';

export interface Candle {
  time: number; // Unix timestamp in ms
  timeStr: string; // e.g. "09:30" or "Oct 24 09:30"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  session?: MarketSession; // Pre-market (4:00-9:30 ET), Regular (9:30-16:00 ET), Post/After-market (16:00-20:00 ET), Overnight (20:00-4:00 ET)
  footprint?: CandleFootprint;
}

export type FootprintImbalanceMode = 'level' | 'diagonal';

export interface FootprintLevel {
  price: number;
  bidVolume: number; // Selling volume hitting the bid
  askVolume: number; // Buying volume lifting the ask
  totalVolume: number;
  delta: number;      // askVolume - bidVolume
  isPoc: boolean;     // Point of Control (highest volume node)
  isBuyImbalance: boolean;  // Ask >= 4x Bid
  isSellImbalance: boolean; // Bid >= 4x Ask
  buyImbalanceRatio?: number;
  sellImbalanceRatio?: number;
}

export interface FootprintFilterConfig {
  highlightImbalances: boolean;
  imbalanceRatio: number; // e.g. 4.0 (4 times as many buyers or sellers)
  imbalanceMode: FootprintImbalanceMode; // 'level' (same price level) | 'diagonal'
  minVolumeThreshold: number; // minimum contracts threshold
  showRatioBadge?: boolean;
  showStackedImbalances?: boolean;
  minStackLevels?: number; // default 3 consecutive levels
  reflectToNextCandle?: boolean; // reflect key levels to the next candle that reaches them
  showTestedLevels?: boolean; // display mitigated/tested reflections
}

export interface StackedImbalance {
  id: string;
  candleIndex: number;
  candleTime: number;
  candleTimeStr: string;
  side: 'buy' | 'sell';
  count: number; // number of consecutive levels (e.g. 3, 4, 5)
  topPrice: number;
  bottomPrice: number;
  pocPrice: number;
  tickSize: number;
  levels: FootprintLevel[];
  totalVolume: number;
  totalDelta: number;
  // Reflection / Key level reach state
  mitigated: boolean;
  mitigatedCandleIndex: number | null; // index of the first subsequent candle that reaches these key levels
  mitigatedCandleTime: number | null;
  mitigatedCandleTimeStr?: string;
  mitigatedPrice: number | null;
  status: 'active' | 'mitigated';
}

export interface CandleFootprint {
  levels: FootprintLevel[];
  pocPrice: number;
  totalDelta: number;
  deltaPercent: number;
  totalVolume: number;
  minDelta: number;
  maxDelta: number;
  tickSize: number;
  stackedImbalances?: StackedImbalance[];
}

export interface Level2Order {
  id: string;
  price: number;
  size: number;
  total: number;
  ordersCount: number;
  mpid?: string; // Market participant ID: 'NSDQ' | 'ARCA' | 'BATS' | 'EDGX' | 'IEX'
}

export interface Level2Book {
  ticker: string;
  bids: Level2Order[];
  asks: Level2Order[];
  spread: number;
  spreadPercent: number;
  bidDepthTotal: number;
  askDepthTotal: number;
  imbalanceRatio: number; // e.g. -1 (100% sell pressure) to +1 (100% buy pressure)
  lastUpdated: number;
}

export interface OrderFlowTrade {
  id: string;
  time: number;
  timeStr: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

export type FootprintMode = 'bid-ask' | 'delta' | 'volume';

export interface FootprintConfig {
  enabled: boolean;
  mode: FootprintMode;
  imbalanceRatio: number;
  showPoc: boolean;
  showSummaryDelta: boolean;
  minZoomCandleWidth: number;
}

export interface IndicatorVisibility {
  ema9: boolean;
  sma20: boolean;
  sma200: boolean;
  vwap: boolean;
  volumeProfile: boolean;
  macd: boolean;
  barStats?: boolean;
  stackedImbalances?: boolean;
}

export interface VolumeProfileLevel {
  price: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
}

export interface MacdPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  openPercent: number;
  volume: number;
  avgVolume: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  afterHoursChange?: number;
  afterHoursPercent?: number;
  m1Change: number;
  m5Change: number;
  m15Change: number;
  h1Change: number;
  h4Change: number;
  tagColor: string; // e.g. '#ef4444', '#3b82f6', '#22c55e', '#a855f7'
  isFavorite?: boolean;
  marketCap: string;
  peRatio: number;
  floatShares: string;
  high52w: number;
  low52w: number;
  sector: string;
  description: string;
}

export interface DrawnObject {
  id: string;
  type: 'trendline' | 'horizontal' | 'fibonacci' | 'brush' | 'ruler';
  points: { x: number; y: number; price: number; time: number }[];
  color: string;
}
