import React, { useState } from 'react';
import { 
  FolderGit2, 
  Bot, 
  Smartphone, 
  Download, 
  Share2, 
  Plus, 
  Terminal, 
  Check, 
  Copy,
  ChevronDown,
  Github,
  Trash2,
  Zap
} from 'lucide-react';
import { Project, GitHubUser } from '../types';

interface HeaderProps {
  projects: Project[];
  activeProject?: Project | null;
  onSelectProject: (p: Project) => void;
  onDeleteProject?: (id: string) => void;
  activeTab: 'code' | 'agents' | 'bridge' | 'apk';
  onChangeTab: (tab: 'code' | 'agents' | 'bridge' | 'apk') => void;
  onOpenNewProjectModal: () => void;
  onDownloadZip: () => void;
  onOpenShareModal: () => void;
  onOpenGitHubModal: () => void;
  onOpenMatrixModal?: () => void;
  pendingSubmissionsCount: number;
  githubUser?: GitHubUser | null;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onDeleteProject,
  activeTab,
  onChangeTab,
  onOpenNewProjectModal,
  onDownloadZip,
  onOpenShareModal,
  onOpenGitHubModal,
  onOpenMatrixModal,
  pendingSubmissionsCount,
  githubUser
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyProjectLink = () => {
    if (!activeProject) return;
    const url = `${window.location.origin}/?project=${activeProject.id}&mode=bridge`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Project Switcher */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold shadow-sm">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-slate-100 text-base tracking-tight block leading-tight">
                  CodeSquad <span className="text-indigo-400 font-normal">Hub</span>
                </span>
                <span className="text-xs text-slate-400 block leading-tight">
                  AI & APK Repo Studio
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            {/* Project dropdown */}
            <div className="relative">
              <button
                id="project-selector-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-sm font-medium text-slate-200 transition-colors"
              >
                {activeProject ? (
                  <>
                    <span className="max-w-[140px] sm:max-w-[180px] truncate">{activeProject.name}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                      activeProject.type === 'android-apk' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-blue-950 text-blue-400 border border-blue-800/50'
                    }`}>
                      {activeProject.type === 'android-apk' ? 'APK' : 'WEB'}
                    </span>
                  </>
                ) : (
                  <span className="text-indigo-400 font-semibold flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Select or Create Repo</span>
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-72 rounded-lg bg-slate-900 border border-slate-700 shadow-xl py-1.5 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Your Repositories</span>
                    <span className="text-slate-500 font-mono">({projects.length})</span>
                  </div>

                  {projects.length === 0 ? (
                    <div className="px-3 py-3 text-center text-xs text-slate-500">
                      No repositories yet. Create or import your real repo below!
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          className={`w-full px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-800/80 transition-colors group ${
                            activeProject && p.id === activeProject.id ? 'bg-indigo-600/15 text-indigo-300 font-medium' : 'text-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectProject(p);
                              setDropdownOpen(false);
                            }}
                            className="flex-1 text-left truncate flex items-center gap-2"
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono uppercase shrink-0">
                              {p.type === 'android-apk' ? 'APK' : 'Web'}
                            </span>
                          </button>

                          {onDeleteProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to remove repository "${p.name}"?`)) {
                                  onDeleteProject(p.id);
                                }
                              }}
                              title="Delete this repository"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-950 hover:text-rose-400 text-slate-500 transition-all shrink-0 ml-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-slate-800 my-1" />
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenNewProjectModal();
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-indigo-400 hover:bg-slate-800 flex items-center gap-2 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Project / Repo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center Navigation Tabs */}
          {activeProject ? (
            <nav className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-lg border border-slate-800">
              <button
                id="tab-code-btn"
                onClick={() => onChangeTab('code')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'code'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Files & Code</span>
              </button>

              <button
                id="tab-agents-btn"
                onClick={() => onChangeTab('agents')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all relative ${
                  activeTab === 'agents'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Squad Room</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>

              <button
                id="tab-bridge-btn"
                onClick={() => onChangeTab('bridge')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all relative ${
                  activeTab === 'bridge'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile AI Bridge</span>
                <span className="sm:hidden">Bridge</span>
                {pendingSubmissionsCount > 0 && (
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-1.5 rounded-full leading-none py-0.5">
                    {pendingSubmissionsCount}
                  </span>
                )}
              </button>

              {activeProject?.type === 'android-apk' && (
                <button
                  id="tab-apk-btn"
                  onClick={() => onChangeTab('apk')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'apk'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>APK Build</span>
                </button>
              )}
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Workspace Ready &bull; Connect GitHub or Create Project</span>
            </div>
          )}

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            {onOpenMatrixModal && (
              <button
                id="language-matrix-btn"
                onClick={onOpenMatrixModal}
                title="Universal Language Execution Matrix & Environment Status"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/50 text-xs font-semibold shadow-xs transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Matrix</span>
              </button>
            )}

            {githubUser ? (
              <button
                id="github-sync-center-btn"
                onClick={onOpenGitHubModal}
                title={`Connected to GitHub as @${githubUser.login}. Click to open GitHub Sync Center.`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-slate-500 text-xs font-semibold shadow-xs transition-all"
              >
                <img
                  src={githubUser.avatar_url}
                  alt={githubUser.login}
                  className="w-4 h-4 rounded-full border border-slate-600"
                />
                <span className="hidden sm:inline font-mono text-[11px]">@{githubUser.login}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="hidden md:inline text-[11px] text-slate-300">Sync</span>
              </button>
            ) : (
              <button
                id="github-sync-center-btn"
                onClick={onOpenGitHubModal}
                title="Connect GitHub account and sync code"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-slate-500 text-xs font-semibold shadow-xs transition-all"
              >
                <Github className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">GitHub Sync</span>
              </button>
            )}

            <button
              id="share-bridge-url-btn"
              onClick={onOpenShareModal}
              disabled={!activeProject}
              title={activeProject ? "Share URL with your Android AI app" : "Select or create a repository first"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold shadow transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Share AI URL</span>
            </button>

            <button
              id="download-zip-btn"
              onClick={onDownloadZip}
              disabled={!activeProject}
              title={activeProject ? "Download project as ZIP ready for Android Studio or VS Code" : "Select or create a repository first"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Export ZIP</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
