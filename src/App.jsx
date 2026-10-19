import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Database,
  Globe,
  VolumeX,
  Wrench,
  Sparkles,
  BookOpen,
  Plus,
  Menu,
  X,
  Tag,
  ChevronRight
} from 'lucide-react';
import { db } from './db/database';
import { initializeDatabase, switchSourceLanguage } from './db/packManager';
import { ttsService } from './services/ttsService';
import { SUPPORTED_LANGUAGES } from './config/languages';
import DailyQueueView from './components/DailyQueueView';
import LibraryView from './components/LibraryView';
import DataBackupModal from './components/DataBackupModal';
import SentenceFormModal from './components/SentenceFormModal';
import CategoryManagerModal from './components/CategoryManagerModal';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [ttsState, setTtsState] = useState(ttsService.activeState);
  const [activeView, setActiveView] = useState('daily'); // 'daily' | 'library'
  const [isBurgerOpen, setIsBurgerOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Add / Edit / Convert Sentence Modal State
  const [isSentenceModalOpen, setIsSentenceModalOpen] = useState(false);
  const [editingSentence, setEditingSentence] = useState(null);
  const [captureToConvert, setCaptureToConvert] = useState(null);

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error('Database initialization error:', err);
        setIsReady(true);
      });

    const unsubscribe = ttsService.subscribe(setTtsState);
    return () => {
      unsubscribe();
      ttsService.stop();
    };
  }, []);

  const profile = useLiveQuery(() => db.user_profile.get('default'), []);
  const dailySentences = useLiveQuery(
    () => db.sentences.where('in_daily_queue').equals(1).toArray(),
    []
  );
  const allSentences = useLiveQuery(() => db.sentences.toArray(), []);
  const allCaptures = useLiveQuery(
    () => db.quick_captures.orderBy('created_at').reverse().toArray(),
    [],
    []
  );
  const categories = useLiveQuery(
    () => db.categories.orderBy('order').toArray(),
    [],
    []
  );

  const currentLang = profile?.source_lang || 'en-US';

  const handleSelectLanguage = async (langCode) => {
    if (langCode === currentLang) return;
    await switchSourceLanguage(langCode);
  };

  const activeLangMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) ||
    SUPPORTED_LANGUAGES[0];

  const masteredCount = useMemo(
    () =>
      (allSentences || []).filter((s) => (s.times_spoken_irl || 0) >= 3).length,
    [allSentences]
  );

  const pendingCapturesCount = useMemo(
    () => (allCaptures || []).filter((c) => !c.processed).length,
    [allCaptures]
  );

  const handleOpenAddSentence = () => {
    setEditingSentence(null);
    setCaptureToConvert(null);
    setIsSentenceModalOpen(true);
  };

  const handleOpenEditSentence = (sentence) => {
    setEditingSentence(sentence);
    setCaptureToConvert(null);
    setIsSentenceModalOpen(true);
  };

  const handleConvertCapture = (capture) => {
    setEditingSentence(null);
    setCaptureToConvert(capture);
    setIsSentenceModalOpen(true);
  };

  const handleCloseSentenceModal = () => {
    setIsSentenceModalOpen(false);
    setEditingSentence(null);
    setCaptureToConvert(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto border-x border-slate-900/80 relative">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-orange-600/30">
            NL
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white leading-none">
              Workday Companion
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Wrench className="w-3 h-3 text-orange-400" />
              <span>
                The Hague • {activeLangMeta.flag} {activeLangMeta.shortCode.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stop Audio Button when TTS is active */}
          {ttsState.isPlaying && (
            <button
              type="button"
              onClick={() => ttsService.stop()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-semibold animate-pulse cursor-pointer"
              title="Stop speaking"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>
          )}

          {/* Top Burger Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsBurgerOpen((prev) => !prev)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isBurgerOpen
                ? 'bg-orange-600 text-white border-orange-500 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
            }`}
            aria-label="Open menu"
            aria-expanded={isBurgerOpen}
          >
            {isBurgerOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Burger Dropdown Menu */}
        {isBurgerOpen && (
          <>
            {/* Backdrop to close menu on outside tap */}
            <div
              className="fixed inset-0 top-[61px] bg-black/60 backdrop-blur-xs z-30"
              onClick={() => setIsBurgerOpen(false)}
            />

            <div className="absolute top-full left-0 right-0 z-40 bg-slate-900 border-b border-slate-800 shadow-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* 1. Manage Categories & Time Brackets */}
              <button
                type="button"
                onClick={() => {
                  setIsBurgerOpen(false);
                  setIsCategoryModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/90 hover:border-orange-500/40 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Manage Categories</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold">
                        {categories?.length || 0}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Create, edit, or delete labels &amp; time brackets
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 2. Prompt / Translation Language Switcher */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Translation Language
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Switch meaning &amp; audio language for cards
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {SUPPORTED_LANGUAGES.slice(0, 2).map((lang) => {
                    const isSelected = currentLang === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          handleSelectLanguage(lang.code);
                          setIsBurgerOpen(false);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Backup & Restore Local Database */}
              <button
                type="button"
                onClick={() => {
                  setIsBurgerOpen(false);
                  setIsBackupOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/90 hover:border-orange-500/40 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Backup &amp; Restore Data
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Export or import local database (.json)
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-4">
        {!isReady || !dailySentences || !allSentences ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-medium">
              Loading offline workplace database...
            </p>
          </div>
        ) : activeView === 'daily' ? (
          <DailyQueueView
            dailySentences={dailySentences}
            allSentences={allSentences}
            captures={allCaptures}
            categories={categories}
            profile={profile}
            ttsState={ttsState}
            onAddSentence={handleOpenAddSentence}
            onEditSentence={handleOpenEditSentence}
            onConvertCapture={handleConvertCapture}
            onOpenLibrary={() => setActiveView('library')}
          />
        ) : (
          <LibraryView
            allSentences={allSentences}
            categories={categories}
            profile={profile}
            ttsState={ttsState}
            onAddSentence={handleOpenAddSentence}
            onEditSentence={handleOpenEditSentence}
          />
        )}
      </main>

      {/* Thumb-Friendly Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 px-4 py-2">
        <div className="grid grid-cols-3 items-center gap-2">
          {/* Today's Shift Tab */}
          <button
            type="button"
            onClick={() => setActiveView('daily')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors cursor-pointer relative ${
              activeView === 'daily'
                ? 'text-orange-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <Sparkles className="w-5 h-5" />
              {pendingCapturesCount > 0 && (
                <span className="absolute -top-1 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">
                  {pendingCapturesCount}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-0.5">Today&apos;s Shift</span>
          </button>

          {/* Center Quick Add Sentence Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleOpenAddSentence}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
              title="Add new workplace sentence"
            >
              <Plus className="w-4 h-4" />
              <span>Add Card</span>
            </button>
          </div>

          {/* Library / Dictionary Tab */}
          <button
            type="button"
            onClick={() => setActiveView('library')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors cursor-pointer ${
              activeView === 'library'
                ? 'text-orange-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[11px] mt-0.5">
              Library ({allSentences?.length || 0})
            </span>
          </button>
        </div>
      </nav>

      {/* Add / Edit / Convert Sentence Modal */}
      <SentenceFormModal
        isOpen={isSentenceModalOpen}
        onClose={handleCloseSentenceModal}
        initialSentence={editingSentence}
        captureToConvert={captureToConvert}
        categories={categories}
        onOpenCategoryManager={() => {
          setIsSentenceModalOpen(false);
          setIsCategoryModalOpen(true);
        }}
        profile={profile}
        ttsState={ttsState}
      />

      {/* Manage Categories & Time Brackets Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        allSentences={allSentences}
      />

      {/* Local Database Export / Import Modal */}
      <DataBackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        sentencesCount={allSentences?.length || 0}
        masteredCount={masteredCount}
        capturesCount={allCaptures?.length || 0}
      />
    </div>
  );
}

