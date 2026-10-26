import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Activity, 
  Sliders, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  Clock, 
  ShieldAlert,
  ChevronRight,
  Maximize2,
  Volume2
} from 'lucide-react';
import { StockQuote, Level2Book, OrderFlowTrade } from '../types/stock';
import { generateLevel2Book, generateRecentTrades, formatOrderFlowVolume } from '../utils/orderFlow';

interface Level2OrderBookProps {
  stock: StockQuote;
  isOpen: boolean;
  onClose: () => void;
  isLive?: boolean;
}

export const Level2OrderBook: React.FC<Level2OrderBookProps> = ({
  stock,
  isOpen,
  onClose,
  isLive = true
}) => {
  const [tab, setTab] = useState<'dom' | 'tape'>('dom');
  const [book, setBook] = useState<Level2Book>(() => generateLevel2Book(stock));
  const [trades, setTrades] = useState<OrderFlowTrade[]>(() => generateRecentTrades(stock, 30));
  const [minLotFilter, setMinLotFilter] = useState<number>(0);
  const tradesContainerRef = useRef<HTMLDivElement>(null);

  // Update book whenever stock changes
  useEffect(() => {
    setBook(generateLevel2Book(stock));
    setTrades(generateRecentTrades(stock, 30));
  }, [stock.ticker, stock.price]);

  // Live simulation tick updates
  useEffect(() => {
    if (!isOpen || !isLive) return;

    const interval = setInterval(() => {
      setBook(prev => {
        // Subtle micro-shifts in top-of-book depth
        const updated = generateLevel2Book(stock, stock.price);
        return updated;
      });

      // Generate a new trade tick
      const now = Date.now();
      const d = new Date(now);
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      const isBuy = Math.random() < (stock.change >= 0 ? 0.55 : 0.45);
      const lots = [100, 200, 300, 500, 1000, 2500];
      const size = lots[Math.floor(Math.random() * lots.length)];
      
      const newTrade: OrderFlowTrade = {
        id: `t_${now}_${Math.random()}`,
        time: now,
        timeStr,
        price: stock.price,
        size,
        side: isBuy ? 'buy' : 'sell'
      };

      setTrades(prev => [newTrade, ...prev.slice(0, 49)]);
    }, 1100);

    return () => clearInterval(interval);
  }, [isOpen, isLive, stock]);

  const maxBidTotal = useMemo(() => {
    return book.bids.length > 0 ? book.bids[book.bids.length - 1].total : 1;
  }, [book.bids]);

  const maxAskTotal = useMemo(() => {
    return book.asks.length > 0 ? book.asks[book.asks.length - 1].total : 1;
  }, [book.asks]);

  const filteredTrades = useMemo(() => {
    if (minLotFilter === 0) return trades;
    return trades.filter(t => t.size >= minLotFilter);
  }, [trades, minLotFilter]);

  if (!isOpen) return null;

  // Imbalance calculations
  const totalDepth = book.bidDepthTotal + book.askDepthTotal;
  const bidPct = totalDepth > 0 ? Math.round((book.bidDepthTotal / totalDepth) * 100) : 50;
  const askPct = 100 - bidPct;

  return (
    <aside className="w-80 h-full bg-[#0d121c] border-l border-[#1c2637] flex flex-col shrink-0 select-none z-20 shadow-2xl animate-in slide-in-from-right-4 duration-150">
      {/* Top Header */}
      <div className="h-11 px-3 bg-[#111724] border-b border-[#1c2637] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-xs tracking-wide text-white font-mono">{stock.ticker}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800/40 font-mono font-medium">
            LEVEL 2 DOM
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2333] transition-colors"
            title="Close Order Book"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Sub-Tabs */}
      <div className="px-3 pt-2 pb-1.5 bg-[#0e1421] border-b border-[#1c2637] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 bg-[#141b29] p-0.5 rounded border border-[#232f42]">
          <button
            onClick={() => setTab('dom')}
            className={`px-3 py-1 text-[11px] font-medium rounded transition-all flex items-center gap-1.5 ${
              tab === 'dom'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            Depth of Market
          </button>
          <button
            onClick={() => setTab('tape')}
            className={`px-3 py-1 text-[11px] font-medium rounded transition-all flex items-center gap-1.5 ${
              tab === 'tape'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            Time & Sales
          </button>
        </div>

        <div className="text-[10px] font-mono text-slate-400">
          Spread: <span className="text-white font-bold">${book.spread.toFixed(3)}</span>
        </div>
      </div>

      {/* Liquidity Imbalance Meter */}
      <div className="px-3 py-2 bg-[#0b0f17] border-b border-[#182130] shrink-0">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            BIDS {bidPct}%
            <span className="text-slate-500 font-normal">({formatOrderFlowVolume(book.bidDepthTotal)})</span>
          </span>
          <span className="text-rose-400 font-bold flex items-center gap-1">
            <span className="text-slate-500 font-normal">({formatOrderFlowVolume(book.askDepthTotal)})</span>
            ASKS {askPct}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#182233] overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${bidPct}%` }}
          />
          <div 
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${askPct}%` }}
          />
        </div>
      </div>

      {/* TAB CONTENT: DOM LADDER */}
      {tab === 'dom' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden font-mono text-[11px]">
          {/* Table Header */}
          <div className="grid grid-cols-[50px_1fr_60px_60px] px-3 py-1 bg-[#101726] border-b border-[#1d2739] text-[10px] text-slate-400 font-semibold uppercase">
            <span>MPID</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total</span>
            <span className="text-right">Price</span>
          </div>

          {/* ASKS (Selling liquidity above market, rendered in reverse so best ask is at bottom) */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#131b28]">
            <div className="flex flex-col-reverse">
              {book.asks.slice(0, 10).map((ask, idx) => {
                const depthPct = Math.min(100, Math.round((ask.total / maxAskTotal) * 100));
                return (
                  <div 
                    key={ask.id} 
                    className="relative grid grid-cols-[50px_1fr_60px_60px] px-3 py-1 hover:bg-[#1e151c]/60 transition-colors group cursor-default"
                  >
                    {/* Ask depth bar in red/crimson */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-rose-950/25 border-l border-rose-800/40 pointer-events-none transition-all duration-200"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-slate-400 text-[10px] z-10">{ask.mpid}</span>
                    <span className="text-right text-slate-300 z-10">{ask.size.toLocaleString()}</span>
                    <span className="text-right text-slate-400 text-[10px] z-10">{formatOrderFlowVolume(ask.total)}</span>
                    <span className="text-right font-bold text-rose-400 z-10">{ask.price.toFixed(3)}</span>
                  </div>
                );
              })}
            </div>

            {/* INSIDE SPREAD BANNER */}
            <div className="px-3 py-1.5 bg-[#141d2d] border-y-2 border-sky-500/40 flex items-center justify-between text-xs font-mono shadow-inner my-0.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>${book.bids[0]?.price.toFixed(3)}</span>
              </div>
              <div className="text-[10px] px-2 py-0.5 rounded bg-[#0b1019] text-sky-300 font-medium border border-sky-900/60">
                Spread: ${book.spread.toFixed(3)}
              </div>
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <span>${book.asks[0]?.price.toFixed(3)}</span>
                <ArrowDownRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* BIDS (Buying liquidity below market) */}
            <div className="flex flex-col">
              {book.bids.slice(0, 10).map((bid, idx) => {
                const depthPct = Math.min(100, Math.round((bid.total / maxBidTotal) * 100));
                return (
                  <div 
                    key={bid.id} 
                    className="relative grid grid-cols-[50px_1fr_60px_60px] px-3 py-1 hover:bg-[#12221b]/60 transition-colors group cursor-default"
                  >
                    {/* Bid depth bar in emerald/green */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-emerald-950/25 border-l border-emerald-800/40 pointer-events-none transition-all duration-200"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-slate-400 text-[10px] z-10">{bid.mpid}</span>
                    <span className="text-right text-slate-300 z-10">{bid.size.toLocaleString()}</span>
                    <span className="text-right text-slate-400 text-[10px] z-10">{formatOrderFlowVolume(bid.total)}</span>
                    <span className="text-right font-bold text-emerald-400 z-10">{bid.price.toFixed(3)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TIME & SALES (TAPE) */}
      {tab === 'tape' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden font-mono text-[11px]">
          {/* Quick Lot Filters */}
          <div className="px-3 py-1.5 bg-[#0e1421] border-b border-[#1c2637] flex items-center gap-1 text-[10px]">
            <span className="text-slate-500 mr-1">Filter:</span>
            {[0, 200, 500, 1000].map(size => (
              <button
                key={size}
                onClick={() => setMinLotFilter(size)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  minLotFilter === size
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200 bg-[#141c2c]'
                }`}
              >
                {size === 0 ? 'All' : `≥${size}`}
              </button>
            ))}
          </div>

          {/* Tape Header */}
          <div className="grid grid-cols-[60px_1fr_65px_45px] px-3 py-1 bg-[#101726] border-b border-[#1d2739] text-[10px] text-slate-400 font-semibold uppercase">
            <span>Time</span>
            <span className="text-right">Price</span>
            <span className="text-right">Size</span>
            <span className="text-right">Side</span>
          </div>

          {/* Tape Stream */}
          <div ref={tradesContainerRef} className="flex-1 overflow-y-auto divide-y divide-[#131b28]">
            {filteredTrades.map(trade => {
              const isBuy = trade.side === 'buy';
              const isBlockTrade = trade.size >= 1000;
              return (
                <div 
                  key={trade.id} 
                  className={`grid grid-cols-[60px_1fr_65px_45px] px-3 py-1 transition-colors items-center ${
                    isBlockTrade ? (isBuy ? 'bg-emerald-950/20' : 'bg-rose-950/20') : 'hover:bg-[#131b28]'
                  }`}
                >
                  <span className="text-slate-400 text-[10px]">{trade.timeStr}</span>
                  <span className={`text-right font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${trade.price.toFixed(3)}
                  </span>
                  <span className={`text-right ${isBlockTrade ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    {trade.size.toLocaleString()}
                  </span>
                  <span className="text-right">
                    <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                      isBuy ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                    }`}>
                      {isBuy ? 'BUY' : 'SELL'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="h-8 px-3 bg-[#0c1017] border-t border-[#1a2333] flex items-center justify-between text-[10px] text-slate-400 font-mono shrink-0">
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-sky-400" />
          NASDAQ TotalView
        </span>
        <span className="text-slate-500">
          Feeds: Direct L2
        </span>
      </div>
    </aside>
  );
};
