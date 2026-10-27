// src/types/screenerFilters.ts
import { ScreenerMetrics } from '../utils/screenerCalculations';

export interface NumericRange {
  min?: number | null;
  max?: number | null;
}

export interface ScreenerFilterState {
  volume?: NumericRange;
  perf1m?: NumericRange;
  perf5m?: NumericRange;
  perf15m?: NumericRange;
  perf1h?: NumericRange;
  perf4h?: NumericRange;
  change1d?: NumericRange;
  changeFromOpen?: NumericRange;
}

export interface ScreenerItem extends ScreenerMetrics {
  id: string;
  symbol: string;
  name: string;
}

/**
 * Evaluates whether a given value falls inside [min, max] range
 */
function passesRange(val: number, range?: NumericRange): boolean {
  if (!range) return true;
  if (range.min !== undefined && range.min !== null && val < range.min) return false;
  if (range.max !== undefined && range.max !== null && val > range.max) return false;
  return true;
}

/**
 * Main filter evaluation replacing placeholder logic
 */
export function matchesScreenerFilters(item: ScreenerItem, filters: ScreenerFilterState): boolean {
  if (!passesRange(item.volume, filters.volume)) return false;
  if (!passesRange(item.perf1m, filters.perf1m)) return false;
  if (!passesRange(item.perf5m, filters.perf5m)) return false;
  if (!passesRange(item.perf15m, filters.perf15m)) return false;
  if (!passesRange(item.perf1h, filters.perf1h)) return false;
  if (!passesRange(item.perf4h, filters.perf4h)) return false;
  if (!passesRange(item.change1d, filters.change1d)) return false;
  if (!passesRange(item.changeFromOpen, filters.changeFromOpen)) return false;

  return true;
}