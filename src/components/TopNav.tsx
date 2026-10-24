import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Share2, 
  Maximize2, 
  Minimize2, 
  Layout, 
  Volume2, 
  VolumeX, 
  Compass, 
  Radio, 
  Pause, 
  Play,
  Check
} from 'lucide-react';
import { soundManager } from '../utils/sound';

interface TopNavProps {
  onOpenTour: () => void;
  isLive: boolean;
  onToggleLive: () => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  onShare: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenTour,
  isLive,
  onToggleLive,
  speed,
  onChangeSpeed,
  onShare
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Keep live market Eastern Time updated
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: SAT OCT 24 2026 6:14 PM ET
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'America/New_York'
      };
      const formatted = new Intl.DateTimeFormat('en-US', options).format(now);
      // Clean up string to uppercase SAT OCT 24 2026 6:14 PM ET
      setTimeStr(formatted.toUpperCase() + ' ET');
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSound = () => {
    soundManager.enabled = !soundManager.enabled;
    setSoundEnabled(soundManager.enabled);
    if (soundManager.enabled) {
      soundManager.playSelect();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleShareClick = () => {
    onShare();
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <header className="h-10 bg-[#0c1017] border-b border-[#1b2230] flex items-center justify-between px-3 text-xs shrink-0 select-none">
      {/* Left: Brand Icon & Ideas button */}
      <div className="flex items-center gap-2">
        {/* Stylized Logo mark like in screenshot */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white shadow-sm shadow-sky-900/50">
          <span className="font-bold text-[11px] tracking-tight">f</span>
        </div>

        {/* Ideas Button */}
        <button 
          onClick={onOpenTour}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161d2a] hover:bg-[#1f293b] text-slate-300 hover:text-white border border-[#232d40] transition-colors"
          title="Market Ideas & Strategies"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-[11px]">Ideas</span>
        </button>

        {/* Speed Controls for Live Ticks */}
        <div className="hidden sm:flex items-center ml-2 pl-2 border-l border-[#1f2838] gap-1">
          <button
            onClick={onToggleLive}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              isLive 
                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60' 
                : 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
            }`}
            title={isLive ? 'Pause Real-Time Tick Stream' : 'Resume Real-Time Tick Stream'}
          >
            {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isLive ? 'Live Streaming' : 'Paused'}</span>
          </button>

          {isLive && (
            <div className="flex items-center bg-[#131924] rounded border border-[#1f2838] overflow-hidden text-[10px]">
              {([1, 2, 5] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onChangeSpeed(s)}
                  className={`px-1.5 py-0.5 font-mono ${speed === s ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Chart Tour, Layout, Fullscreen, Share, Market Status, Clock */}
      <div className="flex items-center gap-2 sm:gap-3 text-slate-300">
        {/* Chart Tour */}
        <button
          onClick={onOpenTour}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-[11px] transition-colors shadow-sm shadow-sky-500/20"
        >
          <Compass className="w-3 h-3" />
          <span>Chart Tour</span>
        </button>

        {/* Layout Button */}
        <button 
          className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-[#161d2a] hover:bg-[#1e2738] text-slate-300 border border-[#232d40] text-[11px]"
          title="Chart Layout Options"
        >
          <Layout className="w-3 h-3 text-slate-400" />
          <span>Layout</span>
        </button>

        {/* Full Screen */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-[#161d2a] hover:bg-[#1e2738] text-slate-300 border border-[#232d40] text-[11px]"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3 text-slate-400" />}
          <span>Full Screen</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShareClick}
          className="flex items-center gap-1 px-2 py-1 rounded bg-[#161d2a] hover:bg-[#1e2738] text-slate-300 border border-[#232d40] text-[11px]"
          title="Share or Export Chart"
        >
          {copiedShare ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3 text-slate-400" />}
          <span>{copiedShare ? 'Copied' : 'Share'}</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          className={`p-1 rounded border border-[#232d40] transition-colors ${
            soundEnabled ? 'text-sky-400 bg-sky-950/40' : 'text-slate-500 bg-[#161d2a] hover:text-slate-300'
          }`}
          title={soundEnabled ? 'Mute Market Sounds' : 'Enable Real-time Tick Sound'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Market Status (matches the red dot + Markets Closed / Live in screenshot) */}
        <div 
          onClick={onToggleLive}
          className="flex items-center gap-1.5 cursor-pointer pl-1 text-[11px]"
          title="Click to toggle Live/Closed simulation state"
        >
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="font-medium text-slate-300">
            {isLive ? 'Markets Live' : 'Markets Closed'}
          </span>
        </div>

        {/* Live Eastern Time Clock */}
        <div className="hidden lg:block font-mono text-[11px] text-slate-400 pl-1 tracking-tight">
          {timeStr}
        </div>
      </div>
    </header>
  );
};
