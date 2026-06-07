import React, { useState } from 'react';
import { OptionContract, OptionType } from '../types';
import { ShieldAlert, Eye, Filter, ArrowUpRight, TrendingUp, HelpCircle } from 'lucide-react';

interface OptionChainGridProps {
  contracts: OptionContract[];
  spotPrice: number;
  selectedTicker: string;
  selectedContractId: string | null;
  onSelectContract: (contract: OptionContract) => void;
  minScoreThreshold: number;
}

export const OptionChainGrid: React.FC<OptionChainGridProps> = ({
  contracts,
  spotPrice,
  selectedTicker,
  selectedContractId,
  onSelectContract,
  minScoreThreshold,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'FLAGGED' | 'NEAR_MONEY'>('NEAR_MONEY');

  // Filter option chain contracts
  const filteredContracts = contracts.filter((c) => {
    if (filterType === 'FLAGGED') {
      return c.agentStatus === 'FLAGGED';
    }
    if (filterType === 'NEAR_MONEY') {
      const distancePct = Math.abs(c.strike - spotPrice) / spotPrice;
      return distancePct <= 0.08; // Within 8% of spot
    }
    return true; // All
  });

  // Organize by unique strikes to reconstruct the Calls-on-left, Puts-on-right table structure
  const uniqueStrikes = (Array.from(new Set(filteredContracts.map((c) => c.strike))).sort((a, b) => (b as number) - (a as number)) as number[]);

  const getContractByTypeAndStrike = (strike: number, type: OptionType): OptionContract | undefined => {
    return filteredContracts.find((c) => c.strike === strike && c.type === type);
  };

  const getRiskColor = (rating: 'LOW' | 'MED' | 'HIGH') => {
    switch (rating) {
      case 'LOW': return 'text-emerald-400 bg-emerald-950/40 border-emerald-900/60';
      case 'MED': return 'text-amber-400 bg-amber-950/40 border-amber-900/60';
      case 'HIGH': return 'text-rose-400 bg-rose-950/40 border-rose-900/60';
    }
  };

  return (
    <div id="option-chain-grid" className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-2xl">
      {/* Header and Filter Toggles */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-sans font-bold text-white tracking-tight text-base">
              {selectedTicker} Option Chain Monitor
            </h2>
            <span className="rounded-xl bg-white/10 border border-white/10 px-2.5 py-0.5 font-mono text-[11px] text-slate-200">
              Spot: ${spotPrice.toFixed(2)}
            </span>
          </div>
          <p className="font-sans text-xs text-slate-400 mt-1">
            Real-time feed evaluated by dual-agent analytical processes. Click any row to load into simulator sandbox.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-slate-500 mr-1.5 font-bold">
            <Filter size={11} className="text-indigo-400" />
            STRIKES FILTER:
          </span>
          <button
            id="filter-near-money"
            onClick={() => setFilterType('NEAR_MONEY')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
              filterType === 'NEAR_MONEY'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                : 'border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Near-Money (8%)
          </button>
          <button
            id="filter-flagged-only"
            onClick={() => setFilterType('FLAGGED')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              filterType === 'FLAGGED'
                ? 'border-rose-500/20 bg-rose-500/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.1)]'
                : 'border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShieldAlert size={11} />
            FLAGGED Only
          </button>
          <button
            id="filter-all-strikes"
            onClick={() => setFilterType('ALL')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
              filterType === 'ALL'
                ? 'border-white/20 bg-white/10 text-slate-200'
                : 'border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            All Strikes
          </button>
        </div>
      </div>

      {/* Grid Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/35 shadow-inner">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead>
            {/* Split row Header */}
            <tr className="border-b border-white/5 bg-white/5 text-slate-300 select-none divide-x divide-white/5">
              <th colSpan={5} className="py-2.5 px-3 text-center font-sans tracking-wide text-emerald-400 text-xs font-semibold">
                CALL OPTIONS
              </th>
              <th className="py-2.5 px-4 text-center font-sans tracking-wide text-slate-100 text-xs font-extrabold bg-white/5">
                STRIKE
              </th>
              <th colSpan={5} className="py-2.5 px-3 text-center font-sans tracking-wide text-indigo-400 text-xs font-semibold">
                PUT OPTIONS
              </th>
            </tr>
            {/* Real Columns Header */}
            <tr className="border-b border-white/5 bg-transparent text-slate-500 text-[10px] uppercase font-bold divide-x divide-white/5">
              {/* Call Columns */}
              <th className="py-2 px-2.5 text-center text-rose-300">Score</th>
              <th className="py-2 px-2.5 text-right w-12">Bid</th>
              <th className="py-2 px-2.5 text-left w-12">Ask</th>
              <th className="py-2 px-2.5 text-right">Vol</th>
              <th className="py-2 px-2.5 text-center">Delta</th>
              
              {/* Center Strike */}
              <th className="py-2 px-4 text-center bg-white/5 font-bold text-slate-300 border-x border-white/5">K</th>
              
              {/* Put Columns */}
              <th className="py-2 px-2.5 text-center">Delta</th>
              <th className="py-2 px-2.5 text-right">Vol</th>
              <th className="py-2 px-2.5 text-right w-12">Bid</th>
              <th className="py-2 px-2.5 text-left w-12">Ask</th>
              <th className="py-2 px-2.5 text-center text-rose-300">Score</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {uniqueStrikes.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500 italic">
                  No options found matching active filters. Modify selection settings.
                </td>
              </tr>
            ) : (
              uniqueStrikes.map((strike: number) => {
                const call = getContractByTypeAndStrike(strike, 'CALL');
                const put = getContractByTypeAndStrike(strike, 'PUT');
                const isAtTheMoney = Math.abs(strike - spotPrice) <= 3;

                return (
                  <tr
                    key={strike}
                    className={`hover:bg-white/10 transition-colors ${
                      isAtTheMoney ? 'bg-amber-400/5' : ''
                    }`}
                  >
                    {/* CALL PROPERTIES */}
                    {call ? (
                      <td
                        id={`cell-${call.id}`}
                        onClick={() => onSelectContract(call)}
                        className={`py-2 p-2.5 cursor-pointer text-center relative transition-colors ${
                          selectedContractId === call.id ? 'bg-indigo-500/15 font-bold text-white' : ''
                        }`}
                      >
                        {call.agentStatus === 'FLAGGED' && (
                          <div className="absolute left-1.5 top-[11px] h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
                        )}
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            call.opportunityScore >= minScoreThreshold
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : call.agentStatus === 'WATCHED'
                              ? 'bg-white/10 text-slate-300'
                              : 'bg-white/5 text-slate-500'
                          }`}
                          title={call.reasonFlagged || "Opportunity Score calculated by scouter agent"}
                        >
                          {call.opportunityScore}
                        </span>
                      </td>
                    ) : <td className="py-2 px-2.5 bg-white/5" />}

                    {call ? (
                      <>
                        <td onClick={() => onSelectContract(call)} className="py-2 px-2.5 text-right text-emerald-400 font-semibold cursor-pointer">
                          ${call.bid.toFixed(2)}
                        </td>
                        <td onClick={() => onSelectContract(call)} className="py-2 px-2.5 text-left text-slate-300 cursor-pointer">
                          ${call.ask.toFixed(2)}
                        </td>
                        <td onClick={() => onSelectContract(call)} className="py-2 px-2.5 text-right text-slate-400 cursor-pointer text-[11px]">
                          {call.volume > 1000 ? `${(call.volume / 1000).toFixed(1)}k` : call.volume}
                        </td>
                        <td onClick={() => onSelectContract(call)} className="py-2 px-2.5 text-center text-slate-300 font-mono cursor-pointer">
                          {(call.greeks.delta).toFixed(2)}
                        </td>
                      </>
                    ) : (
                      <td colSpan={4} className="py-2 px-2.5 bg-white/5 text-slate-600 text-center select-none">-</td>
                    )}

                    {/* MOUNT CENTER STRIKE ELEMENT */}
                    <td className={`py-2 px-4 text-center bg-white/5 border-x border-white/5 shadow-inner select-none relative ${
                      isAtTheMoney ? 'text-amber-300 border-y border-amber-500/20 font-extrabold" id="strike-atm' : 'text-indigo-200 font-bold'
                    }`}>
                      <div className="font-bold relative z-10">${strike}</div>
                      {/* Agent Wall Signal */}
                      {call?.reasonFlagged?.includes('Gamma Wall') && (
                        <div className="absolute top-0.5 left-1 text-[7px] font-mono text-emerald-300 bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-500/30 uppercase tracking-tight scale-85 pointer-events-none z-20 font-extrabold">
                          🧱 WALL
                        </div>
                      )}
                      {/* Agent Crush Signal */}
                      {put?.reasonFlagged?.includes('IV Crush') && (
                        <div className="absolute bottom-0.5 right-1 text-[7px] font-mono text-indigo-300 bg-indigo-950/80 px-1 py-0.2 rounded border border-indigo-505/30 uppercase tracking-tight scale-85 pointer-events-none z-20 font-extrabold">
                          💥 CRUSH
                        </div>
                      )}
                    </td>

                    {/* PUT PROPERTIES */}
                    {put ? (
                      <>
                        <td onClick={() => onSelectContract(put)} className="py-2 px-2.5 text-center text-slate-300 font-mono cursor-pointer">
                          {(put.greeks.delta).toFixed(2)}
                        </td>
                        <td onClick={() => onSelectContract(put)} className="py-2 px-2.5 text-right text-slate-400 cursor-pointer text-[11px]">
                          {put.volume > 1000 ? `${(put.volume / 1000).toFixed(1)}k` : put.volume}
                        </td>
                        <td onClick={() => onSelectContract(put)} className="py-2 px-2.5 text-right text-indigo-400 font-semibold cursor-pointer">
                          ${put.bid.toFixed(2)}
                        </td>
                        <td onClick={() => onSelectContract(put)} className="py-2 px-2.5 text-left text-slate-300 cursor-pointer">
                          ${put.ask.toFixed(2)}
                        </td>
                      </>
                    ) : (
                      <td colSpan={4} className="py-2 px-2.5 bg-white/5 text-slate-600 text-center select-none">-</td>
                    )}

                    {put ? (
                      <td
                        id={`cell-${put.id}`}
                        onClick={() => onSelectContract(put)}
                        className={`py-2 px-2.5 cursor-pointer text-center relative transition-colors ${
                          selectedContractId === put.id ? 'bg-indigo-500/15 font-bold text-white' : ''
                        }`}
                      >
                        {put.agentStatus === 'FLAGGED' && (
                          <div className="absolute right-1.5 top-[11px] h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
                        )}
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            put.opportunityScore >= minScoreThreshold
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : put.agentStatus === 'WATCHED'
                              ? 'bg-white/10 text-slate-300'
                              : 'bg-white/5 text-slate-500'
                          }`}
                          title={put.reasonFlagged || "Opportunity Score calculated by scouter agent"}
                        >
                          {put.opportunityScore}
                        </span>
                      </td>
                    ) : <td className="py-2 px-2.5 bg-white/5" />}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Flagged Status Panel */}
      {contracts.some(c => c.agentStatus === 'FLAGGED') && (
        <div className="mt-5 p-4 bg-black/30 rounded-2xl border border-white/5 flex flex-col gap-3">
          <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 flex items-center gap-1.5 font-bold">
            <TrendingUp size={11} className="text-rose-400" />
            SCANNER OPT-AGENT DETECTIONS
          </span>
          <div className="space-y-2">
            {contracts
              .filter(c => c.agentStatus === 'FLAGGED')
              .slice(0, 3)
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectContract(c)}
                  className="flex items-center justify-between text-xs font-mono p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg ${
                      c.type === 'CALL' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/10' : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/10'
                    }`}>
                      {c.ticker} {c.strike} {c.type}
                    </span>
                    <span className="text-slate-300 truncate max-w-[280px] md:max-w-[450px]">
                      {c.reasonFlagged}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-sans font-semibold">Score:</span>
                    <span className="text-xs font-extrabold text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">{c.opportunityScore}</span>
                    <ArrowUpRight size={12} className="text-indigo-400" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
