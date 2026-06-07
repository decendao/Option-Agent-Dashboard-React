/**
 * src/services/api.ts
 * API service layer for options_agent backend.
 * All calls go to the FastAPI server running alongside the orchestrator.
 *
 * Environment variables (Vite):
 *   VITE_API_URL   — base URL of the options_agent API (default: http://localhost:8000)
 *   VITE_WS_URL    — WebSocket URL (default: ws://localhost:8000/ws)
 */

import type {
  AgentInfo,
  OptionContract,
  SpotQuote,
  RiskMatrix,
  RiskAlert,
  WorkflowLog,
  MacroEvent,
  DashboardSnapshot,
} from '../types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://options-agent-production.up.railway.app';
const WS_BASE = import.meta.env.VITE_WS_URL ?? 'wss://options-agent-production.up.railway.app/ws';

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

function mapAgentInfo(raw: Record<string, unknown>): AgentInfo {
  return {
    id: (raw.name as string).toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_'),
    name: raw.name as string,
    role: (raw.name as string), // API doesn't have role; use name
    status: (raw.status as string).toUpperCase() as AgentInfo['status'],
    currentTask: `Last cycle: ${raw.last_cycle_id ?? '—'} | ${((raw.last_cycle_ms as number) ?? 0).toFixed(0)}ms`,
    lastActiveTime: raw.last_active_utc
      ? new Date(raw.last_active_utc as string).toLocaleTimeString()
      : '—',
    processedCount: raw.cycle_count as number ?? 0,
    flaggedCount: 0,
    performanceScore: raw.consecutive_errors === 0 ? 99.8 : 50,
    workflowStep: raw.consecutive_errors === 0 ? 1 : 0,
  };
}

function mapSpotQuote(raw: Record<string, unknown>): SpotQuote {
  return {
    ticker: raw.ticker as string,
    spotPrice: raw.spot_price as number,
    bid: raw.bid as number,
    ask: raw.ask as number,
    last: raw.last as number,
    volume: raw.volume as number,
    timestamp: (raw.timestamp_utc as string) ?? new Date().toISOString(),
    source: raw.source as string ?? 'api',
  };
}

function mapOptionContract(raw: Record<string, unknown>): OptionContract {
  const greeks = raw as Record<string, unknown>;
  return {
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
    underlyingPrice: (raw as Record<string, unknown>).spot_price as number ?? 0,
    greeks: {
      delta: (greeks.delta as number) ?? 0,
      gamma: (greeks.gamma as number) ?? 0,
      theta: (greeks.theta as number) ?? 0,
      vega: (greeks.vega as number) ?? 0,
    },
    opportunityScore: (raw.opportunity_score as number) ?? 70,
    agentStatus: ((raw.agent_status as string)?.toUpperCase() ?? 'WATCHED') as OptionContract['agentStatus'],
    riskRating: ((raw.risk_rating as string)?.toUpperCase() ?? 'MED') as OptionContract['riskRating'],
  };
}

function mapRiskMatrix(raw: Record<string, unknown>): RiskMatrix {
  return {
    ticker: raw.ticker as string,
    spotPrice: raw.spot_price as number,
    gammaWallBreach: raw.gamma_wall_breach as boolean,
    zeroGammaBreach: raw.zero_gamma_breach as boolean,
    ivCrushImminent: raw.iv_crush_imminent as boolean,
    evArbDetected: raw.ev_arb_detected as boolean,
    ivAnalysis: raw.iv_analysis
      ? {
          currentIv: ((raw.iv_analysis as Record<string, unknown>).current_iv as number) ?? 0,
          ivRank: ((raw.iv_analysis as Record<string, unknown>).iv_rank as number) ?? 0,
        }
      : null,
    gammaWallStrike:
      (((raw.gamma_profiles as unknown as Array<Record<string, unknown>>)?.[0])
        ?.gamma_wall_strike as number) ?? null,
  };
}

// ---------------------------------------------------------------------------
// REST API client
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  /** Full dashboard snapshot — use on mount */
  async getSnapshot(): Promise<DashboardSnapshot> {
    return apiFetch<DashboardSnapshot>('/snapshot');
  },

  async getHeartbeat() {
    return apiFetch<Record<string, unknown>>('/heartbeat');
  },

  async getAgents(): Promise<AgentInfo[]> {
    const raw = await apiFetch<Record<string, unknown>[]>('/agents');
    return raw.map(mapAgentInfo);
  },

  async getSpotPrices(): Promise<Record<string, SpotQuote>> {
    const raw = await apiFetch<Record<string, Record<string, unknown>>>('/spot');
    const result: Record<string, SpotQuote> = {};
    for (const [ticker, quote] of Object.entries(raw)) {
      result[ticker] = mapSpotQuote(quote);
    }
    return result;
  },

  async getSpotPrice(ticker: string): Promise<SpotQuote> {
    return apiFetch<Record<string, unknown>>(`/spot/${ticker.toUpperCase()}`).then(mapSpotQuote);
  },

  async getChains(ticker: string): Promise<OptionContract[]> {
    const raw = await apiFetch<Record<string, unknown>[]>(
      `/chains/${ticker.toUpperCase()}`
    );
    return raw.flatMap((chain: Record<string, unknown>) =>
      ((chain.contracts as Record<string, unknown>[]) ?? []).map(mapOptionContract)
    );
  },

  async getRisk(ticker: string): Promise<RiskMatrix | null> {
    try {
      return apiFetch<Record<string, unknown>>(`/risk/${ticker.toUpperCase()}`).then(mapRiskMatrix);
    } catch {
      return null;
    }
  },

  async getAlerts(): Promise<RiskAlert[]> {
    return apiFetch<RiskAlert[]>('/alerts');
  },

  async healthCheck(): Promise<boolean> {
    try {
      await apiFetch<{ status: string }>('/health');
      return true;
    } catch {
      return false;
    }
  },
};

// ---------------------------------------------------------------------------
// WebSocket client
// ---------------------------------------------------------------------------

export type WSCallbacks = {
  onHeartbeat?: (data: Record<string, unknown>) => void;
  onSpotUpdate?: (data: Record<string, unknown>) => void;
  onAlertFired?: (data: Record<string, unknown>) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (err: unknown) => void;
};

export function createWebSocket(callbacks: WSCallbacks): WebSocket {
  const ws = new WebSocket(WS_BASE);
  let pingInterval: ReturnType<typeof setInterval> | null = null;

  ws.onopen = () => {
    callbacks.onConnected?.();
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 25000);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string) as Record<string, unknown>;
      const type = data.type as string;
      if (type === 'heartbeat' || !type) {
        callbacks.onHeartbeat?.(data);
      } else if (type === 'spot_update') {
        callbacks.onSpotUpdate?.(data);
      } else if (type === 'alert_fired') {
        callbacks.onAlertFired?.(data);
      }
    } catch (e) {
      // ignore parse errors (e.g. pong reply)
    }
  };

  ws.onerror = (e) => callbacks.onError?.(e);
  ws.onclose = () => {
    if (pingInterval) clearInterval(pingInterval);
    callbacks.onDisconnected?.();
  };

  return ws;
}
