import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type {
  StoredRecord,
  SuggestedRoutes,
  ManualRoutes,
  StoredAnalysis,
  ManifestRow,
  CallPayload,
  MeetingPayload,
  RouteName,
  ROUTE_LABELS,
} from './types';
import { hasUsableText, getPersonLabel } from './types';
import { getEffectiveRoutes } from './routing';
import { computeAnalysisFreshness } from './metrics';

const ROUTE_LABEL_MAP: Record<RouteName, string> = {
  sales_coaching: 'Sales Coaching',
  deal_next_steps: 'Deal Next Steps',
  customer_followup_cs: 'Customer Follow-up (CS)',
  internal_vendor_note: 'Internal/Vendor Note',
  no_analysis_log: 'No-analysis Log',
  needs_human_review: 'Needs Human Review',
};

function routeToFolder(route: RouteName): string {
  return route.replace(/_/g, '-');
}

function generateRecordMarkdown(
  record: StoredRecord,
  routes: { route: RouteName; reason: string }[],
  isManual: boolean,
  analysis: StoredAnalysis | undefined,
  freshness: string
): string {
  const lines: string[] = [];
  const ref = record.record_ref;
  const type = record.source_type;

  lines.push(`# ${ref} — ${type === 'call' ? 'Call' : 'Meeting'}`);
  lines.push('');

  // Source fields
  if (type === 'call') {
    const p = record.payload as CallPayload;
    lines.push('## Source Fields');
    lines.push(`- **Rep:** ${p.rep_name || 'N/A'}`);
    lines.push(`- **Direction:** ${p.direction}`);
    lines.push(`- **Started at:** ${p.started_at}`);
    lines.push(`- **Duration:** ${p.duration_seconds}s`);
    lines.push(`- **Connected:** ${p.is_connected}`);
    lines.push(`- **Outcome:** ${p.observed_outcome || 'N/A'}`);
    lines.push(`- **Applied Revision:** ${record.applied_revision}`);
  } else {
    const p = record.payload as MeetingPayload;
    lines.push('## Source Fields');
    lines.push(`- **Title:** ${p.title}`);
    lines.push(`- **Organizer:** ${p.organizer_email || 'N/A'}`);
    lines.push(`- **Starts at:** ${p.starts_at}`);
    lines.push(`- **Duration:** ${p.duration_seconds}s`);
    lines.push(`- **Recording Status:** ${p.recording_status}`);
    lines.push(`- **Applied Revision:** ${record.applied_revision}`);
  }

  lines.push('');

  // Routes
  lines.push('## Routes');
  for (const r of routes) {
    lines.push(`- **${ROUTE_LABEL_MAP[r.route]}**: ${r.reason}`);
  }
  if (isManual) {
    lines.push('');
    lines.push('> ⚠️ Route was manually overridden by the manager.');
  }
  lines.push('');

  // Transcript
  lines.push('## Transcript');
  if (type === 'call') {
    const t = (record.payload as CallPayload).transcript;
    if (t && t.trim()) {
      lines.push(t);
    } else {
      lines.push('_No usable transcript available._');
    }
  } else {
    const turns = record.transcript_payload?.turns;
    if (turns && turns.length > 0) {
      for (let i = 0; i < turns.length; i++) {
        const turn = turns[i];
        lines.push(`**Turn ${i + 1} | ${turn.timecode} | ${turn.speaker}**`);
        lines.push('');
        lines.push(turn.text);
        lines.push('');
      }
    } else {
      lines.push('_No usable transcript available._');
    }
  }
  lines.push('');

  // Analysis
  if (analysis) {
    lines.push('## Analysis');
    lines.push(`_Pre-generated: ${analysis.pre_generated ? 'Yes' : 'No'} | Freshness: ${freshness} | Source revision: ${analysis.source_revision}_`);
    lines.push('');
    lines.push(analysis.summary);
    lines.push('');

    if (analysis.evidence.length > 0) {
      lines.push('### Evidence');
      for (const e of analysis.evidence) {
        if (e.type === 'turn') {
          lines.push(`- [${e.ref} Turn ${e.turn}]: "${e.text}"`);
        } else {
          lines.push(`- [${e.ref}]: "${e.text}"`);
        }
      }
      lines.push('');
    }

    if (analysis.not_established) {
      lines.push('### What the evidence does not establish');
      lines.push(analysis.not_established);
      lines.push('');
    }

    if (analysis.next_steps) {
      lines.push('### Next Steps');
      lines.push(`- **Action:** ${analysis.next_steps.action}`);
      if (analysis.next_steps.owner) {
        lines.push(`- **Owner:** ${analysis.next_steps.owner}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function buildManifestRows(
  records: StoredRecord[],
  suggestedRoutes: SuggestedRoutes[],
  manualRoutes: ManualRoutes[],
  analyses: StoredAnalysis[]
): ManifestRow[] {
  const routeMap = new Map<string, SuggestedRoutes>();
  for (const sr of suggestedRoutes) {
    routeMap.set(`${sr.source_type}::${sr.source_id}`, sr);
  }

  const manualMap = new Map<string, ManualRoutes>();
  for (const mr of manualRoutes) {
    manualMap.set(`${mr.source_type}::${mr.source_id}`, mr);
  }

  const analysisMap = new Map<string, StoredAnalysis>();
  for (const a of analyses) {
    analysisMap.set(`${a.source_type}::${a.source_id}`, a);
  }

  const manifestRows: ManifestRow[] = [];

  for (const record of records) {
    const key = `${record.source_type}::${record.source_id}`;
    const suggested = routeMap.get(key);
    const manual = manualMap.get(key);
    const { routes, isManual } = getEffectiveRoutes(suggested, manual);
    const analysis = analysisMap.get(key);
    const freshness = analysis
      ? computeAnalysisFreshness(analysis, record)
      : 'no analysis';

    const outputPaths: string[] = [];
    for (const r of routes) {
      const folder = routeToFolder(r.route);
      const filename = `${record.record_ref}_${record.source_type}.md`;
      const path = `exports/${folder}/${filename}`;
      outputPaths.push(path);
    }

    let reviewState = 'routed';
    if (routes.some(r => r.route === 'needs_human_review')) {
      reviewState = 'needs_review';
    } else if (routes.some(r => r.route === 'no_analysis_log')) {
      reviewState = 'no_analysis';
    }

    manifestRows.push({
      source_type: record.source_type,
      source_id: record.source_id,
      record_ref: record.record_ref,
      applied_revision: record.applied_revision,
      routes: routes.map(r => r.route).join(';'),
      output_paths: outputPaths.join(';'),
      review_state: reviewState,
      manual_override: isManual,
      analysis_freshness: freshness,
    });
  }

  return manifestRows;
}

export async function generateExportZip(
  records: StoredRecord[],
  suggestedRoutes: SuggestedRoutes[],
  manualRoutes: ManualRoutes[],
  analyses: StoredAnalysis[],
): Promise<void> {
  const zip = new JSZip();

  const routeMap = new Map<string, SuggestedRoutes>();
  for (const sr of suggestedRoutes) {
    routeMap.set(`${sr.source_type}::${sr.source_id}`, sr);
  }

  const manualMap = new Map<string, ManualRoutes>();
  for (const mr of manualRoutes) {
    manualMap.set(`${mr.source_type}::${mr.source_id}`, mr);
  }

  const analysisMap = new Map<string, StoredAnalysis>();
  for (const a of analyses) {
    analysisMap.set(`${a.source_type}::${a.source_id}`, a);
  }

  const manifestRows = buildManifestRows(records, suggestedRoutes, manualRoutes, analyses);

  for (const record of records) {
    const key = `${record.source_type}::${record.source_id}`;
    const suggested = routeMap.get(key);
    const manual = manualMap.get(key);
    const { routes, isManual } = getEffectiveRoutes(suggested, manual);
    const analysis = analysisMap.get(key);
    const freshness = analysis
      ? computeAnalysisFreshness(analysis, record)
      : 'no analysis';

    const md = generateRecordMarkdown(record, routes, isManual, analysis, freshness);

    for (const r of routes) {
      const folder = routeToFolder(r.route);
      const filename = `${record.record_ref}_${record.source_type}.md`;
      const path = `exports/${folder}/${filename}`;
      zip.file(path, md);
    }
  }

  // Write manifest CSV
  const csvHeaders = Object.keys(manifestRows[0] || {}).join(',');
  const csvRows = manifestRows.map(row =>
    [
      row.source_type,
      row.source_id,
      row.record_ref,
      row.applied_revision,
      `"${row.routes}"`,
      `"${row.output_paths}"`,
      row.review_state,
      row.manual_override,
      `"${row.analysis_freshness}"`,
    ].join(',')
  );
  const csv = [csvHeaders, ...csvRows].join('\n');
  zip.file('exports/manifest.csv', csv);

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'revenue-intel-export.zip');
}
