'use client';

import React from 'react';
import type { ImportLogEntry } from '@/lib/types';
import { HistoryIcon, CheckCircleIcon } from './icons';

interface ImportLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ImportLogEntry[];
}

export function ImportLogModal({ isOpen, onClose, logs }: ImportLogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-semibold text-white">Import History & Audit Log</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 rounded text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No imports performed yet. Click one of the import buttons in the header to start.
            </div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium text-white text-sm">{log.action}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Revision {log.revision}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-700/40 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Inserted</span>
                    <span className="font-semibold text-emerald-400 font-mono">+{log.inserted}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Updated</span>
                    <span className="font-semibold text-sky-400 font-mono">{log.updated}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Skipped</span>
                    <span className="font-semibold text-slate-400 font-mono">{log.skipped}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Batch Total</span>
                    <span className="font-semibold text-white font-mono">{log.total}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono truncate">
                  Batch ID: {log.batch_id}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
