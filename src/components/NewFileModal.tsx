import React, { useState } from 'react';
import { X, FileCode } from 'lucide-react';
import { ProjectFile } from '../types';

interface NewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFile: (file: ProjectFile) => void;
  defaultPathPrefix?: string;
}

export const NewFileModal: React.FC<NewFileModalProps> = ({
  isOpen,
  onClose,
  onCreateFile,
  defaultPathPrefix = 'app/src/main/java/com/app/'
}) => {
  const [filePath, setFilePath] = useState('');
  const [initialContent, setInitialContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath.trim()) return;

    const trimmedPath = filePath.trim();
    const fileName = trimmedPath.split('/').pop() || trimmedPath;
    
    let language = 'text';
    if (fileName.endsWith('.py')) language = 'python';
    else if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) language = 'typescript';
    else if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) language = 'javascript';
    else if (fileName.endsWith('.sql')) language = 'sql';
    else if (fileName.endsWith('.sh') || fileName.endsWith('.bash')) language = 'bash';
    else if (fileName.endsWith('.c')) language = 'c';
    else if (fileName.endsWith('.cpp') || fileName.endsWith('.cc') || fileName.endsWith('.cxx')) language = 'cpp';
    else if (fileName.endsWith('.rs')) language = 'rust';
    else if (fileName.endsWith('.go')) language = 'go';
    else if (fileName.endsWith('.java')) language = 'java';
    else if (fileName.endsWith('.kt')) language = 'kotlin';
    else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) language = 'html';
    else if (fileName.endsWith('.css')) language = 'css';
    else if (fileName.endsWith('.xml')) language = 'xml';
    else if (fileName.endsWith('.gradle') || fileName.endsWith('.kts')) language = 'groovy';
    else if (fileName.endsWith('.json')) language = 'json';
    else if (fileName.endsWith('.md')) language = 'markdown';

    const newFile: ProjectFile = {
      id: 'file-' + Date.now(),
      name: fileName,
      path: trimmedPath,
      language,
      lastModified: Date.now(),
      content: initialContent.trim() || `// ${fileName}\n`
    };

    onCreateFile(newFile);
    setFilePath('');
    setInitialContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">Add New File</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              File Path:
            </label>
            <input
              type="text"
              required
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="e.g. app/src/main/java/com/app/SettingsActivity.kt"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[11px] text-slate-500 block mt-1">
              Supports subfolders (e.g. <code>ui/components/CustomButton.kt</code>)
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Initial Content (Optional):
            </label>
            <textarea
              rows={4}
              value={initialContent}
              onChange={(e) => setInitialContent(e.target.value)}
              placeholder="// Write initial boilerplate code..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
            >
              Create File
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
