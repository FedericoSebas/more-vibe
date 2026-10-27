// src/components/Screener.tsx
import React, { useState, useMemo } from 'react';
import {
  ScreenerItem,
  ScreenerFilterState,
  matchesScreenerFilters
} from '../types/screenerFilters';
import { formatPercent, formatVolume } from '../utils/screenerCalculations';

interface ScreenerProps {
  items: ScreenerItem[];
}

export const Screener: React.FC<ScreenerProps> = ({ items }) => {
  const [filters, setFilters] = useState<ScreenerFilterState>({
    volume: { min: 100000 },      // e.g. min $100k volume
    perf1m: { min: null, max: null },
    perf5m: { min: null, max: null },
    perf15m: { min: null, max: null },
    perf1h: { min: null, max: null },
    perf4h: { min: null, max: null },
    change1d: { min: null, max: null },
    changeFromOpen: { min: null, max: null },
  });

  const filteredItems = useMemo(() => {
    return items.filter(item => matchesScreenerFilters(item, filters));
  }, [items, filters]);

  const updateRange = (field: keyof ScreenerFilterState, bound: 'min' | 'max', val: string) => {
    const numeric = val === '' ? null : parseFloat(val);
    setFilters(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [bound]: numeric
      }
    }));
  };

  const renderBadge = (val: number) => {
    const colorClass = val > 0 ? 'text-green-500 bg-green-500/10' : val < 0 ? 'text-red-500 bg-red-500/10' : 'text-gray-400 bg-gray-500/10';
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium font-mono ${colorClass}`}>
        {formatPercent(val)}
      </span>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Filter Inputs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Min Volume ($)</label>
          <input
            type="number"
            placeholder="Min Volume"
            value={filters.volume?.min ?? ''}
            onChange={e => updateRange('volume', 'min', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Min 1m Perf (%)</label>
          <input
            type="number"
            step="0.1"
            placeholder="Min 1m %"
            value={filters.perf1m?.min ?? ''}
            onChange={e => updateRange('perf1m', 'min', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Min 5m Perf (%)</label>
          <input
            type="number"
            step="0.1"
            placeholder="Min 5m %"
            value={filters.perf5m?.min ?? ''}
            onChange={e => updateRange('perf5m', 'min', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Min 15m Perf (%)</label>
          <input
            type="number"
            step="0.1"
            placeholder="Min 15m %"
            value={filters.perf15m?.min ?? ''}
            onChange={e => updateRange('perf15m', 'min', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Min 1h Perf (%)</label>
          <input
            type="number"
            step="0.1"
            placeholder="Min 1h %"
            value={filters.perf1h?.min ?? ''}
            onChange={e => updateRange('perf1h', 'min', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Min 4h Perf (%)</label>
          <input
            type="number"
            step="0.1"
            placeholder="Min 4h %"
            value={filters.perf4h?.min ?? ''}
            onChange={e => updateRange('perf4h', 'min', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Min 1D Change (%)</label>
          <input
            type="number"
            step="0.1"
            placeholder="Min 1D %"
            value={filters.change1d?.min ?? ''}
            onChange={e => updateRange('change1d', 'min', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Min From Open (%)</label>
          <input
            type="number"
            step="0.1"
            placeholder="Min Open %"
            value={filters.changeFromOpen?.min ?? ''}
            onChange={e => updateRange('changeFromOpen', 'min', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm text-zinc-200">
          <thead className="bg-zinc-900/80 text-xs uppercase text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4">Symbol</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Volume</th>
              <th className="py-3 px-4">1m %</th>
              <th className="py-3 px-4">5m %</th>
              <th className="py-3 px-4">15m %</th>
              <th className="py-3 px-4">1h %</th>
              <th className="py-3 px-4">4h %</th>
              <th className="py-3 px-4">1D Change %</th>
              <th className="py-3 px-4">From Open %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-zinc-900/50 transition">
                <td className="py-3 px-4 font-semibold text-white">{item.symbol}</td>
                <td className="py-3 px-4 font-mono">${item.currentPrice.toFixed(4)}</td>
                <td className="py-3 px-4 font-mono">{formatVolume(item.volume)}</td>
                <td className="py-3 px-4">{renderBadge(item.perf1m)}</td>
                <td className="py-3 px-4">{renderBadge(item.perf5m)}</td>
                <td className="py-3 px-4">{renderBadge(item.perf15m)}</td>
                <td className="py-3 px-4">{renderBadge(item.perf1h)}</td>
                <td className="py-3 px-4">{renderBadge(item.perf4h)}</td>
                <td className="py-3 px-4">{renderBadge(item.change1d)}</td>
                <td className="py-3 px-4">{renderBadge(item.changeFromOpen)}</td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-8 text-zinc-500">
                  No assets match the active filter calculations.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};