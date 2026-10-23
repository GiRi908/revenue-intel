# Revenue Intelligence Inbox — 5 Slides Summary

---

## Slide 1: The Problem & Executive Findings
**Header:** Revenue Intelligence Inbox: Turning Unstructured Inflow into Managerial Action

### The Manager Problem
Sales leaders receive noisy streams of calls and meetings where:
- Upstream vendor labels contradict actual audio/transcripts.
- Crucial transcripts arrive late after initial sync.
- Conversations serve dual purposes (e.g. support escalation + expansion risk).
- Managers lack clear denominators for true connection and coverage rates.

### Top Findings From Evidence
1. **Upstream Voicemail False Negative (Call C04)**: Upstream labeled as voicemail, but transcript reveals a 4-minute discovery call between Arun and a prospect wanting to replace their dialer.
2. **False-Positive Connects (Calls B11 & B14)**: System reports `is_connected=true`, yet outcome is `unresponsive` with 0s talk time.
3. **Late-Arriving SLA Escalation (Meeting M07)**: Delivered initially with 0 turns due to backlog; update batch reveals critical API latency SLA breach.

---

## Slide 2: Interface Choices & Deliberate Omissions
**Header:** Designing for High-Signal Executive Decision Making

### What We Built
- **Transparent KPI Cards**: Headline metrics with explicit numerator/denominator tooltips (e.g. 19 connected / 30 known calls; 0 unknown).
- **Timezone Normalization**: Grouped by local date (21 Aug 2026, Asia/Kolkata) using `started_at` for calls and `starts_at` for meetings.
- **Evidence-Linked Transcript Viewer**: Clickable evidence items that jump to and highlight exact turn numbers or quotes in the interactive transcript.
- **Freshness Warning System**: Dynamically flags analysis as `stale - awaiting review` when a newer source revision is ingested.

### What We Deliberately Left Out
- **Invented CRM Deal Values**: No pipeline dollar forecasts or artificial win probabilities; only verified customer statements.
- **Cross-Rep Forced Rankings**: Rep activity is displayed transparently without punitive ranking formulas given varying dial volumes.
- **Complex Cloud Databases**: Kept 100% client-side (IndexedDB) for privacy, zero operational cost, and zero API key exposure.

---

## Slide 3: Routing Architecture & A Difficult Decision
**Header:** Multi-Route Deterministic Engine & The C04 Contradiction

### Routing Taxonomy
- **Sales Coaching**: Cold outbound calls with substantive dialogue (C01, C05, C06, C07, C08, C09, C10).
- **Deal Next Steps**: Commercial discussions with explicit commitments (M01, M02, M03, M04, C03).
- **Customer Follow-up (CS)**: Account onboarding, support, and SLA escalations (M07, M09).
- **Internal / Vendor Note**: Internal engineering alignment and vendor capabilities (M06, M10).
- **No-Analysis Log**: Silent or unusable records (voicemails, unresponsiveness, cancellations).
- **Needs Human Review**: Evidence contradicting upstream labels (C04, B11, B14).

### The Difficult Case: Call C04
- **Dilemma**: Should C04 be filed under *Sales Coaching* (because rep Arun did a good job pitching) or *Needs Human Review* (because the upstream system reported it as a voicemail drop)?
- **Resolution**: Routed to *both*! Our multi-route engine assigns *Needs Human Review* to notify operations while preserving coaching value, with a manual override tool enabling manager reassignment.

---

## Slide 4: Verification of Numbers & Analytical Conclusions
**Header:** Audit-Proof Calculations & Traceable Evidence

### Numerical Verification
- **Record Invariance**: Ingesting `01_initial.json` in standard order vs randomized order produces identical results: exactly 44 records, 17 usable transcripts.
- **Denominator Transparency**: Connection rate is strictly calculated on known records (19 / 30 = 63.3%); zero unknown records are hidden.
- **Post-Update Integrity**: Ingesting `02_update.json` updates only M07 (advancing revision from 1 to 2; usable count rises from 17 to 18); re-running initial import skips all 44 records without inflating counts.

### Analytical Traceability
- **Owner Attribution**: Next steps are only assigned when explicitly stated in the dialogue (e.g. Siddharth owns NDA packet for M01; Ananya owns tier discount quote for M04).
- **Honest Uncertainty**: Every analysis dossier includes an explicit section: *"What the evidence does NOT establish"* to prevent dangerous hallucinations.

---

## Slide 5: Trade-offs, Limitations & Future Roadmap
**Header:** Transparent Trade-offs and Production Readiness

### The Key Rejected Decision: Single-Route Exclusivity
- **Considered**: Forcing each conversation into exactly one category.
- **Rejected Because**: Real conversations have multiple operational implications (e.g. M07 is an SLA bug for engineering AND a churn risk for the account executive).
- **Accepted Trade-off**: Total route assignments (48) exceed unique records (44), requiring clear dashboard distinction between assignments and unique entities.

### Known Limitations
- Client-side storage (IndexedDB) does not automatically synchronize across multiple devices without a sync server.
- Fixed date scope (21 August 2026) for the manager briefing.

### What We Would Build Next
1. Team-wide collaborative annotations with WebSockets.
2. Direct bi-directional CRM integration (Salesforce/HubSpot sync).
3. Automated voice-to-text diarization for raw audio uploads.
