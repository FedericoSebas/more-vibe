import React from 'react';
import { 
  ListFilter, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';

interface RightSidebarProps {
  isScreenerOpen: boolean;
  onToggleScreener: () => void;
  activeCategory?: string;
  onChangeCategory?: (category: string) => void;
  stocksCount?: number;
  isLevel2Open?: boolean;
  onToggleLevel2?: () => void;
  onOpenOverview?: () => void;
  onOpenCustomize?: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  isScreenerOpen,
  onToggleScreener,
}) => {
  return (
    <aside className="w-10 bg-[#0c1018] border-l border-[#1a2333] flex flex-col items-center py-2 shrink-0 select-none z-20 relative">
      {/* 1. Main Screener Toggle Button with Indicator */}
      <div className="relative group">
        <button
          onClick={onToggleScreener}
          className={`w-8 h-10 rounded-lg flex flex-col items-center justify-center transition-all ${
            isScreenerOpen
              ? 'bg-[#18273d] text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm shadow-[#38bdf8]/15'
              : 'text-slate-400 hover:text-white hover:bg-[#161d2a] border border-transparent'
          }`}
          title={isScreenerOpen ? 'Hide Screener (Shift+S)' : 'Show Screener (Shift+S)'}
          aria-label={isScreenerOpen ? 'Hide Screener' : 'Show Screener'}
        >
          <div className="relative">
            <ListFilter className="w-4 h-4" />
            {isScreenerOpen ? (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0c1018]" />
            ) : (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400/80 ring-2 ring-[#0c1018]" />
            )}
          </div>
          <span className="text-[7.5px] font-mono font-bold tracking-tight mt-0.5">
            {isScreenerOpen ? 'HIDE' : 'SHOW'}
          </span>
        </button>

        {/* Tooltip */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:flex items-center px-2 py-1 rounded bg-[#1e293b] text-white text-[11px] whitespace-nowrap shadow-xl border border-[#334155] z-50 pointer-events-none">
          <span className="font-semibold">{isScreenerOpen ? 'Hide Screener' : 'Show Screener'}</span>
          <span className="ml-1.5 text-[9px] font-mono px-1 py-0.5 rounded bg-[#0f172a] text-sky-400 border border-slate-700">
            Shift+S
          </span>
        </div>
      </div>

      {/* Bottom spacer and toggle indicator */}
      <div className="mt-auto flex flex-col items-center pb-1">
        <button
          onClick={onToggleScreener}
          className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#161d2a] transition-colors"
          title={isScreenerOpen ? 'Collapse Screener' : 'Expand Screener'}
        >
          {isScreenerOpen ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
};
