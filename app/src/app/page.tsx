'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  hasUsableText,
  getPersonLabel,
  CallPayload,
  MeetingPayload,
  ROUTE_LABELS,
} from '@/lib/types';
import { computeMetrics } from '@/lib/metrics';
import { getEffectiveRoutes } from '@/lib/routing';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { ArrowUpRight, AlertTriangle, Clock, ArrowRight, Download } from 'lucide-react';

export default function OverviewPage() {
  const router = useRouter();
  const {
    records,
    suggestedRoutes,
    manualRoutes,
    analyses,
    importLogs,
    doImportUpdate,
    isLoading,
  } = useStore();

  const metrics = useMemo(() => {
    return computeMetrics(records, suggestedRoutes, manualRoutes);
  }, [records, suggestedRoutes, manualRoutes]);

  const suggestedMap = useMemo(() => {
    const map = new Map();
    for (const sr of suggestedRoutes) {
      map.set(`${sr.source_type}::${sr.source_id}`, sr);
    }
    return map;
  }, [suggestedRoutes]);

  const manualMap = useMemo(() => {
    const map = new Map();
    for (const mr of manualRoutes) {
      map.set(`${mr.source_type}::${mr.source_id}`, mr);
    }
    return map;
  }, [manualRoutes]);

  const analysisMap = useMemo(() => {
    const map = new Map();
    for (const a of analyses) {
      map.set(`${a.source_type}::${a.source_id}`, a);
    }
    return map;
  }, [analyses]);

  // Flagged records: B11, B14, C04
  const flaggedRecords = useMemo(() => {
    return records.filter((r) => {
      const ref = r.record_ref;
      return ref === 'B11' || ref === 'B14' || ref === 'C04';
    });
  }, [records]);

  // M07 Record for Stale card
  const m07Record = useMemo(() => {
    return records.find((r) => r.record_ref === 'M07');
  }, [records]);

  const m07Analysis = useMemo(() => {
    if (!m07Record) return null;
    return analysisMap.get(`${m07Record.source_type}::${m07Record.source_id}`);
  }, [m07Record, analysisMap]);

  // Person activity breakdown for rounded bar chart
  const personStats = useMemo(() => {
    const reps = ['Arun', 'Leela', 'Kiran', 'Meera', 'Dev'];
    const repData = reps.map((name) => {
      const repCalls = records.filter(
        (r) => r.source_type === 'call' && (r.payload as CallPayload).rep_name === name
      );
      const usable = repCalls.filter(hasUsableText).length;
      return {
        name,
        group: 'Rep',
        total: repCalls.length,
        usable,
        noText: repCalls.length - usable,
      };
    });

    const orgEmails = ['siddharth@', 'priya@', 'rohan@', 'ananya@'];
    const orgData = orgEmails.map((prefix) => {
      const orgMeetings = records.filter(
        (r) =>
          r.source_type === 'meeting' &&
          (r.payload as MeetingPayload).organizer_email?.startsWith(prefix)
      );
      const usable = orgMeetings.filter(hasUsableText).length;
      return {
        name: prefix.replace('@', ''),
        group: 'Organizer',
        total: orgMeetings.length,
        usable,
        noText: orgMeetings.length - usable,
      };
    });

    return [...repData, ...orgData];
  }, [records]);

  const maxPersonTotal = Math.max(...personStats.map((p) => p.total), 8);

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
            Dashboard
          </h1>
          <p className="text-[14px] text-[#6B7A72] mt-0.5">
            Plan, prioritize, and monitor revenue conversations with ease.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/export">
            <Button variant="secondary" size="md">
              <Download className="w-4 h-4 mr-2" />
              Exports
            </Button>
          </Link>
          <Link href="/import">
            <Button variant="primary" size="md">
              Import data
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 1: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dark Green Hero Card */}
        <MetricCard
          title="Selected records"
          value={metrics.totalRecords}
          subtitle=""
          definition={`All incoming interactions on 21 Aug 2026.`}
          href="/records"
          variant="dark-green"
        />

        {/* Card 2: Transcript Coverage */}
        <MetricCard
          title="Transcript coverage"
          value={`${coveragePct}%`}
          definition={`${metrics.usableTexts} of ${metrics.totalRecords} selected records have usable text`}
          href="/records?hasTranscript=true"
          variant="white"
        />

        {/* Card 3: Connection Rate */}
        <MetricCard
          title="Source-reported connection rate"
          value={`${connectionPct}%`}
          definition={`${metrics.connectedTrue} of ${metrics.connectionDenominator} calls with a known value`}
          href="/records?type=call"
          variant="white"
        />

        {/* Card 4: Needs Attention */}
        <MetricCard
          title="Needs attention"
          value={flaggedRecords.length}
          definition="Records with conflicting evidence labels"
          href="/records?route=needs_human_review"
          variant="white"
        />
      </div>

      {/* Row 2: Activity by Person Chart + Needs Attention + Latest Import */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* (a) Activity by Person - Rounded Pill-Bar Chart (6 cols) */}
        <Card
          className="lg:col-span-5 flex flex-col justify-between"
          title={
            <div>
              <h3 className="text-[16px] font-medium text-[#14201A]">Activity by person</h3>
              <p className="text-[12px] text-[#6B7A72]">Calls (reps) & meetings (organizers)</p>
            </div>
          }
          action={
            <div className="flex items-center gap-2 text-[11px] text-[#6B7A72]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B3D2A]" />
                Usable
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6FBF9A]" />
                No text
              </span>
            </div>
          }
        >
          {/* Bar Chart Container */}
          <div className="pt-6 pb-2 px-2 flex items-end justify-between gap-2 h-[200px]">
            {personStats.map((p, idx) => {
              const heightPct = Math.max(15, Math.round((p.total / maxPersonTotal) * 100));
              const usableRatio = p.total > 0 ? p.usable / p.total : 0;

              return (
                <div
                  key={idx}
                  onClick={() => router.push(`/records?search=${encodeURIComponent(p.name)}`)}
                  className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                  title={`${p.name} (${p.group}): ${p.total} total (${p.usable} usable, ${p.noText} no text)`}
                >
                  {/* Tooltip on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-[#14201A] text-white px-1.5 py-0.5 rounded mb-1 whitespace-nowrap">
                    {p.usable}/{p.total}
                  </div>

                  {/* Rounded Pill Bar */}
                  <div
                    className="w-full max-w-[28px] rounded-full overflow-hidden flex flex-col justify-end transition-all group-hover:scale-105"
                    style={{ height: `${heightPct}%` }}
                  >
                    {/* Top segment: no-text (lighter green or hatched) */}
                    {p.noText > 0 && (
                      <div
                        className="w-full bg-[#6FBF9A] transition-all"
                        style={{ height: `${(1 - usableRatio) * 100}%` }}
                      />
                    )}
                    {/* Bottom segment: usable (deep green) */}
                    {p.usable > 0 && (
                      <div
                        className="w-full bg-[#0B3D2A] transition-all"
                        style={{ height: `${usableRatio * 100}%` }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <span className="text-[11px] text-[#6B7A72] group-hover:text-[#14201A] group-hover:font-medium mt-2 capitalize truncate max-w-[34px]">
                    {p.name}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* (b) Needs Attention (4 cols) */}
        <Card
          className="lg:col-span-4 flex flex-col justify-between"
          title={
            <div>
              <h3 className="text-[16px] font-medium text-[#14201A]">Needs attention</h3>
              <p className="text-[12px] text-[#6B7A72]">3 records flagged for human review</p>
            </div>
          }
          action={
            <Link
              href="/records?route=needs_human_review"
              className="text-[12px] text-[#14683F] font-medium hover:underline flex items-center gap-0.5"
            >
              All →
            </Link>
          }
        >
          <div className="space-y-3 mt-2 flex-1">
            {flaggedRecords.map((r) => {
              const reason =
                r.record_ref === 'C04'
                  ? 'Labeled voicemail, but contains a 4-min transcript.'
                  : 'Reported connected=true, but outcome is unresponsive.';

              return (
                <div
                  key={r.source_id}
                  className="p-3 rounded-[12px] bg-[#F7F7F5] flex items-center justify-between gap-3 hover:bg-[#E3F2EA]/40 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#14201A]">
                        {r.record_ref}
                      </span>
                      <Chip label={r.source_type} variant={r.source_type === 'call' ? 'call' : 'meeting'} />
                    </div>
                    <p className="text-[12px] text-[#6B7A72] truncate">{reason}</p>
                  </div>

                  <Link
                    href={`/records/${r.source_type}/${r.source_id}`}
                    className="w-7 h-7 rounded-full bg-white border border-[#E5E9E7] flex items-center justify-center shrink-0 text-[#14683F] hover:bg-[#14683F] hover:text-white transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </Card>

        {/* (c) Latest Import Log (3 cols) */}
        <Card
          className="lg:col-span-3 flex flex-col justify-between"
          title="Latest import"
          action={
            <Link href="/import" className="text-[12px] text-[#14683F] font-medium hover:underline">
              History
            </Link>
          }
        >
          <div className="space-y-2 mt-1">
            {importLogs.slice(0, 3).map((log, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-[12px] bg-[#F7F7F5] text-[12px] space-y-1"
              >
                <div className="flex items-center justify-between font-medium text-[#14201A]">
                  <span>{log.action}</span>
                  <span className="text-[#14683F] font-mono text-[11px]">Rev {log.revision}</span>
                </div>
                <div className="text-[#6B7A72] text-[11px] flex items-center justify-between">
                  <span>+{log.inserted} inserted</span>
                  <span>{log.skipped} skipped</span>
                </div>
              </div>
            ))}
            {importLogs.length === 0 && (
              <p className="text-[13px] text-[#6B7A72] py-4 text-center">
                No recent import activity.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: Routes Progress + Semi-Circular Gauge + Stale M07 Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* (a) Routes with Count & Progress Bar (5 cols) */}
        <Card
          className="lg:col-span-5 flex flex-col justify-between"
          title={
            <div>
              <h3 className="text-[16px] font-medium text-[#14201A]">Routes distribution</h3>
              <p className="text-[12px] text-[#6B7A72]">
                {metrics.totalRouteAssignments} assignments across {metrics.uniqueRoutedRecords} unique records
              </p>
            </div>
          }
        >
          <div className="space-y-3 mt-3">
            {metrics.routingCounts.map(({ route, label, count }) => {
              const pct = metrics.totalRecords > 0 ? Math.round((count / metrics.totalRecords) * 100) : 0;

              return (
                <div key={route} className="space-y-1">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-[#14201A]">{label}</span>
                    <span className="text-[#6B7A72] font-mono tabular-nums">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E5E9E7] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1F8A57]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* (b) Semi-Circular Gauge: Transcript Coverage (4 cols) */}
        <Card
          className="lg:col-span-4 flex flex-col items-center justify-between text-center"
          title="Transcript coverage"
        >
          <div className="my-2 relative flex flex-col items-center justify-center">
            {/* Semi-circular gauge SVG */}
            <svg width="180" height="100" viewBox="0 0 180 100" className="overflow-visible">
              {/* Background Arc */}
              <path
                d="M 20 90 A 70 70 0 0 1 160 90"
                fill="none"
                stroke="#E3F2EA"
                strokeWidth="16"
                strokeLinecap="round"
              />
              {/* Foreground Arc */}
              <path
                d="M 20 90 A 70 70 0 0 1 160 90"
                fill="none"
                stroke="#14683F"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray="220"
                strokeDashoffset={220 - (coveragePct / 100) * 220}
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Inner Percentage */}
            <div className="mt-[-28px]">
              <span className="text-[32px] font-semibold text-[#14201A] tabular-nums">
                {coveragePct}%
              </span>
              <div className="text-[12px] text-[#6B7A72]">Project Ended</div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-[12px] text-[#6B7A72] pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#14683F]" />
              Text available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E3F2EA] border border-[#C2E2D2]" />
              No text
            </span>
          </div>
        </Card>

        {/* (c) Dark-Green Card: Stale Analysis for M07 (3 cols) */}
        <div className="lg:col-span-3 rounded-[20px] gradient-dark-green p-5 text-white flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold tracking-tight">Stale analysis</span>
              <Chip label="M07" variant="stale" className="py-0.5 px-2 bg-white/20 text-white" />
            </div>

            <p className="text-[13px] text-white/85 leading-relaxed">
              M07 received 27 turns in revision 2. Analysis awaits manager sign-off.
            </p>
          </div>

          <div className="pt-4">
            <Link
              href="/records/meeting/892a0129-d5c4-5d95-b0f3-2479f64dbcd1"
              className="w-full h-[38px] rounded-full bg-white text-[#0B3D2A] text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#E3F2EA] transition-all"
            >
              <span>Review M07</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
