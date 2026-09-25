import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  Brain, 
  Code2, 
  ShieldAlert, 
  Cpu, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Terminal, 
  Users,
  MessageSquare,
  CornerDownLeft,
  ChevronRight,
  Zap,
  Files,
  FilePlus,
  FileEdit,
  Play,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AgentChatMessage, AgentInfo, AgentRole, CodePatch, Project, ExecutionResult } from '../types';

interface AgentSquadRoomProps {
  project: Project;
  agents: AgentInfo[];
  messages: AgentChatMessage[];
  onSendOrder: (orderText: string, targetAgent: 'all' | AgentRole) => Promise<void>;
  isLoading: boolean;
  onApplyPatch: (patch: CodePatch) => void;
  onApplyMultiplePatches?: (patches: CodePatch[]) => void;
  onOpenMatrixModal?: () => void;
}

export const AgentSquadRoom: React.FC<AgentSquadRoomProps> = ({
  project,
  agents,
  messages,
  onSendOrder,
  isLoading,
  onApplyPatch,
  onApplyMultiplePatches,
  onOpenMatrixModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [targetAgent, setTargetAgent] = useState<'all' | AgentRole>('all');
  const [testingPatchKey, setTestingPatchKey] = useState<string | null>(null);
  const [patchExecutionResults, setPatchExecutionResults] = useState<Record<string, ExecutionResult>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleTestPatchCode = async (patch: CodePatch, uniqueKey: string) => {
    if (testingPatchKey) return;
    setTestingPatchKey(uniqueKey);

    const ext = patch.filePath.split('.').pop() || 'py';
    try {
      const res = await fetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: patch.newContent,
          language: ext,
          filePath: patch.filePath,
        }),
      });

      const data = await res.json();
      setPatchExecutionResults((prev) => ({
        ...prev,
        [uniqueKey]: {
          stdout: data.stdout || '',
          stderr: data.stderr || '',
          exitCode: data.exitCode ?? 0,
          executionTimeMs: data.executionTimeMs ?? 0,
          language: data.language || ext,
          status: data.status || (data.exitCode === 0 ? 'success' : 'error'),
          isWebPreview: data.isWebPreview,
          timestamp: Date.now(),
        },
      }));
    } catch (err: any) {
      setPatchExecutionResults((prev) => ({
        ...prev,
        [uniqueKey]: {
          stdout: '',
          stderr: err.message || 'Execution failed',
          exitCode: 1,
          executionTimeMs: 0,
          language: ext,
          status: 'error',
          timestamp: Date.now(),
        },
      }));
    } finally {
      setTestingPatchKey(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    onSendOrder(text, targetAgent);
  };

  const isAndroid = project.type === 'android-apk';
  const quickOrders = [
    {
      label: '🐍 Python Data & Algo',
      text: 'Python mein ek efficient data processing algorithm banao with prime numbers & benchmarking stats in `script.py`.',
      target: 'coder' as const
    },
    {
      label: '🔷 TypeScript State & Logic',
      text: 'TypeScript mein modular state manager aur server metrics logic implement karo in `src/metrics.ts`.',
      target: 'coder' as const
    },
    {
      label: '🗄️ SQL Database Schema',
      text: 'SQLite schema banao with users, transactions tables aur analytical aggregation queries in `schema.sql`.',
      target: 'coder' as const
    },
    {
      label: '🐚 Shell Pipeline Script',
      text: 'Bash automation script likho jo environment probe, disk check aur build artifact validation kare in `deploy.sh`.',
      target: 'devops' as const
    },
    {
      label: isAndroid ? '🚀 Compose FAB & Counter' : '🚀 React Interactive Component',
      text: isAndroid 
        ? 'Project UI screen mein ek modern Floating Action Button aur reactive state counter add karo with clean Compose animation.'
        : 'App UI mein modern interactive buttons aur reactive state handlers add karo with clean styling.',
      target: 'all' as const
    },
    {
      label: '🛡️ Full Code & Security Audit',
      text: 'Is project ke code ko review karo, check for memory leaks, type safety, null pointers, and potential crashes.',
      target: 'reviewer' as const
    }
  ];

  const getAgentInfo = (role?: AgentRole) => {
    return agents.find((a) => a.id === role) || agents[0];
  };

  const getAgentIcon = (role?: AgentRole) => {
    switch (role) {
      case 'architect':
        return <Brain className="w-4 h-4" />;
      case 'coder':
        return <Code2 className="w-4 h-4" />;
      case 'reviewer':
        return <ShieldAlert className="w-4 h-4" />;
      case 'devops':
        return <Cpu className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-slate-950 text-slate-200 overflow-hidden">
      
      {/* Left Column: AI Team roster & quick commands */}
      <aside className="w-72 sm:w-80 border-r border-slate-800 bg-slate-900/90 flex flex-col shrink-0 p-4 overflow-y-auto">
        
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-indigo-400" />
          <h2 className="font-semibold text-xs tracking-wider uppercase text-slate-300">
            Active AI Squad ({agents.length})
          </h2>
        </div>

        {/* Agent Cards */}
        <div className="space-y-2 mb-6">
          {agents.map((agent) => {
            const isSelected = targetAgent === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => setTargetAgent(isSelected ? 'all' : agent.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-indigo-500/70 shadow-sm ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${agent.avatarBg} border`}>
                      {getAgentIcon(agent.id)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100">{agent.name}</div>
                      <div className="text-[10px] text-slate-400">{agent.title}</div>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                  {agent.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Quick order shortcuts */}
        <div className="mt-auto pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Direct Orders</span>
          </div>
          <div className="space-y-1.5">
            {quickOrders.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTargetAgent(q.target);
                  setInputText(q.text);
                }}
                className="w-full text-left p-2 rounded-md bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-[11px] text-slate-300 transition-colors flex items-center justify-between group"
              >
                <span className="truncate">{q.label}</span>
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>

      </aside>

      {/* Main Conversation & Order Terminal */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        
        {/* Top room header */}
        <div className="h-12 px-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5 overflow-hidden">
              {agents.map((a) => (
                <div key={a.id} className={`inline-block h-6 w-6 rounded-full border border-slate-900 ${a.avatarBg} flex items-center justify-center`}>
                  {getAgentIcon(a.id)}
                </div>
              ))}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200">Autonomous Squad Room</span>
              <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">
                Target: <strong className="text-indigo-400 uppercase">{targetAgent === 'all' ? 'All Team (Debate & Code)' : targetAgent}</strong>
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Gemini AI Connected</span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 select-text">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const agent = msg.agentRole ? getAgentInfo(msg.agentRole) : null;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    isUser
                      ? 'bg-slate-700 text-slate-200 border-slate-600'
                      : agent
                      ? `${agent.avatarBg} border-indigo-500/30`
                      : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {isUser ? <Users className="w-4 h-4" /> : agent ? getAgentIcon(agent.id) : <Bot className="w-4 h-4" />}
                </div>

                {/* Content Box */}
                <div
                  className={`rounded-xl p-4 text-xs leading-relaxed space-y-2 border ${
                    isUser
                      ? 'bg-indigo-600 text-white border-indigo-500/40 rounded-tr-none'
                      : 'bg-slate-900 text-slate-200 border-slate-800/90 rounded-tl-none'
                  }`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center justify-between gap-4 pb-1 border-b border-slate-700/40">
                    <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                      {isUser ? 'You (Commander)' : agent?.name || msg.senderName}
                      {agent && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          • {agent.title}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 opacity-80">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Body text */}
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Proposed Patch Cards if present */}
                  {(() => {
                    const patches = msg.suggestedPatches && msg.suggestedPatches.length > 0
                      ? msg.suggestedPatches
                      : msg.suggestedPatch
                      ? [msg.suggestedPatch]
                      : [];

                    if (patches.length === 0) return null;

                    const isMultiple = patches.length > 1;

                    return (
                      <div className="mt-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] space-y-3">
                        <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                          <span className="flex items-center gap-1.5 text-indigo-300 font-sans font-semibold text-xs">
                            <Files className="w-4 h-4 text-indigo-400" />
                            <span>
                              {isMultiple
                                ? `Proposed Multi-File Patch (${patches.length} files)`
                                : `Target: ${patches[0].filePath}`}
                            </span>
                          </span>

                          {isMultiple && (
                            <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-700/50">
                              Atomic Multi-Patch
                            </span>
                          )}
                        </div>

                        {/* List of files being patched */}
                        <div className="space-y-2">
                          {patches.map((patch, pIdx) => (
                            <div key={pIdx} className="p-2.5 rounded bg-slate-900/80 border border-slate-800 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-slate-200 text-xs font-semibold">
                                  {patch.action === 'create' ? (
                                    <FilePlus className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <FileEdit className="w-3.5 h-3.5 text-sky-400" />
                                  )}
                                  <span>{patch.filePath}</span>
                                </span>
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {patch.action}
                                </span>
                              </div>

                              <p className="text-slate-400 text-[11px] font-sans">
                                {patch.summary}
                              </p>

                              <pre className="p-2 rounded bg-black/70 overflow-x-auto text-[10px] text-emerald-300 max-h-36 whitespace-pre border border-slate-800/60">
                                <code>{patch.newContent.slice(0, 300)}{patch.newContent.length > 300 ? '\n// ... [remaining code]' : ''}</code>
                              </pre>

                              {/* Patch Execution Output if tested */}
                              {(() => {
                                const pKey = `${msg.id}-${pIdx}`;
                                const execRes = patchExecutionResults[pKey];
                                const isTesting = testingPatchKey === pKey;

                                return (
                                  <div className="space-y-1 pt-1">
                                    <div className="flex items-center justify-between">
                                      <button
                                        type="button"
                                        onClick={() => handleTestPatchCode(patch, pKey)}
                                        disabled={isTesting}
                                        className="px-2.5 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 text-[10px] font-semibold flex items-center gap-1.5 border border-indigo-700/50 transition-colors"
                                      >
                                        {isTesting ? (
                                          <>
                                            <RotateCcw className="w-3 h-3 animate-spin text-indigo-300" />
                                            <span>Running in sandbox...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Play className="w-3 h-3 fill-current text-emerald-400" />
                                            <span>Run & Test Code</span>
                                          </>
                                        )}
                                      </button>

                                      {isMultiple && msg.appliedStatus !== 'applied' && (
                                        <button
                                          type="button"
                                          onClick={() => onApplyPatch(patch)}
                                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1 border border-slate-700"
                                        >
                                          <Check className="w-3 h-3 text-emerald-400" /> Apply this file only
                                        </button>
                                      )}
                                    </div>

                                    {execRes && (
                                      <div className="mt-2 p-2 rounded-lg bg-black/90 border border-slate-800 text-[10px] space-y-1">
                                        <div className="flex items-center justify-between text-slate-400 border-b border-slate-900 pb-1">
                                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                            <Terminal className="w-3 h-3" />
                                            <span>Execution Result ({execRes.executionTimeMs}ms)</span>
                                          </span>
                                          <span className={execRes.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                            Exit: {execRes.exitCode}
                                          </span>
                                        </div>
                                        {execRes.stdout && (
                                          <pre className="text-emerald-300 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                            <code>{execRes.stdout}</code>
                                          </pre>
                                        )}
                                        {execRes.stderr && (
                                          <pre className="text-rose-300 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                            <code>{execRes.stderr}</code>
                                          </pre>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                        </div>

                        {/* Action Toolbar */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                          <span className="text-[10px] text-slate-500 font-sans">
                            {msg.appliedStatus === 'applied' ? 'All changes applied to workspace files' : 'Review code before applying'}
                          </span>

                          <div>
                            {msg.appliedStatus === 'applied' ? (
                              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                <Check className="w-4 h-4" /> Applied to Project
                              </span>
                            ) : isMultiple && onApplyMultiplePatches ? (
                              <button
                                type="button"
                                onClick={() => onApplyMultiplePatches(patches)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Apply All {patches.length} Files to Project
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onApplyPatch(patches[0])}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Apply Code to Project
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 animate-pulse">
                <Brain className="w-4 h-4" />
              </div>
              <div className="rounded-xl p-3.5 text-xs bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>AI Engineering Squad is analyzing order, writing code, and conducting QA review...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar for Direct Orders */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/70">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] text-slate-400">Order to:</span>
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setTargetAgent('all')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    targetAgent === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  @All Team
                </button>
                {agents.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setTargetAgent(a.id)}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      targetAgent === a.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    @{a.name} ({a.title.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="agent-order-input"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Give direct order to AI team (e.g. 'Add Dark Mode to MainActivity', 'Review bugs', 'Optimize gradle')..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                disabled={isLoading}
              />
              <button
                id="send-order-btn"
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow transition-colors shrink-0"
              >
                <span>Command Team</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

      </main>

    </div>
  );
};
