import React, { useState } from 'react';
import {
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Wrench,
  BookOpen,
  Plus
} from 'lucide-react';
import SentenceCard from './SentenceCard';
import QuickCaptureInbox from './QuickCaptureInbox';
import { refreshDailyQueue } from '../db/packManager';

export default function DailyQueueView({
  dailySentences = [],
  allSentences = [],
  captures = [],
  categories = [],
  profile,
  ttsState,
  onAddSentence,
  onEditSentence,
  onConvertCapture,
  onOpenLibrary
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const masteredInDaily = dailySentences.filter(
    (s) => (s.times_spoken_irl || 0) >= 3
  ).length;

  const totalSpokenToday = dailySentences.reduce(
    (sum, s) => sum + (s.times_spoken_irl || 0),
    0
  );

  const totalMasteredOverall = allSentences.filter(
    (s) => (s.times_spoken_irl || 0) >= 3
  ).length;

  const handleShuffleDaily = async () => {
    setIsRefreshing(true);
    try {
      await refreshDailyQueue(profile?.daily_goal_count || 5, true);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Shift Progress Summary Card */}
      <section className="rounded-2xl bg-gradient-to-br from-orange-600/20 via-slate-900 to-slate-900 border border-orange-500/30 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Hotel Maintenance Pack
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Today&apos;s Shift Queue ({dailySentences.length})
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onAddSentence}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Add a custom workplace sentence"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>

            <button
              type="button"
              onClick={handleShuffleDaily}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95 cursor-pointer"
              title="Curate a fresh set of 5 sentences"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-orange-400 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              <span>New 5</span>
            </button>
          </div>
        </div>

        {/* Progress Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
          <div className="bg-slate-950/50 rounded-xl p-2 border border-slate-800/60">
            <p className="text-lg font-extrabold text-orange-400">
              {masteredInDaily}/{dailySentences.length}
            </p>
            <p className="text-[11px] text-slate-400">Daily Mastered</p>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-2 border border-slate-800/60">
            <p className="text-lg font-extrabold text-emerald-400">
              {totalSpokenToday}
            </p>
            <p className="text-[11px] text-slate-400">Spoken IRL</p>
          </div>
          <button
            type="button"
            onClick={onOpenLibrary}
            className="bg-slate-950/50 hover:bg-slate-900 rounded-xl p-2 border border-slate-800/60 transition-colors cursor-pointer"
            title="Open Full Sentence Library"
          >
            <p className="text-lg font-extrabold text-blue-400">
              {totalMasteredOverall}/{allSentences.length}
            </p>
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <span>Library</span>
              <BookOpen className="w-2.5 h-2.5" />
            </p>
          </button>
        </div>
      </section>

      {/* 10-Second Quick Capture Inbox on Home Screen */}
      <QuickCaptureInbox
        captures={captures}
        onConvertCapture={onConvertCapture}
      />

      {/* Section Title for Daily Queue */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            Active Practice Cards ({dailySentences.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={onOpenLibrary}
          className="text-xs font-semibold text-orange-400 hover:text-orange-300 cursor-pointer"
        >
          Browse all {allSentences.length} &rarr;
        </button>
      </div>

      {/* Sentence Cards List */}
      <section className="space-y-3.5">
        {dailySentences.length > 0 ? (
          dailySentences.map((sentence, idx) => (
            <SentenceCard
              key={sentence.id}
              index={idx}
              sentence={sentence}
              categories={categories}
              ttsState={ttsState}
              sourceLang={profile?.source_lang || 'en-US'}
              onEdit={onEditSentence}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-slate-200 font-semibold">No sentences in queue yet</p>
            <button
              type="button"
              onClick={handleShuffleDaily}
              className="mt-3 px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold cursor-pointer"
            >
              Generate Daily 5
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
