import React, { useRef, useState } from 'react';
import {
  Database,
  Download,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { exportDatabaseAsJson, importDatabaseFromJson } from '../db/packManager';

export default function DataBackupModal({
  isOpen,
  onClose,
  sentencesCount = 0,
  masteredCount = 0,
  capturesCount = 0
}) {
  const fileInputRef = useRef(null);
  const [importMode, setImportMode] = useState('merge'); // 'merge' | 'replace'
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: string }

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsBusy(true);
    setStatusMessage(null);
    try {
      const result = await exportDatabaseAsJson();
      setStatusMessage({
        type: 'success',
        text: `Exported ${result.sentencesCount} sentences (${result.filename}).`
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to export database.'
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleTriggerFileSelect = () => {
    setStatusMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsBusy(true);
    setStatusMessage(null);

    try {
      const text = await file.text();
      const result = await importDatabaseFromJson(text, { mode: importMode });
      setStatusMessage({
        type: 'success',
        text: `Imported ${result.sentencesImported} sentences${
          result.capturesImported ? ` and ${result.capturesImported} quick captures` : ''
        } (${result.mode === 'merge' ? 'merged with local progress' : 'replaced local data'}).`
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Invalid backup file. Could not import data.'
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-3">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">
                Local Database Backup
              </h2>
              <p className="text-[11px] text-slate-400">
                Export or restore your offline progress
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          {/* Current Local Database Summary */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80 text-center">
            <div>
              <p className="text-base font-extrabold text-white">{sentencesCount}</p>
              <p className="text-[11px] text-slate-400">Sentences</p>
            </div>
            <div className="border-x border-slate-800/80">
              <p className="text-base font-extrabold text-emerald-400">{masteredCount}</p>
              <p className="text-[11px] text-slate-400">Mastered</p>
            </div>
            <div>
              <p className="text-base font-extrabold text-orange-400">{capturesCount}</p>
              <p className="text-[11px] text-slate-400">Captures</p>
            </div>
          </div>

          {/* Export Section */}
          <div className="rounded-xl bg-slate-950/40 border border-slate-800/80 p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  1. Backup Local Data
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Download all your sentences, spoken IRL counts, profile settings, and quick captures as a <code className="text-orange-300">.json</code> file.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export Data as JSON</span>
            </button>
          </div>

          {/* Import Section */}
          <div className="rounded-xl bg-slate-950/40 border border-slate-800/80 p-3.5 space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                2. Restore or Import JSON
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Restore a previous backup file or load a custom sentence pack.
              </p>
            </div>

            {/* Import Mode Selector */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  importMode === 'merge'
                    ? 'bg-slate-800 text-orange-400 border border-orange-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Merge (Keep Highest)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-slate-800 text-orange-400 border border-orange-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Replace All Local
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleTriggerFileSelect}
              disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-slate-100 border border-slate-700 font-semibold text-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-orange-400" />
              <span>Import Data from JSON</span>
            </button>
          </div>

          {/* Status Banner */}
          {statusMessage && (
            <div
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Offline Persistence Tip */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              PWA updates preserve your database automatically. Export a backup before switching phones or clearing browser storage.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
