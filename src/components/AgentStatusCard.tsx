import React from 'react';
import { Agent } from '../types';
import { Play, Pause, Activity, CheckSquare, AlertTriangle, Cpu } from 'lucide-react';

interface AgentStatusCardProps {
  agent: Agent;
  onToggleStatus: (id: string) => void;
}

export const AgentStatusCard: React.FC<AgentStatusCardProps> = ({ agent, onToggleStatus }) => {
  const isRunning = agent.status === 'ACTIVE';

  const getStatusColor = () => {
    switch (agent.status) {
      case 'ACTIVE':
        return 'border-emerald-500/25 bg-white/5 text-slate-200';
      case 'PAUSED':
        return 'border-amber-500/25 bg-white/5 text-slate-300';
      case 'ERROR':
        return 'border-rose-500/25 bg-white/5 text-slate-200';
      default:
        return 'border-white/10 bg-white/5 text-slate-300';
    }
  };

  const getPulseColor = () => {
    switch (agent.status) {
      case 'ACTIVE': return 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]';
      case 'PAUSED': return 'bg-amber-400';
      case 'ERROR': return 'bg-rose-500 animate-ping';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div
      id={`agent-card-${agent.id}`}
      className={`relative overflow-hidden backdrop-blur-md rounded-2xl border p-5 transition-all duration-300 ${getStatusColor()} hover:scale-[1.02] hover:border-white/20 hover:shadow-xl hover:shadow-black/30`}
    >
      {/* Background Accent Gradient Blurs */}
      <div className="absolute right-0 top-0 -mr-6 -mt-6 h-20 w-20 rounded-full bg-indigo-500/10 blur-xl pointer-events-none"></div>
      
      {/* Name and Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${getPulseColor()}`} />
            <h3 className="font-sans font-semibold text-white tracking-tight text-sm">{agent.name}</h3>
          </div>
          <p className="font-sans text-xs text-slate-400 leading-normal min-h-[32px]">{agent.role}</p>
        </div>
        <button
          id={`toggle-agent-${agent.id}`}
          onClick={() => onToggleStatus(agent.id)}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer ${
            isRunning 
              ? 'border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20' 
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
          }`}
          title={isRunning ? "Pause Agent" : "Resume Agent"}
        >
          {isRunning ? <Pause size={13} /> : <Play size={13} />}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/5 py-3">
        <div className="text-center">
          <div className="font-mono text-xs font-semibold text-white">{agent.processedCount}</div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">Scanned</div>
        </div>
        <div className="text-center border-x border-white/5">
          <div className="font-mono text-xs font-semibold text-rose-300">{agent.flaggedCount}</div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">Flagged</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-xs font-semibold text-emerald-300">{agent.performanceScore}%</div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">Efficiency</div>
        </div>
      </div>

      {/* Operational Task */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 tracking-wider">
          <span className="flex items-center gap-1">
            <Cpu size={11} className="text-indigo-400" />
            CURRENT OPERATIONS
          </span>
          <span className="text-slate-400">{agent.lastActiveTime}</span>
        </div>
        
        {/* Dynamic task bar */}
        <div className="rounded-xl bg-black/25 p-2 px-3 border border-white/5">
          <span className="block font-mono text-xs text-indigo-300 truncate tracking-tight animate-fade-in">
            &gt; {agent.currentTask}
          </span>
        </div>

        {/* Steps track visualizer */}
        <div className="flex items-center justify-between gap-1 pt-1">
          {[0, 1, 2, 3].map((step) => {
            const isCompleted = step < agent.workflowStep;
            const isCurrent = step === agent.workflowStep;
            return (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full ${
                  isCurrent
                    ? 'bg-gradient-to-r from-indigo-400 to-emerald-400 shadow-[0_0_8px_#818cf8]'
                    : isCompleted
                    ? 'bg-indigo-500/40'
                    : 'bg-white/5'
                }`}
                title={`Pipeline Step ${step + 1}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
