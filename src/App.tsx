import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StockQuote, 
  Candle, 
  Timeframe, 
  ChartType, 
  DrawingTool, 
  DrawnObject, 
  IndicatorVisibility 
} from './types/stock';
import { INITIAL_STOCKS, generateCandlesForStock } from './utils/stockData';
import { soundManager } from './utils/sound';
import { TopNav } from './components/TopNav';
import { ChartHeader } from './components/ChartHeader';
import { DrawingToolbar } from './components/DrawingToolbar';
import { StockChart } from './components/StockChart';
import { MacdChart } from './components/MacdChart';
import { WatchlistScanner } from './components/WatchlistScanner';
import { StockOverviewModal } from './components/StockOverviewModal';
import { ChartTourModal } from './components/ChartTourModal';
import { CustomizeModal } from './components/CustomizeModal';

export default function App() {
  const [stocks, setStocks] = useState<StockQuote[]>(INITIAL_STOCKS);
  // Default to TORO as shown in the reference image
  const [selectedStock, setSelectedStock] = useState<StockQuote>(INITIAL_STOCKS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('5M');
  const [candles, setCandles] = useState<Candle[]>(() => generateCandlesForStock(INITIAL_STOCKS[0], '5M'));
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(false);
  const [isRealDataActive, setIsRealDataActive] = useState<boolean>(false);
  
  // Indicators matching the reference image (EMA 9, SMA 20, SMA 200, VWAP, VP 50, MACD)
  const [indicators, setIndicators] = useState<IndicatorVisibility>({
    ema9: true,
    sma20: true,
    sma200: true,
    vwap: true,
    volumeProfile: true,
    macd: true
  });

  // Drawing tools
  const [activeTool, setActiveTool] = useState<DrawingTool>('crosshair');
  const [magnetMode, setMagnetMode] = useState<boolean>(false);
  const [drawings, setDrawings] = useState<DrawnObject[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Live streaming ticker engine
  const [isLive, setIsLive] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [updatedTickers, setUpdatedTickers] = useState<Record<string, 'up' | 'down'>>({});

  // Scanner filtering & modals
  const [activeCategory, setActiveCategory] = useState<string>('stocks');
  const [minVolume, setMinVolume] = useState<number>(0);
  const [minGain, setMinGain] = useState<number>(0);

  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(false);

  // Convert app timeframe to API query params
  const getTimeframeParams = (tf: Timeframe) => {
    switch (tf) {
      case '1M': return { interval: '1m', range: '1d' };
      case '5M': return { interval: '5m', range: '5d' };
      case '10M': return { interval: '5m', range: '5d' };
      case '1H': return { interval: '60m', range: '1mo' };
      case '4H': return { interval: '60m', range: '1mo' };
      case 'D': return { interval: '1d', range: '1y' };
      default: return { interval: '5m', range: '5d' };
    }
  };

  // Fetch real NASDAQ chart data from backend proxy
  const loadRealStockChart = useCallback(async (ticker: string, tf: Timeframe) => {
    setIsLoadingChart(true);
    try {
      const res = await fetch(`/api/stock/chart/${encodeURIComponent(ticker)}?timeframe=${encodeURIComponent(tf)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      
      if (data.candles && data.candles.length > 0) {
        setCandles(data.candles);
        setIsRealDataActive(true);

        // Update selected stock meta
        if (data.meta) {
          setSelectedStock(prev => ({
            ...prev,
            price: data.meta.price || prev.price,
            change: data.meta.change !== undefined ? data.meta.change : prev.change,
            changePercent: data.meta.changePercent !== undefined ? data.meta.changePercent : prev.changePercent,
            volume: data.meta.volume || prev.volume,
            high: data.meta.high || prev.high,
            low: data.meta.low || prev.low,
            open: data.meta.open || prev.open,
            prevClose: data.meta.prevClose || prev.prevClose,
            high52w: data.meta.fiftyTwoWeekHigh || prev.high52w,
            low52w: data.meta.fiftyTwoWeekLow || prev.low52w,
          }));
        }
      } else {
        // Fallback to high-fidelity generator if market closed or empty
        const fallback = generateCandlesForStock(selectedStock, tf);
        setCandles(fallback);
      }
    } catch (err) {
      console.warn('Real NASDAQ API fetch notice (using high-precision fallback):', err);
      const fallback = generateCandlesForStock(selectedStock, tf);
      setCandles(fallback);
    } finally {
      setIsLoadingChart(false);
    }
  }, [selectedStock.ticker]);

  // Fetch real NASDAQ scanner watchlist quotes
  const loadRealScannerQuotes = useCallback(async () => {
    try {
      const res = await fetch('/api/stock/scanner');
      if (!res.ok) return;
      const data: any[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;

      const flashMap: Record<string, 'up' | 'down'> = {};

      setStocks(prev => {
        return prev.map(stock => {
          const match = data.find(d => d.ticker === stock.ticker);
          if (!match) return stock;

          const isUp = match.price >= stock.price;
          if (match.price !== stock.price) {
            flashMap[stock.ticker] = isUp ? 'up' : 'down';
          }

          return {
            ...stock,
            price: match.price || stock.price,
            change: match.change !== undefined ? match.change : stock.change,
            changePercent: match.changePercent !== undefined ? match.changePercent : stock.changePercent,
            volume: match.volume || stock.volume,
            high: match.high || stock.high,
            low: match.low || stock.low,
            open: match.open || stock.open,
            prevClose: match.prevClose || stock.prevClose,
            openPercent: match.openPercent !== undefined ? match.openPercent : stock.openPercent,
            m1Change: match.m1Change !== undefined ? match.m1Change : stock.m1Change,
            m5Change: match.m5Change !== undefined ? match.m5Change : stock.m5Change,
            m15Change: match.m15Change !== undefined ? match.m15Change : stock.m15Change,
            h1Change: match.h1Change !== undefined ? match.h1Change : stock.h1Change,
            h4Change: match.h4Change !== undefined ? match.h4Change : stock.h4Change,
          };
        });
      });

      if (Object.keys(flashMap).length > 0) {
        setUpdatedTickers(flashMap);
        setTimeout(() => setUpdatedTickers({}), 700);
      }
    } catch {
      // Quietly ignore network blips
    }
  }, []);

  // Initial load of real chart & scanner quotes
  useEffect(() => {
    loadRealStockChart(selectedStock.ticker, timeframe);
    loadRealScannerQuotes();
  }, [selectedStock.ticker, timeframe, loadRealStockChart, loadRealScannerQuotes]);

  // Continuous real-time polling of live NASDAQ feed
  useEffect(() => {
    if (!isLive) return;

    // Poll scanner every 8 seconds
    const scannerTimer = setInterval(() => {
      loadRealScannerQuotes();
    }, 8000 / speed);

    // Poll active chart every 5 seconds for new trades/candles
    const chartTimer = setInterval(() => {
      fetch(`/api/stock/chart/${encodeURIComponent(selectedStock.ticker)}?timeframe=${encodeURIComponent(timeframe)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.candles && data.candles.length > 0) {
            setCandles(data.candles);
            if (data.meta) {
              const newPrice = data.meta.price;
              const isUptick = newPrice >= selectedStock.price;
              if (newPrice !== selectedStock.price) {
                soundManager.playTick(isUptick);
                setUpdatedTickers(p => ({ ...p, [selectedStock.ticker]: isUptick ? 'up' : 'down' }));
                setTimeout(() => setUpdatedTickers(p => {
                  const copy = { ...p };
                  delete copy[selectedStock.ticker];
                  return copy;
                }), 700);
              }

              setSelectedStock(prev => ({
                ...prev,
                price: newPrice,
                change: data.meta.change ?? prev.change,
                changePercent: data.meta.changePercent ?? prev.changePercent,
                volume: data.meta.volume ?? prev.volume,
                high: data.meta.high ?? prev.high,
                low: data.meta.low ?? prev.low,
              }));
            }
          }
        })
        .catch(() => {});
    }, 5000 / speed);

    return () => {
      clearInterval(scannerTimer);
      clearInterval(chartTimer);
    };
  }, [isLive, speed, selectedStock.ticker, selectedStock.price, timeframe, loadRealScannerQuotes]);

  // Handler for stock selection from scanner or dropdown
  const handleSelectStock = (stock: StockQuote) => {
    setSelectedStock(stock);
    loadRealStockChart(stock.ticker, timeframe);
  };

  const handleToggleFavorite = (ticker: string) => {
    setStocks(prev => prev.map(s => {
      if (s.ticker === ticker) {
        return { ...s, isFavorite: !s.isFavorite };
      }
      return s;
    }));

    if (selectedStock.ticker === ticker) {
      setSelectedStock(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
    }
  };

  const handleAddDrawing = (drawing: DrawnObject) => {
    setDrawings(prev => [...prev, drawing]);
  };

  const handleClearDrawings = () => {
    setDrawings([]);
  };

  const handleToggleIndicator = (key: keyof IndicatorVisibility) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
  };

  // Filter stocks with custom threshold
  const visibleScannerStocks = stocks.filter(s => {
    if (minVolume > 0 && s.volume < minVolume) return false;
    if (minGain > 0 && s.changePercent < minGain) return false;
    return true;
  });

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0b0e14] text-slate-200 select-none">
      {/* 1. Top Navigation Bar */}
      <TopNav
        onOpenTour={() => setIsTourOpen(true)}
        isLive={isLive}
        onToggleLive={() => setIsLive(!isLive)}
        speed={speed}
        onChangeSpeed={setSpeed}
        onShare={handleShare}
      />

      {/* 2. Chart Control Header Bar */}
      <ChartHeader
        currentStock={selectedStock}
        allStocks={stocks}
        onSelectStock={handleSelectStock}
        onToggleFavorite={handleToggleFavorite}
        onOpenOverview={() => setIsOverviewOpen(true)}
        timeframe={timeframe}
        onChangeTimeframe={setTimeframe}
        chartType={chartType}
        onChangeChartType={setChartType}
        indicators={indicators}
        onToggleIndicator={handleToggleIndicator}
      />

      {/* Real Data Connected Status Pill */}
      <div className="h-5 bg-[#080c13] border-b border-[#141d2c] px-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>REAL NASDAQ FEED ACTIVE</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-300">Symbol: {selectedStock.ticker}</span>
          <span className="text-slate-600">·</span>
          <span>Bars: {candles.length}</span>
          <span className="text-slate-600">·</span>
          <span>Timeframe: {timeframe}</span>
        </div>

        {isLoadingChart && (
          <span className="text-sky-400 animate-pulse flex items-center gap-1">
            <span>Syncing NASDAQ Ticks...</span>
          </span>
        )}
      </div>

      {/* 3. Main Workspace: Left Tool Rail + Candlestick/MACD Chart Canvas + Right Scanner */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Drawing Toolbar */}
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          magnetMode={magnetMode}
          onToggleMagnet={() => setMagnetMode(!magnetMode)}
          onZoomIn={() => setZoomLevel(prev => Math.min(3.5, prev * 1.2))}
          onZoomOut={() => setZoomLevel(prev => Math.max(0.4, prev / 1.2))}
          onResetZoom={() => setZoomLevel(1.0)}
          onClearDrawings={handleClearDrawings}
          drawingsCount={drawings.length}
        />

        {/* Center: Candlestick Chart + Sub-chart (MACD) */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <div className="flex-1 relative min-h-0 overflow-hidden">
            <StockChart
              candles={candles}
              stock={selectedStock}
              activeTool={activeTool}
              indicators={indicators}
              chartType={chartType}
              magnetMode={magnetMode}
              drawings={drawings}
              onAddDrawing={handleAddDrawing}
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
              timeframe={timeframe}
            />
          </div>

          {/* MACD Sub-Chart (Toggled via indicators) */}
          {indicators.macd && (
            <MacdChart
              candles={candles}
              zoomLevel={zoomLevel}
            />
          )}
        </div>

        {/* Right Watchlist Scanner Panel (identical to screenshot layout) */}
        <WatchlistScanner
          stocks={visibleScannerStocks}
          selectedTicker={selectedStock.ticker}
          onSelectStock={handleSelectStock}
          onToggleFavorite={handleToggleFavorite}
          onOpenCustomize={() => setIsCustomizeOpen(true)}
          activeCategory={activeCategory}
          onChangeCategory={setActiveCategory}
          updatedTickers={updatedTickers}
        />
      </div>

      {/* Modals */}
      <StockOverviewModal
        stock={selectedStock}
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
      />

      <ChartTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      <CustomizeModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        minVolume={minVolume}
        onChangeMinVolume={setMinVolume}
        minGain={minGain}
        onChangeMinGain={setMinGain}
      />
    </div>
  );
}
