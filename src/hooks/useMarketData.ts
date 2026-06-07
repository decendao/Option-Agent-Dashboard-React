/**
 * src/hooks/useMarketData.ts
 * React hook that bridges the API service to the dashboard state.
 * Handles:
 * - Initial data fetch from REST API on mount
 * - WebSocket subscription for real-time updates
 * - Graceful fallback to demo mode when API is unavailable
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { api, createWebSocket, type WSCallbacks } from '../services/api';
import type {
  AgentInfo,
  SpotQuote,
  OptionContract,
  RiskMatrix,
  RiskAlert,
  WorkflowLog,
  MacroEvent,
  MonitorConfig,
} from '../types';
import {
  INITIAL_AGENTS,
  INITIAL_MACRO_EVENTS,
  INITIAL_CONFIG,
  generateContracts,
  INITIAL_TICKER_PRICES,
} from '../data/mockData';

export type ConnectionStatus = 'connecting' | 'live' | 'demo' | 'error';

export interface MarketDataState {
  // Connection
  connectionStatus: ConnectionStatus;
  uptimeSeconds: number;

  // Market data
  spotPrices: Record<string, SpotQuote>;
  contracts: OptionContract[];
  selectedTicker: string;
  isLoadingContracts: boolean;

  // Agents
  agents: AgentInfo[];

  // Risk
  riskMatrices: Record<string, RiskMatrix>;
  recentAlerts: RiskAlert[];

  // Macro events (from API prediction markets, or fallback)
  macroEvents: MacroEvent[];

  // Logs (generated from agent cycles)
  logs: WorkflowLog[];

  // Config (local — user controls)
  config: MonitorConfig;

  // Actions
  setSelectedTicker: (ticker: string) => void;
  setConfig: (config: MonitorConfig) => void;
  addLog: (log: WorkflowLog) => void;
  clearLogs: () => void;
  refresh: () => Promise<void>;
}

export function useMarketData(): MarketDataState {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [spotPrices, setSpotPrices] = useState<Record<string, SpotQuote>>(
    Object.fromEntries(
      Object.entries(INITIAL_TICKER_PRICES).map(([ticker, price]) => [
        ticker,
        { ticker, spotPrice: price, bid: price * 0.999, ask: price * 1.001, last: price, volume: 0, timestamp: new Date().toISOString(), source: 'mock' },
      ])
    )
  );
  const [contracts, setContracts] = useState<OptionContract[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>(INITIAL_AGENTS);
  const [riskMatrices, setRiskMatrices] = useState<Record<string, RiskMatrix>>({});
  const [recentAlerts, setRecentAlerts] = useState<RiskAlert[]>([]);
  const [macroEvents, setMacroEvents] = useState<MacroEvent[]>(INITIAL_MACRO_EVENTS);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [config, setConfig] = useState<MonitorConfig>(INITIAL_CONFIG);

  const wsRef = useRef<WebSocket | null>(null);
  const uptimeRef = useRef<number>(0);
  const logIdRef = useRef(0);

  // ── Helpers ────────────────────────────────────────────────────────────

  const addLog = useCallback((log: WorkflowLog) => {
    setLogs((prev) => [log, ...prev].slice(0, 80));
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const buildLogFromHeartbeat = useCallback(
    (cycleId: string, agentA: boolean, agentB: boolean, agentC: boolean, durationMs: number) => {
      const id = `l-api-${logIdRef.current++}`;
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      const agents_ = ['Agent A: Context Assembler', 'Agent B: Greeks Engine', 'Agent C: Risk Watchdog'];
      const ok = [agentA, agentB, agentC];
      const statuses = ok.map((v, i) => (v ? 'OK' : 'FAIL'));

      addLog({
        id,
        timestamp: timeStr,
        level: ok.every(Boolean) ? 'success' : 'warn',
        agentId: 'api_monitor',
        agentName: 'API Monitor',
        message: `Cycle ${cycleId} | Agents: ${agents_.map((a, i) => `${a.split(':')[0]}=${statuses[i]}`).join(' | ')} | ${durationMs.toFixed(0)}ms`,
      });
    },
    [addLog]
  );

  // ── WebSocket callbacks ────────────────────────────────────────────────

  const wsCallbacks: WSCallbacks = {
    onConnected: () => {
      setConnectionStatus('live');
      addLog({
        id: `l-ws-${logIdRef.current++}`,
        timestamp: new Date().toTimeString().split(' ')[0],
        level: 'success',
        agentId: 'ws',
        agentName: 'WebSocket',
        message: 'Connected to options_agent live feed. Streaming real-time data.',
      });
    },

    onDisconnected: () => {
      setConnectionStatus('error');
      addLog({
        id: `l-ws-${logIdRef.current++}`,
        timestamp: new Date().toTimeString().split(' ')[0],
        level: 'error',
        agentId: 'ws',
        agentName: 'WebSocket',
        message: 'Live feed disconnected. Dashboard entering demo mode.',
      });
    },

    onHeartbeat: (data) => {
      // Update spot prices from heartbeat batch
      const rawSpots = data as unknown as Record<string, Record<string, unknown>>;
      // Heartbeat format: top-level fields
      const cycleId = (data.cycle_id as string) ?? '?';
      const durationMs = (data.duration_ms as number) ?? 0;
      const aOk = (data.agent_a_ok as boolean) ?? false;
      const bOk = (data.agent_b_ok as boolean) ?? false;
      const cOk = (data.agent_c_ok as boolean) ?? false;

      buildLogFromHeartbeat(cycleId, aOk, bOk, cOk, durationMs);

      // Update uptime
      uptimeRef.current += 1;
      setUptimeSeconds(uptimeRef.current);
    },

    onSpotUpdate: (data) => {
      // Update a single ticker spot price from WS push
      const ticker = data.ticker as string;
      const spot = data.spot_price as number;
      setSpotPrices((prev) => ({ ...prev, [ticker]: { ...prev[ticker], spotPrice: spot } }));
    },

    onAlertFired: (data) => {
      const alertData = (data.alert as Record<string, unknown>) ?? data;
      const alert: RiskAlert = {
        id: alertData.alert_id as string,
        ticker: alertData.ticker as string,
        riskLevel: (alertData.risk_level as string).toUpperCase() as RiskAlert['riskLevel'],
        headline: alertData.headline as string,
        narrative: alertData.narrative as string,
        recommendedAction: alertData.recommended_action as string,
        timestamp: (alertData.timestamp_utc as string) ?? new Date().toISOString(),
        triggeredRules: (alertData.triggered_rules as string[]) ?? [],
      };
      setRecentAlerts((prev) => [alert, ...prev].slice(0, 50));
      addLog({
        id: `l-alert-${logIdRef.current++}`,
        timestamp: new Date().toTimeString().split(' ')[0],
        level: 'warn',
        agentId: 'agent_c',
        agentName: 'Agent C: Risk Watchdog',
        message: `Alert: ${alert.headline}`,
        details: alert.recommendedAction,
      });
    },
  };

  // ── Initial data fetch + WebSocket setup ──────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const snapshot = await api.getSnapshot();

      // Map agents
      const rawAgents = snapshot.agents ?? [];
      setAgents(
        rawAgents.map((a) => ({
          id: a.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_'),
          name: a.name,
          role: a.name,
          status: a.status as AgentInfo['status'],
          currentTask: `Last cycle: ${a.last_cycle_id ?? '—'} | ${(a.last_cycle_ms ?? 0).toFixed(0)}ms`,
          lastActiveTime: a.last_active_utc
            ? new Date(a.last_active_utc).toLocaleTimeString()
            : '—',
          processedCount: a.cycle_count ?? 0,
          flaggedCount: 0,
          performanceScore: a.consecutive_errors === 0 ? 99.8 : 50,
          workflowStep: a.consecutive_errors === 0 ? 1 : 0,
        }))
      );

      // Map spot prices
      const spots: Record<string, SpotQuote> = {};
      for (const [ticker, q] of Object.entries(snapshot.spot_quotes ?? {})) {
        spots[ticker] = q;
      }
      if (Object.keys(spots).length > 0) {
        setSpotPrices(spots);
      }

      // Map contracts
      const allContracts: OptionContract[] = [];
      for (const [, chains] of Object.entries(snapshot.options_chains ?? {})) {
        for (const chain of chains) {
          for (const raw of chain.contracts) {
            allContracts.push({
              id: `${raw.ticker}-${raw.strike}-${raw.option_type}`,
              ticker: raw.ticker as string,
              strike: raw.strike as number,
              expiration: raw.expiration as string,
              daysToExpiration: Math.max(
                1,
                Math.round(
                  (new Date(raw.expiration as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
              ),
              type: (raw.option_type as string).toUpperCase() as OptionContract['type'],
              bid: raw.bid as number,
              ask: raw.ask as number,
              lastPrice: raw.last as number,
              volume: raw.volume as number,
              openInterest: raw.open_interest as number,
              impliedVolatility: (raw.implied_volatility as number) ?? 0,
              underlyingPrice: (raw.spot_price as number) ?? 0,
              greeks: {
                delta: (raw.delta as number) ?? 0,
                gamma: (raw.gamma as number) ?? 0,
                theta: (raw.theta as number) ?? 0,
                vega: (raw.vega as number) ?? 0,
              },
              opportunityScore: (raw.opportunity_score as number) ?? 70,
              agentStatus: ((raw.agent_status as string)?.toUpperCase() ?? 'WATCHED') as OptionContract['agentStatus'],
              riskRating: ((raw.risk_rating as string)?.toUpperCase() ?? 'MED') as OptionContract['riskRating'],
            });
          }
        }
      }
      if (allContracts.length > 0) {
        setContracts(allContracts);
      }

      // Map risk matrices
      const matrices: Record<string, RiskMatrix> = {};
      for (const [ticker, m] of Object.entries(snapshot.risk_matrices ?? {})) {
        matrices[ticker] = m;
      }
      setRiskMatrices(matrices);

      // Map alerts
      setRecentAlerts(snapshot.recent_alerts ?? []);

      // Map macro events from prediction markets
      // (prediction_contracts would come from AgentAOutput — add if needed in future)

      setUptimeSeconds(snapshot.uptime_seconds ?? 0);
      uptimeRef.current = snapshot.uptime_seconds ?? 0;

      // Start WebSocket
      if (wsRef.current) {
        wsRef.current.close();
      }
      wsRef.current = createWebSocket(wsCallbacks);
      setConnectionStatus('live');
    } catch (err) {
      console.warn('[useMarketData] API unavailable, running in demo mode:', err);
      setConnectionStatus('demo');
      // Seed contracts with mock data
      const firstTicker = INITIAL_CONFIG.selectedTicker;
      const spot = INITIAL_TICKER_PRICES[firstTicker] ?? 125;
      setContracts(generateContracts(firstTicker, spot));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [refresh]);

  // ── Uptime ticker ──────────────────────────────────────────────────────

  useEffect(() => {
    if (connectionStatus !== 'live' && connectionStatus !== 'demo') return;
    const interval = setInterval(() => {
      uptimeRef.current += 1;
      setUptimeSeconds(uptimeRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionStatus]);

  // ── Demo mode: regenerate contracts when spot prices change ─────────────

  useEffect(() => {
    if (connectionStatus !== 'demo') return;
    const ticker = config.selectedTicker;
    const spot = spotPrices[ticker]?.spotPrice ?? INITIAL_TICKER_PRICES[ticker] ?? 125;
    setContracts(generateContracts(ticker, spot));
  }, [spotPrices, config.selectedTicker, connectionStatus]);

  // ── Live mode: fetch contracts for selected ticker ──────────────────────

  const [selectedTicker, setSelectedTicker] = useState(INITIAL_CONFIG.selectedTicker);

  useEffect(() => {
    if (connectionStatus !== 'live') return;
    setIsLoadingContracts(true);
    api
      .getChains(selectedTicker)
      .then((chains) => {
        if (chains.length > 0) setContracts(chains);
      })
      .catch(() => {
        const spot = spotPrices[selectedTicker]?.spotPrice ?? 125;
        setContracts(generateContracts(selectedTicker, spot));
      })
      .finally(() => setIsLoadingContracts(false));
  }, [selectedTicker, connectionStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public actions ────────────────────────────────────────────────────

  const handleSetConfig = useCallback((newConfig: MonitorConfig) => {
    setConfig(newConfig);
    setSelectedTicker(newConfig.selectedTicker);
  }, []);

  return {
    connectionStatus,
    uptimeSeconds,
    spotPrices,
    contracts,
    selectedTicker,
    isLoadingContracts,
    agents,
    riskMatrices,
    recentAlerts,
    macroEvents,
    logs,
    config,
    setSelectedTicker,
    setConfig: handleSetConfig,
    addLog,
    clearLogs,
    refresh,
  };
}
