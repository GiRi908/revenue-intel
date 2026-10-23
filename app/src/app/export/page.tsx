'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { generateExportZip, buildManifestRows } from '@/lib/export';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { DataTable } from '@/components/ui/DataTable';
import { Download, Copy, Check } from 'lucide-react';
import type { ManifestRow } from '@/lib/types';

export default function ExportPage() {
  const { records, suggestedRoutes, manualRoutes, analyses } = useStore();
  const [isExporting, setIsExporting] = useState(false);
  const [csvCopied, setCsvCopied] = useState(false);

  const manifestRows = useMemo(() => {
    return buildManifestRows(records, suggestedRoutes, manualRoutes, analyses);
  }, [records, suggestedRoutes, manualRoutes, analyses]);

  const totalFiles = useMemo(() => {
    return manifestRows.reduce((acc, row) => {
      const paths = row.output_paths ? row.output_paths.split(';') : [];
      return acc + paths.length;
    }, 0);
  }, [manifestRows]);

  const manualOverridesCount = useMemo(() => {
    return manifestRows.filter((r) => r.manual_override).length;
  }, [manifestRows]);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      await generateExportZip(records, suggestedRoutes, manualRoutes, analyses);
    } catch (e) {
      alert(`Export error: ${e}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyManifest = () => {
    if (manifestRows.length === 0) return;
    const headers = Object.keys(manifestRows[0]).join(',');
    const rows = manifestRows.map((r) =>
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
    navigator.clipboard.writeText([headers, ...rows].join('\n'));
    setCsvCopied(true);
    setTimeout(() => setCsvCopied(false), 2000);
  };

  const columns = [
    {
      header: 'Ref',
      cell: (r: ManifestRow) => (
        <span className="font-semibold text-[#14201A] font-mono">{r.record_ref}</span>
      ),
    },
    {
      header: 'Type',
      cell: (r: ManifestRow) => (
        <Chip label={r.source_type} variant={r.source_type === 'call' ? 'call' : 'meeting'} />
      ),
    },
    {
      header: 'Rev',
      cell: (r: ManifestRow) => (
        <span className="font-mono text-[13px] text-[#6B7A72]">v{r.applied_revision}</span>
      ),
    },
    {
      header: 'Routes',
      cell: (r: ManifestRow) => (
        <span className="text-[13px] text-[#14201A]">{r.routes}</span>
      ),
    },
    {
      header: 'Review state',
      cell: (r: ManifestRow) => (
        <Chip
          label={r.review_state}
          variant={r.review_state === 'needs_review' ? 'needs_review' : 'current'}
          dot
        />
      ),
    },
    {
      header: 'Manual?',
      cell: (r: ManifestRow) => (
        r.manual_override ? <Chip label="Yes" variant="needs_review" /> : <span className="text-[#6B7A72]">No</span>
      ),
    },
    {
      header: 'Freshness',
      cell: (r: ManifestRow) => (
        <Chip
          label={r.analysis_freshness}
          variant={r.analysis_freshness.includes('stale') ? 'stale' : 'current'}
          dot
        />
      ),
    },
    {
      header: 'Output paths',
      cell: (r: ManifestRow) => (
        <span className="font-mono text-[11px] text-[#6B7A72] truncate max-w-xs block" title={r.output_paths}>
          {r.output_paths}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold text-[#14201A] tracking-tight leading-tight">
            Exports
          </h1>
          <p className="text-[14px] text-[#6B7A72] mt-0.5">
            Download organized Markdown dossiers and manifest.csv.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleCopyManifest}
          >
            {csvCopied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-[#14683F]" />
                Copied CSV
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2 text-[#14683F]" />
                Copy manifest CSV
              </>
            )}
          </Button>

          <Button
            variant="primary"
            size="md"
            disabled={isExporting || records.length === 0}
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Generating ZIP...' : 'Download export ZIP'}
          </Button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total records"
          value={records.length}
          definition="Unique (source_type, source_id) pairs"
          variant="dark-green"
        />
        <MetricCard
          title="Markdown dossiers"
          value={totalFiles}
          definition="Organized by assigned route folders"
          variant="white"
        />
        <MetricCard
          title="Manual overrides"
          value={manualOverridesCount}
          definition="Preserved in output paths & manifest"
          variant="white"
        />
        <MetricCard
          title="Manifest file"
          value="CSV"
          definition="exports/manifest.csv included at root"
          variant="white"
        />
      </div>

      {/* Folder Tree Panel (Monospace on light green-100 bg) */}
      <Card title="Folder archive structure">
        <div className="bg-[#E3F2EA] p-4 rounded-[12px] font-mono text-[12px] text-[#0B3D2A] leading-relaxed overflow-x-auto">
          <div>exports/</div>
          <div>├── manifest.csv &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Machine-readable audit index</div>
          <div>├── sales-coaching/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Substantive cold calls (C01, C05–C10)</div>
          <div>│ &nbsp;&nbsp;└── &lt;record_ref&gt;_&lt;source_type&gt;.md</div>
          <div>├── deal-next-steps/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Commercial commitments (M01–M04, C03)</div>
          <div>├── customer-followup-cs/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Customer SLA latency and onboarding (M07, M09)</div>
          <div>├── internal-vendor-note/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Internal training and vendor syncs (M06, M10)</div>
          <div>├── no-analysis-log/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Unresponsive dials & empty meetings</div>
          <div>└── needs-human-review/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Conflicting labels (C04, B11, B14)</div>
        </div>
      </Card>

      {/* Manifest Table */}
      <Card
        title="Manifest preview"
        action={
          <span className="text-[12px] text-[#6B7A72]">
            {manifestRows.length} rows
          </span>
        }
      >
        <DataTable
          columns={columns}
          data={manifestRows}
          keyExtractor={(r) => `${r.source_type}::${r.source_id}`}
        />
      </Card>
    </div>
  );
}
