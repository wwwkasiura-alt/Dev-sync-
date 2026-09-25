import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Share2, 
  Copy, 
  Check, 
  Code2, 
  ExternalLink, 
  Send, 
  FileCode, 
  GitPullRequest, 
  Sparkles,
  ClipboardPaste,
  ShieldCheck,
  AlertCircle,
  Server,
  Terminal,
  Cpu,
  Loader2,
  RefreshCw,
  DownloadCloud,
  CheckCircle2
} from 'lucide-react';
import { Project, GuestSubmission } from '../types';

interface MobileAIBridgeProps {
  project: Project;
  submissions: GuestSubmission[];
  onSubmitPatch: (patch: {
    author: string;
    comment: string;
    filePath: string;
    newContent: string;
  }) => void;
  onMergeSubmission: (sub: GuestSubmission) => void;
  onDismissSubmission: (subId: string) => void;
  onUpdateProject?: (updatedProject: Project) => void;
}

export const MobileAIBridge: React.FC<MobileAIBridgeProps> = ({
  project,
  submissions,
  onSubmitPatch,
  onMergeSubmission,
  onDismissSubmission,
  onUpdateProject,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedAllCode, setCopiedAllCode] = useState(false);
  const [copiedE2BUrl, setCopiedE2BUrl] = useState(false);
  const [copiedCurlGuide, setCopiedCurlGuide] = useState(false);

  // E2B Cloud Micro-VM Sandbox state
  const [isSpawningE2B, setIsSpawningE2B] = useState(false);
  const [isPullingE2B, setIsPullingE2B] = useState(false);
  const [pullSuccessMsg, setPullSuccessMsg] = useState<string | null>(null);
  const [e2bResult, setE2bResult] = useState<{
    sandboxId: string;
    publicUrl: string;
    filesCount: number;
    message?: string;
  } | null>(null);
  const [e2bError, setE2bError] = useState<string | null>(null);
  const [hasE2BKey, setHasE2BKey] = useState<boolean | null>(null);
  
  // Contributor form state (what external AI or mobile user fills out)
  const [selectedFilePath, setSelectedFilePath] = useState(project.files?.[0]?.path || '');
  const [authorName, setAuthorName] = useState('Free Android AI (Mobile)');
  const [aiAdvice, setAiAdvice] = useState('');
  const [editedCode, setEditedCode] = useState('');
  const [submittedStatus, setSubmittedStatus] = useState(false);

  // Smart Paste parser state
  const [pasteBuffer, setPasteBuffer] = useState('');
  const [parsedFileName, setParsedFileName] = useState('');
  const [parsedCode, setParsedCode] = useState('');

  // Check E2B server status on mount
  useEffect(() => {
    fetch('/api/e2b/status')
      .then((res) => res.json())
      .then((data) => setHasE2BKey(Boolean(data.hasApiKey)))
      .catch(() => setHasE2BKey(false));
  }, []);

  // Sync selected file content into editor when changed
  useEffect(() => {
    const file = project.files.find((f) => f.path === selectedFilePath);
    if (file) {
      setEditedCode(file.content);
    }
  }, [selectedFilePath, project.files]);

  const handleSpawnE2B = async () => {
    setIsSpawningE2B(true);
    setE2bError(null);
    try {
      const res = await fetch('/api/e2b/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setE2bError(data.error || 'Failed to spawn E2B Cloud Sandbox');
      } else {
        setE2bResult(data);
      }
    } catch (err: any) {
      setE2bError(err.message || 'Network error connecting to E2B API');
    } finally {
      setIsSpawningE2B(false);
    }
  };

  const handlePullFromE2B = async () => {
    setIsPullingE2B(true);
    setPullSuccessMsg(null);
    setE2bError(null);
    try {
      const res = await fetch('/api/e2b/pull-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to pull changes from E2B');
      }

      if (data.files && data.files.length > 0 && onUpdateProject) {
        onUpdateProject({
          ...project,
          files: data.files,
          updatedAt: Date.now(),
        });
        setPullSuccessMsg(`Successfully synced ${data.filesCount} updated files from E2B into your studio workspace!`);
      }
    } catch (err: any) {
      setE2bError(err.message || 'Error pulling changes from E2B Sandbox');
    } finally {
      setIsPullingE2B(false);
    }
  };

  const handleCopyE2BUrl = () => {
    if (!e2bResult?.publicUrl) return;
    navigator.clipboard.writeText(e2bResult.publicUrl);
    setCopiedE2BUrl(true);
    setTimeout(() => setCopiedE2BUrl(false), 2000);
  };

  const handleCopyCurlGuide = () => {
    const url = e2bResult?.publicUrl || 'https://<E2B_URL>';
    const guide = `# 1. Read files (GET)
curl -s ${url}/api/tree
curl -s ${url}/src/index.ts

# 2. Write / Edit files (PUT or POST)
curl -X PUT "${url}/src/index.ts" \\
  -H "Content-Type: text/plain" \\
  --data-raw 'console.log("Updated from Claude!");'
`;
    navigator.clipboard.writeText(guide);
    setCopiedCurlGuide(true);
    setTimeout(() => setCopiedCurlGuide(false), 2000);
  };

  // Derive public origin (ais-pre) so external bots don't hit developer IAM cookie check
  const publicOrigin = window.location.origin.replace('ais-dev-', 'ais-pre-');
  const libraryUrl = `${publicOrigin}/library/${project.id}`;
  const rawUrl = `${publicOrigin}/library/${project.id}/raw`;

  const mobileAIPrompt = `Hey! I want you to review and inspect my code library for "${project.name}" (${project.type === 'android-apk' ? 'Android Kotlin APK' : 'Web Project'}).
Please check this public URL:
${rawUrl}

Read all Kotlin files, AndroidManifest, and Gradle configs. You can also submit code edits or advice directly on that page!`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(libraryUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(mobileAIPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyAllCode = () => {
    let output = `# PROJECT: ${project.name} (${project.type.toUpperCase()})\n`;
    output += `Description: ${project.description || 'Android & Web Code Repository'}\n\n`;
    project.files.forEach((f) => {
      output += `### FILE: ${f.path}\n\`\`\`${f.language || ''}\n${f.content}\n\`\`\`\n\n`;
    });
    navigator.clipboard.writeText(output);
    setCopiedAllCode(true);
    setTimeout(() => setCopiedAllCode(false), 2000);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFilePath || !editedCode) return;

    onSubmitPatch({
      author: authorName.trim() || 'Android Free AI',
      comment: aiAdvice.trim() || 'Updated source code & optimizations',
      filePath: selectedFilePath,
      newContent: editedCode
    });

    setSubmittedStatus(true);
    setTimeout(() => setSubmittedStatus(false), 4000);
  };

  // Smart paste parser: extracts filename and code blocks from raw chat text
  const handleSmartParse = () => {
    if (!pasteBuffer.trim()) return;

    // Look for ```kotlin ... ``` or ```xml ... ``` or code blocks
    const codeBlockMatch = pasteBuffer.match(/```([a-z]*)\s*([\s\S]*?)```/i);
    let extractedCode = '';
    if (codeBlockMatch) {
      extractedCode = codeBlockMatch[2].trim();
    } else {
      extractedCode = pasteBuffer.trim();
    }

    // Try to detect file
    let detectedPath = project.files[0]?.path || '';
    if (pasteBuffer.includes('MainActivity') || extractedCode.includes('MainActivity') || extractedCode.includes('ComponentActivity')) {
      detectedPath = project.files.find((f) => f.path.includes('MainActivity'))?.path || detectedPath;
    } else if (pasteBuffer.includes('AndroidManifest') || extractedCode.includes('<manifest')) {
      detectedPath = project.files.find((f) => f.path.includes('AndroidManifest'))?.path || detectedPath;
    } else if (pasteBuffer.includes('build.gradle') || extractedCode.includes('compileSdk')) {
      detectedPath = project.files.find((f) => f.path.includes('build.gradle'))?.path || detectedPath;
    }

    setParsedFileName(detectedPath);
    setParsedCode(extractedCode);
    setSelectedFilePath(detectedPath);
    setEditedCode(extractedCode);
    setAiAdvice('Imported from mobile AI chat response');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-200 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Banner Explanation */}
        <div className="rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 p-5 sm:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h1 className="text-base sm:text-lg font-bold text-slate-100">
                  Mobile AI Web Bridge (Direct URL Access)
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Aapke Android phone mein jo bhi free AI apps hain (ChatGPT, Claude, Gemini, Perplexity), aap unhe yeh public URL de sakte hain. AI bina kisi API key ke poora project dekh sakta hai aur direct code edit kar sakta hai!
              </p>
            </div>

            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all shrink-0 self-start sm:self-center"
            >
              {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedUrl ? 'URL Copied!' : 'Copy Web Bridge URL'}</span>
            </button>
          </div>

          {/* Quick link display */}
          <div className="mt-4 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 font-mono text-xs text-emerald-300 flex items-center justify-between overflow-x-auto gap-3">
            <span className="truncate">{libraryUrl}</span>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={rawUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                Raw Markdown ↗
              </a>
              <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Server Rendered
              </span>
            </div>
          </div>
        </div>

        {/* 1-Click Complete Code Copy Card */}
        <div className="rounded-xl bg-indigo-950/30 border border-indigo-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-200 text-sm font-bold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Direct 1-Click Code Context for Mobile AI Apps</span>
            </div>
            <p className="text-xs text-slate-400">
              Agar Claude ya ChatGPT mobile app web links load nahi kar paa rahi, toh 1-click mein poore project ka code copy karein aur direct AI chat mein paste kar dein.
            </p>
          </div>
          <button
            onClick={handleCopyAllCode}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shrink-0 shadow transition-colors"
          >
            {copiedAllCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAllCode ? 'Copied All Project Code!' : 'Copy All Code to Clipboard'}</span>
          </button>
        </div>

        {/* E2B Dedicated Cloud Micro-VM Sandbox Section (Zero Cookie / 15000+ Lines) */}
        <div className="rounded-xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-slate-900 border border-cyan-500/30 p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  E2B Dedicated Cloud Sandbox (No Google Cookies / 15,000+ Lines)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                  Public Micro-VM
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Agar project bohot bada hai (15,000+ lines), toh yeh 1-click mein ek alag **E2B Linux Cloud Micro-VM** create karta hai. Saari files wahan write ho jati hain aur ek public link milta hai jo Claude ya koi bhi tool bina Google login ke direct inspect kar sakta hai!
              </p>
            </div>

            <button
              onClick={handleSpawnE2B}
              disabled={isSpawningE2B}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold shadow transition-all shrink-0 self-start sm:self-center"
            >
              {isSpawningE2B ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
                  <span>Spawning E2B VM...</span>
                </>
              ) : (
                <>
                  <Server className="w-4 h-4" />
                  <span>Spawn E2B Cloud Sandbox</span>
                </>
              )}
            </button>
          </div>

          {e2bError && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/30 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">E2B Sandbox Error: </span>
                {e2bError}
                {!hasE2BKey && (
                  <p className="mt-1 text-[11px] text-red-300">
                    Aapke workspace Settings / Secrets panel mein <code>E2B_API_KEY</code> set hona chahiye.
                  </p>
                )}
              </div>
            </div>
          )}

          {pullSuccessMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{pullSuccessMsg}</span>
            </div>
          )}

          {e2bResult && (
            <div className="p-4 rounded-lg bg-cyan-950/30 border border-cyan-500/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Live Sandbox Active: {e2bResult.sandboxId} ({e2bResult.filesCount} files synced)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePullFromE2B}
                    disabled={isPullingE2B}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
                    title="Pull files edited by Claude back into your studio workspace"
                  >
                    <DownloadCloud className={`w-3.5 h-3.5 ${isPullingE2B ? 'animate-bounce' : ''}`} />
                    <span>{isPullingE2B ? 'Syncing...' : 'Pull Claude Edits to Studio'}</span>
                  </button>

                  <button
                    onClick={handleCopyE2BUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700/60 text-xs font-semibold"
                  >
                    {copiedE2BUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedE2BUrl ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={e2bResult.publicUrl}
                  className="flex-1 p-2 rounded bg-slate-950 border border-cyan-800/80 font-mono text-xs text-cyan-200 select-all"
                />
                <a
                  href={e2bResult.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 font-semibold border border-slate-700 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open API Tree</span>
                </a>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 font-mono flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Claude Read & Edit Commands (GET / PUT with CORS):</span>
                  </span>
                  <button
                    onClick={handleCopyCurlGuide}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
                  >
                    {copiedCurlGuide ? 'Copied Commands!' : 'Copy cURL Examples'}
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-emerald-300 bg-slate-900/90 p-2.5 rounded border border-slate-800 overflow-x-auto">
{`# 1. Claude reads file list or single file:
GET ${e2bResult.publicUrl}/api/tree
GET ${e2bResult.publicUrl}/src/index.ts

# 2. Claude edits / writes any file directly (PUT / POST):
curl -X PUT "${e2bResult.publicUrl}/src/index.ts" \\
  -H "Content-Type: text/plain" \\
  --data-raw 'console.log("Updated from Claude!");'`}
                </pre>
              </div>

              <p className="text-[11px] text-slate-400">
                🚀 Yeh REST API URL 100% CORS enabled hai. Claude ya kisi bhi external AI ko yeh URL do, woh directly GET se padhega aur PUT se files edit karega! Jab Claude edit karle, toh upar **"Pull Claude Edits to Studio"** dabayein.
              </p>
            </div>
          )}
        </div>


        {/* 2-Column Section: Mobile AI Prompt Generator & Smart Paste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: 1-Click Prompt to Send to your Android AI App */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Step 1: Copy Prompt for Free AI App
                </h2>
              </div>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Yeh prompt copy karke apne phone ke kisi bhi free AI app (ChatGPT/Claude/Gemini) mein paste karein:
            </p>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 font-mono text-[11px] text-slate-300 leading-relaxed select-all whitespace-pre-wrap">
              {mobileAIPrompt}
            </div>
          </div>

          {/* Card 2: Smart Chat Response Importer */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Step 2: Smart AI Code Importer
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Agar aapke mobile AI ne chat mein naya code likha hai, toh uska message yahan paste karein. System file name aur code automatically extract kar lega!
            </p>

            <textarea
              value={pasteBuffer}
              onChange={(e) => setPasteBuffer(e.target.value)}
              placeholder="Paste mobile AI response here (e.g. 'Here is the updated MainActivity.kt: ```kotlin ... ```')..."
              rows={3}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center justify-between">
              <button
                onClick={handleSmartParse}
                disabled={!pasteBuffer.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Detect & Load Code</span>
              </button>
              {parsedFileName && (
                <span className="text-[11px] text-emerald-400 font-mono truncate max-w-[200px]">
                  ✓ Matched {parsedFileName.split('/').pop()}
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Interactive Contributor Portal Form (Simulates what the Mobile AI submits) */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Direct AI Code Editor & Advice Web Portal
                </h3>
                <span className="text-xs text-slate-400">
                  Yeh form us URL par live rehta hai jahan mobile AI direct code submit karta hai
                </span>
              </div>
            </div>

            {submittedStatus && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-medium animate-pulse">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Patch Submitted to Project!</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target File to Edit:
                </label>
                <select
                  value={selectedFilePath}
                  onChange={(e) => setSelectedFilePath(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {project.files.map((f) => (
                    <option key={f.id} value={f.path}>
                      {f.path} ({f.language})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contributing AI / Agent Name:
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Free ChatGPT Android, Claude Mobile, DeepSeek"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                AI Advice / Summary of Changes:
              </label>
              <input
                type="text"
                value={aiAdvice}
                onChange={(e) => setAiAdvice(e.target.value)}
                placeholder="e.g. Optimized note list performance and added responsive floating button..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Updated Source Code:
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {editedCode.split('\n').length} lines
                </span>
              </div>
              <textarea
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                rows={10}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-indigo-500 select-text"
                spellCheck={false}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Code Patch to Project</span>
              </button>
            </div>
          </form>
        </div>

        {/* Pending Submissions / Pull Requests from External Mobile AIs */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Incoming AI Patches & Submissions ({submissions.length})
              </h3>
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs rounded-lg border border-dashed border-slate-800">
              No external patches pending. Use the form above or share the URL with your Android AI app to receive automated code submissions!
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-100">{sub.author}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                        {sub.filePath}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(sub.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{sub.comment}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onMergeSubmission(sub)}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Merge & Apply Code
                    </button>
                    <button
                      onClick={() => onDismissSubmission(sub.id)}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
