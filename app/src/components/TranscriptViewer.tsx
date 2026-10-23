'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { CallPayload, MeetingPayload, TranscriptPayload } from '@/lib/types';
import { Search, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TranscriptViewerProps {
  sourceType: 'call' | 'meeting';
  callPayload?: CallPayload;
  meetingPayload?: MeetingPayload;
  transcriptPayload?: TranscriptPayload | null;
  highlightTurn?: number | null;
  highlightQuote?: string | null;
}

export function TranscriptViewer({
  sourceType,
  callPayload,
  meetingPayload,
  transcriptPayload,
  highlightTurn,
  highlightQuote,
}: TranscriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const turns = transcriptPayload?.turns || [];
  const callText = callPayload?.transcript || '';

  const handleCopy = () => {
    let fullText = '';
    if (sourceType === 'call') {
      fullText = callText;
    } else {
      fullText = turns.map((t, idx) => `[Turn ${idx + 1}] ${t.speaker} (${t.timecode}): ${t.text}`).join('\n\n');
    }
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (highlightTurn && sourceType === 'meeting') {
      const el = document.getElementById(`turn-${highlightTurn}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightTurn, sourceType]);

  const renderText = (text: string, term: string, isTarget: boolean = false) => {
    if (!text) return null;
    if (!term) {
      if (isTarget) {
        return <mark className="bg-[#FEF3C7] text-[#14201A] px-1 py-0.5 rounded">{text}</mark>;
      }
      return text;
    }

    const query = term.trim();
    if (!query) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-[#FEF3C7] text-[#14201A] px-1 py-0.5 rounded font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const matchCount = useMemo(() => {
    if (!searchTerm.trim()) return 0;
    const term = searchTerm.toLowerCase();
    if (sourceType === 'call') {
      const matches = callText.toLowerCase().split(term).length - 1;
      return Math.max(0, matches);
    } else {
      return turns.reduce((acc, t) => {
        const matches = t.text.toLowerCase().split(term).length - 1;
        return acc + Math.max(0, matches);
      }, 0);
    }
  }, [searchTerm, sourceType, callText, turns]);

  const hasNoContent =
    (sourceType === 'call' && (!callText || callText.trim().length === 0)) ||
    (sourceType === 'meeting' && turns.length === 0);

  return (
    <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col">
      {/* Header, Search & Copy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E9E7]">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7A72]">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transcript..."
            style={{ paddingLeft: '2.5rem', paddingRight: '3.5rem' }}
            className="w-full bg-[#F7F7F5] border-0 rounded-full py-1.5 text-[13px] text-[#14201A] placeholder-[#6B7A72] focus:ring-1 focus:ring-[#14683F] focus:bg-white transition-all"
          />
          {searchTerm && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className="text-[11px] font-mono text-[#6B7A72]">
                {matchCount} {matchCount === 1 ? 'match' : 'matches'}
              </span>
            </div>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          disabled={hasNoContent}
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5 text-[#14683F]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1.5 text-[#14683F]" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>

      {/* Transcript Text */}
      <div
        ref={containerRef}
        className="pt-4 overflow-y-auto max-h-[580px] text-[14px] leading-relaxed space-y-3"
      >
        {hasNoContent ? (
          <div className="text-center py-12 text-[#6B7A72] space-y-1">
            <p className="font-medium text-[#14201A]">No transcript available</p>
            {meetingPayload?.recording_detail && (
              <p className="text-[13px]">{meetingPayload.recording_detail}</p>
            )}
            {transcriptPayload?.unavailable_reason && (
              <p className="text-[13px]">{transcriptPayload.unavailable_reason}</p>
            )}
          </div>
        ) : sourceType === 'call' ? (
          <div className="whitespace-pre-wrap text-[#14201A] leading-relaxed p-2">
            {renderText(callText, searchTerm)}
          </div>
        ) : (
          <div className="space-y-2.5">
            {turns.map((turn, index) => {
              const turnNum = index + 1;
              const isTargetTurn = highlightTurn === turnNum;

              return (
                <div
                  key={index}
                  id={`turn-${turnNum}`}
                  className={`p-3 rounded-[12px] transition-colors ${
                    isTargetTurn
                      ? 'bg-[#FEF3C7]/40 border-l-[3px] border-[#B7791F]'
                      : 'hover:bg-[#F7F7F5]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-[13px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#14201A]">
                        {turn.speaker}
                      </span>
                      <span className="text-[#6B7A72] text-[11px] font-mono">
                        Turn {turnNum}
                      </span>
                    </div>
                    <span className="text-[#6B7A72] font-mono text-[11px]">
                      {turn.timecode}
                    </span>
                  </div>
                  <div className="text-[#14201A] text-[14px] pl-0.5 leading-relaxed">
                    {renderText(turn.text, searchTerm, isTargetTurn)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
