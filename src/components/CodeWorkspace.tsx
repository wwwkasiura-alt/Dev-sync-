import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Folder, 
  FolderOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Copy, 
  RotateCcw, 
  Sparkles, 
  Code,
  FileText,
  FileJson,
  Layers,
  Search,
  Zap,
  GitBranch,
  UploadCloud,
  CheckCircle2,
  Terminal,
  Play
} from 'lucide-react';
import { Project, ProjectFile } from '../types';
import { ExecutionConsole } from './ExecutionConsole';

interface CodeWorkspaceProps {
  project: Project;
  activeFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onSaveFileContent: (fileId: string, newContent: string) => void;
  onOpenNewFileModal: () => void;
  onDeleteFile: (fileId: string) => void;
  pendingPatch?: {
    filePath: string;
    action: 'edit' | 'create';
    newContent: string;
    summary: string;
    source: string;
  } | null;
  onApplyPendingPatch?: () => void;
  onDiscardPendingPatch?: () => void;
  autoCommitStatus?: {
    isAutoCommitting: boolean;
    statusText: string;
    lastAutoCommittedAt?: number;
    error?: string | null;
  };
  onOpenGitHubSyncModal?: () => void;
  onOpenMatrixModal?: () => void;
}

export const CodeWorkspace: React.FC<CodeWorkspaceProps> = ({
  project,
  activeFile,
  onSelectFile,
  onSaveFileContent,
  onOpenNewFileModal,
  onDeleteFile,
  pendingPatch,
  onApplyPendingPatch,
  onDiscardPendingPatch,
  autoCommitStatus,
  onOpenGitHubSyncModal,
  onOpenMatrixModal,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(activeFile?.content || '');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [showMobileFiles, setShowMobileFiles] = useState(false);

  // Update editor buffer when active file changes
  React.useEffect(() => {
    if (activeFile) {
      setEditedCode(activeFile.content);
      setIsEditing(false);
    }
  }, [activeFile?.id]);

  const handleCopyCode = () => {
    if (activeFile) {
      navigator.clipboard.writeText(isEditing ? editedCode : activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    if (activeFile) {
      onSaveFileContent(activeFile.id, editedCode);
      setIsEditing(false);
    }
  };

  const handleDiscard = () => {
    if (activeFile) {
      setEditedCode(activeFile.content);
      setIsEditing(false);
    }
  };

  const filteredFiles = project.files.filter((f) =>
    f.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.kt') || fileName.endsWith('.java')) {
      return <FileCode className="w-4 h-4 text-emerald-400" />;
    }
    if (fileName.endsWith('.xml')) {
      return <Code className="w-4 h-4 text-amber-400" />;
    }
    if (fileName.endsWith('.gradle') || fileName.endsWith('.kts')) {
      return <Layers className="w-4 h-4 text-indigo-400" />;
    }
    if (fileName.endsWith('.json')) {
      return <FileJson className="w-4 h-4 text-sky-400" />;
    }
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const lineCount = (activeFile ? (isEditing ? editedCode : activeFile.content) : '').split('\n').length;
  const isPendingOnThisFile = pendingPatch && activeFile && pendingPatch.filePath.endsWith(activeFile.name);

  return (
    <div className="flex flex-col h-full min-h-0 w-full max-w-full bg-slate-950 text-slate-200 overflow-hidden relative">
      
      {/* Left File Tree Sidebar - drawer on mobile, static sidebar on desktop */}
      <aside className={`w-72 sm:w-80 border-r border-slate-800 bg-slate-900/95 flex flex-col shrink-0 absolute sm:relative inset-y-0 left-0 z-30 transition-transform duration-200 shadow-2xl sm:shadow-none ${
        showMobileFiles ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
      }`}>
        
        {/* Repo Title & File Actions */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2 truncate">
            <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-semibold text-xs tracking-wide uppercase text-slate-300 truncate">
              {project.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              id="workspace-add-file-btn"
              onClick={onOpenNewFileModal}
              title="Create New File"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowMobileFiles(false)}
              className="sm:hidden p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              title="Close file list"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search files input */}
        <div className="p-2 border-b border-slate-800/80 bg-slate-900/50">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded px-2 pl-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 bg-slate-950/40">
          {filteredFiles.map((file) => {
            const isSelected = activeFile?.id === file.id;
            return (
              <div
                key={file.id}
                onClick={() => {
                  onSelectFile(file);
                  setShowMobileFiles(false);
                }}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer text-xs transition-colors ${
                  isSelected
                    ? 'bg-indigo-600/25 text-indigo-300 font-medium border border-indigo-500/40'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  {getFileIcon(file.name)}
                  <span className="truncate">{file.path}</span>
                </div>
                {project.files.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete ${file.name}?`)) {
                        onDeleteFile(file.id);
                      }
                    }}
                    title="Delete file"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer Details */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 text-[11px] text-slate-400 flex items-center justify-between">
          <span>{project.files.length} files in repository</span>
          <span className="font-mono text-slate-500">v{project.version}</span>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {showMobileFiles && (
        <div
          onClick={() => setShowMobileFiles(false)}
          className="fixed inset-0 bg-black/60 z-20 sm:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Code View Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden">
        {activeFile ? (
          <>
            {/* Code Header Bar */}
            <div className="min-h-[3rem] px-2 sm:px-4 py-1.5 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 max-w-full truncate">
                <button
                  type="button"
                  onClick={() => setShowMobileFiles(true)}
                  className="sm:hidden p-1 rounded bg-slate-800 text-slate-300 hover:text-indigo-400 flex items-center gap-1 text-[11px] shrink-0"
                  title="Open file list"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Files</span>
                </button>
                {getFileIcon(activeFile.name)}
                <span className="font-mono text-[11px] sm:text-xs text-slate-300 truncate">
                  {activeFile.path}
                </span>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono hidden xs:inline-block">
                  {activeFile.language}
                </span>
                {isEditing && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Unsaved
                  </span>
                )}
              </div>

              {/* Action Buttons & Auto-Commit Status */}
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {/* Auto-commit status pill */}
                {project.githubSync?.autoCommit && (
                  <button
                    type="button"
                    onClick={onOpenGitHubSyncModal}
                    title={`Auto-commit enabled`}
                    className={`hidden md:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                      autoCommitStatus?.isAutoCommitting
                        ? 'bg-indigo-950/80 border-indigo-500/70 text-indigo-300 animate-pulse'
                        : autoCommitStatus?.error
                        ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                        : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    }`}
                  >
                    {autoCommitStatus?.isAutoCommitting ? (
                      <RotateCcw className="w-3 h-3 animate-spin text-indigo-400" />
                    ) : (
                      <Zap className="w-3 h-3 text-emerald-400" />
                    )}
                    <span className="text-slate-200 truncate max-w-[80px]">
                      {project.githubSync.autoCommitBranch || project.githubSync.branch}
                    </span>
                  </button>
                )}

                {isEditing ? (
                  <>
                    <button
                      id="save-code-btn"
                      onClick={handleSave}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      <span>{project.githubSync?.autoCommit ? 'Save & Commit' : 'Save'}</span>
                    </button>
                    <button
                      id="discard-code-btn"
                      onClick={handleDiscard}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Discard</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      id="edit-code-btn"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      id="copy-code-btn"
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Pending Patch Banner if available */}
            {isPendingOnThisFile && pendingPatch && (
              <div className="bg-indigo-950/80 border-b border-indigo-500/40 px-4 py-2.5 flex items-center justify-between text-xs text-indigo-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>
                    <strong>{pendingPatch.source}</strong> proposed changes: {pendingPatch.summary}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onApplyPendingPatch}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition-colors"
                  >
                    Apply Code Change
                  </button>
                  <button
                    onClick={onDiscardPendingPatch}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Code Body */}
            <div className="flex-1 overflow-hidden flex flex-col relative font-mono text-xs">
              {isEditing ? (
                <textarea
                  id="code-editor-textarea"
                  value={editedCode}
                  onChange={(e) => setEditedCode(e.target.value)}
                  className="w-full h-full p-4 bg-slate-950 text-slate-100 resize-none font-mono text-xs leading-relaxed focus:outline-none focus:ring-0 border-none select-text"
                  spellCheck={false}
                />
              ) : (
                <div className="flex-1 overflow-y-auto overflow-x-hidden flex select-text bg-slate-950">
                  {/* Pinned Line numbers gutter (only scrolls vertically with parent, never horizontally) */}
                  <div className="w-11 py-4 select-none bg-slate-900/40 text-slate-500 text-right pr-2.5 font-mono border-r border-slate-800/80 shrink-0">
                    {Array.from({ length: lineCount }).map((_, i) => (
                      <div key={i} className="leading-6 text-[11px]">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Horizontally scrollable code content wrapper */}
                  <div className="flex-1 overflow-x-auto">
                    <pre className="p-4 text-slate-200 font-mono text-[11px] leading-6 whitespace-pre min-w-max">
                      <code>{activeFile.content}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Universal Multi-Language Execution Console */}
            <ExecutionConsole
              currentCode={isEditing ? editedCode : activeFile.content}
              currentLanguage={activeFile.language}
              currentFilePath={activeFile.path}
              isOpen={isConsoleOpen}
              onToggleOpen={() => setIsConsoleOpen(!isConsoleOpen)}
              onOpenMatrixModal={onOpenMatrixModal}
            />

            {/* Status Footer */}
            <div className="h-7 px-4 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 select-none">
              <div className="flex items-center gap-4">
                <span>Lines: {lineCount}</span>
                <span>Length: {activeFile.content.length} chars</span>
                <button
                  type="button"
                  onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                  className="hover:text-indigo-300 flex items-center gap-1 text-[11px] font-mono transition-colors"
                >
                  <Terminal className="w-3 h-3 text-indigo-400" />
                  <span>{isConsoleOpen ? 'Hide Terminal' : 'Show Terminal'}</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                {onOpenMatrixModal && (
                  <button
                    type="button"
                    onClick={onOpenMatrixModal}
                    className="hover:text-amber-300 flex items-center gap-1 text-[11px] transition-colors"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Language Matrix</span>
                  </button>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Universal Runtime Active
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
            <FileCode className="w-12 h-12 mb-3 text-slate-600 stroke-[1.5]" />
            <p className="text-sm">Select a file from the repository tree to inspect or edit</p>
          </div>
        )}
      </main>

    </div>
  );
};
