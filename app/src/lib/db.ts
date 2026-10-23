import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  StoredRecord,
  SuggestedRoutes,
  ManualRoutes,
  StoredAnalysis,
  ImportLogEntry,
} from './types';

// ─── Schema ─────────────────────────────────────────────────────

interface RevIntelDB extends DBSchema {
  sourceRecords: {
    key: string; // `${source_type}::${source_id}`
    value: StoredRecord;
    indexes: {
      'by-type': string;
      'by-person': string;
    };
  };
  suggestedRoutes: {
    key: string;
    value: SuggestedRoutes;
  };
  manualRoutes: {
    key: string;
    value: ManualRoutes;
  };
  analyses: {
    key: string;
    value: StoredAnalysis;
  };
  importLog: {
    key: number; // auto-increment
    value: ImportLogEntry;
  };
}

const DB_NAME = 'revenue-intel-inbox';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RevIntelDB>> | null = null;

export function makeKey(sourceType: string, sourceId: string): string {
  return `${sourceType}::${sourceId}`;
}

export function getDB(): Promise<IDBPDatabase<RevIntelDB>> {
  if (dbPromise) return dbPromise;
  dbPromise = openDB<RevIntelDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Source records store
      const srStore = db.createObjectStore('sourceRecords', { keyPath: undefined });
      srStore.createIndex('by-type', 'source_type');
      srStore.createIndex('by-person', 'payload.rep_name');

      // Suggested routes store
      db.createObjectStore('suggestedRoutes', { keyPath: undefined });

      // Manual routes store
      db.createObjectStore('manualRoutes', { keyPath: undefined });

      // Analyses store
      db.createObjectStore('analyses', { keyPath: undefined });

      // Import log store
      db.createObjectStore('importLog', { autoIncrement: true });
    },
  });
  return dbPromise;
}

// ─── Source Records ─────────────────────────────────────────────

export async function getRecord(sourceType: string, sourceId: string): Promise<StoredRecord | undefined> {
  const db = await getDB();
  return db.get('sourceRecords', makeKey(sourceType, sourceId));
}

export async function putRecord(record: StoredRecord): Promise<void> {
  const db = await getDB();
  await db.put('sourceRecords', record, makeKey(record.source_type, record.source_id));
}

export async function getAllRecords(): Promise<StoredRecord[]> {
  const db = await getDB();
  return db.getAll('sourceRecords');
}

// ─── Suggested Routes ───────────────────────────────────────────

export async function getSuggestedRoutes(sourceType: string, sourceId: string): Promise<SuggestedRoutes | undefined> {
  const db = await getDB();
  return db.get('suggestedRoutes', makeKey(sourceType, sourceId));
}

export async function putSuggestedRoutes(routes: SuggestedRoutes): Promise<void> {
  const db = await getDB();
  await db.put('suggestedRoutes', routes, makeKey(routes.source_type, routes.source_id));
}

export async function getAllSuggestedRoutes(): Promise<SuggestedRoutes[]> {
  const db = await getDB();
  return db.getAll('suggestedRoutes');
}

// ─── Manual Routes ──────────────────────────────────────────────

export async function getManualRoutes(sourceType: string, sourceId: string): Promise<ManualRoutes | undefined> {
  const db = await getDB();
  return db.get('manualRoutes', makeKey(sourceType, sourceId));
}

export async function putManualRoutes(routes: ManualRoutes): Promise<void> {
  const db = await getDB();
  await db.put('manualRoutes', routes, makeKey(routes.source_type, routes.source_id));
}

export async function deleteManualRoutes(sourceType: string, sourceId: string): Promise<void> {
  const db = await getDB();
  await db.delete('manualRoutes', makeKey(sourceType, sourceId));
}

export async function getAllManualRoutes(): Promise<ManualRoutes[]> {
  const db = await getDB();
  return db.getAll('manualRoutes');
}

// ─── Analyses ───────────────────────────────────────────────────

export async function getAnalysis(sourceType: string, sourceId: string): Promise<StoredAnalysis | undefined> {
  const db = await getDB();
  return db.get('analyses', makeKey(sourceType, sourceId));
}

export async function putAnalysis(analysis: StoredAnalysis): Promise<void> {
  const db = await getDB();
  await db.put('analyses', analysis, makeKey(analysis.source_type, analysis.source_id));
}

export async function getAllAnalyses(): Promise<StoredAnalysis[]> {
  const db = await getDB();
  return db.getAll('analyses');
}

// ─── Import Log ─────────────────────────────────────────────────

export async function addImportLog(entry: ImportLogEntry): Promise<void> {
  const db = await getDB();
  await db.add('importLog', entry);
}

export async function getImportLog(): Promise<ImportLogEntry[]> {
  const db = await getDB();
  return db.getAll('importLog');
}

// ─── Reset ──────────────────────────────────────────────────────

export async function resetAllStores(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['sourceRecords', 'suggestedRoutes', 'manualRoutes', 'analyses', 'importLog'],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore('sourceRecords').clear(),
    tx.objectStore('suggestedRoutes').clear(),
    tx.objectStore('manualRoutes').clear(),
    tx.objectStore('analyses').clear(),
    tx.objectStore('importLog').clear(),
    tx.done,
  ]);
}

// ─── Stats ──────────────────────────────────────────────────────

export async function getRecordCount(): Promise<number> {
  const db = await getDB();
  return db.count('sourceRecords');
}
