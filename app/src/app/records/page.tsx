'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  hasUsableText,
  getPersonLabel,
  ROUTE_LABELS,
  RouteName,
  CallPayload,
  MeetingPayload,
  StoredRecord,
} from '@/lib/types';
import { getEffectiveRoutes } from '@/lib/routing';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { ArrowRight, Search } from 'lucide-react';

function RecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoute = searchParams.get('route') || 'all';
  const initialTranscript = searchParams.get('hasTranscript') === 'true' ? 'has_transcript' : 'all';
  const initialType = searchParams.get('type') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const { records, suggestedRoutes, manualRoutes, analyses } = useStore();

  const [selectedRoute, setSelectedRoute] = useState<string>(initialRoute);
  const [selectedSourceType, setSelectedSourceType] = useState<string>(initialType);
  const [transcriptFilter, setTranscriptFilter] = useState<string>(initialTranscript);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

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

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedSourceType !== 'all' && r.source_type !== selectedSourceType) {
        return false;
      }

      const usable = hasUsableText(r);
      if (transcriptFilter === 'has_transcript' && !usable) return false;
      if (transcriptFilter === 'no_transcript' && usable) return false;

      const key = `${r.source_type}::${r.source_id}`;
      const { routes } = getEffectiveRoutes(suggestedMap.get(key), manualMap.get(key));
      if (selectedRoute !== 'all') {
        if (!routes.some((x) => x.route === selectedRoute)) return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const refMatch = r.record_ref.toLowerCase().includes(query);
        const personMatch = getPersonLabel(r).toLowerCase().includes(query);
        let contentMatch = false;

        if (r.source_type === 'call') {
          const p = r.payload as CallPayload;
          contentMatch =
            (p.summary?.toLowerCase().includes(query) ?? false) ||
            (p.classification_reason?.toLowerCase().includes(query) ?? false) ||
            (p.observed_outcome?.toLowerCase().includes(query) ?? false);
        } else {
          const p = r.payload as MeetingPayload;
          contentMatch =
            p.title.toLowerCase().includes(query) ||
            (p.summary?.toLowerCase().includes(query) ?? false) ||
            p.provider.toLowerCase().includes(query);
        }

        if (!refMatch && !personMatch && !contentMatch) return false;
      }

      return true;
    });
  }, [records, selectedSourceType, transcriptFilter, selectedRoute, searchTerm, suggestedMap, manualMap]);

  const columns = [
    {
      header: 'Record',
      cell: (r: StoredRecord) => (
        <span className="font-semibold text-[#14201A] font-mono">{r.record_ref}</span>
      ),
    },
    {
      header: 'Type',
      cell: (r: StoredRecord) => (
        <Chip
          label={r.source_type === 'call' ? 'Call' : 'Meeting'}
          variant={r.source_type === 'call' ? 'call' : 'meeting'}
        />
      ),
    },
    {
      header: 'Person',
      cell: (r: StoredRecord) => (
        <span className="font-medium text-[#14201A]">{getPersonLabel(r)}</span>
      ),
    },
    {
      header: 'Title / outcome',
      cell: (r: StoredRecord) => {
        const title =
          r.source_type === 'call'
            ? (r.payload as CallPayload).summary || (r.payload as CallPayload).classification_reason || 'Outbound call'
            : (r.payload as MeetingPayload).title;
        return (
          <div className="max-w-xs truncate" title={title}>
            <span className="text-[#14201A]">{title}</span>
          </div>
        );
      },
    },
    {
      header: 'Transcript',
      cell: (r: StoredRecord) => {
        const usable = hasUsableText(r);
        return usable ? (
          <Chip label="Yes" variant="current" dot />
        ) : (
          <Chip label="No" variant="neutral" />
        );
      },
    },
    {
      header: 'Routes',
      cell: (r: StoredRecord) => {
        const key = `${r.source_type}::${r.source_id}`;
        const { routes } = getEffectiveRoutes(suggestedMap.get(key), manualMap.get(key));
        return (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {routes.map((rt, idx) => (
              <Chip
                key={idx}
                label={ROUTE_LABELS[rt.route] || rt.route}
                variant={rt.route === 'needs_human_review' ? 'needs_review' : 'green'}
              />
            ))}
          </div>
        );
      },
    },
    {
      header: 'Review state',
      cell: (r: StoredRecord) => {
        const key = `${r.source_type}::${r.source_id}`;
        const { routes, isManual } = getEffectiveRoutes(suggestedMap.get(key), manualMap.get(key));
        if (isManual) {
          return <Chip label="Manual" variant="needs_review" dot />;
        }
        if (routes.some((x) => x.route === 'needs_human_review')) {
          return <Chip label="Needs review" variant="needs_review" dot />;
        }
        return <Chip label="Routed" variant="current" dot />;
      },
    },
    {
      header: 'Freshness',
      cell: (r: StoredRecord) => {
        const key = `${r.source_type}::${r.source_id}`;
        const analysis = analysisMap.get(key);
        if (!analysis) return <Chip label="No analysis" variant="neutral" />;
        if (analysis.source_revision < r.applied_revision) {
          return <Chip label="Stale" variant="stale" dot />;
        }
        return <Chip label="Current" variant="current" dot />;
      },
    },
    {
      header: '',
      headerClassName: 'text-right',
      cell: (r: StoredRecord) => (
        <div className="text-right">
          <Link href={`/records/${r.source_type}/${r.source_id}`}>
            <Button variant="secondary" size="sm">
              View
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold text-[#14201A] tracking-tight leading-tight">
            Inbox
          </h1>
          <p className="text-[14px] text-[#6B7A72] mt-0.5">
            Showing {filteredRecords.length} of {records.length} total conversations.
          </p>
        </div>
      </div>

      {/* Main Inbox Panel with Filter Row + Table */}
      <Card>
        {/* Pill-shaped filter row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-2 border-b border-[#E5E9E7]">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="text-[13px] bg-[#F7F7F5] border-0 rounded-full px-3.5 py-1.5 text-[#14201A] focus:ring-1 focus:ring-[#14683F]"
            >
              <option value="all">All routes</option>
              {Object.entries(ROUTE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={selectedSourceType}
              onChange={(e) => setSelectedSourceType(e.target.value)}
              className="text-[13px] bg-[#F7F7F5] border-0 rounded-full px-3.5 py-1.5 text-[#14201A] focus:ring-1 focus:ring-[#14683F]"
            >
              <option value="all">All types</option>
              <option value="call">Calls only</option>
              <option value="meeting">Meetings only</option>
            </select>

            <select
              value={transcriptFilter}
              onChange={(e) => setTranscriptFilter(e.target.value)}
              className="text-[13px] bg-[#F7F7F5] border-0 rounded-full px-3.5 py-1.5 text-[#14201A] focus:ring-1 focus:ring-[#14683F]"
            >
              <option value="all">Any transcript status</option>
              <option value="has_transcript">Has usable text</option>
              <option value="no_transcript">No usable text</option>
            </select>

            {(selectedRoute !== 'all' ||
              selectedSourceType !== 'all' ||
              transcriptFilter !== 'all' ||
              searchTerm.trim() !== '') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedRoute('all');
                  setSelectedSourceType('all');
                  setTranscriptFilter('all');
                  setSearchTerm('');
                }}
              >
                Reset filters
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#6B7A72]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in table..."
              style={{ paddingLeft: '2.25rem', paddingRight: '1rem' }}
              className="bg-[#F7F7F5] border-0 rounded-full py-1.5 text-[13px] text-[#14201A] w-52 focus:ring-1 focus:ring-[#14683F]"
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredRecords}
          keyExtractor={(r) => r.source_id}
          onRowClick={(r) => router.push(`/records/${r.source_type}/${r.source_id}`)}
          emptyState="No matching records found."
        />
      </Card>
    </div>
  );
}

export default function RecordsPage() {
  return (
    <Suspense
      fallback={
        <Card className="p-8 text-center text-[#6B7A72]">
          Loading records...
        </Card>
      }
    >
      <RecordsContent />
    </Suspense>
  );
}
