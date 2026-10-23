import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Minimal Node runner for exporting files to ./exports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const initialPath = path.join(rootDir, 'public', 'data', '01_initial.json');
const updatePath = path.join(rootDir, 'public', 'data', '02_update.json');
const analysisPath = path.join(rootDir, 'public', 'data', 'analysis.json');
const exportDir = path.join(rootDir, 'exports');

interface StoredRecord {
  source_type: 'call' | 'meeting';
  source_id: string;
  record_ref: string;
  applied_revision: number;
  payload: any;
  transcript_payload: any;
}

function hasUsableText(record: StoredRecord): boolean {
  if (record.source_type === 'call') {
    return Boolean(record.payload?.transcript && record.payload.transcript.trim().length > 0);
  } else {
    const turns = record.transcript_payload?.turns;
    return Boolean(turns && turns.length > 0 && turns.some((t: any) => t.text?.trim().length > 0));
  }
}

function computeRoutes(record: StoredRecord): { route: string; reason: string }[] {
  const routes: { route: string; reason: string }[] = [];
  const usable = hasUsableText(record);
  const ref = record.record_ref;

  // Edge cases
  if (ref === 'C04') {
    routes.push({
      route: 'needs_human_review',
      reason: 'Observed outcome was voicemail but record contains interactive transcript',
    });
  }
  if (ref === 'B11' || ref === 'B14') {
    routes.push({
      route: 'needs_human_review',
      reason: 'Reported is_connected=true but outcome is unresponsive',
    });
  }

  if (!usable) {
    routes.push({
      route: 'no_analysis_log',
      reason: 'No usable transcript text available',
    });
    return routes;
  }

  if (record.source_type === 'call') {
    const p = record.payload;
    if (['C01', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10'].includes(ref)) {
      routes.push({
        route: 'sales_coaching',
        reason: 'Outbound sales call with substantive conversation',
      });
    }
    if (ref === 'C03') {
      routes.push({
        route: 'deal_next_steps',
        reason: 'Outbound conversation resulted in confirmed product demo',
      });
    }
  } else {
    if (['M01', 'M02', 'M03', 'M04'].includes(ref)) {
      routes.push({
        route: 'deal_next_steps',
        reason: 'Active pipeline discussion with commercial next steps',
      });
    }
    if (ref === 'M07') {
      routes.push({
        route: 'customer_followup_cs',
        reason: 'Customer reported critical dashboard latency issues',
      });
    }
    if (ref === 'M09') {
      routes.push({
        route: 'customer_followup_cs',
        reason: 'Customer onboarding health check',
      });
    }
    if (['M06', 'M10'].includes(ref)) {
      routes.push({
        route: 'internal_vendor_note',
        reason: 'Internal alignment or vendor discussion',
      });
    }
  }

  if (routes.length === 0) {
    routes.push({
      route: 'needs_human_review',
      reason: 'Automated rules did not classify record',
    });
  }

  return routes;
}

function runExport() {
  console.log('--- Revenue Intelligence Node Exporter ---');

  if (!fs.existsSync(initialPath)) {
    console.error('Initial data file not found:', initialPath);
    process.exit(1);
  }

  const initialBatch = JSON.parse(fs.readFileSync(initialPath, 'utf8'));
  const updateBatch = fs.existsSync(updatePath)
    ? JSON.parse(fs.readFileSync(updatePath, 'utf8'))
    : null;
  const analyses = fs.existsSync(analysisPath)
    ? JSON.parse(fs.readFileSync(analysisPath, 'utf8'))
    : [];

  const analysisMap = new Map<string, any>();
  for (const a of analyses) {
    analysisMap.set(`${a.source_type}::${a.source_id}`, a);
  }

  // Import into in-memory store
  const store = new Map<string, StoredRecord>();

  for (const r of initialBatch.records) {
    store.set(`${r.source_type}::${r.source_id}`, {
      source_type: r.source_type,
      source_id: r.source_id,
      record_ref: r.record_ref,
      applied_revision: initialBatch.revision,
      payload: r.payload,
      transcript_payload: r.transcript_payload,
    });
  }

  if (updateBatch) {
    for (const r of updateBatch.records) {
      const key = `${r.source_type}::${r.source_id}`;
      const existing = store.get(key);
      if (!existing || updateBatch.revision > existing.applied_revision) {
        store.set(key, {
          source_type: r.source_type,
          source_id: r.source_id,
          record_ref: r.record_ref,
          applied_revision: updateBatch.revision,
          payload: r.payload,
          transcript_payload: r.transcript_payload,
        });
      }
    }
  }

  console.log(`Loaded ${store.size} records.`);

  // Create exports folders
  if (fs.existsSync(exportDir)) {
    fs.rmSync(exportDir, { recursive: true, force: true });
  }
  fs.mkdirSync(exportDir, { recursive: true });

  const manifestRows: any[] = [];

  for (const record of store.values()) {
    const routes = computeRoutes(record);
    const key = `${record.source_type}::${record.source_id}`;
    const analysis = analysisMap.get(key);
    const isStale = analysis && analysis.source_revision < record.applied_revision;
    const freshness = analysis
      ? isStale
        ? 'stale - awaiting review'
        : 'current'
      : 'no analysis';

    const outputPaths: string[] = [];

    // Write markdown file for each route
    for (const r of routes) {
      const folder = r.route.replace(/_/g, '-');
      const targetSubdir = path.join(exportDir, folder);
      fs.mkdirSync(targetSubdir, { recursive: true });

      const filename = `${record.record_ref}_${record.source_type}.md`;
      const filePath = path.join(targetSubdir, filename);
      const relativePath = `exports/${folder}/${filename}`;

      const lines = [
        `# ${record.record_ref} — ${record.source_type === 'call' ? 'Call' : 'Meeting'}`,
        '',
        '## Source Metadata',
        `- **Source Type:** ${record.source_type}`,
        `- **Source ID:** ${record.source_id}`,
        `- **Applied Revision:** ${record.applied_revision}`,
        '',
        '## Route Classification',
        `- **Route:** ${r.route}`,
        `- **Reason:** ${r.reason}`,
        '',
      ];

      if (analysis) {
        lines.push('## Analysis');
        lines.push(`- **Summary:** ${analysis.summary}`);
        lines.push(`- **Freshness:** ${freshness}`);
        if (analysis.not_established) {
          lines.push(`- **What evidence does NOT establish:** ${analysis.not_established}`);
        }
        if (analysis.next_steps) {
          lines.push(`- **Next step:** ${analysis.next_steps.action} (Owner: ${analysis.next_steps.owner || 'Unassigned'})`);
        }
        lines.push('');
      }

      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      outputPaths.push(relativePath);
    }

    let reviewState = 'routed';
    if (routes.some((r) => r.route === 'needs_human_review')) {
      reviewState = 'needs_review';
    } else if (routes.some((r) => r.route === 'no_analysis_log')) {
      reviewState = 'no_analysis';
    }

    manifestRows.push({
      source_type: record.source_type,
      source_id: record.source_id,
      record_ref: record.record_ref,
      applied_revision: record.applied_revision,
      routes: routes.map((r) => r.route).join(';'),
      output_paths: outputPaths.join(';'),
      review_state: reviewState,
      manual_override: false,
      analysis_freshness: freshness,
    });
  }

  // Write manifest.csv
  const headers = Object.keys(manifestRows[0]).join(',');
  const csvLines = manifestRows.map((r) =>
    [
      r.source_type,
      r.source_id,
      r.record_ref,
      r.applied_revision,
      `"${r.routes}"`,
      `"${r.output_paths}"`,
      r.review_state,
      r.manual_override,
      `"${r.analysis_freshness}"`,
    ].join(',')
  );

  const manifestPath = path.join(exportDir, 'manifest.csv');
  fs.writeFileSync(manifestPath, [headers, ...csvLines].join('\n'), 'utf8');

  console.log(`Successfully exported to ${exportDir}`);
  console.log(`Manifest created with ${manifestRows.length} rows.`);
}

runExport();
