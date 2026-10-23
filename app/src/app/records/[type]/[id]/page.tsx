'use client';

import React, { useState, useMemo, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  CallPayload,
  MeetingPayload,
  EvidenceItem,
  RouteAssignment,
  getPersonLabel,
} from '@/lib/types';
import { TranscriptViewer } from '@/components/TranscriptViewer';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { ManualRouteOverride } from '@/components/ManualRouteOverride';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

function DetailContent({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { type, id } = resolvedParams;

  const {
    records,
    suggestedRoutes,
    manualRoutes,
    analyses,
    setManualRoute,
    resetToSuggestion,
  } = useStore();

  const [highlightTurn, setHighlightTurn] = useState<number | null>(null);
  const [highlightQuote, setHighlightQuote] = useState<string | null>(null);

  const record = useMemo(() => {
    return records.find((r) => r.source_type === type && r.source_id === id);
  }, [records, type, id]);

  const suggested = useMemo(() => {
    return suggestedRoutes.find((s) => s.source_type === type && s.source_id === id);
  }, [suggestedRoutes, type, id]);

  const manual = useMemo(() => {
    return manualRoutes.find((m) => m.source_type === type && m.source_id === id);
  }, [manualRoutes, type, id]);

  const analysis = useMemo(() => {
    return analyses.find((a) => a.source_type === type && a.source_id === id);
  }, [analyses, type, id]);

  if (!record) {
    return (
      <Card className="py-12 text-center space-y-3">
        <h1 className="text-[22px] font-semibold text-[#14201A]">Record not found</h1>
        <p className="text-[14px] text-[#6B7A72]">
          The record {type} {id} does not exist in local storage.
        </p>
        <Link href="/records">
          <Button variant="secondary" size="sm">
            ← Back to Inbox
          </Button>
        </Link>
      </Card>
    );
  }

  const isCall = record.source_type === 'call';
  const callPayload = isCall ? (record.payload as CallPayload) : undefined;
  const meetingPayload = !isCall ? (record.payload as MeetingPayload) : undefined;

  const handleSelectEvidence = (item: EvidenceItem) => {
    if (item.type === 'turn' && item.turn !== undefined) {
      setHighlightTurn(item.turn);
      setHighlightQuote(item.text);
    } else {
      setHighlightTurn(null);
      setHighlightQuote(item.text);
    }
  };

  const handleSaveManualRoutes = async (routes: RouteAssignment[]) => {
    await setManualRoute(record.source_type, record.source_id, routes);
  };

  const handleResetManualRoutes = async () => {
    await resetToSuggestion(record.source_type, record.source_id);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/records"
              className="text-[13px] text-[#6B7A72] hover:text-[#14201A] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Inbox</span>
            </Link>
            <span className="text-[#6B7A72]">/</span>
            <span className="text-[13px] font-semibold text-[#14201A]">{record.record_ref}</span>
          </div>

          <h1 className="text-[28px] font-semibold text-[#14201A] tracking-tight leading-tight">
            {record.record_ref} — {isCall ? 'Outbound Call' : meetingPayload?.title || 'Meeting'}
          </h1>
          <p className="text-[14px] text-[#6B7A72] mt-0.5">
            {getPersonLabel(record)} • Revision {record.applied_revision}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Chip
            label={isCall ? 'Call' : 'Meeting'}
            variant={isCall ? 'call' : 'meeting'}
            className="text-[13px] py-1 px-3"
          />
          <Chip
            label={`Revision ${record.applied_revision}`}
            variant="neutral"
            className="text-[13px] py-1 px-3"
          />
        </div>
      </div>

      {/* Two-Column Side-by-Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Source Fields + Transcript */}
        <div className="lg:col-span-6 space-y-4">
          {/* Source Fields */}
          <Card title="Source metadata">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[14px]">
              <div>
                <dt className="text-[12px] text-[#6B7A72]">Person</dt>
                <dd className="font-medium text-[#14201A] mt-0.5">{getPersonLabel(record)}</dd>
              </div>

              <div>
                <dt className="text-[12px] text-[#6B7A72]">Timestamp (Kolkata)</dt>
                <dd className="tabular-nums text-[#14201A] mt-0.5">
                  {new Date(
                    isCall ? callPayload!.started_at : meetingPayload!.starts_at
                  ).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                </dd>
              </div>

              <div>
                <dt className="text-[12px] text-[#6B7A72]">Duration</dt>
                <dd className="tabular-nums text-[#14201A] mt-0.5">
                  {isCall ? `${callPayload?.duration_seconds}s` : `${meetingPayload?.duration_seconds}s`}
                </dd>
              </div>

              {isCall ? (
                <>
                  <div>
                    <dt className="text-[12px] text-[#6B7A72]">Connected</dt>
                    <dd className="tabular-nums text-[#14201A] mt-0.5">
                      {callPayload?.is_connected === null ? 'Unknown' : callPayload?.is_connected ? 'Yes' : 'No'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[12px] text-[#6B7A72]">Observed outcome</dt>
                    <dd className="capitalize text-[#14201A] mt-0.5">
                      {callPayload?.observed_outcome || 'Not recorded'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[12px] text-[#6B7A72]">Talk time</dt>
                    <dd className="tabular-nums text-[#14201A] mt-0.5">
                      {callPayload?.talk_time_seconds !== null ? `${callPayload?.talk_time_seconds}s` : 'None'}
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt className="text-[12px] text-[#6B7A72]">Provider</dt>
                    <dd className="capitalize text-[#14201A] mt-0.5">{meetingPayload?.provider}</dd>
                  </div>

                  <div>
                    <dt className="text-[12px] text-[#6B7A72]">Recording status</dt>
                    <dd className="capitalize text-[#14201A] mt-0.5">{meetingPayload?.recording_status}</dd>
                  </div>
                </>
              )}
            </dl>
          </Card>

          {/* Transcript Viewer */}
          <TranscriptViewer
            sourceType={record.source_type}
            callPayload={callPayload}
            meetingPayload={meetingPayload}
            transcriptPayload={record.transcript_payload}
            highlightTurn={highlightTurn}
            highlightQuote={highlightQuote}
          />
        </div>

        {/* Right Column: Route, Manual Override, Analysis, Caveats, Next steps */}
        <div className="lg:col-span-6 space-y-4">
          <ManualRouteOverride
            sourceType={record.source_type}
            sourceId={record.source_id}
            suggested={suggested}
            manual={manual}
            onSaveManual={handleSaveManualRoutes}
            onResetToSuggestion={handleResetManualRoutes}
          />

          <AnalysisPanel
            analysis={analysis}
            currentSourceRevision={record.applied_revision}
            onSelectEvidence={handleSelectEvidence}
          />
        </div>
      </div>
    </div>
  );
}

export default function RecordDetailPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-[20px] p-8 text-center text-[#6B7A72] text-[14px]">
          Loading record details...
        </div>
      }
    >
      <DetailContent {...props} />
    </Suspense>
  );
}
