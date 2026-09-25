import { Project, AgentInfo } from '../types';

export const AGENTS: AgentInfo[] = [
  {
    id: 'architect',
    name: 'Aria',
    title: 'Lead Systems Architect',
    avatarBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    avatarIcon: 'Brain',
    color: '#818cf8',
    description: 'Breaks down requirements, designs app structure, coordinates team.',
    specialty: 'Architecture, Clean Code, API design'
  },
  {
    id: 'coder',
    name: 'Rex',
    title: 'Android & Fullstack Coder',
    avatarBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    avatarIcon: 'Code2',
    color: '#34d399',
    description: 'Writes Kotlin, Jetpack Compose, XML layouts, and functional logic.',
    specialty: 'Android Kotlin, Jetpack Compose, React/Node'
  },
  {
    id: 'reviewer',
    name: 'Cipher',
    title: 'QA & Security Reviewer',
    avatarBg: 'bg-amber-500/15 text-amber-400 border-emerald-500/30',
    avatarIcon: 'ShieldAlert',
    color: '#fbbf24',
    description: 'Inspects code quality, fixes crashes, edge cases, and security leaks.',
    specialty: 'Bug Hunting, Memory Leaks, Code Quality'
  },
  {
    id: 'devops',
    name: 'Nova',
    title: 'DevOps & APK Builder',
    avatarBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    avatarIcon: 'Cpu',
    color: '#fb7185',
    description: 'Manages Gradle dependencies, Manifest permissions, and APK releases.',
    specialty: 'Gradle, AndroidManifest, ProGuard, Release APK'
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'compose-studio-pro',
    name: 'Jetpack Compose Hub',
    description: 'A fully custom, modern Android Kotlin application using Jetpack Compose, Material 3 design, and Coroutines.',
    type: 'android-apk',
    createdAt: Date.now() - 3600000 * 24 * 5, // 5 days ago
    updatedAt: Date.now() - 3600000 * 2, // 2 hours ago
    version: '1.0.3',
    githubSync: {
      owner: 'kasiura-dev',
      repo: 'compose-studio-hub',
      branch: 'main',
      autoCommit: true,
      autoCommitIntervalSeconds: 3,
      autoCommitBranch: 'dev-workspace-sync',
      autoRetry: true,
      maxRetries: 3,
      retryBackoffMs: 1500,
      retryStrategy: 'exponential'
    },
    files: [
      {
        id: 'file-main-activity-kt',
        name: 'MainActivity.kt',
        path: 'app/src/main/java/com/codesquad/MainActivity.kt',
        language: 'kotlin',
        lastModified: Date.now() - 3600000 * 4,
        content: `package com.codesquad.hub

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ComposeStudioDashboard()
                }
            }
        }
    }
}

@Composable
fun ComposeStudioDashboard() {
    var counter by remember { mutableStateOf(0) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Jetpack Compose Active!",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Welcome to your Android development workspace.",
            fontSize = 14.sp
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = { counter++ }) {
            Text("Clicked \$counter times")
        }
    }
}`
      },
      {
        id: 'file-manifest-xml',
        name: 'AndroidManifest.xml',
        path: 'app/src/main/AndroidManifest.xml',
        language: 'xml',
        lastModified: Date.now() - 3600000 * 12,
        content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.codesquad.hub">

    <!-- Direct access permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:label="Compose Studio Pro"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`
      },
      {
        id: 'file-build-gradle-kts',
        name: 'build.gradle.kts',
        path: 'app/build.gradle.kts',
        language: 'kotlin',
        lastModified: Date.now() - 3600000 * 8,
        content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.codesquad.hub"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.codesquad.hub"
        minSdk = 26
        targetSdk = 36
        versionCode = 103
        versionName = "1.0.3"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation(platform("androidx.compose:compose-bom:2024.09.03"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
}`
      },
      {
        id: 'file-readme-md',
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        lastModified: Date.now() - 3600000 * 20,
        content: `# Jetpack Compose Hub

A modern Kotlin-based Android application configured with Google recommended AGP & Jetpack Compose dependencies.

### Features
* Jetpack Compose UI
* Material Design 3 Components
* Directly compile and inspect layout audits inside CodeSquad APK Center!`
      }
    ]
  }
];
