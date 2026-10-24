import React from 'react';
import { X, CandlestickChart, TrendingUp, Layers, SlidersHorizontal, Check } from 'lucide-react';

interface ChartTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChartTourModal: React.FC<ChartTourModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl bg-[#0f1522] border border-[#233045] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141c2c] border-b border-[#202d42] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="font-semibold text-sm text-white">ApexTrade NASDAQ Terminal Tour</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f2b3e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh] text-xs text-slate-300">
          <div className="flex items-start gap-3 p-3 bg-[#131b27] rounded border border-[#1d293b]">
            <CandlestickChart className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-100 text-sm">Interactive Mouse Pan & Axis Stretch/Contract</div>
              <p className="mt-1 text-slate-400 leading-relaxed">
                <strong className="text-sky-300">Move Chart:</strong> Click and drag anywhere on the chart canvas (with the Crosshair or Hand tool) to smoothly pan in both time (horizontally) and price (vertically).
              </p>
              <p className="mt-1.5 text-slate-400 leading-relaxed">
                <strong className="text-sky-300">Stretch & Contract Price Axis:</strong> Hover over the right Y-axis (cursor changes to ↕) and click-drag up/down to compress or stretch the price scale. Double-click the price axis to reset auto-fit!
              </p>
              <p className="mt-1.5 text-slate-400 leading-relaxed">
                <strong className="text-sky-300">Stretch & Contract Time Axis:</strong> Hover over the bottom X-axis (cursor changes to ↔) and click-drag left/right to adjust candle spacing. Double-click the time axis or click [Reset Scale] to restore default view.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#131b27] rounded border border-[#1d293b]">
            <Layers className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-100 text-sm">Technical Indicators & MACD Subchart</div>
              <p className="mt-1 text-slate-400 leading-relaxed">
                Toggle EMA 9 (yellow), SMA 20 (blue), SMA 200 (purple), VWAP (white), and left-side Volume Profile (VP 50). The bottom subchart tracks real-time MACD (12, 26, 9) with histogram bars and signal convergence.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#131b27] rounded border border-[#1d293b]">
            <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-100 text-sm">Interactive Drawing Suite</div>
              <p className="mt-1 text-slate-400 leading-relaxed">
                Use the left toolbar to draw Trendlines, Horizontal Support/Resistance price levels, Fibonacci Retracements, and Price/Percentage Measurement Rulers. Toggle Magnet Mode to snap coordinates directly to candle wicks.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#131b27] rounded border border-[#1d293b]">
            <SlidersHorizontal className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-100 text-sm">Multi-Timeframe NASDAQ Screener</div>
              <p className="mt-1 text-slate-400 leading-relaxed">
                Monitor real-time percentage changes across 1 Min, 5 Min, 15 Min, 1 Hr, 4 Hr, and Day Change. Click any column header to sort in ascending or descending order. Click any stock row to instantly switch chart views.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#111723] border-t border-[#1e2a3c] flex items-center justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Got It, Let's Trade</span>
          </button>
        </div>
      </div>
    </div>
  );
};
