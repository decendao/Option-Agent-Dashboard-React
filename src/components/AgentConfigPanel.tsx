import React, { useState } from 'react';
import { MonitorConfig } from '../types';
import { SUPPORTED_TICKERS } from '../data/mockData';
import { Settings, Check, RefreshCw } from 'lucide-react';

interface AgentConfigPanelProps {
  config: MonitorConfig;
  onSaveConfig: (updatedConfig: MonitorConfig) => void;
}

export const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({ config, onSaveConfig }) => {
  const [ticker, setTicker] = useState(config.selectedTicker);
  const [minScore, setMinScore] = useState(config.minOpportunityScore);
  const [minPremium, setMinPremium] = useState(config.minPremium);
  const [maxDrawdown, setMaxDrawdown] = useState(config.maxDrawdownLimit);
  const [maxPosition, setMaxPosition] = useState(config.maxPositionSize);
  const [deltaMin, setDeltaMin] = useState(config.targetDeltaMin);
  const [deltaMax, setDeltaMax] = useState(config.targetDeltaMax);
  const [scanSpeed, setScanSpeed] = useState(config.scanIntervalMs);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      selectedTicker: ticker,
      minOpportunityScore: minScore,
      minPremium,
      maxDrawdownLimit: maxDrawdown,
      maxPositionSize: maxPosition,
      targetDeltaMin: deltaMin,
      targetDeltaMax: deltaMax,
      scanIntervalMs: scanSpeed,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div id="agent-config-panel" className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
        <h2 className="font-sans font-bold text-white flex items-center gap-2 text-base">
          <Settings size={16} className="text-indigo-400" />
          Scanner Engine Strategy Constraints
        </h2>
        {savedSuccess && (
          <span className="rounded-xl bg-emerald-500/15 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-emerald-300 border border-emerald-500/20 flex items-center gap-1 animate-fade-in shadow-[0_0_10px_rgba(16,185,129,0.1)] font-semibold">
            <Check size={11} /> Saved
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ticker Selector pills */}
        <div className="space-y-2">
          <label className="block font-mono text-[9px] uppercase tracking-widest text-slate-500 font-extrabold">
            TARGET STOCK SYMBOL SELECTION
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SUPPORTED_TICKERS.map((t) => (
              <button
                key={t}
                type="button"
                id={`btn-ticker-${t}`}
                onClick={() => setTicker(t)}
                className={`rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold border transition-all cursor-pointer ${
                  ticker === t
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Numerical Grid parameters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {/* Min Opportunity score filter */}
          <div className="space-y-1">
            <label className="block font-mono text-[9px] uppercase tracking-widest text-slate-500 font-extrabold">
              MIN SCORE
            </label>
            <input
              id="config-min-score"
              type="number"
              min={1}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl bg-black/35 border border-white/5 py-1.5 px-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-white/15 transition-colors"
            />
          </div>

          {/* Min Premium filter */}
          <div className="space-y-1">
            <label className="block font-mono text-[9px] uppercase tracking-widest text-slate-500 font-extrabold">
              MIN BID ($)
            </label>
            <input
              id="config-min-premium"
              type="number"
              min={0.01}
              max={10.0}
              step={0.01}
              value={minPremium}
              onChange={(e) => setMinPremium(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl bg-black/35 border border-white/5 py-1.5 px-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-white/15 transition-colors"
            />
          </div>

          {/* Max Position Capital count */}
          <div className="space-y-1">
            <label className="block font-mono text-[9px] uppercase tracking-widest text-slate-500 font-extrabold">
              MAX ORDER
            </label>
            <input
              id="config-max-size"
              type="number"
              min={1}
              max={100}
              value={maxPosition}
              onChange={(e) => setMaxPosition(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl bg-black/35 border border-white/5 py-1.5 px-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-white/15 transition-colors"
            />
          </div>

          {/* Max Drawdown limit */}
          <div className="space-y-1">
            <label className="block font-mono text-[9px] uppercase tracking-widest text-slate-500 font-extrabold">
              STOP LIMIT (%)
            </label>
            <input
              id="config-max-drawdown"
              type="number"
              min={1}
              max={99}
              value={maxDrawdown}
              onChange={(e) => setMaxDrawdown(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl bg-black/35 border border-white/5 py-1.5 px-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-white/15 transition-colors"
            />
          </div>
        </div>

        {/* Advanced Slider Brackets: Delta targets + Active scan speeds */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
          
          {/* Target Delta boundaries */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-black/25 border border-white/5">
            <span className="block font-sans text-[11px] text-slate-400 font-medium">
              Target Delta Search Bracket (Δ)
            </span>
            <div className="flex gap-3 text-xs font-mono">
              <div className="flex-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">MIN DELTA</span>
                <input
                  id="config-delta-min"
                  type="range"
                  min={0.05}
                  max={0.50}
                  step={0.01}
                  value={deltaMin}
                  onChange={(e) => setDeltaMin(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/5 border border-white/5 rounded cursor-pointer accent-emerald-400"
                />
                <span className="text-emerald-300 font-extrabold block mt-0.5">{deltaMin.toFixed(2)}</span>
              </div>
              <div className="flex-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">MAX DELTA</span>
                <input
                  id="config-delta-max"
                  type="range"
                  min={0.51}
                  max={0.95}
                  step={0.01}
                  value={deltaMax}
                  onChange={(e) => setDeltaMax(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/5 border border-white/5 rounded cursor-pointer accent-indigo-400"
                />
                <span className="text-indigo-300 font-extrabold block mt-0.5">{deltaMax.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Scan speeds interval range */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-black/25 border border-white/5">
            <div className="flex justify-between items-center">
              <span className="block font-sans text-[11px] text-slate-400 font-medium">
                Broker Feed Poll Frequency
              </span>
              <span className="font-mono text-xs text-amber-300 font-extrabold">
                {scanSpeed}ms
              </span>
            </div>
            <input
              id="config-scan-speed"
              type="range"
              min={1000}
              max={8000}
              step={200}
              value={scanSpeed}
              onChange={(e) => setScanSpeed(parseInt(e.target.value))}
              className="w-full h-1 bg-white/5 border border-white/5 rounded cursor-pointer mt-2 accent-amber-400"
            />
            <span className="font-mono text-[9px] text-slate-500 block mt-1 leading-normal">
              *Lower frequency increases API feed strain, higher values throttle calculation buffers.
            </span>
          </div>

        </div>

        {/* Submit action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            id="save-config-btn"
            className="rounded-xl bg-indigo-500 hover:bg-indigo-455 px-5 py-2.5 font-sans text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/20 transition-all"
          >
            <RefreshCw size={12} className={savedSuccess ? 'animate-spin' : ''} />
            Commit Strategy Settings
          </button>
        </div>
      </form>
    </div>
  );
};
