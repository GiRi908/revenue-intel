'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { hasUsableText } from '@/lib/types';
import {
  RefreshCwIcon,
  ShuffleIcon,
  SparklesIcon,
  TrashIcon,
  HistoryIcon,
} from './icons';
import { ImportLogModal } from './ImportLogModal';

export function ImportBar() {
  const {
    records,
    importLogs,
    isLoading,
    doImportInitial,
    doImportUpdate,
    doLoadDemo,
    doReset,
  } = useStore();

  const [isLogOpen, setIsLogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const usableCount = records.filter(hasUsableText).length;
  const maxRevision = records.reduce((max, r) => Math.max(max, r.applied_revision), 0);

  const handleAction = async (name: string, fn: () => Promise<any>) => {
    setStatusMessage(`Running: ${name}...`);
    try {
      const res = await fn();
      if (res && typeof res === 'object' && 'inserted' in res) {
        setStatusMessage(
          `Done: ${name} (Inserted: ${res.inserted}, Updated: ${res.updated}, Skipped: ${res.skipped})`
        );
      } else {
        setStatusMessage(`Done: ${name}`);
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setStatusMessage(`Error: ${String(err)}`);
    }
  };

  return (
    <>
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 py-2.5 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Quick Counts & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/60 text-slate-200">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <strong className="text-white font-semibold">{records.length}</strong> Records
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/60 text-slate-200">
              <strong className="text-emerald-400 font-semibold">{usableCount}</strong> Usable Texts
            </span>
            {maxRevision > 0 && (
              <span className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300">
                Rev <strong className="text-white">{maxRevision}</strong>
              </span>
            )}
          </div>

          {statusMessage && (
            <span className="text-xs text-blue-400 font-medium px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 animate-fade-in truncate max-w-xs">
              {statusMessage}
            </span>
          )}
        </div>

        {/* Right: The 5 Required Import & Reset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleAction('Import initial', () => doImportInitial(false))}
            className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            title="Import initial batch (01_initial.json, revision 1)"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Import initial</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleAction('Import initial (shuffled)', () => doImportInitial(true))}
            className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            title="Import initial batch in random order (verifies order-invariance)"
          >
            <ShuffleIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Import initial (shuffled)</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleAction('Import update', () => doImportUpdate())}
            className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            title="Import update batch (02_update.json, revision 2)"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 text-purple-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Import update</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleAction('Load demo', () => doLoadDemo())}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
            title="Import both batches sequentially (initial then update)"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Load demo</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              if (confirm('Are you sure you want to clear all IndexedDB records, routes, and analyses?')) {
                handleAction('Reset all stores', () => doReset());
              }
            }}
            className="btn-ghost text-xs px-2 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-1"
            title="Clear all local IndexedDB stores"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => setIsLogOpen(true)}
            className="btn-ghost text-xs px-2 py-1.5 text-slate-400 hover:text-white flex items-center gap-1.5"
            title="View import audit log"
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log</span>
            {importLogs.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-mono">
                {importLogs.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <ImportLogModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        logs={importLogs}
      />
    </>
  );
}
