import React, { useState, useEffect } from 'react';
import { OptionContract, Greeks, OptionType } from '../types';
import { calculateBlackScholes, generatePayoffDetails } from '../utils/blackScholes';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Sliders, HelpCircle, TrendingUp, Info } from 'lucide-react';

interface BlackScholesSimulatorProps {
  selectedContract: OptionContract | null;
  spotPrice: number;
}

export const BlackScholesSimulator: React.FC<BlackScholesSimulatorProps> = ({
  selectedContract,
  spotPrice,
}) => {
  // Simulator State: Bound to selected contract or default
  const [ticker, setTicker] = useState('NVDA');
  const [type, setType] = useState<OptionType>('CALL');
  const [strike, setStrike] = useState(125);
  const [underlying, setUnderlying] = useState(125.4);
  const [days, setDays] = useState(19);
  const [iv, setIv] = useState(0.42); // 42%
  const [rate, setRate] = useState(0.045); // 4.5%
  const [premium, setPremium] = useState(3.5);

  const [activeTab, setActiveTab] = useState<'PAYOFF' | 'GREEKS'>('PAYOFF');

  // Keep simulator in sync when user selects a different contract from the grid
  useEffect(() => {
    if (selectedContract) {
      setTicker(selectedContract.ticker);
      setType(selectedContract.type);
      setStrike(selectedContract.strike);
      setUnderlying(selectedContract.underlyingPrice);
      setDays(selectedContract.daysToExpiration);
      setIv(selectedContract.impliedVolatility);
      setPremium(selectedContract.lastPrice);
    }
  }, [selectedContract]);

  // Recalculate values based on current sliders
  const { price, greeks } = calculateBlackScholes(underlying, strike, days, rate, iv, type);
  
  // Calculate payoff data points for charting
  const payoffData = generatePayoffDetails(underlying, strike, premium, days, rate, iv, type);

  // Generate dynamic Greek curves for spot range
  const greekCurveData = (() => {
    const points = [];
    const minS = Math.round(strike * 0.75);
    const maxS = Math.round(strike * 1.25);
    const step = Math.max(1, Math.round((maxS - minS) / 30));

    for (let s = minS; s <= maxS; s += step) {
      const calc = calculateBlackScholes(s, strike, days, rate, iv, type);
      points.push({
        spotPrice: s,
        delta: calc.greeks.delta,
        gamma: calc.greeks.gamma * 100, // scaled for chart display
        vega: calc.greeks.vega * 10,   // scaled for chart display
        theta: calc.greeks.theta,
      });
    }
    return points;
  })();

  const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;
  const formatGreekValue = (val: number) => val.toFixed(4);

  return (
    <div id="black-scholes-simulator" className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-2xl">
      {/* Title */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-5 mb-5">
        <div>
          <h2 className="font-sans font-bold text-white flex items-center gap-2 text-base">
            <Sliders size={18} className="text-emerald-400 shadow-[0_0_8px_#34d399]" />
            Quant Greek & Payoff Sandbox (Black-Scholes)
          </h2>
          <p className="font-sans text-xs text-slate-400 mt-1">
            Simulate real-time Greek sensitivities and pricing models by adjusting variable parameters below.
          </p>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 self-start">
          <button
            id="tab-payoff"
            onClick={() => setActiveTab('PAYOFF')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PAYOFF' ? 'bg-white/10 text-emerald-300 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Payoff Curve
          </button>
          <button
            id="tab-greeks"
            onClick={() => setActiveTab('GREEKS')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'GREEKS' ? 'bg-white/10 text-indigo-300 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Greek Distribution
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Control Column: 4/12 */}
        <div className="lg:col-span-4 space-y-4 bg-black/25 p-5 rounded-2xl border border-white/5 shadow-inner">
          <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1">
            SANDBOX INPUT VARIABLES
          </span>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Security / Contract</span>
            <span className="text-indigo-300 font-extrabold uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
              {ticker} ${strike} {type}
            </span>
          </div>

          {/* Underling Spot Price Slider */}
          <div className="space-y-1.5 pt-1.5 border-t border-white/5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                Underlying Spot (S)
                <span className="group relative">
                  <HelpCircle size={11} className="text-slate-550 cursor-help" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded bg-slate-950 p-2 text-[10px] text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 border border-slate-800 z-50">
                    The current trading price of the asset.
                  </span>
                </span>
              </span>
              <span className="text-emerald-300 font-bold">${underlying.toFixed(2)}</span>
            </div>
            <input
              id="slider-underlying"
              type="range"
              min={Math.round(strike * 0.7)}
              max={Math.round(strike * 1.3)}
              step={0.1}
              value={underlying}
              onChange={(e) => setUnderlying(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/5 border border-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* Implied Volatility (IV) Slider */}
          <div className="space-y-1.5 pt-1.5 border-t border-white/5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                Implied Volatility (σ)
                <span className="group relative">
                  <HelpCircle size={11} className="text-slate-550 cursor-help" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded bg-slate-950 p-2 text-[10px] text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 border border-slate-800 z-50">
                    Symmetric pricing expectation of asset swings.
                  </span>
                </span>
              </span>
              <span className="text-indigo-300 font-bold">{formatPercent(iv)}</span>
            </div>
            <input
              id="slider-iv"
              type="range"
              min={0.05}
              max={1.5}
              step={0.01}
              value={iv}
              onChange={(e) => setIv(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/5 border border-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
          </div>

          {/* Days to Expiration Slider */}
          <div className="space-y-1.5 pt-1.5 border-t border-white/5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                Days to Expiration (T)
                <span className="group relative">
                  <HelpCircle size={11} className="text-slate-550 cursor-help" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded bg-slate-950 p-2 text-[10px] text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 border border-slate-800 z-50">
                    Calendar days until the contract expires.
                  </span>
                </span>
              </span>
              <span className="text-amber-300 font-bold">{days} days</span>
            </div>
            <input
              id="slider-days"
              type="range"
              min={1}
              max={90}
              step={1}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="w-full h-1 bg-white/5 border border-white/5 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Sunk Trade Premium Cost (Premium Entry) */}
          <div className="space-y-1.5 pt-1.5 border-t border-white/5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Trade Entry Premium</span>
              <span className="text-rose-300 font-bold">${premium.toFixed(2)}</span>
            </div>
            <input
              id="slider-premium"
              type="range"
              min={0.05}
              max={30.0}
              step={0.05}
              value={premium}
              onChange={(e) => setPremium(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/5 border border-white/5 rounded-lg appearance-none cursor-pointer accent-rose-400"
            />
          </div>

          {/* Free Risk Rate (interest policy rate) */}
          <div className="space-y-1.5 pt-1.5 border-t border-white/5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Risk-free Rate (r)</span>
              <span className="text-slate-200">{formatPercent(rate)}</span>
            </div>
            <input
              id="slider-rate"
              type="range"
              min={0.01}
              max={0.12}
              step={0.005}
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/5 border border-white/5 rounded-lg appearance-none cursor-pointer accent-slate-400"
            />
          </div>
        </div>

        {/* Output Metrics & Charts Column: 8/12 */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          
          {/* Output Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="rounded-2xl bg-black/35 p-3.5 border border-white/5 text-center hover:scale-[1.03] transition-all duration-200">
              <div className="font-mono text-sm font-extrabold text-white">${price.toFixed(2)}</div>
              <div className="font-sans text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">BS PRICE</div>
            </div>
            <div className="rounded-2xl bg-black/35 p-3.5 border border-white/5 text-center hover:scale-[1.03] transition-all duration-200">
              <div className="font-mono text-sm font-extrabold text-emerald-400">{formatGreekValue(greeks.delta)}</div>
              <div className="font-sans text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">DELTA (Δ)</div>
            </div>
            <div className="rounded-2xl bg-black/35 p-3.5 border border-white/5 text-center hover:scale-[1.03] transition-all duration-200">
              <div className="font-mono text-sm font-extrabold text-teal-400">{formatGreekValue(greeks.gamma)}</div>
              <div className="font-sans text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">GAMMA (Γ)</div>
            </div>
            <div className="rounded-2xl bg-black/35 p-3.5 border border-white/5 text-center hover:scale-[1.03] transition-all duration-200">
              <div className="font-mono text-sm font-extrabold text-indigo-400">{formatGreekValue(greeks.vega)}</div>
              <div className="font-sans text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">VEGA (V)</div>
            </div>
            <div className="rounded-2xl bg-black/35 p-3.5 border border-white/5 text-center col-span-2 sm:col-span-1 hover:scale-[1.03] transition-all duration-200">
              <div className="font-mono text-sm font-extrabold text-orange-400">{formatGreekValue(greeks.theta)}</div>
              <div className="font-sans text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">THETA (Θ)</div>
            </div>
          </div>

          {/* Dynamic Recharts Rendering Container */}
          <div className="rounded-2xl border border-white/5 bg-black/40 p-4 h-[240px] flex items-center justify-center shadow-inner">
            {activeTab === 'PAYOFF' ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={payoffData} margin={{ top: 10, right: 10, left: -20, bottom: -5 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="underlyingPrice" stroke="#64748b" tickLine={false} style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748b" tickLine={false} style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(9,13,22,0.9)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontFamily: 'monospace', fontSize: '11px', color: '#fff' }}
                    labelFormatter={(label) => `Stock Price: $${label}`}
                    formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Profit / Loss']}
                  />
                  <ReferenceLine x={strike} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Strike', fill: '#94a3b8', position: 'insideTopLeft', fontSize: 10 }} />
                  <ReferenceLine x={underlying} stroke="#34d399" strokeDasharray="3 3" label={{ value: 'Spot', fill: '#34d399', position: 'insideTopRight', fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="#f43f5e" strokeWidth={1} />
                  <Area type="monotone" dataKey="expirationPayoff" fill="url(#payoffGrad)" stroke="none" />
                  <Line type="monotone" dataKey="currentValue" stroke="#10b981" strokeWidth={2.5} dot={false} name="Current P&L" />
                  <Line type="monotone" dataKey="expirationPayoff" stroke="#475569" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="P&L at Expiry" />
                  {/* Gradient Background */}
                  <defs>
                    <linearGradient id="payoffGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={greekCurveData} margin={{ top: 10, right: 10, left: -20, bottom: -5 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="spotPrice" stroke="#64748b" tickLine={false} style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748b" tickLine={false} style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(9,13,22,0.9)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontFamily: 'monospace', fontSize: '11px', color: '#fff' }}
                    labelFormatter={(label) => `Stock Spot: $${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'sans-serif', paddingTop: 8 }} />
                  <ReferenceLine x={underlying} stroke="#34d399" label={{ value: 'Spot', fill: '#34d399', fontSize: 10 }} />
                  <Line type="monotone" dataKey="delta" stroke="#34d399" strokeWidth={1.8} dot={false} name="Delta (Δ)" />
                  <Line type="monotone" dataKey="gamma" stroke="#2dd4bf" strokeWidth={1.8} dot={false} name="Gamma (x100)" />
                  <Line type="monotone" dataKey="vega" stroke="#6366f1" strokeWidth={1.8} dot={false} name="Vega (x10)" />
                  <Line type="monotone" dataKey="theta" stroke="#f97316" strokeWidth={1.8} dot={false} name="Theta (Θ)" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Informational Tip */}
          <div className="flex items-center gap-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 p-3">
            <Info size={14} className="text-indigo-300 mt-0.5 shrink-0" />
            <p className="font-sans text-[11px] text-indigo-200 leading-relaxed">
              <span className="font-bold">Pro-tip:</span> Drag the <span className="text-indigo-400">Implied Volatility (σ)</span> slider down to see options premium shrink, or drag <span className="text-amber-400">Days to Expiration</span> down to observe the accelerated decay rate represented by <span className="text-orange-450">Theta</span>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
