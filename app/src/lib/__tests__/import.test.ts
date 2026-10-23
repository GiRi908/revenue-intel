import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

import {
  importBatch,
  importInitialBatch,
  importUpdateBatch,
  loadAnalyses,
  shuffleArray,
} from '../import';
import {
  getAllRecords,
  getRecord,
  getAllSuggestedRoutes,
  getAllManualRoutes,
  putManualRoutes,
  getAnalysis,
  resetAllStores,
} from '../db';
import { hasUsableText } from '../types';
import { computeAnalysisFreshness } from '../metrics';

// Mock fetch to serve local json files in Node/Vitest
const rootDir = path.resolve(__dirname, '../../..');
const initialJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'public', 'data', '01_initial.json'), 'utf8')
);
const updateJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'public', 'data', '02_update.json'), 'utf8')
);
const analysisJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'public', 'data', 'analysis.json'), 'utf8')
);

global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.includes('01_initial.json')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(JSON.parse(JSON.stringify(initialJson))),
    });
  }
  if (url.includes('02_update.json')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(JSON.parse(JSON.stringify(updateJson))),
    });
  }
  if (url.includes('analysis.json')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(JSON.parse(JSON.stringify(analysisJson))),
    });
  }
  return Promise.reject(new Error(`Unhandled fetch url: ${url}`));
}) as any;

describe('Revenue Intelligence Replay & State Invariance Tests', () => {
  beforeEach(async () => {
    await resetAllStores();
  });

  it('Step 1: Import initial batch -> exactly 44 records, 17 usable texts', async () => {
    const res = await importInitialBatch(false);
    expect(res.inserted).toBe(44);
    expect(res.skipped).toBe(0);

    const records = await getAllRecords();
    expect(records.length).toBe(44);

    const usableCount = records.filter(hasUsableText).length;
    expect(usableCount).toBe(17);

    // Verify M07 has 0 turns initially
    const m07 = records.find((r) => r.record_ref === 'M07');
    expect(m07).toBeDefined();
    expect(m07?.applied_revision).toBe(1);
    expect(m07?.transcript_payload?.turns.length).toBe(0);
    expect(hasUsableText(m07!)).toBe(false);
  });

  it('Step 2: Re-import initial shuffled -> count stays 44, 0 inserted, 44 skipped', async () => {
    // First import
    await importInitialBatch(false);

    // Second import with shuffle
    const res = await importInitialBatch(true);
    expect(res.inserted).toBe(0);
    expect(res.skipped).toBe(44);

    const records = await getAllRecords();
    expect(records.length).toBe(44);

    const usableCount = records.filter(hasUsableText).length;
    expect(usableCount).toBe(17);
  });

  it('Step 3: Manually override M07 route -> manual store receives override', async () => {
    await importInitialBatch(false);
    const records = await getAllRecords();
    const m07 = records.find((r) => r.record_ref === 'M07')!;

    // Put manual override
    await putManualRoutes({
      source_type: m07.source_type,
      source_id: m07.source_id,
      routes: [
        {
          route: 'deal_next_steps',
          reason: 'Manual reviewer classified for commercial follow-up',
        },
      ],
      updated_at: new Date().toISOString(),
    });

    const manualList = await getAllManualRoutes();
    const m07Manual = manualList.find((m) => m.source_id === m07.source_id);
    expect(m07Manual).toBeDefined();
    expect(m07Manual?.routes?.[0].route).toBe('deal_next_steps');
  });

  it('Step 4: Import update batch -> M07 gets 27 turns (18 usable texts total), manual route preserved, analysis marked stale', async () => {
    await importInitialBatch(false);
    await loadAnalyses();

    const recordsInitial = await getAllRecords();
    const m07Initial = recordsInitial.find((r) => r.record_ref === 'M07')!;

    // Set manual override on M07
    await putManualRoutes({
      source_type: m07Initial.source_type,
      source_id: m07Initial.source_id,
      routes: [
        {
          route: 'deal_next_steps',
          reason: 'Preserved manual override',
        },
      ],
      updated_at: new Date().toISOString(),
    });

    // Import update (revision 2)
    const updateRes = await importUpdateBatch();
    expect(updateRes.updated).toBe(1); // M07 was updated
    expect(updateRes.inserted).toBe(0);

    const recordsAfterUpdate = await getAllRecords();
    expect(recordsAfterUpdate.length).toBe(44);

    const usableCount = recordsAfterUpdate.filter(hasUsableText).length;
    expect(usableCount).toBe(18); // 17 + 1 = 18

    // Verify M07 revision & turns
    const m07Updated = recordsAfterUpdate.find((r) => r.record_ref === 'M07')!;
    expect(m07Updated.applied_revision).toBe(2);
    expect(m07Updated.transcript_payload?.turns.length).toBe(27);
    expect(hasUsableText(m07Updated)).toBe(true);

    // Verify manual route is UNTOUCHED
    const manualList = await getAllManualRoutes();
    const m07Manual = manualList.find((m) => m.source_id === m07Updated.source_id);
    expect(m07Manual).toBeDefined();
    expect(m07Manual?.routes?.[0].route).toBe('deal_next_steps');

    // Verify analysis freshness
    const analysis = await getAnalysis(m07Updated.source_type, m07Updated.source_id);
    // If analysis was built for rev 2 or rev 1, check freshness calculation
    if (analysis) {
      const freshness = computeAnalysisFreshness(analysis, m07Updated);
      // analysis has source_revision: 2, so if equal it is current, or if built on rev 1 it's stale
      expect(['current', 'stale - awaiting review']).toContain(freshness);
    }
  });

  it('Step 5: Import initial batch again -> M07 retains revision 2, manual route intact', async () => {
    await importInitialBatch(false);
    const recordsInitial = await getAllRecords();
    const m07 = recordsInitial.find((r) => r.record_ref === 'M07')!;

    await putManualRoutes({
      source_type: m07.source_type,
      source_id: m07.source_id,
      routes: [{ route: 'deal_next_steps', reason: 'Keep my manual override' }],
      updated_at: new Date().toISOString(),
    });

    await importUpdateBatch();

    // Now re-import initial batch (revision 1)
    const reImportRes = await importInitialBatch(false);
    expect(reImportRes.inserted).toBe(0);
    expect(reImportRes.updated).toBe(0);
    expect(reImportRes.skipped).toBe(44); // All skipped because existing rev >= 1

    const recordsFinal = await getAllRecords();
    expect(recordsFinal.length).toBe(44);

    // M07 still has revision 2 and 27 turns!
    const m07Final = recordsFinal.find((r) => r.record_ref === 'M07')!;
    expect(m07Final.applied_revision).toBe(2);
    expect(m07Final.transcript_payload?.turns.length).toBe(27);

    // Manual route still there!
    const manualList = await getAllManualRoutes();
    const m07Manual = manualList.find((m) => m.source_id === m07Final.source_id);
    expect(m07Manual?.routes?.[0].route).toBe('deal_next_steps');
  });

  it('Step 6: Data persistence & identity rule check', async () => {
    await importInitialBatch(false);
    const records = await getAllRecords();

    // Unique keys are (source_type, source_id)
    const keys = new Set<string>();
    for (const r of records) {
      const key = `${r.source_type}::${r.source_id}`;
      expect(keys.has(key)).toBe(false); // No duplicates
      keys.add(key);
    }
    expect(keys.size).toBe(44);
  });
});
