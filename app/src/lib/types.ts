// ─── Source Record Types ───────────────────────────────────────

export interface CallPayload {
  id: string;
  external_call_id: string;
  workspace_slug: string;
  rep_email: string | null;
  rep_name: string | null;
  rep_user_id: string | null;
  direction: string;
  direction_raw: string;
  from_number: string | null;
  to_number: string | null;
  started_at: string;
  duration_seconds: number;
  talk_time_seconds: number | null;
  speaker_count: number | null;
  segment_count: number | null;
  is_connected: boolean | null;
  is_conversation: boolean | null;
  observed_outcome: string | null;
  classification_reason: string | null;
  classification_status: string | null;
  is_campaign_call: boolean | null;
  first_dial_ever: boolean | null;
  first_connect_ever: boolean | null;
  prior_dials_ever: number | null;
  prior_connects_ever: number | null;
  summary: string | null;
  summary_status: string | null;
  transcript: string | null;
}

export interface MeetingPayload {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  duration_seconds: number;
  provider: string;
  join_url: string;
  organizer_email: string | null;
  attendee_count: number | null;
  recording_status: string;
  recording_detail: string | null;
  recording_id: string | null;
  has_transcript: boolean;
  has_video: boolean;
  summary: string | null;
  summary_status: string | null;
  redacted: boolean;
}

export interface TranscriptTurn {
  speaker: string;
  starts_at_seconds: number;
  timecode: string;
  text: string;
}

export interface TranscriptPayload {
  meeting_id: string;
  turns: TranscriptTurn[];
  unavailable_reason: string | null;
}

// ─── Delivery Envelope ─────────────────────────────────────────

export interface DeliveryRecord {
  record_ref: string;
  source_type: 'call' | 'meeting';
  source_id: string;
  payload: CallPayload | MeetingPayload;
  transcript_payload: TranscriptPayload | null;
}

export interface DeliveryBatch {
  batch_id: string;
  revision: number;
  exported_at: string;
  records: DeliveryRecord[];
}

// ─── Stored Record (IndexedDB) ─────────────────────────────────

export interface StoredRecord {
  source_type: 'call' | 'meeting';
  source_id: string;
  record_ref: string;
  applied_revision: number;
  payload: CallPayload | MeetingPayload;
  transcript_payload: TranscriptPayload | null;
  imported_at: string;
}

// ─── Routing ────────────────────────────────────────────────────

export type RouteName =
  | 'sales_coaching'
  | 'deal_next_steps'
  | 'customer_followup_cs'
  | 'internal_vendor_note'
  | 'no_analysis_log'
  | 'needs_human_review';

export const ROUTE_LABELS: Record<RouteName, string> = {
  sales_coaching: 'Sales Coaching',
  deal_next_steps: 'Deal Next Steps',
  customer_followup_cs: 'Customer Follow-up (CS)',
  internal_vendor_note: 'Internal/Vendor Note',
  no_analysis_log: 'No-analysis Log',
  needs_human_review: 'Needs Human Review',
};

export const ROUTE_COLORS: Record<RouteName, string> = {
  sales_coaching: '#6366f1',       // indigo
  deal_next_steps: '#0ea5e9',      // sky
  customer_followup_cs: '#f59e0b', // amber
  internal_vendor_note: '#8b5cf6', // violet
  no_analysis_log: '#6b7280',      // gray
  needs_human_review: '#ef4444',   // red
};

export interface RouteAssignment {
  route: RouteName;
  reason: string;
}

export interface SuggestedRoutes {
  source_type: 'call' | 'meeting';
  source_id: string;
  routes: RouteAssignment[];
}

export interface ManualRoutes {
  source_type: 'call' | 'meeting';
  source_id: string;
  routes: RouteAssignment[] | null; // null = use suggestion
  updated_at: string;
}

// ─── Analysis ───────────────────────────────────────────────────

export interface EvidenceItem {
  type: 'quote' | 'turn';
  ref: string;          // record_ref
  text: string;
  turn?: number;        // 1-based for meetings
}

export interface Analysis {
  source_type: 'call' | 'meeting';
  source_id: string;
  record_ref: string;
  source_revision: number;
  summary: string;
  evidence: EvidenceItem[];
  not_established: string;
  next_steps: { action: string; owner: string | null } | null;
  pre_generated: boolean;
}

export type AnalysisFreshness = 'current' | 'stale - awaiting review';

export interface StoredAnalysis extends Analysis {
  freshness?: AnalysisFreshness; // computed, not stored
}

// ─── Import Log ─────────────────────────────────────────────────

export interface ImportLogEntry {
  timestamp: string;
  action: string;
  batch_id: string;
  revision: number;
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
}

// ─── Review State ───────────────────────────────────────────────

export type ReviewState =
  | 'routed'
  | 'needs_review'
  | 'reviewed'
  | 'no_analysis';

// ─── Helper: check usable text ─────────────────────────────────

export function hasUsableText(record: StoredRecord): boolean {
  if (record.source_type === 'call') {
    const p = record.payload as CallPayload;
    return p.transcript !== null && p.transcript.trim().length > 0;
  } else {
    const tp = record.transcript_payload;
    return tp !== null && tp.turns.length > 0 && tp.turns.some(t => t.text.trim().length > 0);
  }
}

// ─── Helper: get person label ──────────────────────────────────

export function getPersonLabel(record: StoredRecord): string {
  if (record.source_type === 'call') {
    return (record.payload as CallPayload).rep_name || 'Unknown Rep';
  } else {
    return (record.payload as MeetingPayload).organizer_email || 'Unknown Organizer';
  }
}

export function getPersonType(record: StoredRecord): 'rep' | 'organizer' {
  return record.source_type === 'call' ? 'rep' : 'organizer';
}

// ─── Helper: get activity date in Asia/Kolkata ─────────────────

export function getActivityDate(record: StoredRecord): string {
  const ts = record.source_type === 'call'
    ? (record.payload as CallPayload).started_at
    : (record.payload as MeetingPayload).starts_at;
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' });
}

export function getActivityTimestamp(record: StoredRecord): string {
  const ts = record.source_type === 'call'
    ? (record.payload as CallPayload).started_at
    : (record.payload as MeetingPayload).starts_at;
  return ts;
}

// ─── Export manifest row ────────────────────────────────────────

export interface ManifestRow {
  source_type: string;
  source_id: string;
  record_ref: string;
  applied_revision: number;
  routes: string;
  output_paths: string;
  review_state: string;
  manual_override: boolean;
  analysis_freshness: string;
}
