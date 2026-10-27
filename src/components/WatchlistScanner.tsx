import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  MoreVertical, 
  Info, 
  ChevronDown, 
  Search,
  RefreshCw,
  PanelRightClose
} from 'lucide-react';
import { StockQuote } from '../types/stock';
import { soundManager } from '../utils/sound';

interface WatchlistScannerProps {
  stocks: StockQuote[];
  selectedTicker: string;
  onSelectStock: (stock: StockQuote) => void;
  onAddDiscoveredStock?: (stock: StockQuote) => void;
  onToggleFavorite: (ticker: string) => void;
  onOpenCustomize: () => void;
  activeCategory: string;
  onChangeCategory: (category: string) => void;
  updatedTickers: Record<string, 'up' | 'down'>;
  onRefresh?: () => void;
  onClose?: () => void;
}

type SortColumn = 'ticker' | 'volume' | 'm1Change' | 'm5Change' | 'm15Change' | 'h1Change' | 'h4Change' | 'changePercent' | 'openPercent';

export const WatchlistScanner: React.FC<WatchlistScannerProps> = ({
  stocks,
  selectedTicker,
  onSelectStock,
  onAddDiscoveredStock,
  onToggleFavorite,
  onOpenCustomize,
  activeCategory,
  onChangeCategory,
  updatedTickers,
  onRefresh,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<'ALL' | 'NASDAQ' | 'NYSE' | 'AMEX'>('ALL');
  const [sortCol, setSortCol] = useState<SortColumn>('changePercent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState<string | null>(null);
  const [isSearchingServer, setIsSearchingServer] = useState(false);

  // Debounced search on server to dynamically discover non-NASDAQ & NYSE/AMEX tickets
  useEffect(() => {
    if (activeCategory === 'cryptos') return;
    const q = search.trim();
    if (!q || q.length < 1) return;

    // Check if we already have exact or multiple local matches
    const exactLocal = stocks.some(s => s.ticker.toLowerCase() === q.toLowerCase());
    if (exactLocal) return;

    const timeout = setTimeout(async () => {
      setIsSearchingServer(true);
      try {
        const res = await fetch(`/api/stocks?search=${encodeURIComponent(q)}`);
        if (res.ok) {
          const results = await res.json();
          if (Array.isArray(results) && results.length > 0) {
            results.forEach((item: any) => {
              if (onAddDiscoveredStock && item && item.ticker) {
                const stockObj: StockQuote = {
                  ticker: item.ticker,
                  name: item.name || item.companyName || item.ticker,
                  price: typeof item.price === 'number' ? item.price : 10,
                  change: typeof item.change === 'number' ? item.change : 0,
                  changePercent: typeof item.changePercent === 'number' ? item.changePercent : 0,
                  openPercent: typeof item.openPercent === 'number' ? item.openPercent : 0,
                  volume: typeof item.volume === 'number' ? item.volume : 100000,
                  avgVolume: typeof item.avgVolume === 'number' ? item.avgVolume : 100000,
                  high: typeof item.high === 'number' ? item.high : item.price || 10,
                  low: typeof item.low === 'number' ? item.low : item.price || 10,
                  open: typeof item.open === 'number' ? item.open : item.price || 10,
                  prevClose: typeof item.prevClose === 'number' ? item.prevClose : item.price || 10,
                  m1Change: typeof item.m1Change === 'number' ? item.m1Change : 0,
                  m5Change: typeof item.m5Change === 'number' ? item.m5Change : 0,
                  m15Change: typeof item.m15Change === 'number' ? item.m15Change : 0,
                  h1Change: typeof item.h1Change === 'number' ? item.h1Change : 0,
                  h4Change: typeof item.h4Change === 'number' ? item.h4Change : (item.changePercent || 0),
                  tagColor: item.tagColor || '#3b82f6',
                  isFavorite: false,
                  marketCap: typeof item.marketCap === 'number' ? `$${(item.marketCap / 1e6).toFixed(1)}M` : (item.marketCap || '$0M'),
                  peRatio: typeof item.pe === 'number' ? item.pe : 0,
                  floatShares: item.floatShares || 'N/A',
                  high52w: typeof item.high52w === 'number' ? item.high52w : 10,
                  low52w: typeof item.low52w === 'number' ? item.low52w : 10,
                  sector: item.sector || 'Equities',
                  description: item.description || '',
                  exchange: item.exchange || item.market || 'US',
                  market: item.exchange || item.market || 'US',
                };
                onAddDiscoveredStock(stockObj);
              }
            });
          }
        }
      } catch {
        // Quietly handle network errors
      } finally {
        setIsSearchingServer(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [search, stocks, onAddDiscoveredStock, activeCategory]);

  const categories = [
    { id: 'stocks', label: 'stocks', count: stocks.length },
    { id: 'cryptos', label: 'cryptos', count: 0 },
  ];

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  // Filter stocks by market, category & search
  const filteredStocks = activeCategory === 'cryptos'
    ? []
    : stocks.filter(s => {
        // Market tab filter
        if (selectedMarket !== 'ALL') {
          const ex = (s.exchange || s.market || '').toUpperCase();
          if (!ex.includes(selectedMarket)) return false;
        }

        if (search.trim()) {
          const q = search.toLowerCase();
          const tickerMatch = s.ticker.toLowerCase().includes(q);
          const nameMatch = s.name.toLowerCase().includes(q);
          const exchangeMatch = (s.exchange || s.market || '').toLowerCase().includes(q);
          if (!tickerMatch && !nameMatch && !exchangeMatch) {
            return false;
          }
        }

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
      <th 
        key={col}
        onClick={() => handleSort(col)}
        className={`sticky top-0 z-10 bg-[#0e131d] border-b border-[#1b2333] px-2.5 py-1.5 cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap font-medium text-[11px] ${
          align === 'right' ? 'text-right' : 'text-left'
        }`}
      >
        <span className={`inline-block pb-0.5 whitespace-nowrap ${isActive ? 'border-b-2 border-white text-white font-bold' : 'text-slate-400 font-medium'}`}>
          {label}
        </span>
      </th>
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
              <div className="absolute top-full left-0 mt-1 w-56 bg-[#121824] border border-[#253247] rounded-md shadow-2xl z-50 py-1">
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
                    <span className="font-mono text-[10px] text-slate-500">({cat.count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="p-1 text-slate-500 hover:text-slate-300" title="Scanner Info: Updated to Monday, Oct 26, 2026">
            <Info className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 text-slate-500 hover:text-slate-300" title="Scanner Options">
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right side: Customize Button & Close Screener Button */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenCustomize}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161d2a] hover:bg-[#1e2738] border border-[#232d40] text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <span>Customize</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#1e2738] text-slate-400 hover:text-white transition-colors"
              title="Hide Screener (Shift+S)"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Market Date & Active Trading Session Bar */}
      <div className="px-3 py-1.5 bg-[#0d131f] border-b border-[#1b2537] flex items-center justify-between text-[11px] shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sky-400 font-bold tracking-tight font-mono text-xs">
            <span>📅 Mon, Oct 26, 2026</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/60 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>PRE-MARKET</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsRefreshing(true);
              soundManager.playSelect();
              onRefresh?.();
              setRefreshToast('Synced to Oct 26');
              setTimeout(() => {
                setIsRefreshing(false);
                setTimeout(() => setRefreshToast(null), 1800);
              }, 600);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#162030] hover:bg-[#1f2d44] border border-[#23334c] text-slate-300 hover:text-white transition-all text-[10px] font-mono cursor-pointer"
            title="Refresh screener data for Monday, October 26, 2026"
          >
            <RefreshCw className={`w-3 h-3 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{refreshToast || 'Sync Oct 26'}</span>
          </button>
        </div>
      </div>

      {/* Market Selector Tabs (Stocks) */}
      {activeCategory === 'stocks' && (
        <div className="px-2.5 py-1 bg-[#090d15] border-b border-[#141b27] flex items-center justify-between gap-1 overflow-x-auto no-scrollbar shrink-0 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold mr-0.5">Market:</span>
            {(['ALL', 'NASDAQ', 'NYSE', 'AMEX'] as const).map(mkt => (
              <button
                key={mkt}
                onClick={() => {
                  setSelectedMarket(mkt);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold ${
                  selectedMarket === mkt
                    ? 'bg-sky-500 text-slate-950 shadow-sm shadow-sky-500/20'
                    : 'bg-[#131b28] hover:bg-[#1a2538] text-slate-400 hover:text-slate-200 border border-[#1e2a3c]'
                }`}
              >
                {mkt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Category Chips */}
      <div className="px-2.5 py-1 bg-[#0b0e16] border-b border-[#18212f] flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 text-[10px] font-mono">
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                onChangeCategory(cat.id);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-0.5 rounded whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer capitalize ${
                isActive
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 font-bold'
                  : 'bg-[#121824] hover:bg-[#1a2333] text-slate-400 hover:text-slate-200 border border-[#1e2738]'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[9px] ${isActive ? 'text-sky-300' : 'text-slate-500'}`}>
                ({cat.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Search Strip */}
      <div className="px-3 py-1 bg-[#0b0f18] border-b border-[#161f2c] flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder={activeCategory === 'cryptos' ? "Cryptos section currently empty..." : "Filter ticker / company / market (e.g. NYSE, BAK, CLRO)..."}
          value={search}
          disabled={activeCategory === 'cryptos'}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-transparent text-slate-200 placeholder-slate-600 text-xs focus:outline-none font-mono disabled:opacity-50"
        />
        {isSearchingServer && (
          <span className="flex items-center gap-1 text-[10px] text-sky-400 font-mono shrink-0">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            <span>Searching...</span>
          </span>
        )}
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="text-[10px] text-slate-400 hover:text-slate-200"
          >
            clear
          </button>
        )}
      </div>

      {/* Table Container - Column width relative to cell with the most width */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full table-auto border-collapse text-[11px] select-none">
          <thead>
            <tr>
              {renderHeaderCol('ticker', 'Tck', 'left')}
              {renderHeaderCol('volume', 'Vol', 'right')}
              {renderHeaderCol('m1Change', '1 Min', 'right')}
              {renderHeaderCol('m5Change', '5 Min', 'right')}
              {renderHeaderCol('m15Change', '15 Min', 'right')}
              {renderHeaderCol('h1Change', '1 Hr', 'right')}
              {renderHeaderCol('h4Change', '4 Hr', 'right')}
              {renderHeaderCol('changePercent', 'Chng', 'right')}
              {renderHeaderCol('openPercent', 'Open %', 'right')}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#131b27]/60">
            {pageStocks.map((stock) => {
              const isSelected = stock.ticker === selectedTicker;
              const tickStatus = updatedTickers[stock.ticker];

              return (
                <tr
                  key={stock.ticker}
                  onClick={() => {
                    onSelectStock(stock);
                    soundManager.playSelect();
                  }}
                  className={`cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-[#1b2d47] text-white' 
                      : 'hover:bg-[#121925] text-slate-300'
                  } ${tickStatus === 'up' ? 'flash-up' : tickStatus === 'down' ? 'flash-down' : ''}`}
                >
                  {/* Tck */}
                  <td className="px-2.5 py-1 font-mono font-bold text-[12px] whitespace-nowrap text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#38bdf8]">{stock.ticker}</span>
                      {stock.exchange && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-mono font-semibold ${
                            stock.exchange.toUpperCase() === 'NYSE'
                              ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                              : stock.exchange.toUpperCase() === 'AMEX'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                              : stock.exchange.toUpperCase() === 'ARCA'
                              ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                              : 'bg-[#152030] text-sky-400 border border-[#20314a]'
                          }`}
                          title={`Market: ${stock.exchange}`}
                        >
                          {stock.exchange}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Vol */}
                  <td className="px-2.5 py-1 text-right font-mono text-[11px] text-slate-200 whitespace-nowrap">
                    {(stock.volume || 0).toLocaleString()}
                  </td>

                  {/* 1 Min */}
                  <td className="px-2.5 py-1 text-right whitespace-nowrap">
                    {renderPctCell(stock.m1Change)}
                  </td>

                  {/* 5 Min */}
                  <td className="px-2.5 py-1 text-right whitespace-nowrap">
                    {renderPctCell(stock.m5Change)}
                  </td>

                  {/* 15 Min */}
                  <td className="px-2.5 py-1 text-right whitespace-nowrap">
                    {renderPctCell(stock.m15Change)}
                  </td>

                  {/* 1 Hr */}
                  <td className="px-2.5 py-1 text-right whitespace-nowrap">
                    {renderPctCell(stock.h1Change)}
                  </td>

                  {/* 4 Hr */}
                  <td className="px-2.5 py-1 text-right whitespace-nowrap">
                    {renderPctCell(stock.h4Change)}
                  </td>

                  {/* Chng */}
                  <td className="px-2.5 py-1 text-right whitespace-nowrap">
                    {renderPctCell(stock.changePercent)}
                  </td>

                  {/* Open % */}
                  <td className="px-2.5 py-1 text-right whitespace-nowrap">
                    {renderPctCell(stock.openPercent)}
                  </td>
                </tr>
              );
            })}

            {pageStocks.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                  {activeCategory === 'cryptos' ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-6 font-mono text-center">
                      <span className="text-slate-300 font-semibold text-xs">No cryptocurrencies listed</span>
                      <span className="text-slate-500 text-[11px]">Cryptos section is currently empty</span>
                    </div>
                  ) : isSearchingServer ? (
                    <div className="flex items-center justify-center gap-2 text-sky-400 font-mono">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Searching all markets on server for &quot;{search}&quot;...</span>
                    </div>
                  ) : (
                    <span>No tickers match your search or market filter. Try searching by symbol (e.g. BAK, IBM, CLRO) or market.</span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
