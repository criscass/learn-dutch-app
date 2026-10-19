import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Volume2,
  Turtle,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Tag,
  Clock,
  StickyNote,
  Zap,
  AlertCircle,
  Settings2,
  CalendarOff
} from 'lucide-react';
import { ttsService } from '../services/ttsService';
import { saveSentence, deleteSentence } from '../db/packManager';
import { SUPPORTED_LANGUAGES } from '../config/languages';
import { DEFAULT_CATEGORIES } from '../db/database';

export default function SentenceFormModal({
  isOpen,
  onClose,
  initialSentence = null,
  captureToConvert = null,
  categories = [],
  onOpenCategoryManager,
  profile,
  ttsState
}) {
  const isEditing = Boolean(initialSentence?.id);
  const sourceLang = profile?.source_lang || 'en-US';
  const activeLangMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang) || SUPPORTED_LANGUAGES[0];

  const availableCategories = useMemo(
    () => (categories.length > 0 ? categories : DEFAULT_CATEGORIES),
    [categories]
  );

  const defaultCategoryName =
    availableCategories.find((c) => c.name === 'Tech & Repairs')?.name ||
    availableCategories[0]?.name ||
    'General';

  const [targetText, setTargetText] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [category, setCategory] = useState(defaultCategoryName);
  const [notes, setNotes] = useState('');
  const [inDailyQueue, setInDailyQueue] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setConfirmDelete(false);

    if (initialSentence) {
      setTargetText(initialSentence.target_text || '');
      setSourceText(initialSentence.source_text || '');
      setCategory(initialSentence.category || defaultCategoryName);
      setNotes(initialSentence.notes || '');
      setInDailyQueue(initialSentence.in_daily_queue === 1);
    } else if (captureToConvert) {
      setTargetText('');
      setSourceText(captureToConvert.raw_text || '');
      setCategory(defaultCategoryName);
      setNotes('');
      setInDailyQueue(true);
    } else {
      setTargetText('');
      setSourceText('');
      setCategory(defaultCategoryName);
      setNotes('');
      setInDailyQueue(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialSentence, captureToConvert]);

  // If the currently selected category was deleted or renamed in Category Manager, keep valid selection
  useEffect(() => {
    if (!isOpen) return;
    const exists = availableCategories.some((c) => c.name === category);
    if (!exists && availableCategories.length > 0) {
      setCategory(availableCategories[0].name);
    }
  }, [availableCategories, category, isOpen]);

  if (!isOpen) return null;

  const selectedCategoryObj =
    availableCategories.find((c) => c.name === category) || null;

  const previewId = initialSentence?.id || 'form-preview';

  const isPlayingDutchNormal =
    ttsState?.isPlaying &&
    ttsState?.sentenceId === previewId &&
    ttsState?.rate === 1.0 &&
    ttsState?.lang === 'nl-NL';

  const isPlayingDutchSlow =
    ttsState?.isPlaying &&
    ttsState?.sentenceId === previewId &&
    ttsState?.rate === 0.75 &&
    ttsState?.lang === 'nl-NL';

  const isPlayingSource =
    ttsState?.isPlaying &&
    ttsState?.sentenceId === previewId &&
    ttsState?.lang === sourceLang;

  const handleTestDutch = (rate) => {
    const trimmed = targetText.trim();
    if (!trimmed) return;
    if (
      ttsState?.isPlaying &&
      ttsState?.sentenceId === previewId &&
      ttsState?.rate === rate &&
      ttsState?.lang === 'nl-NL'
    ) {
      ttsService.stop();
    } else {
      ttsService.speak(trimmed, {
        lang: 'nl-NL',
        rate,
        sentenceId: previewId
      });
    }
  };

  const handleTestSource = () => {
    const trimmed = sourceText.trim();
    if (!trimmed) return;
    if (isPlayingSource) {
      ttsService.stop();
    } else {
      ttsService.speak(trimmed, {
        lang: sourceLang,
        rate: 1.0,
        sentenceId: previewId
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const finalCategory = (category || '').trim();

    if (!targetText.trim()) {
      setError('Please enter the Dutch sentence.');
      return;
    }
    if (!sourceText.trim()) {
      setError(`Please enter the ${activeLangMeta.label} translation.`);
      return;
    }
    if (!finalCategory) {
      setError('Please select a category.');
      return;
    }

    setIsSaving(true);
    try {
      await saveSentence(
        {
          id: initialSentence?.id,
          target_text: targetText,
          source_text: sourceText,
          category: finalCategory,
          checkpoint_id: initialSentence?.checkpoint_id || 'any',
          notes,
          in_daily_queue: inDailyQueue ? 1 : 0
        },
        captureToConvert?.id || null
      );
      ttsService.stop();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save sentence.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialSentence?.id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsSaving(true);
    try {
      await deleteSentence(initialSentence.id);
      ttsService.stop();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-3">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              {captureToConvert ? (
                <Zap className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">
                {captureToConvert
                  ? 'Convert Capture to Flashcard'
                  : isEditing
                  ? 'Edit Workplace Sentence'
                  : 'Add Workplace Sentence'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {captureToConvert
                  ? 'Turn your shift note into a Dutch practice card'
                  : 'Test pronunciation with inline TTS before saving'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              ttsService.stop();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {/* Quick Capture Reference Banner */}
          {captureToConvert && (
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  Shift Capture Note
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetText(captureToConvert.raw_text)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    Use as Dutch
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceText(captureToConvert.raw_text)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    Use as {activeLangMeta.shortCode.toUpperCase()}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-200 italic">
                &ldquo;{captureToConvert.raw_text}&rdquo;
              </p>
            </div>
          )}

          {/* Dutch Sentence Input + Inline TTS Test */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                🇳🇱 Dutch Sentence (Nederlands) *
              </label>
              <span className="text-[11px] text-slate-400">Inline Audio Test</span>
            </div>

            <textarea
              rows={2}
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              placeholder="e.g. Ik kom de thermostaat in kamer 204 controleren."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-orange-500 focus:outline-none px-3 py-2.5 text-sm font-semibold text-white placeholder:text-slate-600 resize-none"
            />

            {/* Inline Dual-Speed TTS Tester */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                disabled={!targetText.trim()}
                onClick={() => handleTestDutch(1.0)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isPlayingDutchNormal
                    ? 'bg-orange-500 text-white border-orange-400 shadow-sm'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5 text-orange-400" />
                <span>Test Dutch 1.0x</span>
              </button>

              <button
                type="button"
                disabled={!targetText.trim()}
                onClick={() => handleTestDutch(0.75)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isPlayingDutchSlow
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <Turtle className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Slow 0.75x</span>
              </button>
            </div>
          </div>

          {/* Source Language Input + Inline TTS Test */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {activeLangMeta.flag} {activeLangMeta.label} Meaning *
              </label>
              <button
                type="button"
                disabled={!sourceText.trim()}
                onClick={handleTestSource}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-40 ${
                  isPlayingSource
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                <Volume2 className="w-3 h-3 text-orange-400" />
                <span>Test {activeLangMeta.shortCode.toUpperCase()}</span>
              </button>
            </div>

            <textarea
              rows={2}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={
                activeLangMeta.shortCode === 'it'
                  ? 'es. Vengo a controllare il termostato nella stanza 204.'
                  : 'e.g. I am coming to check the thermostat in room 204.'
              }
              className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-orange-500 focus:outline-none px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 resize-none"
            />
          </div>

          {/* Managed Category Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-orange-400" />
                <span>Workplace Category</span>
              </label>

              {onOpenCategoryManager && (
                <button
                  type="button"
                  onClick={onOpenCategoryManager}
                  className="flex items-center gap-1 text-[11px] font-semibold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>Manage Categories</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {availableCategories.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.id || cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat.has_time_bracket && cat.start_time && cat.end_time && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-orange-700/80 text-orange-100'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cat.start_time}&ndash;{cat.end_time}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Category Time Bracket Info */}
            {selectedCategoryObj && (
              <div className="flex items-center gap-1.5 text-[11px] px-1">
                {selectedCategoryObj.has_time_bracket &&
                selectedCategoryObj.start_time &&
                selectedCategoryObj.end_time ? (
                  <span className="inline-flex items-center gap-1 text-orange-300 font-medium">
                    <Clock className="w-3 h-3 text-orange-400" />
                    <span>
                      Scheduled time bracket: {selectedCategoryObj.start_time} &ndash;{' '}
                      {selectedCategoryObj.end_time}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <CalendarOff className="w-3 h-3 text-slate-500" />
                    <span>No specific time bracket for this category</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-orange-400" />
              <span>Pronunciation / Context Tip (Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 'storing' = malfunction/fault. Useful with Front Desk."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-orange-500 focus:outline-none px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600"
            />
          </div>

          {/* Pin to Today's Daily Queue Toggle */}
          <button
            type="button"
            onClick={() => setInDailyQueue((prev) => !prev)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors cursor-pointer ${
              inDailyQueue
                ? 'bg-orange-500/10 border-orange-500/40 text-orange-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles
                className={`w-4 h-4 ${
                  inDailyQueue ? 'text-orange-400' : 'text-slate-500'
                }`}
              />
              <div>
                <p className="text-xs font-bold text-slate-200">
                  Include in Today&apos;s Shift Queue
                </p>
                <p className="text-[11px] text-slate-400">
                  Practice this sentence immediately on your home screen
                </p>
              </div>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                inDailyQueue
                  ? 'bg-orange-500 border-orange-400 text-white'
                  : 'bg-slate-900 border-slate-700'
              }`}
            >
              {inDailyQueue && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Validation Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className={`flex items-center justify-center gap-1.5 py-3 px-3.5 rounded-xl font-semibold text-xs border transition-all cursor-pointer ${
                  confirmDelete
                    ? 'bg-red-600 text-white border-red-500'
                    : 'bg-slate-950 hover:bg-red-950/40 text-red-400 border-slate-800'
                }`}
                title="Delete sentence"
              >
                <Trash2 className="w-4 h-4" />
                <span>{confirmDelete ? 'Confirm?' : 'Delete'}</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-orange-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                {captureToConvert
                  ? 'Save Flashcard & Complete Capture'
                  : isEditing
                  ? 'Save Changes'
                  : 'Save Flashcard'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

