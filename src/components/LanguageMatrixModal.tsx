import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Play, 
  Terminal, 
  FileCode, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Check, 
  Plus, 
  Sparkles,
  ExternalLink,
  Info
} from 'lucide-react';
import { LanguageCapabilityInfo, Project, ProjectFile } from '../types';

interface LanguageMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onCreateFileFromTemplate: (file: ProjectFile) => void;
}

export const LanguageMatrixModal: React.FC<LanguageMatrixModalProps> = ({
  isOpen,
  onClose,
  project,
  onCreateFileFromTemplate,
}) => {
  const [matrixData, setMatrixData] = useState<LanguageCapabilityInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCapabilityInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'test-suite' | 'architecture'>('matrix');

  // Load Matrix Data on open
  const fetchMatrix = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/code/matrix-probe');
      const data = await res.json();
      if (data.matrix && Array.isArray(data.matrix)) {
        setMatrixData(data.matrix);
        if (!selectedLanguage && data.matrix.length > 0) {
          setSelectedLanguage(data.matrix[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load language matrix:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMatrix();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateFile = (lang: LanguageCapabilityInfo) => {
    if (!project) return;

    const baseName = lang.id === 'python' ? 'script' : lang.id === 'html' ? 'index' : lang.id === 'sql' ? 'database' : lang.id === 'c' || lang.id === 'cpp' ? 'main' : 'app';
    const filePath = `src/${baseName}${lang.extension}`;

    const newFile: ProjectFile = {
      id: 'file-' + Date.now() + '-' + lang.id,
      name: `${baseName}${lang.extension}`,
      path: filePath,
      language: lang.id,
      lastModified: Date.now(),
      content: lang.sampleCode,
    };

    onCreateFileFromTemplate(newFile);
    onClose();
  };

  const passedCount = matrixData.filter((m) => m.testStatus === 'passed').length;
  const totalCount = matrixData.length || 11;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-5xl h-[88vh] rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Universal Language Execution Matrix</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  {passedCount}/{totalCount} Runtimes Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Full-stack polyglot environment with real-time compilers, interpreters, and AI execution feedback.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchMatrix}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{isLoading ? 'Testing...' : 'Re-Run Matrix Test'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="px-6 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-2.5 border-b-2 transition-all ${
              activeTab === 'matrix'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Language Capability Table
          </button>
          <button
            onClick={() => setActiveTab('test-suite')}
            className={`py-2.5 border-b-2 transition-all ${
              activeTab === 'test-suite'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🧪 Live Hello World & Test Outputs
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-2.5 border-b-2 transition-all ${
              activeTab === 'architecture'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🏗️ Architecture & AI Integration
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: Capability Matrix Table */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {matrixData.map((lang) => {
                  const isSelected = selectedLanguage?.id === lang.id;

                  return (
                    <div
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        {/* Top row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{lang.icon}</span>
                            <div>
                              <h4 className="text-sm font-bold text-slate-100">{lang.name}</h4>
                              <span className="text-[10px] font-mono text-slate-400">
                                {lang.command} ({lang.extension})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {lang.testStatus === 'passed' ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>{lang.testDurationMs}ms</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600/40">
                                <Info className="w-3 h-3 text-amber-400" />
                                <span>Ready</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-slate-400 mb-3 line-clamp-2">
                          {lang.description}
                        </p>

                        {/* 6 Capabilities Pills */}
                        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono mb-3">
                          <div className="flex items-center justify-center gap-1 p-1 rounded bg-slate-950/80 border border-slate-800 text-emerald-300">
                            <span>✍️</span> <span>Write</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 p-1 rounded bg-slate-950/80 border border-slate-800 text-emerald-300">
                            <span>📖</span> <span>Read</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 p-1 rounded bg-slate-950/80 border border-slate-800 text-emerald-300">
                            <span>🛠️</span> <span>Edit</span>
                          </div>
                          <div
                            className={`flex items-center justify-center gap-1 p-1 rounded border ${
                              lang.capabilities.execute
                                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 font-bold'
                                : 'bg-slate-950/80 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span>▶️</span> <span>Exec</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 p-1 rounded bg-slate-950/80 border border-slate-800 text-emerald-300">
                            <span>📦</span> <span>Pkg</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 p-1 rounded bg-slate-950/80 border border-slate-800 text-emerald-300">
                            <span>🖥️</span> <span>Build</span>
                          </div>
                        </div>
                      </div>

                      {/* Create File Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateFile(lang);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold transition-colors mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create {lang.name} File</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Selected Language Details Inspection Panel */}
              {selectedLanguage && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{selectedLanguage.icon}</span>
                      <h3 className="text-sm font-bold text-slate-100">
                        {selectedLanguage.name} Runtime Environment Spec
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-indigo-300">
                      Version: {selectedLanguage.version || 'Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Left: Sample Boilerplate */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Sample Executable Script:
                      </span>
                      <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 max-h-48 overflow-y-auto whitespace-pre">
                        <code>{selectedLanguage.sampleCode}</code>
                      </pre>
                    </div>

                    {/* Right: Last Test Output */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Execution Sandbox Output ({selectedLanguage.testDurationMs}ms):
                      </span>
                      <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-200 max-h-48 overflow-y-auto whitespace-pre">
                        <code>{selectedLanguage.testOutput || 'No output recorded.'}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Live Hello World & Test Outputs */}
          {activeTab === 'test-suite' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Live Runtime Benchmark Results</h3>
                  <p className="text-xs text-slate-400">
                    Each language script is dynamically executed in a dedicated subprocess sandbox to verify execution, stdout streaming, and exit codes.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {matrixData.map((lang) => (
                  <div
                    key={lang.id}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{lang.icon}</span>
                        <span className="text-xs font-bold text-slate-200">{lang.name}</span>
                        <span className="text-[11px] font-mono text-slate-400">({lang.command})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">
                          ⏱️ {lang.testDurationMs}ms
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                          {lang.testStatus}
                        </span>
                      </div>
                    </div>

                    <pre className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-emerald-300 border border-slate-800/80 overflow-x-auto whitespace-pre leading-relaxed">
                      <code>{lang.testOutput}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Architecture & AI Integration */}
          {activeTab === 'architecture' && (
            <div className="space-y-6 text-xs text-slate-300 leading-relaxed font-sans">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>Execution Layer Architecture</span>
                </h3>
                <p>
                  The system bridges AI agents and the developer through a Universal Execution Layer that dynamically selects the appropriate runtime based on file extensions, shebang lines, or explicit language targets.
                </p>

                <div className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-200 border border-slate-800/90 space-y-1">
                  <div>AI Agent Squad / User</div>
                  <div className="text-indigo-400">  ↓ (Generates / Modifies Code)</div>
                  <div>Workspace & File Manager (CRUD)</div>
                  <div className="text-indigo-400">  ↓ (Sends to Execution Layer)</div>
                  <div className="text-emerald-300">Universal Execution Engine (/api/code/execute)</div>
                  <div className="text-slate-400">  ├── 🐍 Python     → /usr/bin/python3</div>
                  <div className="text-slate-400">  ├── 🟨 JavaScript → /usr/local/bin/node</div>
                  <div className="text-slate-400">  ├── 🔷 TypeScript → npx tsx runner</div>
                  <div className="text-slate-400">  ├── 🗄️ SQL        → sqlite3 / in-memory RDBMS</div>
                  <div className="text-slate-400">  ├── 🐚 Bash       → /usr/bin/bash</div>
                  <div className="text-slate-400">  ├── 🌐 HTML/Web   → Live Sandboxed DOM Preview</div>
                  <div className="text-slate-400">  └── ⚙️ C/C++/Java → Native / GCC / JVM Compilers</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Safe Execution Guardrails</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>12-second execution timeout prevents runaway infinite loops.</li>
                    <li>Unbuffered standard output streaming with 500KB buffer bounds.</li>
                    <li>Clean sandbox temporary file removal after every run.</li>
                    <li>Full support for STDIN input streaming for interactive programs.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>AI Squad Integration</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>Aria, Rex, Cipher, and Nova can generate code in any language.</li>
                    <li>Proposed code patches can be tested with 1-click execution.</li>
                    <li>Automatic language detection in Code Workspace.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-Language Execution Engine is Online & Active</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
