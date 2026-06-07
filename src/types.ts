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

