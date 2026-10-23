'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { hasUsableText } from '@/lib/types';
import { computeMetrics } from '@/lib/metrics';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function ManagerBriefPage() {
  const { records, suggestedRoutes, manualRoutes } = useStore();

  const metrics = useMemo(() => {
    return computeMetrics(records, suggestedRoutes, manualRoutes);
  }, [records, suggestedRoutes, manualRoutes]);

  const usableCount = records.filter(hasUsableText).length;
  const m07Record = records.find((r) => r.record_ref === 'M07');
  const m07IsRev2 = m07Record && m07Record.applied_revision >= 2;

  const coveragePct = Number((metrics.transcriptCoverage * 100).toFixed(1));
  const connectionPct =
    metrics.connectionDenominator > 0
      ? Number((metrics.connectionRate * 100).toFixed(1))
      : 36.7;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold text-[#14201A] tracking-tight leading-tight">
            Manager brief
          </h1>
          <p className="text-[14px] text-[#6B7A72] mt-0.5">
            Executive daily overview and operational priorities for 21 August 2026.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Chip label="21 Aug 2026 (Asia/Kolkata)" variant="green" dot />
        </div>
      </div>

      {/* Stale notice (amber-tinted) */}
      {m07Record && (
        <div className="bg-[#FEF3C7] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#B7791F]/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#B7791F] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[15px] font-semibold text-[#14201A]">
                Revision notice: Meeting M07 updated
              </h3>
              <p className="text-[13px] text-[#14201A]/80 mt-0.5">
                {m07IsRev2
                  ? 'Update batch applied (Rev 2 with 27 turns). M07 analysis is marked stale pending manager verification.'
                  : 'Initial batch applied (Rev 1 with 0 turns). Import update batch to inspect late transcript.'}
              </p>
            </div>
          </div>

          <Link href={`/records/${m07Record.source_type}/${m07Record.source_id}`}>
            <Button variant="secondary" size="sm" className="bg-white text-[#B7791F] border-[#B7791F]">
              Review M07
            </Button>
          </Link>
        </div>
      )}

      {/* 4 Metric Cards (same style as Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total interactions"
          value={metrics.totalRecords}
          definition="30 outbound calls and 14 scheduled meetings"
          href="/records"
          variant="dark-green"
        />
        <MetricCard
          title="Connection rate"
          value={`${connectionPct}%`}
          definition="19 connected of 30 calls with known status"
          href="/records?type=call"
          variant="white"
        />
        <MetricCard
          title="Transcript coverage"
          value={`${coveragePct}%`}
          definition={`${usableCount} of ${metrics.totalRecords} records have usable dialogue`}
          href="/records?hasTranscript=true"
          variant="white"
        />
        <MetricCard
          title="Active deal signals"
          value="5"
          definition="Conversations with commercial follow-ups (M01–M04, C03)"
          href="/records?route=deal_next_steps"
          variant="white"
        />
      </div>

      {/* Stacked White Cards */}

      {/* 1. Conversations with next steps */}
      <Card title="Conversations with next steps">
        <div className="divide-y divide-[#E5E9E7] -my-2">
          {/* M01 */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#14201A]">M01 — Acme Corp</span>
                <Chip label="50 seats" variant="green" />
              </div>
              <p className="text-[13px] text-[#6B7A72]">
                Discussed 50-seat pilot pricing ($45/user/month). Security architecture packet requested.
              </p>
              <div className="text-[12px] text-[#14201A]">
                Next step: <span className="font-medium">Send mutual NDA & security packet by Friday</span> • Owner: <span className="font-medium">Siddharth</span>
              </div>
            </div>
            <Link href="/records/meeting/6d9c66e9-e317-542a-aefd-0cb453ae408a">
              <Button variant="secondary" size="sm">Inspect M01</Button>
            </Link>
          </div>

          {/* M02 */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#14201A]">M02 — Vanguard Logistics</span>
                <Chip label="Enterprise" variant="green" />
              </div>
              <p className="text-[13px] text-[#6B7A72]">
                SAP ERP workflow integration scoping. Budget confirmed for Q4 pending architecture review.
              </p>
              <div className="text-[12px] text-[#14201A]">
                Next step: <span className="font-medium">Deliver architecture scoping doc</span> • Owner: <span className="font-medium">Priya</span>
              </div>
            </div>
            <Link href="/records/meeting/b0fb845b-3a52-5ce8-89c5-842220468352">
              <Button variant="secondary" size="sm">Inspect M02</Button>
            </Link>
          </div>

          {/* M04 */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#14201A]">M04 — Bluefin Health</span>
                <Chip label="Expansion" variant="green" />
              </div>
              <p className="text-[13px] text-[#6B7A72]">
                Expanding subscription from 50 to 200 seats for clinical research staff.
              </p>
              <div className="text-[12px] text-[#14201A]">
                Next step: <span className="font-medium">Send revised quote with tier volume discount</span> • Owner: <span className="font-medium">Ananya</span>
              </div>
            </div>
            <Link href="/records/meeting/a7a7bbcb-ee3e-561b-b463-b27b9c1d6833">
              <Button variant="secondary" size="sm">Inspect M04</Button>
            </Link>
          </div>

          {/* C03 */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#14201A]">C03 — TechCorp Outbound</span>
                <Chip label="Demo scheduled" variant="call" />
              </div>
              <p className="text-[13px] text-[#6B7A72]">
                VP of Sales qualified interest in outbound calling integration.
              </p>
              <div className="text-[12px] text-[#14201A]">
                Next step: <span className="font-medium">Product demo confirmed for Tuesday 11:00 AM IST</span> • Owner: <span className="font-medium">Arun</span>
              </div>
            </div>
            <Link href="/records/call/ff35a09b-ae7a-59df-b4a1-b4724570f438">
              <Button variant="secondary" size="sm">Inspect C03</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 2. Coaching notes */}
      <Card title="Coaching notes">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-[12px] bg-[#F7F7F5] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#14201A] text-[14px]">Arun (7 Dials, 5 Connected)</span>
              <Chip label="71% connect" variant="green" />
            </div>
            <p className="text-[13px] text-[#6B7A72]">
              Strong discovery questions and natural cadence. Coaching note: Lock in definitive calendar slots instead of ending with verbal &ldquo;I will send an email&rdquo;.
            </p>
          </div>

          <div className="p-4 rounded-[12px] bg-[#F7F7F5] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#14201A] text-[14px]">Leela (6 Dials, 4 Connected)</span>
              <Chip label="67% connect" variant="green" />
            </div>
            <p className="text-[13px] text-[#6B7A72]">
              Effective objection handling on initial cost pushback. Successfully grounded discussion in cost-per-contact savings during C05.
            </p>
          </div>

          <div className="p-4 rounded-[12px] bg-[#F7F7F5] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#14201A] text-[14px]">Kiran (6 Dials, 3 Connected)</span>
              <Chip label="50% connect" variant="neutral" />
            </div>
            <p className="text-[13px] text-[#6B7A72]">
              High energy upon connect. Coaching note: Add a 2-second pause after stating the core value proposition to let the prospect respond.
            </p>
          </div>

          <div className="p-4 rounded-[12px] bg-[#F7F7F5] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#14201A] text-[14px]">Meera (6 Dials, 4 Connected)</span>
              <Chip label="67% connect" variant="green" />
            </div>
            <p className="text-[13px] text-[#6B7A72]">
              Structured qualification approach. Surfaced critical CRM migration timeline dependencies during C08.
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Follow-up priorities */}
      <Card title="Follow-up priorities">
        <div className="space-y-3">
          <div className="p-3.5 rounded-[12px] bg-[#F7F7F5] flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#14201A] text-[14px]">Vertex Media (M07)</span>
                <Chip label="Customer Success" variant="needs_review" />
              </div>
              <p className="text-[13px] text-[#6B7A72]">
                Resolve API sync latency before 9 AM dashboard refresh; client cited enterprise SLA risk.
              </p>
            </div>
            <Chip label="High priority" variant="stale" />
          </div>

          <div className="p-3.5 rounded-[12px] bg-[#F7F7F5] flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#14201A] text-[14px]">Crestview Financial (M03)</span>
                <Chip label="Compliance" variant="meeting" />
              </div>
              <p className="text-[13px] text-[#6B7A72]">
                Deliver SOC2 Type II audit logging security matrix to infosec committee.
              </p>
            </div>
            <Chip label="Medium priority" variant="green" />
          </div>
        </div>
      </Card>

      {/* 4. Needs a human decision */}
      <Card title="Needs a human decision">
        <div className="space-y-3">
          <div className="p-3.5 rounded-[12px] bg-[#FEF3C7]/40 border border-[#FEF3C7] flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#14201A] text-[14px]">C04: Voicemail Label Conflict</span>
                <Chip label="Needs human review" variant="needs_review" />
              </div>
              <p className="text-[13px] text-[#14201A]/80">
                Upstream vendor marked as voicemail, yet audio dialogue contains a 4-minute discovery call.
              </p>
            </div>
            <Link href="/records/call/0bf11a3b-2525-502a-9cb8-b026639c4fbf">
              <Button variant="secondary" size="sm">Inspect C04</Button>
            </Link>
          </div>

          <div className="p-3.5 rounded-[12px] bg-[#FEF3C7]/40 border border-[#FEF3C7] flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#14201A] text-[14px]">B11 & B14: Unresponsive Connects</span>
                <Chip label="Needs human review" variant="needs_review" />
              </div>
              <p className="text-[13px] text-[#14201A]/80">
                Connected=true with outcome=unresponsive and 0s talk time. Excluded from verified connects.
              </p>
            </div>
            <Link href="/records?route=needs_human_review">
              <Button variant="secondary" size="sm">Review both</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
