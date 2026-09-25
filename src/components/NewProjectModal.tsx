import React, { useState } from 'react';
import { X, Smartphone, Globe, FolderPlus } from 'lucide-react';
import { Project } from '../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'android-apk' | 'web-app'>('android-apk');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const projectId = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);

    let initialFiles = [];
    if (type === 'android-apk') {
      initialFiles = [
        {
          id: 'file-main-' + Date.now(),
          name: 'MainActivity.kt',
          path: 'app/src/main/java/com/app/' + name.toLowerCase().replace(/[^a-z0-9]/g, '') + '/MainActivity.kt',
          language: 'kotlin',
          lastModified: Date.now(),
          content: `package com.app.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Text("Hello from ${name} APK!")
            }
        }
    }
}
`
        },
        {
          id: 'file-manifest-' + Date.now(),
          name: 'AndroidManifest.xml',
          path: 'app/src/main/AndroidManifest.xml',
          language: 'xml',
          lastModified: Date.now(),
          content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.app.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}">
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:label="${name}"
        android:theme="@android:style/Theme.Material.Light.NoActionBar">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`
        }
      ];
    } else {
      initialFiles = [
        {
          id: 'file-web-' + Date.now(),
          name: 'index.ts',
          path: 'src/index.ts',
          language: 'typescript',
          lastModified: Date.now(),
          content: `// ${name} Entry point\nconsole.log("Starting ${name}...");\n`
        }
      ];
    }

    const newProj: Project = {
      id: projectId,
      name: name.trim(),
      description: description.trim() || 'Custom code and agent repository',
      type,
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: initialFiles
    };

    onCreateProject(newProj);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">Create New Project</h3>
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
              Project Name:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MyFitnessTracker, CryptoBot, SmartNotes"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Description (Optional):
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what this repo is for..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Project Template:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('android-apk')}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  type === 'android-apk'
                    ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Smartphone className="w-4 h-4" />
                  <span>Android APK</span>
                </div>
                <span className="text-[11px] text-slate-400">Kotlin & Jetpack Compose boilerplate</span>
              </button>

              <button
                type="button"
                onClick={() => setType('web-app')}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  type === 'web-app'
                    ? 'bg-indigo-950/40 border-indigo-500/70 text-indigo-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Globe className="w-4 h-4" />
                  <span>Web App</span>
                </div>
                <span className="text-[11px] text-slate-400">Node / TypeScript code structure</span>
              </button>
            </div>
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
              Create Repository
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
