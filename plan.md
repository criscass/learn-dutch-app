# SYSTEM PROMPT & PROJECT ROADMAP: "Dutch Workday Companion"

## 1. Project Context & Goal
Act as an expert frontend and mobile developer. We are building a local-first, cross-platform language learning app initially tailored for a 50-year-old Italian expat (learning Dutch via English) working as a maintenance technician at a hotel in The Hague, while architecturally designed so friends and family with **different jobs, native languages, and work schedules** can easily install and adapt it on both **Android and iPhone**.

This is NOT a generic language app. It is a highly tailored, offline-first tool optimized for a daily commute and on-the-job interactions with Dutch-speaking colleagues. The goal is rapid, reflexive spoken fluency through targeted daily repetition and real-world application.

## 2. Tech Stack & Distribution Strategy
*   **Frontend:** React, Vite, Tailwind CSS (mobile-first, thumb-friendly UI).
*   **Cross-Platform Distribution (PWA + Optional Native Android):**
    *   **Primary (iOS & Android):** Progressive Web App (`vite-plugin-pwa`) hosted on static hosting (e.g., GitHub Pages, Vercel, or Netlify). Friends and family can install it via "Add to Home Screen" from a shared URL with full offline support and zero App Store fees.
    *   **Optional Native Wrapper (Android):** Ionic Capacitor (`@capacitor/core`, `@capacitor/android`) for generating a standalone Android `.apk` with full background local notification support.
*   **Database:** Dexie.js (IndexedDB wrapper) for 100% local, offline persistence across both PWA and Capacitor. No cloud backend required.
*   **Hybrid Hardware APIs (Web API + Capacitor Fallback):**
    *   **Text-to-Speech (TTS):** Service layer using `@capacitor-community/text-to-speech` on native Android and the standard Web Speech API (`window.speechSynthesis`) on PWA/iOS. Supports dynamic source languages (`en-US`, `it-IT`, `es-ES`, etc.) and target Dutch (`nl-NL`) at normal (1.0x) and slow (0.75x) speeds.
    *   **Screen WakeLock:** Browser `navigator.wakeLock` API (supported on Android & iOS 16.4+ PWAs) to keep the screen awake during hands-free commute audio looping.
    *   **Notifications:** `@capacitor/local-notifications` on native Android, with Web Notification API / in-app shift banners and downloadable `.ics` calendar reminders as a fallback for iOS PWAs.

## 3. Core Mechanics
1.  **Pluggable "Job & Language Packs":** Modular JSON packs containing workplace-specific sentences and multi-language translations (starting with *Hotel Maintenance* in English & Italian -> Dutch). Users can switch packs during onboarding or import custom `.json` packs shared via file/URL.
2.  **Configurable Work & Commute Profile:** Users can customize their source language, daily sentence count (default 5), active workdays, commute duration, and shift checkpoint times in Settings.
3.  **The "Daily Queue" (Default: Daily 5):** A queue of highly relevant sentences curated each workday (mix of new, working, and review).
4.  **Commute Audio Loop:** A hands-free mode that loops the daily queue (*Source Language -> Pause for speaking -> Dutch normal -> Dutch slow*).
5.  **Real-World Tracking:** Flashcards are marked "Mastered" only after the user logs them as "Spoke to a Person" 3 times in real life.
6.  **Quick Capture Inbox:** A fast 10-second text input to jot down broken phrases or situations encountered during the shift, to be translated and converted into flashcards later.
7.  **Shift Checkpoints:** Contextual prompts (e.g., arrival, break, handover) based on the user's configured work schedule to trigger real-life practice.
8.  **Offline Database Backup & Restore ("Export Data as JSON" & "Import Data"):** One-tap full local database export (`.json`) and import (supporting both safe progress-merging and full replacement, plus custom pack loading) alongside `navigator.storage.persist()` protection.

## 4. Database Schema Requirements (Dexie.js)
Design the local storage around three core tables/stores:

### A. `user_profile` (Key-Value / Single Record)
*   `id` (`'default'`)
*   `source_lang` (BCP 47 string, default `'en-US'`, e.g., `'it-IT'`, `'es-ES'`, `'pl-PL'`)
*   `target_lang` (BCP 47 string, default `'nl-NL'`)
*   `ui_lang` (String, default `'en'`, for optional UI localization)
*   `active_pack_id` (String, default `'hotel-maintenance'`)
*   `daily_goal_count` (Integer, default `5`)
*   `work_days` (Array of Integers, default `[1, 2, 3, 4, 5]` for Mon-Fri)
*   `checkpoints` (Array of Objects, e.g., `[{ id: 'arrival', label: 'Arrival', time: '08:55' }, { id: 'lunch', label: 'Lunch', time: '12:30' }]`)

### B. `sentences`
*   `id` (UUID or Pack ID slug)
*   `pack_id` (String, e.g., `'hotel-maintenance'` or `'custom'`)
*   `source_text` (String — localized to the user's active `source_lang`, with optional `translations` map `{ en: "...", it: "..." }`)
*   `target_text` (String — the Dutch sentence)
*   `category` (String, e.g., `'Housekeeping'`, `'Tech'`, `'Small Talk'`)
*   `checkpoint_id` (String, e.g., `'arrival'`, `'lunch'`, `'any'`)
*   `times_spoken_irl` (Integer, default `0`)
*   `mastery_level` (Integer, `0-5`)
*   `last_practiced` (Date/Timestamp)
*   `created_at` (Date/Timestamp)
*   `notes` (String, optional context/pronunciation tips)

### C. `quick_captures`
*   `id` (UUID)
*   `raw_text` (String — quick note jotted during shift)
*   `created_at` (Date/Timestamp)
*   `processed` (Boolean — whether it has been converted into a sentence card)

## 5. Modular Folder Architecture
```text
src/
├── config/
│   └── languages.js          # Supported source languages & TTS locale codes
├── data/
│   └── packs/                # Pre-bundled JSON Job Packs (e.g., hotel-maintenance.json)
├── db/
│   ├── database.js           # Dexie.js schema (user_profile, sentences, quick_captures)
│   └── packManager.js        # Seeds, switches, imports, and exports JSON packs & full DB backups
├── services/
│   ├── ttsService.js         # Hybrid TTS controller (Web Speech API + Capacitor fallback)
│   ├── wakeLockService.js    # Screen WakeLock manager for Commute Mode
│   ├── notificationService.js# Shift checkpoint scheduler (Native + Web fallback)
│   └── queueAlgorithm.js     # Daily N selection algorithm (New, Working, Review)
└── components/               # Daily Queue, Backup Modal, Commute Player, Quick Capture, Library, Settings
```

## 6. Development Roadmap (Iterative Sprints)

### Phase 1: Core MVP, Multi-Pack DB, Local Backup & Hybrid Audio Engine (Completed)
*   Scaffold the Vite + React app, configure Tailwind CSS, and set up `vite-plugin-pwa` for one-tap mobile installation.
*   Set up the Dexie.js database layer (`user_profile`, `sentences`, `quick_captures`) and `packManager.js` with persistent storage (`navigator.storage.persist()`).
*   Create the initial `hotel-maintenance.json` pack with 50 hotel/maintenance sentences (including English and Italian translations for Dutch).
*   Implement the hybrid `ttsService.js` (Web Speech API + Capacitor support) with dual-speed buttons (`1.0x` and `0.75x`) on a sentence card.
*   Build the main "Daily Queue" Home Screen view.
*   Implement "Export Data as JSON" and "Import Data" (`DataBackupModal.jsx` + `packManager.js`) so users can back up and restore their full local database (or merge progress) anytime.

### Phase 2: Data Input, Quick Capture & Library (Completed)
*   Build the "Add / Edit Sentence" form with inline TTS testing and dynamic category selection.
*   Implement the "Quick Capture" inbox on the home screen for fast 10-second logging during a busy shift, plus a workflow to convert captures into full flashcards.
*   Create a Library/Dictionary view with category and mastery filtering.

### Phase 3: Commute Mode & Shift Checkpoints (Current Focus)
*   Build the "Commute Mode" hands-free audio player interface with `wakeLockService.js` integration to loop through the daily queue (*Source Language -> Pause -> Dutch 1.0x -> Dutch 0.75x*).
*   Implement configurable Shift Checkpoints and notification scheduling (Capacitor Local Notifications for Android APK + Web/Calendar reminders for iOS PWA).

### Phase 4: Algorithm, Onboarding, Pack Sharing & Analytics
*   Implement the Daily Queue Algorithm (selecting a configurable mix of New, Working, and Review sentences per workday).
*   Build the Onboarding / Settings screen to configure Source Language, Workdays, Shift Checkpoints, and active Job Pack.
*   Expand JSON Pack Sharing so friends/family can easily switch or share custom job packs.
*   Build the Weekly Review stats screen.

## 7. Immediate Action Item for AI
Acknowledge these instructions. Then, provide the exact terminal commands to scaffold the Vite + React project, install the required dependencies (Tailwind, `vite-plugin-pwa`, Dexie, Capacitor core/CLI, TTS), and outline the initial folder structure we will use. Do not write the React components yet.