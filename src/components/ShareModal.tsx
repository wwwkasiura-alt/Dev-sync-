import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { Project } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedRawCode, setCopiedRawCode] = useState(false);

  if (!isOpen || !project) return null;

  // Derive the public shared URL (ais-pre) which doesn't enforce IAM cookie auth
  const publicOrigin = window.location.origin.replace('ais-dev-', 'ais-pre-');
  const libraryUrl = `${publicOrigin}/library/${project.id}`;
  const rawUrl = `${publicOrigin}/library/${project.id}/raw`;
  const mobilePrompt = `Hey! Please inspect my code library and repository for "${project.name}" at this public link:
${rawUrl}

Read all Kotlin, AndroidManifest, and Gradle files, and provide your advice and updated code fixes!`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(libraryUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(mobilePrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyAllCodeContext = () => {
    let output = `# PROJECT: ${project.name} (${project.type.toUpperCase()})\n`;
    output += `Description: ${project.description || 'Android & Web Code Repository'}\n\n`;
    project.files.forEach((f) => {
      output += `### FILE: ${f.path}\n\`\`\`${f.language || ''}\n${f.content}\n\`\`\`\n\n`;
    });
    navigator.clipboard.writeText(output);
    setCopiedRawCode(true);
    setTimeout(() => setCopiedRawCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">Share AI Web Library & Bridge</h3>
              <span className="text-xs text-slate-400">Direct code & advice portal for mobile free AIs (Claude/ChatGPT)</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Option A: Direct Web Library URL (No White Screen / Crawler Safe) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            1. Server-Rendered Library URL (Give this to Claude / ChatGPT):
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 truncate select-all">
              {libraryUrl}
            </div>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shrink-0 shadow"
            >
              {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
            </button>
          </div>
        </div>

        {/* Option B: 1-Click Complete Code Context Copy */}
        <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-indigo-200">2. Or Copy All Project Code Instantly:</div>
            <div className="text-[11px] text-slate-400">Agar Claude link fetch na kare, toh 1-click mein poora code copy karke Claude chat mein paste karein.</div>
          </div>
          <button
            onClick={handleCopyAllCodeContext}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 shadow"
          >
            {copiedRawCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedRawCode ? 'Copied All Code!' : 'Copy All Code'}</span>
          </button>
        </div>

        {/* Prompt Card */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300">
              3. Ready Prompt for ChatGPT / Claude App:
            </label>
            <button
              onClick={handleCopyPrompt}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
            </button>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
            {mobilePrompt}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200 space-y-1">
          <p className="font-semibold text-indigo-300">Kaise kaam karta hai?</p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Jab aapka mobile AI is link ko kholega, use saari files bina kisi login barrier ke milengi. AI wahan advice likh sakta hai aur updated code submit kar sakta hai, jo turant aapke is repository mein aa jayega!
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
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
