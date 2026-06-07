import { useState, useEffect, Component, ReactNode, ErrorInfo } from 'react';
import {
  OptionContract,
  MonitorConfig,
} from './types';
import {
  INITIAL_TICKER_PRICES,
  generateRandomLog,
} from './data/mockData';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Dashboard Error]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-300 font-mono gap-4 p-8">
          <span className="text-rose-400 text-2xl">⚠ Dashboard Error</span>
          <p className="text-sm text-slate-500 max-w-md text-center">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { AgentStatusCard } from './components/AgentStatusCard';
import { OptionChainGrid } from './components/OptionChainGrid';
import { BlackScholesSimulator } from './components/BlackScholesSimulator';
import { WorkflowLogs } from './components/WorkflowLogs';
import { AgentConfigPanel } from './components/AgentConfigPanel';
import { useMarketData } from './hooks/useMarketData';
import {
  Activity,
  Workflow,
  Cpu,
  BadgeAlert,
  Terminal,
  Layers,
  Sparkles,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';

export default function App() {
  const {
    connectionStatus,
    uptimeSeconds,
    spotPrices,
    contracts,
    selectedTicker,
    isLoadingContracts,
    agents,
    logs,
    macroEvents,
    config,
    setConfig,
    addLog,
    clearLogs,
    refresh,
  } = useMarketData();

  const [isLogStreamPaused, setIsLogStreamPaused] = useState(false);

  const liveSpotPrice = spotPrices[config.selectedTicker]?.spotPrice
    ?? INITIAL_TICKER_PRICES[config.selectedTicker]
    ?? 125;

  // Demo-mode only: simulate random logs
  useEffect(() => {
    if (connectionStatus !== 'demo') return;
    const timer = setInterval(() => {
      if (!isLogStreamPaused) {
        const activeAgents = agents.filter((a) => a.status === 'ACTIVE');
        if (activeAgents.length > 0) {
          const { log } = generateRandomLog(agents);
          addLog(log);
        }
      }
    }, config.scanIntervalMs);
    return () => clearInterval(timer);
  }, [agents, isLogStreamPaused, connectionStatus, config.scanIntervalMs, addLog]);

  // Pre-select nearest ATM contract for simulator (prefer CALL)
  const [selectedContract, setSelectedContract] = useState<OptionContract | null>(null);
  useEffect(() => {
    if (contracts.length === 0) {
      setSelectedContract(null);
      return;
    }
    const nearest = contracts.reduce((prev, curr) =>
      Math.abs(curr.strike - liveSpotPrice) < Math.abs(prev.strike - liveSpotPrice) ? curr : prev
    );
    const atmCall = contracts.find((c) => c.strike === nearest.strike && c.type === 'CALL');
    setSelectedContract(atmCall ?? nearest);
  }, [contracts, liveSpotPrice]);

  // Toggle agent pause
  const handleToggleAgentStatus = (id: string) => {
    // Note: actual agent toggle requires a backend write endpoint (future L2)
    addLog({
      id: `l-toggle-${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      level: 'info',
      agentId: id,
      agentName: agents.find((a) => a.id === id)?.name ?? id,
      message: `Agent toggle requested (API toggle requires L2 write endpoint).`,
    });
  };

  const handleUpdateConfig = (newConfig: MonitorConfig) => {
    addLog({
      id: `l-conf-${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      level: 'info',
      agentId: 'scouter',
      agentName: 'Opportunity Scouter Agent',
      message: `Re-calibrated: Ticker=${newConfig.selectedTicker}, min score=${newConfig.minOpportunityScore}.`,
    });
    setConfig(newConfig);
  };

  const handleToggleLogStream = () => {
    setIsLogStreamPaused((prev) => !prev);
  };

  const isDemo = connectionStatus === 'demo';
  const uptimeStr = `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`;

  return (
    <ErrorBoundary>
    <div id="dashboard-root" className="relative min-h-screen bg-gradient-to-tr from-[#090d16] via-[#05070c] to-[#0a1220] text-slate-100 flex flex-col antialiased overflow-x-hidden">

      {/* Demo mode banner */}
      {isDemo && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 flex items-center gap-2 text-xs font-mono text-amber-300">
          <WifiOff size={13} className="text-amber-400" />
          <span className="font-bold uppercase tracking-wider">Demo Mode</span>
          <span>— Backend API unreachable. Showing simulated data.</span>
          <button
            onClick={refresh}
            className="ml-4 underline hover:text-amber-200 underline-offset-2 cursor-pointer"
          >
            Retry connection
          </button>
        </div>
      )}

      {/* Ambient blurs */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] h-[600px] w-[600px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] left-[20%] h-[350px] w-[350px] bg-sky-500/5 rounded-full blur-[110px] pointer-events-none" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-white/5 bg-[#090d16]/40 sticky top-0 backdrop-blur-xl z-40 select-none">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-emerald-350 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Activity size={20} className={isDemo ? '' : 'animate-pulse'} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-extrabold tracking-tight text-lg text-white">
                  OPT-CORE Monitor
                </h1>
                <span className="rounded-xl bg-white/5 px-2.0 py-0.5 font-mono text-[9px] text-indigo-300 border border-white/5 font-extrabold tracking-widest uppercase">
                  AGENT PIPELINE V2.4
                </span>
              </div>
              <p className="font-sans text-xs text-slate-450 mt-0.5">
                Autonomous real-time pricing analysis and Black-Scholes Greeks scanner orchestration layer.
              </p>
            </div>
          </div>

          {/* Meta metrics */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <div className="flex items-center gap-2 bg-black/40 p-1.5 px-3 rounded-xl border border-white/5 shadow-inner">
              <div className="relative flex h-2 w-2">
                {isDemo
                  ? <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  : <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </>
                }
              </div>
              <span className="text-slate-400 uppercase font-bold tracking-wider">NASDAQ FEED:</span>
              <span className={isDemo ? 'text-amber-300 font-extrabold' : 'text-emerald-300 font-extrabold'}>
                {isDemo ? 'DEMO' : '100.0% LIVE'}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-black/40 p-1.5 px-3 rounded-xl border border-white/5 shadow-inner">
              <span className="text-slate-400 font-sans font-bold uppercase tracking-wider">SECURE LATENCY:</span>
              <span className="text-indigo-300 font-extrabold">{isDemo ? '—' : '12ms'}</span>
            </div>
            {isDemo && (
              <div className="flex items-center gap-2 bg-black/40 p-1.5 px-3 rounded-xl border border-white/5 shadow-inner">
                <span className="text-slate-400 font-sans font-bold uppercase tracking-wider">SESSION:</span>
                <span className="text-amber-300 font-extrabold">{uptimeStr}</span>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-5 space-y-6">

        {/* Row 1: Agent Fleet */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Layers size={13} className="text-slate-500" />
              Distributed Node Status &amp; Telemetry
            </h2>
            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
              <span>Nodes online:</span>
              <span className="text-emerald-400 font-bold">
                {agents.filter((a) => a.status === 'ACTIVE').length}/{agents.length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.slice(0, 3).map((agent) => (
              <AgentStatusCard
                key={agent.id}
                agent={agent}
                onToggleStatus={handleToggleAgentStatus}
              />
            ))}

            {/* Column 4: Macro Arbitrage Radar */}
            <div className="relative overflow-hidden backdrop-blur-md rounded-2xl border border-indigo-500/20 bg-indigo-950/5 p-5 transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/35 hover:shadow-xl hover:shadow-black/30 flex flex-col justify-between">
              <div className="absolute right-0 top-0 -mr-4 -mt-4 h-16 w-16 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex h-1.5 w-1.5 animate-pulse">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                    </div>
                    <span className="font-sans font-extrabold text-white tracking-tight text-xs">Macro Arb Radar</span>
                  </div>
                  <span className="rounded bg-indigo-500/10 px-1 py-0.5 font-mono text-[8.5px] text-indigo-300 border border-indigo-500/15 font-bold uppercase tracking-wider scale-90">
                    PROBABILITY DATA
                  </span>
                </div>
                <p className="font-sans text-[11px] text-zinc-400 leading-normal">
                  Prediction markets (Polymarket &amp; Kalshi) weight probability indices driving IV smiles.
                </p>
              </div>

              <div className="mt-3.5 space-y-2 flex-grow">
                {macroEvents.slice(0, 3).map((evt) => (
                  <div key={evt.id} className="rounded-xl bg-black/45 p-2.5 border border-white/5 flex flex-col gap-1 transition-all duration-300 hover:bg-black/60">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded font-mono border ${
                        evt.source === 'Polymarket'
                          ? 'bg-sky-500/15 text-sky-400 border-sky-500/20'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                      }`}>
                        {evt.source.toUpperCase()}
                      </span>
                      <span className="font-mono text-indigo-300 font-extrabold text-xs transition-colors duration-150">
                        {Math.round(evt.probability * 100)}% prob
                      </span>
                    </div>
                    <p className="font-sans text-[10px] text-slate-205 font-medium leading-snug tracking-tight">
                      {evt.question}
                    </p>
                    <span className="font-mono text-[8.5px] text-emerald-400/90 leading-tight block">
                      ↳ {evt.impactCorrelation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Row 2: Options chain + config */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 h-full">
            <OptionChainGrid
              contracts={contracts}
              spotPrice={liveSpotPrice}
              selectedTicker={config.selectedTicker}
              selectedContractId={selectedContract ? selectedContract.id : null}
              onSelectContract={setSelectedContract}
              minScoreThreshold={config.minOpportunityScore}
              isLoadingContracts={isLoadingContracts}
            />
          </section>

          <section className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <AgentConfigPanel
              config={config}
              onSaveConfig={handleUpdateConfig}
            />
            <WorkflowLogs
              logs={logs}
              onClearLogs={clearLogs}
              isPaused={isLogStreamPaused}
              onTogglePause={handleToggleLogStream}
            />
          </section>
        </div>

        {/* Row 3: BS Simulator */}
        <section>
          <BlackScholesSimulator
            selectedContract={selectedContract}
            spotPrice={liveSpotPrice}
          />
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#090d16]/30 mt-12 py-6 text-center select-none text-[10px] text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>OPT-CORE Monitor — {isDemo ? 'Demo Mode' : 'Live Feed'}</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-default">
              <Sparkles size={11} className="text-emerald-400" /> Auto-pricing Engine
            </span>
            <span className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-default">
              <Cpu size={11} className="text-indigo-400" /> BSM Sensitivities Active
            </span>
          </div>
        </div>
      </footer>

    </div>
    </ErrorBoundary>
  );
}
