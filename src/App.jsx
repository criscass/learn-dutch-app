import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Globe, VolumeX, Wrench } from 'lucide-react';
import { db } from './db/database';
import { initializeDatabase, switchSourceLanguage } from './db/packManager';
import { ttsService } from './services/ttsService';
import { SUPPORTED_LANGUAGES } from './config/languages';
import DailyQueueView from './components/DailyQueueView';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [ttsState, setTtsState] = useState(ttsService.activeState);

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

  const currentLang = profile?.source_lang || 'en-US';

  const handleToggleLanguage = async () => {
    const nextLang = currentLang === 'en-US' ? 'it-IT' : 'en-US';
    await switchSourceLanguage(nextLang);
  };

  const activeLangMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto border-x border-slate-900/80">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
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
              <span>The Hague • Offline Ready</span>
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

          {/* Quick Source Language Switcher (EN <-> IT) */}
          <button
            type="button"
            onClick={handleToggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            title="Switch prompt language (English / Italiano)"
          >
            <Globe className="w-3.5 h-3.5 text-orange-400" />
            <span>{activeLangMeta.flag} {activeLangMeta.shortCode.toUpperCase()}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-4">
        {!isReady || !dailySentences || !allSentences ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-medium">Loading offline workplace database...</p>
          </div>
        ) : (
          <DailyQueueView
            dailySentences={dailySentences}
            allSentences={allSentences}
            profile={profile}
            ttsState={ttsState}
          />
        )}
      </main>
    </div>
  );
}
