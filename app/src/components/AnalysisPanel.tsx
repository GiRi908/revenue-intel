'use client';

import React from 'react';
import type { StoredAnalysis, EvidenceItem } from '@/lib/types';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';

interface AnalysisPanelProps {
  analysis?: StoredAnalysis | null;
  currentSourceRevision: number;
  onSelectEvidence?: (item: EvidenceItem) => void;
  onMarkCurrent?: () => void;
}

export function AnalysisPanel({
  analysis,
  currentSourceRevision,
  onSelectEvidence,
  onMarkCurrent,
}: AnalysisPanelProps) {
  if (!analysis) {
    return (
      <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-[14px] text-[#6B7A72]">
        No analysis prepared for this record. Records without usable conversation text do not have substantive analysis.
      </div>
    );
  }

  const isStale = currentSourceRevision > analysis.source_revision;

  return (
    <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
      {/* Header & Status */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E7]">
        <h3 className="text-[16px] font-medium text-[#14201A]">Analysis</h3>

        <div className="flex items-center gap-2">
          {isStale ? (
            <div className="flex items-center gap-2">
              <Chip
                label={`Stale (rev ${currentSourceRevision} > ${analysis.source_revision})`}
                variant="stale"
                dot
              />
              {onMarkCurrent && (
                <Button variant="secondary" size="sm" onClick={onMarkCurrent}>
                  Mark reviewed
                </Button>
              )}
            </div>
          ) : (
            <Chip
              label={`Current (rev ${analysis.source_revision})`}
              variant="current"
              dot
            />
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-1">
        <h4 className="text-[12px] font-semibold text-[#6B7A72] uppercase tracking-wider">
          Summary
        </h4>
        <p className="text-[14px] text-[#14201A] leading-relaxed">
          {analysis.summary}
        </p>
      </div>

      {/* Evidence */}
      <div className="space-y-2">
        <h4 className="text-[12px] font-semibold text-[#6B7A72] uppercase tracking-wider">
          Evidence (click to highlight in transcript)
        </h4>
        <div className="space-y-2">
          {analysis.evidence.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectEvidence && onSelectEvidence(item)}
              className="w-full text-left p-3 rounded-[12px] bg-[#F7F7F5] hover:bg-[#E3F2EA]/40 transition-colors block text-[13px] border border-transparent hover:border-[#14683F]/20 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#14683F]">
                  {item.type === 'turn' ? `Turn ${item.turn}` : 'Spoken quote'}
                </span>
                <span className="text-[11px] text-[#6B7A72]">Jump to text →</span>
              </div>
              <p className="text-[#14201A] italic leading-relaxed">
                &ldquo;{item.text}&rdquo;
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* What the evidence does not establish */}
      {analysis.not_established && (
        <div className="p-3.5 rounded-[12px] bg-[#FEF3C7]/40 border border-[#FEF3C7] space-y-1">
          <h4 className="text-[12px] font-semibold text-[#B7791F] uppercase tracking-wider">
            What the evidence does not establish
          </h4>
          <p className="text-[13px] text-[#14201A] leading-relaxed">
            {analysis.not_established}
          </p>
        </div>
      )}

      {/* Next Step & Owner */}
      {analysis.next_steps && (
        <div className="space-y-1 pt-3 border-t border-[#E5E9E7]">
          <h4 className="text-[12px] font-semibold text-[#6B7A72] uppercase tracking-wider">
            Next step
          </h4>
          <div className="text-[14px] text-[#14201A] space-y-1 bg-[#F7F7F5] p-3 rounded-[12px]">
            <div>{analysis.next_steps.action}</div>
            <div className="text-[12px] text-[#6B7A72] pt-1">
              Owner: <span className="text-[#14201A] font-medium">{analysis.next_steps.owner || 'Owner not stated'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
