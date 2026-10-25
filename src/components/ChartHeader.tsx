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
  Search,
  Check,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { StockQuote, Timeframe, ChartType, IndicatorVisibility, DateRangeKey, CustomDateRange } from '../types/stock';
import { soundManager } from '../utils/sound';

interface ChartHeaderProps {
  currentStock: StockQuote;
  allStocks: StockQuote[];
  onSelectStock: (stock: StockQuote) => void;
  onToggleFavorite: (ticker: string) => void;
  onOpenOverview: () => void;
  timeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;
  selectedRange: DateRangeKey;
  onSelectRange: (range: DateRangeKey, customRange?: CustomDateRange) => void;
  customRange?: CustomDateRange;
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
  selectedRange,
  onSelectRange,
  customRange,
  chartType,
  onChangeChartType,
  indicators,
  onToggleIndicator
}) => {
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [tempStartDate, setTempStartDate] = useState(
    customRange?.startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [tempEndDate, setTempEndDate] = useState(
    customRange?.endDate || new Date().toISOString().split('T')[0]
  );

  const searchRef = useRef<HTMLDivElement>(null);
  const chartTypeRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

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
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendarMenu(false);
        setIsCustomRangeOpen(false);
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

        {/* Calendar Date Picker / Range Selector */}
        <div className="relative" ref={calendarRef}>
          <button
            onClick={() => {
              setShowCalendarMenu(!showCalendarMenu);
              setShowChartTypeMenu(false);
              setShowIndicatorMenu(false);
              setShowSymbolSearch(false);
            }}
            className={`p-1.5 rounded transition-all flex items-center justify-center ${
              showCalendarMenu
                ? 'border-2 border-sky-400 bg-[#162030] text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                : selectedRange !== '5d'
                ? 'border border-sky-500/70 bg-[#162132] text-sky-400'
                : 'border border-[#263246] bg-[#171f2c] hover:bg-[#1f2a3c] text-slate-400 hover:text-slate-200'
            }`}
            title={`Select Range (Current: ${selectedRange.toUpperCase()})`}
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>

          {showCalendarMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-44 bg-[#141a26] border border-[#263143] rounded-lg shadow-2xl py-2 z-50 text-slate-200 select-none">
              {!isCustomRangeOpen ? (
                <>
                  {[
                    {
                      title: 'Days',
                      items: [
                        { id: '1d' as DateRangeKey, label: '1 Day' },
                        { id: '5d' as DateRangeKey, label: '5 Days' },
                      ]
                    },
                    {
                      title: 'Months',
                      items: [
                        { id: '1mo' as DateRangeKey, label: '1 Month' },
                        { id: '3mo' as DateRangeKey, label: '3 Months' },
                        { id: '6mo' as DateRangeKey, label: '6 Months' },
                      ]
                    },
                    {
                      title: 'Years',
                      items: [
                        { id: 'ytd' as DateRangeKey, label: 'Year to Date' },
                        { id: '1y' as DateRangeKey, label: '1 Year' },
                        { id: '2y' as DateRangeKey, label: '2 Years' },
                        { id: '5y' as DateRangeKey, label: '5 Years' },
                        { id: 'max' as DateRangeKey, label: 'Max' },
                      ]
                    }
                  ].map((section, sIdx) => (
                    <div key={section.title}>
                      {sIdx > 0 && <div className="border-t border-[#232d3d] my-1.5 mx-2" />}
                      <div className="px-3.5 pt-1 pb-1 text-xs text-slate-400 font-normal">
                        {section.title}
                      </div>
                      <div className="space-y-0.5 px-1">
                        {section.items.map((item) => {
                          const isSelected = selectedRange === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                onSelectRange(item.id);
                                soundManager.playSelect();
                                setShowCalendarMenu(false);
                              }}
                              className={`w-full text-left px-3.5 py-1 text-[13px] font-semibold rounded transition-colors flex items-center justify-between ${
                                isSelected
                                  ? 'text-sky-400 font-bold bg-[#1c2637]'
                                  : 'text-slate-200 hover:text-white hover:bg-[#20293b]'
                              }`}
                            >
                              <span>{item.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-[#232d3d] my-1.5 mx-2" />

                  <div className="px-1">
                    <button
                      onClick={() => setIsCustomRangeOpen(true)}
                      className={`w-full text-left px-3.5 py-1 text-[13px] font-semibold rounded transition-colors flex items-center justify-between ${
                        selectedRange === 'custom'
                          ? 'text-sky-400 font-bold bg-[#1c2637]'
                          : 'text-slate-200 hover:text-white hover:bg-[#20293b]'
                      }`}
                    >
                      <span>Custom</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-2.5 py-1 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#232d3d]">
                    <button
                      onClick={() => setIsCustomRangeOpen(false)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Back</span>
                    </button>
                    <span className="text-xs font-bold text-slate-200">Custom Range</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Start Date</label>
                      <input
                        type="date"
                        value={tempStartDate}
                        onChange={(e) => setTempStartDate(e.target.value)}
                        className="w-full bg-[#0d121c] border border-[#273245] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">End Date</label>
                      <input
                        type="date"
                        value={tempEndDate}
                        onChange={(e) => setTempEndDate(e.target.value)}
                        className="w-full bg-[#0d121c] border border-[#273245] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Quick preset chips */}
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    {[
                      { label: 'Past 7D', days: 7 },
                      { label: 'Past 30D', days: 30 },
                      { label: 'Past 90D', days: 90 },
                      { label: 'Past Year', days: 365 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const end = new Date();
                          const start = new Date(Date.now() - preset.days * 86400000);
                          setTempEndDate(end.toISOString().split('T')[0]);
                          setTempStartDate(start.toISOString().split('T')[0]);
                        }}
                        className="text-[10px] py-0.5 px-1 bg-[#1c2434] hover:bg-[#253147] text-slate-300 rounded text-center transition-colors border border-[#293549]"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        if (tempStartDate && tempEndDate) {
                          onSelectRange('custom', { startDate: tempStartDate, endDate: tempEndDate });
                          soundManager.playSelect();
                          setShowCalendarMenu(false);
                          setIsCustomRangeOpen(false);
                        }
                      }}
                      className="flex-1 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold text-center transition-colors shadow-sm"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setIsCustomRangeOpen(false)}
                      className="px-2 py-1 bg-[#1a2332] hover:bg-[#222e42] text-slate-400 hover:text-slate-200 rounded text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
