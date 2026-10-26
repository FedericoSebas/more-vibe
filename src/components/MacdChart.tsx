import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Candle, MacdPoint } from '../types/stock';
import { calculateMACD } from '../utils/stockData';

interface MacdChartProps {
  candles: Candle[];
  zoomLevel: number;
  panOffset?: number;
  startIndex?: number;
  endIndex?: number;
}

export const MacdChart: React.FC<MacdChartProps> = ({ candles, zoomLevel, panOffset = 0, startIndex, endIndex }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const macdData = useMemo(() => calculateMACD(candles, 12, 26, 9), [candles]);

  const totalCandles = candles.length || 1;
  const defaultBars = Math.max(10, Math.min(totalCandles, Math.round(totalCandles / zoomLevel)));
  const maxPan = Math.max(0, totalCandles - defaultBars);
  const effectivePan = Math.max(0, Math.min(maxPan, panOffset));
  const effStart = startIndex !== undefined && startIndex >= 0 
    ? startIndex 
    : Math.max(0, totalCandles - defaultBars - effectivePan);
  const effEnd = endIndex !== undefined && endIndex > 0 
    ? endIndex 
    : Math.min(totalCandles, effStart + defaultBars);

  const visibleMacd = useMemo(() => macdData.slice(effStart, effEnd), [macdData, effStart, effEnd]);
  const visibleCandlesSlice = useMemo(() => candles.slice(effStart, effEnd), [candles, effStart, effEnd]);

  const rightAxisWidth = 74;

  const renderMacd = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use container rect for logical CSS pixels so axes align on any display resolution (QHD, 4K, Retina)
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const bufferW = Math.round(width * dpr);
    const bufferH = Math.round(height * dpr);

    if (canvas.width !== bufferW || canvas.height !== bufferH) {
      canvas.width = bufferW;
      canvas.height = bufferH;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    // Set scale transform so all drawing coordinates are in logical CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const plotWidth = width - rightAxisWidth;
    const plotHeight = height;

    // Clear background
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, width, height);

    if (visibleMacd.length === 0) return;

    const candleWidth = plotWidth / visibleMacd.length;

    // Extended Hours Session Shading (vertical match with StockChart)
    // Pre-market (Orange), After-market (Blue), Overnight (Purple)
    for (let i = 0; i < visibleCandlesSlice.length; i++) {
      const c = visibleCandlesSlice[i];
      const x = i * candleWidth + candleWidth / 2;
      const halfW = candleWidth / 2;

      if (c) {
        if (c.session === 'pre') {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.12)';
          ctx.fillRect(x - halfW, 0, candleWidth, plotHeight);
        } else if (c.session === 'post') {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
          ctx.fillRect(x - halfW, 0, candleWidth, plotHeight);
        } else if (c.session === 'overnight') {
          ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
          ctx.fillRect(x - halfW, 0, candleWidth, plotHeight);
        }
      }

      if (i > 0 && visibleCandlesSlice[i - 1]) {
        const prev = visibleCandlesSlice[i - 1];
        if (prev.session !== c?.session) {
          const boundaryX = x - halfW;
          ctx.beginPath();
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.moveTo(boundaryX, 0);
          ctx.lineTo(boundaryX, plotHeight);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Determine min and max
    let minVal = -0.05;
    let maxVal = 0.05;

    for (const pt of visibleMacd) {
      if (!pt) continue;
      if (pt.macd < minVal) minVal = pt.macd;
      if (pt.macd > maxVal) maxVal = pt.macd;
      if (pt.signal < minVal) minVal = pt.signal;
      if (pt.signal > maxVal) maxVal = pt.signal;
      if (pt.histogram < minVal) minVal = pt.histogram;
      if (pt.histogram > maxVal) maxVal = pt.histogram;
    }

    const range = Math.max(0.04, maxVal - minVal);
    const bufferedMin = minVal - range * 0.1;
    const bufferedMax = maxVal + range * 0.1;
    const bufferedRange = bufferedMax - bufferedMin;

    const valToY = (val: number) => {
      return plotHeight - ((val - bufferedMin) / bufferedRange) * plotHeight;
    };
    const zeroY = valToY(0);

    // 1. Draw Zero Reference Line & Y Grid Lines
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.moveTo(0, zeroY);
    ctx.lineTo(plotWidth, zeroY);
    ctx.stroke();

    // Y Axis Ticks
    const steps = 4;
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= steps; i++) {
      const val = bufferedMin + (bufferedRange / steps) * i;
      const y = valToY(val);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, y);
      ctx.lineTo(plotWidth, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.fillText(val.toFixed(2), plotWidth + 6, y);
    }

    // 2. Draw Bicolor Histogram Bars (Modern / Momentum-Based)
    // Most modern platforms color-code bars based on whether the current bar is higher or lower than the previous bar:
    // - Darker/Bright Green: Bullish momentum accelerating upward (pt.histogram >= 0 && pt.histogram >= prevHist)
    // - Lighter/Faded Green: Bullish momentum slowing down (pt.histogram >= 0 && pt.histogram < prevHist)
    // - Darker/Bright Red: Bearish momentum accelerating downward (pt.histogram < 0 && pt.histogram <= prevHist)
    // - Lighter/Faded Red: Bearish momentum slowing down (pt.histogram < 0 && pt.histogram > prevHist)
    const barWidth = Math.max(1, candleWidth * 0.70);

    for (let i = 0; i < visibleMacd.length; i++) {
      const pt = visibleMacd[i];
      if (!pt) continue;

      // Find previous histogram value across the boundary
      const prevPt = i > 0 
        ? visibleMacd[i - 1] 
        : (effStart > 0 && macdData[effStart - 1] ? macdData[effStart - 1] : null);
      const prevHist = prevPt ? prevPt.histogram : 0;

      const x = i * candleWidth + candleWidth / 2;
      const histY = valToY(pt.histogram);
      const barH = Math.max(1, Math.abs(histY - zeroY));

      let fillColor: string;
      let strokeColor: string | null = null;

      if (pt.histogram >= 0) {
        if (pt.histogram >= prevHist) {
          // Darker/Bright Green (Growing Positive): Bullish momentum is accelerating upward
          fillColor = '#22c55e';
        } else {
          // Lighter/Faded Green (Shrinking Positive): Bullish momentum is slowing down
          fillColor = 'rgba(74, 222, 128, 0.40)';
          strokeColor = 'rgba(74, 222, 128, 0.75)';
        }
      } else {
        if (pt.histogram <= prevHist) {
          // Darker/Bright Red (Growing Negative): Bearish momentum is accelerating downward
          fillColor = '#ef4444';
        } else {
          // Lighter/Faded Red (Shrinking Negative): Bearish momentum is slowing down
          fillColor = 'rgba(248, 113, 113, 0.40)';
          strokeColor = 'rgba(248, 113, 113, 0.75)';
        }
      }

      const barTop = pt.histogram >= 0 ? histY : zeroY;
      ctx.fillStyle = fillColor;
      ctx.fillRect(x - barWidth / 2, barTop, barWidth, barH);

      // Add a crisp contour line for faded bars when wide enough
      if (strokeColor && barWidth >= 3 && barH >= 3) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x - barWidth / 2, barTop, barWidth, barH);
      }
    }

    // 3. Draw MACD Fast Line (Orange)
    ctx.beginPath();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    let firstMacd = true;

    for (let i = 0; i < visibleMacd.length; i++) {
      const pt = visibleMacd[i];
      if (!pt) continue;
      const x = i * candleWidth + candleWidth / 2;
      const y = valToY(pt.macd);
      if (firstMacd) {
        ctx.moveTo(x, y);
        firstMacd = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 4. Draw Signal Line (Purple / Blue)
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    let firstSignal = true;

    for (let i = 0; i < visibleMacd.length; i++) {
      const pt = visibleMacd[i];
      if (!pt) continue;
      const x = i * candleWidth + candleWidth / 2;
      const y = valToY(pt.signal);
      if (firstSignal) {
        ctx.moveTo(x, y);
        firstSignal = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 5. Draw Vertical Crosshair if hovered
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < visibleMacd.length) {
      const hoverX = hoverIndex * candleWidth + candleWidth / 2;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 6. Last point badge on right axis
    const activePoint = (hoverIndex !== null && visibleMacd[hoverIndex]) 
      ? visibleMacd[hoverIndex] 
      : visibleMacd[visibleMacd.length - 1];

    if (activePoint) {
      const lastY = valToY(activePoint.macd);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(plotWidth, Math.max(0, Math.min(plotHeight - 16, lastY - 8)), rightAxisWidth, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(activePoint.macd.toFixed(4), plotWidth + rightAxisWidth / 2, Math.max(8, Math.min(plotHeight - 8, lastY)));
    }

  }, [visibleMacd, visibleCandlesSlice, effStart, macdData, hoverIndex]);

  // Handle Resize via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      renderMacd();
    });
    ro.observe(container);

    const handleWindowResize = () => {
      renderMacd();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [renderMacd]);

  useEffect(() => {
    renderMacd();
  }, [renderMacd]);

  // Active point for legend readout (hovered point or latest point)
  const activeIdx = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < visibleMacd.length 
    ? hoverIndex 
    : visibleMacd.length - 1;

  const displayPt = visibleMacd[activeIdx];
  const prevDisplayPt = activeIdx > 0 
    ? visibleMacd[activeIdx - 1] 
    : (effStart > 0 && macdData[effStart - 1] ? macdData[effStart - 1] : null);

  const curHist = displayPt ? displayPt.histogram : 0;
  const prevHistVal = prevDisplayPt ? prevDisplayPt.histogram : 0;

  let histColor = '#22c55e';
  let histLabel = 'ACCEL ▲';
  let histBg = 'rgba(34, 197, 94, 0.18)';

  if (curHist >= 0) {
    if (curHist >= prevHistVal) {
      histColor = '#22c55e'; // Bright Green (Growing Positive)
      histLabel = 'GROWING ▲';
      histBg = 'rgba(34, 197, 94, 0.22)';
    } else {
      histColor = '#86efac'; // Faded Green (Shrinking Positive)
      histLabel = 'SLOWING △';
      histBg = 'rgba(134, 239, 172, 0.15)';
    }
  } else {
    if (curHist <= prevHistVal) {
      histColor = '#ef4444'; // Bright Red (Growing Negative)
      histLabel = 'GROWING ▼';
      histBg = 'rgba(239, 68, 68, 0.22)';
    } else {
      histColor = '#fca5a5'; // Faded Red (Shrinking Negative)
      histLabel = 'SLOWING ▽';
      histBg = 'rgba(252, 165, 165, 0.15)';
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const container = containerRef.current;
    if (!container || visibleMacd.length === 0) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const plotWidth = rect.width - rightAxisWidth;
    if (mouseX >= 0 && mouseX <= plotWidth) {
      const candleWidth = plotWidth / visibleMacd.length;
      const idx = Math.max(0, Math.min(visibleMacd.length - 1, Math.floor(mouseX / candleWidth)));
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div ref={containerRef} className="relative w-full h-[110px] bg-[#0a0e16] border-t border-[#1a2333] select-none">
      {/* Modern Bicolor MACD Header readout */}
      <div className="absolute top-1.5 left-3 flex items-center gap-2.5 text-[10px] font-mono z-10 bg-[#0c121d]/90 px-2.5 py-0.5 rounded border border-[#1e2a3d] backdrop-blur-xs shadow-xs">
        <span className="text-slate-300 font-bold tracking-tight">MACD (12, 26, 9)</span>
        
        {/* Bicolor Momentum Histogram Readout with Accelerating/Decelerating Tag */}
        <div className="flex items-center gap-1 font-semibold" style={{ color: histColor }}>
          <span className="text-[9px] text-slate-400 font-normal">Hist:</span>
          <span>{displayPt ? (curHist >= 0 ? '+' : '') + curHist.toFixed(4) : '0.0000'}</span>
          <span 
            className="text-[8px] px-1 py-0.2 rounded font-mono font-bold tracking-tight"
            style={{ backgroundColor: histBg, color: histColor }}
            title={
              curHist >= 0 
                ? (curHist >= prevHistVal ? 'Growing Positive: Bullish momentum accelerating upward' : 'Shrinking Positive: Bullish momentum slowing down')
                : (curHist <= prevHistVal ? 'Growing Negative: Bearish momentum accelerating downward' : 'Shrinking Negative: Bearish momentum slowing down')
            }
          >
            {histLabel}
          </span>
        </div>

        {/* Fast MACD Line */}
        <div className="flex items-center gap-1 text-[#f97316]">
          <span className="text-[9px] text-slate-400 font-normal">MACD:</span>
          <span>{displayPt ? displayPt.macd.toFixed(4) : '0.0000'}</span>
        </div>

        {/* Signal Line */}
        <div className="flex items-center gap-1 text-[#38bdf8]">
          <span className="text-[9px] text-slate-400 font-normal">Signal:</span>
          <span>{displayPt ? displayPt.signal.toFixed(4) : '0.0000'}</span>
        </div>
      </div>

      <canvas 
        ref={canvasRef} 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="block w-full h-full cursor-crosshair" 
      />
    </div>
  );
};
