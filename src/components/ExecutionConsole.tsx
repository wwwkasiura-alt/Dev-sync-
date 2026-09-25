import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Terminal, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Cpu, 
  Eye, 
  Code2, 
  Maximize2, 
  Minimize2, 
  X, 
  Copy, 
  Check, 
  Layers, 
  Sparkles,
  Zap,
  Sliders
} from 'lucide-react';
import { ExecutionResult } from '../types';

interface ExecutionConsoleProps {
  currentCode: string;
  currentLanguage: string;
  currentFilePath?: string;
  onOpenMatrixModal?: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  currentCode,
  currentLanguage,
  currentFilePath,
  onOpenMatrixModal,
  isOpen,
  onToggleOpen,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(currentLanguage || 'python');
  const [stdinInput, setStdinInput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'stdin' | 'preview' | 'info'>('terminal');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);

  // Auto-sync language when file changes
  useEffect(() => {
    if (currentLanguage) {
      setSelectedLanguage(currentLanguage);
      if (currentLanguage === 'html') {
        setActiveTab('preview');
      }
    }
  }, [currentLanguage, currentFilePath]);

  const handleRunCode = async () => {
    if (!currentCode.trim() || isRunning) return;

    setIsRunning(true);
    const startTime = Date.now();

    try {
      const res = await fetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentCode,
          language: selectedLanguage,
          stdin: stdinInput,
          filePath: currentFilePath,
          timeoutMs: 12000,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.stderr || 'Execution failed');
      }

      setLastResult({
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        exitCode: data.exitCode ?? 0,
        executionTimeMs: data.executionTimeMs ?? (Date.now() - startTime),
        language: data.language || selectedLanguage,
        status: data.status || (data.exitCode === 0 ? 'success' : 'error'),
        isWebPreview: data.isWebPreview || selectedLanguage === 'html',
        timestamp: Date.now(),
      });

      if (selectedLanguage === 'html') {
        setActiveTab('preview');
      } else {
        setActiveTab('terminal');
      }
    } catch (err: any) {
      setLastResult({
        stdout: '',
        stderr: err.message || 'Error communicating with execution runner',
        exitCode: 1,
        executionTimeMs: Date.now() - startTime,
        language: selectedLanguage,
        status: 'error',
        timestamp: Date.now(),
      });
      setActiveTab('terminal');
    } finally {
      setIsRunning(false);
    }
  };

  const copyOutput = () => {
    const textToCopy = lastResult?.stdout || lastResult?.stderr || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageIcon = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python':
      case 'py':
        return '🐍';
      case 'javascript':
      case 'js':
        return '🟨';
      case 'typescript':
      case 'ts':
        return '🔷';
      case 'sql':
      case 'sqlite':
        return '🗄️';
      case 'bash':
      case 'sh':
        return '🐚';
      case 'c':
        return '⚙️';
      case 'cpp':
        return '🚀';
      case 'java':
        return '☕';
      case 'rust':
      case 'rs':
        return '🦀';
      case 'go':
        return '🐹';
      case 'html':
      case 'web':
        return '🌐';
      case 'kotlin':
      case 'kt':
        return '🟣';
      default:
        return '💻';
    }
  };

  return (
    <div
      className={`border-t border-slate-800 bg-slate-950 flex flex-col transition-all duration-200 ${
        !isOpen
          ? 'h-10'
          : isExpanded
          ? 'h-[65vh]'
          : 'h-64 sm:h-72'
      }`}
    >
      {/* Top Header Bar */}
      <div className="h-10 bg-slate-900/95 border-b border-slate-800/80 px-3 flex items-center justify-between shrink-0 select-none">
        
        {/* Left: Terminal Tab switcher & status */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={onToggleOpen}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-indigo-300 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline font-mono">EXECUTION CONSOLE</span>
          </button>

          {isOpen && (
            <div className="flex items-center gap-1 ml-2 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/70">
              <button
                type="button"
                onClick={() => setActiveTab('terminal')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  activeTab === 'terminal'
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Output {lastResult && `(${lastResult.status})`}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stdin')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  activeTab === 'stdin'
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                STDIN {stdinInput.trim() && '•'}
              </button>

              {selectedLanguage === 'html' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-indigo-900/70 text-indigo-200 font-semibold border border-indigo-700/50'
                      : 'text-slate-400 hover:text-indigo-300'
                  }`}
                >
                  <Eye className="w-3 h-3" /> Live Preview
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Language Selector, Run Button, and Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isOpen && (
            <>
              {/* Language Selector Dropdown */}
              <div className="flex items-center gap-1">
                <span className="text-xs">{getLanguageIcon(selectedLanguage)}</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="python">Python (python3)</option>
                  <option value="typescript">TypeScript (tsx)</option>
                  <option value="javascript">JavaScript (node)</option>
                  <option value="sql">SQL (sqlite3)</option>
                  <option value="bash">Shell (bash)</option>
                  <option value="c">C (gcc)</option>
                  <option value="cpp">C++ (g++)</option>
                  <option value="java">Java (javac)</option>
                  <option value="rust">Rust (rustc)</option>
                  <option value="go">Go (go run)</option>
                  <option value="html">HTML (Web Preview)</option>
                </select>
              </div>

              {/* Language Capability Matrix Button */}
              {onOpenMatrixModal && (
                <button
                  type="button"
                  onClick={onOpenMatrixModal}
                  title="View Universal Multi-Language Capability Matrix & Run Diagnostics"
                  className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700/60 transition-colors"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Matrix</span>
                </button>
              )}
            </>
          )}

          {/* Run Code Button */}
          <button
            type="button"
            onClick={handleRunCode}
            disabled={isRunning || !currentCode.trim()}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all shadow-md ${
              isRunning
                ? 'bg-indigo-600/60 text-white cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
            }`}
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run {isOpen ? '' : 'Code'}</span>
              </>
            )}
          </button>

          {/* Expand / Minimize / Close toggle */}
          {isOpen && (
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded hover:bg-slate-800 hover:text-slate-200"
                title={isExpanded ? 'Minimize Console' : 'Expand Console'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onToggleOpen}
                className="p-1 rounded hover:bg-slate-800 hover:text-slate-200"
                title="Hide Console"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Console Content Body */}
      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950 font-mono text-xs overflow-hidden">
          
          {/* Status Metrics Bar */}
          {lastResult && (
            <div className="px-3 py-1 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  {lastResult.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span
                    className={
                      lastResult.status === 'success' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'
                    }
                  >
                    Exit Code: {lastResult.exitCode}
                  </span>
                </span>

                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{lastResult.executionTimeMs}ms</span>
                </span>

                <span className="text-slate-500 hidden sm:inline">
                  Language: <strong className="text-slate-300">{lastResult.language}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={copyOutput}
                className="flex items-center gap-1 hover:text-slate-200 text-slate-400"
                title="Copy Terminal Output"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* Tab 1: Terminal Output */}
          {activeTab === 'terminal' && (
            <div className="flex-1 p-3 overflow-y-auto text-slate-200 font-mono space-y-2 select-text">
              {isRunning ? (
                <div className="flex items-center gap-2 text-indigo-400 py-4">
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Executing {selectedLanguage} script in universal sandbox...</span>
                </div>
              ) : !lastResult ? (
                <div className="text-slate-500 py-6 text-center space-y-2 font-sans">
                  <div className="flex justify-center text-slate-600">
                    <Terminal className="w-8 h-8" />
                  </div>
                  <p className="text-xs">
                    Ready to execute. Click <strong className="text-emerald-400">Run Code</strong> (or press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">Ctrl+Enter</kbd>) to compile and run.
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Supports Python 3 🐍, Node/JS 🟨, TypeScript 🔷, SQL 🗄️, Bash 🐚, C/C++ ⚙️, Java ☕, Rust 🦀, Go 🐹, HTML 🌐
                  </p>
                </div>
              ) : (
                <>
                  {/* Standard Output */}
                  {lastResult.stdout && (
                    <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed font-mono">
                      {lastResult.stdout}
                    </pre>
                  )}

                  {/* Standard Error */}
                  {lastResult.stderr && (
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-900/50 text-rose-300 whitespace-pre-wrap leading-relaxed">
                      {lastResult.stderr}
                    </div>
                  )}

                  {!lastResult.stdout && !lastResult.stderr && (
                    <div className="text-slate-500 italic">
                      [Process executed with exit code 0 and produced no standard output]
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab 2: STDIN Input Box */}
          {activeTab === 'stdin' && (
            <div className="flex-1 p-3 flex flex-col gap-2">
              <label className="text-[11px] text-slate-400 font-sans flex items-center justify-between">
                <span>Standard Input (passed to <code>input()</code>, <code>readline()</code>, <code>cin</code>):</span>
                <span className="text-[10px] text-slate-500">{stdinInput.length} chars</span>
              </label>
              <textarea
                value={stdinInput}
                onChange={(e) => setStdinInput(e.target.value)}
                placeholder="Enter input lines to pass to your program..."
                className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          )}

          {/* Tab 3: Live HTML Web Preview */}
          {activeTab === 'preview' && (
            <div className="flex-1 w-full h-full bg-white relative">
              <iframe
                title="Live HTML Preview"
                srcDoc={currentCode}
                sandbox="allow-scripts allow-modals allow-forms"
                className="w-full h-full border-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
