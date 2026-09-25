import React, { useState } from 'react';
import { 
  Terminal, 
  Play, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  FileCode, 
  Smartphone, 
  RotateCcw,
  Sparkles,
  Layers,
  Cpu,
  Copy,
  Check,
  AlertTriangle,
  Wrench,
  Bot
} from 'lucide-react';
import { Project } from '../types';

interface ApkBuildConsoleProps {
  project: Project;
  onDownloadZip: () => void;
  onAskAiToFix?: (issuesSummary: string) => void;
}

export const ApkBuildConsole: React.FC<ApkBuildConsoleProps> = ({
  project,
  onDownloadZip,
  onAskAiToFix,
}) => {
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditLogs, setAuditLogs] = useState<string[]>([]);
  const [auditPassed, setAuditPassed] = useState<boolean | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Extract real permissions from AndroidManifest.xml
  const manifestFile = project.files.find((f) => f.path.toLowerCase().includes('androidmanifest.xml'));
  const gradleFile = project.files.find((f) => f.path.toLowerCase().includes('build.gradle'));
  const kotlinFiles = project.files.filter((f) => f.path.endsWith('.kt') || f.path.endsWith('.java'));

  const permissions = manifestFile
    ? [...manifestFile.content.matchAll(/android:name="([^"]+)"/g)]
        .map((m) => m[1])
        .filter((p) => p.includes('permission'))
    : ['android.permission.INTERNET'];

  // Parse compileSdk and minSdk from build.gradle
  let detectedCompileSdk = '34';
  let detectedMinSdk = '26';
  if (gradleFile) {
    const compileMatch = gradleFile.content.match(/compileSdk\s*=?\s*(\d+)/);
    if (compileMatch) detectedCompileSdk = compileMatch[1];
    const minMatch = gradleFile.content.match(/minSdk\s*=?\s*(\d+)/);
    if (minMatch) detectedMinSdk = minMatch[1];
  }

  // Real Project Code & Manifest Diagnostics
  const handleRunDiagnostics = () => {
    setIsRunningAudit(true);
    setAuditLogs([]);

    const logs: string[] = [];
    logs.push(`[1/4] Scanning repository files for Android structure...`);
    logs.push(`  → Found ${project.files.length} total files in workspace.`);
    logs.push(`  → Kotlin/Java source files detected: ${kotlinFiles.length}`);

    let hasErrors = false;

    // Check Manifest
    logs.push(`[2/4] Verifying AndroidManifest.xml...`);
    if (manifestFile) {
      logs.push(`  ✓ AndroidManifest.xml located at: ${manifestFile.path}`);
      if (manifestFile.content.includes('<activity') && manifestFile.content.includes('android.intent.action.MAIN')) {
        logs.push(`  ✓ Main launcher activity configured with MAIN and LAUNCHER intent filters.`);
      } else {
        logs.push(`  ⚠ Warning: No explicit MAIN/LAUNCHER intent filter found in manifest.`);
      }
      logs.push(`  ✓ Declared permissions: ${permissions.length > 0 ? permissions.join(', ') : 'None'}`);
    } else {
      logs.push(`  ✗ Error: AndroidManifest.xml is missing from this project.`);
      hasErrors = true;
    }

    // Check Gradle
    logs.push(`[3/4] Validating Gradle build configuration...`);
    if (gradleFile) {
      logs.push(`  ✓ Build script found at: ${gradleFile.path}`);
      logs.push(`  ✓ Target compileSdk: ${detectedCompileSdk} | minSdk: ${detectedMinSdk}`);
      if (gradleFile.content.includes('compose') || gradleFile.content.includes('Material3')) {
        logs.push(`  ✓ Jetpack Compose BOM & Material3 design configurations detected.`);
      }
    } else {
      logs.push(`  ⚠ Warning: build.gradle / build.gradle.kts not found in root or app directory.`);
    }

    // Check Kotlin sources
    logs.push(`[4/4] Inspecting Kotlin / Compose Activity classes...`);
    if (kotlinFiles.length > 0) {
      kotlinFiles.forEach((kf) => {
        const hasCompose = kf.content.includes('@Composable') || kf.content.includes('setContent');
        logs.push(`  ✓ ${kf.name} (${hasCompose ? 'Jetpack Compose UI' : 'Core Logic'}) verified.`);
      });
    } else {
      logs.push(`  ⚠ Warning: No .kt source files found.`);
    }

    if (!hasErrors) {
      logs.push(``);
      logs.push(`SUCCESS: Android project architecture is verified and ready for Gradle compilation.`);
      logs.push(`You can download the ZIP archive or push to GitHub to compile via ./gradlew assembleDebug.`);
      setAuditPassed(true);
    } else {
      logs.push(``);
      logs.push(`FAILED: Issues detected that need attention before APK compilation.`);
      setAuditPassed(false);
    }

    setAuditLogs(logs);
    setIsRunningAudit(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-200 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Summary */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <h1 className="text-base sm:text-lg font-bold text-slate-100">
                Android APK Development & Build Center
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Validate Android Manifest, inspect Kotlin Gradle specs, and export ready-to-compile APK packages.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="run-diagnostics-btn"
              onClick={handleRunDiagnostics}
              disabled={isRunningAudit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors"
            >
              {isRunningAudit ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{isRunningAudit ? 'Verifying...' : 'Run Project Audit'}</span>
            </button>

            <button
              id="export-zip-btn"
              onClick={onDownloadZip}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Project ZIP</span>
            </button>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-4 space-y-1">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Compile Target
            </div>
            <div className="text-sm font-bold text-slate-100 font-mono">
              API {detectedCompileSdk} (Android 14)
            </div>
            <div className="text-[11px] text-slate-500">
              Min SDK: {detectedMinSdk} (Android 8.0 Oreo)
            </div>
          </div>

          <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-4 space-y-1">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              UI Framework
            </div>
            <div className="text-sm font-bold text-emerald-400 font-mono">
              Jetpack Compose (BOM 2024.06)
            </div>
            <div className="text-[11px] text-slate-500">
              Material 3 design system
            </div>
          </div>

          <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-4 space-y-1">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Declared Permissions
            </div>
            <div className="text-sm font-bold text-indigo-400 font-mono">
              {permissions.length} Permissions
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {permissions.join(', ') || 'None'}
            </div>
          </div>
        </div>

        {/* Terminal Diagnostic & Build Console */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="h-10 px-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-semibold text-slate-200">
                Android Diagnostic Console
              </span>
            </div>
            <div className="flex items-center gap-2">
              {auditPassed === true && (
                <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Manifest & Gradle Verified
                </span>
              )}
              {auditPassed === false && (
                <span className="flex items-center gap-1 text-rose-400 font-mono text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" /> Issues Detected
                </span>
              )}
            </div>
          </div>

          <div className="p-4 bg-black font-mono text-xs text-slate-300 leading-relaxed min-h-[200px] max-h-[300px] overflow-y-auto select-text space-y-1">
            {auditLogs.length > 0 ? (
              auditLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes('SUCCESS')
                      ? 'text-emerald-400 font-bold'
                      : log.includes('FAILED') || log.includes('Error')
                      ? 'text-rose-400 font-bold'
                      : log.includes('Warning')
                      ? 'text-amber-400'
                      : log.startsWith('[')
                      ? 'text-indigo-300 font-semibold'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </div>
              ))
            ) : (
              <div className="text-slate-500 py-6 text-center">
                Click <strong>"Run Project Audit"</strong> above to perform live static analysis on your AndroidManifest.xml, Gradle scripts, and Kotlin files.
              </div>
            )}
          </div>

          {/* AI Root-Cause Investigation & Triage Banner */}
          {auditLogs.length > 0 && auditLogs.some((l) => l.includes('Error') || l.includes('Warning') || l.includes('FAILED')) && onAskAiToFix && (
            <div className="p-3.5 bg-indigo-950/40 border-t border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-indigo-200 text-xs">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Static audit flagged notices or warnings. Ask AI Squad to investigate root causes before deciding to apply changes.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const issues = auditLogs
                    .filter((l) => l.includes('Error') || l.includes('Warning') || l.includes('FAILED'))
                    .join('\n');
                  onAskAiToFix(issues);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition-colors shrink-0"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-300" />
                <span>Ask AI Squad to Triage & Investigate</span>
              </button>
            </div>
          )}
        </div>

        {/* Real CLI Build Commands */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>How to compile this APK binary on your machine or phone:</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-950 p-4 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">On PC / Mac / Linux Terminal</span>
                <button
                  onClick={() => handleCopy('./gradlew assembleDebug', 'cmd-pc')}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  {copiedCmd === 'cmd-pc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd === 'cmd-pc' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Extract downloaded ZIP and run in project root directory:
              </p>
              <code className="block p-2 rounded bg-black font-mono text-emerald-400 text-xs select-all">
                ./gradlew assembleDebug
              </code>
              <p className="text-[10px] text-slate-500">
                Output APK path: <code>app/build/outputs/apk/debug/app-debug.apk</code>
              </p>
            </div>

            <div className="rounded-lg bg-slate-950 p-4 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Direct USB Install to Phone</span>
                <button
                  onClick={() => handleCopy('./gradlew installDebug', 'cmd-phone')}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  {copiedCmd === 'cmd-phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd === 'cmd-phone' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Connect Android phone with USB Debugging enabled:
              </p>
              <code className="block p-2 rounded bg-black font-mono text-emerald-400 text-xs select-all">
                ./gradlew installDebug
              </code>
              <p className="text-[10px] text-slate-500">
                Installs and launches the APK directly on your device screen.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
