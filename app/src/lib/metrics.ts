import type {
  StoredRecord,
  CallPayload,
  MeetingPayload,
  RouteAssignment,
  RouteName,
  SuggestedRoutes,
  ManualRoutes,
  StoredAnalysis,
  AnalysisFreshness,
} from './types';
import { hasUsableText, getPersonLabel, getPersonType } from './types';
import { getEffectiveRoutes } from './routing';

// ─── Metric Definitions ────────────────────────────────────────

export const METRIC_DEFINITIONS = {
  selectedRecords: {
    label: 'Selected Records',
    definition: 'Count of unique source records matching current filter, identified by (source_type, source_id). A repeated import does not change this count.',
  },
  activityByDay: {
    label: 'Activity by Day',
    definition: 'Records grouped by local date (Asia/Kolkata). Calls use started_at, meetings use starts_at. All supplied activity falls on 21 Aug 2026.',
  },
  activityByPerson: {
    label: 'Activity by Person',
    definition: 'Records grouped by person. Calls group by rep_name; meetings group by organizer_email. An organizer is not automatically the salesperson.',
  },
  transcriptCoverage: {
    label: 'Transcript Coverage',
    definition: 'Usable supplied texts ÷ selected records. Usable = non-blank call transcript or at least one non-blank meeting turn.',
  },
  connectionRate: {
    label: 'Source-reported Connection Rate',
    definition: 'Calls with is_connected=true ÷ calls with non-null is_connected. This is a stored upstream classification, not independently verified. Unknown (null) count shown separately.',
  },
  routingCounts: {
    label: 'Routing Counts',
    definition: 'Route assignments vs unique records. A record with multiple routes counts once in unique records but once per route in assignments.',
  },
} as const;

// ─── Computed metrics ──────────────────────────────────────────

export interface DashboardMetrics {
  totalRecords: number;
  callCount: number;
  meetingCount: number;
  usableTexts: number;
  transcriptCoverage: number;  // 0-1
  connectedTrue: number;
  connectedFalse: number;
  connectedNull: number;
  connectionRate: number;      // 0-1
  connectionDenominator: number;
  activityByDay: Record<string, number>;
  activityByPerson: { name: string; type: 'rep' | 'organizer'; count: number }[];
  routingCounts: { route: RouteName; label: string; count: number }[];
  uniqueRoutedRecords: number;
  totalRouteAssignments: number;
}

export function computeMetrics(
  records: StoredRecord[],
  suggestedRoutes: SuggestedRoutes[],
  manualRoutes: ManualRoutes[],
): DashboardMetrics {
  const routeMap = new Map<string, SuggestedRoutes>();
  for (const sr of suggestedRoutes) {
    routeMap.set(`${sr.source_type}::${sr.source_id}`, sr);
  }

  const manualMap = new Map<string, ManualRoutes>();
  for (const mr of manualRoutes) {
    manualMap.set(`${mr.source_type}::${mr.source_id}`, mr);
  }

  const callCount = records.filter(r => r.source_type === 'call').length;
  const meetingCount = records.filter(r => r.source_type === 'meeting').length;
  const usableTexts = records.filter(r => hasUsableText(r)).length;

  // Connection rate (calls only)
  const calls = records.filter(r => r.source_type === 'call');
  let connectedTrue = 0;
  let connectedFalse = 0;
  let connectedNull = 0;

  for (const c of calls) {
    const p = c.payload as CallPayload;
    if (p.is_connected === true) connectedTrue++;
    else if (p.is_connected === false) connectedFalse++;
    else connectedNull++;
  }

  const connectionDenominator = connectedTrue + connectedFalse;

  // Activity by day (Asia/Kolkata)
  const activityByDay: Record<string, number> = {};
  for (const r of records) {
    const ts = r.source_type === 'call'
      ? (r.payload as CallPayload).started_at
      : (r.payload as MeetingPayload).starts_at;
    const d = new Date(ts);
    const day = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    activityByDay[day] = (activityByDay[day] || 0) + 1;
  }

  // Activity by person
  const personCounts: Record<string, { type: 'rep' | 'organizer'; count: number }> = {};
  for (const r of records) {
    const name = getPersonLabel(r);
    const type = getPersonType(r);
    const key = `${type}::${name}`;
    if (!personCounts[key]) {
      personCounts[key] = { type, count: 0 };
    }
    personCounts[key].count++;
  }

  const activityByPerson = Object.entries(personCounts)
    .map(([key, val]) => ({
      name: key.split('::')[1],
      type: val.type,
      count: val.count,
    }))
    .sort((a, b) => b.count - a.count);

  // Routing counts
  const routeCountMap: Record<RouteName, number> = {
    sales_coaching: 0,
    deal_next_steps: 0,
    customer_followup_cs: 0,
    internal_vendor_note: 0,
    no_analysis_log: 0,
    needs_human_review: 0,
  };

  let totalRouteAssignments = 0;
  let uniqueRoutedRecords = 0;

  for (const r of records) {
    const key = `${r.source_type}::${r.source_id}`;
    const suggested = routeMap.get(key);
    const manual = manualMap.get(key);
    const { routes } = getEffectiveRoutes(suggested, manual);

    if (routes.length > 0) {
      uniqueRoutedRecords++;
      for (const ra of routes) {
        routeCountMap[ra.route]++;
        totalRouteAssignments++;
      }
    }
  }

  const routeLabels: Record<RouteName, string> = {
    sales_coaching: 'Sales Coaching',
    deal_next_steps: 'Deal Next Steps',
    customer_followup_cs: 'Customer Follow-up (CS)',
    internal_vendor_note: 'Internal/Vendor Note',
    no_analysis_log: 'No-analysis Log',
    needs_human_review: 'Needs Human Review',
  };

  const routingCounts = Object.entries(routeCountMap)
    .map(([route, count]) => ({
      route: route as RouteName,
      label: routeLabels[route as RouteName],
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalRecords: records.length,
    callCount,
    meetingCount,
    usableTexts,
    transcriptCoverage: records.length > 0 ? usableTexts / records.length : 0,
    connectedTrue,
    connectedFalse,
    connectedNull,
    connectionRate: connectionDenominator > 0 ? connectedTrue / connectionDenominator : 0,
    connectionDenominator,
    activityByDay,
    activityByPerson,
    routingCounts,
    uniqueRoutedRecords,
    totalRouteAssignments,
  };
}

// ─── Analysis freshness ─────────────────────────────────────────

export function computeAnalysisFreshness(
  analysis: StoredAnalysis | undefined,
  record: StoredRecord
): AnalysisFreshness {
  if (!analysis) return 'stale - awaiting review';
  if (analysis.source_revision < record.applied_revision) {
    return 'stale - awaiting review';
  }
  return 'current';
}

// ─── Unique persons list ────────────────────────────────────────

export interface PersonInfo {
  name: string;
  type: 'rep' | 'organizer';
  label: string; // display label
  recordCount: number;
}

export function getUniquePersons(records: StoredRecord[]): PersonInfo[] {
  const map = new Map<string, PersonInfo>();

  for (const r of records) {
    const name = getPersonLabel(r);
    const type = getPersonType(r);
    const key = `${type}::${name}`;

    if (!map.has(key)) {
      map.set(key, {
        name,
        type,
        label: type === 'rep' ? `${name} (Rep)` : `${name} (Organizer)`,
        recordCount: 0,
      });
    }
    map.get(key)!.recordCount++;
  }

  return Array.from(map.values()).sort((a, b) => b.recordCount - a.recordCount);
}
