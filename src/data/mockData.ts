import { OptionContract, Agent, WorkflowLog, MonitorConfig, MacroEvent } from '../types';
import { calculateBlackScholes } from '../utils/blackScholes';

export const SUPPORTED_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'SPY', 'MSFT'];

export const INITIAL_TICKER_PRICES: Record<string, number> = {
  NVDA: 125.40,
  AAPL: 182.25,
  TSLA: 177.90,
  SPY: 520.15,
  MSFT: 415.80
};

export const INITIAL_CONFIG: MonitorConfig = {
  minOpportunityScore: 70,
  minPremium: 0.50,
  maxDrawdownLimit: 15.0,
  maxPositionSize: 10,
  targetDeltaMin: 0.20,
  targetDeltaMax: 0.85,
  scanIntervalMs: 2500,
  selectedTicker: 'NVDA'
};

export const INITIAL_MACRO_EVENTS: MacroEvent[] = [
  {
    id: 'm1',
    source: 'Polymarket',
    question: 'Fed interest rate cuts by 50bps or more in next FOMC meeting',
    probability: 0.18,
    impactCorrelation: 'Yield curve shift / Call skew surges (+18%)',
    status: 'MONITORED'
  },
  {
    id: 'm2',
    source: 'Kalshi',
    question: 'US MoM Core CPI inflation exceeding 0.3% in next print',
    probability: 0.32,
    impactCorrelation: 'Hedger Put volume rise / Volatility skew (+8%)',
    status: 'ACTIVE'
  },
  {
    id: 'm3',
    source: 'Polymarket',
    question: 'NVIDIA CEO announces custom TPU co-processor keynote',
    probability: 0.74,
    impactCorrelation: 'Post-event IV Crush Alert (-25%) / Heavy Volume',
    status: 'ACTIVE'
  }
];

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'agent_a',
    name: 'Agent A: Context Assembler',
    role: 'Monitors & aggregates real-time data from Alpaca direct feed, Polygon.io, and Polymarket / Kalshi probability markets.',
    status: 'ACTIVE',
    currentTask: 'Ingesting NASDAQ OPRA feed & polling macro contract spreads',
    lastActiveTime: 'Just Now',
    processedCount: 1482,
    flaggedCount: 12,
    performanceScore: 98.4,
    workflowStep: 2
  },
  {
    id: 'agent_b',
    name: 'Agent B: Greeks Engine',
    role: 'Calculates continuous Black-Scholes Greeks, maps volatility smiles, and scans for Gamma Walls / IV Crush events.',
    status: 'ACTIVE',
    currentTask: 'Re-evaluating implied volatility smiles',
    lastActiveTime: 'Just Now',
    processedCount: 2964,
    flaggedCount: 18,
    performanceScore: 99.8,
    workflowStep: 1
  },
  {
    id: 'agent_c',
    name: 'Agent C: Risk Watchdog',
    role: 'Enforces strict risk rules: delta neutrality thresholds, bid-ask spread safety margins, and circuit breaker interlocks.',
    status: 'ACTIVE',
    currentTask: 'Auditing options portfolio risk boundaries',
    lastActiveTime: 'Just Now',
    processedCount: 421,
    flaggedCount: 1,
    performanceScore: 100.0,
    workflowStep: 0
  }
];

export const INITIAL_LOGS: WorkflowLog[] = [
  {
    id: 'l1',
    timestamp: '13:52:10',
    level: 'info',
    agentId: 'agent_a',
    agentName: 'Agent A: Context Assembler',
    message: 'Alpaca direct feed handshake secured. Monitoring Kalshi/Polymarket core event parameters.',
  },
  {
    id: 'l2',
    timestamp: '13:52:12',
    level: 'info',
    agentId: 'agent_b',
    agentName: 'Agent B: Greeks Engine',
    message: 'Continuous Black-Scholes Greeks engine hot loaded. Scanning skew anomalies on 32 option listings.',
  },
  {
    id: 'l3',
    timestamp: '13:52:15',
    level: 'info',
    agentId: 'agent_c',
    agentName: 'Agent C: Risk Watchdog',
    message: 'Delta-neutral active threshold registered [-0.35, +0.35]. Bid-Ask spread filter set to 15%.',
  },
  {
    id: 'l4',
    timestamp: '13:52:18',
    level: 'success',
    agentId: 'agent_b',
    agentName: 'Agent B: Greeks Engine',
    message: 'Detected prominent Gamma Wall 🧱 at near-spot strikes on NVDA option grid.',
    details: 'Resistance cluster at strike boundary indicates heavy dealer buying leverage.'
  },
  {
    id: 'l5',
    timestamp: '13:52:20',
    level: 'warn',
    agentId: 'agent_c',
    agentName: 'Agent C: Risk Watchdog',
    message: 'Near-term Put ask spread wider than 12% safety threshold. Flagging defensive circuit buffer.',
  }
];

// Generates simulated option contracts for a given ticker and spot price
export function generateContracts(ticker: string, spotPrice: number): OptionContract[] {
  const contracts: OptionContract[] = [];
  const strikes = getStrikesForTicker(ticker, spotPrice);
  const expiration = 'Jun 26, 2026';
  const days = 19;
  const riskFreeRate = 0.045; // 4.5%

  strikes.forEach((strike) => {
    // Determine Implied Volatilities based on Volatility Smile
    const smileSkew = Math.abs(strike - spotPrice) / spotPrice;
    // Puts generally have higher IV (volatility skew/smile)
    const baseIV = ticker === 'SPY' ? 0.14 : 0.42;
    const ivCall = baseIV + smileSkew * 0.35;
    const ivPut = baseIV + smileSkew * 0.45;

    // Create Call
    const callBS = calculateBlackScholes(spotPrice, strike, days, riskFreeRate, ivCall, 'CALL');
    const callBid = Math.max(0.05, callBS.price * 0.98);
    const callAsk = Math.max(0.10, callBS.price * 1.02);
    const callOpenInterest = Math.round((2000 - Math.abs(strike - spotPrice) * 12) + Math.random() * 200);
    const callVolume = Math.round((500 - Math.abs(strike - spotPrice) * 5) + Math.random() * 50);

    // Calculate simulated agent values
    let callAgentStatus: 'FLAGGED' | 'WATCHED' | 'SKIPPED' = 'SKIPPED';
    let callScore = Math.min(99, Math.round(50 + (callBS.greeks.delta * 30) + (Math.random() * 15)));
    let callReason = '';

    if (strike > spotPrice && strike < spotPrice * 1.08 && callBS.greeks.delta > 0.3 && callBS.greeks.delta < 0.5) {
      callScore = Math.min(98, callScore + 15);
      if (callScore >= 75) {
        callAgentStatus = 'FLAGGED';
        callReason = `Gamma Wall Detected 🧱 at $${strike} strike. Elevated market interest makes premium high-probability yield.`;
      }
    } else if (Math.abs(callBS.greeks.delta - 0.5) < 0.1) {
      callAgentStatus = 'WATCHED';
    }

    contracts.push({
      id: `${ticker}-${strike}-C`,
      ticker,
      strike,
      expiration,
      daysToExpiration: days,
      type: 'CALL',
      bid: Number(callBid.toFixed(2)),
      ask: Number(callAsk.toFixed(2)),
      lastPrice: Number(callBS.price.toFixed(2)),
      volume: Math.max(0, callVolume),
      openInterest: Math.max(0, callOpenInterest),
      impliedVolatility: Number(ivCall.toFixed(3)),
      underlyingPrice: spotPrice,
      greeks: callBS.greeks,
      opportunityScore: callScore,
      agentStatus: callAgentStatus,
      reasonFlagged: callReason,
      riskRating: callBS.greeks.delta > 0.7 ? 'LOW' : callBS.greeks.delta < 0.3 ? 'HIGH' : 'MED'
    });

    // Create Put
    const putBS = calculateBlackScholes(spotPrice, strike, days, riskFreeRate, ivPut, 'PUT');
    const putBid = Math.max(0.05, putBS.price * 0.97);
    const putAsk = Math.max(0.10, putBS.price * 1.03);
    const putOpenInterest = Math.round((1800 - Math.abs(strike - spotPrice) * 10) + Math.random() * 200);
    const putVolume = Math.round((400 - Math.abs(strike - spotPrice) * 4) + Math.random() * 40);

    let putAgentStatus: 'FLAGGED' | 'WATCHED' | 'SKIPPED' = 'SKIPPED';
    let putScore = Math.min(99, Math.round(45 + (Math.abs(putBS.greeks.delta) * 35) + (Math.random() * 12)));
    let putReason = '';

    if (strike < spotPrice && strike > spotPrice * 0.92 && Math.abs(putBS.greeks.delta) > 0.25 && Math.abs(putBS.greeks.delta) < 0.45) {
      putScore = Math.min(97, putScore + 20);
      if (putScore >= 75) {
        putAgentStatus = 'FLAGGED';
        putReason = `Post-Macro IV Crush Prospect 💥 high near-term implied skew offers arbitrage offset pre-announcement.`;
      }
    } else if (Math.abs(Math.abs(putBS.greeks.delta) - 0.5) < 0.1) {
      putAgentStatus = 'WATCHED';
    }

    contracts.push({
      id: `${ticker}-${strike}-P`,
      ticker,
      strike,
      expiration,
      daysToExpiration: days,
      type: 'PUT',
      bid: Number(putBid.toFixed(2)),
      ask: Number(putAsk.toFixed(2)),
      lastPrice: Number(putBS.price.toFixed(2)),
      volume: Math.max(0, putVolume),
      openInterest: Math.max(0, putOpenInterest),
      impliedVolatility: Number(ivPut.toFixed(3)),
      underlyingPrice: spotPrice,
      greeks: putBS.greeks,
      opportunityScore: putScore,
      agentStatus: putAgentStatus,
      reasonFlagged: putReason,
      riskRating: Math.abs(putBS.greeks.delta) > 0.7 ? 'HIGH' : Math.abs(putBS.greeks.delta) < 0.3 ? 'LOW' : 'MED'
    });
  });

  return contracts.sort((a, b) => b.strike - a.strike); // Sort strike high to low
}

function getStrikesForTicker(ticker: string, price: number): number[] {
  const steps = ticker === 'SPY' ? 2 : ticker === 'NVDA' ? 5 : 5;
  const count = 7;
  const roundedSpot = Math.round(price);
  const strikes: number[] = [];

  for (let i = -Math.floor(count / 2); i <= Math.floor(count / 2); i++) {
    strikes.push(roundedSpot + i * steps);
  }
  return strikes;
}

// Generates dynamic workflow process updates for logging
const AGENT_WORKFLOWS: Record<string, string[]> = {
  agent_a: [
    'Handshaking direct order books from Alpaca API',
    'Updating local spot underlying price cache',
    'Polling Kalshi FED contract probability arrays',
    'Aggregating Polygon.io IV skew history profiles'
  ],
  agent_b: [
    'Computing strike smile skews across option grid',
    'Identifying Gamma Wall concentration boundaries',
    'Scanning for imminent IV crush arbitrage events',
    'Compiling Black-Scholes delta curves'
  ],
  agent_c: [
    'Auditing active option contract margins',
    'Verifying aggregate delta neutrality boundaries',
    'Monitoring macro slip on bid-ask grid spreads',
    'Armed: Risk circuit breaker watchdog standby'
  ]
};

const LOG_TEMPLATE: { level: 'info' | 'success' | 'warn' | 'error'; agent: string; message: string; details: string }[] = [
  { level: 'info', agent: 'agent_a', message: 'Alpaca direct feed connection safe. Direct OPRA telemetry online.', details: 'Bandwidth: 14.8 Mb/s' },
  { level: 'info', agent: 'agent_b', message: 'Calculated implied smile bounds for near-expiry strikes.', details: 'Re-indexed at risk-free rate = 4.5%' },
  { level: 'success', agent: 'agent_b', message: 'Boundary Alert: Detected Gamma Wall 🧱 consolidating open interest.', details: 'Target strike resistance confirmed.' },
  { level: 'success', agent: 'agent_a', message: 'Kalshi events reveal +8.2% shift on interest cut probabilities.', details: 'Re-pricing near-term Call skew factors.' },
  { level: 'warn', agent: 'agent_c', message: 'Option bid-ask spread exceeded watchdog defensive threshold.', details: 'Bid/Ask difference hit 12% on PUT strike cluster.' },
  { level: 'error', agent: 'agent_a', message: 'Polygon.io IV query gateway timed out. Initiating auto-retry.', details: 'Code 504: Reconnect active in 2.0 seconds.' },
  { level: 'success', agent: 'agent_b', message: 'Arbitrage Opportunity: Pre-event IV Crush pricing gap discovered.', details: 'Divergence exceeding 3.5 standard deviations from median smile.' },
  { level: 'warn', agent: 'agent_c', message: 'Portfolio net Delta shifted outside target neutrality bounds.', details: 'Current Delta limits tripped state check.' }
];

export function generateRandomLog(agents: Agent[]): { log: WorkflowLog; updatedAgents: Agent[] } {
  const template = LOG_TEMPLATE[Math.floor(Math.random() * LOG_TEMPLATE.length)];
  const agent = agents.find(a => a.id === template.agent) || agents[0];
  
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const log: WorkflowLog = {
    id: `l-rand-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: timeStr,
    level: template.level,
    agentId: agent.id,
    agentName: agent.name,
    message: template.message,
    details: template.details
  };

  // Update agent processed counters
  const updatedAgents = agents.map((a) => {
    if (a.id === agent.id) {
      const wfs = AGENT_WORKFLOWS[a.id] || ['Processing dynamic pipeline'];
      const nextStepIndex = (a.workflowStep + 1) % wfs.length;
      return {
        ...a,
        processedCount: a.processedCount + 1,
        flaggedCount: template.level === 'success' ? a.flaggedCount + 1 : a.flaggedCount,
        currentTask: wfs[nextStepIndex],
        workflowStep: nextStepIndex,
        lastActiveTime: 'Just Now'
      };
    }
    return { ...a, lastActiveTime: '1s ago' };
  });

  return { log, updatedAgents };
}
