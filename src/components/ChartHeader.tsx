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
import { StockQuote, Timeframe, ChartType, IndicatorVisibility, DateRangeKey, CustomDateRange, FootprintFilterConfig } from '../types/stock';
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
  isLevel2Open?: boolean;
  onToggleLevel2?: () => void;
  onZoomToFootprint?: () => void;
  footprintFilter?: FootprintFilterConfig;
  onUpdateFootprintFilter?: (updater: Partial<FootprintFilterConfig>) => void;
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
  onToggleIndicator,
  isLevel2Open = false,
  onToggleLevel2,
  onZoomToFootprint,
  footprintFilter,
  onUpdateFootprintFilter
}) => {
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [showFootprintFilter, setShowFootprintFilter] = useState(false);
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
  const footprintFilterRef = useRef<HTMLDivElement>(null);

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
      if (footprintFilterRef.current && !footprintFilterRef.current.contains(e.target as Node)) {
        setShowFootprintFilter(false);
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
                { key: 'stackedImbalances', label: 'Stacked Imbalances (Key Levels)', color: '#38bdf8' },
                { key: 'volumeProfile', label: 'Volume Profile (VP)', color: '#10b981' },
                { key: 'macd', label: 'MACD Bicolor (12, 26, 9)', color: '#22c55e' },
                { key: 'barStats', label: 'Delta & Volume Rows', color: '#60a5fa' },
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
                    checked={!!indicators[ind.key as keyof IndicatorVisibility]}
                    onChange={() => onToggleIndicator(ind.key as keyof IndicatorVisibility)}
                    className="accent-sky-500 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footprint / Order Flow Badge on 1M, 5M, 10M */}
        {(timeframe === '1M' || timeframe === '5M' || timeframe === '10M') && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onZoomToFootprint}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 text-[11px] font-mono transition-all shadow-xs"
              title="Footprint Order Flow (Bid x Ask / Imbalances) active on 1M, 5M, 10M. Click to zoom in directly."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">FOOTPRINT</span>
              <span className="hidden lg:inline text-[10px] text-emerald-400/80">BID×ASK</span>
            </button>

            {/* Footprint Imbalance Filter Button & Popover */}
            {footprintFilter && onUpdateFootprintFilter && (
              <div className="relative" ref={footprintFilterRef}>
                <button
                  onClick={() => setShowFootprintFilter(!showFootprintFilter)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono transition-all border ${
                    footprintFilter.highlightImbalances
                      ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-500/50 shadow-xs shadow-amber-500/10'
                      : 'bg-[#171f2c] hover:bg-[#1f2a3c] text-slate-400 border-[#263246]'
                  }`}
                  title="Footprint Imbalance Filter: Looks for and highlights 4x order volume imbalances at each price level"
                >
                  <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                  <span className="font-bold">IMBALANCE</span>
                  <span className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                    footprintFilter.highlightImbalances 
                      ? 'bg-amber-400/20 text-amber-300' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {footprintFilter.imbalanceRatio}×
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    footprintFilter.highlightImbalances ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
                  }`} />
                </button>

                {/* Quick Stacked Imbalances Toggle Chip */}
                <button
                  onClick={() => {
                    const nextVal = !(footprintFilter.showStackedImbalances !== false);
                    onUpdateFootprintFilter({ showStackedImbalances: nextVal });
                    soundManager.playSelect();
                  }}
                  className={`hidden md:flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-all border ${
                    footprintFilter.showStackedImbalances !== false
                      ? 'bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border-sky-500/50 shadow-xs shadow-sky-500/10'
                      : 'bg-[#171f2c] hover:bg-[#1f2a3c] text-slate-400 border-[#263246]'
                  }`}
                  title="Footprint Stacked Imbalances: Detects 3+ consecutive imbalance levels and reflects key level rays until tested by subsequent candles"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    footprintFilter.showStackedImbalances !== false ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'
                  }`} />
                  <span className="font-bold">STACKS</span>
                  <span className="text-[10px] text-sky-400/80 font-bold">{footprintFilter.minStackLevels ?? 3}L</span>
                </button>

                {showFootprintFilter && (
                  <div className="absolute top-full left-0 mt-1.5 w-72 bg-[#121824] border border-[#253247] rounded-lg shadow-2xl z-50 p-3 space-y-3 text-slate-200">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold text-xs text-white">Footprint Imbalance Filter</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {footprintFilter.imbalanceRatio}:1 Ratio
                      </span>
                    </div>

                    {/* Enable Highlight Switch */}
                    <label className="flex items-center justify-between p-2 rounded bg-[#171f2c] border border-[#232f42] cursor-pointer hover:bg-[#1c2637] transition-colors">
                      <div>
                        <div className="text-xs font-semibold text-white">Highlight Imbalances</div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          Highlight order numbers when buyers/sellers $\ge$ {footprintFilter.imbalanceRatio}×
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={footprintFilter.highlightImbalances}
                        onChange={(e) => onUpdateFootprintFilter({ highlightImbalances: e.target.checked })}
                        className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                      />
                    </label>

                    {/* Ratio Presets */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Imbalance Ratio (Multiplier)</span>
                        <span className="text-amber-400 font-mono text-xs">{footprintFilter.imbalanceRatio}× ({footprintFilter.imbalanceRatio}:1)</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { label: '3.0×', val: 3.0 },
                          { label: '4.0×', val: 4.0, defaultTag: true },
                          { label: '5.0×', val: 5.0 },
                          { label: '6.0×', val: 6.0 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => {
                              onUpdateFootprintFilter({ imbalanceRatio: preset.val });
                              soundManager.playSelect();
                            }}
                            className={`py-1 px-1.5 rounded text-[11px] font-mono font-bold transition-all text-center border ${
                              footprintFilter.imbalanceRatio === preset.val
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs'
                                : 'bg-[#18202e] hover:bg-[#202b3d] text-slate-300 border-[#253245]'
                            }`}
                          >
                            {preset.label}
                            {preset.defaultTag && <span className="block text-[8px] text-amber-400/80 font-sans">Default</span>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Imbalance Calculation Method */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Comparison Mode
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            onUpdateFootprintFilter({ imbalanceMode: 'level' });
                            soundManager.playSelect();
                          }}
                          className={`p-1.5 rounded text-left border transition-all ${
                            footprintFilter.imbalanceMode === 'level'
                              ? 'bg-sky-500/15 border-sky-500/50 text-sky-200'
                              : 'bg-[#18202e] hover:bg-[#202b3d] border-[#253245] text-slate-400'
                          }`}
                        >
                          <div className="text-[11px] font-bold">Price Level (Horizontal)</div>
                          <div className="text-[9px] text-slate-400 leading-tight">Same price level orders</div>
                        </button>

                        <button
                          onClick={() => {
                            onUpdateFootprintFilter({ imbalanceMode: 'diagonal' });
                            soundManager.playSelect();
                          }}
                          className={`p-1.5 rounded text-left border transition-all ${
                            footprintFilter.imbalanceMode === 'diagonal'
                              ? 'bg-sky-500/15 border-sky-500/50 text-sky-200'
                              : 'bg-[#18202e] hover:bg-[#202b3d] border-[#253245] text-slate-400'
                          }`}
                        >
                          <div className="text-[11px] font-bold">Diagonal (Auction)</div>
                          <div className="text-[9px] text-slate-400 leading-tight">Ask[P] vs Bid[P-1]</div>
                        </button>
                      </div>
                    </div>

                    {/* Minimum Volume Filter */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                        <span>Min Orders Volume Filter</span>
                        <span className="font-mono text-slate-300 text-[11px]">{footprintFilter.minVolumeThreshold} contracts</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[10, 25, 50, 100].map((vol) => (
                          <button
                            key={vol}
                            onClick={() => {
                              onUpdateFootprintFilter({ minVolumeThreshold: vol });
                              soundManager.playSelect();
                            }}
                            className={`py-0.5 rounded text-[10px] font-mono transition-colors border ${
                              footprintFilter.minVolumeThreshold === vol
                                ? 'bg-[#29364b] text-white border-sky-500 font-bold'
                                : 'bg-[#161e2b] hover:bg-[#1f293b] text-slate-400 border-[#243043]'
                            }`}
                          >
                            ≥{vol}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stacked Imbalances Indicator Controls */}
                    <div className="pt-2 border-t border-[#1e293b] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1">
                          <span>Stacked Imbalances Indicator</span>
                        </div>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {footprintFilter.minStackLevels ?? 3}+ Levels
                        </span>
                      </div>

                      {/* Enable Stacked Imbalances toggle */}
                      <label className="flex items-center justify-between p-1.5 rounded bg-[#171f2c] border border-[#232f42] cursor-pointer hover:bg-[#1c2637] transition-colors">
                        <div>
                          <div className="text-[11px] font-semibold text-white">Detect Stack Imbalances</div>
                          <div className="text-[9px] text-slate-400 leading-tight">
                            Flags 3+ consecutive buy or sell imbalances in a candle
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={footprintFilter.showStackedImbalances !== false}
                          onChange={(e) => onUpdateFootprintFilter({ showStackedImbalances: e.target.checked })}
                          className="accent-sky-500 rounded cursor-pointer w-3.5 h-3.5"
                        />
                      </label>

                      {/* Reflect Key Levels toggle */}
                      <label className="flex items-center justify-between p-1.5 rounded bg-[#171f2c] border border-[#232f42] cursor-pointer hover:bg-[#1c2637] transition-colors">
                        <div>
                          <div className="text-[11px] font-semibold text-sky-300">Reflect to Next Reaching Candle</div>
                          <div className="text-[9px] text-slate-400 leading-tight">
                            Projects key level rays until tested by subsequent candle
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={footprintFilter.reflectToNextCandle !== false}
                          onChange={(e) => onUpdateFootprintFilter({ reflectToNextCandle: e.target.checked })}
                          className="accent-sky-500 rounded cursor-pointer w-3.5 h-3.5"
                        />
                      </label>

                      {/* Min Stack Levels Depth selector */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Minimum Consecutive Levels:
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { label: '3 Levels (Standard)', val: 3 },
                            { label: '4 Levels (Institutional)', val: 4 },
                          ].map((stackOpt) => (
                            <button
                              key={stackOpt.val}
                              onClick={() => {
                                onUpdateFootprintFilter({ minStackLevels: stackOpt.val });
                                soundManager.playSelect();
                              }}
                              className={`p-1 rounded text-center border text-[10px] font-mono transition-all ${
                                (footprintFilter.minStackLevels ?? 3) === stackOpt.val
                                  ? 'bg-sky-500/20 border-sky-500/60 text-sky-300 font-bold'
                                  : 'bg-[#18202e] hover:bg-[#202b3d] border-[#253245] text-slate-400'
                              }`}
                            >
                              {stackOpt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Visual Color Legend */}
                    <div className="pt-2 border-t border-[#1e293b] space-y-1">
                      <div className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                        Order Flow Highlights & Stacks:
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono px-2 py-1 rounded bg-[#161f2d] border border-[#232f42]">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 border border-emerald-400" />
                          Buy Stack (Bull Support)
                        </span>
                        <span className="text-slate-300">≥ {footprintFilter.minStackLevels ?? 3} Ask Imbalances</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono px-2 py-1 rounded bg-[#161f2d] border border-[#232f42]">
                        <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                          <span className="w-2.5 h-2.5 rounded-[2px] bg-rose-600 border border-rose-400" />
                          Sell Stack (Bear Resistance)
                        </span>
                        <span className="text-slate-300">≥ {footprintFilter.minStackLevels ?? 3} Bid Imbalances</span>
                      </div>
                    </div>

                    {/* Quick Action: Zoom to Footprint */}
                    <button
                      onClick={() => {
                        onZoomToFootprint?.();
                        setShowFootprintFilter(false);
                      }}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold text-center transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>Zoom to Footprint View</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Level 2 Order Book (DOM) Toggle Button */}
        {onToggleLevel2 && (
          <button
            onClick={onToggleLevel2}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
              isLevel2Open
                ? 'bg-sky-500/25 text-sky-300 border border-sky-400/60 shadow-xs shadow-sky-500/10'
                : 'bg-[#171f2c] hover:bg-[#1f2a3c] text-slate-300 border border-[#263246]'
            }`}
            title="Toggle NASDAQ Level 2 Depth of Market (DOM) and Time & Sales"
          >
            <Layers className="w-3 h-3 text-sky-400" />
            <span className="font-semibold">LEVEL 2</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isLevel2Open ? 'bg-sky-400' : 'bg-slate-500'}`} />
          </button>
        )}
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
