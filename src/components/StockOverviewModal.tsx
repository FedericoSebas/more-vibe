import React from 'react';
import { X, TrendingUp, Building2, BarChart2, ShieldAlert } from 'lucide-react';
import { StockQuote } from '../types/stock';
import { formatVolume } from '../utils/stockData';

interface StockOverviewModalProps {
  stock: StockQuote;
  isOpen: boolean;
  onClose: () => void;
}

export const StockOverviewModal: React.FC<StockOverviewModalProps> = ({
  stock,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const isPos = stock.change >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl bg-[#0f1522] border border-[#233045] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#141c2c] border-b border-[#202d42] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span 
              className="w-3 h-3 rounded-[3px]" 
              style={{ backgroundColor: stock.tagColor }} 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg text-white">{stock.ticker}</span>
                <span className="text-xs text-slate-400 font-medium">NASDAQ</span>
                <span className="text-xs text-sky-400 bg-sky-950/60 border border-sky-800/60 px-1.5 py-0.2 rounded font-mono">
                  {stock.sector}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium">{stock.name}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f2b3e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Price Snapshot Strip */}
          <div className="flex items-baseline justify-between p-3.5 bg-[#0b1018] rounded border border-[#1b2536]">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Real-Time Quote</div>
              <div className="text-2xl font-mono font-bold text-white mt-0.5">
                ${stock.price.toFixed(2)}
              </div>
            </div>

            <div className="text-right">
              <div className={`text-base font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPos ? '+' : ''}{stock.change.toFixed(2)} ({isPos ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Prev Close: ${stock.prevClose.toFixed(2)} · Open: ${stock.open.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Key Fundamentals Grid */}
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Key Statistics & Capital Structure</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="p-2.5 rounded bg-[#131b27] border border-[#1d293b]">
                <div className="text-[10px] text-slate-400 uppercase">Market Cap</div>
                <div className="font-bold text-slate-100 mt-0.5">{stock.marketCap}</div>
              </div>
              <div className="p-2.5 rounded bg-[#131b27] border border-[#1d293b]">
                <div className="text-[10px] text-slate-400 uppercase">P/E Ratio</div>
                <div className="font-bold text-slate-100 mt-0.5">{stock.peRatio > 0 ? stock.peRatio.toFixed(1) : 'N/A'}</div>
              </div>
              <div className="p-2.5 rounded bg-[#131b27] border border-[#1d293b]">
                <div className="text-[10px] text-slate-400 uppercase">Float Shares</div>
                <div className="font-bold text-slate-100 mt-0.5">{stock.floatShares}</div>
              </div>
              <div className="p-2.5 rounded bg-[#131b27] border border-[#1d293b]">
                <div className="text-[10px] text-slate-400 uppercase">Day Range</div>
                <div className="font-bold text-slate-100 mt-0.5">${stock.low.toFixed(2)} - ${stock.high.toFixed(2)}</div>
              </div>
              <div className="p-2.5 rounded bg-[#131b27] border border-[#1d293b]">
                <div className="text-[10px] text-slate-400 uppercase">52-Week Range</div>
                <div className="font-bold text-slate-100 mt-0.5">${stock.low52w.toFixed(2)} - ${stock.high52w.toFixed(2)}</div>
              </div>
              <div className="p-2.5 rounded bg-[#131b27] border border-[#1d293b]">
                <div className="text-[10px] text-slate-400 uppercase">Total Today Vol</div>
                <div className="font-bold text-slate-100 mt-0.5">{formatVolume(stock.volume)}</div>
              </div>
            </div>
          </div>

          {/* Business Description */}
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Company Profile</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed bg-[#131b27] p-3 rounded border border-[#1d293b]">
              {stock.description}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#111723] border-t border-[#1e2a3c] flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            Direct feed via NASDAQ Consolidated Market System
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
