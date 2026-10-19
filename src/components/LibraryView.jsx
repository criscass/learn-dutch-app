import React, { useMemo, useState } from 'react';
import {
  Search,
  X,
  Plus,
  Filter,
  BookOpen,
  CheckCircle2,
  Flame,
  Sparkles,
  Layers
} from 'lucide-react';
import SentenceCard from './SentenceCard';

const MASTERY_FILTERS = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'new', label: 'New (0/3)', icon: Sparkles },
  { id: 'working', label: 'Working (1-2/3)', icon: Flame },
  { id: 'mastered', label: 'Mastered (3/3)', icon: CheckCircle2 },
  { id: 'custom', label: 'My Custom', icon: Plus }
];

export default function LibraryView({
  allSentences = [],
  profile,
  ttsState,
  onAddSentence,
  onEditSentence
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [masteryFilter, setMasteryFilter] = useState('all');

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(allSentences.map((s) => s.category).filter(Boolean))
    );
    return ['All', ...unique];
  }, [allSentences]);

  const countsByMastery = useMemo(() => {
    let newCount = 0;
    let workingCount = 0;
    let masteredCount = 0;
    let customCount = 0;

    for (const s of allSentences) {
      const spoken = s.times_spoken_irl || 0;
      if (spoken === 0) newCount++;
      else if (spoken < 3) workingCount++;
      else masteredCount++;

      if (s.pack_id === 'custom') customCount++;
    }

    return {
      all: allSentences.length,
      new: newCount,
      working: workingCount,
      mastered: masteredCount,
      custom: customCount
    };
  }, [allSentences]);

  const filteredSentences = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allSentences.filter((s) => {
      // 1. Category filter
      if (selectedCategory !== 'All' && s.category !== selectedCategory) {
        return false;
      }

      // 2. Mastery filter
      const spoken = s.times_spoken_irl || 0;
      if (masteryFilter === 'new' && spoken !== 0) return false;
      if (masteryFilter === 'working' && (spoken < 1 || spoken >= 3)) return false;
      if (masteryFilter === 'mastered' && spoken < 3) return false;
      if (masteryFilter === 'custom' && s.pack_id !== 'custom') return false;

      // 3. Search query filter
      if (q) {
        const inTarget = (s.target_text || '').toLowerCase().includes(q);
        const inSource = (s.source_text || '').toLowerCase().includes(q);
        const inEn = (s.translations?.en || '').toLowerCase().includes(q);
        const inIt = (s.translations?.it || '').toLowerCase().includes(q);
        const inNotes = (s.notes || '').toLowerCase().includes(q);
        const inCat = (s.category || '').toLowerCase().includes(q);

        if (!inTarget && !inSource && !inEn && !inIt && !inNotes && !inCat) {
          return false;
        }
      }

      return true;
    });
  }, [allSentences, selectedCategory, masteryFilter, searchQuery]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setMasteryFilter('all');
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Library Header Card */}
      <section className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Workplace Dictionary
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Sentence Library ({allSentences.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={onAddSentence}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-orange-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Sentence</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Dutch, English, Italiano, or notes..."
            className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-orange-500 focus:outline-none pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </section>

      {/* Mastery Filter Pills */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {MASTERY_FILTERS.map((mf) => {
            const Icon = mf.icon;
            const isActive = masteryFilter === mf.id;
            const count = countsByMastery[mf.id] ?? 0;

            return (
              <button
                key={mf.id}
                type="button"
                onClick={() => setMasteryFilter(mf.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{mf.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-orange-700/80 text-orange-100'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1 mr-0.5" />
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 text-slate-950 border-white'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & Active Filter Reset */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span>
          Showing <strong className="text-slate-200">{filteredSentences.length}</strong>{' '}
          {filteredSentences.length === 1 ? 'sentence' : 'sentences'}
        </span>

        {(searchQuery || selectedCategory !== 'All' || masteryFilter !== 'all') && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-orange-400 hover:text-orange-300 font-semibold cursor-pointer"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Filtered Cards List */}
      {filteredSentences.length > 0 ? (
        <section className="space-y-3.5">
          {filteredSentences.map((sentence) => (
            <SentenceCard
              key={sentence.id}
              sentence={sentence}
              ttsState={ttsState}
              sourceLang={profile?.source_lang || 'en-US'}
              onEdit={onEditSentence}
              showQueueToggle={true}
            />
          ))}
        </section>
      ) : (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center space-y-3">
          <BookOpen className="w-9 h-9 text-slate-500 mx-auto" />
          <div>
            <p className="text-sm font-bold text-slate-200">
              No matching sentences found
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Try clearing your filters or add a new custom workplace phrase.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={resetFilters}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={onAddSentence}
              className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Phrase</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
