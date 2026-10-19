import React from 'react';
import { Volume2, Turtle, CheckCircle2, MessageCircle, RotateCcw, Info } from 'lucide-react';
import { ttsService } from '../services/ttsService';
import { logSpokenInRealLife, undoSpokenInRealLife } from '../db/packManager';

const CATEGORY_COLORS = {
  'Arrival & Handover': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'Housekeeping': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'Tech & Repairs': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Front Desk & Guests': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Small Talk & Breaks': 'bg-pink-500/15 text-pink-300 border-pink-500/30'
};

export default function SentenceCard({ sentence, ttsState, sourceLang = 'en-US', index }) {
  const isPlayingNormal =
    ttsState.isPlaying &&
    ttsState.sentenceId === sentence.id &&
    ttsState.rate === 1.0 &&
    ttsState.lang === 'nl-NL';

  const isPlayingSlow =
    ttsState.isPlaying &&
    ttsState.sentenceId === sentence.id &&
    ttsState.rate === 0.75 &&
    ttsState.lang === 'nl-NL';

  const isPlayingSource =
    ttsState.isPlaying &&
    ttsState.sentenceId === sentence.id &&
    ttsState.lang === sourceLang;

  const timesSpoken = sentence.times_spoken_irl || 0;
  const isMastered = timesSpoken >= 3;

  const badgeStyle =
    CATEGORY_COLORS[sentence.category] ||
    'bg-slate-800 text-slate-300 border-slate-700';

  const handlePlayDutch = (rate) => {
    if (
      ttsState.isPlaying &&
      ttsState.sentenceId === sentence.id &&
      ttsState.rate === rate &&
      ttsState.lang === 'nl-NL'
    ) {
      ttsService.stop();
    } else {
      ttsService.speak(sentence.target_text, {
        lang: 'nl-NL',
        rate,
        sentenceId: sentence.id
      });
    }
  };

  const handlePlaySource = () => {
    if (isPlayingSource) {
      ttsService.stop();
    } else {
      ttsService.speak(sentence.source_text, {
        lang: sourceLang,
        rate: 1.0,
        sentenceId: sentence.id
      });
    }
  };

  const handleLogSpoken = async () => {
    await logSpokenInRealLife(sentence.id);
  };

  const handleUndoSpoken = async (e) => {
    e.stopPropagation();
    await undoSpokenInRealLife(sentence.id);
  };

  return (
    <article
      className={`rounded-2xl border p-4 transition-all ${
        isMastered
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
          : 'bg-slate-900/90 border-slate-800 shadow-lg shadow-black/20'
      }`}
    >
      {/* Top Meta Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {typeof index === 'number' && (
            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center border border-slate-700">
              {index + 1}
            </span>
          )}
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${badgeStyle}`}>
            {sentence.category}
          </span>
        </div>

        {/* Real-World Spoken Progress Dots */}
        <div className="flex items-center gap-1.5" title="Spoken in real life (3x = Mastered)">
          {[1, 2, 3].map((step) => (
            <span
              key={step}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                timesSpoken >= step
                  ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50'
                  : 'bg-slate-700'
              }`}
            />
          ))}
          <span className="text-xs font-semibold text-slate-400 ml-1">
            {timesSpoken}/3 IRL
          </span>
        </div>
      </div>

      {/* Dutch Target Sentence */}
      <div className="mb-2">
        <p className="text-xl font-bold text-white leading-snug tracking-tight">
          {sentence.target_text}
        </p>
      </div>

      {/* Source Translation (English / Italian) */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={handlePlaySource}
          className={`text-left text-sm leading-relaxed transition-colors ${
            isPlayingSource ? 'text-orange-400 font-medium' : 'text-slate-300 hover:text-slate-100'
          }`}
          title="Tap to hear source translation"
        >
          {sentence.source_text}
        </button>
      </div>

      {/* Optional Contextual Note */}
      {sentence.notes && (
        <div className="flex items-start gap-2 bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 mb-4 text-xs text-slate-400">
          <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
          <span>{sentence.notes}</span>
        </div>
      )}

      {/* Dual-Speed TTS Controls + Real-World Spoken Action */}
      <div className="grid grid-cols-12 gap-2 pt-1">
        {/* Normal Speed (1.0x) */}
        <button
          type="button"
          onClick={() => handlePlayDutch(1.0)}
          className={`col-span-4 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl font-semibold text-sm transition-all active:scale-95 cursor-pointer ${
            isPlayingNormal
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 ring-2 ring-orange-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
          }`}
        >
          <Volume2 className={`w-4 h-4 ${isPlayingNormal ? 'animate-pulse' : 'text-orange-400'}`} />
          <span>1.0x</span>
        </button>

        {/* Slow Speed (0.75x) */}
        <button
          type="button"
          onClick={() => handlePlayDutch(0.75)}
          className={`col-span-4 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl font-semibold text-sm transition-all active:scale-95 cursor-pointer ${
            isPlayingSlow
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
          }`}
        >
          <Turtle className={`w-4 h-4 ${isPlayingSlow ? 'animate-bounce' : 'text-amber-400'}`} />
          <span>0.75x</span>
        </button>

        {/* Spoke to a Person IRL Button */}
        <div className="col-span-4 flex items-center gap-1">
          <button
            type="button"
            onClick={handleLogSpoken}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
              isMastered
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
            }`}
            title="Log that you spoke this sentence to a person in real life"
          >
            {isMastered ? (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Mastered</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Spoke IRL</span>
              </>
            )}
          </button>

          {timesSpoken > 0 && (
            <button
              type="button"
              onClick={handleUndoSpoken}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
              title="Undo last spoken log"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
