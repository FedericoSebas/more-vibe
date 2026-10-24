import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface CustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  minVolume: number;
  onChangeMinVolume: (vol: number) => void;
  minGain: number;
  onChangeMinGain: (gain: number) => void;
}

export const CustomizeModal: React.FC<CustomizeModalProps> = ({
  isOpen,
  onClose,
  minVolume,
  onChangeMinVolume,
  minGain,
  onChangeMinGain
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#0f1522] border border-[#233045] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141c2c] border-b border-[#202d42] flex items-center justify-between">
          <span className="font-semibold text-sm text-white">Customize Scanner Filters</span>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f2b3e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="p-5 space-y-4 text-xs text-slate-300">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Minimum Volume Threshold
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="10000000"
                step="500000"
                value={minVolume}
                onChange={(e) => onChangeMinVolume(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="font-mono text-slate-200 min-w-[70px] text-right font-bold">
                {minVolume === 0 ? 'All' : `${(minVolume / 1000000).toFixed(1)}M+`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Filters out illiquid low-volume tickers.</p>
          </div>

          <div className="pt-2 border-t border-[#1a2333]">
            <label className="block text-slate-300 font-semibold mb-1">
              Minimum Day Change %
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={minGain}
                onChange={(e) => onChangeMinGain(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="font-mono text-slate-200 min-w-[70px] text-right font-bold">
                {minGain === 0 ? 'All' : `+${minGain}%+`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Isolates high-momentum runaway gainers.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#111723] border-t border-[#1e2a3c] flex items-center justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
};
