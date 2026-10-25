import React from 'react';
import { 
  Crosshair, 
  Hand,
  TrendingUp, 
  Minus, 
  AlignJustify, 
  PenTool, 
  Ruler, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Trash2,
  Magnet,
  Type
} from 'lucide-react';
import { DrawingTool } from '../types/stock';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  magnetMode: boolean;
  onToggleMagnet: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onClearDrawings: () => void;
  drawingsCount: number;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  onSelectTool,
  magnetMode,
  onToggleMagnet,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onClearDrawings,
  drawingsCount
}) => {
  const tools: { id: DrawingTool; icon: React.FC<{ className?: string }>; title: string }[] = [
    { id: 'crosshair', icon: Crosshair, title: 'Crosshair Inspector (C)' },
    { id: 'pan', icon: Hand, title: 'Hand / Pan Chart Tool (H)' },
    { id: 'trendline', icon: TrendingUp, title: 'Trendline Tool (T)' },
    { id: 'horizontal', icon: Minus, title: 'Horizontal Support / Resistance (L)' },
    { id: 'fibonacci', icon: AlignJustify, title: 'Fibonacci Retracement (50%, 62%, 70.5%, 78.8%, 88.6%, 110%) (F)' },
    { id: 'brush', icon: PenTool, title: 'Freehand Marker Brush (B)' },
    { id: 'ruler', icon: Ruler, title: 'Price & Percentage Measure Ruler (M)' },
  ];

  return (
    <aside className="w-10 bg-[#0c1018] border-r border-[#1a2333] flex flex-col items-center py-2 gap-1.5 shrink-0 select-none z-10">
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id || 'crosshair'}
            onClick={() => onSelectTool(t.id)}
            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
              isActive
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm shadow-sky-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161f2c]'
            }`}
            title={t.title}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      <div className="w-5 h-[1px] bg-[#1c2636] my-1" />

      {/* Magnet Mode */}
      <button
        onClick={onToggleMagnet}
        className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
          magnetMode
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            : 'text-slate-400 hover:text-slate-200 hover:bg-[#161f2c]'
        }`}
        title={magnetMode ? 'Magnet Mode ON (Snaps to High/Low wicks)' : 'Magnet Mode OFF'}
      >
        <Magnet className="w-4 h-4" />
      </button>

      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#161f2c] transition-colors"
        title="Zoom In (+)"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#161f2c] transition-colors"
        title="Zoom Out (-)"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      {/* Reset Zoom */}
      <button
        onClick={onResetZoom}
        className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#161f2c] transition-colors"
        title="Reset Chart View & Scale (0)"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Clear Drawings */}
      {drawingsCount > 0 && (
        <button
          onClick={onClearDrawings}
          className="w-7 h-7 rounded flex items-center justify-center text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors mt-auto mb-1"
          title={`Clear ${drawingsCount} Drawing(s)`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </aside>
  );
};
