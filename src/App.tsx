import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { CodeWorkspace } from './components/CodeWorkspace';
import { AgentSquadRoom } from './components/AgentSquadRoom';
import { MobileAIBridge } from './components/MobileAIBridge';
import { ApkBuildConsole } from './components/ApkBuildConsole';
import { NewProjectModal } from './components/NewProjectModal';
import { NewFileModal } from './components/NewFileModal';
import { ShareModal } from './components/ShareModal';
import { GitHubSyncCenter } from './components/GitHubSyncCenter';
import { EmptyWorkspace } from './components/EmptyWorkspace';
import { LanguageMatrixModal } from './components/LanguageMatrixModal';
import { INITIAL_PROJECTS, AGENTS } from './data/initialProjects';
import { Project, ProjectFile, AgentChatMessage, GuestSubmission, AgentRole, GitHubUser, CodePatch } from './types';
import { exportProjectAsZip } from './utils/zipExport';
import { getDbItem, setDbItem } from './lib/dbStorage';

const STORAGE_KEY_PROJECTS = 'codesquad_projects_v1';
const STORAGE_KEY_CHATS = 'codesquad_agent_chats_v1';
const STORAGE_KEY_SUBMISSIONS = 'codesquad_guest_submissions_v1';
const STORAGE_KEY_GITHUB_USER = 'codesquad_github_user_v1';

export default function App() {
  // Load saved projects or fallback to initial (filter out previous fake preview repos)
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (p: Project) => p && p.id !== 'quicknotes-apk' && p.id !== 'web-devtools-suite'
          );
        }
      }
    } catch (e) {
      console.warn('Failed to load projects from localStorage', e);
    }
    return INITIAL_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramProject = urlParams.get('project');
    if (paramProject && paramProject !== 'quicknotes-apk' && paramProject !== 'web-devtools-suite') {
      return paramProject;
    }
    return projects[0]?.id || '';
  });

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  const [activeFileId, setActiveFileId] = useState<string>(() => {
    return activeProject?.files[0]?.id || '';
  });

  const activeFile = activeProject?.files.find((f) => f.id === activeFileId) || activeProject?.files[0] || null;

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'code' | 'agents' | 'bridge' | 'apk'>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'bridge') return 'bridge';
    if (mode === 'agents') return 'agents';
    return 'code';
  });

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);

  // GitHub user profile state
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GITHUB_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse github user', e);
    }
    return null;
  });

  // Auto-Commit Runner State
  const [autoCommitStatus, setAutoCommitStatus] = useState<{
    isAutoCommitting: boolean;
    statusText: string;
    lastAutoCommittedAt?: number;
    error?: string | null;
  }>({
    isAutoCommitting: false,
    statusText: 'Idle',
  });

  const autoCommitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger auto-commit to GitHub feature branch
  const triggerAutoCommit = useCallback((targetProject: Project, reason: string) => {
    const config = targetProject.githubSync;
    const token = localStorage.getItem('codesquad_github_pat_v1') || '';
    
    if (!config || !config.autoCommit || !config.repo || !token.trim()) {
      return;
    }

    const targetBranch = config.autoCommitBranch || config.branch || 'main';
    const debounceDelayMs = (config.autoCommitIntervalSeconds || 3) * 1000;

    if (autoCommitTimerRef.current) {
      clearTimeout(autoCommitTimerRef.current);
    }

    setAutoCommitStatus({
      isAutoCommitting: true,
      statusText: `Scheduled push to branch "${targetBranch}" (${config.autoCommitIntervalSeconds || 3}s)...`,
      error: null,
    });

    autoCommitTimerRef.current = setTimeout(async () => {
      try {
        setAutoCommitStatus({
          isAutoCommitting: true,
          statusText: `Auto-committing ${targetProject.files.length} files to branch "${targetBranch}"...`,
          error: null,
        });

        const res = await fetch('/api/github/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.trim(),
            repoName: config.repo,
            branch: targetBranch,
            commitMessage: `auto-commit: ${reason} [skip ci]`,
            files: targetProject.files.map((f) => ({
              path: f.path,
              content: f.content,
            })),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to auto-commit to GitHub');
        }

        setAutoCommitStatus({
          isAutoCommitting: false,
          statusText: `Committed (${data.commitSha?.slice(0, 7) || 'latest'})`,
          lastAutoCommittedAt: Date.now(),
          error: null,
        });

        // Update project lastSyncedAt timestamp silently
        setProjects((prev) =>
          prev.map((proj) => {
            if (proj.id !== targetProject.id || !proj.githubSync) return proj;
            return {
              ...proj,
              githubSync: {
                ...proj.githubSync,
                lastSyncedAt: Date.now(),
                lastCommitSha: data.commitSha || proj.githubSync.lastCommitSha,
              },
            };
          })
        );
      } catch (err: any) {
        console.error('Auto-commit error:', err);
        setAutoCommitStatus({
          isAutoCommitting: false,
          statusText: 'Auto-commit failed',
          error: err.message || 'Auto-commit error',
        });
      }
    }, debounceDelayMs);
  }, []);

  const handleUpdateProject = (updated: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleImportProject = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setActiveFileId(newProject.files[0]?.id || '');
    setActiveTab('code');
  };

  // Chat messages store: projectId -> messages[]
  const [chats, setChats] = useState<Record<string, AgentChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHATS);
      if (saved) {
        const parsed = JSON.parse(saved);
        delete parsed['quicknotes-apk'];
        delete parsed['web-devtools-suite'];
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load chats from localStorage', e);
    }
    return {};
  });

  // Guest submissions store: projectId -> GuestSubmission[]
  const [submissions, setSubmissions] = useState<Record<string, GuestSubmission[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        delete parsed['quicknotes-apk'];
        delete parsed['web-devtools-suite'];
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load submissions from localStorage', e);
    }
    return {};
  });

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== projectId);
      if (activeProjectId === projectId) {
        const next = remaining[0] || null;
        setActiveProjectId(next ? next.id : '');
        setActiveFileId(next?.files[0]?.id || '');
      }
      return remaining;
    });
  };

  const handleQuickStartAndroid = () => {
    const cleanAndroidProject: Project = {
      id: 'android-app-' + Date.now(),
      name: 'Android App Starter',
      description: 'Clean Jetpack Compose & Kotlin project with Android Gradle structure.',
      type: 'android-apk',
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: [
        {
          id: 'file-main-activity',
          name: 'MainActivity.kt',
          path: 'app/src/main/java/com/example/app/MainActivity.kt',
          language: 'kotlin',
          lastModified: Date.now(),
          content: `package com.example.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Hello Android!",
                            style = MaterialTheme.typography.headlineMedium
                        )
                    }
                }
            }
        }
    }
}
`,
        },
        {
          id: 'file-manifest',
          name: 'AndroidManifest.xml',
          path: 'app/src/main/AndroidManifest.xml',
          language: 'xml',
          lastModified: Date.now(),
          content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.app">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:label="My Android App"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.Light.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`,
        },
        {
          id: 'file-gradle',
          name: 'build.gradle.kts',
          path: 'app/build.gradle.kts',
          language: 'groovy',
          lastModified: Date.now(),
          content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "com.example.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
}
`,
        },
        {
          id: 'file-readme',
          name: 'README.md',
          path: 'README.md',
          language: 'markdown',
          lastModified: Date.now(),
          content: `# Android App Starter

Clean starter repository created in CodeSquad AI Studio.

### Quick Build Instructions:
1. Export via **Download ZIP** from the top bar.
2. Open the directory in **Android Studio**.
3. Run:
   \`\`\`bash
   ./gradlew assembleDebug
   \`\`\`
`,
        },
      ],
    };

    setProjects((prev) => [cleanAndroidProject, ...prev]);
    setActiveProjectId(cleanAndroidProject.id);
    setActiveFileId(cleanAndroidProject.files[0]?.id || '');
    setActiveTab('code');
  };

  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<{
    filePath: string;
    action: 'edit' | 'create';
    newContent: string;
    summary: string;
    source: string;
  } | null>(null);

  // Sync to IndexedDB & localStorage for unlimited robust capacity
  useEffect(() => {
    setDbItem(STORAGE_KEY_PROJECTS, projects).catch((err) => {
      console.warn('Error saving projects to IndexedDB', err);
    });

    // Also sync active project to server memory for crawler & raw library accessibility
    if (activeProject) {
      fetch('/api/projects/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: activeProject }),
      }).catch(() => {});
    }
  }, [projects, activeProject]);

  // Periodic check for guest submissions sent via /library web form
  useEffect(() => {
    if (!activeProject) return;

    const fetchSubmissions = async () => {
      try {
        const res = await fetch(`/api/bridge/submissions/${activeProject.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.submissions && data.submissions.length > 0) {
            setSubmissions((prev) => {
              const current = prev[activeProject.id] || [];
              const existingIds = new Set(current.map((s) => s.id));
              const newSubs = data.submissions.filter((s: any) => !existingIds.has(s.id));
              if (newSubs.length === 0) return prev;
              return {
                ...prev,
                [activeProject.id]: [...current, ...newSubs],
              };
            });
          }
        }
      } catch (err) {
        // silent fail
      }
    };

    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 5000);
    return () => clearInterval(interval);
  }, [activeProject?.id]);

  useEffect(() => {
    setDbItem(STORAGE_KEY_CHATS, chats).catch((err) => {
      console.warn('Error saving chats to IndexedDB', err);
    });
  }, [chats]);

  useEffect(() => {
    setDbItem(STORAGE_KEY_SUBMISSIONS, submissions).catch((err) => {
      console.warn('Error saving submissions to IndexedDB', err);
    });
  }, [submissions]);

  useEffect(() => {
    if (githubUser) {
      setDbItem(STORAGE_KEY_GITHUB_USER, githubUser).catch(() => {});
    }
  }, [githubUser]);

  // Project selection
  const handleSelectProject = (project: Project) => {
    setActiveProjectId(project.id);
    setActiveFileId(project.files[0]?.id || '');
    setPendingPatch(null);
  };

  // File content save / edit
  const handleSaveFileContent = (fileId: string, newContent: string) => {
    if (!activeProject) return;
    
    const targetFile = activeProject.files.find((f) => f.id === fileId);
    const updatedFiles = activeProject.files.map((file) => {
      if (file.id !== fileId) return file;
      return {
        ...file,
        content: newContent,
        lastModified: Date.now(),
      };
    });

    const updatedProject: Project = {
      ...activeProject,
      updatedAt: Date.now(),
      files: updatedFiles,
    };

    setProjects((prev) =>
      prev.map((proj) => (proj.id === activeProject.id ? updatedProject : proj))
    );

    // Auto-commit trigger on save if enabled
    if (activeProject.githubSync?.autoCommit) {
      triggerAutoCommit(
        updatedProject,
        `update ${targetFile?.path || 'file'} via editor save`
      );
    }
  };

  // Create new file
  const handleCreateFile = (newFile: ProjectFile) => {
    if (!activeProject) return;
    const updatedProject: Project = {
      ...activeProject,
      updatedAt: Date.now(),
      files: [...activeProject.files, newFile],
    };

    setProjects((prev) =>
      prev.map((proj) => (proj.id === activeProject.id ? updatedProject : proj))
    );
    setActiveFileId(newFile.id);

    // Auto-commit trigger on file creation if enabled
    if (activeProject.githubSync?.autoCommit) {
      triggerAutoCommit(
        updatedProject,
        `create ${newFile.path}`
      );
    }
  };

  // Delete file
  const handleDeleteFile = (fileId: string) => {
    if (!activeProject) return;
    const targetFile = activeProject.files.find((f) => f.id === fileId);
    const remaining = activeProject.files.filter((f) => f.id !== fileId);
    const updatedProject: Project = {
      ...activeProject,
      updatedAt: Date.now(),
      files: remaining,
    };

    setProjects((prev) =>
      prev.map((proj) => (proj.id === activeProject.id ? updatedProject : proj))
    );

    if (activeFileId === fileId) {
      const nextFile = activeProject.files.find((f) => f.id !== fileId);
      if (nextFile) setActiveFileId(nextFile.id);
    }

    // Auto-commit trigger on file deletion if enabled
    if (activeProject.githubSync?.autoCommit) {
      triggerAutoCommit(
        updatedProject,
        `delete ${targetFile?.path || 'file'}`
      );
    }
  };

  // Create new project
  const handleCreateProject = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setActiveFileId(newProject.files[0]?.id || '');
    setActiveTab('code');
  };

  // Download project as ZIP
  const handleDownloadZip = async () => {
    if (activeProject) {
      await exportProjectAsZip(activeProject);
    }
  };

  // Direct order to the AI Squad
  const handleSendOrder = async (orderText: string, targetAgent: 'all' | AgentRole) => {
    if (!activeProject) return;
    const userMsg: AgentChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      senderName: 'You',
      text: orderText,
      timestamp: Date.now(),
    };

    const currentProjectMessages = chats[activeProject.id] || [];
    const updatedMessages = [...currentProjectMessages, userMsg];

    setChats((prev) => ({
      ...prev,
      [activeProject.id]: updatedMessages,
    }));

    setIsAgentLoading(true);

    try {
      const response = await fetch('/api/agents/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: orderText,
          targetAgent,
          projectContext: {
            name: activeProject.name,
            type: activeProject.type,
            files: activeProject.files.map((f) => ({
              path: f.path,
              content: f.content,
              language: f.language,
            })),
          },
          conversationHistory: updatedMessages.slice(-6),
        }),
      });

      const data = await response.json();
      const dialogue = data?.dialogue || [];

      // Add each agent turn
      const newTurns: AgentChatMessage[] = dialogue.map((turn: any, index: number) => ({
        id: 'agent-msg-' + Date.now() + '-' + index,
        sender: turn.agent,
        agentRole: turn.agent,
        senderName: turn.name,
        text: turn.text,
        suggestedPatch: turn.suggestedPatch,
        timestamp: Date.now() + index * 400,
      }));

      setChats((prev) => ({
        ...prev,
        [activeProject.id]: [...(prev[activeProject.id] || []), ...newTurns],
      }));

      // Check if any agent provided a patch
      const patchTurn = newTurns.find((t) => t.suggestedPatch);
      if (patchTurn && patchTurn.suggestedPatch) {
        setPendingPatch({
          ...patchTurn.suggestedPatch,
          source: patchTurn.senderName,
        });
      }
    } catch (err) {
      console.error('Error communicating with AI squad:', err);
    } finally {
      setIsAgentLoading(false);
    }
  };

  // Apply single code patch from agent squad directly to project
  const handleApplyPatch = (patch: CodePatch) => {
    handleApplyMultiplePatches([patch]);
  };

  // Apply multiple atomic code patches from agent squad to project
  const handleApplyMultiplePatches = (patches: CodePatch[]) => {
    if (!activeProject || patches.length === 0) return;

    const patchFilePaths = new Set(patches.map((p) => p.filePath));

    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProject.id) return proj;

        let updatedFiles = [...proj.files];

        patches.forEach((patch) => {
          const fileIndex = updatedFiles.findIndex((f) => f.path === patch.filePath);
          if (fileIndex >= 0) {
            updatedFiles[fileIndex] = {
              ...updatedFiles[fileIndex],
              content: patch.newContent,
              lastModified: Date.now(),
            };
          } else {
            const fileName = patch.filePath.split('/').pop() || patch.filePath;
            updatedFiles.push({
              id: 'file-' + Math.random().toString(36).substring(2, 9),
              name: fileName,
              path: patch.filePath,
              content: patch.newContent,
              language: fileName.endsWith('.kt') ? 'kotlin' : fileName.endsWith('.xml') ? 'xml' : 'text',
              lastModified: Date.now(),
            });
          }
        });

        return {
          ...proj,
          updatedAt: Date.now(),
          files: updatedFiles,
        };
      })
    );

    // Mark patches as applied in chat messages
    setChats((prev) => {
      const projChats = prev[activeProject.id] || [];
      return {
        ...prev,
        [activeProject.id]: projChats.map((m) => {
          const hasMatchingPatch = (m.suggestedPatches && m.suggestedPatches.some((p) => patchFilePaths.has(p.filePath))) ||
                                   (m.suggestedPatch && patchFilePaths.has(m.suggestedPatch.filePath));
          if (hasMatchingPatch) {
            return { ...m, appliedStatus: 'applied' };
          }
          return m;
        }),
      };
    });

    setPendingPatch(null);
  };

  // Handle investigation and triage from APK Build Console Diagnostics
  const handleAskAiToFixAudit = (issuesText: string) => {
    if (!activeProject) return;
    setActiveTab('agents');
    const auditTriagePrompt = `PROJECT DIAGNOSTICS TRIAGE & ROOT CAUSE INVESTIGATION:
The static code & manifest audit highlighted the following notices/warnings:
${issuesText}

Please investigate carefully with the squad:
1. Identify the exact root cause behind why each notice appeared.
2. Determine if each item is a critical breaking error or simply an optional/benign warning or intentional setup (remember: not every warning or sign is an error!).
3. Explain the findings clearly to the user.
4. Only suggest code patches if a real architectural or functional fix is truly needed.`;
    handleSendOrder(auditTriagePrompt, 'all');
  };

  // Submit patch from Mobile AI Web Bridge
  const handleSubmitGuestPatch = (patchData: {
    author: string;
    comment: string;
    filePath: string;
    newContent: string;
  }) => {
    if (!activeProject) return;
    const newSub: GuestSubmission = {
      id: 'sub-' + Date.now(),
      projectId: activeProject.id,
      author: patchData.author,
      comment: patchData.comment,
      filePath: patchData.filePath,
      newContent: patchData.newContent,
      timestamp: Date.now(),
      status: 'pending',
    };

    setSubmissions((prev) => ({
      ...prev,
      [activeProject.id]: [newSub, ...(prev[activeProject.id] || [])],
    }));

    // Post to backend server store as well
    fetch(`/api/public/submit-patch/${activeProject.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchData),
    }).catch((e) => console.warn('Could not post to server store', e));

    // Also notify the Agent Squad in the chat
    const alertMsg: AgentChatMessage = {
      id: 'sub-notify-' + Date.now(),
      sender: 'guest-ai',
      senderName: patchData.author,
      text: `External patch received via Web URL: "${patchData.comment}" on \`${patchData.filePath}\`.`,
      timestamp: Date.now(),
      suggestedPatch: {
        filePath: patchData.filePath,
        action: 'edit',
        newContent: patchData.newContent,
        summary: patchData.comment,
      },
    };

    setChats((prev) => ({
      ...prev,
      [activeProject.id]: [...(prev[activeProject.id] || []), alertMsg],
    }));
  };

  // Merge external submission
  const handleMergeSubmission = (sub: GuestSubmission) => {
    if (!activeProject) return;
    handleApplyPatch({
      filePath: sub.filePath,
      action: 'edit',
      newContent: sub.newContent || (activeProject.files.find((f) => f.path === sub.filePath)?.content || ''),
      summary: sub.comment,
    });

    setSubmissions((prev) => ({
      ...prev,
      [activeProject.id]: (prev[activeProject.id] || []).filter((s) => s.id !== sub.id),
    }));
  };

  const handleDismissSubmission = (subId: string) => {
    if (!activeProject) return;
    setSubmissions((prev) => ({
      ...prev,
      [activeProject.id]: (prev[activeProject.id] || []).filter((s) => s.id !== subId),
    }));
  };

  const projectSubmissions = activeProject ? submissions[activeProject.id] || [] : [];
  const projectMessages = activeProject ? chats[activeProject.id] || [] : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white overflow-x-hidden">
      
      {/* Top Header control bar */}
      <Header
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        onDownloadZip={handleDownloadZip}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onOpenMatrixModal={() => setIsMatrixModalOpen(true)}
        pendingSubmissionsCount={projectSubmissions.length}
        githubUser={githubUser}
      />

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col min-h-0 bg-slate-950 relative">
        {!activeProject ? (
          <EmptyWorkspace
            onOpenNewProject={() => setIsNewProjectModalOpen(true)}
            onOpenGitHub={() => setIsGitHubModalOpen(true)}
            onQuickStartAndroid={handleQuickStartAndroid}
          />
        ) : (
          <div className="flex-1 flex flex-col min-h-0 relative">
            {activeTab === 'code' && (
              <CodeWorkspace
                project={activeProject}
                activeFile={activeFile}
                onSelectFile={(file) => setActiveFileId(file.id)}
                onSaveFileContent={handleSaveFileContent}
                onOpenNewFileModal={() => setIsNewFileModalOpen(true)}
                onDeleteFile={handleDeleteFile}
                pendingPatch={pendingPatch}
                onApplyPendingPatch={() => pendingPatch && handleApplyPatch(pendingPatch)}
                onDiscardPendingPatch={() => setPendingPatch(null)}
                autoCommitStatus={autoCommitStatus}
                onOpenGitHubSyncModal={() => setIsGitHubModalOpen(true)}
                onOpenMatrixModal={() => setIsMatrixModalOpen(true)}
              />
            )}

            {activeTab === 'agents' && (
              <AgentSquadRoom
                project={activeProject}
                agents={AGENTS}
                messages={projectMessages}
                onSendOrder={handleSendOrder}
                isLoading={isAgentLoading}
                onApplyPatch={handleApplyPatch}
                onApplyMultiplePatches={handleApplyMultiplePatches}
                onOpenMatrixModal={() => setIsMatrixModalOpen(true)}
              />
            )}

            {activeTab === 'bridge' && (
              <MobileAIBridge
                project={activeProject}
                submissions={projectSubmissions}
                onSubmitPatch={handleSubmitGuestPatch}
                onMergeSubmission={handleMergeSubmission}
                onDismissSubmission={handleDismissSubmission}
                onUpdateProject={handleUpdateProject}
              />
            )}

            {activeTab === 'apk' && (
              <ApkBuildConsole
                project={activeProject}
                onDownloadZip={handleDownloadZip}
                onAskAiToFix={handleAskAiToFixAudit}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      <NewFileModal
        isOpen={isNewFileModalOpen}
        onClose={() => setIsNewFileModalOpen(false)}
        onCreateFile={handleCreateFile}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        project={activeProject}
      />

      <GitHubSyncCenter
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        project={activeProject}
        onUpdateProject={handleUpdateProject}
        onImportProject={handleImportProject}
        onUserChange={setGithubUser}
      />

      <LanguageMatrixModal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        project={activeProject}
        onCreateFileFromTemplate={(file) => handleCreateFile(file)}
      />

    </div>
  );
}
