import type {
  StoredRecord,
  CallPayload,
  MeetingPayload,
  RouteAssignment,
  RouteName,
  SuggestedRoutes,
  ManualRoutes,
} from './types';
import { hasUsableText } from './types';

/**
 * Deterministic routing engine.
 * Assigns one or more routes to each record based on its data.
 * Each route has a visible reason.
 */
export function computeSuggestedRoutes(record: StoredRecord): SuggestedRoutes {
  const routes: RouteAssignment[] = [];
  const usable = hasUsableText(record);

  if (record.source_type === 'call') {
    const p = record.payload as CallPayload;

    // Check for label-contradicts-text cases
    const needsReview = checkNeedsHumanReview(record);
    if (needsReview.length > 0) {
      routes.push(...needsReview);
    }

    if (!usable) {
      // No-analysis log: voicemail, unresponsive, no text
      const outcome = p.observed_outcome || 'unknown';
      routes.push({
        route: 'no_analysis_log',
        reason: `No usable transcript — source outcome: ${outcome}`,
      });
    } else {
      // Analyse the call content based on metadata
      const callRoutes = routeTranscribedCall(record, p);
      routes.push(...callRoutes);
    }
  } else {
    // Meeting
    const p = record.payload as MeetingPayload;

    if (!usable) {
      // Check unavailable reasons
      const tp = record.transcript_payload;
      const reason = tp?.unavailable_reason || p.recording_status || 'no transcript available';
      routes.push({
        route: 'no_analysis_log',
        reason: `No usable transcript — ${reason}`,
      });
    } else {
      const meetingRoutes = routeTranscribedMeeting(record, p);
      routes.push(...meetingRoutes);
    }
  }

  // Ensure at least one route
  if (routes.length === 0) {
    routes.push({
      route: 'needs_human_review',
      reason: 'Could not determine appropriate route automatically',
    });
  }

  return {
    source_type: record.source_type,
    source_id: record.source_id,
    routes,
  };
}

function checkNeedsHumanReview(record: StoredRecord): RouteAssignment[] {
  const results: RouteAssignment[] = [];

  if (record.source_type === 'call') {
    const p = record.payload as CallPayload;

    // C04 case: labelled voicemail but has transcript text
    if (p.observed_outcome === 'voicemail' && p.transcript && p.transcript.trim().length > 0) {
      results.push({
        route: 'needs_human_review',
        reason: `Label contradicts text: classified as "${p.observed_outcome}" but has a transcript with substantive content`,
      });
    }

    // B11/B14 case: is_connected=true but outcome=unresponsive
    if (p.is_connected === true && (p.observed_outcome === 'unresponsive' || p.observed_outcome === 'cancelled')) {
      results.push({
        route: 'needs_human_review',
        reason: `Label contradicts metadata: is_connected=true but observed_outcome="${p.observed_outcome}"`,
      });
    }
  }

  return results;
}

function routeTranscribedCall(record: StoredRecord, p: CallPayload): RouteAssignment[] {
  const routes: RouteAssignment[] = [];
  const text = (p.transcript || '').toLowerCase();

  // Cold call / SDR outreach patterns
  const isColdCall = text.includes('cold call') ||
    text.includes('introductory sales call') ||
    text.includes('cold introduction') ||
    p.is_campaign_call === true ||
    (p.direction === 'outbound' && p.first_dial_ever === true);

  // Check for active deal signals
  const hasDealSignals = text.includes('proposal') ||
    text.includes('follow up') ||
    text.includes('follow-up') ||
    text.includes('send me') ||
    text.includes('email') ||
    text.includes('pricing') ||
    text.includes('budget');

  // Check for existing customer signals
  const hasCustomerSignals = text.includes('issue') ||
    text.includes('problem') ||
    text.includes('bug') ||
    text.includes('not working');

  // Partnership / advisory signals
  const hasPartnershipSignals = text.includes('partnership') ||
    text.includes('partner') ||
    text.includes('advisory');

  // Voicemail with content (like C04)
  const isVoicemail = p.observed_outcome === 'voicemail';

  if (isVoicemail && p.transcript && p.transcript.trim().length > 0) {
    // C04: voicemail but has real follow-up content
    routes.push({
      route: 'deal_next_steps',
      reason: 'Follow-up message left — contains deal progression context',
    });
  } else if (isColdCall) {
    routes.push({
      route: 'sales_coaching',
      reason: `Outbound prospecting call${p.is_campaign_call ? ' (campaign)' : ''} — coaching opportunity`,
    });

    // Some cold calls also have deal next steps if prospect showed interest
    if (hasDealSignals && !text.includes('not interested') && !text.includes("don't think this is something")) {
      routes.push({
        route: 'deal_next_steps',
        reason: 'Prospect requested information or agreed to follow-up',
      });
    }
  } else if (hasPartnershipSignals) {
    routes.push({
      route: 'deal_next_steps',
      reason: 'Partnership/advisory discussion with follow-up agreed',
    });
  }

  if (hasCustomerSignals && !isColdCall) {
    routes.push({
      route: 'customer_followup_cs',
      reason: 'Existing customer with product/service issues mentioned',
    });
  }

  // If nothing matched, default to sales coaching for transcribed calls
  if (routes.length === 0) {
    routes.push({
      route: 'sales_coaching',
      reason: 'Transcribed call — sales technique and outcome review',
    });
  }

  return routes;
}

function routeTranscribedMeeting(record: StoredRecord, p: MeetingPayload): RouteAssignment[] {
  const routes: RouteAssignment[] = [];
  const turns = record.transcript_payload?.turns || [];
  const allText = turns.map(t => t.text).join(' ').toLowerCase();
  const title = (p.title || '').toLowerCase();

  // Customer support / CS patterns
  const hasCSSignals = allText.includes('issue') ||
    allText.includes('bug') ||
    allText.includes('not working') ||
    allText.includes('workaround') ||
    allText.includes('problem') ||
    allText.includes('stuck') ||
    allText.includes('expired') ||
    allText.includes('cannot') ||
    allText.includes('does not work');

  // Deal / sales evaluation patterns
  const hasDealSignals = allText.includes('proposal') ||
    allText.includes('pricing') ||
    allText.includes('price') ||
    allText.includes('fee') ||
    allText.includes('subscription') ||
    allText.includes('commission') ||
    allText.includes('cost') ||
    allText.includes('commercial');

  // Internal training / vendor evaluation
  const hasInternalSignals = allText.includes('training') ||
    allText.includes('billing') ||
    allText.includes('internal') ||
    title.includes('walkthrough') ||
    title.includes('workflow');

  // Vendor/supplier evaluation (SpendNest evaluating a vendor)
  const hasVendorSignals = allText.includes('integration') && (
    allText.includes('vendor') ||
    allText.includes('supplier') ||
    allText.includes('api') ||
    allText.includes('sandbox')
  );

  // Partnership signals
  const hasPartnershipSignals = allText.includes('partner') ||
    allText.includes('referral') ||
    allText.includes('commission');

  // Customer account onboarding / setup
  const hasOnboardingSignals = allText.includes('account setup') ||
    allText.includes('invitation') ||
    allText.includes('login') ||
    allText.includes('onboarding') ||
    allText.includes('reset');

  // Route assignment
  if (hasCSSignals) {
    routes.push({
      route: 'customer_followup_cs',
      reason: 'Customer reported issues or bugs — follow-up required',
    });
  }

  if (hasOnboardingSignals && !hasDealSignals) {
    routes.push({
      route: 'customer_followup_cs',
      reason: 'Customer account setup/onboarding discussion',
    });
  }

  if (hasDealSignals) {
    if (hasPartnershipSignals) {
      routes.push({
        route: 'deal_next_steps',
        reason: 'Partnership/referral discussion with commercial terms',
      });
    } else {
      routes.push({
        route: 'deal_next_steps',
        reason: 'Active evaluation or pricing discussion — deal progression',
      });
    }
  }

  if (hasInternalSignals && !hasCSSignals && !hasDealSignals) {
    routes.push({
      route: 'internal_vendor_note',
      reason: 'Internal training or workflow session',
    });
  }

  if (hasVendorSignals && !hasCSSignals) {
    routes.push({
      route: 'internal_vendor_note',
      reason: 'Vendor/supplier evaluation — integration assessment',
    });
  }

  // Sales coaching for any meeting with customer interaction
  if (hasDealSignals && turns.some(t => t.speaker.startsWith('Customer'))) {
    routes.push({
      route: 'sales_coaching',
      reason: 'Customer-facing meeting with coaching opportunities',
    });
  }

  // Deduplicate routes
  const seen = new Set<RouteName>();
  const deduped: RouteAssignment[] = [];
  for (const r of routes) {
    if (!seen.has(r.route)) {
      seen.add(r.route);
      deduped.push(r);
    }
  }

  if (deduped.length === 0) {
    deduped.push({
      route: 'needs_human_review',
      reason: 'Could not determine appropriate route automatically',
    });
  }

  return deduped;
}

/**
 * Get the effective routes for a record (manual override takes precedence)
 */
export function getEffectiveRoutes(
  suggested: SuggestedRoutes | undefined,
  manual: ManualRoutes | undefined
): { routes: RouteAssignment[]; isManual: boolean } {
  if (manual && manual.routes !== null) {
    return { routes: manual.routes, isManual: true };
  }
  if (suggested) {
    return { routes: suggested.routes, isManual: false };
  }
  return {
    routes: [{ route: 'needs_human_review', reason: 'No routing information available' }],
    isManual: false,
  };
}
