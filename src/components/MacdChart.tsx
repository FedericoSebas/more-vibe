import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Candle, MacdPoint } from '../types/stock';
import { calculateMACD } from '../utils/stockData';

interface MacdChartProps {
  candles: Candle[];
  zoomLevel: number;
}

export const MacdChart: React.FC<MacdChartProps> = ({ candles, zoomLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const macdData = useMemo(() => calculateMACD(candles, 12, 26, 9), [candles]);

  const defaultVisibleBars = Math.max(10, Math.min(candles.length || 360, Math.round(90 / zoomLevel)));
  const startIndex = Math.max(0, candles.length - defaultVisibleBars);
  const visibleMacd = useMemo(() => macdData.slice(startIndex), [macdData, startIndex]);

  const rightAxisWidth = 64;

  const renderMacd = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const plotWidth = width - rightAxisWidth;
    const plotHeight = height;

    // Clear background
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, width, height);

    if (visibleMacd.length === 0) return;

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

    const candleWidth = plotWidth / visibleMacd.length;
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

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      renderMacd();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
