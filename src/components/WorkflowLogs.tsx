import React, { useState } from 'react';
import { WorkflowLog } from '../types';
import { Play, Pause, Trash2, Search, ArrowDownCircle, ShieldCheck, AlertOctagon, Terminal } from 'lucide-react';

interface WorkflowLogsProps {
  logs: WorkflowLog[];
  onClearLogs: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

export const WorkflowLogs: React.FC<WorkflowLogsProps> = ({
  logs,
  onClearLogs,
  isPaused,
  onTogglePause,
}) => {
  const [filterLevel, setFilterLevel] = useState<'all' | 'success' | 'warn' | 'error'>('all');
  const [searchText, setSearchText] = useState('');

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSearch =
      log.message.toLowerCase().includes(searchText.toLowerCase()) ||
      log.agentName.toLowerCase().includes(searchText.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchText.toLowerCase()));
    
    return matchesLevel && matchesSearch;
  });

  const getLogBorderColor = (level: string) => {
    switch (level) {
      case 'success': return 'border-l-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/8 border-white/5';
      case 'warn': return 'border-l-amber-400 bg-amber-500/5 hover:bg-amber-500/8 border-white/5';
      case 'error': return 'border-l-rose-400 bg-rose-500/5 hover:bg-rose-500/8 border-white/5';
      default: return 'border-l-slate-400 bg-slate-500/5 hover:bg-slate-500/8 border-white/5';
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success': return <ShieldCheck size={12} className="text-emerald-300 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.3)]" />;
      case 'warn': return <AlertOctagon size={12} className="text-amber-300 shrink-0 shadow-[0_0_8px_rgba(252,211,77,0.3)]" />;
      case 'error': return <AlertOctagon size={12} className="text-rose-300 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.3)]" />;
      default: return <Terminal size={12} className="text-slate-300 shrink-0" />;
    }
  };

  return (
    <div id="workflow-logs" className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md flex flex-col h-[420px] shadow-2xl">
      {/* Search & Controller Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-indigo-455 animate-pulse" />
          <h2 className="font-sans font-bold text-white tracking-tight text-base">
            Workflow Execution Stream
          </h2>
          <div className="relative flex h-2 w-2">
            {!isPaused && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
          </div>
        </div>

        {/* Action button grouping */}
        <div className="flex items-center gap-1.5 self-start">
          <button
            id="toggle-log-stream"
            onClick={onTogglePause}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              isPaused
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)] hover:bg-emerald-500/15'
                : 'border-white/5 bg-white/5 text-slate-350 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isPaused ? <Play size={11} /> : <Pause size={11} />}
            {isPaused ? 'Resume Stream' : 'Pause Stream'}
          </button>
          
          <button
            id="clear-logs"
            onClick={onClearLogs}
            className="rounded-xl border border-white/5 bg-white/5 px-3 py-1.5 text-xs text-rose-350 hover:bg-rose-500/10 hover:border-rose-500/20 flex items-center gap-1.5 transition-all cursor-pointer font-semibold"
          >
            <Trash2 size={11} />
            Reset
          </button>
        </div>
      </div>

      {/* Sub-Filters and search form */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3 shrink-0">
        {/* Search bar inputs */}
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-2.5 text-slate-500">
            <Search size={12} />
          </span>
          <input
            id="log-search-input"
            type="text"
            placeholder="Search stream / agent logs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full rounded-xl bg-black/35 border border-white/5 py-1.5 pl-8 pr-3 font-mono text-[11px] text-zinc-200 placeholder-zinc-550 focus:outline-none focus:border-white/15 transition-colors"
          />
        </div>

        {/* Level Filters Toggle */}
        <div className="flex items-center gap-0.5 bg-black/40 p-1 rounded-xl border border-white/5 self-start">
          {(['all', 'success', 'warn', 'error'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`rounded-lg px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer font-extrabold ${
                filterLevel === level
                  ? level === 'success'
                    ? 'bg-emerald-500/15 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                    : level === 'warn'
                    ? 'bg-amber-500/15 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                    : level === 'error'
                    ? 'bg-rose-500/15 text-rose-300 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                    : 'bg-white/15 text-white shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Scroll container */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-black/35 p-3.5 flex flex-col gap-2 shadow-inner">
        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono text-xs select-none">
            <ArrowDownCircle size={18} className="text-slate-650 animate-bounce mb-2" />
            No execution stream records found
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`border-l-2 p-2.5 rounded-xl border-y border-r transition-all flex flex-col gap-1 hover:border-white/10 duration-200 ${getLogBorderColor(
                log.level
              )}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getLogIcon(log.level)}
                  <span className="font-mono text-[10px] font-bold text-slate-200">
                    {log.agentName}
                  </span>
                </div>
                <span className="font-mono text-[9px] text-slate-500">{log.timestamp}</span>
              </div>
              <p className="font-mono text-[11px] text-slate-300 leading-relaxed pl-5">
                {log.message}
              </p>
              {log.details && (
                <div className="mt-1 pl-5 font-mono text-[9px] text-slate-500 leading-normal border-t border-white/5 pt-1">
                  Args: {log.details}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
