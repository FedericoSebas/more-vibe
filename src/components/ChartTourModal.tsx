import { X, CandlestickChart, TrendingUp, Layers, SlidersHorizontal, Check, Clock } from 'lucide-react';

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
            <Clock className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-100 text-sm">24-Hour Continuous Market Sessions</div>
              <p className="mt-1 text-slate-400 leading-relaxed">
                Seamless around-the-clock trading across four color-coded market sessions:
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
                <div className="p-2 rounded bg-purple-950/40 border border-purple-800/40 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-purple-500 shrink-0" />
                  <div>
                    <div className="text-purple-300 font-bold">Overnight Market</div>
                    <div className="text-purple-400 text-[10px]">8:00 PM – 4:00 AM ET</div>
                  </div>
                </div>
                <div className="p-2 rounded bg-orange-950/40 border border-orange-800/40 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-orange-500 shrink-0" />
                  <div>
                    <div className="text-orange-300 font-bold">Pre-Market</div>
                    <div className="text-orange-400 text-[10px]">4:00 AM – 9:30 AM ET</div>
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-700/50 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-slate-500 shrink-0" />
                  <div>
                    <div className="text-slate-300 font-bold">Regular Market</div>
                    <div className="text-slate-400 text-[10px]">9:30 AM – 4:00 PM ET</div>
                  </div>
                </div>
                <div className="p-2 rounded bg-blue-950/40 border border-blue-800/40 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500 shrink-0" />
                  <div>
                    <div className="text-blue-300 font-bold">After-Market</div>
                    <div className="text-blue-400 text-[10px]">4:00 PM – 8:00 PM ET</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#131b27] rounded border border-[#1d293b]">
            <Layers className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-100 text-sm">Footprint / Order Flow & Level 2 DOM</div>
              <p className="mt-1 text-slate-400 leading-relaxed">
                <strong className="text-emerald-300">Footprint Ladders:</strong> Available on the <strong className="text-white font-mono">1M, 5M, and 10M</strong> timeframes. Zoom in significantly (or click <span className="text-emerald-400 font-mono font-bold">[ZOOM FOOTPRINT]</span>) to reveal internal candle auction mechanics with exact <strong className="text-white">Bid × Ask volume ladders</strong>, Point of Control (<span className="text-amber-400 font-bold">POC</span>) nodes, aggressive buying/selling imbalance highlights (3:1 ratio), and candle Delta metrics (Δ).
              </p>
              <p className="mt-1.5 text-slate-400 leading-relaxed">
                <strong className="text-sky-300">Level 2 Order Book (DOM):</strong> Click <span className="text-sky-400 font-mono font-bold">[LEVEL 2]</span> in the header to open the Depth of Market drawer with multi-tier bid/ask liquidity ladders, market participant IDs (MPIDs), real-time spread, imbalance meters, and streaming Time & Sales (Tape).
              </p>
            </div>
          </div>

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
              <div className="font-semibold text-slate-100 text-sm">Technical Indicators & Bicolor MACD Subchart</div>
              <p className="mt-1 text-slate-400 leading-relaxed">
                Toggle EMA 9 (yellow), SMA 20 (blue), SMA 200 (purple), VWAP (white), and left-side Volume Profile (VP 50). The bottom subchart features a <strong className="text-emerald-400">Modern Bicolor MACD (12, 26, 9) Histogram</strong> that color-codes momentum acceleration and deceleration:
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] font-mono">
                <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-800/40">
                  <span className="text-[#22c55e] font-bold">Bright Green:</span> Growing Positive (Bullish momentum accelerating)
                </div>
                <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-800/20">
                  <span className="text-[#86efac] font-bold">Faded Green:</span> Shrinking Positive (Bullish momentum slowing)
                </div>
                <div className="p-1.5 rounded bg-rose-950/40 border border-rose-800/40">
                  <span className="text-[#ef4444] font-bold">Bright Red:</span> Growing Negative (Bearish momentum accelerating)
                </div>
                <div className="p-1.5 rounded bg-rose-950/20 border border-rose-800/20">
                  <span className="text-[#fca5a5] font-bold">Faded Red:</span> Shrinking Negative (Bearish momentum slowing)
                </div>
              </div>
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

          <div className="flex items-start gap-3 p-3 bg-[#131b27] rounded border border-[#1d293b]">
            <CandlestickChart className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-100 text-sm">Keyboard Hotkeys</div>
              <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
                <div className="p-2 rounded bg-[#0b1018] border border-[#233147] flex items-center justify-between">
                  <span className="text-slate-300 font-sans">Candlestick Labels</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-bold">\</span>
                </div>
                <div className="p-2 rounded bg-[#0b1018] border border-[#233147] flex items-center justify-between">
                  <span className="text-slate-300 font-sans">Toggle Screener</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-bold">Shift+S</span>
                </div>
              </div>
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
