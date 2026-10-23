# Revenue Intelligence Inbox & Analytics

A client-side revenue intelligence workspace built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **IndexedDB**. Designed for sales leadership and operations managers to ingest call and meeting records, execute deterministic routing, inspect verifiable transcripts and evidence citations, manage manual route corrections, and export audit-ready archives.

Zero external backend, zero database server, and zero API keys required. Deployable on Vercel with zero configuration.

---

## 1. Quick Start & Setup

### Prerequisites
- Node.js 18+ (tested on Node v20/v22)
- npm 9+

### Running Locally
```bash
# Navigate to the app directory
cd app

# Install dependencies
npm install

# Start development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> **Automatic Demo Loading**: On your very first visit, the app automatically loads both delivery batches (44 records, 18 usable transcripts) so you can explore immediately without pressing any buttons.

### Running Automated Replay Tests
All 6 replay verification steps are verified by automated end-to-end tests using Vitest with `fake-indexeddb`:
```bash
cd app
npm test
```
*Result: 6 tests pass in <100ms.*

### Generating Standalone Exports to Disk
In addition to the in-browser ZIP download, a Node-based CLI script is provided:
```bash
cd app
npm run export
```
This writes the full route-organized folder hierarchy and `manifest.csv` directly into `app/exports/`.

---

## 2. Replay & State Invariance Reproduction

Reviewers can verify the complete replay contract either via the top action bar in the UI or by running `npm test`:

| Step | UI Action | Expected & Observed Result |
|---|---|---|
| **1. Initial import** | Click **"Import initial"** | Loads `01_initial.json` (revision 1). Exactly **44 unique records** ingested, **17 usable texts**. M07 has 0 turns. |
| **2. Order invariance** | Click **"Import initial (shuffled)"** | Re-imports `01_initial.json` in randomized Fisher-Yates order. Record count remains strictly **44**. 0 inserted, 44 skipped. No duplicates. |
| **3. Manual correction** | Navigate to `M07` (`/records/meeting/892a0129-d5c4-5d95-b0f3-2479f64dbcd1`), select a route override (e.g. *Deal Next Steps*), and click **Apply Override**. | Manual override is stored in the independent `manualRoutes` store. Badge reflects *Manual Override Active*. |
| **4. Late update** | Click **"Import update"** | Ingests `02_update.json` (revision 2). M07's payload and transcript are replaced (now 27 turns, **18 usable texts** total). M07's manual route remains **completely preserved**. Analysis freshness shows `stale - awaiting review`. |
| **5. Repeat replay** | Click **"Import initial"** again | Revision 1 batch is ignored because M07 already holds revision 2 data (`applied_revision: 2`). Record count remains 44, M07 keeps its 27 turns, and manual route is untouched. |
| **6. Persistence** | Refresh the browser (F5) or restart server | All records, suggested routes, manual overrides, and import audit logs persist intact in IndexedDB. |

---

## 3. Pre-Generated vs Dynamic Runtime Execution

To ensure total transparency regarding AI usage and runtime computations:

### Pre-Generated (Prepared Beforehand)
- **`public/data/analysis.json`**: Pre-generated analytical dossiers for all 18 real-derived conversations. Each dossier contains an executive summary, exact verifiable evidence items (exact quote strings for calls, turn numbers for meetings), an explicit *"What the evidence does NOT establish"* clause, and owner-attributed next steps.
- **`src/app/brief/page.tsx`**: A manager briefing tailored specifically to **21 August 2026 (Asia/Kolkata)**.

### Computed Dynamically at Runtime
- **Record Ingestion & Identity**: Composite key `(source_type, source_id)` matching and revision checks (`batch.revision > existing.applied_revision`).
- **Deterministic Multi-Route Engine**: Analyzes conversation text, durations, call outcomes, and edge-case signals to assign routes with transparent reasons in real time.
- **Analysis Freshness Tracking**: Compares record `applied_revision` against `analysis.source_revision`. If a record receives a higher revision (e.g. M07 receiving rev 2), its analysis is dynamically flagged as `stale - awaiting review`.
- **Manual Overrides**: Stored in a decoupled `manualRoutes` IndexedDB store that is never overwritten by data imports.
- **Metrics Aggregation**: Calculates coverage, connection rates, and person distributions with strict denominator rules on every filter change.
- **In-Browser ZIP Export**: Packages markdown files and builds `manifest.csv` dynamically via JSZip and file-saver.

---

## 4. Metric & Denominator Definitions

Every dashboard metric displays a definition tooltip and explicit denominator:

| Headline Metric | Numerator | Denominator | Caveats & Rules |
|---|---|---|---|
| **Selected Records** | Matching records | Total records in IndexedDB (44) | Grouped by selected person or source type. |
| **Activity Date** | Activity on 21 Aug 2026 | Total interactions (44) | Timestamps converted to `Asia/Kolkata` time (calls by `started_at`, meetings by `starts_at`). |
| **Transcript Coverage** | Records with usable text (17 initial, 18 post-update) | All selected records (44) | Usable text requires a non-blank call `transcript` or meeting `turns` array with length > 0 and non-blank text. |
| **Connection Rate** | Calls with `is_connected === true` (19) | Calls with non-null `is_connected` (30) | Upstream vendor classifier. Null values (0 in this dataset) are tracked separately as "unknown" and excluded from the denominator. |
| **Route Assignments** | Total route assignments (48) | Unique routed records (44) | Multi-route allowed: records can legitimately belong to multiple categories (e.g. CS Follow-up and Internal Note). |

---

## 5. Export Structure & Manifest

The export system produces an archive structured by route folders:

```
exports/
├── manifest.csv
├── sales-coaching/
│   ├── C01_call.md
│   ├── C05_call.md
│   └── ...
├── deal-next-steps/
│   ├── M01_meeting.md
│   ├── M02_meeting.md
│   └── ...
├── customer-followup-cs/
│   ├── M07_meeting.md
│   └── ...
├── internal-vendor-note/
│   └── ...
├── no-analysis-log/
│   ├── B01_call.md
│   └── ...
└── needs-human-review/
    ├── C04_call.md
    ├── B11_call.md
    └── B14_call.md
```

### Manifest Schema (`manifest.csv`)
- `source_type`: `call` | `meeting`
- `source_id`: UUID
- `record_ref`: Human reference (`C01`–`C10`, `B01`–`B20`, `M01`–`M14`)
- `applied_revision`: Integer revision number (1 or 2)
- `routes`: Semicolon-delimited route names
- `output_paths`: Semicolon-delimited relative file paths
- `review_state`: `routed` | `needs_review` | `no_analysis`
- `manual_override`: `true` | `false`
- `analysis_freshness`: `current` | `stale - awaiting review` | `no analysis`

---

## 6. Three Most Important Findings

### Finding 1: Upstream Classification Contradiction on C04
- **Observation**: Call `C04` was classified upstream with `observed_outcome = "voicemail"` and `talk_time_seconds = 0`, but the record contains a full 4-minute interactive conversation between sales rep Arun and a prospect.
- **Supporting Source Passage**:
  > *"Hey Arun, yeah I can give you five minutes before my next meeting. We've been looking at replacing our existing outbound dialer because our reps complain about audio lag."* (Call C04 transcript)
- **Product Impact**:
  - Influenced the **Deterministic Routing Rule** in `src/lib/routing.ts` (`checkNeedsHumanReview`), which inspects whether a call labeled voicemail has transcript content.
  - Automatically routes `C04` to **Needs Human Review** with reason: *"Observed outcome was voicemail but record contains interactive transcript"*.
  - Displayed prominently in the Dashboard's **Key Signals** panel and Manager Brief.

### Finding 2: False Positive Connects on B11 & B14
- **Observation**: Records `B11` and `B14` report `is_connected = true`, yet their `observed_outcome` is `"unresponsive"` and talk time is 0 seconds.
- **Supporting Source Passage**:
  > Call B11 & B14 metadata: `is_connected: true`, `observed_outcome: "unresponsive"`, `talk_time_seconds: null`, `duration_seconds: 12`.
- **Product Impact**:
  - Prevented inflated SDR connect metrics by routing both records to **Needs Human Review**.
  - Informed the Connection Rate metric card tooltip in `src/components/MetricCard.tsx`, clarifying that `is_connected` is an unverified upstream label rather than an audit-confirmed human conversation.

### Finding 3: Customer Escalation & Late Delivery on M07
- **Observation**: Meeting `M07` with Vertex Media initially had `has_transcript: true` but 0 turns with `unavailable_reason: "processing_backlog"`. The update batch delivered 27 turns documenting a severe SLA breach risk.
- **Supporting Source Passage**:
  > *Turn 8 (Ananya)*: *"Our analytics team can't refresh executive dashboards before 9 AM because the API sync job takes over three hours now. We're on the Enterprise tier and this violates our SLA."* (Meeting M07, Turn 8)
- **Product Impact**:
  - Route classification assigned to **Customer Follow-up (CS)**.
  - Demonstrated the update batch pipeline: upon importing revision 2, M07 automatically transitions from having no transcript to 27 turns, while its analysis badge dynamically flags `stale - awaiting review` to require manager sign-off.

---

## 7. One Deliberately Rejected Decision

- **Rejected Choice**: Enforcing a single-route, mutually exclusive taxonomy (assigning exactly one route per conversation).
- **Why Rejected**: Real-world revenue conversations frequently carry multiple organizational obligations. For example:
  - `M07` is simultaneously a critical Customer Success issue (SLA breach risk) and a Deal Next Steps consideration (preventing contract churn).
  - `M06` and `M10` discuss both vendor capabilities and internal engineering training.
  - `C04` contains useful sales coaching material while simultaneously demanding operations review due to erroneous voicemail labeling.
- **Accepted Trade-off**: The total count of route assignments (48) exceeds the count of unique source records (44).
- **Resulting Product Choice**:
  - The Dashboard explicitly decouples **"Route Assignments"** from **"Unique Records"**, displaying both prominently with tooltip explanations.
  - The export system writes the markdown dossier into *each* relevant route folder while tracking all output paths in a single semicolon-delimited field in `manifest.csv`.

---

## 8. Development Time & Known Limitations

- **Approximate Hours Spent**: ~7.5 hours
  - Planning, data contract & dictionary analysis: 1.5 hrs
  - Core data layer (IndexedDB, deterministic routing, import engine): 2.0 hrs
  - Pre-generated analysis compilation & evidence verification: 1.5 hrs
  - UI components, dashboard, transcript viewer, and manager brief: 1.5 hrs
  - Export system, Vitest replay tests, and documentation: 1.0 hr

### Known Limitations
1. **Client-Side Storage Scope**: State is persisted in browser IndexedDB. Overrides and audit logs are unique to each browser and do not sync across different machines without an external database.
2. **Media Playback**: Raw audio/video files were omitted from the dataset by design; the interface focuses on time-coded transcripts and textual metadata.
3. **Fixed Brief Date**: The Manager Brief is tailored specifically to the dataset date of 21 August 2026.
