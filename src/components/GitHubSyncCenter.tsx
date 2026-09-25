import React, { useState, useEffect } from 'react';
import {
  X,
  GitBranch,
  Github,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Globe,
  Terminal,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FolderGit2,
  RefreshCw,
  DownloadCloud,
  UploadCloud,
  LogOut,
  Search,
  Star,
  GitCommit,
  CheckCircle,
  GitMerge,
  GitPullRequest,
  Plus,
  ArrowRight,
  ArrowLeftRight,
  Layers,
  Code,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';
import { Project, GitHubUser, GitHubSyncConfig, ProjectFile } from '../types';
import { executeWithRetry } from '../utils/githubRetry';

interface GitHubSyncCenterProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  onUpdateProject: (updatedProject: Project) => void;
  onImportProject: (importedProject: Project) => void;
  onUserChange?: (user: GitHubUser | null) => void;
}

interface RemoteBranch {
  name: string;
  commitSha: string;
  fullSha?: string;
  protected?: boolean;
}

const STORAGE_KEY_GITHUB_TOKEN = 'codesquad_github_pat_v1';
const STORAGE_KEY_GITHUB_USER = 'codesquad_github_user_v1';

export const GitHubSyncCenter: React.FC<GitHubSyncCenterProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onImportProject,
  onUserChange,
}) => {
  // Navigation tabs: 'sync', 'branches', 'repos', 'cli'
  const [activeTab, setActiveTab] = useState<'sync' | 'branches' | 'repos' | 'cli'>(() => {
    return project ? 'sync' : 'repos';
  });

  // Token & Authenticated User
  const [token, setToken] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_GITHUB_TOKEN) || '';
  });
  const [user, setUser] = useState<GitHubUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GITHUB_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved user', e);
    }
    return null;
  });

  // Verification & loading
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync / Push active project state
  const [repoName, setRepoName] = useState(() => {
    if (!project) return '';
    return project.githubSync?.repo || project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 35);
  });
  const [branch, setBranch] = useState(() => project?.githubSync?.branch || 'main');
  const [isPrivate, setIsPrivate] = useState(false);
  const [commitMessage, setCommitMessage] = useState('sync: latest updates from CodeSquad AI Hub');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('');
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Branch Management State
  const [branches, setBranches] = useState<RemoteBranch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [branchSuccess, setBranchSuccess] = useState<string | null>(null);

  // Create Branch State
  const [newBranchName, setNewBranchName] = useState('');
  const [sourceBranchName, setSourceBranchName] = useState('main');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [showCreateBranchForm, setShowCreateBranchForm] = useState(false);

  // Merge Branch State
  const [mergeBaseBranch, setMergeBaseBranch] = useState('main');
  const [mergeHeadBranch, setMergeHeadBranch] = useState('');
  const [mergeCommitMsg, setMergeCommitMsg] = useState('');
  const [isMergingBranch, setIsMergingBranch] = useState(false);
  const [mergeResult, setMergeResult] = useState<{ status: 'merged' | 'already_merged' | 'error'; message: string } | null>(null);

  // Branch Checkout / Pull State
  const [isCheckingOutBranch, setIsCheckingOutBranch] = useState<string | null>(null);

  // User repositories list for browsing & import
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [importingRepoName, setImportingRepoName] = useState<string | null>(null);

  // Recent commits for active project
  const [recentCommits, setRecentCommits] = useState<any[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);

  const [copiedCli, setCopiedCli] = useState(false);

  // Auto-Commit Settings State
  const [autoCommitEnabled, setAutoCommitEnabled] = useState<boolean>(() => {
    return project?.githubSync?.autoCommit || false;
  });
  const [autoCommitBranch, setAutoCommitBranch] = useState<string>(() => {
    return project?.githubSync?.autoCommitBranch || project?.githubSync?.branch || 'main';
  });
  const [autoCommitInterval, setAutoCommitInterval] = useState<number>(() => {
    return project?.githubSync?.autoCommitIntervalSeconds || 3;
  });

  // Auto-Retry Settings State
  const [autoRetryEnabled, setAutoRetryEnabled] = useState<boolean>(() => {
    return project?.githubSync?.autoRetry ?? true;
  });
  const [maxRetries, setMaxRetries] = useState<number>(() => {
    return project?.githubSync?.maxRetries ?? 3;
  });
  const [retryBackoffMs, setRetryBackoffMs] = useState<number>(() => {
    return project?.githubSync?.retryBackoffMs ?? 2000;
  });
  const [retryStrategy, setRetryStrategy] = useState<'exponential' | 'linear' | 'fixed'>(() => {
    return project?.githubSync?.retryStrategy ?? 'exponential';
  });

  // Update repoName and branch when project changes
  useEffect(() => {
    if (project) {
      const currentRepo = project.githubSync?.repo || project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 35);
      const currentBranch = project.githubSync?.branch || 'main';
      setRepoName(currentRepo);
      setBranch(currentBranch);
      setAutoCommitEnabled(project.githubSync?.autoCommit || false);
      setAutoCommitBranch(project.githubSync?.autoCommitBranch || currentBranch);
      setAutoCommitInterval(project.githubSync?.autoCommitIntervalSeconds || 3);
      setAutoRetryEnabled(project.githubSync?.autoRetry ?? true);
      setMaxRetries(project.githubSync?.maxRetries ?? 3);
      setRetryBackoffMs(project.githubSync?.retryBackoffMs ?? 2000);
      setRetryStrategy(project.githubSync?.retryStrategy ?? 'exponential');
      setMergeBaseBranch(currentBranch === 'main' ? 'main' : 'main');
      setSourceBranchName(currentBranch);
      setSyncSuccess(null);
      setSyncError(null);
      setBranchSuccess(null);
      setBranchError(null);
      setMergeResult(null);

      // Auto load branches if repo is linked
      const owner = project.githubSync?.owner || user?.login;
      if (token && owner && currentRepo) {
        loadBranches(token, owner, currentRepo);
      }
    }
  }, [project, user?.login]);

  // If token is saved and user not loaded, verify on open
  useEffect(() => {
    if (isOpen && token && !user) {
      handleVerifyToken(token);
    }
    if (isOpen && token && user) {
      loadUserRepos(token);
      const owner = project?.githubSync?.owner || user.login;
      const targetRepo = project?.githubSync?.repo || repoName;
      const targetBranch = project?.githubSync?.branch || branch;

      if (owner && targetRepo) {
        loadBranches(token, owner, targetRepo);
        loadRecentCommits(token, owner, targetRepo, targetBranch);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Verify GitHub Token
  const handleVerifyToken = async (inputToken: string) => {
    if (!inputToken.trim()) {
      setAuthError('GitHub Personal Access Token is required');
      return;
    }
    setIsVerifying(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/github/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inputToken.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate with GitHub');
      }

      const verifiedUserData: GitHubUser = {
        login: data.login,
        name: data.name || data.login,
        avatar_url: data.avatar_url,
        html_url: data.html_url,
        public_repos: data.public_repos,
        bio: data.bio,
      };

      setUser(verifiedUserData);
      onUserChange?.(verifiedUserData);
      localStorage.setItem(STORAGE_KEY_GITHUB_TOKEN, inputToken.trim());
      localStorage.setItem(STORAGE_KEY_GITHUB_USER, JSON.stringify(verifiedUserData));

      // Load repos
      loadUserRepos(inputToken.trim());

      const owner = project?.githubSync?.owner || verifiedUserData.login;
      const currentRepo = project?.githubSync?.repo || repoName;
      if (owner && currentRepo) {
        loadBranches(inputToken.trim(), owner, currentRepo);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Verification failed');
      setUser(null);
      onUserChange?.(null);
    } finally {
      setIsVerifying(false);
    }
  };

  // Disconnect GitHub Account
  const handleDisconnect = () => {
    setUser(null);
    onUserChange?.(null);
    setToken('');
    setUserRepos([]);
    setBranches([]);
    setRecentCommits([]);
    localStorage.removeItem(STORAGE_KEY_GITHUB_TOKEN);
    localStorage.removeItem(STORAGE_KEY_GITHUB_USER);
  };

  // Load user's repositories
  const loadUserRepos = async (pat: string) => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch('/api/github/user-repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: pat }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.repos)) {
        setUserRepos(data.repos);
      }
    } catch (e) {
      console.warn('Could not load repositories', e);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Load branches for current repository
  const loadBranches = async (pat: string, owner: string, repo: string) => {
    if (!pat || !owner || !repo) return;
    setIsLoadingBranches(true);
    setBranchError(null);
    try {
      const res = await fetch('/api/github/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: pat, owner, repo }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.branches)) {
        setBranches(data.branches);
        // Set merge head candidate default if available and not equal to base
        const otherBranch = data.branches.find((b: RemoteBranch) => b.name !== (branch || 'main'));
        if (otherBranch && !mergeHeadBranch) {
          setMergeHeadBranch(otherBranch.name);
        }
      }
    } catch (e: any) {
      console.warn('Could not load branches', e);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // Load recent commits
  const loadRecentCommits = async (pat: string, owner: string, repo: string, br: string = 'main') => {
    setIsLoadingCommits(true);
    try {
      const res = await fetch('/api/github/repo-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: pat, owner, repo, branch: br }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.commits)) {
        setRecentCommits(data.commits);
      }
    } catch (e) {
      console.warn('Could not load commits', e);
    } finally {
      setIsLoadingCommits(false);
    }
  };

  // Create New Branch
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setBranchError('Please connect your GitHub account first');
      return;
    }
    if (!newBranchName.trim()) {
      setBranchError('Branch name is required');
      return;
    }
    const owner = project?.githubSync?.owner || user?.login;
    const repo = project?.githubSync?.repo || repoName;
    if (!owner || !repo) {
      setBranchError('Linked repository required to create a branch');
      return;
    }

    setIsCreatingBranch(true);
    setBranchError(null);
    setBranchSuccess(null);

    try {
      const res = await fetch('/api/github/branches/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          owner,
          repo,
          newBranch: newBranchName.trim(),
          sourceBranch: sourceBranchName || branch || 'main',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create branch');
      }

      setBranchSuccess(`Branch '${data.branch}' created successfully! Switched active branch.`);
      setBranch(data.branch);
      setNewBranchName('');
      setShowCreateBranchForm(false);

      // Update project sync config
      if (project) {
        onUpdateProject({
          ...project,
          githubSync: {
            owner: project.githubSync?.owner || owner,
            repo: project.githubSync?.repo || repo,
            branch: data.branch,
            lastSyncedAt: project.githubSync?.lastSyncedAt,
            lastCommitSha: data.sha || project.githubSync?.lastCommitSha,
            htmlUrl: project.githubSync?.htmlUrl,
          },
        });
      }

      // Reload branches
      await loadBranches(token.trim(), owner, repo);
    } catch (err: any) {
      setBranchError(err.message || 'Error creating branch');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  // Switch Branch & Optionally Checkout / Pull files from GitHub
  const handleSwitchBranch = async (targetBranch: string, pullFiles: boolean = false) => {
    setBranch(targetBranch);
    setBranchError(null);
    setBranchSuccess(null);

    const owner = project?.githubSync?.owner || user?.login;
    const repo = project?.githubSync?.repo || repoName;

    if (!pullFiles) {
      // Just update local sync target branch
      if (project) {
        onUpdateProject({
          ...project,
          githubSync: {
            owner: project.githubSync?.owner || owner || '',
            repo: project.githubSync?.repo || repo || '',
            branch: targetBranch,
            lastSyncedAt: project.githubSync?.lastSyncedAt,
            lastCommitSha: project.githubSync?.lastCommitSha,
            htmlUrl: project.githubSync?.htmlUrl,
          },
        });
      }
      setBranchSuccess(`Active target branch set to '${targetBranch}'`);
      if (token && owner && repo) {
        loadRecentCommits(token, owner, repo, targetBranch);
      }
      return;
    }

    // Pull files from GitHub branch into current workspace project
    if (!token || !owner || !repo || !project) return;
    setIsCheckingOutBranch(targetBranch);

    try {
      const res = await fetch('/api/github/branch-pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          owner,
          repo,
          branch: targetBranch,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to checkout branch files');
      }

      const updatedProject: Project = {
        ...project,
        files: data.files,
        updatedAt: Date.now(),
        githubSync: {
          owner,
          repo,
          branch: targetBranch,
          lastSyncedAt: Date.now(),
          lastCommitSha: data.commitSha,
          htmlUrl: project.githubSync?.htmlUrl || `https://github.com/${owner}/${repo}`,
        },
      };

      onUpdateProject(updatedProject);
      setBranchSuccess(`Successfully checked out branch '${targetBranch}' with ${data.filesCount} files!`);
      loadRecentCommits(token, owner, repo, targetBranch);
    } catch (err: any) {
      setBranchError(err.message || 'Error pulling branch files');
    } finally {
      setIsCheckingOutBranch(null);
    }
  };

  // Merge Branch
  const handleMergeBranches = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setMergeResult({ status: 'error', message: 'GitHub token required' });
      return;
    }
    const owner = project?.githubSync?.owner || user?.login;
    const repo = project?.githubSync?.repo || repoName;
    if (!owner || !repo) {
      setMergeResult({ status: 'error', message: 'Linked repository required to perform merge' });
      return;
    }
    if (!mergeBaseBranch || !mergeHeadBranch) {
      setMergeResult({ status: 'error', message: 'Both Base and Head branches are required' });
      return;
    }
    if (mergeBaseBranch === mergeHeadBranch) {
      setMergeResult({ status: 'error', message: 'Base and Head branch cannot be the same branch' });
      return;
    }

    setIsMergingBranch(true);
    setMergeResult(null);

    try {
      const res = await fetch('/api/github/branches/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          owner,
          repo,
          baseBranch: mergeBaseBranch,
          headBranch: mergeHeadBranch,
          commitMessage: mergeCommitMsg.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Merge failed');
      }

      setMergeResult({
        status: data.status || 'merged',
        message: data.message || `Merged '${mergeHeadBranch}' into '${mergeBaseBranch}' successfully!`,
      });

      // Refresh recent commits & branches
      loadRecentCommits(token, owner, repo, mergeBaseBranch);
      loadBranches(token, owner, repo);
    } catch (err: any) {
      setMergeResult({
        status: 'error',
        message: err.message || 'Error merging branches',
      });
    } finally {
      setIsMergingBranch(false);
    }
  };

  // Push / Sync Project to GitHub
  const handleSyncToGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setSyncError('Please connect your GitHub account first');
      return;
    }
    if (!project) {
      setSyncError('No active project to sync. Please select or create a project first.');
      return;
    }
    if (!repoName.trim()) {
      setSyncError('Repository name is required');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    setSyncStatusText('Preparing files & connecting to GitHub...');

    try {
      const data = await executeWithRetry(
        async (attempt) => {
          if (attempt > 1) {
            setSyncStatusText(`Retry attempt ${attempt}/${maxRetries + 1}: Reconnecting to GitHub...`);
          } else {
            setSyncStatusText(`Syncing ${project.files.length} project files to branch "${branch.trim() || 'main'}"...`);
          }

          const payload = {
            token: token.trim(),
            repoName: repoName.trim(),
            description: project.description || 'Built with CodeSquad AI Studio',
            isPrivate,
            commitMessage: commitMessage.trim() || `sync: project update on branch ${branch.trim() || 'main'} from CodeSquad AI`,
            branch: branch.trim() || 'main',
            files: project.files.map((f) => ({
              path: f.path,
              content: f.content,
            })),
          };

          const res = await fetch('/api/github/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const resData = await res.json();
          if (!res.ok) {
            throw new Error(resData.error || 'Failed to sync with GitHub');
          }
          return resData;
        },
        {
          autoRetry: autoRetryEnabled,
          maxRetries,
          baseBackoffMs: retryBackoffMs,
          strategy: retryStrategy,
        },
        {
          onAttemptFailed: (attempt, maxAttempts, err, nextDelayMs) => {
            console.warn(`[GitHub Push] Attempt ${attempt}/${maxAttempts} failed: ${err.message}. Retrying in ${(nextDelayMs/1000).toFixed(1)}s...`);
            setSyncStatusText(`Push failed (Attempt ${attempt}/${maxAttempts}). Retrying in ${(nextDelayMs/1000).toFixed(1)}s...`);
          },
          onCountdownTick: (remainingMs, attempt, maxAttempts) => {
            setSyncStatusText(`Retrying push in ${(remainingMs / 1000).toFixed(1)}s (Attempt ${attempt}/${maxAttempts})...`);
          }
        }
      );

      // Update project sync metadata
      const updatedSyncConfig: GitHubSyncConfig = {
        owner: data.owner,
        repo: data.repoName,
        branch: data.branch,
        lastSyncedAt: Date.now(),
        lastCommitSha: data.commitSha,
        htmlUrl: data.repoUrl,
        autoCommit: autoCommitEnabled,
        autoCommitBranch: autoCommitBranch || data.branch,
        autoCommitIntervalSeconds: autoCommitInterval,
        autoRetry: autoRetryEnabled,
        maxRetries,
        retryBackoffMs,
        retryStrategy,
      };

      onUpdateProject({
        ...project,
        updatedAt: Date.now(),
        githubSync: updatedSyncConfig,
      });

      setSyncSuccess(`Synced ${data.filesCount} files to ${data.owner}/${data.repoName} on branch "${data.branch}"!`);
      
      // Reload branches & recent commits
      if (token && data.owner && data.repoName) {
        loadBranches(token, data.owner, data.repoName);
        loadRecentCommits(token, data.owner, data.repoName, data.branch);
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      setSyncError(err.message || 'Error syncing project');
    } finally {
      setIsSyncing(false);
    }
  };

  // Import repository into CodeSquad workspace
  const handleImportRepo = async (owner: string, repo: string, defaultBranch: string) => {
    if (!token.trim()) return;
    setImportingRepoName(repo);

    try {
      const res = await fetch('/api/github/import-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          owner,
          repo,
          branch: defaultBranch || 'main',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to import repository');
        return;
      }

      onImportProject(data.project);
      onClose();
    } catch (e: any) {
      alert(e.message || 'Error importing repository');
    } finally {
      setImportingRepoName(null);
    }
  };

  const cliCommands = `# 1. Download & extract your project ZIP from CodeSquad AI
# 2. Open terminal inside the extracted project folder
git init
git add .
git commit -m "${commitMessage || 'feat: initial commit from CodeSquad AI'}"
git branch -M ${branch || 'main'}
git remote add origin https://github.com/${user?.login || '<YOUR_USERNAME>'}/${repoName}.git
git push -u origin ${branch || 'main'}`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliCommands);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const filteredRepos = userRepos.filter((r) =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase()))
  );

  const currentOwner = project?.githubSync?.owner || user?.login;
  const currentRepo = project?.githubSync?.repo || repoName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 shadow-xs">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  GitHub Sync & Branch Manager
                </h3>
                {user ? (
                  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Bidirectional sync: Push, switch branches, create feature branches, and merge code directly
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Info / Connection Bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 shrink-0">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-8 h-8 rounded-full border border-slate-700"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{user.name}</span>
                    <a
                      href={user.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                    >
                      @{user.login}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {user.public_repos || 0} public repositories accessible
                  </span>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-xs transition-colors"
                title="Disconnect GitHub account"
              >
                <LogOut className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Connect GitHub Account with Personal Access Token:
                </span>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=CodeSquad%20AI%20Hub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>Create Token (repo scope)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => handleVerifyToken(token)}
                  disabled={isVerifying || !token.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors"
                >
                  {isVerifying ? (
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Github className="w-3.5 h-3.5" />
                  )}
                  <span>{isVerifying ? 'Connecting...' : 'Connect Account'}</span>
                </button>
              </div>

              {authError && (
                <div className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{authError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/20 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'sync'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{project ? `Sync "${project.name}"` : 'Sync (Push)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('branches');
              if (token && currentOwner && currentRepo) {
                loadBranches(token, currentOwner, currentRepo);
              }
            }}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'branches'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Branches & Merge {branches.length > 0 ? `(${branches.length})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('repos');
              if (token && userRepos.length === 0) loadUserRepos(token);
            }}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'repos'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Import Repos ({userRepos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cli')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'cli'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Git CLI</span>
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">

          {/* TAB 1: SYNC ACTIVE PROJECT */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              
              {!project ? (
                <div className="p-8 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                    <FolderGit2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-200">No Active Project in Workspace</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Create a project in your workspace first to push code to GitHub, or switch to the Browse & Import Repositories tab to import an existing GitHub repo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('repos')}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    Browse & Import Existing GitHub Repos
                  </button>
                </div>
              ) : (
                <>
                  {/* Sync Status Card */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                          <FolderGit2 className="w-4 h-4 text-emerald-400" />
                          <span>Workspace Project: {project.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {project.files.length} code files ready for commit
                        </span>
                      </div>

                      {project.githubSync?.lastSyncedAt ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>
                            Last synced: {new Date(project.githubSync.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-400/90 font-mono">
                          ● Not yet synced to GitHub
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Target Branch:</span>
                        <span className="font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-bold flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          {branch}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('branches')}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 underline ml-1"
                        >
                          Manage Branches
                        </button>
                      </div>

                      {project.githubSync?.htmlUrl && (
                        <div className="flex items-center justify-start sm:justify-end text-xs">
                          <a
                            href={project.githubSync.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline"
                          >
                            <span>{project.githubSync.owner}/{project.githubSync.repo}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Success Notification */}
                  {syncSuccess && (
                    <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{syncSuccess}</span>
                      </div>
                      {project.githubSync?.htmlUrl && (
                        <a
                          href={project.githubSync.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-300 hover:text-white underline font-medium shrink-0 ml-2"
                        >
                          View on GitHub ↗
                        </a>
                      )}
                    </div>
                  )}

                  {/* Error Notification */}
                  {syncError && (
                    <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{syncError}</span>
                    </div>
                  )}

                  {/* Sync Form */}
                  <form onSubmit={handleSyncToGitHub} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Repository Name on GitHub:
                        </label>
                        <input
                          type="text"
                          required
                          value={repoName}
                          onChange={(e) => setRepoName(e.target.value)}
                          placeholder="e.g. quicknotes-apk"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Auto-created on GitHub if it doesn't exist yet.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Target Branch & Visibility:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="text"
                              value={branch}
                              onChange={(e) => setBranch(e.target.value)}
                              placeholder="main"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                            {branches.length > 0 && (
                              <select
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                className="absolute right-1 top-1.5 bottom-1.5 w-6 opacity-0 cursor-pointer"
                                title="Select existing branch"
                              >
                                {branches.map((b) => (
                                  <option key={b.name} value={b.name}>
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsPrivate(!isPrivate)}
                            className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                              isPrivate
                                ? 'bg-amber-950/40 border-amber-500/70 text-amber-300'
                                : 'bg-emerald-950/40 border-emerald-500/70 text-emerald-300'
                            }`}
                          >
                            {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                            <span>{isPrivate ? 'Private' : 'Public'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Auto-Commit Option Section */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <Zap className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">
                              Auto-Commit on Code Save
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              Automatically push code changes to a feature branch when you save in Editor
                            </span>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoCommitEnabled}
                            onChange={(e) => {
                              const nextVal = e.target.checked;
                              setAutoCommitEnabled(nextVal);
                              if (project && project.githubSync) {
                                onUpdateProject({
                                  ...project,
                                  githubSync: {
                                    ...project.githubSync,
                                    autoCommit: nextVal,
                                    autoCommitBranch: autoCommitBranch || branch,
                                    autoCommitIntervalSeconds: autoCommitInterval,
                                  }
                                });
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      {autoCommitEnabled && (
                        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">
                              Auto-Commit Target Branch:
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={autoCommitBranch}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAutoCommitBranch(val);
                                  if (project && project.githubSync) {
                                    onUpdateProject({
                                      ...project,
                                      githubSync: {
                                        ...project.githubSync,
                                        autoCommitBranch: val,
                                      }
                                    });
                                  }
                                }}
                                placeholder="e.g. dev-autosave or feature/ai-sync"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                              Saves to this feature branch without disturbing main.
                            </span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">
                              Debounce Delay (Cooldown):
                            </label>
                            <div className="flex items-center gap-2">
                              <select
                                value={autoCommitInterval}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setAutoCommitInterval(val);
                                  if (project && project.githubSync) {
                                    onUpdateProject({
                                      ...project,
                                      githubSync: {
                                        ...project.githubSync,
                                        autoCommitIntervalSeconds: val,
                                      }
                                    });
                                  }
                                }}
                                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                              >
                                <option value={2}>2 seconds</option>
                                <option value={3}>3 seconds (recommended)</option>
                                <option value={5}>5 seconds</option>
                                <option value={10}>10 seconds</option>
                              </select>
                              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Active</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                              Batches rapid saves to avoid hitting GitHub API limits.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Auto-Retry & Backoff Configuration Section */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">
                              Auto-Retry on Push Failure
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              Automatically retry failed push operations with configurable backoff & jitter
                            </span>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoRetryEnabled}
                            onChange={(e) => {
                              const nextVal = e.target.checked;
                              setAutoRetryEnabled(nextVal);
                              if (project && project.githubSync) {
                                onUpdateProject({
                                  ...project,
                                  githubSync: {
                                    ...project.githubSync,
                                    autoRetry: nextVal,
                                    maxRetries,
                                    retryBackoffMs,
                                    retryStrategy,
                                  }
                                });
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      {autoRetryEnabled && (
                        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">
                              Max Retries:
                            </label>
                            <select
                              value={maxRetries}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setMaxRetries(val);
                                if (project && project.githubSync) {
                                  onUpdateProject({
                                    ...project,
                                    githubSync: {
                                      ...project.githubSync,
                                      maxRetries: val,
                                    }
                                  });
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                            >
                              <option value={1}>1 attempt</option>
                              <option value={3}>3 attempts (default)</option>
                              <option value={5}>5 attempts</option>
                              <option value={10}>10 attempts</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">
                              Base Backoff Delay:
                            </label>
                            <select
                              value={retryBackoffMs}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setRetryBackoffMs(val);
                                if (project && project.githubSync) {
                                  onUpdateProject({
                                    ...project,
                                    githubSync: {
                                      ...project.githubSync,
                                      retryBackoffMs: val,
                                    }
                                  });
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                            >
                              <option value={1000}>1 second</option>
                              <option value={2000}>2 seconds (default)</option>
                              <option value={5000}>5 seconds</option>
                              <option value={10000}>10 seconds</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">
                              Backoff Strategy:
                            </label>
                            <select
                              value={retryStrategy}
                              onChange={(e) => {
                                const val = e.target.value as 'exponential' | 'linear' | 'fixed';
                                setRetryStrategy(val);
                                if (project && project.githubSync) {
                                  onUpdateProject({
                                    ...project,
                                    githubSync: {
                                      ...project.githubSync,
                                      retryStrategy: val,
                                    }
                                  });
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                            >
                              <option value="exponential">Exponential (2^n)</option>
                              <option value="linear">Linear (n*delay)</option>
                              <option value="fixed">Fixed Interval</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Commit Message:
                      </label>
                      <input
                        type="text"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="e.g. update Kotlin UI and add dark mode support"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                      <div className="text-xs text-slate-400">
                        {isSyncing && (
                          <span className="text-emerald-400 flex items-center gap-1.5 animate-pulse">
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            {syncStatusText}
                          </span>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isSyncing || !token.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow transition-colors"
                      >
                        {isSyncing ? (
                          <RotateCcw className="w-4 h-4 animate-spin" />
                        ) : (
                          <UploadCloud className="w-4 h-4" />
                        )}
                        <span>{isSyncing ? 'Syncing...' : `Push to Branch "${branch}"`}</span>
                      </button>
                    </div>
                  </form>

                  {/* Recent Commits Stream if linked */}
                  {project.githubSync?.owner && recentCommits.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Recent Commits on GitHub ({project.githubSync.branch})</span>
                        </span>
                        <button
                          onClick={() => token && loadRecentCommits(token, project.githubSync!.owner, project.githubSync!.repo, project.githubSync!.branch)}
                          className="text-[11px] text-slate-400 hover:text-slate-200"
                        >
                          Refresh
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {recentCommits.map((c, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5 max-w-[70%] truncate">
                              <div className="font-mono text-slate-200 truncate">{c.message}</div>
                              <div className="text-[10px] text-slate-500">by {c.author}</div>
                            </div>
                            <a
                              href={c.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[11px] text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
                            >
                              {c.sha}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

          {/* TAB 2: BRANCHES & MERGE MANAGER */}
          {activeTab === 'branches' && (
            <div className="space-y-5">
              
              {/* Repository Header Bar */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        {currentOwner}/{currentRepo}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono">
                        Active: {branch}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Create feature branches, switch workspaces, and merge code safely.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCreateBranchForm(!showCreateBranchForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Branch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => token && currentOwner && currentRepo && loadBranches(token, currentOwner, currentRepo)}
                    disabled={isLoadingBranches || !token}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                    title="Refresh branches list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBranches ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Status Notifications */}
              {branchSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{branchSuccess}</span>
                </div>
              )}

              {branchError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{branchError}</span>
                </div>
              )}

              {/* Inline Create Branch Form */}
              {showCreateBranchForm && (
                <form onSubmit={handleCreateBranch} className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Create New GitHub Branch
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCreateBranchForm(false)}
                      className="text-slate-400 hover:text-slate-200 text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        New Branch Name:
                      </label>
                      <input
                        type="text"
                        required
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        placeholder="e.g. feature/compose-ui or fix-login"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Branch Off From (Source):
                      </label>
                      <select
                        value={sourceBranchName}
                        onChange={(e) => setSourceBranchName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                      >
                        {branches.length > 0 ? (
                          branches.map((b) => (
                            <option key={b.name} value={b.name}>
                              {b.name} ({b.commitSha || 'latest'})
                            </option>
                          ))
                        ) : (
                          <option value="main">main</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isCreatingBranch || !newBranchName.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow transition-colors"
                    >
                      {isCreatingBranch ? (
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <GitBranch className="w-3.5 h-3.5" />
                      )}
                      <span>{isCreatingBranch ? 'Creating...' : 'Create & Switch Branch'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Existing Branches List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Remote Branches on GitHub ({branches.length})</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Switch target or pull code directly
                  </span>
                </div>

                {branches.length === 0 ? (
                  <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                    {isLoadingBranches ? (
                      <div className="flex items-center justify-center gap-2 text-cyan-300">
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        <span>Loading branches from GitHub...</span>
                      </div>
                    ) : (
                      <span>No branches loaded. Click "New Branch" or push code to initialize branches.</span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {branches.map((b) => {
                      const isActive = b.name === branch;
                      const isCheckingOut = isCheckingOutBranch === b.name;

                      return (
                        <div
                          key={b.name}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                            isActive
                              ? 'bg-cyan-950/30 border-cyan-500/60'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-100 truncate">
                                {b.name}
                              </span>
                              {isActive && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 font-semibold flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  Active Sync Target
                                </span>
                              )}
                              {b.protected && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                                  Protected
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              Commit: {b.commitSha || 'latest'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Auto-Commit Target Indicator / Toggle */}
                            {project?.githubSync?.autoCommit && project?.githubSync?.autoCommitBranch === b.name ? (
                              <span className="text-[10px] px-2 py-1 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-500/50 font-semibold flex items-center gap-1">
                                <Zap className="w-3 h-3 text-indigo-400" />
                                <span>Auto-Commit Target</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (project && project.githubSync) {
                                    onUpdateProject({
                                      ...project,
                                      githubSync: {
                                        ...project.githubSync,
                                        autoCommit: true,
                                        autoCommitBranch: b.name,
                                      }
                                    });
                                    setAutoCommitEnabled(true);
                                    setAutoCommitBranch(b.name);
                                    setBranchSuccess(`Auto-commit configured to push to branch "${b.name}" on code save!`);
                                  }
                                }}
                                className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 border border-slate-800 text-[11px] font-medium transition-colors flex items-center gap-1"
                                title="Set this feature branch as the destination for auto-commits"
                              >
                                <Zap className="w-3 h-3 text-slate-500 hover:text-indigo-400" />
                                <span className="hidden sm:inline">Set Auto-Commit</span>
                              </button>
                            )}

                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => handleSwitchBranch(b.name, false)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                                title="Switch sync target to this branch without changing workspace files"
                              >
                                <span>Switch Target</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleSwitchBranch(b.name, true)}
                              disabled={isCheckingOut}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors"
                              title="Pull all code files from this branch into workspace"
                            >
                              {isCheckingOut ? (
                                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <DownloadCloud className="w-3.5 h-3.5" />
                              )}
                              <span>{isCheckingOut ? 'Pulling...' : 'Checkout & Pull'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MERGE BRANCHES CARD */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 pt-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <GitMerge className="w-4 h-4 text-emerald-400" />
                    <span>Merge Branches</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Integrate feature changes into base branch
                  </span>
                </div>

                {mergeResult && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      mergeResult.status === 'merged'
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                        : mergeResult.status === 'already_merged'
                        ? 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-300'
                        : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {mergeResult.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    )}
                    <span>{mergeResult.message}</span>
                  </div>
                )}

                <form onSubmit={handleMergeBranches} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Base Branch (Merge INTO):
                      </label>
                      <select
                        value={mergeBaseBranch}
                        onChange={(e) => setMergeBaseBranch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        {branches.length > 0 ? (
                          branches.map((b) => (
                            <option key={b.name} value={b.name}>
                              {b.name}
                            </option>
                          ))
                        ) : (
                          <option value="main">main</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Compare / Head Branch (Source to merge):
                      </label>
                      <select
                        value={mergeHeadBranch}
                        onChange={(e) => setMergeHeadBranch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Select Source Branch --</option>
                        {branches.map((b) => (
                          <option key={b.name} value={b.name} disabled={b.name === mergeBaseBranch}>
                            {b.name} {b.name === mergeBaseBranch ? '(same as base)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Merge Commit Message (Optional):
                    </label>
                    <input
                      type="text"
                      value={mergeCommitMsg}
                      onChange={(e) => setMergeCommitMsg(e.target.value)}
                      placeholder={`e.g. Merge branch '${mergeHeadBranch || 'feature'}' into '${mergeBaseBranch || 'main'}'`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                      <span>{mergeHeadBranch || '<head>'}</span>
                      <ArrowRight className="w-3 h-3 text-indigo-400" />
                      <span>{mergeBaseBranch || '<base>'}</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isMergingBranch || !mergeHeadBranch || mergeHeadBranch === mergeBaseBranch}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow transition-colors"
                    >
                      {isMergingBranch ? (
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <GitMerge className="w-3.5 h-3.5" />
                      )}
                      <span>{isMergingBranch ? 'Merging...' : 'Merge Branches'}</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TAB 3: IMPORT EXISTING REPOSITORIES FROM GITHUB */}
          {activeTab === 'repos' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search your GitHub repositories..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => token && loadUserRepos(token)}
                  disabled={isLoadingRepos || !token}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRepos ? 'animate-spin' : ''}`} />
                  <span>Refresh List</span>
                </button>
              </div>

              {!user && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <Github className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">Connect your GitHub account above</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Once connected, all your GitHub repositories will appear here so you can import them into CodeSquad AI Studio with 1 click!
                  </p>
                </div>
              )}

              {user && (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {filteredRepos.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      {isLoadingRepos ? 'Loading your repositories...' : 'No repositories matched your search.'}
                    </div>
                  ) : (
                    filteredRepos.map((repo) => (
                      <div
                        key={repo.id}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-200 truncate">
                              {repo.name}
                            </span>
                            {repo.private ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/40">
                                Private
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                Public
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {repo.description || 'No description provided'}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500">
                            <span>Branch: {repo.default_branch}</span>
                            {repo.stars > 0 && (
                              <span className="flex items-center gap-0.5 text-amber-400">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                {repo.stars}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleImportRepo(repo.owner, repo.name, repo.default_branch)}
                            disabled={importingRepoName === repo.name}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors"
                          >
                            {importingRepoName === repo.name ? (
                              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <DownloadCloud className="w-3.5 h-3.5" />
                            )}
                            <span>{importingRepoName === repo.name ? 'Importing...' : 'Import to Studio'}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLI COMMANDS */}
          {activeTab === 'cli' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Aap terminal ya Git command line se push karna chahte hain toh ye commands copy karein:
              </p>

              <div className="relative">
                <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed whitespace-pre select-text">
                  {cliCommands}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyCli}
                  className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors shadow"
                >
                  {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCli ? 'Copied!' : 'Copy Commands'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300">Quick tip:</span>
                <p className="text-[11px] text-slate-400">
                  Aap Android Studio mein project open karke menu bar mein <strong>VCS &gt; Share Project on GitHub</strong> bhi use kar sakte hain!
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
