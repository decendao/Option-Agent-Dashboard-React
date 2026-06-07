export type OptionType = 'CALL' | 'PUT';

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface OptionContract {
  id: string;
  ticker: string;
  strike: number;
  expiration: string;
  daysToExpiration: number;
  type: OptionType;
  bid: number;
  ask: number;
  lastPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number; // represented as decimal (e.g. 0.32 for 32%)
  underlyingPrice: number;
  greeks: Greeks;
  opportunityScore: number; // Calculated by Agent: 0 - 100
  agentStatus: 'FLAGGED' | 'WATCHED' | 'SKIPPED';
  reasonFlagged?: string;
  riskRating: 'LOW' | 'MED' | 'HIGH';
}

export type AgentStatus = 'IDLE' | 'ACTIVE' | 'ERROR' | 'PAUSED';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  currentTask: string;
  lastActiveTime: string;
  processedCount: number;
  flaggedCount: number;
  performanceScore: number; // percentage
  workflowStep: number; // active step index
}

export interface WorkflowLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  agentId: string;
  agentName: string;
  message: string;
  details?: string;
}

export interface MonitorConfig {
  minOpportunityScore: number;
  minPremium: number;
  maxDrawdownLimit: number; // percentage
  maxPositionSize: number; // contracts
  targetDeltaMin: number;
  targetDeltaMax: number;
  scanIntervalMs: number;
  selectedTicker: string;
}

export interface MacroEvent {
  id: string;
  source: 'Polymarket' | 'Kalshi';
  question: string;
  probability: number; // 0.0 to 1.0
  impactCorrelation: string; // e.g. "IV Crush Alert (-15%)", "Call Volume Delta (+22%)"
  status: 'ACTIVE' | 'SIGNAL_TRIGGERED' | 'MONITORED';
}

// ---------------------------------------------------------------------------
// API types — mirror backend api_models.py
// ---------------------------------------------------------------------------

export type AgentInfo = Agent;

export interface SpotQuote {
  ticker: string;
  spotPrice: number;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: string;
  source: string;
}

export interface RiskMatrix {
  ticker: string;
  spotPrice: number;
  gammaWallBreach: boolean;
  zeroGammaBreach: boolean;
  ivCrushImminent: boolean;
  evArbDetected: boolean;
  ivAnalysis: { currentIv: number; ivRank: number } | null;
  gammaWallStrike: number | null;
}

export interface RiskAlert {
  id: string;
  ticker: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  headline: string;
  narrative: string;
  recommendedAction: string;
  timestamp: string;
  triggeredRules: string[];
}

export interface DashboardSnapshot {
  heartbeat: {
    cycle_id: string;
    duration_ms: number;
    agent_a_ok: boolean;
    agent_b_ok: boolean;
    agent_c_ok: boolean;
    alerts_this_cycle: number;
    errors_this_cycle: number;
  };
  agents: Array<{
    name: string;
    status: string;
    last_cycle_id: string | null;
    last_cycle_ms: number | null;
    last_active_utc: string | null;
    consecutive_errors: number;
    cycle_count: number;
  }>;
  spot_quotes: Record<string, SpotQuote>;
  options_chains: Record<string, Array<{
    contracts: OptionContract[];
  }>>;
  risk_matrices: Record<string, RiskMatrix>;
  recent_alerts: RiskAlert[];
  uptime_seconds: number;
}
