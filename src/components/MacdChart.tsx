import React, { useRef, useEffect, useMemo, useCallback } from 'react';
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

    // Extended Hours Session Shading (perfect vertical match with StockChart)
    // Colors: Pre-market (Orange), After-market (Blue), Overnight (Purple) with opacity >= 8% (0.12)
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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
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

    // 2. Draw Histogram Bars
    const barWidth = Math.max(1, candleWidth * 0.65);
    for (let i = 0; i < visibleMacd.length; i++) {
      const pt = visibleMacd[i];
      if (!pt) continue;
      const x = i * candleWidth + candleWidth / 2;
      const histY = valToY(pt.histogram);
      const barH = Math.abs(histY - zeroY);

      if (pt.histogram >= 0) {
        // Bright cyan for positive
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x - barWidth / 2, histY, barWidth, Math.max(1, barH));
      } else {
        // Deeper blue for negative
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(x - barWidth / 2, zeroY, barWidth, Math.max(1, barH));
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

    // 4. Draw Signal Line (Red)
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
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

    // 5. Last point badge on right axis
    const lastPt = visibleMacd[visibleMacd.length - 1];
    if (lastPt) {
      const lastY = valToY(lastPt.macd);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(plotWidth, lastY - 8, rightAxisWidth, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lastPt.macd.toFixed(2), plotWidth + rightAxisWidth / 2, lastY);
    }

  }, [visibleMacd]);

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

  const lastPt = visibleMacd[visibleMacd.length - 1];

  return (
    <div ref={containerRef} className="relative w-full h-[110px] bg-[#0a0e16] border-t border-[#1a2333] select-none">
      {/* MACD Header readout: MACD 12,26,9  0.00  -0.01  -0.01 */}
      <div className="absolute top-1.5 left-3 flex items-center gap-3 text-[10px] font-mono z-10">
        <span className="text-slate-300 font-semibold">MACD 12,26,9</span>
        <span className="text-[#38bdf8]">
          {lastPt ? lastPt.histogram.toFixed(2) : '0.00'}
        </span>
        <span className="text-[#f97316]">
          {lastPt ? lastPt.macd.toFixed(2) : '-0.01'}
        </span>
        <span className="text-[#ef4444]">
          {lastPt ? lastPt.signal.toFixed(2) : '-0.01'}
        </span>
      </div>

      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
