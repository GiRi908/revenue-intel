'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type {
  StoredRecord,
  SuggestedRoutes,
  ManualRoutes,
  StoredAnalysis,
  ImportLogEntry,
  RouteAssignment,
  RouteName,
} from '@/lib/types';
import {
  getAllRecords,
  getAllSuggestedRoutes,
  getAllManualRoutes,
  getAllAnalyses,
  getImportLog,
  putManualRoutes,
  deleteManualRoutes,
  resetAllStores,
  getRecordCount,
} from '@/lib/db';
import {
  importInitialBatch,
  importUpdateBatch,
  loadDemo,
  loadAnalyses,
  type ImportResult,
} from '@/lib/import';

interface StoreState {
  records: StoredRecord[];
  suggestedRoutes: SuggestedRoutes[];
  manualRoutes: ManualRoutes[];
  analyses: StoredAnalysis[];
  importLogs: ImportLogEntry[];
  isLoading: boolean;
  isInitialized: boolean;
  hasData: boolean;
}

interface StoreActions {
  refresh: () => Promise<void>;
  doImportInitial: (shuffle?: boolean) => Promise<ImportResult>;
  doImportUpdate: () => Promise<ImportResult>;
  doLoadDemo: () => Promise<void>;
  doReset: () => Promise<void>;
  setManualRoute: (sourceType: string, sourceId: string, routes: RouteAssignment[]) => Promise<void>;
  resetToSuggestion: (sourceType: string, sourceId: string) => Promise<void>;
}

const StoreContext = createContext<(StoreState & StoreActions) | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>({
    records: [],
    suggestedRoutes: [],
    manualRoutes: [],
    analyses: [],
    importLogs: [],
    isLoading: true,
    isInitialized: false,
    hasData: false,
  });

  const initCalled = useRef(false);

  const refresh = useCallback(async () => {
    const [records, suggestedRoutes, manualRoutes, analyses, importLogs] = await Promise.all([
      getAllRecords(),
      getAllSuggestedRoutes(),
      getAllManualRoutes(),
      getAllAnalyses(),
      getImportLog(),
    ]);

    setState(prev => ({
      ...prev,
      records,
      suggestedRoutes,
      manualRoutes,
      analyses,
      importLogs,
      isLoading: false,
      hasData: records.length > 0,
    }));
  }, []);

  // Auto-load demo on first visit if no data exists
  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    (async () => {
      const count = await getRecordCount();
      if (count === 0) {
        // First visit: auto-load both batches
        setState(prev => ({ ...prev, isLoading: true }));
        await loadDemo();
        await refresh();
        setState(prev => ({ ...prev, isInitialized: true }));
      } else {
        await refresh();
        setState(prev => ({ ...prev, isInitialized: true }));
      }
    })();
  }, [refresh]);

  const doImportInitial = useCallback(async (shuffle = false): Promise<ImportResult> => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await importInitialBatch(shuffle);
    await loadAnalyses();
    await refresh();
    return result;
  }, [refresh]);

  const doImportUpdate = useCallback(async (): Promise<ImportResult> => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await importUpdateBatch();
    await loadAnalyses();
    await refresh();
    return result;
  }, [refresh]);

  const doLoadDemo = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await loadDemo();
    await refresh();
  }, [refresh]);

  const doReset = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await resetAllStores();
    setState({
      records: [],
      suggestedRoutes: [],
      manualRoutes: [],
      analyses: [],
      importLogs: [],
      isLoading: false,
      isInitialized: true,
      hasData: false,
    });
  }, []);

  const setManualRoute = useCallback(async (
    sourceType: string,
    sourceId: string,
    routes: RouteAssignment[]
  ) => {
    await putManualRoutes({
      source_type: sourceType as 'call' | 'meeting',
      source_id: sourceId,
      routes,
      updated_at: new Date().toISOString(),
    });
    await refresh();
  }, [refresh]);

  const resetToSuggestion = useCallback(async (sourceType: string, sourceId: string) => {
    await deleteManualRoutes(sourceType, sourceId);
    await refresh();
  }, [refresh]);

  return (
    <StoreContext.Provider
      value={{
        ...state,
        refresh,
        doImportInitial,
        doImportUpdate,
        doLoadDemo,
        doReset,
        setManualRoute,
        resetToSuggestion,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
