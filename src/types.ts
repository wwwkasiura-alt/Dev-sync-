export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  lastModified: number;
}

export interface GitHubSyncConfig {
  owner: string;
  repo: string;
  branch: string;
  lastSyncedAt?: number;
  lastCommitSha?: string;
  htmlUrl?: string;
  autoCommit?: boolean;
  autoCommitIntervalSeconds?: number;
  autoCommitBranch?: string;
  // Auto-Retry & Backoff Settings
  autoRetry?: boolean;
  maxRetries?: number;
  retryBackoffMs?: number;
  retryStrategy?: 'exponential' | 'linear' | 'fixed';
}

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  public_repos?: number;
  bio?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: 'android-apk' | 'web-app' | 'generic-code';
  files: ProjectFile[];
  createdAt: number;
  updatedAt: number;
  version: string;
  githubSync?: GitHubSyncConfig;
}

export type AgentRole = 'architect' | 'coder' | 'reviewer' | 'devops';

export interface AgentInfo {
  id: AgentRole;
  name: string;
  title: string;
  avatarBg: string;
  avatarIcon: string;
  color: string;
  description: string;
  specialty: string;
}

export interface CodePatch {
  filePath: string;
  action: 'edit' | 'create';
  newContent: string;
  summary: string;
}

export interface AgentChatMessage {
  id: string;
  sender: 'user' | AgentRole | 'guest-ai';
  senderName: string;
  agentRole?: AgentRole;
  text: string;
  timestamp: number;
  codeSnippet?: {
    language: string;
    filePath: string;
    code: string;
  };
  suggestedPatch?: CodePatch;
  suggestedPatches?: CodePatch[];
  appliedStatus?: 'pending' | 'applied' | 'rejected';
  executionResult?: ExecutionResult;
}

export interface GuestSubmission {
  id: string;
  projectId: string;
  author: string;
  comment: string;
  filePath: string;
  newContent: string;
  timestamp: number;
  status: 'pending' | 'merged' | 'dismissed';
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  language: string;
  status: 'success' | 'error' | 'timeout';
  isWebPreview?: boolean;
  timestamp?: number;
}

export interface LanguageCapabilityInfo {
  id: string;
  name: string;
  icon: string;
  tag: string;
  extension: string;
  command: string;
  isInstalled: boolean;
  version?: string;
  capabilities: {
    write: boolean;
    read: boolean;
    edit: boolean;
    execute: boolean;
    install: boolean;
    build: boolean;
  };
  testStatus?: 'passed' | 'failed' | 'unsupported' | 'pending' | 'testing';
  testOutput?: string;
  testDurationMs?: number;
  sampleCode: string;
  description: string;
}
