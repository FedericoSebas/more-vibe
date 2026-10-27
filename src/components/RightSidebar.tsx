import React, { useState } from 'react';
import { 
  ListFilter, 
  Layers, 
  TrendingUp, 
  Flame, 
  Globe, 
  Dna, 
  Star, 
  SlidersHorizontal,
  BookOpen,
  Info,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check
} from 'lucide-react';

export interface ScreenerPreset {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  activeColor: string;
  description: string;
}

export const SCREENER_PRESETS: ScreenerPreset[] = [
  {
    id: 'stocks',
    label: 'All Active Stocks',
    shortLabel: 'ALL',
    icon: Layers,
    color: 'text-slate-300',
    activeColor: 'text-sky-400',
    description: 'All 3,431+ active NASDAQ stocks with live market data'
  },
  {
    id: 'gainers',
    label: 'Top Gainers (>20%)',
    shortLabel: 'GAIN',
    icon: TrendingUp,
    color: 'text-emerald-400',
    activeColor: 'text-emerald-400',
    description: 'High momentum stocks surging +20% or more today'
  },
  {
    id: 'active',
    label: 'Most Active Volume',
    shortLabel: 'VOL',
    icon: Flame,
    color: 'text-amber-400',
    activeColor: 'text-amber-400',
    description: 'Heavy liquidity stocks trading over 10M shares'
  },
  {
    id: 'nasdaq100',
    label: 'NASDAQ 100 Giants',
    shortLabel: 'NDX',
    icon: Globe,
    color: 'text-indigo-400',
    activeColor: 'text-indigo-400',
    description: 'Mega-cap & large-cap benchmark tech leaders'
  },
  {
    id: 'biotech',
    label: 'Biotech & Health Movers',
    shortLabel: 'BIO',
    icon: Dna,
    color: 'text-purple-400',
    activeColor: 'text-purple-400',
    description: 'Biotechnology, oncology, and pharmaceutical equities'
  },
  {
    id: 'favorites',
    label: 'Starred Favorites',
    shortLabel: 'FAV',
    icon: Star,
    color: 'text-yellow-400',
    activeColor: 'text-yellow-400',
    description: 'Custom starred watchlist tickers'
  }
];

interface RightSidebarProps {
  isScreenerOpen: boolean;
  onToggleScreener: () => void;
  activeCategory: string;
  onChangeCategory: (category: string) => void;
  stocksCount?: number;
  isLevel2Open?: boolean;
  onToggleLevel2?: () => void;
  onOpenOverview?: () => void;
  onOpenCustomize?: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  isScreenerOpen,
  onToggleScreener,
  activeCategory,
  onChangeCategory,
  stocksCount,
  isLevel2Open,
  onToggleLevel2,
  onOpenOverview,
  onOpenCustomize,
}) => {
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);

  const handlePresetClick = (presetId: string) => {
    if (!isScreenerOpen) {
      onChangeCategory(presetId);
      onToggleScreener();
    } else if (activeCategory === presetId) {
      // Clicking the already active preset toggles the screener to hide/show
      onToggleScreener();
    } else {
      onChangeCategory(presetId);
    }
  };

  return (
    <aside className="w-12 bg-[#0c1018] border-l border-[#1a2333] flex flex-col items-center py-2 gap-1.5 shrink-0 select-none z-20 relative">
      {/* 1. Main Screener Toggle Button with Indicator */}
      <div className="relative group">
        <button
          onClick={onToggleScreener}
          className={`w-9 h-11 rounded-lg flex flex-col items-center justify-center transition-all ${
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
          <span className="text-[8px] font-mono font-bold tracking-tight mt-0.5">
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

      {/* 2. Presets Flyout Menu Button */}
      <div className="relative">
        <button
          onClick={() => setShowPresetsMenu(!showPresetsMenu)}
          className={`w-9 h-8 rounded-lg flex items-center justify-center transition-all ${
            showPresetsMenu
              ? 'bg-[#1b2638] text-amber-400 border border-amber-400/40'
              : 'text-slate-400 hover:text-amber-400 hover:bg-[#161d2a]'
          }`}
          title="Screener Presets Menu"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Presets Popup Dropdown */}
        {showPresetsMenu && (
          <div className="absolute right-full top-0 mr-2 w-64 bg-[#111723] border border-[#233147] rounded-lg shadow-2xl z-50 p-1.5 text-xs">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#1f2c40] text-slate-400 text-[11px] font-medium">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Screener Presets
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {isScreenerOpen ? 'Screener Active' : 'Screener Closed'}
              </span>
            </div>

            <div className="py-1 space-y-0.5">
              {SCREENER_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = activeCategory === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onChangeCategory(preset.id);
                      if (!isScreenerOpen) onToggleScreener();
                      setShowPresetsMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded flex items-start gap-2.5 transition-colors ${
                      isSelected
                        ? 'bg-[#1a283e] text-white border border-[#38bdf8]/30'
                        : 'text-slate-300 hover:bg-[#172130] hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? preset.activeColor : preset.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[11px] truncate">{preset.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-[#38bdf8] shrink-0 ml-1" />}
                      </div>
                      <div className="text-[10px] text-slate-400 leading-snug line-clamp-1">
                        {preset.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-1.5 border-t border-[#1f2c40] flex justify-between items-center px-2 py-1">
              <button
                onClick={() => {
                  onToggleScreener();
                  setShowPresetsMenu(false);
                }}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-mono flex items-center gap-1"
              >
                {isScreenerOpen ? '← Hide Screener' : '→ Expand Screener'}
              </button>
              {onOpenCustomize && (
                <button
                  onClick={() => {
                    onOpenCustomize();
                    setShowPresetsMenu(false);
                  }}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3 h-3 text-sky-400" />
                  Customize
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-6 h-[1px] bg-[#1a2333] my-0.5" />

      {/* 3. Screener Quick Preset Buttons on the Rail */}
      <div className="flex flex-col items-center gap-1 w-full px-1">
        {SCREENER_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isSelected = activeCategory === preset.id && isScreenerOpen;
          return (
            <div key={preset.id} className="relative group w-full flex justify-center">
              <button
                onClick={() => handlePresetClick(preset.id)}
                className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#1b2a41] text-[#38bdf8] border border-[#38bdf8]/50 shadow-sm shadow-[#38bdf8]/15 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-[#161d2a] border border-transparent'
                }`}
                aria-label={preset.label}
              >
                <Icon className={`w-4 h-4 ${isSelected ? preset.activeColor : preset.color}`} />
                <span className={`text-[7.5px] font-mono leading-none mt-0.5 ${isSelected ? 'text-[#38bdf8] font-bold' : 'text-slate-500'}`}>
                  {preset.shortLabel}
                </span>
              </button>

              {/* Tooltip on hover */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:flex flex-col px-2.5 py-1.5 rounded-md bg-[#1e293b] text-white text-[11px] whitespace-nowrap shadow-2xl border border-[#334155] z-50 pointer-events-none">
                <span className="font-bold flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${preset.color}`} />
                  {preset.label}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {isScreenerOpen && activeCategory === preset.id
                    ? 'Active · Click to hide screener'
                    : 'Click to select preset & show screener'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-6 h-[1px] bg-[#1a2333] my-1" />

      {/* 4. Utility Action Buttons */}
      {/* Customize Filters Button */}
      {onOpenCustomize && (
        <div className="relative group">
          <button
            onClick={onOpenCustomize}
            className="w-9 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#161d2a] transition-colors"
            title="Customize Screener Filters"
          >
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
          </button>
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:flex items-center px-2 py-1 rounded bg-[#1e293b] text-white text-[11px] whitespace-nowrap shadow-xl border border-[#334155] z-50 pointer-events-none">
            Customize Filters
          </div>
        </div>
      )}

      {/* Level 2 DOM Book Toggle */}
      {onToggleLevel2 && (
        <div className="relative group">
          <button
            onClick={onToggleLevel2}
            className={`w-9 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isLevel2Open 
                ? 'bg-[#1b2d47] text-[#38bdf8] border border-[#38bdf8]/40' 
                : 'text-slate-400 hover:text-white hover:bg-[#161d2a]'
            }`}
            title={isLevel2Open ? 'Close Level 2 Order Book' : 'Open Level 2 Order Book'}
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:flex items-center px-2 py-1 rounded bg-[#1e293b] text-white text-[11px] whitespace-nowrap shadow-xl border border-[#334155] z-50 pointer-events-none">
            {isLevel2Open ? 'Hide Level 2 DOM' : 'Show Level 2 DOM'}
          </div>
        </div>
      )}

      {/* Stock Overview Modal */}
      {onOpenOverview && (
        <div className="relative group">
          <button
            onClick={onOpenOverview}
            className="w-9 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#161d2a] transition-colors"
            title="Company Overview & Fundamentals"
          >
            <Info className="w-4 h-4" />
          </button>
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:flex items-center px-2 py-1 rounded bg-[#1e293b] text-white text-[11px] whitespace-nowrap shadow-xl border border-[#334155] z-50 pointer-events-none">
            Company Overview
          </div>
        </div>
      )}

      {/* Bottom spacer and toggle indicator */}
      <div className="mt-auto flex flex-col items-center pb-1">
        <button
          onClick={onToggleScreener}
          className="w-8 h-8 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#161d2a] transition-colors"
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
