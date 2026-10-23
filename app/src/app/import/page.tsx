'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { RefreshCw, Shuffle, UploadCloud, Sparkles, Trash2 } from 'lucide-react';

export default function ImportPage() {
  const {
    importLogs,
    isLoading,
    doImportInitial,
    doImportUpdate,
    doLoadDemo,
    doReset,
  } = useStore();

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleAction = async (name: string, fn: () => Promise<any>) => {
    setStatusMessage(`Running ${name}...`);
    try {
      const res = await fn();
      if (res && typeof res === 'object' && 'inserted' in res) {
        setStatusMessage(
          `Completed ${name}: +${res.inserted} inserted, ${res.updated} updated, ${res.skipped} skipped.`
        );
      } else {
        setStatusMessage(`Completed ${name}.`);
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setStatusMessage(`Error: ${String(err)}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold text-[#14201A] tracking-tight leading-tight">
            Import and data
          </h1>
          <p className="text-[14px] text-[#6B7A72] mt-0.5">
            Manage test batch deliveries, verify order invariance, and review audit logs.
          </p>
        </div>

        {statusMessage && (
          <Chip label={statusMessage} variant="green" dot className="py-1.5 px-3" />
        )}
      </div>

      {/* Vertical List of Actions Panel */}
      <Card title="Available import actions">
        <div className="divide-y divide-[#E5E9E7] -my-2">
          {/* Action 1: Import Initial */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5 max-w-xl">
              <h3 className="text-[15px] font-semibold text-[#14201A]">
                Import initial batch
              </h3>
              <p className="text-[13px] text-[#6B7A72]">
                Ingests <code className="font-mono text-[12px] bg-[#F7F7F5] px-1 py-0.5 rounded">01_initial.json</code> (revision 1). Establishes 44 unique records with 17 usable transcripts. M07 initially contains 0 turns.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              disabled={isLoading}
              onClick={() => handleAction('Import initial', () => doImportInitial(false))}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Import initial
            </Button>
          </div>

          {/* Action 2: Import Shuffled */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5 max-w-xl">
              <h3 className="text-[15px] font-semibold text-[#14201A]">
                Import initial (shuffled order)
              </h3>
              <p className="text-[13px] text-[#6B7A72]">
                Randomizes record array order before ingestion using Fisher-Yates shuffle. Verifies that identity-based deduplication ignores array positions and never creates duplicates.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              disabled={isLoading}
              onClick={() => handleAction('Import initial (shuffled)', () => doImportInitial(true))}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Import initial (shuffled)
            </Button>
          </div>

          {/* Action 3: Import Update */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5 max-w-xl">
              <h3 className="text-[15px] font-semibold text-[#14201A]">
                Import update batch
              </h3>
              <p className="text-[13px] text-[#6B7A72]">
                Ingests <code className="font-mono text-[12px] bg-[#F7F7F5] px-1 py-0.5 rounded">02_update.json</code> (revision 2). Updates M07 with 27 late turns (increasing usable count from 17 to 18) while preserving all manual route corrections.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              disabled={isLoading}
              onClick={() => handleAction('Import update', () => doImportUpdate())}
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              Import update
            </Button>
          </div>

          {/* Action 4: Load Demo */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5 max-w-xl">
              <h3 className="text-[15px] font-semibold text-[#14201A]">
                Load demo (both batches)
              </h3>
              <p className="text-[13px] text-[#6B7A72]">
                Executes the sequential demo loading pipeline: imports initial batch, applies revision 2 update, and loads all pre-computed analytical dossiers.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              disabled={isLoading}
              onClick={() => handleAction('Load demo', () => doLoadDemo())}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Load demo
            </Button>
          </div>

          {/* Action 5: Reset Stores */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5 max-w-xl">
              <h3 className="text-[15px] font-semibold text-[#B3261E]">
                Reset local stores
              </h3>
              <p className="text-[13px] text-[#6B7A72]">
                Clears all IndexedDB object stores (records, routes, manual overrides, and import logs) to permit fresh replay testing from scratch.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              disabled={isLoading}
              className="text-[#B3261E] border-[#B3261E] hover:bg-[#FEE2E2]"
              onClick={() => {
                if (confirm('Are you sure you want to delete all stored records and overrides?')) {
                  handleAction('Reset all stores', () => doReset());
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset stores
            </Button>
          </div>
        </div>
      </Card>

      {/* Monospace Import Log Section */}
      <Card
        title="Import log history"
        action={
          <span className="text-[12px] text-[#6B7A72] font-mono">
            {importLogs.length} entries
          </span>
        }
      >
        <div className="bg-[#F7F7F5] rounded-[12px] p-4 font-mono text-[12px] text-[#14201A] max-h-80 overflow-y-auto space-y-2">
          {importLogs.length === 0 ? (
            <div className="text-[#6B7A72] text-center py-4">No import logs recorded yet.</div>
          ) : (
            importLogs.map((log, idx) => (
              <div
                key={idx}
                className="pb-2 border-b border-[#E5E9E7] last:border-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 leading-relaxed"
              >
                <div>
                  <span className="text-[#6B7A72]">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span className="font-semibold text-[#14683F]">{log.action}</span>{' '}
                  <span className="text-[#6B7A72]">(Rev {log.revision})</span>
                </div>
                <div className="text-[#6B7A72]">
                  Inserted: <span className="text-[#14683F] font-semibold">+{log.inserted}</span> | Updated: <span className="font-semibold">{log.updated}</span> | Skipped: {log.skipped} | Total: {log.total}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
