import type {
  DeliveryBatch,
  DeliveryRecord,
  StoredRecord,
  ImportLogEntry,
  StoredAnalysis,
} from './types';
import {
  getRecord,
  putRecord,
  putSuggestedRoutes,
  getAnalysis,
  putAnalysis,
  addImportLog,
  getAllRecords,
} from './db';
import { computeSuggestedRoutes } from './routing';

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
  errors: string[];
  log: ImportLogEntry;
}

/**
 * Import a delivery batch into IndexedDB.
 * Identity = (source_type, source_id).
 * Higher revision replaces entire payload + transcript_payload.
 * Same or lower revision is ignored.
 * Manual routes are never touched by import.
 */
export async function importBatch(
  batch: DeliveryBatch,
  actionLabel: string = 'Import'
): Promise<ImportResult> {
  return importBatchTracked(batch, actionLabel);
}

async function importBatchTracked(
  batch: DeliveryBatch,
  actionLabel: string
): Promise<ImportResult> {
  const batchRevision = batch.revision;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const deliveryRecord of batch.records) {
    try {
      const existing = await getRecord(deliveryRecord.source_type, deliveryRecord.source_id);

      if (!existing) {
        // New record
        const stored: StoredRecord = {
          source_type: deliveryRecord.source_type,
          source_id: deliveryRecord.source_id,
          record_ref: deliveryRecord.record_ref,
          applied_revision: batchRevision,
          payload: deliveryRecord.payload,
          transcript_payload: deliveryRecord.transcript_payload,
          imported_at: new Date().toISOString(),
        };
        await putRecord(stored);
        inserted++;

        // Compute and store suggested routes
        const routes = computeSuggestedRoutes(stored);
        await putSuggestedRoutes(routes);
      } else if (batchRevision > existing.applied_revision) {
        // Higher revision: replace entire payload + transcript_payload
        const stored: StoredRecord = {
          ...existing,
          applied_revision: batchRevision,
          payload: deliveryRecord.payload,
          transcript_payload: deliveryRecord.transcript_payload,
          imported_at: new Date().toISOString(),
        };
        await putRecord(stored);
        updated++;

        // Recompute suggested routes
        const routes = computeSuggestedRoutes(stored);
        await putSuggestedRoutes(routes);

        // Mark analysis as stale if it exists
        const analysis = await getAnalysis(deliveryRecord.source_type, deliveryRecord.source_id);
        if (analysis && analysis.source_revision < batchRevision) {
          // Analysis is now stale — keep it but mark it
          // Freshness is computed dynamically, so no change needed here
        }
      } else {
        // Same or lower revision: skip
        skipped++;
      }
    } catch (e) {
      errors.push(`Error importing ${deliveryRecord.record_ref}: ${String(e)}`);
    }
  }

  const logEntry: ImportLogEntry = {
    timestamp: new Date().toISOString(),
    action: actionLabel,
    batch_id: batch.batch_id,
    revision: batchRevision,
    inserted,
    updated,
    skipped,
    total: batch.records.length,
  };

  await addImportLog(logEntry);

  return { inserted, updated, skipped, total: batch.records.length, errors, log: logEntry };
}

/**
 * Load pre-generated analyses from /data/analysis.json
 */
export async function loadAnalyses(): Promise<void> {
  try {
    const response = await fetch('/data/analysis.json');
    if (!response.ok) return;
    const analyses: StoredAnalysis[] = await response.json();

    for (const analysis of analyses) {
      const existing = await getAnalysis(analysis.source_type, analysis.source_id);
      if (!existing) {
        await putAnalysis(analysis);
      }
    }
  } catch {
    console.warn('Could not load pre-generated analyses');
  }
}

/**
 * Shuffle an array (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Fetch and import initial batch
 */
export async function importInitialBatch(shuffle: boolean = false): Promise<ImportResult> {
  const response = await fetch('/data/01_initial.json');
  const batch: DeliveryBatch = await response.json();

  if (shuffle) {
    batch.records = shuffleArray(batch.records);
  }

  const label = shuffle ? 'Import initial (shuffled)' : 'Import initial';
  return importBatchTracked(batch, label);
}

/**
 * Fetch and import update batch
 */
export async function importUpdateBatch(): Promise<ImportResult> {
  const response = await fetch('/data/02_update.json');
  const batch: DeliveryBatch = await response.json();
  return importBatchTracked(batch, 'Import update');
}

/**
 * Load demo: import both batches sequentially, then load analyses
 */
export async function loadDemo(): Promise<{ initial: ImportResult; update: ImportResult }> {
  const initial = await importInitialBatch(false);
  const update = await importUpdateBatch();
  await loadAnalyses();
  return { initial, update };
}
