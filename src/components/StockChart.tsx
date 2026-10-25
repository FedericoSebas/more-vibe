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
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
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
  timeframe,
  onVisibleRangeChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Time & Price pan offsets (default 0 so chart starts at the beginning 04:00 AM)
  const [panOffset, setPanOffset] = useState<number>(0);
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
  const rightAxisWidth = 74;
  const bottomAxisHeight = 26;

  // Viewport calculation - at zoomLevel 1.0 (default), all candles fit across the screen
  const totalCandles = candles.length || 1;
  const defaultVisibleBars = Math.max(10, Math.min(totalCandles, Math.round(totalCandles / zoomLevel)));
  
  // Constrain pan offset
  const maxPan = Math.max(0, totalCandles - defaultVisibleBars);
  const effectivePan = Math.max(0, Math.min(maxPan, panOffset));
  const startIndex = Math.max(0, totalCandles - defaultVisibleBars - effectivePan);
  const endIndex = Math.min(totalCandles, startIndex + defaultVisibleBars);

  const visibleCandles = useMemo(() => candles.slice(startIndex, endIndex), [candles, startIndex, endIndex]);

  useEffect(() => {
    onVisibleRangeChange?.(startIndex, endIndex);
  }, [startIndex, endIndex, onVisibleRangeChange]);

  // Reset to Auto-Scale
  const handleResetAutoScale = useCallback(() => {
    setPriceScaleFactor(1.0);
    setVerticalPanOffset(0);
    setPanOffset(0);
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
    const isOverYAxis = (hoverPos && hoverPos.x >= plotWidth && hoverPos.y < plotHeight) || dragMode === 'scale-price';
    const isDraggingY = dragMode === 'scale-price';
    ctx.fillStyle = isDraggingY ? '#172236' : isOverYAxis ? '#121a29' : '#0c1018';
    ctx.fillRect(plotWidth, 0, rightAxisWidth, plotHeight);

    // Bottom X-axis background
    const isOverXAxis = (hoverPos && hoverPos.y >= plotHeight && hoverPos.x < plotWidth) || dragMode === 'scale-time';
    const isDraggingX = dragMode === 'scale-time';
    ctx.fillStyle = isDraggingX ? '#172236' : isOverXAxis ? '#121a29' : '#0c1018';
    ctx.fillRect(0, plotHeight, plotWidth, bottomAxisHeight);

    // Corner box (Auto scale button area)
    ctx.fillStyle = '#0e131d';
    ctx.fillRect(plotWidth, plotHeight, rightAxisWidth, bottomAxisHeight);

    // Axis separator border lines with glowing highlight on hover/drag
    ctx.strokeStyle = isDraggingY ? '#38bdf8' : isOverYAxis ? 'rgba(56, 189, 248, 0.6)' : '#1a2333';
    ctx.lineWidth = isDraggingY ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(plotWidth, 0);
    ctx.lineTo(plotWidth, height);
    ctx.stroke();

    ctx.strokeStyle = isDraggingX ? '#38bdf8' : isOverXAxis ? 'rgba(56, 189, 248, 0.6)' : '#1a2333';
    ctx.lineWidth = isDraggingX ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(0, plotHeight);
    ctx.lineTo(width, plotHeight);
    ctx.stroke();

    // Subtle stretch cues on axes
    if (isOverYAxis || isDraggingY) {
      ctx.fillStyle = isDraggingY ? '#38bdf8' : '#64748b';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▲', plotWidth + rightAxisWidth / 2, 10);
      ctx.fillText('↕ DRAG', plotWidth + rightAxisWidth / 2, 22);
      ctx.fillText('▼', plotWidth + rightAxisWidth / 2, plotHeight - 10);
    }

    if (isOverXAxis || isDraggingX) {
      ctx.fillStyle = isDraggingX ? '#38bdf8' : '#64748b';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('◀ ↔ DRAG TIME ▶', 12, plotHeight + 16);
    }

    // 2.5 Draw Extended Hours Session Shading & Clean Session Boundary Dividers
    const hasExtendedSessions = visibleCandles.some(c => c.session === 'pre' || c.session === 'post');
    if (hasExtendedSessions) {
      for (let i = 0; i < visibleCandles.length; i++) {
        const c = visibleCandles[i];
        const x = indexToX(i);
        const halfW = candleWidth / 2;

        if (c.session === 'pre' || c.session === 'post') {
          // Subtle warm dark-charcoal tint matching reference Image 2
          ctx.fillStyle = 'rgba(38, 28, 20, 0.42)';
          ctx.fillRect(x - halfW, 0, candleWidth, plotHeight);
        }

        // Clean session transition boundary line
        if (i > 0) {
          const prev = visibleCandles[i - 1];
          if (prev.session !== c.session) {
            const boundaryX = x - halfW;
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.moveTo(boundaryX, 0);
            ctx.lineTo(boundaryX, plotHeight);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

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
      ctx.fillText(price.toFixed(4), plotWidth + 6, y);
    }

    // 4. Draw Vertical Grid Lines & Eastern Time Labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '10px "JetBrains Mono", monospace';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastRenderedX = -999;
    const isIntraday = visibleCandles.length > 0 && visibleCandles[0].timeStr && visibleCandles[0].timeStr.includes(':');

    if (isIntraday) {
      let prevHour = -1;
      let prevDay = -1;

      for (let i = 0; i < visibleCandles.length; i++) {
        const c = visibleCandles[i];
        const x = indexToX(i);
        const [hStr, mStr] = c.timeStr.split(':');
        const hour = parseInt(hStr, 10);
        const min = parseInt(mStr, 10);
        const dObj = new Date(c.time);
        const day = dObj.getDate();

        // Check if this bar is an hour tick or day transition
        const isNewDay = prevDay !== -1 && day !== prevDay;
        const isHourTick = i === 0 || isNewDay || (hour !== prevHour && (min === 0 || min < 10));

        if (isHourTick) {
          prevHour = hour;
          prevDay = day;

          // Ensure minimum horizontal distance between adjacent labels
          if (x - lastRenderedX >= 40 || i === 0) {
            // Vertical grid line
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.moveTo(x, 0);
            ctx.lineTo(x, plotHeight);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label text: date on first tick / day rollover, otherwise 5 AM, 6 AM, etc.
            let labelText = '';
            if (i === 0 || isNewDay) {
              labelText = `${months[dObj.getMonth()]} ${dObj.getDate()}`;
            } else {
              const h12 = hour % 12 === 0 ? 12 : hour % 12;
              const ampm = hour < 12 ? 'AM' : 'PM';
              labelText = `${h12} ${ampm}`;
            }

            ctx.fillStyle = isOverXAxis || isDraggingX ? '#94a3b8' : '#64748b';
            ctx.fillText(labelText, x, plotHeight + 7);
            lastRenderedX = x;
          }
        }
      }
    } else {
      // Standard multi-day / weekly grid steps
      const timeStep = Math.max(1, Math.floor(visibleCandles.length / 8));
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

      if (c.session === 'pre') {
        ctx.fillStyle = isUp ? 'rgba(52, 211, 153, 0.45)' : 'rgba(251, 113, 133, 0.45)';
      } else if (c.session === 'post') {
        ctx.fillStyle = isUp ? 'rgba(45, 212, 191, 0.45)' : 'rgba(244, 63, 94, 0.45)';
      } else {
        ctx.fillStyle = isUp ? 'rgba(34, 197, 94, 0.45)' : 'rgba(239, 68, 68, 0.45)';
      }
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

        let candleColor: string;
        if (c.session === 'pre') {
          candleColor = isUp ? '#34d399' : '#fb7185'; // Pre-market mint / coral
        } else if (c.session === 'post') {
          candleColor = isUp ? '#2dd4bf' : '#f43f5e'; // After-hours teal / crimson
        } else {
          candleColor = isUp ? '#22c55e' : '#ef4444'; // Regular trading green / red
        }

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
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stock.price.toFixed(4), plotWidth + rightAxisWidth / 2, liveY);
    }

    // EMA indicator tag on right axis if enabled
    if (indicators.ema9 && ema9Data[candles.length - 1] !== null) {
      const lastEma = ema9Data[candles.length - 1] as number;
      const emaY = priceToY(lastEma);
      if (emaY >= 0 && emaY <= plotHeight) {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(plotWidth, emaY - 8, rightAxisWidth - 6, 16);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lastEma.toFixed(4), plotWidth + (rightAxisWidth - 6) / 2, emaY);
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
        ctx.fillRect(x2 + 4, y2 - 14, 130, 28);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${deltaPrice >= 0 ? '+' : ''}${deltaPrice.toFixed(4)} (${deltaPct.toFixed(2)}%)`, x2 + 8, y2 - 2);
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

      // Right axis price badge for crosshair (4 decimals)
      ctx.fillStyle = '#334155';
      ctx.fillRect(plotWidth, hoverPos.y - 9, rightAxisWidth, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cursorPrice.toFixed(4), plotWidth + rightAxisWidth / 2, hoverPos.y);

      // Bottom axis time badge for crosshair
      const candleIdx = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor(hoverPos.x / candleWidth)));
      const hovered = visibleCandles[candleIdx];
      if (hovered) {
        const sessionPrefix = hovered.session === 'pre' ? 'PRE ' : hovered.session === 'post' ? 'POST ' : '';
        const badgeBg = hovered.session === 'pre' ? '#0e7490' : hovered.session === 'post' ? '#6b21a8' : '#334155';
        const badgeW = hovered.session ? 74 : 60;
        ctx.fillStyle = badgeBg;
        ctx.fillRect(hoverPos.x - badgeW / 2, plotHeight, badgeW, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${sessionPrefix}${hovered.timeStr}`, hoverPos.x, plotHeight + 9);
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

    // 13. Top Chart HUD Metrics & Exact Bar Label
    const isHoveringPlot = hoverPos && hoverPos.x >= 0 && hoverPos.x < plotWidth && hoverPos.y >= 0 && hoverPos.y < plotHeight;
    const hoveredCandleIndex = isHoveringPlot
      ? Math.max(0, Math.min(visibleCandles.length - 1, Math.floor(hoverPos.x / candleWidth)))
      : -1;

    const activeCandle = hoveredCandleIndex >= 0 
      ? visibleCandles[hoveredCandleIndex] 
      : visibleCandles[visibleCandles.length - 1];

    const activeCandleGlobalIdx = hoveredCandleIndex >= 0
      ? startIndex + hoveredCandleIndex
      : candles.length - 1;

    if (activeCandle) {
      const barChange = activeCandle.close - activeCandle.open;
      const barChangePct = activeCandle.open > 0 ? (barChange / activeCandle.open) * 100 : 0;
      const isBarUp = activeCandle.close >= activeCandle.open;
      const barThemeColor = isBarUp ? '#22c55e' : '#ef4444';

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = '11px "JetBrains Mono", monospace';

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
      ctx.fillStyle = hoveredCandleIndex >= 0 ? '#38bdf8' : '#94a3b8';
      ctx.fillText(timeTag, hudX, hudY);
      hudX += Math.max(140, Math.round(ctx.measureText(timeTag).width + 12));

      // Session Tag Badge if extended hours
      if (activeCandle.session) {
        const sessionLabel = activeCandle.session === 'pre' ? 'PRE-MKT' : activeCandle.session === 'post' ? 'POST-MKT' : 'REGULAR';
        const sessionBg = activeCandle.session === 'pre' ? '#0e7490' : activeCandle.session === 'post' ? '#6b21a8' : '#1e293b';
        const sessionTextColor = activeCandle.session === 'regular' ? '#94a3b8' : '#ffffff';
        ctx.fillStyle = sessionBg;
        ctx.fillRect(hudX, hudY - 1, 58, 14);
        ctx.fillStyle = sessionTextColor;
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sessionLabel, hudX + 29, hudY + 6);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = '11px "JetBrains Mono", monospace';
        hudX += 66;
      }

      // Open label & value with 4 decimals
      ctx.fillStyle = '#64748b';
      ctx.fillText(`O`, hudX, hudY);
      ctx.fillStyle = barThemeColor;
      ctx.fillText(` ${activeCandle.open.toFixed(4)}`, hudX + 10, hudY);
      hudX += 72;

      // High label & value with 4 decimals
      ctx.fillStyle = '#64748b';
      ctx.fillText(`H`, hudX, hudY);
      ctx.fillStyle = '#22c55e';
      ctx.fillText(` ${activeCandle.high.toFixed(4)}`, hudX + 10, hudY);
      hudX += 72;

      // Low label & value with 4 decimals
      ctx.fillStyle = '#64748b';
      ctx.fillText(`L`, hudX, hudY);
      ctx.fillStyle = '#ef4444';
      ctx.fillText(` ${activeCandle.low.toFixed(4)}`, hudX + 10, hudY);
      hudX += 72;

      // Close label & value with 4 decimals
      ctx.fillStyle = '#64748b';
      ctx.fillText(`C`, hudX, hudY);
      ctx.fillStyle = barThemeColor;
      ctx.fillText(` ${activeCandle.close.toFixed(4)}`, hudX + 10, hudY);
      hudX += 72;

      // Bar Change (Diff between this bar's close and open)
      ctx.fillStyle = barThemeColor;
      const barDiffStr = `${isBarUp ? '+' : ''}${barChange.toFixed(4)} (${isBarUp ? '+' : ''}${barChangePct.toFixed(2)}%)`;
      ctx.fillText(barDiffStr, hudX, hudY);
      hudX += Math.round(ctx.measureText(barDiffStr).width + 14);

      // Volume for this bar
      ctx.fillStyle = '#64748b';
      ctx.fillText(`Vol `, hudX, hudY);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`${formatCompactVolume(activeCandle.volume)}`, hudX + 26, hudY);
      hudX += 75;

      ctx.fillStyle = '#64748b';
      ctx.fillText(`Vol(d) `, hudX, hudY);
      ctx.fillStyle = '#22c55e';
      ctx.fillText(formatCompactVolume(stock.volume), hudX + 42, hudY);

      // Row 2: Indicators readout for this specific bar with 4 decimals
      const hudY2 = hudY + 16;
      let indX = 12;

      if (indicators.ema9) {
        ctx.fillStyle = '#eab308';
        const val = ema9Data[activeCandleGlobalIdx];
        ctx.fillText(`EMA 9 · ${val !== null && val !== undefined ? Number(val).toFixed(4) : 'N/A'}`, indX, hudY2);
        indX += 120;
      }

      if (indicators.sma20) {
        ctx.fillStyle = '#3b82f6';
        const val = sma20Data[activeCandleGlobalIdx];
        ctx.fillText(`SMA 20 · ${val !== null && val !== undefined ? Number(val).toFixed(4) : 'N/A'}`, indX, hudY2);
        indX += 125;
      }

      if (indicators.sma200) {
        ctx.fillStyle = '#a855f7';
        const val = sma200Data[activeCandleGlobalIdx];
        ctx.fillText(`SMA 200 · ${val !== null && val !== undefined ? Number(val).toFixed(4) : 'N/A'}`, indX, hudY2);
        indX += 135;
      }

      if (indicators.vwap) {
        ctx.fillStyle = '#cbd5e1';
        const val = vwapData[activeCandleGlobalIdx];
        ctx.fillText(`VWAP · ${val !== null && val !== undefined ? Number(val).toFixed(4) : 'N/A'}`, indX, hudY2);
        indX += 120;
      }

      if (indicators.volumeProfile) {
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`VP 50`, indX, hudY2);
      }

      // 14. Floating On-Bar Label / Tooltip directly above the hovered visual bar
      if (hoveredCandleIndex >= 0 && activeCandle) {
        const barX = indexToX(hoveredCandleIndex);
        const highY = priceToY(activeCandle.high);
        const lowY = priceToY(activeCandle.low);

        const cardW = 236;
        const cardH = 46;
        let cardX = barX - cardW / 2;
        cardX = Math.max(10, Math.min(plotWidth - cardW - 10, cardX));
        
        let cardY = highY - cardH - 12;
        if (cardY < 40) {
          cardY = Math.min(plotHeight - cardH - 10, lowY + 12);
        }

        // Card background & glowing border
        ctx.fillStyle = 'rgba(11, 16, 26, 0.94)';
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.strokeStyle = barThemeColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(cardX, cardY, cardW, cardH);

        // Header: Time & Change
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(activeCandle.timeStr, cardX + 8, cardY + 6);

        ctx.textAlign = 'right';
        ctx.fillStyle = barThemeColor;
        ctx.fillText(barDiffStr, cardX + cardW - 8, cardY + 6);

        // OHLC values with 4 decimals
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        let rowX = cardX + 8;
        const rowY = cardY + 24;

        ctx.fillStyle = '#64748b';
        ctx.fillText(`O:`, rowX, rowY);
        ctx.fillStyle = barThemeColor;
        ctx.fillText(activeCandle.open.toFixed(4), rowX + 13, rowY);
        rowX += 55;

        ctx.fillStyle = '#64748b';
        ctx.fillText(`H:`, rowX, rowY);
        ctx.fillStyle = '#22c55e';
        ctx.fillText(activeCandle.high.toFixed(4), rowX + 13, rowY);
        rowX += 55;

        ctx.fillStyle = '#64748b';
        ctx.fillText(`L:`, rowX, rowY);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(activeCandle.low.toFixed(4), rowX + 13, rowY);
        rowX += 55;

        ctx.fillStyle = '#64748b';
        ctx.fillText(`C:`, rowX, rowY);
        ctx.fillStyle = barThemeColor;
        ctx.fillText(activeCandle.close.toFixed(4), rowX + 13, rowY);

        // Also draw exact Close Price Tag on right Y-Axis
        const closeY = priceToY(activeCandle.close);
        ctx.fillStyle = barThemeColor;
        ctx.fillRect(plotWidth, closeY - 8, rightAxisWidth, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeCandle.close.toFixed(4), plotWidth + rightAxisWidth / 2, closeY);
      }
    }

    // 14. Helper tooltip overlay when dragging price or time scale
    if (dragMode === 'scale-price') {
      const pct = Math.round(100 / priceScaleFactor);
      ctx.fillStyle = 'rgba(11, 16, 26, 0.94)';
      ctx.fillRect(plotWidth - 175, 20, 165, 26);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(plotWidth - 175, 20, 165, 26);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`↕ Price Scale: ${pct}% (Drag UP/DN)`, plotWidth - 92, 33);
    } else if (dragMode === 'scale-time') {
      const pct = Math.round(zoomLevel * 100);
      ctx.fillStyle = 'rgba(11, 16, 26, 0.94)';
      ctx.fillRect(plotWidth / 2 - 110, plotHeight - 36, 220, 26);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(plotWidth / 2 - 110, plotHeight - 36, 220, 26);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`↔ Time: ${pct}% (${visibleCandles.length} bars • Drag L/R)`, plotWidth / 2, plotHeight - 23);
    }

  }, [
    visibleCandles, 
    indicators, 
    stock, 
    hoverPos, 
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

  // Direct stretch / contract button handlers
  const handleStretchPrice = () => {
    setPriceScaleFactor(prev => Math.max(0.04, prev * 0.78));
  };
  const handleContractPrice = () => {
    setPriceScaleFactor(prev => Math.min(15.0, prev * 1.25));
  };
  const handleStretchTime = () => {
    onZoomChange(Math.min(6.5, zoomLevel * 1.25));
  };
  const handleContractTime = () => {
    onZoomChange(Math.max(0.18, zoomLevel * 0.8));
  };

  // Window-level mouse move & mouse up listeners for smooth axis dragging
  useEffect(() => {
    if (dragMode === 'none') return;

    const originalCursor = document.body.style.cursor;
    if (dragMode === 'scale-price') document.body.style.cursor = 'ns-resize';
    else if (dragMode === 'scale-time') document.body.style.cursor = 'ew-resize';
    else if (dragMode === 'pan-chart') document.body.style.cursor = 'grabbing';

    const onWindowMouseMove = (e: MouseEvent) => {
      // 1. Dragging Right Price Axis: Vertical stretch/contract
      if (dragMode === 'scale-price') {
        const deltaY = e.clientY - dragStartPos.y;
        // Drag UP (deltaY < 0): stretch price scale (factor < 1 -> priceScaleFactor gets smaller -> fewer price units per screen -> taller candles)
        // Drag DOWN (deltaY > 0): contract price scale (factor > 1 -> priceScaleFactor gets larger -> more price units per screen -> shorter candles)
        const factor = Math.exp(deltaY * 0.0065);
        const nextScale = Math.max(0.04, Math.min(15.0, startPriceScale * factor));
        setPriceScaleFactor(nextScale);
        return;
      }

      // 2. Dragging Bottom Time Axis: Horizontal stretch/contract
      if (dragMode === 'scale-time') {
        const deltaX = e.clientX - dragStartPos.x;
        // Drag RIGHT (deltaX > 0): stretch time scale (factor > 1 -> zoomLevel increases -> fewer bars -> wider candles)
        // Drag LEFT (deltaX < 0): contract time scale (factor < 1 -> zoomLevel decreases -> more bars -> narrower candles)
        const factor = Math.exp(deltaX * 0.0055);
        const nextZoom = Math.max(0.18, Math.min(6.5, startZoom * factor));
        onZoomChange(nextZoom);
        return;
      }

      // 3. Dragging Main Chart: 2D Panning (X: time pan, Y: price pan)
      if (dragMode === 'pan-chart') {
        const deltaX = e.clientX - dragStartPos.x;
        const deltaY = e.clientY - dragStartPos.y;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const plotWidth = rect.width - rightAxisWidth;
        const plotHeight = rect.height - bottomAxisHeight;

        const candleWidth = plotWidth / (visibleCandles.length || 1);
        const candleDelta = Math.round(deltaX / (candleWidth * 1.1));
        if (candleDelta !== 0) {
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

        const nextVert = invertDrag
          ? startVerticalPan + priceDelta
          : startVerticalPan - priceDelta;
        setVerticalPanOffset(nextVert);
      }
    };

    const onWindowMouseUp = () => {
      setDragMode('none');
      document.body.style.cursor = originalCursor;
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      document.body.style.cursor = originalCursor;
    };
  }, [
    dragMode,
    dragStartPos,
    startPriceScale,
    startZoom,
    startPanOffset,
    startVerticalPan,
    invertDrag,
    maxPan,
    priceScaleFactor,
    visibleCandles,
    onZoomChange,
    rightAxisWidth,
    bottomAxisHeight
  ]);

  // Mouse Move Event Handler for Hover Crosshair & HUD
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoverPos({ x, y });
    updateCursor(x, y);
  };

  // Mouse Up & Leave Handlers
  const handleMouseUp = () => {
    setDragMode('none');
    if (hoverPos) {
      updateCursor(hoverPos.x, hoverPos.y);
    }
  };

  const handleMouseLeave = () => {
    if (dragMode === 'none') {
      setHoverPos(null);
    }
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
      setPanOffset(20);
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
    const y = e.clientY - rect.top;
    const plotWidth = rect.width - rightAxisWidth;
    const plotHeight = rect.height - bottomAxisHeight;

    // Wheel over price axis stretches/contracts price only
    if (x >= plotWidth) {
      if (e.deltaY < 0) {
        setPriceScaleFactor(prev => Math.max(0.04, prev * 0.88));
      } else {
        setPriceScaleFactor(prev => Math.min(15.0, prev * 1.12));
      }
      return;
    }

    // Wheel over time axis stretches/contracts time only
    if (y >= plotHeight) {
      if (e.deltaY < 0) {
        onZoomChange(Math.min(6.5, zoomLevel * 1.15));
      } else {
        onZoomChange(Math.max(0.18, zoomLevel / 1.15));
      }
      return;
    }

    // Alt or Ctrl + wheel anywhere on chart: stretch/contract price axis
    if (e.altKey || e.ctrlKey) {
      if (e.deltaY < 0) {
        setPriceScaleFactor(prev => Math.max(0.04, prev * 0.88));
      } else {
        setPriceScaleFactor(prev => Math.min(15.0, prev * 1.12));
      }
      return;
    }

    // Shift + wheel on chart: pan time horizontally
    if (e.shiftKey) {
      const scrollStep = e.deltaY < 0 ? -4 : 4;
      setPanOffset(prev => Math.max(0, Math.min(maxPan, prev + scrollStep)));
      return;
    }

    // Default wheel on chart: zoom/stretch time
    if (e.deltaY < 0) {
      onZoomChange(Math.min(6.5, zoomLevel * 1.15));
    } else {
      onZoomChange(Math.max(0.18, zoomLevel / 1.15));
    }
  };

  const isCustomScale = priceScaleFactor !== 1.0 || verticalPanOffset !== 0 || zoomLevel !== 1.0 || panOffset !== 20;

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

      {/* Floating Scale & Axis Stretch/Contract Dock */}
      <div className="absolute bottom-9 right-20 flex items-center bg-[#101726]/90 border border-[#223147] rounded-md backdrop-blur-xs shadow-xl divide-x divide-[#1e2b3e] text-xs z-20 overflow-hidden">
        {/* Price Axis Stretch / Contract Buttons */}
        <div className="flex items-center px-2 py-1 gap-1 text-slate-300">
          <span className="text-[10px] font-mono text-slate-400 font-bold" title="Stretch / Contract Price Axis">
            ↕ Price {Math.round(100 / priceScaleFactor)}%:
          </span>
          <button
            onClick={handleStretchPrice}
            className="w-5 h-5 rounded flex items-center justify-center bg-[#182335] hover:bg-sky-600 hover:text-white text-sky-400 font-bold text-xs transition-colors"
            title="Stretch Price Scale (Taller Candles / Zoom Price In)"
          >
            +
          </button>
          <button
            onClick={handleContractPrice}
            className="w-5 h-5 rounded flex items-center justify-center bg-[#182335] hover:bg-[#25354e] text-slate-300 hover:text-white font-bold text-xs transition-colors"
            title="Contract Price Scale (Shorter Candles / Zoom Price Out)"
          >
            -
          </button>
        </div>

        {/* Time Axis Stretch / Contract Buttons */}
        <div className="flex items-center px-2 py-1 gap-1 text-slate-300">
          <span className="text-[10px] font-mono text-slate-400 font-bold" title="Stretch / Contract Time Axis">
            ↔ Time {Math.round(zoomLevel * 100)}%:
          </span>
          <button
            onClick={handleStretchTime}
            className="w-5 h-5 rounded flex items-center justify-center bg-[#182335] hover:bg-sky-600 hover:text-white text-sky-400 font-bold text-xs transition-colors"
            title="Stretch Time Scale (Wider Candles / Fewer Bars)"
          >
            +
          </button>
          <button
            onClick={handleContractTime}
            className="w-5 h-5 rounded flex items-center justify-center bg-[#182335] hover:bg-[#25354e] text-slate-300 hover:text-white font-bold text-xs transition-colors"
            title="Contract Time Scale (Narrower Candles / More Bars)"
          >
            -
          </button>
        </div>

        {/* Reset to Auto Button */}
        <button
          onClick={handleResetAutoScale}
          className={`px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors flex items-center gap-1.5 ${
            isCustomScale ? 'text-sky-400 bg-sky-950/40 hover:bg-sky-900/50' : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Reset Price & Time Scale to Auto (Double-click axis also resets)"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isCustomScale ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'}`} />
          <span>AUTO</span>
        </button>
      </div>

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
