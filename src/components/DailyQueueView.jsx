import React, { useState } from 'react';
import { RefreshCw, Sparkles, CheckCircle2, Wrench, BookOpen, Filter } from 'lucide-react';
import SentenceCard from './SentenceCard';
import { refreshDailyQueue } from '../db/packManager';

export default function DailyQueueView({
  dailySentences = [],
  allSentences = [],
  profile,
  ttsState
}) {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'all'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categories = [
    'All',
    ...Array.from(new Set(allSentences.map((s) => s.category)))
  ];

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

  const filteredAllSentences =
    selectedCategory === 'All'
      ? allSentences
      : allSentences.filter((s) => s.category === selectedCategory);

  return (
    <div className="space-y-5 pb-10">
      {/* Shift Progress Summary Card */}
      <section className="rounded-2xl bg-gradient-to-br from-orange-600/20 via-slate-900 to-slate-900 border border-orange-500/30 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Hotel Maintenance Pack
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Today&apos;s Shift Queue ({dailySentences.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={handleShuffleDaily}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95 cursor-pointer"
            title="Curate a fresh set of 5 sentences"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>New Queue</span>
          </button>
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
          <div className="bg-slate-950/50 rounded-xl p-2 border border-slate-800/60">
            <p className="text-lg font-extrabold text-blue-400">
              {totalMasteredOverall}/{allSentences.length}
            </p>
            <p className="text-[11px] text-slate-400">Pack Total</p>
          </div>
        </div>
      </section>

      {/* View Switcher Tabs (Daily 5 vs All 50 Pack Sentences) */}
      <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
            activeTab === 'daily'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>The Daily {profile?.daily_goal_count || 5}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>All Sentences ({allSentences.length})</span>
        </button>
      </div>

      {/* Category Filter Pills when viewing All Sentences */}
      {activeTab === 'all' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Filter className="w-4 h-4 text-slate-500 shrink-0 ml-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Sentence Cards List */}
      <section className="space-y-3.5">
        {activeTab === 'daily' ? (
          dailySentences.length > 0 ? (
            dailySentences.map((sentence, idx) => (
              <SentenceCard
                key={sentence.id}
                index={idx}
                sentence={sentence}
                ttsState={ttsState}
                sourceLang={profile?.source_lang || 'en-US'}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-200 font-semibold">No sentences in queue yet</p>
              <button
                type="button"
                onClick={handleShuffleDaily}
                className="mt-3 px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold"
              >
                Generate Daily 5
              </button>
            </div>
          )
        ) : (
          filteredAllSentences.map((sentence, idx) => (
            <SentenceCard
              key={sentence.id}
              index={idx}
              sentence={sentence}
              ttsState={ttsState}
              sourceLang={profile?.source_lang || 'en-US'}
            />
          ))
        )}
      </section>
    </div>
  );
}
