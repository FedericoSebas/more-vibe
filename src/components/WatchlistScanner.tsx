import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  MoreVertical, 
  Info, 
  ChevronDown, 
  Search
} from 'lucide-react';
import { StockQuote } from '../types/stock';
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
    if (activeCategory === 'nasdaq100') return ['NVDA', 'AAPL', 'TSLA', 'QQQ', 'MSFT', 'AMZN', 'META', 'GOOG', 'GOOGL', 'AMD', 'NFLX', 'INTC', 'COST', 'AVGO', 'QCOM', 'TXN', 'ADBE', 'CSCO', 'PEP', 'TMUS', 'AMGN', 'HON', 'SBUX', 'ISRG', 'BKNG', 'MDLZ', 'GILD', 'ADP', 'VRTX', 'REGN', 'PANW', 'LULU', 'SNPS', 'CDNS', 'ASML', 'MSTR', 'COIN', 'PLTR', 'ARM', 'SMCI'].includes(s.ticker);
    if (activeCategory === 'biotech') return s.sector.includes('Biotechnology') || s.sector.includes('Medical');
    if (activeCategory === 'favorites') return s.isFavorite;
    return true;
  });

  // Sort
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    let aVal = a[sortCol];
    let bVal = b[sortCol];
    if (typeof aVal === 'string' || typeof bVal === 'string') {
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      return sortDir === 'asc' 
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    }
    const aNum = typeof aVal === 'number' && Number.isFinite(aVal) ? aVal : 0;
    const bNum = typeof bVal === 'number' && Number.isFinite(bVal) ? bVal : 0;
    return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
  });

  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(sortedStocks.length / pageSize));
  const pageStocks = sortedStocks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const renderPctCell = (val: number | null | undefined) => {
    if (val === null || val === undefined || !Number.isFinite(val)) {
      return <span className="text-slate-400 font-mono text-[11px]">0.00%</span>;
    }
    if (val === 0) {
      return <span className="text-slate-400 font-mono text-[11px]">0.00%</span>;
    }
    if (val < 0 && val > -0.005) {
      return <span className="text-rose-400 font-mono text-[11px]">-0.00%</span>;
    }
    const isPos = val > 0;
    return (
      <span className={`font-mono text-[11px] ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPos ? '+' : ''}{Number(val).toFixed(2)}%
      </span>
    );
  };

  const renderHeaderCol = (col: SortColumn, label: string, align: 'left' | 'right' = 'right') => {
    const isActive = sortCol === col;
    return (
      <div 
        onClick={() => handleSort(col)}
        className={`cursor-pointer hover:text-white transition-colors flex items-center select-none ${
          align === 'right' ? 'justify-end text-right' : 'justify-start text-left'
        }`}
      >
        <span className={`inline-block pb-0.5 whitespace-nowrap ${isActive ? 'border-b-2 border-white text-white font-bold' : 'text-slate-400 font-medium'}`}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full md:w-[500px] lg:w-[520px] xl:w-[540px] 2xl:w-[560px] h-full bg-[#0a0e16] border-l border-[#1a2333] flex flex-col shrink-0 select-none overflow-hidden">
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
      <div className="px-3 py-1 bg-[#0b0f18] border-b border-[#161f2c] flex items-center gap-2">
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

      {/* Table Container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Table Header Row */}
        <div className="grid grid-cols-[46px_1fr_42px_42px_44px_40px_40px_52px_56px] gap-1 px-2.5 py-1.5 bg-[#0e131d] border-b border-[#1b2333] text-[11px] font-medium text-slate-400 shrink-0 select-none">
          {renderHeaderCol('ticker', 'Tck', 'left')}
          {renderHeaderCol('volume', 'Vol', 'right')}
          {renderHeaderCol('m1Change', '1 Min', 'right')}
          {renderHeaderCol('m5Change', '5 Min', 'right')}
          {renderHeaderCol('m15Change', '15 Min', 'right')}
          {renderHeaderCol('h1Change', '1 Hr', 'right')}
          {renderHeaderCol('h4Change', '4 Hr', 'right')}
          {renderHeaderCol('changePercent', 'Chng', 'right')}
          {renderHeaderCol('openPercent', 'Open %', 'right')}
        </div>

        {/* Table Rows Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#131b27]/60">
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
                className={`grid grid-cols-[46px_1fr_42px_42px_44px_40px_40px_52px_56px] gap-1 px-2.5 py-1 items-center cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-[#1b2d47] text-white' 
                    : 'hover:bg-[#121925] text-slate-300'
                } ${tickStatus === 'up' ? 'flash-up' : tickStatus === 'down' ? 'flash-down' : ''}`}
              >
                {/* Tck */}
                <div className="font-mono font-bold text-[12px] text-[#38bdf8] truncate">
                  {stock.ticker}
                </div>

                {/* Vol */}
                <div className="text-right font-mono text-[11px] text-slate-200 truncate">
                  {(stock.volume || 0).toLocaleString()}
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
                <div className="text-right truncate">
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
      </div>

      {/* Pagination Footer */}
      <div className="h-8 bg-[#0b0e14] border-t border-[#17202e] flex items-center justify-center gap-3 text-xs font-mono shrink-0 select-none">
        {/* Page 1 */}
        <button
          onClick={() => setCurrentPage(1)}
          className={`px-2 py-0.5 rounded transition-colors text-[11px] ${
            currentPage === 1 
              ? 'border border-[#38bdf8]/60 bg-[#15233c] text-white font-medium' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          1
        </button>

        {/* Page 2 */}
        {totalPages >= 2 && (
          <button
            onClick={() => setCurrentPage(2)}
            className={`px-1.5 py-0.5 rounded transition-colors text-[11px] ${
              currentPage === 2 
                ? 'border border-[#38bdf8]/60 bg-[#15233c] text-white font-medium' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2
          </button>
        )}

        {/* Active page if between 3 and totalPages - 1 */}
        {currentPage > 2 && currentPage < totalPages && (
          <>
            {currentPage > 3 && <span className="text-slate-600 text-[11px]">...</span>}
            <button
              onClick={() => setCurrentPage(currentPage)}
              className="px-2 py-0.5 rounded border border-[#38bdf8]/60 bg-[#15233c] text-white font-medium text-[11px]"
            >
              {currentPage}
            </button>
          </>
        )}

        {/* Ellipsis */}
        {totalPages > 3 && currentPage < totalPages - 1 && (
          <span className="text-slate-600 text-[11px]">...</span>
        )}

        {/* Last Page (35) */}
        {totalPages > 2 && (
          <button
            onClick={() => setCurrentPage(totalPages)}
            className={`px-1.5 py-0.5 rounded transition-colors text-[11px] ${
              currentPage === totalPages 
                ? 'border border-[#38bdf8]/60 bg-[#15233c] text-white font-medium' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {totalPages}
          </button>
        )}

        {/* Next Arrow -> */}
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="text-[#38bdf8] hover:text-white disabled:opacity-30 disabled:hover:text-[#38bdf8] transition-colors text-sm px-1 font-bold"
          title="Next page"
        >
          →
        </button>
      </div>
    </div>
  );
};
