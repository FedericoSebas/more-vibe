import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  MoreVertical, 
  Info, 
  ChevronDown, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search,
  Star,
  ChevronRight
} from 'lucide-react';
import { StockQuote } from '../types/stock';
import { formatVolume } from '../utils/stockData';
import { soundManager } from '../utils/sound';

interface WatchlistScannerProps {
  stocks: StockQuote[];
  selectedTicker: string;
  onSelectStock: (stock: StockQuote) => void;
  onToggleFavorite: (ticker: string) => void;
  onOpenCustomize: () => void;
  activeCategory: string;
  onChangeCategory: (category: string) => void;
  updatedTickers: Record<string, 'up' | 'down'>;
}

type SortColumn = 'ticker' | 'volume' | 'm1Change' | 'm5Change' | 'm15Change' | 'h1Change' | 'h4Change' | 'changePercent' | 'openPercent';

export const WatchlistScanner: React.FC<WatchlistScannerProps> = ({
  stocks,
  selectedTicker,
  onSelectStock,
  onToggleFavorite,
  onOpenCustomize,
  activeCategory,
  onChangeCategory,
  updatedTickers
}) => {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('changePercent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const categories = [
    { id: 'stocks', label: 'stocks (All Active)' },
    { id: 'gainers', label: 'Top Gainers (>20%)' },
    { id: 'active', label: 'Most Active Volume' },
    { id: 'nasdaq100', label: 'NASDAQ 100 Giants' },
    { id: 'biotech', label: 'Biotech & Health Movers' },
    { id: 'favorites', label: 'Starred Favorites' },
  ];

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  // Filter stocks by category & search
  const filteredStocks = stocks.filter(s => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!s.ticker.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (activeCategory === 'gainers') return s.changePercent >= 20;
    if (activeCategory === 'active') return s.volume >= 10000000;
    if (activeCategory === 'nasdaq100') return ['NVDA', 'AAPL', 'TSLA', 'QQQ'].includes(s.ticker);
    if (activeCategory === 'biotech') return s.sector.includes('Biotechnology') || s.sector.includes('Medical');
    if (activeCategory === 'favorites') return s.isFavorite;
    return true;
  });

  // Sort
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    let aVal = a[sortCol];
    let bVal = b[sortCol];
    if (typeof aVal === 'string') {
      return sortDir === 'asc' 
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    }
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(sortedStocks.length / pageSize));
  const pageStocks = sortedStocks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const renderPctCell = (val: number) => {
    if (val === 0) {
      return <span className="text-slate-500 font-mono text-[11px]">0.00%</span>;
    }
    const isPos = val > 0;
    return (
      <span className={`font-mono text-[11px] ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPos ? '+' : ''}{val.toFixed(2)}%
      </span>
    );
  };

  const getSortIcon = (col: SortColumn) => {
    if (sortCol !== col) return <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover:opacity-100" />;
    return sortDir === 'desc' 
      ? <ArrowDown className="w-2.5 h-2.5 text-sky-400" />
      : <ArrowUp className="w-2.5 h-2.5 text-sky-400" />;
  };

  return (
    <div className="w-full md:w-[480px] lg:w-[540px] xl:w-[580px] h-full bg-[#0a0e16] border-l border-[#1a2333] flex flex-col shrink-0 select-none">
      {/* Top Header of Scanner */}
      <div className="h-10 bg-[#0e131d] border-b border-[#1a2333] flex items-center justify-between px-3 text-xs shrink-0">
        <div className="flex items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#161d2a] hover:bg-[#1e2738] border border-[#232d40] text-slate-200 font-medium text-xs transition-colors"
            >
              <span>{categories.find(c => c.id === activeCategory)?.id || 'stocks'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showCategoryMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-[#121824] border border-[#253247] rounded-md shadow-2xl z-50 py-1">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onChangeCategory(cat.id);
                      setShowCategoryMenu(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#1b2638] flex items-center justify-between ${
                      activeCategory === cat.id ? 'text-sky-400 font-semibold bg-[#162030]' : 'text-slate-300'
                    }`}
                  >
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="p-1 text-slate-500 hover:text-slate-300" title="Scanner Info">
            <Info className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 text-slate-500 hover:text-slate-300" title="Scanner Options">
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right side: Customize Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCustomize}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161d2a] hover:bg-[#1e2738] border border-[#232d40] text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* Quick Search Strip */}
      <div className="px-3 py-1.5 bg-[#0b0f18] border-b border-[#161f2c] flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder="Filter ticker / company..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-transparent text-slate-200 placeholder-slate-600 text-xs focus:outline-none font-mono"
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="text-[10px] text-slate-400 hover:text-slate-200"
          >
            clear
          </button>
        )}
      </div>

      {/* Table Header Row */}
      <div className="grid grid-cols-[82px_1fr_56px_56px_56px_56px_56px_64px_62px] gap-1 px-2.5 py-1.5 bg-[#0e131d] border-b border-[#1b2333] text-[10px] font-medium text-slate-400 uppercase tracking-wider shrink-0 select-none">
        <div 
          onClick={() => handleSort('ticker')}
          className="cursor-pointer hover:text-slate-200 flex items-center gap-0.5 group"
        >
          <span>Tck</span>
          {getSortIcon('ticker')}
        </div>
        <div 
          onClick={() => handleSort('volume')}
          className="cursor-pointer hover:text-slate-200 text-right flex items-center justify-end gap-0.5 group"
        >
          <span>Vol</span>
          {getSortIcon('volume')}
        </div>
        <div 
          onClick={() => handleSort('m1Change')}
          className="cursor-pointer hover:text-slate-200 text-right flex items-center justify-end gap-0.5 group"
        >
          <span>1 Min</span>
          {getSortIcon('m1Change')}
        </div>
        <div 
          onClick={() => handleSort('m5Change')}
          className="cursor-pointer hover:text-slate-200 text-right flex items-center justify-end gap-0.5 group"
        >
          <span>5 Min</span>
          {getSortIcon('m5Change')}
        </div>
        <div 
          onClick={() => handleSort('m15Change')}
          className="cursor-pointer hover:text-slate-200 text-right flex items-center justify-end gap-0.5 group"
        >
          <span>15 Min</span>
          {getSortIcon('m15Change')}
        </div>
        <div 
          onClick={() => handleSort('h1Change')}
          className="cursor-pointer hover:text-slate-200 text-right flex items-center justify-end gap-0.5 group"
        >
          <span>1 Hr</span>
          {getSortIcon('h1Change')}
        </div>
        <div 
          onClick={() => handleSort('h4Change')}
          className="cursor-pointer hover:text-slate-200 text-right flex items-center justify-end gap-0.5 group"
        >
          <span>4 Hr</span>
          {getSortIcon('h4Change')}
        </div>
        <div 
          onClick={() => handleSort('changePercent')}
          className="cursor-pointer hover:text-slate-200 text-right flex items-center justify-end gap-0.5 group"
        >
          <span>Chng</span>
          {getSortIcon('changePercent')}
        </div>
        <div 
          onClick={() => handleSort('openPercent')}
          className="cursor-pointer hover:text-slate-200 text-right flex items-center justify-end gap-0.5 group"
        >
          <span>Open %</span>
          {getSortIcon('openPercent')}
        </div>
      </div>

      {/* Table Rows Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#131b27]">
        {pageStocks.map((stock) => {
          const isSelected = stock.ticker === selectedTicker;
          const tickStatus = updatedTickers[stock.ticker];

          return (
            <div
              key={stock.ticker}
              onClick={() => {
                onSelectStock(stock);
                soundManager.playSelect();
              }}
              className={`grid grid-cols-[82px_1fr_56px_56px_56px_56px_56px_64px_62px] gap-1 px-2.5 py-1.5 items-center cursor-pointer transition-colors ${
                isSelected 
                  ? 'bg-[#182334] text-white border-l-2 border-l-sky-500' 
                  : 'hover:bg-[#121925] text-slate-300'
              } ${tickStatus === 'up' ? 'flash-up' : tickStatus === 'down' ? 'flash-down' : ''}`}
            >
              {/* Ticker & Tag */}
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span 
                  className="w-2 h-2 rounded-[2px] shrink-0" 
                  style={{ backgroundColor: stock.tagColor }} 
                />
                <span className="font-mono font-bold text-xs tracking-tight text-slate-100">
                  {stock.ticker}
                </span>
                {stock.isFavorite && (
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                )}
              </div>

              {/* Volume */}
              <div className="text-right font-mono text-[11px] text-slate-300 truncate">
                {formatVolume(stock.volume)}
              </div>

              {/* 1 Min */}
              <div className="text-right truncate">
                {renderPctCell(stock.m1Change)}
              </div>

              {/* 5 Min */}
              <div className="text-right truncate">
                {renderPctCell(stock.m5Change)}
              </div>

              {/* 15 Min */}
              <div className="text-right truncate">
                {renderPctCell(stock.m15Change)}
              </div>

              {/* 1 Hr */}
              <div className="text-right truncate">
                {renderPctCell(stock.h1Change)}
              </div>

              {/* 4 Hr */}
              <div className="text-right truncate">
                {renderPctCell(stock.h4Change)}
              </div>

              {/* Chng */}
              <div className="text-right truncate font-bold">
                {renderPctCell(stock.changePercent)}
              </div>

              {/* Open % */}
              <div className="text-right truncate">
                {renderPctCell(stock.openPercent)}
              </div>
            </div>
          );
        })}

        {pageStocks.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No tickers match your current search or category filter.
          </div>
        )}
      </div>

      {/* Pagination Footer matching screenshot: 1  2  ...  57  → */}
      <div className="h-9 bg-[#0e131d] border-t border-[#1a2333] px-3 flex items-center justify-between text-xs shrink-0 select-none">
        <div className="text-[11px] text-slate-500 font-mono">
          Showing {pageStocks.length} of {sortedStocks.length} NASDAQ stocks
        </div>

        <div className="flex items-center gap-1 font-mono text-[11px]">
          <button
            onClick={() => setCurrentPage(1)}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              currentPage === 1 ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1
          </button>
          <button
            onClick={() => setCurrentPage(2)}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              currentPage === 2 ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2
          </button>
          <span className="text-slate-600 px-0.5">...</span>
          <button
            onClick={() => setCurrentPage(totalPages)}
            className={`px-1.5 h-6 rounded flex items-center justify-center transition-colors ${
              currentPage === totalPages ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {totalPages > 2 ? totalPages : 57}
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
