import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Trash2, 
  GripVertical, 
  X 
} from 'lucide-react';
import { 
  Candle, 
  StockQuote, 
  DrawingTool, 
  DrawnObject, 
  IndicatorVisibility, 
  ChartType,
  VolumeProfileLevel,
  Timeframe,
  CandleFootprint,
  Level2Book,
  FootprintFilterConfig
} from '../types/stock';
import { 
  calculateEMA, 
  calculateSMA, 
  calculateVWAP, 
  calculateVolumeProfile,
  formatCompactVolume 
} from '../utils/stockData';
import { 
  generateCandleFootprint, 
  formatOrderFlowVolume 
} from '../utils/orderFlow';
import { soundManager } from '../utils/sound';

interface StockChartProps {
  candles: Candle[];
  stock: StockQuote;
  activeTool: DrawingTool;
  indicators: IndicatorVisibility;
  chartType: ChartType;
  magnetMode: boolean;
  drawings: DrawnObject[];
  onAddDrawing: (drawing: DrawnObject) => void;
  onUpdateDrawing?: (drawing: DrawnObject) => void;
  onDeleteDrawing?: (id: string) => void;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  timeframe: Timeframe;
  panOffset?: number;
  onPanChange?: (pan: number | ((prev: number) => number)) => void;
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
  level2Book?: Level2Book | null;
  onZoomToFootprint?: () => void;
  footprintFilter?: FootprintFilterConfig;
  onUpdateFootprintFilter?: (updater: Partial<FootprintFilterConfig>) => void;
}

type DragMode = 'none' | 'pan-chart' | 'scale-price' | 'scale-time' | 'drag-drawing';

// ICT / Smart Money Concept Fibonacci Retracement Levels requested: 50, 62, 70.5, 78.8, 88.6, 110
export const FIB_LEVELS = [
  { ratio: 0.50, label: '50.0%', pct: '50%', color: '#38bdf8' },
  { ratio: 0.62, label: '62.0%', pct: '62%', color: '#fbbf24' },
  { ratio: 0.705, label: '70.5%', pct: '70.5%', color: '#f97316' }, // Key OTE (Optimal Trade Entry)
  { ratio: 0.788, label: '78.8%', pct: '78.8%', color: '#f43f5e' },
  { ratio: 0.886, label: '88.6%', pct: '88.6%', color: '#c084fc' },
  { ratio: 1.10, label: '110.0%', pct: '110%', color: '#ef4444' }, // Sweep / Stop Hunt Extension
] as const;

// Geometric distance from point (px, py) to line segment (x1, y1) -> (x2, y2)
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Find closest candle index in sorted candles array by timestamp
function findCandleIndexByTime(candleList: Candle[], targetTime: number): number {
  if (!candleList || candleList.length === 0) return 0;
  // If targetTime is a legacy small index (< 1,000,000)
  if (targetTime < 1000000) {
    return Math.min(candleList.length - 1, Math.max(0, Math.round(targetTime)));
  }

  let low = 0;
  let high = candleList.length - 1;
  let closest = 0;
  let minDiff = Infinity;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const diff = Math.abs(candleList[mid].time - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = mid;
    }
    if (candleList[mid].time === targetTime) {
      return mid;
    }
    if (candleList[mid].time < targetTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return closest;
}

export const StockChart: React.FC<StockChartProps> = ({
  candles,
  stock,
  activeTool,
  indicators,
  chartType,
  magnetMode,
  drawings,
  onAddDrawing,
  onUpdateDrawing,
  onDeleteDrawing,
  zoomLevel,
  onZoomChange,
  timeframe,
  panOffset: externalPanOffset,
  onPanChange,
  onVisibleRangeChange,
  level2Book,
  onZoomToFootprint,
  footprintFilter,
  onUpdateFootprintFilter
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const footprintCache = useRef<Map<string, CandleFootprint>>(new Map());

  const activeFpFilter = useMemo(() => {
    return footprintFilter || {
      highlightImbalances: true,
      imbalanceRatio: 4.0,
      imbalanceMode: 'level' as const,
      minVolumeThreshold: 10,
      showRatioBadge: true
    };
  }, [footprintFilter]);

  // Time & Price pan offsets (default 0 so chart starts at the beginning 04:00 AM)
  const [internalPanOffset, setInternalPanOffset] = useState<number>(0);
  const panOffset = externalPanOffset !== undefined ? externalPanOffset : internalPanOffset;
  const setPanOffset = useCallback((updater: number | ((prev: number) => number)) => {
    if (onPanChange) {
      onPanChange(updater);
    } else {
      setInternalPanOffset(updater);
    }
  }, [onPanChange]);

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

  // Drawing selection and drag states
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);
  const [draggingDrawingId, setDraggingDrawingId] = useState<string | null>(null);
  const [draggingPointIndex, setDraggingPointIndex] = useState<number>(0);

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
  const showBarStats = indicators.barStats !== false;
  const barStatsRowHeight = 18;
  const barStatsTableHeight = showBarStats ? barStatsRowHeight * 2 : 0;
  const timeAxisHeight = 22;
  const bottomAxisHeight = barStatsTableHeight + timeAxisHeight;

  // Viewport calculation - at zoomLevel 1.0 (default), all candles fit across the screen
  const totalCandles = candles.length || 1;
  const defaultVisibleBars = Math.max(10, Math.min(totalCandles, Math.round(totalCandles / zoomLevel)));
  
  // Constrain pan offset
  const maxPan = Math.max(0, totalCandles - defaultVisibleBars);
  const effectivePan = Math.max(0, Math.min(maxPan, panOffset));
  const startIndex = Math.max(0, totalCandles - defaultVisibleBars - effectivePan);
  const endIndex = Math.min(totalCandles, startIndex + defaultVisibleBars);

  const visibleCandles = useMemo(() => candles.slice(startIndex, endIndex), [candles, startIndex, endIndex]);
  const isFootprintZoomActive = (timeframe === '1M' || timeframe === '5M' || timeframe === '10M') && defaultVisibleBars <= 26;

  // Natural price min, max and buffered range
  const priceBounds = useMemo(() => {
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const c of visibleCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }
    if (minPrice === maxPrice || minPrice === Infinity) {
      minPrice = stock.price * 0.95;
      maxPrice = stock.price * 1.05;
    }
    const rawRange = Math.max(0.02, maxPrice - minPrice);
    const naturalCenter = (minPrice + maxPrice) / 2;
    const effectiveCenter = naturalCenter + verticalPanOffset;
    const halfSpan = (rawRange * 0.56) * priceScaleFactor;
    const bufferedMin = Math.max(0.01, effectiveCenter - halfSpan);
    const bufferedMax = effectiveCenter + halfSpan;
    const bufferedRange = bufferedMax - bufferedMin;
    return { bufferedMin, bufferedMax, bufferedRange };
  }, [visibleCandles, stock.price, verticalPanOffset, priceScaleFactor]);

  // Screen coordinate to price and vice-versa
  const priceToY = useCallback((price: number, containerHeight?: number) => {
    const h = containerHeight || containerRef.current?.getBoundingClientRect().height || 400;
    const plotHeight = h - bottomAxisHeight;
    const pricePlotHeight = plotHeight - (plotHeight * 0.16);
    return pricePlotHeight - ((price - priceBounds.bufferedMin) / priceBounds.bufferedRange) * pricePlotHeight;
  }, [priceBounds, bottomAxisHeight]);

  const yToPrice = useCallback((y: number, containerHeight?: number) => {
    const h = containerHeight || containerRef.current?.getBoundingClientRect().height || 400;
    const plotHeight = h - bottomAxisHeight;
    const pricePlotHeight = plotHeight - (plotHeight * 0.16);
    return priceBounds.bufferedMax - (y / pricePlotHeight) * priceBounds.bufferedRange;
  }, [priceBounds, bottomAxisHeight]);

  // Screen coordinate X from candle timestamp, perfectly invariant across zoom, pan, stretch, and window resize
  const timeToX = useCallback((pointTime: number, containerWidth?: number): number => {
    if (!candles || candles.length === 0) return 0;
    const w = containerWidth || containerRef.current?.getBoundingClientRect().width || 800;
    const plotW = w - rightAxisWidth;
    const numVisible = visibleCandles.length || 1;
    const candleW = plotW / numVisible;

    // Handle legacy points saved with local visible index (< 1,000,000)
    if (pointTime < 1000000) {
      return pointTime * candleW + candleW / 2;
    }

    const closestIdx = findCandleIndexByTime(candles, pointTime);
    let fractionalIdx = closestIdx;

    if (closestIdx < candles.length - 1 && pointTime > candles[closestIdx].time) {
      const nextTime = candles[closestIdx + 1].time;
      if (nextTime > candles[closestIdx].time) {
        const frac = (pointTime - candles[closestIdx].time) / (nextTime - candles[closestIdx].time);
        fractionalIdx = closestIdx + Math.min(1, Math.max(0, frac));
      }
    } else if (closestIdx > 0 && pointTime < candles[closestIdx].time) {
      const prevTime = candles[closestIdx - 1].time;
      if (candles[closestIdx].time > prevTime) {
        const frac = (pointTime - prevTime) / (candles[closestIdx].time - prevTime);
        fractionalIdx = (closestIdx - 1) + Math.min(1, Math.max(0, frac));
      }
    }

    // Offset relative to the visible window startIndex
    const visibleIdx = fractionalIdx - startIndex;
    return visibleIdx * candleW + candleW / 2;
  }, [candles, visibleCandles.length, startIndex, rightAxisWidth]);

  // Helper to find any drawing (horizontal line, fibonacci level or anchor, trendline) near mouse (x, y)
  const findDrawingNearPos = useCallback((x: number, y: number, tolerance = 8): DrawnObject | null => {
    let closest: DrawnObject | null = null;
    let minDiff = tolerance;

    for (const d of drawings) {
      if (d.type === 'horizontal' && d.points.length > 0) {
        const lineY = priceToY(d.points[0].price);
        const diff = Math.abs(y - lineY);
        if (diff < minDiff) {
          minDiff = diff;
          closest = d;
        }
      } else if (d.type === 'fibonacci' && d.points.length >= 2) {
        const p1 = d.points[0];
        const p2 = d.points[1];
        const x1 = timeToX(p1.time);
        const y1 = priceToY(p1.price);
        const x2 = timeToX(p2.time);
        const y2 = priceToY(p2.price);

        // Check if cursor is right on Anchor 1 or Anchor 2
        const distAnchor1 = Math.hypot(x - x1, y - y1);
        const distAnchor2 = Math.hypot(x - x2, y - y2);
        if (distAnchor1 <= 14 || distAnchor2 <= 14) {
          return d;
        }

        // Check near dashed anchor connection line
        const distTrend = distToSegment(x, y, x1, y1, x2, y2);
        if (distTrend < minDiff) {
          minDiff = distTrend;
          closest = d;
        }

        // Check near any of the 6 Fibonacci levels
        for (const lvl of FIB_LEVELS) {
          const fibPrice = p2.price - lvl.ratio * (p2.price - p1.price);
          const fibY = priceToY(fibPrice);
          const diff = Math.abs(y - fibY);
          if (diff < minDiff) {
            minDiff = diff;
            closest = d;
          }
        }
      } else if (d.type === 'trendline' && d.points.length >= 2) {
        const p1 = d.points[0];
        const p2 = d.points[1];
        const x1 = timeToX(p1.time);
        const y1 = priceToY(p1.price);
        const x2 = timeToX(p2.time);
        const y2 = priceToY(p2.price);
        const distTrend = distToSegment(x, y, x1, y1, x2, y2);
        if (distTrend < minDiff) {
          minDiff = distTrend;
          closest = d;
        }
      }
    }
    return closest;
  }, [drawings, priceToY, timeToX]);

  // Keep findHorizontalLineNearY for compatibility
  const findHorizontalLineNearY = useCallback((y: number, tolerance = 8): DrawnObject | null => {
    return findDrawingNearPos(0, y, tolerance);
  }, [findDrawingNearPos]);

  // Keyboard shortcut: Delete or Backspace to delete selected drawing, Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        if (onDeleteDrawing) {
          onDeleteDrawing(selectedDrawingId);
        }
        setSelectedDrawingId(null);
        soundManager.playSelect();
      } else if (e.key === 'Escape') {
        setSelectedDrawingId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId, onDeleteDrawing]);

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
    const plotHeight = height - bottomAxisHeight;
    const timeAxisY = plotHeight + barStatsTableHeight;
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

    // Bottom X-axis background (time scale area)
    const isOverXAxis = (hoverPos && hoverPos.y >= timeAxisY && hoverPos.x < plotWidth) || dragMode === 'scale-time';
    const isDraggingX = dragMode === 'scale-time';
    ctx.fillStyle = isDraggingX ? '#172236' : isOverXAxis ? '#121a29' : '#0c1018';
    ctx.fillRect(0, timeAxisY, plotWidth, timeAxisHeight);

    // Corner box (Auto scale button area)
    ctx.fillStyle = '#0e131d';
    ctx.fillRect(plotWidth, timeAxisY, rightAxisWidth, timeAxisHeight);

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
    // 24-Hour Market Colors: Pre-market (Orange), After-market (Blue), Overnight (Purple) with opacity >= 8% (0.12)
    const hasExtendedSessions = visibleCandles.some(c => c.session && c.session !== 'regular');
    if (hasExtendedSessions) {
      for (let i = 0; i < visibleCandles.length; i++) {
        const c = visibleCandles[i];
        const x = indexToX(i);
        const halfW = candleWidth / 2;

        if (c.session === 'pre') {
          // Pre-Market (4:00 AM - 9:30 AM ET): Orange background (at least 8% opacity)
          ctx.fillStyle = 'rgba(249, 115, 22, 0.12)';
          ctx.fillRect(x - halfW, 0, candleWidth, plotHeight);
        } else if (c.session === 'post') {
          // After-Market (4:00 PM - 8:00 PM ET): Blue background (at least 8% opacity)
          ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
          ctx.fillRect(x - halfW, 0, candleWidth, plotHeight);
        } else if (c.session === 'overnight') {
          // Overnight / Night Market (8:00 PM - 4:00 AM ET): Purple background (at least 8% opacity)
          ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
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
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
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
    const isIntraday = visibleCandles.length > 0 && (timeframe !== 'D');

    if (isIntraday) {
      let prevHour = -1;
      let prevDay = -1;

      for (let i = 0; i < visibleCandles.length; i++) {
        const c = visibleCandles[i];
        const x = indexToX(i);
        const timeMatch = c.timeStr ? c.timeStr.match(/(\d{1,2}):(\d{2})/) : null;
        const dObj = new Date(c.time);
        const hour = timeMatch ? parseInt(timeMatch[1], 10) : dObj.getHours();
        const min = timeMatch ? parseInt(timeMatch[2], 10) : dObj.getMinutes();
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
            ctx.fillText(labelText, x, timeAxisY + 5);
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
        ctx.fillText(c.timeStr, x, timeAxisY + 5);
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
      const isFootprintEligible = timeframe === '1M' || timeframe === '5M' || timeframe === '10M';
      // Significant zoom-in threshold: candleWidth >= 38 pixels
      const isFootprintActive = isFootprintEligible && candleWidth >= 38;

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

        if (isFootprintActive) {
          // FOOTPRINT / ORDER FLOW CANDLE IMPLEMENTATION
          // 1. Draw Central Wick Line
          ctx.beginPath();
          ctx.strokeStyle = candleColor;
          ctx.lineWidth = 1.2;
          ctx.moveTo(x, highY);
          ctx.lineTo(x, lowY);
          ctx.stroke();

          // 2. Fetch or calculate footprint for this candle with active imbalance filter parameters
          const cacheKey = `${c.time}_${c.volume}_${c.close}_${c.high}_${c.low}_${activeFpFilter.imbalanceRatio}_${activeFpFilter.imbalanceMode}_${activeFpFilter.minVolumeThreshold}`;
          let fp = footprintCache.current.get(cacheKey);
          if (!fp) {
            fp = generateCandleFootprint(
              c, 
              level2Book, 
              activeFpFilter.imbalanceRatio, 
              activeFpFilter.imbalanceMode, 
              activeFpFilter.minVolumeThreshold
            );
            footprintCache.current.set(cacheKey, fp);
          }

          const fpWidth = Math.min(candleWidth * 0.90, Math.max(34, bodyWidth));
          const halfFpW = fpWidth / 2;
          const leftX = x - halfFpW;
          const rightX = x + halfFpW;
          const candleSpanH = Math.max(4, lowY - highY);

          // Subtle dark container background for footprint candle
          ctx.fillStyle = isUp ? 'rgba(7, 20, 18, 0.92)' : 'rgba(24, 9, 12, 0.92)';
          ctx.fillRect(leftX, highY, fpWidth, candleSpanH);

          // Subtle body tint to distinguish candle body from wicks
          ctx.fillStyle = isUp ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)';
          ctx.fillRect(leftX, candleTop, fpWidth, candleHeight);

          // Draw Open Notch on Left, Close Notch on Right
          ctx.fillStyle = isUp ? '#22c55e' : '#ef4444';
          ctx.fillRect(leftX - 3, openY - 1, 4, 2.5);
          ctx.fillRect(rightX - 1, closeY - 1, 4, 2.5);

          // Find max level volume to scale volume bars proportionally
          let maxLevelVol = 1;
          for (let li = 0; li < fp.levels.length; li++) {
            if (fp.levels[li].totalVolume > maxLevelVol) {
              maxLevelVol = fp.levels[li].totalVolume;
            }
          }

          // Draw each price level ladder
          for (let li = 0; li < fp.levels.length; li++) {
            const lvl = fp.levels[li];
            const lvlCenterY = priceToY(lvl.price);
            const tickH = Math.max(9, Math.abs(priceToY(lvl.price) - priceToY(lvl.price + fp.tickSize)));
            const topY = lvlCenterY - tickH / 2;
            const bottomY = topY + tickH;

            // Skip if completely outside viewport
            if (bottomY < 0 || topY > pricePlotHeight) continue;

            const bidBarW = (lvl.bidVolume / maxLevelVol) * (halfFpW - 1);
            const askBarW = (lvl.askVolume / maxLevelVol) * (halfFpW - 1);

            const isSellHighlighted = activeFpFilter.highlightImbalances && lvl.isSellImbalance;
            const isBuyHighlighted = activeFpFilter.highlightImbalances && lvl.isBuyImbalance;

            // Shaded Bid Volume bar (selling pressure) - emphasized if seller imbalance
            ctx.fillStyle = isSellHighlighted 
              ? 'rgba(239, 68, 68, 0.65)' 
              : 'rgba(239, 68, 68, 0.18)';
            ctx.fillRect(x - bidBarW, topY, bidBarW, tickH);

            // Shaded Ask Volume bar (buying pressure) - emphasized if buyer imbalance
            ctx.fillStyle = isBuyHighlighted 
              ? 'rgba(34, 197, 94, 0.65)' 
              : 'rgba(34, 197, 94, 0.18)';
            ctx.fillRect(x, topY, askBarW, tickH);

            // Border highlight around imbalanced side cell
            if (isSellHighlighted) {
              ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
              ctx.lineWidth = 1;
              ctx.strokeRect(x - halfFpW, topY, halfFpW, tickH);
            }
            if (isBuyHighlighted) {
              ctx.strokeStyle = 'rgba(74, 222, 128, 0.85)';
              ctx.lineWidth = 1;
              ctx.strokeRect(x, topY, halfFpW, tickH);
            }

            // Level divider line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(leftX, bottomY);
            ctx.lineTo(rightX, bottomY);
            ctx.stroke();

            // Point of Control (POC) Level Outline
            if (lvl.isPoc) {
              ctx.strokeStyle = '#f59e0b';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(leftX, topY, fpWidth, tickH);

              // POC text tag if candle is wide enough
              if (candleWidth >= 70) {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 7px "JetBrains Mono", monospace';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText('POC', leftX + 1.5, topY + tickH / 2);
              }
            }

            // Render exact numerical Bid Volume x Ask Volume with high-visibility Imbalance Highlights
            const showNumbers = (candleWidth >= 48 && tickH >= 8) || ((isBuyHighlighted || isSellHighlighted) && tickH >= 7);
            if (showNumbers) {
              const fontSize = candleWidth >= 80 ? 9 : candleWidth >= 58 ? 8 : 7.5;
              const textY = topY + tickH / 2;

              const bidStr = formatOrderFlowVolume(lvl.bidVolume);
              const askStr = formatOrderFlowVolume(lvl.askVolume);

              // 1. Left side: Bid volume (sellers hitting bid)
              if (isSellHighlighted) {
                // High-visibility badge behind the seller order number
                ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
                const textW = ctx.measureText(bidStr).width;
                const badgeW = textW + 6;
                const badgeH = Math.min(tickH - 1, fontSize + 5);
                const badgeX = x - 2 - textW - 3;
                const badgeY = textY - badgeH / 2;

                // Vivid crimson highlight badge
                ctx.fillStyle = '#b91c1c';
                ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
                ctx.strokeStyle = '#f87171';
                ctx.lineWidth = 1;
                ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(bidStr, x - 2, textY);
              } else if (candleWidth >= 52) {
                ctx.font = `normal ${fontSize}px "JetBrains Mono", monospace`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#cbd5e1';
                ctx.fillText(bidStr, x - 2, textY);
              }

              // 2. Right side: Ask volume (buyers lifting ask)
              if (isBuyHighlighted) {
                // High-visibility badge behind the buyer order number
                ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
                const textW = ctx.measureText(askStr).width;
                const badgeW = textW + 6;
                const badgeH = Math.min(tickH - 1, fontSize + 5);
                const badgeX = x + 2 - 3;
                const badgeY = textY - badgeH / 2;

                // Vivid emerald green highlight badge
                ctx.fillStyle = '#15803d';
                ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
                ctx.strokeStyle = '#4ade80';
                ctx.lineWidth = 1;
                ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(askStr, x + 2, textY);
              } else if (candleWidth >= 52) {
                ctx.font = `normal ${fontSize}px "JetBrains Mono", monospace`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#cbd5e1';
                ctx.fillText(askStr, x + 2, textY);
              }
            }
          }

          // Center dividing line between Bid and Ask
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, highY);
          ctx.lineTo(x, lowY);
          ctx.stroke();

          // Candle Body Border: strictly drawn around the real body, leaving wicks clean without any border
          ctx.strokeStyle = candleColor;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(leftX, candleTop, fpWidth, candleHeight);

          // Delta Summary Badge below the candle
          const isPositiveDelta = fp.totalDelta >= 0;
          const deltaText = `Δ ${isPositiveDelta ? '+' : ''}${formatOrderFlowVolume(fp.totalDelta)}`;
          const deltaBadgeY = Math.min(pricePlotHeight - 14, lowY + 12);
          const badgeW = Math.min(fpWidth, 42);

          ctx.fillStyle = isPositiveDelta ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)';
          ctx.fillRect(x - badgeW / 2, deltaBadgeY - 6, badgeW, 12);
          ctx.strokeStyle = isPositiveDelta ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(x - badgeW / 2, deltaBadgeY - 6, badgeW, 12);

          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isPositiveDelta ? '#4ade80' : '#f87171';
          ctx.fillText(deltaText, x, deltaBadgeY);
        } else {
          // Standard Candlestick rendering
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
        const x1 = timeToX(p1.time, width);
        const y1 = priceToY(p1.price);
        const x2 = timeToX(p2.time, width);
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
        const isHovered = hoveredDrawingId === d.id;
        const isSelected = selectedDrawingId === d.id;

        // Draw halo / glow if hovered or selected
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.4)' : 'rgba(56, 189, 248, 0.2)';
          ctx.lineWidth = 8;
          ctx.moveTo(0, y);
          ctx.lineTo(plotWidth, y);
          ctx.stroke();
        }

        // Draw horizontal line
        ctx.beginPath();
        ctx.strokeStyle = isSelected ? '#38bdf8' : (isHovered ? '#7dd3fc' : d.color);
        ctx.lineWidth = isSelected || isHovered ? 2 : 1.5;
        ctx.setLineDash(isSelected ? [] : [4, 2]);
        ctx.moveTo(0, y);
        ctx.lineTo(plotWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // If selected, draw 3 circular handles on the line
        if (isSelected) {
          const handles = [28, plotWidth / 2, plotWidth - 28];
          for (const hx of handles) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(hx, y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        // Left label: L: price with 4 decimals
        ctx.fillStyle = isSelected ? '#38bdf8' : d.color;
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(`L: ${d.points[0].price.toFixed(4)}`, 10, y - 5);

        // Price Tag badge on right Y-axis
        if (y >= 0 && y <= plotHeight) {
          ctx.fillStyle = isSelected ? '#0284c7' : '#1e293b';
          ctx.fillRect(plotWidth, y - 8, rightAxisWidth, 16);
          ctx.strokeStyle = isSelected ? '#38bdf8' : d.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(plotWidth, y - 8, rightAxisWidth, 16);
          ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(d.points[0].price.toFixed(4), plotWidth + rightAxisWidth / 2, y);
        }
      } else if (d.type === 'fibonacci' && d.points.length >= 2) {
        const p1 = d.points[0];
        const p2 = d.points[1];
        const isSelected = selectedDrawingId === d.id;
        const isHovered = hoveredDrawingId === d.id;

        const x1 = timeToX(p1.time, width);
        const y1 = priceToY(p1.price);
        const x2 = timeToX(p2.time, width);
        const y2 = priceToY(p2.price);

        // 1. Draw Anchor Connection Trendline between the two user points
        ctx.beginPath();
        ctx.strokeStyle = isSelected ? '#38bdf8' : (isHovered ? '#7dd3fc' : 'rgba(148, 163, 184, 0.45)');
        ctx.lineWidth = isSelected || isHovered ? 1.5 : 1;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Anchor Circles with distinct handles when selected
        [ { x: x1, y: y1 }, { x: x2, y: y2 } ].forEach((pt) => {
          ctx.fillStyle = isSelected ? '#38bdf8' : '#0f172a';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = isSelected ? 2 : 1.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isSelected ? 5 : 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (isSelected) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Direction:
        // Mark low then high (p1.price < p2.price) -> downside retracement (pullback moving down from p2)
        // Mark high then low (p1.price > p2.price) -> upside retracement (pullback moving up from p2)
        // Formula: fibPrice = p2.price - ratio * (p2.price - p1.price)

        // 2. OTE Zone fill between 62% and 78.8%
        const price62 = p2.price - 0.62 * (p2.price - p1.price);
        const price788 = p2.price - 0.788 * (p2.price - p1.price);
        const y62 = priceToY(price62);
        const y788 = priceToY(price788);
        const zoneTop = Math.min(y62, y788);
        const zoneHeight = Math.abs(y788 - y62);
        if (zoneTop < plotHeight && zoneTop + zoneHeight > 0) {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.08)';
          ctx.fillRect(0, zoneTop, plotWidth, zoneHeight);
        }

        // 3. Render ONLY the requested percentages: 50, 62, 70.5, 78.8, 88.6, 110
        FIB_LEVELS.forEach(lvl => {
          const fibPrice = p2.price - lvl.ratio * (p2.price - p1.price);
          const fibY = priceToY(fibPrice);

          if (fibY >= -30 && fibY <= plotHeight + 30) {
            ctx.beginPath();
            ctx.strokeStyle = lvl.color;
            ctx.lineWidth = isSelected ? 1.6 : (lvl.ratio === 0.705 || lvl.ratio === 0.50 ? 1.4 : 1.0);
            ctx.setLineDash(lvl.ratio === 0.705 ? [] : (lvl.ratio === 0.50 ? [6, 3] : [3, 3]));
            ctx.moveTo(0, fibY);
            ctx.lineTo(plotWidth, fibY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Right-aligned level badge
            const badgeText = `${lvl.label} ($${fibPrice.toFixed(2)})`;
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            const textWidth = ctx.measureText(badgeText).width;
            const badgeW = textWidth + 12;
            const badgeH = 15;
            const badgeX = plotWidth - badgeW - 6;

            ctx.fillStyle = 'rgba(10, 15, 26, 0.9)';
            ctx.fillRect(badgeX, fibY - badgeH / 2, badgeW, badgeH);
            ctx.strokeStyle = lvl.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(badgeX, fibY - badgeH / 2, badgeW, badgeH);

            ctx.fillStyle = lvl.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, badgeX + badgeW / 2, fibY);
          }
        });
      } else if (d.type === 'ruler' && d.points.length >= 2) {
        const p1 = d.points[0];
        const p2 = d.points[1];
        const x1 = timeToX(p1.time, width);
        const y1 = priceToY(p1.price);
        const x2 = timeToX(p2.time, width);
        const y2 = priceToY(p2.price);

        const deltaPrice = p2.price - p1.price;
        const deltaPct = (deltaPrice / p1.price) * 100;
        const idx1 = findCandleIndexByTime(candles, p1.time);
        const idx2 = findCandleIndexByTime(candles, p2.time);
        const barsCount = Math.abs(idx2 - idx1);

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

    // 10b. Draw in-progress preview for multi-point tools (Fibonacci, Trendline, Ruler)
    if (currentDrawingPoints.length === 1 && hoverPos && hoverPos.x < plotWidth && hoverPos.y < plotHeight) {
      const p1 = currentDrawingPoints[0];
      const candleWidth = plotWidth / (visibleCandles.length || 1);
      const candleIdx = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor(hoverPos.x / candleWidth)));
      const targetCandle = visibleCandles[candleIdx];
      let targetPrice = yToPrice(hoverPos.y);

      if (magnetMode && targetCandle) {
        const candidates = [targetCandle.high, targetCandle.low, targetCandle.open, targetCandle.close];
        let closest = candidates[0];
        let minDiff = Math.abs(targetPrice - candidates[0]);
        for (const c of candidates) {
          const diff = Math.abs(targetPrice - c);
          if (diff < minDiff) {
            minDiff = diff;
            closest = c;
          }
        }
        targetPrice = closest;
      }

      const p2Price = Math.round(targetPrice * 10000) / 10000;
      const x1 = timeToX(p1.time, width);
      const y1 = priceToY(p1.price);
      const x2 = magnetMode && targetCandle ? timeToX(targetCandle.time, width) : hoverPos.x;
      const y2 = priceToY(p2Price);

      if (activeTool === 'fibonacci') {
        // Connecting anchor line preview
        ctx.beginPath();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Anchor dots
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x1, y1, 4, 0, Math.PI * 2);
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Direction HUD Banner at cursor
        const isDownside = p1.price < p2Price;
        const bannerText = isDownside ? '▼ Downside Retracement' : '▲ Upside Retracement';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        const bWidth = ctx.measureText(bannerText).width + 12;
        ctx.fillStyle = isDownside ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)';
        ctx.fillRect(x2 + 8, y2 - 18, bWidth, 16);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bannerText, x2 + 8 + bWidth / 2, y2 - 10);

        // OTE Zone preview
        const price62 = p2Price - 0.62 * (p2Price - p1.price);
        const price788 = p2Price - 0.788 * (p2Price - p1.price);
        const y62 = priceToY(price62);
        const y788 = priceToY(price788);
        const zoneTop = Math.min(y62, y788);
        const zoneHeight = Math.abs(y788 - y62);
        if (zoneTop < plotHeight && zoneTop + zoneHeight > 0) {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.08)';
          ctx.fillRect(0, zoneTop, plotWidth, zoneHeight);
        }

        // Preview all 6 Fibonacci levels
        FIB_LEVELS.forEach(lvl => {
          const fibPrice = p2Price - lvl.ratio * (p2Price - p1.price);
          const fibY = priceToY(fibPrice);
          if (fibY >= -30 && fibY <= plotHeight + 30) {
            ctx.beginPath();
            ctx.strokeStyle = lvl.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.moveTo(0, fibY);
            ctx.lineTo(plotWidth, fibY);
            ctx.stroke();
            ctx.setLineDash([]);

            const badgeText = `${lvl.label} ($${fibPrice.toFixed(2)})`;
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            const textWidth = ctx.measureText(badgeText).width;
            const badgeW = textWidth + 10;
            const badgeH = 14;
            const badgeX = plotWidth - badgeW - 6;

            ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
            ctx.fillRect(badgeX, fibY - badgeH / 2, badgeW, badgeH);
            ctx.strokeStyle = lvl.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(badgeX, fibY - badgeH / 2, badgeW, badgeH);

            ctx.fillStyle = lvl.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, badgeX + badgeW / 2, fibY);
          }
        });
      } else if (activeTool === 'trendline') {
        ctx.beginPath();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 10.5 Candlestick Bar Statistics (Delta & Volume Rows) below chart
    if (showBarStats) {
      const deltaRowY = plotHeight;
      const volRowY = plotHeight + barStatsRowHeight;
      const tableHeight = barStatsTableHeight;
      const headerWidth = 56;

      // 1. Calculate max absolute delta among visible candles for heatmap color scaling
      let maxAbsDelta = 1;
      const candleDeltas: number[] = new Array(visibleCandles.length);
      for (let i = 0; i < visibleCandles.length; i++) {
        const c = visibleCandles[i];
        const cacheKey = `${c.time}_${c.volume}_${c.close}_${c.high}_${c.low}_${activeFpFilter.imbalanceRatio}_${activeFpFilter.imbalanceMode}_${activeFpFilter.minVolumeThreshold}`;
        let fp = footprintCache.current.get(cacheKey);
        if (!fp) {
          fp = generateCandleFootprint(
            c, 
            level2Book, 
            activeFpFilter.imbalanceRatio, 
            activeFpFilter.imbalanceMode, 
            activeFpFilter.minVolumeThreshold
          );
          footprintCache.current.set(cacheKey, fp);
        }
        const delta = fp.totalDelta;
        candleDeltas[i] = delta;
        const absD = Math.abs(delta);
        if (absD > maxAbsDelta) maxAbsDelta = absD;
      }

      // 2. Draw table columns for each visible candle
      for (let i = 0; i < visibleCandles.length; i++) {
        const c = visibleCandles[i];
        const cellLeft = Math.round(i * candleWidth);
        const cellRight = Math.round((i + 1) * candleWidth);
        const cellW = cellRight - cellLeft;
        const cellCenterX = cellLeft + cellW / 2;
        const delta = candleDeltas[i];

        // Delta Heatmap Cell Background
        // Sky blue / navy for positive delta, maroon / burgundy for negative delta (matching reference image)
        let deltaBg = '#141c28';
        const ratio = Math.min(1, Math.abs(delta) / Math.max(1, maxAbsDelta));
        if (delta > 0) {
          if (ratio > 0.60) {
            deltaBg = '#5490d5'; // Vivid sky blue for large positive delta (e.g. 623)
          } else if (ratio > 0.28) {
            deltaBg = '#274b78'; // Medium navy/steel blue (e.g. 142)
          } else {
            deltaBg = '#142234'; // Subtle dark navy (e.g. 25)
          }
        } else if (delta < 0) {
          if (ratio > 0.60) {
            deltaBg = '#741e24'; // Deep burgundy/crimson for large negative delta (e.g. -173, -180)
          } else if (ratio > 0.28) {
            deltaBg = '#47181c'; // Medium maroon
          } else {
            deltaBg = '#251215'; // Dark subtle maroon (e.g. -27)
          }
        }

        ctx.fillStyle = deltaBg;
        ctx.fillRect(cellLeft, deltaRowY, cellW, barStatsRowHeight);

        // Volume Cell Background (Dark charcoal #1c2430 matching reference image)
        ctx.fillStyle = '#1c2430';
        ctx.fillRect(cellLeft, volRowY, cellW, barStatsRowHeight);

        // Vertical column separator line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cellRight, deltaRowY);
        ctx.lineTo(cellRight, deltaRowY + tableHeight);
        ctx.stroke();

        // Cell Text (Only render when cell is wide enough to avoid overlapping text)
        if (candleWidth >= 16) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 9.5px "JetBrains Mono", monospace';

          // Delta text (bold white)
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${delta}`, cellCenterX, deltaRowY + barStatsRowHeight / 2);

          // Volume text (light slate/white)
          ctx.fillStyle = '#e2e8f0';
          const volStr = formatCompactVolume(c.volume);
          ctx.fillText(volStr, cellCenterX, volRowY + barStatsRowHeight / 2);
        }
      }

      // 3. Horizontal table dividing lines
      // Top boundary
      ctx.beginPath();
      ctx.strokeStyle = '#283344';
      ctx.lineWidth = 1;
      ctx.moveTo(0, deltaRowY);
      ctx.lineTo(plotWidth, deltaRowY);
      ctx.stroke();

      // Dotted horizontal line separating Delta from Volume (matching reference image)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(0, volRowY);
      ctx.lineTo(plotWidth, volRowY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bottom boundary (separating Volume row from time axis)
      ctx.beginPath();
      ctx.strokeStyle = '#283344';
      ctx.lineWidth = 1;
      ctx.moveTo(0, timeAxisY);
      ctx.lineTo(plotWidth, timeAxisY);
      ctx.stroke();

      // 4. Pinned Left Header Column (matches reference image: dark slate pinned header with "Delta" and "Volume")
      ctx.fillStyle = '#263140';
      ctx.fillRect(0, deltaRowY, headerWidth, tableHeight);

      // Header labels
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('Delta', headerWidth / 2, deltaRowY + barStatsRowHeight / 2);
      ctx.fillText('Volume', headerWidth / 2, volRowY + barStatsRowHeight / 2);

      // Header dotted divider
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(0, volRowY);
      ctx.lineTo(headerWidth, volRowY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Header right border
      ctx.beginPath();
      ctx.strokeStyle = '#3a4759';
      ctx.lineWidth = 1.5;
      ctx.moveTo(headerWidth, deltaRowY);
      ctx.lineTo(headerWidth, deltaRowY + tableHeight);
      ctx.stroke();

      // 5. Right axis area next to bar stats table
      ctx.fillStyle = '#101723';
      ctx.fillRect(plotWidth, deltaRowY, rightAxisWidth, tableHeight);
      ctx.beginPath();
      ctx.strokeStyle = '#222f42';
      ctx.setLineDash([2, 2]);
      ctx.moveTo(plotWidth, volRowY);
      ctx.lineTo(plotWidth + rightAxisWidth, volRowY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.strokeStyle = '#222f42';
      ctx.moveTo(plotWidth, timeAxisY);
      ctx.lineTo(plotWidth + rightAxisWidth, timeAxisY);
      ctx.stroke();
    }

    // 11. Draw Interactive Crosshair & Cursor HUD
    if (hoverPos && hoverPos.x < plotWidth && hoverPos.y < plotHeight) {
      const cursorPrice = yToPrice(hoverPos.y);

      // Vertical dashed line down through plot and bar stats
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(hoverPos.x, 0);
      ctx.lineTo(hoverPos.x, timeAxisY);
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
        const sessionPrefix = 
          hovered.session === 'pre' ? 'PRE ' : 
          hovered.session === 'post' ? 'POST ' : 
          hovered.session === 'overnight' ? 'NIGHT ' : '';
        const badgeBg = 
          hovered.session === 'pre' ? '#ea580c' : // Orange
          hovered.session === 'post' ? '#2563eb' : // Blue
          hovered.session === 'overnight' ? '#9333ea' : // Purple
          '#334155';
        const timeText = `${sessionPrefix}${hovered.timeStr}`;
        ctx.font = '10px "JetBrains Mono", monospace';
        const badgeW = Math.max(64, ctx.measureText(timeText).width + 16);
        ctx.fillStyle = badgeBg;
        ctx.fillRect(hoverPos.x - badgeW / 2, timeAxisY + 2, badgeW, 18);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(timeText, hoverPos.x, timeAxisY + 11);
      }
    }

    // 12. Draw "AUTO" button at the bottom-right corner
    const isCustomScale = priceScaleFactor !== 1.0 || verticalPanOffset !== 0 || zoomLevel !== 1.0 || panOffset !== 0;
    const isOverAuto = hoverPos && hoverPos.x >= plotWidth && hoverPos.y >= timeAxisY;

    ctx.fillStyle = isOverAuto ? '#1e293b' : isCustomScale ? '#172554' : '#111827';
    ctx.fillRect(plotWidth + 4, timeAxisY + 2, rightAxisWidth - 8, timeAxisHeight - 4);
    ctx.strokeStyle = isCustomScale ? '#38bdf8' : '#232f46';
    ctx.strokeRect(plotWidth + 4, timeAxisY + 2, rightAxisWidth - 8, timeAxisHeight - 4);

    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isCustomScale ? '#38bdf8' : '#64748b';
    ctx.fillText('AUTO', plotWidth + rightAxisWidth / 2, timeAxisY + timeAxisHeight / 2);

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
        const sessionLabel = 
          activeCandle.session === 'pre' ? 'PRE-MKT' : 
          activeCandle.session === 'post' ? 'POST-MKT' : 
          activeCandle.session === 'overnight' ? 'OVERNIGHT' : 
          'REGULAR';
        const sessionBg = 
          activeCandle.session === 'pre' ? '#ea580c' : // Orange
          activeCandle.session === 'post' ? '#2563eb' : // Blue
          activeCandle.session === 'overnight' ? '#9333ea' : // Purple
          '#1e293b';
        const sessionTextColor = activeCandle.session === 'regular' ? '#94a3b8' : '#ffffff';
        const badgeW = activeCandle.session === 'overnight' ? 74 : 58;
        ctx.fillStyle = sessionBg;
        ctx.fillRect(hudX, hudY - 1, badgeW, 14);
        ctx.fillStyle = sessionTextColor;
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sessionLabel, hudX + badgeW / 2, hudY + 6);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = '11px "JetBrains Mono", monospace';
        hudX += badgeW + 8;
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

        const isFpActive = (timeframe === '1M' || timeframe === '5M' || timeframe === '10M') && candleWidth >= 38;
        const cacheKey = `${activeCandle.time}_${activeCandle.volume}_${activeCandle.close}_${activeCandle.high}_${activeCandle.low}_${activeFpFilter.imbalanceRatio}_${activeFpFilter.imbalanceMode}_${activeFpFilter.minVolumeThreshold}`;
        const activeFp = isFpActive 
          ? (footprintCache.current.get(cacheKey) || generateCandleFootprint(activeCandle, level2Book, activeFpFilter.imbalanceRatio, activeFpFilter.imbalanceMode, activeFpFilter.minVolumeThreshold)) 
          : null;

        let hoveredLevelInfo = '';
        let hoveredImbSide: 'buy' | 'sell' | null = null;
        let hoveredRatio = 0;
        if (isFpActive && activeFp && hoverPos) {
          for (const lvl of activeFp.levels) {
            const lvlY = priceToY(lvl.price);
            const tickH = Math.max(9, Math.abs(priceToY(lvl.price) - priceToY(lvl.price + activeFp.tickSize)));
            if (Math.abs(hoverPos.y - lvlY) <= tickH / 2) {
              if (lvl.isBuyImbalance) {
                hoveredImbSide = 'buy';
                hoveredRatio = lvl.buyImbalanceRatio || (lvl.askVolume / Math.max(1, lvl.bidVolume));
              } else if (lvl.isSellImbalance) {
                hoveredImbSide = 'sell';
                hoveredRatio = lvl.sellImbalanceRatio || (lvl.bidVolume / Math.max(1, lvl.askVolume));
              }
              hoveredLevelInfo = `$${lvl.price.toFixed(4)}: ${formatOrderFlowVolume(lvl.bidVolume)} × ${formatOrderFlowVolume(lvl.askVolume)}`;
              break;
            }
          }
        }

        const buyImbCount = activeFp ? activeFp.levels.filter(l => l.isBuyImbalance).length : 0;
        const sellImbCount = activeFp ? activeFp.levels.filter(l => l.isSellImbalance).length : 0;

        const cardW = isFpActive ? 286 : 236;
        const cardH = isFpActive ? (hoveredLevelInfo || buyImbCount > 0 || sellImbCount > 0 ? 80 : 64) : 46;
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

        // Footprint Order Flow Row 3 (Delta & POC readout)
        if (isFpActive && activeFp) {
          const rowY2 = cardY + 42;
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillStyle = activeFp.totalDelta >= 0 ? '#4ade80' : '#f87171';
          ctx.fillText(`Δ Delta: ${activeFp.totalDelta >= 0 ? '+' : ''}${formatOrderFlowVolume(activeFp.totalDelta)} (${activeFp.deltaPercent > 0 ? '+' : ''}${activeFp.deltaPercent}%)`, cardX + 8, rowY2);

          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`POC: $${activeFp.pocPrice.toFixed(4)}`, cardX + 175, rowY2);

          // Footprint Order Flow Row 4 (Imbalance info on hovered level or candle summary)
          if (hoveredLevelInfo || buyImbCount > 0 || sellImbCount > 0) {
            const rowY3 = cardY + 60;
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            if (hoveredLevelInfo) {
              if (hoveredImbSide === 'buy') {
                ctx.fillStyle = '#4ade80';
                ctx.fillText(`⚡ ${hoveredLevelInfo} [${hoveredRatio.toFixed(1)}x BUY IMBALANCE]`, cardX + 8, rowY3);
              } else if (hoveredImbSide === 'sell') {
                ctx.fillStyle = '#f87171';
                ctx.fillText(`⚡ ${hoveredLevelInfo} [${hoveredRatio.toFixed(1)}x SELL IMBALANCE]`, cardX + 8, rowY3);
              } else {
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`Lvl ${hoveredLevelInfo}`, cardX + 8, rowY3);
              }
            } else {
              ctx.fillStyle = '#f59e0b';
              ctx.fillText(`⚡ ${activeFpFilter.imbalanceRatio}x Imbalances: ${buyImbCount} Buys · ${sellImbCount} Sells`, cardX + 8, rowY3);
            }
          }
        }

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
    selectedDrawingId,
    hoveredDrawingId,
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
    panOffset,
    timeToX,
    candles,
    level2Book,
    showBarStats,
    barStatsTableHeight
  ]);

  // Handle Resize & Canvas Scaling via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      renderChart();
    });
    ro.observe(container);

    const handleWindowResize = () => {
      renderChart();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
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

    if (dragMode === 'drag-drawing') {
      setCursorStyle('ns-resize');
      return;
    }
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

    // Check if hovering over any drawing (horizontal line, fibonacci, etc.)
    if (x < plotWidth && y < plotHeight) {
      const nearDrawing = findDrawingNearPos(x, y, 8);
      if (nearDrawing) {
        if (nearDrawing.type === 'horizontal') {
          setCursorStyle('ns-resize');
          return;
        }
        if ((nearDrawing.type === 'fibonacci' || nearDrawing.type === 'trendline') && nearDrawing.points.length >= 2) {
          const p1 = nearDrawing.points[0];
          const p2 = nearDrawing.points[1];
          const x1 = timeToX(p1.time);
          const y1 = priceToY(p1.price);
          const x2 = timeToX(p2.time);
          const y2 = priceToY(p2.price);
          if (Math.hypot(x - x1, y - y1) <= 12 || Math.hypot(x - x2, y - y2) <= 12) {
            setCursorStyle('grab');
            return;
          }
        }
        setCursorStyle('pointer');
        return;
      }
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
    // Only primary button initiates drag/drawing
    if (e.button !== 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const plotWidth = rect.width - rightAxisWidth;
    const plotHeight = rect.height - bottomAxisHeight;
    const timeAxisY = plotHeight + barStatsTableHeight;

    // Check Auto button click
    if (x >= plotWidth && y >= timeAxisY) {
      handleResetAutoScale();
      return;
    }

    // Check Right Y-Axis drag (stretch/contract price)
    if (x >= plotWidth && y < timeAxisY) {
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

    // Check click on an EXISTING drawing first!
    if (x < plotWidth && y < plotHeight) {
      const nearDrawing = findDrawingNearPos(x, y, 8);
      if (nearDrawing) {
        setSelectedDrawingId(nearDrawing.id);
        if (nearDrawing.type === 'horizontal') {
          setDraggingDrawingId(nearDrawing.id);
          setDraggingPointIndex(0);
          setDragMode('drag-drawing');
          setDragStartPos({ x: e.clientX, y: e.clientY });
          setCursorStyle('ns-resize');
        } else if ((nearDrawing.type === 'fibonacci' || nearDrawing.type === 'trendline') && nearDrawing.points.length >= 2) {
          const p1 = nearDrawing.points[0];
          const p2 = nearDrawing.points[1];
          const x1 = timeToX(p1.time);
          const y1 = priceToY(p1.price);
          const x2 = timeToX(p2.time);
          const y2 = priceToY(p2.price);
          const dist1 = Math.hypot(x - x1, y - y1);
          const dist2 = Math.hypot(x - x2, y - y2);

          if (dist1 <= 14) {
            setDraggingDrawingId(nearDrawing.id);
            setDraggingPointIndex(0);
            setDragMode('drag-drawing');
            setDragStartPos({ x: e.clientX, y: e.clientY });
            setCursorStyle('grabbing');
          } else if (dist2 <= 14) {
            setDraggingDrawingId(nearDrawing.id);
            setDraggingPointIndex(1);
            setDragMode('drag-drawing');
            setDragStartPos({ x: e.clientX, y: e.clientY });
            setCursorStyle('grabbing');
          }
        }
        soundManager.playSelect();
        return;
      }
    }

    // If activeTool is horizontal and clicked on empty space:
    if (activeTool === 'horizontal') {
      const candleWidth = plotWidth / (visibleCandles.length || 1);
      const candleIdx = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor(x / candleWidth)));
      const targetCandle = visibleCandles[candleIdx];
      let targetPrice = yToPrice(y, rect.height);

      if (magnetMode && targetCandle) {
        const candidates = [targetCandle.high, targetCandle.low, targetCandle.open, targetCandle.close];
        let closest = candidates[0];
        let minDiff = Math.abs(targetPrice - candidates[0]);
        for (const cand of candidates) {
          const diff = Math.abs(targetPrice - cand);
          if (diff < minDiff) {
            minDiff = diff;
            closest = cand;
          }
        }
        targetPrice = closest;
      }

      const pointTime = targetCandle ? targetCandle.time : Date.now();
      const roundedPrice = Math.round(targetPrice * 10000) / 10000;
      const newId = `h_${Date.now()}`;
      onAddDrawing({
        id: newId,
        type: 'horizontal',
        points: [{ x, y, price: roundedPrice, time: pointTime }],
        color: '#38bdf8'
      });
      setSelectedDrawingId(newId);
      soundManager.playSelect();
      return;
    }

    // Deselect horizontal line if clicked on empty chart area
    if (activeTool === 'crosshair' || activeTool === 'pan' || activeTool === 'select') {
      setSelectedDrawingId(null);
    }

    // Other drawings in progress (trendline, fibonacci, ruler, brush)
    if (activeTool && activeTool !== 'crosshair' && activeTool !== 'pan' && activeTool !== 'select') {
      const candleWidth = plotWidth / (visibleCandles.length || 1);
      const candleIdx = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor(x / candleWidth)));
      const targetCandle = visibleCandles[candleIdx];
      let targetPrice = yToPrice(y, rect.height);

      if (magnetMode && targetCandle) {
        const distHigh = Math.abs(targetPrice - targetCandle.high);
        const distLow = Math.abs(targetPrice - targetCandle.low);
        targetPrice = distHigh < distLow ? targetCandle.high : targetCandle.low;
      }

      const pointTime = targetCandle ? targetCandle.time : Date.now();
      const newPoint = { x, y, price: Math.round(targetPrice * 10000) / 10000, time: pointTime };

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
    onZoomChange(Math.min(35.0, zoomLevel * 1.25));
  };
  const handleContractTime = () => {
    onZoomChange(Math.max(0.18, zoomLevel * 0.8));
  };

  // Window-level mouse move & mouse up listeners for smooth axis dragging and drawing dragging
  useEffect(() => {
    if (dragMode === 'none') return;

    const originalCursor = document.body.style.cursor;
    if (dragMode === 'scale-price') document.body.style.cursor = 'ns-resize';
    else if (dragMode === 'scale-time') document.body.style.cursor = 'ew-resize';
    else if (dragMode === 'pan-chart') document.body.style.cursor = 'grabbing';
    else if (dragMode === 'drag-drawing') document.body.style.cursor = 'ns-resize';

    const onWindowMouseMove = (e: MouseEvent) => {
      // 0. Dragging Horizontal Line or Fibonacci / Trendline Anchor
      if (dragMode === 'drag-drawing' && draggingDrawingId) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const plotWidth = rect.width - rightAxisWidth;
        const y = e.clientY - rect.top;
        const x = e.clientX - rect.left;
        let newPrice = yToPrice(y, rect.height);

        const candleWidth = plotWidth / (visibleCandles.length || 1);
        const candleIdx = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor(x / candleWidth)));
        const targetCandle = visibleCandles[candleIdx];

        // Snap to wick if magnetMode is ON
        if (magnetMode && targetCandle) {
          const candidates = [targetCandle.high, targetCandle.low, targetCandle.open, targetCandle.close];
          let closest = candidates[0];
          let minDiff = Math.abs(newPrice - candidates[0]);
          for (const cand of candidates) {
            const diff = Math.abs(newPrice - cand);
            if (diff < minDiff) {
              minDiff = diff;
              closest = cand;
            }
          }
          const pixelDiff = Math.abs(priceToY(newPrice, rect.height) - priceToY(closest, rect.height));
          if (pixelDiff <= 15) {
            newPrice = closest;
          }
        }

        const roundedPrice = Math.round(newPrice * 10000) / 10000;
        const currentDrawing = drawings.find(d => d.id === draggingDrawingId);
        if (currentDrawing && onUpdateDrawing) {
          if (currentDrawing.type === 'horizontal') {
            onUpdateDrawing({
              ...currentDrawing,
              points: [{
                ...currentDrawing.points[0],
                price: roundedPrice,
                y: priceToY(roundedPrice, rect.height)
              }]
            });
          } else if ((currentDrawing.type === 'fibonacci' || currentDrawing.type === 'trendline') && currentDrawing.points.length >= 2) {
            const updatedPoints = [...currentDrawing.points];
            const ptIdx = draggingPointIndex >= 0 && draggingPointIndex < updatedPoints.length ? draggingPointIndex : 0;
            const newTime = targetCandle ? targetCandle.time : updatedPoints[ptIdx].time;
            updatedPoints[ptIdx] = {
              ...updatedPoints[ptIdx],
              price: roundedPrice,
              time: newTime,
              x,
              y: priceToY(roundedPrice, rect.height)
            };
            onUpdateDrawing({
              ...currentDrawing,
              points: updatedPoints
            });
          }
        }
        return;
      }

      // 1. Dragging Right Price Axis: Vertical stretch/contract
      if (dragMode === 'scale-price') {
        const deltaY = e.clientY - dragStartPos.y;
        const factor = Math.exp(deltaY * 0.0065);
        const nextScale = Math.max(0.04, Math.min(15.0, startPriceScale * factor));
        setPriceScaleFactor(nextScale);
        return;
      }

      // 2. Dragging Bottom Time Axis: Horizontal stretch/contract
      if (dragMode === 'scale-time') {
        const deltaX = e.clientX - dragStartPos.x;
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
      setDraggingDrawingId(null);
      setDraggingPointIndex(0);
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
    draggingDrawingId,
    draggingPointIndex,
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
    bottomAxisHeight,
    drawings,
    magnetMode,
    priceToY,
    yToPrice,
    onUpdateDrawing
  ]);

  // Mouse Move Event Handler for Hover Crosshair & Line Detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoverPos({ x, y });

    const plotWidth = rect.width - rightAxisWidth;
    const plotHeight = rect.height - bottomAxisHeight;
    if (x < plotWidth && y < plotHeight) {
      const nearDrawing = findDrawingNearPos(x, y, 8);
      setHoveredDrawingId(nearDrawing ? nearDrawing.id : null);
    } else {
      setHoveredDrawingId(null);
    }

    updateCursor(x, y);
  };

  // Right-click Context Menu: Delete line/drawing under cursor
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nearDrawing = findDrawingNearPos(x, y, 8);
    if (nearDrawing) {
      e.preventDefault();
      if (onDeleteDrawing) {
        onDeleteDrawing(nearDrawing.id);
      }
      setSelectedDrawingId(null);
      setHoveredDrawingId(null);
      soundManager.playSelect();
    }
  };

  // Mouse Up & Leave Handlers
  const handleMouseUp = () => {
    setDragMode('none');
    setDraggingDrawingId(null);
    setDraggingPointIndex(0);
    if (hoverPos) {
      updateCursor(hoverPos.x, hoverPos.y);
    }
  };

  const handleMouseLeave = () => {
    if (dragMode === 'none') {
      setHoverPos(null);
      setHoveredDrawingId(null);
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
      onZoomChange(Math.min(35.0, zoomLevel * 1.15));
    } else {
      onZoomChange(Math.max(0.18, zoomLevel / 1.15));
    }
  };

  const isCustomScale = priceScaleFactor !== 1.0 || verticalPanOffset !== 0 || zoomLevel !== 1.0 || panOffset !== 20;

  // Selected or hovered horizontal line for quick actions pill
  const activeHorizontalDrawing = useMemo(() => {
    const targetId = selectedDrawingId || hoveredDrawingId;
    if (!targetId) return null;
    return drawings.find(d => d.id === targetId && d.type === 'horizontal') || null;
  }, [drawings, selectedDrawingId, hoveredDrawingId]);

  const activeHorizontalY = useMemo(() => {
    if (!activeHorizontalDrawing || !activeHorizontalDrawing.points[0]) return null;
    return priceToY(activeHorizontalDrawing.points[0].price);
  }, [activeHorizontalDrawing, priceToY]);

  // Selected or hovered fibonacci for quick action pill
  const activeFibDrawing = useMemo(() => {
    const targetId = selectedDrawingId || hoveredDrawingId;
    if (!targetId) return null;
    return drawings.find(d => d.id === targetId && d.type === 'fibonacci') || null;
  }, [drawings, selectedDrawingId, hoveredDrawingId]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[300px] overflow-hidden bg-[#0a0e16] select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        style={{ cursor: cursorStyle }}
        className="block touch-none"
      />

      {/* Floating Interactive Action Pill for Selected / Hovered Horizontal Line */}
      {activeHorizontalDrawing && activeHorizontalY !== null && activeHorizontalY >= 5 && activeHorizontalY <= ((containerRef.current?.clientHeight || 500) - bottomAxisHeight) && (
        <div
          style={{
            top: `${Math.max(10, Math.min(activeHorizontalY - 36, (containerRef.current?.clientHeight || 500) - bottomAxisHeight - 42))}px`,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          className="absolute z-30 flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d1422]/95 border border-sky-500/60 shadow-2xl backdrop-blur-md text-xs text-white pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-100"
        >
          <div 
            className="flex items-center gap-1.5 text-sky-400 font-mono text-[11px] font-semibold pr-1 cursor-ns-resize"
            title="Drag line vertically on chart or move handles"
          >
            <GripVertical className="w-3.5 h-3.5 text-slate-400" />
            <span>${activeHorizontalDrawing.points[0]?.price.toFixed(2)}</span>
          </div>
          <div className="h-3.5 w-px bg-slate-700" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDeleteDrawing) {
                onDeleteDrawing(activeHorizontalDrawing.id);
              }
              setSelectedDrawingId(null);
              setHoveredDrawingId(null);
              soundManager.playSelect();
            }}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-red-100 text-[11px] font-medium transition-colors cursor-pointer"
            title="Delete this horizontal line (or press Del / Backspace / Right-click line)"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDrawingId(null);
              setHoveredDrawingId(null);
            }}
            className="p-0.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Deselect line"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Floating Interactive Action Pill for Selected / Hovered Fibonacci Retracement */}
      {activeFibDrawing && activeFibDrawing.points.length >= 2 && (
        <div
          style={{
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          className="absolute z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d1422]/95 border border-sky-500/60 shadow-2xl backdrop-blur-md text-xs text-white pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center gap-1.5 text-sky-400 font-mono text-[11px] font-semibold pr-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>
              Fib ({activeFibDrawing.points[0].price < activeFibDrawing.points[1].price ? 'Downside 50%→110%' : 'Upside 50%→110%'})
            </span>
          </div>
          <div className="h-3.5 w-px bg-slate-700" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDeleteDrawing) {
                onDeleteDrawing(activeFibDrawing.id);
              }
              setSelectedDrawingId(null);
              setHoveredDrawingId(null);
              soundManager.playSelect();
            }}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-red-100 text-[11px] font-medium transition-colors cursor-pointer"
            title="Delete this Fibonacci Retracement (or press Del / Backspace / Right-click)"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDrawingId(null);
              setHoveredDrawingId(null);
            }}
            className="p-0.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Deselect"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Floating Scale & Axis Stretch/Contract Dock */}
      <div className={`absolute ${showBarStats ? 'bottom-[66px]' : 'bottom-9'} right-20 flex items-center bg-[#101726]/90 border border-[#223147] rounded-md backdrop-blur-xs shadow-xl divide-x divide-[#1e2b3e] text-xs z-20 overflow-hidden`}>
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

        {/* Footprint Indicator / Zoom to Footprint Button on 1M, 5M, 10M */}
        {(timeframe === '1M' || timeframe === '5M' || timeframe === '10M') && (
          <button
            onClick={() => {
              if (onZoomToFootprint) {
                onZoomToFootprint();
              } else {
                const targetZoom = Math.max(2.5, (candles.length || 1) / 14);
                onZoomChange(targetZoom);
                setPanOffset(0);
              }
            }}
            className={`px-2 py-1 font-mono text-[10px] font-semibold transition-all flex items-center gap-1.5 ${
              isFootprintZoomActive
                ? 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50'
                : 'text-sky-400 bg-sky-950/40 hover:bg-sky-900/50'
            }`}
            title={isFootprintZoomActive ? "Footprint Order Flow Active (Bid x Ask / Imbalances)" : "Zoom In to Footprint Order Flow View"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isFootprintZoomActive ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'}`} />
            <span>{isFootprintZoomActive ? 'FOOTPRINT ON' : 'ZOOM FOOTPRINT'}</span>
          </button>
        )}

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
        className={`absolute ${showBarStats ? 'bottom-[66px]' : 'bottom-9'} left-3 px-2.5 py-1 rounded bg-[#141d2c]/90 hover:bg-[#1d2a3f] text-slate-300 hover:text-white border border-[#23334a] text-[10px] font-mono backdrop-blur-xs transition-all flex items-center gap-1.5 z-20 shadow-md`}
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
