import React, { useState } from 'react';
import {
  Zap,
  Send,
  ArrowRightCircle,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCcw
} from 'lucide-react';
import {
  addQuickCapture,
  deleteQuickCapture,
  setQuickCaptureProcessed
} from '../db/packManager';

export default function QuickCaptureInbox({
  captures = [],
  onConvertCapture
}) {
  const [rawText, setRawText] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showProcessed, setShowProcessed] = useState(false);

  const pendingCaptures = captures.filter((c) => !c.processed);
  const processedCaptures = captures.filter((c) => c.processed);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    const trimmed = rawText.trim();
    if (!trimmed) return;

    await addQuickCapture(trimmed);
    setRawText('');
    setIsExpanded(true);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-lg space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                10-Second Quick Capture
              </h3>
              {pendingCaptures.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingCaptures.length} in inbox
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Jot down a situation or phrase mid-shift — convert to a card later
            </p>
          </div>
        </div>

        {captures.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse inbox' : 'Expand inbox'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Fast Input Form */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
        <input
          type="text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="e.g. 'Ask reception if room 302 guests checked out'..."
          className="flex-1 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none px-3 py-2.5 text-xs text-white placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!rawText.trim()}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {justSaved ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Log</span>
            </>
          )}
        </button>
      </form>

      {/* Expandable Inbox List */}
      {isExpanded && captures.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          {pendingCaptures.length > 0 ? (
            <div className="space-y-2">
              {pendingCaptures.map((cap) => (
                <div
                  key={cap.id}
                  className="flex items-center justify-between gap-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-100 break-words leading-snug">
                      {cap.raw_text}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(cap.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onConvertCapture(cap)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white border border-orange-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                      title="Convert this shift note into a Dutch flashcard"
                    >
                      <ArrowRightCircle className="w-3.5 h-3.5" />
                      <span>Make Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteQuickCapture(cap.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-colors cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 text-center py-1">
              All shift captures converted into flashcards!
            </p>
          )}

          {/* Processed Captures Toggle */}
          {processedCaptures.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowProcessed((prev) => !prev)}
                className="text-[11px] text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>
                  {showProcessed ? 'Hide' : 'Show'} {processedCaptures.length} converted{' '}
                  {processedCaptures.length === 1 ? 'note' : 'notes'}
                </span>
              </button>

              {showProcessed && (
                <div className="space-y-1.5 mt-2">
                  {processedCaptures.map((cap) => (
                    <div
                      key={cap.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-slate-950/40 border border-slate-800/50 px-2.5 py-2 opacity-75"
                    >
                      <span className="text-xs text-slate-400 line-through truncate">
                        {cap.raw_text}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQuickCaptureProcessed(cap.id, false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                          title="Restore to pending inbox"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuickCapture(cap.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400 cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
