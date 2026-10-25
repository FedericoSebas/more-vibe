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

export type MarketSession = 'pre' | 'regular' | 'post';

export interface Candle {
  time: number; // Unix timestamp in ms
  timeStr: string; // e.g. "09:30" or "Oct 24 09:30"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  session?: MarketSession; // Pre-market (4:00-9:30 ET), Regular (9:30-16:00 ET), Post/After-market (16:00-20:00 ET)
}

export interface IndicatorVisibility {
  ema9: boolean;
  sma20: boolean;
  sma200: boolean;
  vwap: boolean;
  volumeProfile: boolean;
  macd: boolean;
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
