import React, { useState, useRef, useEffect } from 'react';
import { 
  Star, 
  ExternalLink, 
  CandlestickChart, 
  LineChart, 
  Calendar, 
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Search
} from 'lucide-react';
import { StockQuote, Timeframe, ChartType, IndicatorVisibility } from '../types/stock';
import { soundManager } from '../utils/sound';

interface ChartHeaderProps {
  currentStock: StockQuote;
  allStocks: StockQuote[];
  onSelectStock: (stock: StockQuote) => void;
  onToggleFavorite: (ticker: string) => void;
  onOpenOverview: () => void;
  timeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;
  chartType: ChartType;
  onChangeChartType: (type: ChartType) => void;
  indicators: IndicatorVisibility;
  onToggleIndicator: (key: keyof IndicatorVisibility) => void;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({
  currentStock,
  allStocks,
  onSelectStock,
  onToggleFavorite,
  onOpenOverview,
  timeframe,
  onChangeTimeframe,
  chartType,
  onChangeChartType,
  indicators,
  onToggleIndicator
}) => {
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchRef = useRef<HTMLDivElement>(null);
  const chartTypeRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSymbolSearch(false);
      }
      if (chartTypeRef.current && !chartTypeRef.current.contains(e.target as Node)) {
        setShowChartTypeMenu(false);
      }
      if (indicatorRef.current && !indicatorRef.current.contains(e.target as Node)) {
        setShowIndicatorMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStocks = allStocks.filter(s => 
    s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const timeframes: Timeframe[] = ['1M', '5M', '10M', '1H', '4H', 'D'];

  const isPositive = currentStock.change >= 0;
  const isAfterHoursPositive = (currentStock.afterHoursChange ?? 0) >= 0;

  return (
    <div className="h-10 bg-[#0e131d] border-b border-[#1b2333] flex items-center justify-between px-3 text-xs select-none">
      {/* Left: Ticker badge, star, Overview button, Chart type, Timeframes, Indicators */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Symbol Selector Dropdown */}
        <div className="relative" ref={searchRef}>
          <button
            onClick={() => {
              setShowSymbolSearch(!showSymbolSearch);
              setSearchQuery('');
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#171f2c] hover:bg-[#1f2a3c] border border-[#263246] text-white font-bold tracking-wide transition-colors"
          >
            {/* Red / Color indicator badge from screenshot */}
            <span 
              className="w-2.5 h-2.5 rounded-[2px]" 
              style={{ backgroundColor: currentStock.tagColor || '#ef4444' }} 
            />
            <span className="text-sm font-mono">{currentStock.ticker}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Search Dropdown Popover */}
          {showSymbolSearch && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-[#121824] border border-[#253247] rounded-md shadow-2xl z-50 overflow-hidden">
              <div className="p-2 border-b border-[#1e293b] flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search NASDAQ symbol or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-xs focus:outline-none"
                />
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[#182232]">
                {filteredStocks.slice(0, 60).map((stock) => (
                  <div
                    key={stock.ticker}
                    onClick={() => {
                      onSelectStock(stock);
                      soundManager.playSelect();
                      setShowSymbolSearch(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#1c2637] transition-colors ${
                      stock.ticker === currentStock.ticker ? 'bg-[#1a2538]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2 h-2 rounded-[2px]" 
                        style={{ backgroundColor: stock.tagColor }} 
                      />
                      <div>
                        <div className="font-mono font-bold text-slate-200">{stock.ticker}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{stock.name}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-slate-200">${stock.price.toFixed(4)}</div>
                      <div className={`text-[10px] ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
                {filteredStocks.length > 60 && (
                  <div className="px-3 py-2 text-[10px] text-slate-500 text-center font-mono bg-[#0d1420]">
                    Showing 60 of {filteredStocks.length.toLocaleString()} matches. Type to refine.
                  </div>
                )}
                {filteredStocks.length === 0 && (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    No NASDAQ ticker found for &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Favorite Star */}
        <button
          onClick={() => onToggleFavorite(currentStock.ticker)}
          className={`p-1.5 rounded hover:bg-[#1a2333] transition-colors ${
            currentStock.isFavorite ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
          }`}
          title={currentStock.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={`w-3.5 h-3.5 ${currentStock.isFavorite ? 'fill-amber-400' : ''}`} />
        </button>

        {/* Overview Button (with external link icon) */}
        <button
          onClick={onOpenOverview}
          className="flex items-center gap-1 px-2 py-1 rounded bg-[#171f2c] hover:bg-[#1f2a3c] text-slate-300 hover:text-white border border-[#263246] text-[11px] font-medium transition-colors"
          title="Company Fundamentals & Financial Statistics"
        >
          <ExternalLink className="w-3 h-3 text-slate-400" />
          <span>Overview</span>
        </button>

        {/* Chart Style Selector */}
        <div className="relative" ref={chartTypeRef}>
          <button
            onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
            className="p-1.5 rounded bg-[#171f2c] hover:bg-[#1f2a3c] text-slate-300 border border-[#263246] transition-colors"
            title="Chart Display Type"
          >
            {chartType === 'candles' || chartType === 'hollow' ? (
              <CandlestickChart className="w-3.5 h-3.5 text-slate-300" />
            ) : (
              <LineChart className="w-3.5 h-3.5 text-slate-300" />
            )}
          </button>

          {showChartTypeMenu && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-[#121824] border border-[#253247] rounded-md shadow-xl z-50 py-1">
              {([
                { id: 'candles', label: 'Candlestick' },
                { id: 'hollow', label: 'Hollow Candles' },
                { id: 'line', label: 'Line' },
                { id: 'area', label: 'Area' },
              ] as const).map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onChangeChartType(item.id);
                    setShowChartTypeMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#1a2538] flex items-center justify-between ${
                    chartType === item.id ? 'text-sky-400 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timeframe Buttons: 1M, 5M, 10M, 1H, 4H, D */}
        <div className="flex items-center bg-[#131924] rounded border border-[#212b3b] p-0.5">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => {
                onChangeTimeframe(tf);
                soundManager.playSelect();
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                timeframe === tf
                  ? 'bg-[#29364b] text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Calendar Date Picker Button */}
        <button
          className="p-1.5 rounded bg-[#171f2c] hover:bg-[#1f2a3c] text-slate-400 hover:text-slate-200 border border-[#263246]"
          title="Date Range & Historical Session"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>

        {/* Indicators Toggle Dropdown */}
        <div className="relative" ref={indicatorRef}>
          <button
            onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#171f2c] hover:bg-[#1f2a3c] text-slate-300 border border-[#263246] text-[11px]"
            title="Toggle Technical Indicators"
          >
            <Layers className="w-3 h-3 text-sky-400" />
            <span className="hidden sm:inline">Indicators</span>
            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
          </button>

          {showIndicatorMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-[#121824] border border-[#253247] rounded-md shadow-xl z-50 p-1.5 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 border-b border-[#1f293b]">
                Overlays & Subcharts
              </div>
              {[
                { key: 'ema9', label: 'EMA 9', color: '#eab308' },
                { key: 'sma20', label: 'SMA 20', color: '#3b82f6' },
                { key: 'sma200', label: 'SMA 200', color: '#a855f7' },
                { key: 'vwap', label: 'VWAP', color: '#e2e8f0' },
                { key: 'volumeProfile', label: 'Volume Profile (VP)', color: '#10b981' },
                { key: 'macd', label: 'MACD (12, 26, 9)', color: '#38bdf8' },
              ].map(ind => (
                <label
                  key={ind.key}
                  className="flex items-center justify-between px-2 py-1 text-xs rounded hover:bg-[#1c2738] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                    <span className="text-slate-200">{ind.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={indicators[ind.key as keyof IndicatorVisibility]}
                    onChange={() => onToggleIndicator(ind.key as keyof IndicatorVisibility)}
                    className="accent-sky-500 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Price & Change indicators matching high precision (+0.6900 (18.85%) and ☾ -0.0700 (1.61%)) */}
      <div className="flex items-center gap-2 sm:gap-3 font-mono font-medium">
        {/* Prominent Current Tick Price */}
        <div className="text-white text-xs sm:text-sm font-bold tracking-tight bg-[#151e2c] px-2 py-0.5 rounded border border-[#232f44]">
          ${(currentStock.price ?? 0).toFixed(4)}
        </div>

        {/* Primary Intraday Change */}
        <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          <span className="text-xs sm:text-sm font-bold">
            {isPositive ? '+' : ''}{(currentStock.change ?? 0).toFixed(4)}
          </span>
          <span className="text-[11px] sm:text-xs">
            ({isPositive ? '+' : ''}{(currentStock.changePercent ?? 0).toFixed(2)}%)
          </span>
        </div>

        {/* Secondary / After Hours Change */}
        {currentStock.afterHoursChange !== undefined && currentStock.afterHoursChange !== null && (
          <div className="hidden sm:flex items-center gap-1 text-[#c084fc] text-[11px]">
            <span>☾</span>
            <span>
              {isAfterHoursPositive ? '+' : ''}{(currentStock.afterHoursChange ?? 0).toFixed(4)}
            </span>
            <span>
              ({Math.abs(currentStock.afterHoursPercent ?? 0).toFixed(2)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
