import React, { useMemo, useState } from 'react';
import {
  X,
  Tag,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  CalendarOff
} from 'lucide-react';
import { CATEGORY_COLOR_PALETTE } from '../db/database';
import { saveCategory, deleteCategory } from '../db/packManager';

export default function CategoryManagerModal({
  isOpen,
  onClose,
  categories = [],
  allSentences = []
}) {
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [hasTimeBracket, setHasTimeBracket] = useState(false);
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('09:30');
  const [color, setColor] = useState('cyan');
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [reassignTarget, setReassignTarget] = useState('');

  // Count how many sentences belong to each category
  const sentenceCountsByCategory = useMemo(() => {
    const map = {};
    for (const s of allSentences) {
      const cat = s.category || 'General';
      map[cat] = (map[cat] || 0) + 1;
    }
    return map;
  }, [allSentences]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setHasTimeBracket(false);
    setStartTime('08:30');
    setEndTime('09:30');
    setColor('cyan');
    setError(null);
  };

  const handleStartEdit = (cat) => {
    setError(null);
    setDeletingCategory(null);
    setEditingId(cat.id);
    setName(cat.name || '');
    setHasTimeBracket(Boolean(cat.has_time_bracket));
    setStartTime(cat.start_time || '08:30');
    setEndTime(cat.end_time || '09:30');
    setColor(cat.color || 'cyan');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter a category name.');
      return;
    }

    if (hasTimeBracket && (!startTime || !endTime)) {
      setError('Please choose both a start and end time for the time bracket.');
      return;
    }

    setIsSaving(true);
    try {
      await saveCategory({
        id: editingId,
        name: name.trim(),
        has_time_bracket: hasTimeBracket,
        start_time: hasTimeBracket ? startTime : null,
        end_time: hasTimeBracket ? endTime : null,
        color
      });
      resetForm();
    } catch (err) {
      setError(err.message || 'Could not save category.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromptDelete = (cat) => {
    setError(null);
    if (categories.length <= 1) {
      setError('You must keep at least one category.');
      return;
    }
    const remaining = categories.filter((c) => c.id !== cat.id);
    setDeletingCategory(cat);
    setReassignTarget(remaining[0]?.name || '');
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setIsSaving(true);
    setError(null);
    try {
      await deleteCategory(deletingCategory.id, reassignTarget);
      if (editingId === deletingCategory.id) {
        resetForm();
      }
      setDeletingCategory(null);
    } catch (err) {
      setError(err.message || 'Could not delete category.');
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
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">
                Manage Categories &amp; Time Brackets
              </h2>
              <p className="text-[11px] text-slate-400">
                Create, edit, or delete workplace labels and their shift times
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setDeletingCategory(null);
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Create / Edit Category Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3.5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                {editingId ? (
                  <>
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Category</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Category</span>
                  </>
                )}
              </span>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel edit
                </button>
              )}
            </div>

            {/* Category Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Category / Label Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HVAC & Plumbing, Safety, Morning Briefing"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 focus:border-orange-500 focus:outline-none px-3 py-2 text-xs font-semibold text-white placeholder:text-slate-500"
              />
            </div>

            {/* Time Bracket vs No Specific Time */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>Shift Time Schedule</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHasTimeBracket(false)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    !hasTimeBracket
                      ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <CalendarOff className="w-3.5 h-3.5" />
                  <span>No specific time</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHasTimeBracket(true)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    hasTimeBracket
                      ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Time bracket</span>
                </button>
              </div>

              {hasTimeBracket && (
                <div className="grid grid-cols-2 gap-2.5 pt-1 animate-in fade-in duration-150">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      From (Start)
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 focus:border-orange-500 focus:outline-none px-3 py-2 text-xs font-semibold text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      To (End)
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 focus:border-orange-500 focus:outline-none px-3 py-2 text-xs font-semibold text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Badge Color Picker */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 block">
                Label Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(CATEGORY_COLOR_PALETTE).map(([colorKey, meta]) => {
                  const isSelected = color === colorKey;
                  return (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => setColor(colorKey)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                        meta.badge
                      } ${
                        isSelected
                          ? 'ring-2 ring-white/80 scale-105'
                          : 'opacity-65 hover:opacity-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {editingId ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Category Changes</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Category</span>
                </>
              )}
            </button>
          </form>

          {/* Delete Confirmation Box */}
          {deletingCategory && (
            <div className="rounded-2xl bg-red-950/30 border border-red-500/40 p-3.5 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-red-200">
                    Delete &ldquo;{deletingCategory.name}&rdquo;?
                  </p>
                  {(sentenceCountsByCategory[deletingCategory.name] || 0) > 0 ? (
                    <p className="text-[11px] text-red-300/90">
                      There are{' '}
                      <strong>
                        {sentenceCountsByCategory[deletingCategory.name]} sentences
                      </strong>{' '}
                      using this label. Choose which category to move them to:
                    </p>
                  ) : (
                    <p className="text-[11px] text-red-300/90">
                      No sentences are currently using this category.
                    </p>
                  )}
                </div>
              </div>

              {(sentenceCountsByCategory[deletingCategory.name] || 0) > 0 && (
                <select
                  value={reassignTarget}
                  onChange={(e) => setReassignTarget(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-red-500/40 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                >
                  {categories
                    .filter((c) => c.id !== deletingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.name}>
                        Move sentences to: {c.name}
                      </option>
                    ))}
                </select>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSaving}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          )}

          {/* Existing Categories List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Your Categories ({categories.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Tap pencil to edit
              </span>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => {
                const palette =
                  CATEGORY_COLOR_PALETTE[cat.color] || CATEGORY_COLOR_PALETTE.slate;
                const count = sentenceCountsByCategory[cat.name] || 0;
                const isBeingEdited = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`flex items-center justify-between gap-2 p-3 rounded-xl border transition-all ${
                      isBeingEdited
                        ? 'bg-orange-500/10 border-orange-500/50'
                        : 'bg-slate-950/60 border-slate-800/90'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${palette.badge}`}
                        >
                          {cat.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {count} {count === 1 ? 'card' : 'cards'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        {cat.has_time_bracket && cat.start_time && cat.end_time ? (
                          <span className="inline-flex items-center gap-1 text-orange-300 font-medium">
                            <Clock className="w-3 h-3 text-orange-400" />
                            <span>
                              {cat.start_time} &ndash; {cat.end_time}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <CalendarOff className="w-3 h-3" />
                            <span>No specific time</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                        title={`Edit ${cat.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePromptDelete(cat)}
                        disabled={categories.length <= 1}
                        className="p-2 rounded-lg bg-slate-900 hover:bg-red-950/50 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title={`Delete ${cat.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
