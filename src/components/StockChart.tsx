import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Candle, 
  StockQuote, 
  DrawingTool, 
  DrawnObject, 
  IndicatorVisibility, 
  ChartType,
  VolumeProfileLevel,
  Timeframe 
} from '../types/stock';
import { 
  calculateEMA, 
  calculateSMA, 
  calculateVWAP, 
  calculateVolumeProfile,
  formatCompactVolume 
} from '../utils/stockData';

interface StockChartProps {
  candles: Candle[];
  stock: StockQuote;
  activeTool: DrawingTool;
  indicators: IndicatorVisibility;
  chartType: ChartType;
  magnetMode: boolean;
  drawings: DrawnObject[];
  onAddDrawing: (drawing: DrawnObject) => void;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  timeframe: Timeframe;
}

type DragMode = 'none' | 'pan-chart' | 'scale-price' | 'scale-time';

export const StockChart: React.FC<StockChartProps> = ({
  candles,
  stock,
  activeTool,
  indicators,
  chartType,
  magnetMode,
  drawings,
  onAddDrawing,
  zoomLevel,
  onZoomChange,
  timeframe
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Time & Price pan offsets
  const [panOffset, setPanOffset] = useState<number>(20);
  const [verticalPanOffset, setVerticalPanOffset] = useState<number>(0);
  // Price stretch / contract factor (1.0 = auto-fit, <1 = stretched, >1 = contracted)
  const [priceScaleFactor, setPriceScaleFactor] = useState<number>(1.0);
  // Invert drag direction (default true as requested: mouse left -> chart right)
  const [invertDrag, setInvertDrag] = useState<boolean>(true);

  // Drag interaction state
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startPanOffset, setStartPanOffset] = useState<number>(0);
  const [startVerticalPan, setStartVerticalPan] = useState<number>(0);
  const [startPriceScale, setStartPriceScale] = useState<number>(1.0);
  const [startZoom, setStartZoom] = useState<number>(1.0);

  // Mouse / Crosshair state
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverCandle, setHoverCandle] = useState<Candle | null>(null);
  const [cursorStyle, setCursorStyle] = useState<string>('crosshair');

  // Drawing in progress
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<{ x: number; y: number; price: number; time: number }[]>([]);

  // Indicators calculation
  const ema9Data = useMemo(() => calculateEMA(candles, 9), [candles]);
  const sma20Data = useMemo(() => calculateSMA(candles, 20), [candles]);
  const sma200Data = useMemo(() => calculateSMA(candles, 200), [candles]);
  const vwapData = useMemo(() => calculateVWAP(candles), [candles]);
  const volumeProfileData = useMemo(() => calculateVolumeProfile(candles, 45), [candles]);

  // Layout metrics
  const rightAxisWidth = 66;
  const bottomAxisHeight = 26;

  // Viewport calculation
  const defaultVisibleBars = Math.max(25, Math.min(220, Math.round(90 / zoomLevel)));
  const totalCandles = candles.length;
  
  // Constrain pan offset
  const maxPan = Math.max(0, totalCandles - defaultVisibleBars);
  const effectivePan = Math.max(0, Math.min(maxPan, panOffset));
  const startIndex = Math.max(0, totalCandles - defaultVisibleBars - effectivePan);
  const endIndex = Math.min(totalCandles, startIndex + defaultVisibleBars);

  const visibleCandles = useMemo(() => candles.slice(startIndex, endIndex), [candles, startIndex, endIndex]);

  // Reset to Auto-Scale
  const handleResetAutoScale = useCallback(() => {
    setPriceScaleFactor(1.0);
    setVerticalPanOffset(0);
    setPanOffset(20);
    onZoomChange(1.0);
  }, [onZoomChange]);

  // Render chart onto Canvas
  const renderChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const plotWidth = width - rightAxisWidth;
    const plotHeight = height - bottomAxisHeight;
    const volumeHeight = plotHeight * 0.16;
    const pricePlotHeight = plotHeight - volumeHeight;

    // Clear background (deep dark charcoal matching reference image)
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, width, height);

    if (visibleCandles.length === 0) return;

    // 1. Calculate natural price min and max
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    for (const c of visibleCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }

    if (minPrice === maxPrice || minPrice === Infinity) {
      minPrice = stock.price * 0.95;
      maxPrice = stock.price * 1.05;
    }

    // Apply price scale stretching & vertical pan
    const rawRange = Math.max(0.02, maxPrice - minPrice);
    const naturalCenter = (minPrice + maxPrice) / 2;
    const effectiveCenter = naturalCenter + verticalPanOffset;
    const halfSpan = (rawRange * 0.56) * priceScaleFactor;

    const bufferedMin = Math.max(0.01, effectiveCenter - halfSpan);
    const bufferedMax = effectiveCenter + halfSpan;
    const bufferedRange = bufferedMax - bufferedMin;

    const candleWidth = plotWidth / visibleCandles.length;
    const bodyWidth = Math.max(1, candleWidth * 0.72);

    // Coordinate mapping helpers
    const priceToY = (price: number) => {
      return pricePlotHeight - ((price - bufferedMin) / bufferedRange) * pricePlotHeight;
    };

    const yToPrice = (y: number) => {
      return bufferedMax - (y / pricePlotHeight) * bufferedRange;
    };

    const indexToX = (idx: number) => {
      return idx * candleWidth + candleWidth / 2;
    };

    // 2. Draw Axis Backgrounds
    // Right Y-axis background
    const isOverYAxis = hoverPos && hoverPos.x >= plotWidth && hoverPos.y < plotHeight;
    const isDraggingY = dragMode === 'scale-price';
    ctx.fillStyle = isDraggingY ? '#141d2c' : isOverYAxis ? '#111724' : '#0c1018';
    ctx.fillRect(plotWidth, 0, rightAxisWidth, plotHeight);

    // Bottom X-axis background
    const isOverXAxis = hoverPos && hoverPos.y >= plotHeight && hoverPos.x < plotWidth;
    const isDraggingX = dragMode === 'scale-time';
    ctx.fillStyle = isDraggingX ? '#141d2c' : isOverXAxis ? '#111724' : '#0c1018';
    ctx.fillRect(0, plotHeight, plotWidth, bottomAxisHeight);

    // Corner box (Auto scale button area)
    ctx.fillStyle = '#0e131d';
    ctx.fillRect(plotWidth, plotHeight, rightAxisWidth, bottomAxisHeight);

    // Axis separator border lines
    ctx.strokeStyle = isDraggingY || isOverYAxis ? '#38bdf8' : '#1a2333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotWidth, 0);
    ctx.lineTo(plotWidth, height);
    ctx.stroke();

    ctx.strokeStyle = isDraggingX || isOverXAxis ? '#38bdf8' : '#1a2333';
    ctx.beginPath();
    ctx.moveTo(0, plotHeight);
    ctx.lineTo(width, plotHeight);
    ctx.stroke();

    // 3. Draw Horizontal Grid Lines & Price Labels
    const gridSteps = 8;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridSteps; i++) {
      const price = bufferedMin + (bufferedRange / gridSteps) * i;
      const y = priceToY(price);

      // Horizontal dashed line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, y);
      ctx.lineTo(plotWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label on right axis
      ctx.fillStyle = isOverYAxis || isDraggingY ? '#94a3b8' : '#64748b';
      ctx.fillText(price.toFixed(2), plotWidth + 6, y);
    }

    // 4. Draw Vertical Grid Lines & Time Labels
    const timeStep = Math.max(1, Math.floor(visibleCandles.length / 8));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < visibleCandles.length; i += timeStep) {
      const x = indexToX(i);
      const c = visibleCandles[i];

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = isOverXAxis || isDraggingX ? '#94a3b8' : '#64748b';
      ctx.fillText(c.timeStr, x, plotHeight + 7);
    }

    // 5. Draw Volume Profile on Left Side (VP 50)
    if (indicators.volumeProfile && volumeProfileData.length > 0) {
      let maxProfileVol = 0;
      let pocPrice = 0;
      let maxPocVol = 0;

      for (const level of volumeProfileData) {
        if (level.totalVolume > maxProfileVol) maxProfileVol = level.totalVolume;
        if (level.totalVolume > maxPocVol) {
          maxPocVol = level.totalVolume;
          pocPrice = level.price;
        }
      }

      const profileMaxWidth = plotWidth * 0.28;

      for (const level of volumeProfileData) {
        if (level.price < bufferedMin || level.price > bufferedMax) continue;
        const y = priceToY(level.price);
        const barHeight = Math.max(2, (pricePlotHeight / volumeProfileData.length) * 0.9);
        const buyW = (level.buyVolume / maxProfileVol) * profileMaxWidth;
        const sellW = (level.sellVolume / maxProfileVol) * profileMaxWidth;

        // Buy volume bar (dark green)
        ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
        ctx.fillRect(0, y - barHeight / 2, buyW, barHeight);

        // Sell volume bar (dark red/brown)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(buyW, y - barHeight / 2, sellW, barHeight);
      }

      // Point of Control (POC) Line
      const pocY = priceToY(pocPrice);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(0, pocY);
      ctx.lineTo(profileMaxWidth + 40, pocY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 6. Draw Volume Bars at Bottom of price pane
    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      const x = indexToX(i);
      const isUp = c.close >= c.open;
      const volBarH = (c.volume / (maxVol || 1)) * (volumeHeight - 8);
      const volY = plotHeight - volBarH;

      ctx.fillStyle = isUp ? 'rgba(34, 197, 94, 0.45)' : 'rgba(239, 68, 68, 0.45)';
      ctx.fillRect(x - bodyWidth / 2, volY, bodyWidth, volBarH);
    }

    // 7. Draw Candlesticks or Lines
    if (chartType === 'line' || chartType === 'area') {
      ctx.beginPath();
      ctx.moveTo(indexToX(0), priceToY(visibleCandles[0].close));
      for (let i = 1; i < visibleCandles.length; i++) {
        ctx.lineTo(indexToX(i), priceToY(visibleCandles[i].close));
      }

      if (chartType === 'area') {
        ctx.lineTo(indexToX(visibleCandles.length - 1), pricePlotHeight);
        ctx.lineTo(indexToX(0), pricePlotHeight);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, pricePlotHeight);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.3)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(indexToX(0), priceToY(visibleCandles[0].close));
      for (let i = 1; i < visibleCandles.length; i++) {
        ctx.lineTo(indexToX(i), priceToY(visibleCandles[i].close));
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      for (let i = 0; i < visibleCandles.length; i++) {
        const c = visibleCandles[i];
        const x = indexToX(i);
        const isUp = c.close >= c.open;

        const openY = priceToY(c.open);
        const closeY = priceToY(c.close);
        const highY = priceToY(c.high);
        const lowY = priceToY(c.low);

        const candleTop = Math.min(openY, closeY);
        const candleHeight = Math.max(1.5, Math.abs(closeY - openY));
        const candleColor = isUp ? '#22c55e' : '#ef4444';

        // Draw Wick
        ctx.beginPath();
        ctx.strokeStyle = candleColor;
        ctx.lineWidth = 1;
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Draw Body
        ctx.fillStyle = candleColor;
        if (chartType === 'hollow' && isUp) {
          ctx.strokeStyle = candleColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(x - bodyWidth / 2, candleTop, bodyWidth, candleHeight);
        } else {
          ctx.fillRect(x - bodyWidth / 2, candleTop, bodyWidth, candleHeight);
        }
      }
    }

    // 8. Draw Technical Indicators (EMA 9, SMA 20, SMA 200, VWAP)
    const drawLineIndicator = (data: (number | null)[], color: string, width = 1.5) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      let first = true;

      for (let i = 0; i < visibleCandles.length; i++) {
        const globalIdx = startIndex + i;
        const val = data[globalIdx];
        if (val !== null && val >= bufferedMin && val <= bufferedMax) {
          const x = indexToX(i);
          const y = priceToY(val);
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    };

    if (indicators.ema9) drawLineIndicator(ema9Data, '#eab308', 1.8);
    if (indicators.sma20) drawLineIndicator(sma20Data, '#3b82f6', 1.8);
    if (indicators.sma200) drawLineIndicator(sma200Data, '#a855f7', 1.8);
    if (indicators.vwap) drawLineIndicator(vwapData, '#e2e8f0', 1.5);

    // 9. Draw Live Price Line & Y-Axis Tag
    const liveY = priceToY(stock.price);
    if (liveY >= 0 && liveY <= plotHeight) {
      ctx.beginPath();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(0, liveY);
      ctx.lineTo(plotWidth, liveY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Live price tag badge on right axis
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(plotWidth, liveY - 10, rightAxisWidth, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stock.price.toFixed(2), plotWidth + rightAxisWidth / 2, liveY);
    }

    // EMA indicator tag on right axis if enabled
    if (indicators.ema9 && ema9Data[candles.length - 1] !== null) {
      const lastEma = ema9Data[candles.length - 1] as number;
      const emaY = priceToY(lastEma);
      if (emaY >= 0 && emaY <= plotHeight) {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(plotWidth, emaY - 8, rightAxisWidth - 10, 16);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lastEma.toFixed(2), plotWidth + (rightAxisWidth - 10) / 2, emaY);
      }
    }

    // 10. Draw Saved Drawings (Trendlines, Horizontal Lines, Fib, Ruler)
    for (const d of drawings) {
      ctx.strokeStyle = d.color;
      ctx.fillStyle = d.color;
      ctx.lineWidth = 1.5;

      if (d.type === 'trendline' && d.points.length >= 2) {
        const p1 = d.points[0];
        const p2 = d.points[1];
        const x1 = indexToX(p1.time);
        const y1 = priceToY(p1.price);
        const x2 = indexToX(p2.time);
        const y2 = priceToY(p2.price);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x1, y1, 3, 0, Math.PI * 2);
        ctx.arc(x2, y2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.type === 'horizontal' && d.points.length >= 1) {
        const y = priceToY(d.points[0].price);
        ctx.beginPath();
        ctx.setLineDash([4, 2]);
        ctx.moveTo(0, y);
        ctx.lineTo(plotWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = d.color;
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`L: ${d.points[0].price.toFixed(2)}`, 10, y - 4);
      } else if (d.type === 'fibonacci' && d.points.length >= 2) {
        const p1 = d.points[0];
        const p2 = d.points[1];
        const highP = Math.max(p1.price, p2.price);
        const lowP = Math.min(p1.price, p2.price);
        const diff = highP - lowP;

        const fibRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
        fibRatios.forEach(r => {
          const fibPrice = lowP + diff * r;
          const fibY = priceToY(fibPrice);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(56, 189, 248, ${r === 0.5 || r === 0.618 ? 0.8 : 0.4})`;
          ctx.setLineDash([3, 3]);
          ctx.moveTo(0, fibY);
          ctx.lineTo(plotWidth, fibY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#38bdf8';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(`${(r * 100).toFixed(1)}% ($${fibPrice.toFixed(2)})`, plotWidth - 110, fibY - 3);
        });
      } else if (d.type === 'ruler' && d.points.length >= 2) {
        const p1 = d.points[0];
        const p2 = d.points[1];
        const x1 = indexToX(p1.time);
        const y1 = priceToY(p1.price);
        const x2 = indexToX(p2.time);
        const y2 = priceToY(p2.price);

        const deltaPrice = p2.price - p1.price;
        const deltaPct = (deltaPrice / p1.price) * 100;
        const barsCount = Math.abs(p2.time - p1.time);

        ctx.fillStyle = deltaPrice >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));

        ctx.strokeStyle = deltaPrice >= 0 ? '#22c55e' : '#ef4444';
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x2 + 4, y2 - 14, 110, 28);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${deltaPrice >= 0 ? '+' : ''}${deltaPrice.toFixed(2)} (${deltaPct.toFixed(2)}%)`, x2 + 8, y2 - 2);
        ctx.fillText(`${barsCount} bars`, x2 + 8, y2 + 10);
      }
    }

    // 11. Draw Interactive Crosshair & Cursor HUD
    if (hoverPos && hoverPos.x < plotWidth && hoverPos.y < plotHeight) {
      const cursorPrice = yToPrice(hoverPos.y);

      // Vertical dashed line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(hoverPos.x, 0);
      ctx.lineTo(hoverPos.x, plotHeight);
      ctx.stroke();

      // Horizontal dashed line
      ctx.beginPath();
      ctx.moveTo(0, hoverPos.y);
      ctx.lineTo(plotWidth, hoverPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right axis price badge for crosshair
      ctx.fillStyle = '#334155';
      ctx.fillRect(plotWidth, hoverPos.y - 9, rightAxisWidth, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cursorPrice.toFixed(2), plotWidth + rightAxisWidth / 2, hoverPos.y);

      // Bottom axis time badge for crosshair
      const candleIdx = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor(hoverPos.x / candleWidth)));
      const hovered = visibleCandles[candleIdx];
      if (hovered) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(hoverPos.x - 30, plotHeight, 60, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(hovered.timeStr, hoverPos.x, plotHeight + 9);
      }
    }

    // 12. Draw "AUTO" button at the bottom-right corner
    const isCustomScale = priceScaleFactor !== 1.0 || verticalPanOffset !== 0 || zoomLevel !== 1.0 || panOffset !== 0;
    const isOverAuto = hoverPos && hoverPos.x >= plotWidth && hoverPos.y >= plotHeight;

    ctx.fillStyle = isOverAuto ? '#1e293b' : isCustomScale ? '#172554' : '#111827';
    ctx.fillRect(plotWidth + 4, plotHeight + 3, rightAxisWidth - 8, bottomAxisHeight - 6);
    ctx.strokeStyle = isCustomScale ? '#38bdf8' : '#232f46';
    ctx.strokeRect(plotWidth + 4, plotHeight + 3, rightAxisWidth - 8, bottomAxisHeight - 6);

    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isCustomScale ? '#38bdf8' : '#64748b';
    ctx.fillText('AUTO', plotWidth + rightAxisWidth / 2, plotHeight + bottomAxisHeight / 2);

    // 13. Top Chart HUD Metrics
    const activeCandle = hoverCandle || visibleCandles[visibleCandles.length - 1];
    if (activeCandle) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = '11px "JetBrains Mono", monospace';

      ctx.fillStyle = '#94a3b8';
      let hudX = 12;
      const hudY = 8;

      const dObj = new Date(activeCandle.time);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let hudTime = '';
      if (timeframe === 'D') {
        hudTime = `${months[dObj.getMonth()]} ${dObj.getDate().toString().padStart(2, '0')}, ${dObj.getFullYear()}`;
      } else {
        const hours = dObj.getHours().toString().padStart(2, '0');
        const mins = dObj.getMinutes().toString().padStart(2, '0');
        hudTime = `${months[dObj.getMonth()]} ${dObj.getDate().toString().padStart(2, '0')} ${hours}:${mins}`;
      }
      const timeTag = `${hudTime} [${timeframe}]`;
      ctx.fillText(timeTag, hudX, hudY);
      hudX += Math.max(140, Math.round(ctx.measureText(timeTag).width + 12));

      ctx.fillStyle = '#22c55e';
      ctx.fillText(`O`, hudX, hudY);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(` ${activeCandle.open.toFixed(2)}`, hudX + 10, hudY);
      hudX += 55;

      ctx.fillStyle = '#22c55e';
      ctx.fillText(`H`, hudX, hudY);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(` ${activeCandle.high.toFixed(2)}`, hudX + 10, hudY);
      hudX += 55;

      ctx.fillStyle = '#ef4444';
      ctx.fillText(`L`, hudX, hudY);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(` ${activeCandle.low.toFixed(2)}`, hudX + 10, hudY);
      hudX += 55;

      ctx.fillStyle = '#22c55e';
      ctx.fillText(`C`, hudX, hudY);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(` ${activeCandle.close.toFixed(2)}`, hudX + 10, hudY);
      hudX += 55;

      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Vol `, hudX, hudY);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`${(activeCandle.volume / 1000).toFixed(2)}K`, hudX + 28, hudY);
      hudX += 85;

      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Vol(d) `, hudX, hudY);
      ctx.fillStyle = '#22c55e';
      ctx.fillText(formatCompactVolume(stock.volume), hudX + 45, hudY);

      // Row 2: Indicators readout
      const hudY2 = hudY + 16;
      let indX = 12;

      if (indicators.ema9) {
        ctx.fillStyle = '#eab308';
        const lastVal = ema9Data[candles.length - 1] ?? 4.33;
        ctx.fillText(`EMA 9 · ${Number(lastVal).toFixed(2)}`, indX, hudY2);
        indX += 100;
      }

      if (indicators.sma20) {
        ctx.fillStyle = '#3b82f6';
        const lastVal = sma20Data[candles.length - 1] ?? 4.32;
        ctx.fillText(`SMA 20 · ${Number(lastVal).toFixed(2)}`, indX, hudY2);
        indX += 105;
      }

      if (indicators.sma200) {
        ctx.fillStyle = '#a855f7';
        const lastVal = sma200Data[candles.length - 1] ?? 4.03;
        ctx.fillText(`SMA 200 · ${Number(lastVal).toFixed(2)}`, indX, hudY2);
        indX += 115;
      }

      if (indicators.vwap) {
        ctx.fillStyle = '#cbd5e1';
        const lastVal = vwapData[candles.length - 1] ?? 4.26;
        ctx.fillText(`VWAP · ${Number(lastVal).toFixed(2)}`, indX, hudY2);
        indX += 95;
      }

      if (indicators.volumeProfile) {
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`VP 50`, indX, hudY2);
      }
    }

    // 14. Helper tooltip overlay when dragging price or time scale
    if (dragMode === 'scale-price') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(plotWidth - 140, 20, 130, 24);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(plotWidth - 140, 20, 130, 24);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Price: ${(100 / priceScaleFactor).toFixed(0)}%`, plotWidth - 75, 32);
    } else if (dragMode === 'scale-time') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(plotWidth / 2 - 65, plotHeight - 34, 130, 24);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(plotWidth / 2 - 65, plotHeight - 34, 130, 24);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Time: ${(zoomLevel * 100).toFixed(0)}%`, plotWidth / 2, plotHeight - 22);
    }

  }, [
    visibleCandles, 
    indicators, 
    stock, 
    hoverPos, 
    hoverCandle, 
    chartType, 
    drawings, 
    ema9Data, 
    sma20Data, 
    sma200Data, 
    vwapData, 
    volumeProfileData, 
    startIndex,
    priceScaleFactor,
    verticalPanOffset,
    zoomLevel,
    dragMode,
    panOffset
  ]);

  // Handle Resize & Canvas Scaling
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
      renderChart();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderChart]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  // Determine cursor based on position and active drag/tool
  const updateCursor = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const plotWidth = rect.width - rightAxisWidth;
    const plotHeight = rect.height - bottomAxisHeight;

    if (dragMode === 'pan-chart') {
      setCursorStyle('grabbing');
      return;
    }
    if (dragMode === 'scale-price') {
      setCursorStyle('ns-resize');
      return;
    }
    if (dragMode === 'scale-time') {
      setCursorStyle('ew-resize');
      return;
    }

    // Auto button corner
    if (x >= plotWidth && y >= plotHeight) {
      setCursorStyle('pointer');
      return;
    }

    // Right Y-axis
    if (x >= plotWidth && y < plotHeight) {
      setCursorStyle('ns-resize');
      return;
    }

    // Bottom X-axis
    if (y >= plotHeight && x < plotWidth) {
      setCursorStyle('ew-resize');
      return;
    }

    // Main chart canvas
    if (activeTool === 'pan') {
      setCursorStyle('grab');
    } else {
      setCursorStyle('crosshair');
    }
  };

  // Mouse Down Event Handler
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const plotWidth = rect.width - rightAxisWidth;
    const plotHeight = rect.height - bottomAxisHeight;

    // Check Auto button click
    if (x >= plotWidth && y >= plotHeight) {
      handleResetAutoScale();
      return;
    }

    // Check Right Y-Axis drag (stretch/contract price)
    if (x >= plotWidth && y < plotHeight) {
      setDragMode('scale-price');
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setStartPriceScale(priceScaleFactor);
      setCursorStyle('ns-resize');
      return;
    }

    // Check Bottom X-Axis drag (stretch/contract time)
    if (y >= plotHeight && x < plotWidth) {
      setDragMode('scale-time');
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setStartZoom(zoomLevel);
      setCursorStyle('ew-resize');
      return;
    }

    // Drawings in progress
    if (activeTool && activeTool !== 'crosshair' && activeTool !== 'pan') {
      const candleWidth = plotWidth / visibleCandles.length;
      let candleIdx = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor(x / candleWidth)));
      const targetCandle = visibleCandles[candleIdx];

      // Calculate price from Y
      let minP = Infinity, maxP = -Infinity;
      for (const c of visibleCandles) {
        if (c.low < minP) minP = c.low;
        if (c.high > maxP) maxP = c.high;
      }
      const rawRange = Math.max(0.02, maxP - minP);
      const effectiveCenter = ((minP + maxP) / 2) + verticalPanOffset;
      const halfSpan = (rawRange * 0.56) * priceScaleFactor;
      const bMin = Math.max(0.01, effectiveCenter - halfSpan);
      const bMax = effectiveCenter + halfSpan;
      let targetPrice = bMax - (y / (plotHeight - plotHeight * 0.16)) * (bMax - bMin);

      // Magnet snap to wick
      if (magnetMode && targetCandle) {
        const distHigh = Math.abs(targetPrice - targetCandle.high);
        const distLow = Math.abs(targetPrice - targetCandle.low);
        targetPrice = distHigh < distLow ? targetCandle.high : targetCandle.low;
      }

      const newPoint = { x, y, price: targetPrice, time: candleIdx };

      if (activeTool === 'horizontal') {
        onAddDrawing({
          id: `h_${Date.now()}`,
          type: 'horizontal',
          points: [newPoint],
          color: '#38bdf8'
        });
      } else if (activeTool === 'trendline' || activeTool === 'fibonacci' || activeTool === 'ruler') {
        const nextPoints = [...currentDrawingPoints, newPoint];
        if (nextPoints.length === 2) {
          onAddDrawing({
            id: `d_${Date.now()}`,
            type: activeTool,
            points: nextPoints,
            color: activeTool === 'fibonacci' ? '#38bdf8' : activeTool === 'ruler' ? '#10b981' : '#f59e0b'
          });
          setCurrentDrawingPoints([]);
        } else {
          setCurrentDrawingPoints(nextPoints);
        }
      }
      return;
    }

    // Default Main Chart Pan Drag (both X and Y axis!)
    setDragMode('pan-chart');
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setStartPanOffset(panOffset);
    setStartVerticalPan(verticalPanOffset);
    setCursorStyle('grabbing');
  };

  // Mouse Move Event Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoverPos({ x, y });
    updateCursor(x, y);

    const plotWidth = rect.width - rightAxisWidth;
    const plotHeight = rect.height - bottomAxisHeight;

    if (x < plotWidth && y < plotHeight) {
      const candleWidth = plotWidth / visibleCandles.length;
      const candleIdx = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor(x / candleWidth)));
      setHoverCandle(visibleCandles[candleIdx] || null);
    } else {
      setHoverCandle(null);
    }

    // Dragging Right Price Axis: Vertical stretch/contract
    if (dragMode === 'scale-price') {
      const deltaY = e.clientY - dragStartPos.y;
      // Drag down = stretch (larger range / smaller factor), Drag up = contract
      const factor = Math.exp(deltaY * 0.007);
      const nextScale = Math.max(0.15, Math.min(6.0, startPriceScale * factor));
      setPriceScaleFactor(nextScale);
      return;
    }

    // Dragging Bottom Time Axis: Horizontal stretch/contract
    if (dragMode === 'scale-time') {
      const deltaX = e.clientX - dragStartPos.x;
      // Drag left = contract (more bars), Drag right = stretch (fewer bars / zoom in)
      const factor = Math.exp(-deltaX * 0.005);
      const nextZoom = Math.max(0.3, Math.min(4.5, startZoom * factor));
      onZoomChange(nextZoom);
      return;
    }

    // Dragging Main Chart: 2D Panning (X: time pan, Y: price pan)
    if (dragMode === 'pan-chart') {
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;

      const candleWidth = plotWidth / visibleCandles.length;
      const candleDelta = Math.round(deltaX / (candleWidth * 1.2));
      if (candleDelta !== 0) {
        // Invert horizontal drag: pushing mouse left (deltaX < 0) adds candleDelta to panOffset, moving chart to the right
        const nextPan = invertDrag 
          ? startPanOffset + candleDelta 
          : startPanOffset - candleDelta;
        setPanOffset(Math.max(0, Math.min(maxPan, nextPan)));
      }

      // Vertical price pan
      let minP = Infinity, maxP = -Infinity;
      for (const c of visibleCandles) {
        if (c.low < minP) minP = c.low;
        if (c.high > maxP) maxP = c.high;
      }
      const rawRange = Math.max(0.02, maxP - minP);
      const bufferedRange = rawRange * 1.12 * priceScaleFactor;
      const priceDelta = (deltaY / (plotHeight - plotHeight * 0.16)) * bufferedRange;
      
      // Invert vertical drag: pushing mouse upside (deltaY < 0) moves chart towards downside
      const nextVert = invertDrag
        ? startVerticalPan + priceDelta
        : startVerticalPan - priceDelta;
      setVerticalPanOffset(nextVert);
    }
  };

  // Mouse Up & Leave Handlers
  const handleMouseUp = () => {
    setDragMode('none');
    if (hoverPos) {
      updateCursor(hoverPos.x, hoverPos.y);
    }
  };

  const handleMouseLeave = () => {
    setDragMode('none');
    setHoverPos(null);
    setHoverCandle(null);
  };

  // Double Click Handler: Reset Auto Scale
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const plotWidth = rect.width - rightAxisWidth;
    const plotHeight = rect.height - bottomAxisHeight;

    // Double clicking Y-axis resets price scale
    if (x >= plotWidth) {
      setPriceScaleFactor(1.0);
      setVerticalPanOffset(0);
      return;
    }

    // Double clicking X-axis resets time scale
    if (y >= plotHeight) {
      onZoomChange(1.0);
      setPanOffset(0);
      return;
    }

    // Double clicking main chart resets both
    handleResetAutoScale();
  };

  // Wheel Zoom Handler: Context aware
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const plotWidth = rect.width - rightAxisWidth;

    // Wheel over price axis stretches/contracts price only
    if (x >= plotWidth) {
      if (e.deltaY < 0) {
        setPriceScaleFactor(prev => Math.max(0.15, prev * 0.9));
      } else {
        setPriceScaleFactor(prev => Math.min(6.0, prev * 1.1));
      }
      return;
    }

    // Wheel over main chart or time axis zooms time
    if (e.deltaY < 0) {
      onZoomChange(Math.min(4.5, zoomLevel * 1.15));
    } else {
      onZoomChange(Math.max(0.3, zoomLevel / 1.15));
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[300px] overflow-hidden bg-[#0a0e16] select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{ cursor: cursorStyle }}
        className="block touch-none"
      />

      {/* Floating Auto-Scale button overlay */}
      {(priceScaleFactor !== 1.0 || verticalPanOffset !== 0 || zoomLevel !== 1.0 || panOffset !== 20) && (
        <button
          onClick={handleResetAutoScale}
          className="absolute bottom-9 right-20 px-2.5 py-1 rounded bg-[#162235]/90 hover:bg-[#1f314d] text-sky-400 border border-sky-500/40 text-[11px] font-mono font-semibold backdrop-blur-xs shadow-lg transition-all flex items-center gap-1.5 z-20"
          title="Reset Price & Time Scale to Auto (or double-click axis)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>Reset Scale</span>
        </button>
      )}

      {/* Floating Drag Direction Mode toggle */}
      <button
        onClick={() => setInvertDrag(!invertDrag)}
        className="absolute bottom-9 left-3 px-2.5 py-1 rounded bg-[#141d2c]/90 hover:bg-[#1d2a3f] text-slate-300 hover:text-white border border-[#23334a] text-[10px] font-mono backdrop-blur-xs transition-all flex items-center gap-1.5 z-20 shadow-md"
        title="Toggle Drag Direction (Inverted: Mouse left → Chart right, Mouse upside → Chart downside)"
      >
        <span className="text-slate-400">Drag:</span>
        <span className={invertDrag ? "text-emerald-400 font-bold" : "text-sky-400 font-bold"}>
          {invertDrag ? "Inverted (←→ / ↑↓)" : "Standard"}
        </span>
        <span className="text-slate-500 text-[10px]">⇄</span>
      </button>
    </div>
  );
};
