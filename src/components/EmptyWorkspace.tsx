import React from 'react';
import { 
  FolderGit2, 
  Github, 
  Plus, 
  Smartphone, 
  Sparkles, 
  Bot, 
  Download, 
  Share2, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface EmptyWorkspaceProps {
  onOpenNewProject: () => void;
  onOpenGitHub: () => void;
  onQuickStartAndroid: () => void;
}

export const EmptyWorkspace: React.FC<EmptyWorkspaceProps> = ({
  onOpenNewProject,
  onOpenGitHub,
  onQuickStartAndroid,
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-10 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full space-y-8 my-auto">
        
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Clean Studio Workspace Initialized</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
            No Fake Repositories. Start with Real Code.
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            All sample and mock repositories have been cleared. Connect your GitHub account to import your existing repositories or initialize a new project from scratch.
          </p>
        </div>

        {/* Primary Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* GitHub Sync Card */}
          <div className="relative group rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-all shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Github className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                  Full 2-Way Sync
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  Import from GitHub
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Connect your GitHub Personal Access Token (PAT) to browse, clone, and import your real repositories directly into the AI Studio.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Browse public & private GitHub repositories</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Push AI-generated code edits back to GitHub commits</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Copy ready-to-run Git CLI commands</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenGitHub}
              className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all group-hover:shadow-indigo-500/25"
            >
              <Github className="w-4 h-4" />
              <span>Connect GitHub & Import Repo</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* New Project Card */}
          <div className="relative group rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 flex flex-col justify-between hover:border-emerald-500/50 transition-all shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                  Android & Web
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  Create Custom Repository
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Start fresh with your own repository name, package structure, and target architecture.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Android APK (Jetpack Compose, Kotlin, Gradle, Manifest)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Full-stack Web Application architecture</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Ready for 4-Agent squad collaboration & mobile bridges</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <button
                onClick={onOpenNewProject}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all group-hover:shadow-emerald-500/25"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Project</span>
              </button>

              <button
                onClick={onQuickStartAndroid}
                title="1-click clean Android starter"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Clean Android Starter</span>
              </button>
            </div>
          </div>

        </div>

        {/* Feature Capabilities Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>4-Agent Autonomous Squad</span>
          </div>
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Mobile AI Web Bridge</span>
          </div>
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400 shrink-0" />
            <span>1-Click APK ZIP Export</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Git Version History</span>
          </div>
        </div>

      </div>
    </div>
  );
};
