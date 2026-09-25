import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { executeCode, runLanguageCapabilityMatrix } from './server/executionEngine.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// In-memory store for guest submissions, project bridge, and shared library
const guestSubmissionsStore: Record<string, any[]> = {};
const sharedProjectsStore: Record<string, any> = {};

// Lazy-initialized Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    try {
      geminiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.warn('Could not initialize GoogleGenAI client:', err);
    }
  }
  return geminiClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: Date.now(),
  });
});

// Universal Multi-Language Code Execution API
app.post('/api/code/execute', async (req, res) => {
  const { code, language = 'python', stdin = '', filePath, timeoutMs = 12000 } = req.body;

  if (typeof code !== 'string') {
    res.status(400).json({ error: 'code (string) is required' });
    return;
  }

  try {
    const result = await executeCode({
      code,
      language,
      stdin,
      filePath,
      timeoutMs: Number(timeoutMs) || 12000,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Execution error',
      stdout: '',
      stderr: err.message || 'Execution failed',
      exitCode: 1,
      executionTimeMs: 0,
      language,
      status: 'error',
    });
  }
});

// Universal Language Capability Matrix Probe API
app.get('/api/code/matrix-probe', async (req, res) => {
  try {
    const matrix = await runLanguageCapabilityMatrix();
    res.json({
      matrix,
      timestamp: Date.now(),
      totalLanguages: matrix.length,
      passedCount: matrix.filter((m) => m.testStatus === 'passed').length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to probe language matrix' });
  }
});

// Multi-Agent Squad Order Endpoint
app.post('/api/agents/order', async (req, res) => {
  const { order, targetAgent = 'all', projectContext, conversationHistory = [] } = req.body;

  if (!order || typeof order !== 'string') {
    res.status(400).json({ error: 'Order is required' });
    return;
  }

  const ai = getGeminiClient();

  if (!ai) {
    res.status(400).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY environment variable to use the AI squad.',
    });
    return;
  }

  try {
    // Intelligent file context: include full content up to 10,000 chars per file
    const filesOverview = projectContext?.files?.map((f: any) => {
      const truncatedContent = f.content.length > 10000
        ? f.content.slice(0, 10000) + '\n// ... [remaining content trimmed for context]'
        : f.content;
      return `File: ${f.path}\nContent:\n\`\`\`${f.language || ''}\n${truncatedContent}\n\`\`\``;
    }).join('\n\n') || 'No files';

    const prompt = `You are the lead orchestrator of an elite 4-member AI Engineering Squad in a Universal Multi-Language Coding & Execution Workspace.
Project Name: ${projectContext?.name || 'Project'}
Project Type: ${projectContext?.type || 'generic-code'}

CURRENT PROJECT FILES:
${filesOverview}

USER'S DIRECT ORDER:
"${order}"

TARGET AUDIENCE: ${targetAgent === 'all' ? 'The entire AI team will address this order collaboratively.' : `Specific order directed to ${targetAgent}.`}

TEAM MEMBERS & CAPABILITIES:
1. "architect" (Aria - Lead Systems Architect): Analyzes requirements across all languages (Kotlin, Python, TypeScript, JavaScript, SQL, Bash, C/C++, Java, Rust, Go, HTML), plans clean architectures, state models, and modular patterns.
2. "coder" (Rex - Universal Fullstack & Polyglot Coder): Writes and edits complete code in Kotlin, Python, TypeScript, JavaScript, SQL, C/C++, Rust, Go, Java, or Shell. Always writes complete, runnable code.
3. "reviewer" (Cipher - QA & Security Reviewer): Audits code for memory leaks, type safety, SQL injection, null safety, logic bugs, performance, and test verification.
4. "devops" (Nova - DevOps, Compiler & Execution Lead): Handles package dependencies (pip, npm, cargo, maven, gradle), compiler settings, execution commands, and environment diagnostics.

TASK INSTRUCTIONS:
- Simulate the AI squad working together in real time. The team speaks naturally to each other and to the user (can understand Hindi/Hinglish/English naturally).
- MULTI-LANGUAGE FREEDOM: The squad can write and modify code in ANY language requested, especially Kotlin & Jetpack Compose for Android.
- ROOT CAUSE & TRIAGE RULE: Explain reasons clearly and only propose changes that solve the user's requirements.
- MULTI-FILE CODE PATCHES: If the user's order requires multiple files, provide them in "suggestedPatches"!
- Always write COMPLETE, working code in "newContent" without placeholders or truncation comments.

Respond with pure JSON matching this TypeScript structure:
{
  "dialogue": [
    {
      "agent": "architect" | "coder" | "reviewer" | "devops",
      "name": string,
      "text": string,
      "suggestedPatches": [
        {
          "filePath": string,
          "action": "edit" | "create",
          "newContent": string,
          "summary": string
        }
      ]
    }
  ]
}

Return between 2 to 4 back-and-forth turns between the agents where they discuss, write the code, and review it. Return pure JSON only.`;

    const geminiPromise = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    // 45 seconds timeout for comprehensive multi-file code generation
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 45000)
    );

    const response: any = await Promise.race([geminiPromise, timeoutPromise]);
    const responseText = response.text || '{}';
    const parsed = JSON.parse(responseText);
    if (parsed.dialogue && Array.isArray(parsed.dialogue)) {
      const normalizedDialogue = parsed.dialogue.map((turn: any) => {
        let patches = turn.suggestedPatches;
        if (!patches && turn.suggestedPatch) {
          patches = [turn.suggestedPatch];
        }
        return {
          ...turn,
          suggestedPatches: patches && patches.length > 0 ? patches : undefined,
          suggestedPatch: patches && patches.length > 0 ? patches[0] : undefined,
        };
      });
      res.json({ dialogue: normalizedDialogue });
      return;
    }

    res.status(500).json({ error: 'Invalid response format received from Gemini API' });
  } catch (err: any) {
    console.error('Gemini API call failed:', err);
    res.status(500).json({ error: err.message || 'Gemini API call failed' });
  }
});

// Guest AI / Mobile URL Bridge: Fetch full raw project context for external mobile AIs
app.get('/api/public/project-context/:projectId', (req, res) => {
  const { projectId } = req.params;
  res.json({
    projectId,
    message: 'Raw project context for external AI web bridge',
    instructions: 'You can inspect the code below. To propose edits or advice, submit a POST request to /api/public/submit-patch/:projectId or use the web bridge interface.',
  });
});

// Guest AI / Mobile URL Bridge: Submit direct code patch or advice
app.post('/api/public/submit-patch/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { author = 'Mobile AI Agent', comment = 'Code optimization', filePath, newContent } = req.body;

  if (!filePath || !newContent) {
    res.status(400).json({ error: 'filePath and newContent are required' });
    return;
  }

  const submission = {
    id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    projectId,
    author,
    comment,
    filePath,
    newContent,
    timestamp: Date.now(),
    status: 'pending',
  };

  if (!guestSubmissionsStore[projectId]) {
    guestSubmissionsStore[projectId] = [];
  }
  guestSubmissionsStore[projectId].push(submission);

  res.json({
    success: true,
    message: 'Patch received successfully and queued for project owner review',
    submission,
  });
});

// Fetch pending submissions for project
app.get('/api/projects/:projectId/submissions', (req, res) => {
  const { projectId } = req.params;
  res.json({ submissions: guestSubmissionsStore[projectId] || [] });
});

// GitHub Integration: Verify Personal Access Token
app.post('/api/github/verify', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'GitHub Personal Access Token is required' });
    return;
  }

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'CodeSquad-AI-Studio',
      },
    });

    if (!userRes.ok) {
      const errData: any = await userRes.json().catch(() => ({}));
      res.status(userRes.status).json({
        error: errData.message || 'Invalid or expired GitHub token. Ensure it has "repo" scope.',
      });
      return;
    }

    const userData: any = await userRes.json();
    res.json({
      valid: true,
      login: userData.login,
      name: userData.name || userData.login,
      avatar_url: userData.avatar_url,
      html_url: userData.html_url,
      public_repos: userData.public_repos || 0,
      bio: userData.bio || '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to connect to GitHub API' });
  }
});

// GitHub Integration: List Branches for a Repository
app.post('/api/github/branches', async (req, res) => {
  const { token, owner, repo } = req.body;
  if (!token || !owner || !repo) {
    res.status(400).json({ error: 'token, owner, and repo are required' });
    return;
  }

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CodeSquad-AI-Studio',
    };

    const branchesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, {
      headers,
    });

    if (!branchesRes.ok) {
      const err = await branchesRes.json().catch(() => ({}));
      res.status(branchesRes.status).json({ error: (err as any).message || 'Failed to fetch branches' });
      return;
    }

    const branchesData: any = await branchesRes.json();
    const branches = branchesData.map((b: any) => ({
      name: b.name,
      commitSha: b.commit?.sha ? b.commit.sha.substring(0, 7) : '',
      fullSha: b.commit?.sha || '',
      protected: Boolean(b.protected),
    }));

    res.json({ branches });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching branches' });
  }
});

// GitHub Integration: Create a New Branch
app.post('/api/github/branches/create', async (req, res) => {
  const { token, owner, repo, newBranch, sourceBranch = 'main' } = req.body;
  if (!token || !owner || !repo || !newBranch) {
    res.status(400).json({ error: 'token, owner, repo, and newBranch are required' });
    return;
  }

  const cleanBranch = newBranch.trim().replace(/\s+/g, '-');

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CodeSquad-AI-Studio',
    };

    // 1. Get SHA of source branch
    const sourceRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${sourceBranch}`, {
      headers,
    });

    if (!sourceRefRes.ok) {
      const err = await sourceRefRes.json().catch(() => ({}));
      res.status(400).json({
        error: (err as any).message || `Source branch '${sourceBranch}' not found on repository`,
      });
      return;
    }

    const sourceRefData: any = await sourceRefRes.json();
    const sourceSha = sourceRefData.object?.sha;
    if (!sourceSha) {
      res.status(400).json({ error: `Could not retrieve commit SHA for branch '${sourceBranch}'` });
      return;
    }

    // 2. Create new reference
    const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: `refs/heads/${cleanBranch}`,
        sha: sourceSha,
      }),
    });

    if (!createRefRes.ok) {
      const err = await createRefRes.json().catch(() => ({}));
      res.status(createRefRes.status).json({
        error: (err as any).message || `Failed to create branch '${cleanBranch}'. It may already exist.`,
      });
      return;
    }

    res.json({
      success: true,
      branch: cleanBranch,
      sha: sourceSha.substring(0, 7),
      message: `Branch '${cleanBranch}' created successfully from '${sourceBranch}'`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error creating branch' });
  }
});

// GitHub Integration: Merge Branches
app.post('/api/github/branches/merge', async (req, res) => {
  const { token, owner, repo, baseBranch, headBranch, commitMessage } = req.body;
  if (!token || !owner || !repo || !baseBranch || !headBranch) {
    res.status(400).json({ error: 'token, owner, repo, baseBranch, and headBranch are required' });
    return;
  }

  if (baseBranch === headBranch) {
    res.status(400).json({ error: 'Base and Head branch cannot be the same branch.' });
    return;
  }

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CodeSquad-AI-Studio',
    };

    const msg = commitMessage?.trim() || `Merge branch '${headBranch}' into '${baseBranch}' via CodeSquad AI Hub`;

    const mergeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/merges`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base: baseBranch,
        head: headBranch,
        commit_message: msg,
      }),
    });

    if (mergeRes.status === 204) {
      res.json({
        success: true,
        status: 'already_merged',
        message: `Base branch '${baseBranch}' is already up-to-date with '${headBranch}'. Nothing to merge.`,
      });
      return;
    }

    if (mergeRes.status === 409) {
      const err = await mergeRes.json().catch(() => ({}));
      res.status(409).json({
        error: (err as any).message || `Merge conflict between '${headBranch}' and '${baseBranch}'. Automatic merge cannot be performed.`,
      });
      return;
    }

    if (!mergeRes.ok) {
      const err = await mergeRes.json().catch(() => ({}));
      res.status(mergeRes.status).json({
        error: (err as any).message || `Failed to merge '${headBranch}' into '${baseBranch}'`,
      });
      return;
    }

    const mergeData: any = await mergeRes.json();
    res.json({
      success: true,
      status: 'merged',
      commitSha: mergeData.sha ? mergeData.sha.substring(0, 7) : '',
      message: `Successfully merged '${headBranch}' into '${baseBranch}'!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error merging branches' });
  }
});

// GitHub Integration: Pull Code Files from a Branch into Workspace
app.post('/api/github/branch-pull', async (req, res) => {
  const { token, owner, repo, branch } = req.body;
  if (!token || !owner || !repo || !branch) {
    res.status(400).json({ error: 'token, owner, repo, and branch are required' });
    return;
  }

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CodeSquad-AI-Studio',
    };

    // 1. Fetch Git Tree recursively for target branch
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
      headers,
    });
    if (!treeRes.ok) {
      const err = await treeRes.json().catch(() => ({}));
      res.status(400).json({ error: (err as any).message || `Could not read tree for branch '${branch}'` });
      return;
    }
    const treeData: any = await treeRes.json();
    const rawTree = treeData.tree || [];

    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svg',
      '.jar', '.apk', '.aab', '.class', '.zip', '.tar', '.gz',
      '.pdf', '.ttf', '.woff', '.woff2', '.mp3', '.mp4', '.wav',
      '.bin', '.exe', '.so', '.dylib', '.lock'
    ];

    const eligibleFiles = rawTree.filter((item: any) => {
      if (item.type !== 'blob') return false;
      const p = item.path.toLowerCase();
      if (p.includes('node_modules/') || p.includes('.git/') || p.includes('build/') || p.includes('dist/')) {
        return false;
      }
      return !binaryExtensions.some((ext) => p.endsWith(ext));
    }).slice(0, 40);

    const files: Array<{
      id: string;
      name: string;
      path: string;
      content: string;
      language: string;
      lastModified: number;
    }> = [];

    for (const item of eligibleFiles) {
      const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}?ref=${branch}`, { headers });
      if (fileRes.ok) {
        const fileJson: any = await fileRes.json();
        const content = Buffer.from(fileJson.content || '', 'base64').toString('utf-8');
        const fileName = item.path.split('/').pop() || item.path;

        let language = 'text';
        if (fileName.endsWith('.kt')) language = 'kotlin';
        else if (fileName.endsWith('.java')) language = 'java';
        else if (fileName.endsWith('.xml')) language = 'xml';
        else if (fileName.endsWith('.gradle') || fileName.endsWith('.kts')) language = 'groovy';
        else if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) language = 'typescript';
        else if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) language = 'javascript';
        else if (fileName.endsWith('.json')) language = 'json';
        else if (fileName.endsWith('.md')) language = 'markdown';

        files.push({
          id: 'gh-file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: fileName,
          path: item.path,
          content,
          language,
          lastModified: Date.now(),
        });
      }
    }

    if (files.length === 0) {
      res.status(400).json({ error: `No readable code files found in branch '${branch}'` });
      return;
    }

    res.json({
      success: true,
      branch,
      files,
      commitSha: treeData.sha ? treeData.sha.substring(0, 7) : '',
      filesCount: files.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to pull branch code' });
  }
});

// GitHub Integration: List User's Repositories
app.post('/api/github/user-repos', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'GitHub token is required' });
    return;
  }

  try {
    const reposRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'CodeSquad-AI-Studio',
      },
    });

    if (!reposRes.ok) {
      const err = await reposRes.json().catch(() => ({}));
      res.status(reposRes.status).json({ error: (err as any).message || 'Failed to fetch repositories' });
      return;
    }

    const reposData: any = await reposRes.json();
    const repos = reposData.map((r: any) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      owner: r.owner?.login,
      private: r.private,
      html_url: r.html_url,
      description: r.description || '',
      updated_at: r.updated_at,
      default_branch: r.default_branch || 'main',
      stars: r.stargazers_count,
      fork: r.fork,
    }));

    res.json({ repos });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching user repositories' });
  }
});

// GitHub Integration: Get Recent Commits of a Repository
app.post('/api/github/repo-commits', async (req, res) => {
  const { token, owner, repo, branch = 'main' } = req.body;
  if (!token || !owner || !repo) {
    res.status(400).json({ error: 'token, owner, and repo are required' });
    return;
  }

  try {
    const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=6`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'CodeSquad-AI-Studio',
      },
    });

    if (!commitsRes.ok) {
      const err = await commitsRes.json().catch(() => ({}));
      res.status(commitsRes.status).json({ error: (err as any).message || 'Failed to fetch commits' });
      return;
    }

    const commitsData: any = await commitsRes.json();
    const commits = commitsData.map((c: any) => ({
      sha: c.sha.substring(0, 7),
      full_sha: c.sha,
      message: c.commit?.message?.split('\n')[0] || 'Commit',
      author: c.commit?.author?.name || c.author?.login || 'Developer',
      date: c.commit?.author?.date || new Date().toISOString(),
      html_url: c.html_url,
    }));

    res.json({ commits });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching commits' });
  }
});

// GitHub Integration: Import Repository into Workspace
app.post('/api/github/import-repo', async (req, res) => {
  const { token, owner, repo, branch } = req.body;
  if (!token || !owner || !repo) {
    res.status(400).json({ error: 'token, owner, and repo are required' });
    return;
  }

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CodeSquad-AI-Studio',
    };

    // 1. Get repository metadata
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      const err = await repoRes.json().catch(() => ({}));
      res.status(repoRes.status).json({ error: (err as any).message || 'Repository not found' });
      return;
    }
    const repoInfo: any = await repoRes.json();
    const targetBranch = branch || repoInfo.default_branch || 'main';

    // 2. Fetch Git Tree recursively
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`, { headers });
    if (!treeRes.ok) {
      res.status(400).json({ error: 'Could not read repository tree. The branch may be empty.' });
      return;
    }
    const treeData: any = await treeRes.json();
    const rawTree = treeData.tree || [];

    // Filter text/code files
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svg',
      '.jar', '.apk', '.aab', '.class', '.zip', '.tar', '.gz',
      '.pdf', '.ttf', '.woff', '.woff2', '.mp3', '.mp4', '.wav',
      '.bin', '.exe', '.so', '.dylib', '.lock'
    ];

    const eligibleFiles = rawTree.filter((item: any) => {
      if (item.type !== 'blob') return false;
      const p = item.path.toLowerCase();
      if (p.includes('node_modules/') || p.includes('.git/') || p.includes('build/') || p.includes('dist/')) {
        return false;
      }
      return !binaryExtensions.some((ext) => p.endsWith(ext));
    }).slice(0, 30); // limit to 30 core files

    // 3. Fetch contents of files
    const files: Array<{
      id: string;
      name: string;
      path: string;
      content: string;
      language: string;
      lastModified: number;
    }> = [];

    let isAndroid = false;

    for (const item of eligibleFiles) {
      const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}?ref=${targetBranch}`, { headers });
      if (fileRes.ok) {
        const fileJson: any = await fileRes.json();
        const content = Buffer.from(fileJson.content || '', 'base64').toString('utf-8');
        const fileName = item.path.split('/').pop() || item.path;

        let language = 'text';
        if (fileName.endsWith('.kt')) language = 'kotlin';
        else if (fileName.endsWith('.java')) language = 'java';
        else if (fileName.endsWith('.xml')) language = 'xml';
        else if (fileName.endsWith('.gradle') || fileName.endsWith('.kts')) language = 'groovy';
        else if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) language = 'typescript';
        else if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) language = 'javascript';
        else if (fileName.endsWith('.json')) language = 'json';
        else if (fileName.endsWith('.md')) language = 'markdown';

        if (fileName.includes('AndroidManifest.xml') || fileName.endsWith('.gradle.kts') || fileName.endsWith('.kt')) {
          isAndroid = true;
        }

        files.push({
          id: 'gh-file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: fileName,
          path: item.path,
          content,
          language,
          lastModified: Date.now(),
        });
      }
    }

    if (files.length === 0) {
      res.status(400).json({ error: 'No readable code files found in this repository branch.' });
      return;
    }

    const importedProject = {
      id: `gh-${owner}-${repo}-${Date.now().toString().slice(-4)}`,
      name: repoInfo.name,
      description: repoInfo.description || `Imported from GitHub (${owner}/${repo})`,
      type: isAndroid ? 'android-apk' : 'web-app',
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files,
      githubSync: {
        owner,
        repo,
        branch: targetBranch,
        lastSyncedAt: Date.now(),
        htmlUrl: repoInfo.html_url,
      },
    };

    res.json({
      success: true,
      project: importedProject,
      filesImported: files.length,
    });
  } catch (err: any) {
    console.error('Import repo error:', err);
    res.status(500).json({ error: err.message || 'Failed to import repository from GitHub' });
  }
});

// GitHub Integration: Push Project to Repository
app.post('/api/github/push', async (req, res) => {
  const {
    token,
    repoName,
    description = '',
    isPrivate = false,
    commitMessage = 'Initial commit from CodeSquad AI',
    files = [],
    branch = 'main',
  } = req.body;

  if (!token || !repoName || !files.length) {
    res.status(400).json({ error: 'token, repoName, and project files are required' });
    return;
  }

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CodeSquad-AI-Studio',
    };

    // 1. Get authenticated user
    const userRes = await fetch('https://api.github.com/user', { headers });
    if (!userRes.ok) {
      const err = await userRes.json().catch(() => ({}));
      res.status(401).json({ error: (err as any).message || 'Invalid GitHub token' });
      return;
    }
    const user: any = await userRes.json();
    const owner = user.login;

    // 2. Check if repo exists, if not create it
    const checkRepoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers });
    let repoData: any;

    if (checkRepoRes.status === 404) {
      // Create new repository with initial README so default branch exists
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repoName,
          description: description || 'Generated with CodeSquad AI Studio',
          private: Boolean(isPrivate),
          auto_init: true,
        }),
      });

      if (!createRes.ok) {
        const createErr: any = await createRes.json().catch(() => ({}));
        res.status(createRes.status).json({
          error: createErr.message || 'Failed to create GitHub repository. Please check your token permissions.',
        });
        return;
      }
      repoData = await createRes.json();
      // Brief delay to allow GitHub internal git reference initialization
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } else if (checkRepoRes.ok) {
      repoData = await checkRepoRes.json();
    } else {
      const repoErr: any = await checkRepoRes.json().catch(() => ({}));
      res.status(checkRepoRes.status).json({
        error: repoErr.message || 'Failed to check repository status on GitHub',
      });
      return;
    }

    const targetBranch = (branch && branch.trim()) ? branch.trim() : (repoData.default_branch || 'main');

    // 3. Obtain latest commit SHA for the branch if it exists, or fallback to default branch
    let baseTreeSha: string | undefined;
    let parentCommitSha: string | undefined;
    let branchExists = false;

    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${targetBranch}`, { headers });
    if (refRes.ok) {
      const refData: any = await refRes.json();
      parentCommitSha = refData.object.sha;
      branchExists = true;

      const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/commits/${parentCommitSha}`, { headers });
      if (commitRes.ok) {
        const commitData: any = await commitRes.json();
        baseTreeSha = commitData.tree.sha;
      }
    } else {
      // Branch doesn't exist yet, get head of default branch to branch off
      const defaultRefRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${repoData.default_branch || 'main'}`, { headers });
      if (defaultRefRes.ok) {
        const defaultRefData: any = await defaultRefRes.json();
        parentCommitSha = defaultRefData.object.sha;
        const defaultCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/commits/${parentCommitSha}`, { headers });
        if (defaultCommitRes.ok) {
          const defaultCommitData: any = await defaultCommitRes.json();
          baseTreeSha = defaultCommitData.tree.sha;
        }
      }
    }

    // 4. Create Git Blobs for all project files
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];

    for (const file of files) {
      const cleanPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/blobs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: Buffer.from(file.content || '').toString('base64'),
          encoding: 'base64',
        }),
      });

      if (blobRes.ok) {
        const blobData: any = await blobRes.json();
        treeItems.push({
          path: cleanPath,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        });
      } else {
        console.warn(`Failed to create blob for ${cleanPath}`);
      }
    }

    if (treeItems.length === 0) {
      res.status(400).json({ error: 'Could not upload any files to GitHub' });
      return;
    }

    // 5. Create Git Tree
    const treePayload: any = { tree: treeItems };
    if (baseTreeSha) {
      treePayload.base_tree = baseTreeSha;
    }

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(treePayload),
    });

    if (!treeRes.ok) {
      const treeErr: any = await treeRes.json().catch(() => ({}));
      res.status(treeRes.status).json({
        error: treeErr.message || 'Failed to create Git tree on GitHub',
      });
      return;
    }

    const newTree: any = await treeRes.json();

    // 6. Create Git Commit
    const commitPayload: any = {
      message: commitMessage,
      tree: newTree.sha,
      parents: parentCommitSha ? [parentCommitSha] : [],
    };

    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/commits`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(commitPayload),
    });

    if (!commitRes.ok) {
      const commitErr: any = await commitRes.json().catch(() => ({}));
      res.status(commitRes.status).json({
        error: commitErr.message || 'Failed to create Git commit',
      });
      return;
    }

    const newCommit: any = await commitRes.json();

    // 7. Update or create branch reference
    if (branchExists) {
      await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${targetBranch}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sha: newCommit.sha,
          force: true,
        }),
      });
    } else {
      await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${targetBranch}`,
          sha: newCommit.sha,
        }),
      });
    }

    res.json({
      success: true,
      repoUrl: repoData.html_url,
      cloneUrl: repoData.clone_url,
      branch: targetBranch,
      commitSha: newCommit.sha,
      filesCount: treeItems.length,
      owner,
      repoName,
    });
  } catch (err: any) {
    console.error('GitHub push error:', err);
    res.status(500).json({ error: err.message || 'Server error pushing to GitHub' });
  }
});

// Project Synchronization & Shared Library Endpoints
app.post('/api/projects/sync', (req, res) => {
  const { project } = req.body;
  if (!project || !project.id) {
    res.status(400).json({ error: 'Project is required' });
    return;
  }
  sharedProjectsStore[project.id] = project;
  sharedProjectsStore['latest'] = project;
  res.json({ success: true, id: project.id, filesCount: project.files?.length || 0 });
});

app.get('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const project = sharedProjectsStore[id] || (id === 'latest' ? sharedProjectsStore['latest'] : null);
  if (!project) {
    res.status(404).json({ error: 'Project not found in shared cache' });
    return;
  }
  res.json({ project });
});

// Guest AI Patch Submissions API
app.post('/api/bridge/submit', (req, res) => {
  const { projectId, author, comment, filePath, newContent } = req.body;
  if (!projectId || !filePath || !newContent) {
    res.status(400).json({ error: 'Missing required submission fields' });
    return;
  }

  const submission = {
    id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    author: (author || 'External AI / Contributor').trim(),
    comment: (comment || 'Source code contribution').trim(),
    filePath,
    newContent,
    submittedAt: Date.now(),
    status: 'pending' as const,
  };

  if (!guestSubmissionsStore[projectId]) {
    guestSubmissionsStore[projectId] = [];
  }
  guestSubmissionsStore[projectId].push(submission);

  res.json({ success: true, submission });
});

app.get('/api/bridge/submissions/:projectId', (req, res) => {
  const { projectId } = req.params;
  const list = guestSubmissionsStore[projectId] || [];
  res.json({ submissions: list });
});

// Plain Text / Markdown Raw Library endpoint for Claude, ChatGPT, and AI web crawlers
app.get(['/library/:id/raw', '/api/library/:id/raw', '/raw/:id', '/library/raw'], (req, res) => {
  const id = req.params.id || 'latest';
  const project = sharedProjectsStore[id] || sharedProjectsStore['latest'];

  if (!project) {
    res.type('text/plain').send(`# CodeSquad Hub - Shared Repository Library
Status: No project currently active in memory.
Please open the studio at ${req.protocol}://${req.get('host')} to select or create a project.
`);
    return;
  }

  let output = `# ${project.name} (${project.type.toUpperCase()})\n`;
  output += `Description: ${project.description || 'No description provided'}\n`;
  output += `Total Files: ${project.files?.length || 0}\n`;
  output += `Last Modified: ${new Date(project.updatedAt || Date.now()).toISOString()}\n\n`;
  output += `=====================================================\n`;
  output += `AI INSTRUCTIONS FOR EXTERNAL AGENTS (CLAUDE / CHATGPT):\n`;
  output += `1. Review the files and code structures below.\n`;
  output += `2. If you want to submit a code patch, generate updated code with exact file path.\n`;
  output += `=====================================================\n\n`;

  project.files?.forEach((file: any, index: number) => {
    output += `\n### FILE [${index + 1}/${project.files.length}]: ${file.path}\n`;
    output += `Language: ${file.language || 'text'}\n`;
    output += `\`\`\`${file.language || ''}\n`;
    output += `${file.content}\n`;
    output += `\`\`\`\n`;
    output += `-----------------------------------------------------\n`;
  });

  res.type('text/plain; charset=utf-8').send(output);
});

// Server-Rendered HTML Library View (Never shows white screen even without JavaScript)
app.get(['/library', '/library/:id'], (req, res) => {
  const id = req.params.id || 'latest';
  const project = sharedProjectsStore[id] || sharedProjectsStore['latest'];

  if (!project) {
    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeSquad Hub - Repository Library</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; margin: 0; padding: 2rem; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 2rem; max-width: 550px; text-align: center; }
    h1 { font-size: 1.25rem; color: #818cf8; margin-bottom: 0.5rem; }
    p { font-size: 0.9rem; color: #94a3b8; line-height: 1.5; }
    a { display: inline-block; margin-top: 1.5rem; padding: 0.6rem 1.2rem; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>CodeSquad Repository Library</h1>
    <p>No project repository is loaded yet in the active session. Please open the main AI Studio workspace to initialize or select a project.</p>
    <a href="/">Open AI Studio Workspace</a>
  </div>
</body>
</html>`);
    return;
  }

  // Generate clean server-side rendered HTML
  const filesListHtml = (project.files || [])
    .map(
      (f: any, i: number) => `
    <div style="margin-bottom: 1.5rem; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; background: #090d16;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; background: #0f172a; border-bottom: 1px solid #1e293b;">
        <span style="font-family: monospace; font-size: 0.85rem; color: #38bdf8; font-weight: 600;">📁 ${escapeHtml(f.path)}</span>
        <span style="font-size: 0.75rem; text-transform: uppercase; background: #1e293b; padding: 0.2rem 0.5rem; border-radius: 4px; color: #94a3b8;">${f.language || 'text'}</span>
      </div>
      <pre style="margin: 0; padding: 1rem; overflow-x: auto; font-family: monospace; font-size: 0.8rem; line-height: 1.5; color: #a7f3d0; background: #020617;"><code>${escapeHtml(f.content)}</code></pre>
    </div>`
    )
    .join('\n');

  const filesOptionsHtml = (project.files || [])
    .map((f: any) => `<option value="${escapeHtml(f.path)}">${escapeHtml(f.path)}</option>`)
    .join('\n');

  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.name)} - Code Library & AI Bridge</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f1f5f9; margin: 0; padding: 1.5rem; }
    .container { max-width: 960px; margin: 0 auto; }
    .header { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .badge { display: inline-block; font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 9999px; background: #064e3b; color: #34d399; border: 1px solid #059669; }
    h1 { font-size: 1.4rem; margin: 0.5rem 0 0.25rem; color: #f8fafc; }
    .desc { color: #94a3b8; font-size: 0.875rem; margin: 0; }
    .links-bar { margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; text-decoration: none; cursor: pointer; border: none; }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-secondary { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; }
    .btn-success { background: #059669; color: white; }
    .form-card { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; font-size: 0.8rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.35rem; }
    input, select, textarea { width: 100%; padding: 0.6rem; background: #020617; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-family: inherit; font-size: 0.85rem; }
    textarea { font-family: monospace; }
    .section-title { font-size: 1.1rem; color: #e2e8f0; margin: 1.5rem 0 1rem; display: flex; align-items: center; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="container">
    
    <div class="header">
      <span class="badge">${escapeHtml(project.type.toUpperCase())}</span>
      <h1>${escapeHtml(project.name)}</h1>
      <p class="desc">${escapeHtml(project.description || 'Android & Web Code Repository')}</p>

      <div class="links-bar">
        <a href="/" class="btn btn-primary">⚡ Open Interactive Studio</a>
        <a href="/library/${escapeHtml(project.id)}/raw" target="_blank" class="btn btn-secondary">📄 View Raw Markdown / Crawler Text</a>
      </div>
    </div>

    <!-- Direct Code Patch Form for External Mobile AIs & Users -->
    <div class="form-card">
      <h3 style="margin-top:0; color:#38bdf8; font-size: 1rem;">🤖 Submit Code Patch / External AI Advice</h3>
      <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 1rem;">If you or Claude/ChatGPT generated a code fix, submit it directly to the studio project here:</p>
      
      <form action="/api/bridge/submit" method="POST" id="patchForm">
        <input type="hidden" name="projectId" value="${escapeHtml(project.id)}">
        
        <div class="form-group">
          <label>Target File to Edit:</label>
          <select name="filePath" required>
            ${filesOptionsHtml}
          </select>
        </div>

        <div class="form-group">
          <label>Author / AI Name:</label>
          <input type="text" name="author" value="Claude (Mobile)" placeholder="e.g. Claude 3.5 Sonnet / ChatGPT" required>
        </div>

        <div class="form-group">
          <label>Summary of Changes / Advice:</label>
          <input type="text" name="comment" placeholder="e.g. Added null safety and resolved Compose state glitch" required>
        </div>

        <div class="form-group">
          <label>Updated Code:</label>
          <textarea name="newContent" rows="10" placeholder="Paste full source code here..." required></textarea>
        </div>

        <button type="submit" class="btn btn-success" style="width: 100%; justify-content: center; padding: 0.75rem;">
          🚀 Submit Patch to Main Project Workspace
        </button>
      </form>
    </div>

    <!-- All Repository Files -->
    <div class="section-title">
      <span>📂 Project Repository Files (${project.files?.length || 0})</span>
      <a href="/library/${escapeHtml(project.id)}/raw" style="font-size: 0.8rem; color: #818cf8; text-decoration: none;">Raw Text Format ↗</a>
    </div>

    ${filesListHtml}

  </div>
</body>
</html>`);
});

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Active E2B Sandbox micro-VM tracking
const activeE2BSandboxes: Record<string, any> = {};

// E2B Sandbox Endpoints
app.get('/api/e2b/status', (req, res) => {
  res.json({
    hasApiKey: Boolean(process.env.E2B_API_KEY),
    activeCount: Object.keys(activeE2BSandboxes).length,
  });
});

app.post('/api/e2b/spawn', async (req, res) => {
  try {
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      res.status(400).json({
        error: 'E2B_API_KEY is not configured in your AI Studio environment settings.',
        hasApiKey: false,
      });
      return;
    }

    const { project } = req.body;
    if (!project || !project.files) {
      res.status(400).json({ error: 'Project data is required' });
      return;
    }

    // Lazy load @e2b/code-interpreter
    const { Sandbox } = await import('@e2b/code-interpreter');
    const sandbox = await Sandbox.create({
      apiKey,
      timeoutMs: 600000, // 10 minutes live session
    });

    // Write all project files to the E2B Cloud Micro-VM
    for (const file of project.files) {
      try {
        await sandbox.files.write(file.path, file.content);
      } catch (writeErr) {
        console.warn(`[E2B] Warning: file write skipped for ${file.path}:`, writeErr);
      }
    }

    // Write a robust Python REST API server with full CORS, GET (read file / tree), PUT/POST (write/edit file), DELETE, and JSON endpoints
    const apiServerScript = `
import http.server
import socketserver
import os
import json
import urllib.parse

PORT = 8080

class RestFileHandler(http.server.BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path).lstrip('/')
        
        # Root health / file tree overview
        if not path or path == 'api/tree' or path == 'tree':
            files_list = []
            for root, dirs, files in os.walk('.'):
                if '.git' in root or '__pycache__' in root or '.cache' in root:
                    continue
                for f in files:
                    if f == 'server.py':
                        continue
                    full_p = os.path.relpath(os.path.join(root, f), '.')
                    files_list.append(full_p)
            
            res_data = {
                "status": "ready",
                "message": "E2B REST File API Active with Read (GET) & Write (PUT/POST)",
                "totalFiles": len(files_list),
                "files": sorted(files_list),
                "instructions": "Use GET /<filepath> to read. Use PUT /<filepath> or POST /<filepath> with body to write/edit."
            }
            body = json.dumps(res_data, indent=2).encode('utf-8')
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Check if requested path is a real file
        clean_path = os.path.normpath(path)
        if clean_path.startswith('..'):
            self.send_error(403, "Access Denied")
            return

        if os.path.isfile(clean_path):
            try:
                with open(clean_path, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self._send_cors_headers()
                
                # Content type guessing
                if clean_path.endswith('.json'):
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                elif clean_path.endswith('.html'):
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                elif clean_path.endswith('.md') or clean_path.endswith('.txt'):
                    self.send_header('Content-Type', 'text/plain; charset=utf-8')
                elif clean_path.endswith('.kt') or clean_path.endswith('.java') or clean_path.endswith('.ts') or clean_path.endswith('.tsx') or clean_path.endswith('.js') or clean_path.endswith('.gradle') or clean_path.endswith('.xml'):
                    self.send_header('Content-Type', 'text/plain; charset=utf-8')
                else:
                    self.send_header('Content-Type', 'application/octet-stream')
                
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            except Exception as e:
                self.send_error(500, f"Error reading file: {str(e)}")
                return
        elif os.path.isdir(clean_path):
            # Return list of files in directory
            dir_files = [os.path.join(clean_path, f) for f in os.listdir(clean_path)]
            body = json.dumps({"directory": clean_path, "contents": dir_files}, indent=2).encode('utf-8')
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        else:
            self.send_error(404, f"File '{clean_path}' not found")
            return

    def do_PUT(self):
        self._handle_write()

    def do_POST(self):
        self._handle_write()

    def _handle_write(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path).lstrip('/')
        if not path:
            self.send_error(400, "File path is required in URL, e.g. PUT /src/index.ts")
            return

        clean_path = os.path.normpath(path)
        if clean_path.startswith('..'):
            self.send_error(403, "Access Denied")
            return

        content_len = int(self.headers.get('Content-Length', 0))
        if content_len == 0:
            post_body = b""
        else:
            post_body = self.rfile.read(content_len)

        # Check if JSON payload with 'content' or direct text
        content_to_write = post_body
        content_type = self.headers.get('Content-Type', '')
        if 'application/json' in content_type:
            try:
                json_data = json.loads(post_body.decode('utf-8'))
                if 'content' in json_data and isinstance(json_data['content'], str):
                    content_to_write = json_data['content'].encode('utf-8')
            except Exception:
                pass

        try:
            os.makedirs(os.path.dirname(clean_path), exist_ok=True) if os.path.dirname(clean_path) else None
            with open(clean_path, 'wb') as f:
                f.write(content_to_write)

            res = {
                "success": True,
                "action": "saved",
                "path": clean_path,
                "bytesWritten": len(content_to_write),
                "message": f"File '{clean_path}' saved successfully."
            }
            body = json.dumps(res, indent=2).encode('utf-8')
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_error(500, f"Failed to write file: {str(e)}")

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path).lstrip('/')
        clean_path = os.path.normpath(path)
        if clean_path.startswith('..'):
            self.send_error(403, "Access Denied")
            return

        if os.path.exists(clean_path):
            try:
                if os.path.isfile(clean_path):
                    os.remove(clean_path)
                elif os.path.isdir(clean_path):
                    import shutil
                    shutil.rmtree(clean_path)
                res = {"success": True, "action": "deleted", "path": clean_path}
                body = json.dumps(res).encode('utf-8')
                self.send_response(200)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                self.send_error(500, f"Failed to delete: {str(e)}")
        else:
            self.send_error(404, f"File '{clean_path}' not found")

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

with ThreadingHTTPServer(("", PORT), RestFileHandler) as httpd:
    print(f"E2B Read/Write REST API Server running on port {PORT}")
    httpd.serve_forever()
`;

    // Write server.py to Sandbox
    try {
      await sandbox.files.write('server.py', apiServerScript);
    } catch (e) {
      console.warn('[E2B] server.py write warning:', e);
    }

    // Kill any older process on port 8080 and launch the new REST API server in background
    try {
      await sandbox.commands.run('fuser -k 8080/tcp || true');
      await sandbox.commands.run('nohup python3 server.py > /tmp/server.log 2>&1 &', { background: true });
    } catch {
      // background task started
    }

    const sandboxId = sandbox.sandboxId;
    let publicHost = '';
    try {
      publicHost = (sandbox as any).getHost?.(8080) || (sandbox as any).getHostname?.(8080) || `${sandboxId}.e2b.dev`;
    } catch {
      publicHost = `${sandboxId}.e2b.dev`;
    }

    activeE2BSandboxes[project.id] = {
      sandbox,
      sandboxId,
      publicHost,
      spawnedAt: Date.now(),
      filesCount: project.files.length,
    };

    res.json({
      success: true,
      sandboxId,
      publicUrl: publicHost.startsWith('http') ? publicHost : `https://${publicHost}`,
      filesCount: project.files.length,
      message: 'E2B Cloud Micro-VM REST API running! Full GET (read) and PUT (write/edit) enabled with CORS.',
    });
  } catch (err: any) {
    console.error('E2B Sandbox Spawn Error:', err);
    res.status(500).json({
      error: err?.message || 'Failed to spawn E2B Cloud Sandbox',
    });
  }
});

// Pull edited files back from E2B Sandbox into CodeSquad Workspace
app.post('/api/e2b/pull-changes', async (req, res) => {
  try {
    const { projectId } = req.body;
    const instance = activeE2BSandboxes[projectId];
    if (!instance || !instance.sandbox) {
      res.status(404).json({ error: 'Active E2B Sandbox not found. Please spawn one first.' });
      return;
    }

    // Find all files in sandbox excluding server.py and hidden dirs
    const findRes = await instance.sandbox.commands.run("find . -type f -not -path '*/.*' -not -name 'server.py' -not -name '*.pyc'");
    const rawPaths = (findRes.stdout || '').split('\n').map((p: string) => p.trim()).filter((p: string) => p && p !== './server.py');

    const files: Array<{
      id: string;
      name: string;
      path: string;
      content: string;
      language: string;
      lastModified: number;
    }> = [];

    for (const rawPath of rawPaths) {
      const cleanPath = rawPath.replace(/^\.\//, '');
      try {
        const content = await instance.sandbox.files.read(cleanPath);
        const fileName = cleanPath.split('/').pop() || cleanPath;

        let language = 'text';
        if (fileName.endsWith('.kt')) language = 'kotlin';
        else if (fileName.endsWith('.java')) language = 'java';
        else if (fileName.endsWith('.xml')) language = 'xml';
        else if (fileName.endsWith('.gradle') || fileName.endsWith('.kts')) language = 'groovy';
        else if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) language = 'typescript';
        else if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) language = 'javascript';
        else if (fileName.endsWith('.json')) language = 'json';
        else if (fileName.endsWith('.md')) language = 'markdown';

        files.push({
          id: 'e2b-file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: fileName,
          path: cleanPath,
          content,
          language,
          lastModified: Date.now(),
        });
      } catch (readErr) {
        console.warn(`[E2B] Could not read file ${cleanPath}:`, readErr);
      }
    }

    res.json({
      success: true,
      files,
      filesCount: files.length,
      pulledAt: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to pull changes from E2B' });
  }
});

app.post('/api/e2b/execute', async (req, res) => {
  try {
    const { projectId, command } = req.body;
    const instance = activeE2BSandboxes[projectId];
    if (!instance || !instance.sandbox) {
      res.status(404).json({ error: 'Active E2B Sandbox not found. Please spawn one first.' });
      return;
    }

    const result = await instance.sandbox.commands.run(command);
    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Execution error' });
  }
});

// Start the server with Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
